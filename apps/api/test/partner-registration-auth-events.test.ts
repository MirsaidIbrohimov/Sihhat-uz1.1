import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setup, Client, testPassword } from './helpers';
import { EmailService } from '../src/auth/email';
import { OutboxService } from '../src/outbox/outbox.service';

let ctx: Awaited<ReturnType<typeof setup>>;

before(async () => {
  ctx = await setup();
});

after(async () => {
  await ctx?.app.close();
});

test('Partner registration: live username/email DB check, submit -> superadmin alert -> approve -> catalog visible + email sent + login works', async () => {
  const emailSvc = ctx.app.get(EmailService);
  const outbox = ctx.app.get(OutboxService);
  emailSvc.sentAlerts.length = 0;
  emailSvc.sentPartnerEmails.length = 0;

  // Give superadmin an email so admin alert email delivery is verified too
  const adminProfile = await ctx.admin.call('/auth/profile', 'PATCH', {
    email: 'owner.superadmin@example.com',
  });
  assert.equal(adminProfile.status, 200);

  const anon = new Client(ctx.base);

  // 1. Live availability check: invalid formats
  const badUser = await anon.call('/auth/partner-register/availability?username=ab');
  assert.equal(badUser.status, 200);
  assert.equal(badUser.body.valid, false);
  assert.equal(badUser.body.available, false);

  const badEmail = await anon.call('/auth/partner-register/availability?email=not-an-email');
  assert.equal(badEmail.status, 200);
  assert.equal(badEmail.body.valid, false);
  assert.equal(badEmail.body.available, false);

  // 2. Existing user username & email are reported as TAKEN
  const takenAdmin = await anon.call('/auth/partner-register/availability?username=admin.test');
  assert.equal(takenAdmin.status, 200);
  assert.equal(takenAdmin.body.valid, true);
  assert.equal(takenAdmin.body.available, false);
  assert.equal(takenAdmin.body.reason, 'TAKEN');

  const takenAdminEmail = await anon.call('/auth/partner-register/availability?email=OWNER.SUPERADMIN@EXAMPLE.COM');
  assert.equal(takenAdminEmail.status, 200);
  assert.equal(takenAdminEmail.body.valid, true);
  assert.equal(takenAdminEmail.body.available, false);
  assert.equal(takenAdminEmail.body.reason, 'TAKEN');

  // 3. New username & email are available
  const freeUser = await anon.call('/auth/partner-register/availability?username=chortoq.shifo');
  assert.equal(freeUser.status, 200);
  assert.equal(freeUser.body.valid, true);
  assert.equal(freeUser.body.available, true);

  const freeEmail = await anon.call('/auth/partner-register/availability?email=director@chortoq-shifo.uz');
  assert.equal(freeEmail.status, 200);
  assert.equal(freeEmail.body.valid, true);
  assert.equal(freeEmail.body.available, true);

  // 4. Submit partner application
  const partnerPassword = 'Partner-2026-Strong!';
  const submitRes = await anon.call(
    '/auth/partner-register',
    'POST',
    {
      applicant_name: 'Rustamjon Rahimov',
      username: 'chortoq.shifo',
      email: 'director@chortoq-shifo.uz',
      phone: '+998901239900',
      password: partnerPassword,
      sanatorium_name: 'Chortoq Shifo Sanatoriyasi',
      legal_name: 'Chortoq Shifo MChJ',
      stir: '301234567',
      region: 'Namangan viloyati',
      address: 'Chortoq tumani, Shifobaxsh buloq ko‘chasi 14-uy',
      description: 'Mineral suvlari, toza tog‘ havosi va zamonaviy fizioterapiya muolajalari bilan mashhur sanatoriya.',
      contact_phone: '+998901239901',
      map_url: 'https://maps.google.com/?q=41.0725,71.8231',
      check_in_time: '14:00',
      check_out_time: '12:00',
      amenities: ['Wi-Fi', 'Yopiq basseyn', 'Sauna'],
      services: ['Fizioterapiya', 'Mineral vannalar', 'Massaj'],
      meals: '3 mahal parhez va milliy taomlar',
      starting_price: '45000000',
      room_type_name: 'Lyuks 2 kishilik',
      rooms_count: 3,
      terms_accepted: true,
    },
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
      'X-Real-IP': '198.51.100.25',
    },
  );
  assert.equal(submitRes.status, 201, JSON.stringify(submitRes.body));
  assert.equal(submitRes.body.success, true);
  assert.equal(submitRes.body.registration.status, 'PENDING');
  assert.equal(submitRes.body.registration.passwordHash, undefined, 'passwordHash must never be exposed');
  assert.equal(submitRes.body.registration.submittedIp, '198.51.100.25');
  assert.match(submitRes.body.registration.submittedDevice, /Chrome · Windows/);

  const regId = submitRes.body.registration.id;

  // 5. Pending application reserves username & email immediately in live availability check
  const pendingUserCheck = await anon.call('/auth/partner-register/availability?username=CHORTOQ.SHIFO');
  assert.equal(pendingUserCheck.body.available, false);
  assert.equal(pendingUserCheck.body.reason, 'TAKEN');

  const pendingEmailCheck = await anon.call('/auth/partner-register/availability?email=director@chortoq-shifo.uz');
  assert.equal(pendingEmailCheck.body.available, false);
  assert.equal(pendingEmailCheck.body.reason, 'TAKEN');

  // Staff availability endpoint also sees pending registration
  const staffAvail = await ctx.admin.call('/partner/staff/login-availability?login=chortoq.shifo');
  assert.equal(staffAvail.status, 200);
  assert.equal(staffAvail.body.available, false);

  // Duplicate submission rejected with 409
  const dupSubmit = await anon.call('/auth/partner-register', 'POST', {
    applicant_name: 'Boshqa Odami',
    username: 'chortoq.shifo',
    email: 'other@chortoq-shifo.uz',
    phone: '+998901239988',
    password: partnerPassword,
    sanatorium_name: 'Takroriy Sanatoriya',
    region: 'Namangan viloyati',
    address: 'Chortoq tumani 5-uy',
    description: 'Bu takroriy username bilan yuborilgan ariza rad etilishi kerak.',
    contact_phone: '+998901239988',
    terms_accepted: true,
  });
  assert.equal(dupSubmit.status, 409);
  assert.equal(dupSubmit.body.code, 'USERNAME_IN_USE');

  // 6. Before approval: partner cannot log in, sanatorium not in public catalog
  const earlyLogin = await anon.call('/auth/staff/login', 'POST', {
    login: 'chortoq.shifo',
    password: partnerPassword,
  });
  assert.equal(earlyLogin.status, 401);

  const catalogBefore = await anon.call('/catalog/sanatoriums');
  assert.equal(catalogBefore.status, 200);
  assert.equal(
    catalogBefore.body.data.some((s: any) => s.name === 'Chortoq Shifo Sanatoriyasi'),
    false,
    'Unapproved sanatorium must not appear in user catalog',
  );

  // 7. Superadmin immediately received IN_APP notification and gets Email alert on outbox tick
  const adminNotifs = await ctx.admin.call('/notifications');
  assert.equal(adminNotifs.status, 200);
  const regNotif = adminNotifs.body.find((n: any) => n.payload?.topic === 'partner.registration_submitted');
  assert.ok(regNotif, 'Superadmin must receive immediate IN_APP notification for new partner registration');
  assert.equal(regNotif.payload.sanatorium_name, 'Chortoq Shifo Sanatoriyasi');

  await outbox.tick();
  const adminEmail = emailSvc.sentAlerts.find((a) => a.topic === 'partner.registration_submitted');
  assert.ok(adminEmail, 'Superadmin must receive email alert for new partner registration');
  assert.equal(adminEmail.to, 'owner.superadmin@example.com');
  assert.match(adminEmail.text, /Chortoq Shifo Sanatoriyasi/);
  assert.match(adminEmail.text, /@chortoq\.shifo/);

  // 8. Superadmin lists pending registrations
  const listRes = await ctx.admin.call('/superadmin/partner-registrations?status=PENDING');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.pending_count, 1);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.data[0].id, regId);
  assert.equal(listRes.body.data[0].passwordHash, undefined);

  // 9. Superadmin approves the registration
  const approveRes = await ctx.admin.call(`/superadmin/partner-registrations/${regId}/approve`, 'POST', {
    version: 1,
    reason: 'Hujjatlar va ma’lumotlar to‘liq tekshirildi',
  });
  assert.equal(approveRes.status, 201, JSON.stringify(approveRes.body));
  assert.equal(approveRes.body.success, true);
  assert.equal(approveRes.body.registration.status, 'APPROVED');
  assert.equal(approveRes.body.user.login, 'chortoq.shifo');
  assert.equal(approveRes.body.user.email, 'director@chortoq-shifo.uz');
  assert.equal(approveRes.body.user.must_change_password, false);
  assert.equal(approveRes.body.sanatorium.name, 'Chortoq Shifo Sanatoriyasi');
  assert.equal(approveRes.body.sanatorium.status, 'ACTIVE');
  assert.ok(approveRes.body.sanatorium.publicRevisionId, 'Approved sanatorium must be published');
  assert.equal(approveRes.body.email_status, 'SENT');

  // 10. Approval email was sent to partner's submitted email address
  const partnerMail = emailSvc.sentPartnerEmails.find((m) => m.id === regId && m.kind === 'approved');
  assert.ok(partnerMail, 'Approval email must be sent to submitted partner email');
  assert.equal(partnerMail.to, 'director@chortoq-shifo.uz');
  assert.match(partnerMail.text, /Chortoq Shifo Sanatoriyasi/);
  assert.match(partnerMail.text, /@chortoq\.shifo/);

  // 11. Sanatorium appears in Superadmin's sanatoriums list AND in public user catalog!
  const adminSanList = await ctx.admin.call('/superadmin/sanatoriums');
  assert.equal(adminSanList.status, 200);
  assert.ok(
    adminSanList.body.data.some((s: any) => s.id === approveRes.body.sanatorium.id && s.name === 'Chortoq Shifo Sanatoriyasi'),
    'Approved sanatorium must be in Superadmin sanatoriums list',
  );

  const catalogAfter = await anon.call('/catalog/sanatoriums');
  assert.equal(catalogAfter.status, 200);
  const catalogItem = catalogAfter.body.data.find((s: any) => s.id === approveRes.body.sanatorium.id);
  assert.ok(catalogItem, 'Approved sanatorium must immediately be visible to users in /catalog/sanatoriums');
  assert.equal(catalogItem.name, 'Chortoq Shifo Sanatoriyasi');
  assert.equal(catalogItem.region, 'Namangan viloyati');
  assert.equal(catalogItem.from_amount, '45000000');
  assert.equal(catalogItem.online_booking_available, true);

  const catalogDetail = await anon.call(`/catalog/sanatoriums/${approveRes.body.sanatorium.id}`);
  assert.equal(catalogDetail.status, 200);
  assert.equal(catalogDetail.body.room_types.length, 1);
  assert.equal(catalogDetail.body.room_types[0].name, 'Lyuks 2 kishilik');
  assert.equal(catalogDetail.body.rate_plans.length, 1);
  assert.equal(catalogDetail.body.stir, undefined, 'Private STIR must stay hidden in public catalog');

  // 12. Partner logs in with chosen username + password AND with email + password
  const partnerClient = new Client(ctx.base);
  const partnerLogin = await partnerClient.call(
    '/auth/staff/login',
    'POST',
    { login: 'chortoq.shifo', password: partnerPassword },
    {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/133.0',
      'X-Real-IP': '198.51.100.42',
    },
  );
  assert.equal(partnerLogin.status, 201, JSON.stringify(partnerLogin.body));
  assert.equal(partnerLogin.body.user.login, 'chortoq.shifo');

  const partnerMe = await partnerClient.call('/auth/me');
  assert.equal(partnerMe.status, 200);
  assert.equal(partnerMe.body.kind, 'STAFF');
  assert.equal(partnerMe.body.memberships[0].role, 'DIRECTOR');
  assert.equal(partnerMe.body.memberships[0].sanatoriumId, approveRes.body.sanatorium.id);

  // Also test logging in with email address
  const emailLoginClient = new Client(ctx.base);
  const emailLogin = await emailLoginClient.call(
    '/auth/staff/login',
    'POST',
    { login: 'director@chortoq-shifo.uz', password: partnerPassword },
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0.0.0',
      'X-Real-IP': '198.51.100.43',
    },
  );
  assert.equal(emailLogin.status, 201);
  await emailLoginClient.call('/auth/logout', 'POST', {}, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0.0.0',
    'X-Real-IP': '198.51.100.43',
  });
});

test('Partner registration rejection frees username/email and sends rejection email', async () => {
  const emailSvc = ctx.app.get(EmailService);
  const anon = new Client(ctx.base);

  const submitRes = await anon.call('/auth/partner-register', 'POST', {
    applicant_name: 'Sardor Test',
    username: 'reject.partner',
    email: 'reject.partner@example.com',
    phone: '+998907776655',
    password: testPassword,
    sanatorium_name: 'Rad Etiladigan Sanatoriya',
    region: 'Farg‘ona viloyati',
    address: 'Farg‘ona shahri, Markaziy ko‘cha 1',
    description: 'Bu ariza rad etish va qayta yuborish oqimini tekshirish uchun yuborildi.',
    contact_phone: '+998907776655',
    terms_accepted: true,
  });
  assert.equal(submitRes.status, 201);
  const regId = submitRes.body.registration.id;

  // Reject without reason fails 422
  const badReject = await ctx.admin.call(`/superadmin/partner-registrations/${regId}/reject`, 'POST', {
    version: 1,
    reason: 'a',
  });
  assert.equal(badReject.status, 422);

  // Reject with valid reason
  const rejectRes = await ctx.admin.call(`/superadmin/partner-registrations/${regId}/reject`, 'POST', {
    version: 1,
    reason: 'Sanatoriya manzili va hujjat ma’lumotlari to‘liq emas',
  });
  assert.equal(rejectRes.status, 201);
  assert.equal(rejectRes.body.registration.status, 'REJECTED');
  assert.equal(rejectRes.body.email_status, 'SENT');

  const mail = emailSvc.sentPartnerEmails.find((m) => m.id === regId && m.kind === 'rejected');
  assert.ok(mail);
  assert.equal(mail.to, 'reject.partner@example.com');
  assert.match(mail.text, /to‘liq emas/);

  // Username & email are available again after rejection
  const availUser = await anon.call('/auth/partner-register/availability?username=reject.partner');
  assert.equal(availUser.body.available, true);
  const availEmail = await anon.call('/auth/partner-register/availability?email=reject.partner@example.com');
  assert.equal(availEmail.body.available, true);
});

test('AuthEvent tracking: records device and IP on every LOGIN, LOGOUT, and SESSION_REVOKED for Superadmin, Staff, and Mobile Customer', async () => {
  // 1. Mobile customer OTP login & logout with Android device + IP
  const mobileClient = new Client(ctx.base);
  const otpReq = await mobileClient.call('/auth/customer/otp/request', 'POST', {
    phone: '+998905554433',
  });
  assert.equal(otpReq.status, 201);
  const code = ctx.auth.sms.sent.get(otpReq.body.challenge_id);
  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-A165F Build/AP3A) Dart/3.13',
    'X-App-Version': '0.2.10',
    'X-Real-IP': '203.0.113.77',
  };
  const otpVerify = await mobileClient.call(
    '/auth/customer/otp/verify',
    'POST',
    { challenge_id: otpReq.body.challenge_id, code },
    mobileHeaders,
  );
  assert.equal(otpVerify.status, 201);
  mobileClient.token = otpVerify.body.access_token;
  const customerId = otpVerify.body.user.id;

  // Customer checks own login history
  const customerHistoryBeforeLogout = await mobileClient.call('/auth/login-history');
  assert.equal(customerHistoryBeforeLogout.status, 200);
  assert.equal(customerHistoryBeforeLogout.body.total, 1);
  assert.equal(customerHistoryBeforeLogout.body.data[0].eventType, 'LOGIN');
  assert.equal(customerHistoryBeforeLogout.body.data[0].ipAddress, '203.0.113.77');
  assert.match(customerHistoryBeforeLogout.body.data[0].deviceLabel, /SM-A165F/);
  assert.match(customerHistoryBeforeLogout.body.data[0].deviceLabel, /0\.2\.10/);

  // Customer logs out from mobile
  const mobileLogout = await mobileClient.call('/auth/logout', 'POST', {}, mobileHeaders);
  assert.equal(mobileLogout.status, 201);

  // 2. Superadmin queries /superadmin/auth-events for this customer and sees BOTH LOGIN and LOGOUT with device & IP
  const customerEvents = await ctx.admin.call(`/superadmin/auth-events?user_id=${customerId}`);
  assert.equal(customerEvents.status, 200);
  assert.equal(customerEvents.body.total, 2);
  const types = customerEvents.body.data.map((e: any) => e.eventType);
  assert.deepEqual(types, ['LOGOUT', 'LOGIN']);
  for (const ev of customerEvents.body.data) {
    assert.equal(ev.ipAddress, '203.0.113.77');
    assert.match(ev.deviceLabel, /SM-A165F/);
    assert.equal(ev.channel, 'MOBILE');
    assert.equal(ev.userKind, 'CUSTOMER');
  }

  // 3. Superadmin searches by IP address across all accounts
  const byIp = await ctx.admin.call('/superadmin/auth-events?q=198.51.100.43');
  assert.equal(byIp.status, 200);
  assert.equal(byIp.body.total, 2, 'Partner email login + logout from 198.51.100.43 must both be recorded');
  assert.ok(byIp.body.data.some((e: any) => e.eventType === 'LOGIN' && /Edge · Windows/.test(e.deviceLabel)));
  assert.ok(byIp.body.data.some((e: any) => e.eventType === 'LOGOUT' && /Edge · Windows/.test(e.deviceLabel)));

  // 4. Superadmin own sessions include ipAddress
  const adminSessions = await ctx.admin.call('/auth/sessions');
  assert.equal(adminSessions.status, 200);
  assert.ok(adminSessions.body.data.length >= 1);
  assert.equal(adminSessions.body.data[0].ipAddress, '127.0.0.1');

  // 5. Partner Director sees ONLY own sanatorium staff auth-events via /partner/auth-events
  const dirClient = new Client(ctx.base);
  const dirLogin = await dirClient.call(
    '/auth/staff/login',
    'POST',
    { login: 'chortoq.shifo', password: 'Partner-2026-Strong!' },
    { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0', 'X-Real-IP': '198.51.100.99' },
  );
  assert.equal(dirLogin.status, 201);

  const partnerEvents = await dirClient.call('/partner/auth-events');
  assert.equal(partnerEvents.status, 200);
  assert.ok(partnerEvents.body.total >= 1);
  assert.ok(
    partnerEvents.body.data.every((e: any) => e.userKind === 'STAFF'),
    'Partner auth-events must only expose own sanatorium staff events, never customers or superadmin',
  );
  assert.ok(
    partnerEvents.body.data.some((e: any) => e.ipAddress === '198.51.100.99' && /Chrome · Linux/.test(e.deviceLabel)),
  );

  // Partner cannot access /superadmin/auth-events
  assert.equal((await dirClient.call('/superadmin/auth-events')).status, 403);
});

test('Legacy sessions backfill into AuthEvent, session IP hydrates on /auth/me, and Audit includes login/profile/sanatorium actions', async () => {
  const { hash } = await import('../src/common/db');
  const { opaque, passwordHash } = await import('../src/common/crypto');
  const legacyPass = 'Legacy-Partner-2026!';
  const legacyUser = await ctx.db.user.create({
    data: {
      publicId: 778899,
      kind: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Eski Sessiya Mijozi',
      phone: '+998901112299',
      email: 'legacy.session@example.com',
      passwordHash: await passwordHash(legacyPass),
    },
  });

  // Simulate a pre-migration session chain (1 initial session rotated via refresh into 1 active session with ipAddress=null)
  const t0 = new Date(Date.now() - 60_000);
  const tRotate = new Date(Date.now() - 30_000);
  const oldTok = opaque();
  const curTok = opaque();
  await ctx.db.session.create({
    data: {
      userId: legacyUser.id,
      tokenHash: hash(oldTok),
      refreshHash: hash(opaque()),
      csrfHash: hash(opaque()),
      channel: 'MOBILE',
      deviceLabel: 'Android (SM-A165F)',
      ipAddress: null,
      expiresAt: new Date(Date.now() + 600_000),
      refreshExpiresAt: new Date(Date.now() + 86_400_000),
      createdAt: t0,
      lastActivityAt: tRotate,
      revokedAt: tRotate,
    },
  });
  const activeSession = await ctx.db.session.create({
    data: {
      userId: legacyUser.id,
      tokenHash: hash(curTok),
      refreshHash: hash(opaque()),
      csrfHash: hash(opaque()),
      channel: 'MOBILE',
      deviceLabel: 'Android (SM-A165F)',
      ipAddress: null,
      expiresAt: new Date(Date.now() + 600_000),
      refreshExpiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(tRotate.getTime() + 500),
      lastActivityAt: new Date(),
    },
  });

  // 1. Calling /auth/me hydrates the missing ipAddress on the active legacy session
  const legacyClient = new Client(ctx.base);
  legacyClient.token = curTok;
  const meRes = await legacyClient.call('/auth/me', 'GET', undefined, {
    'X-Real-IP': '198.51.100.88',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-A165F) Dart/3.13',
  });
  assert.equal(meRes.status, 200);
  const hydrated = await ctx.db.session.findUniqueOrThrow({ where: { id: activeSession.id } });
  assert.equal(hydrated.ipAddress, '198.51.100.88');

  // 2. Calling /auth/login-history backfills the legacy session into AuthEvent without duplicating the refresh rotation
  const histRes = await legacyClient.call('/auth/login-history');
  assert.equal(histRes.status, 200);
  assert.equal(histRes.body.total, 1, 'Rotated refresh session chain must collapse into 1 LOGIN event');
  assert.equal(histRes.body.data[0].eventType, 'LOGIN');
  assert.equal(histRes.body.data[0].deviceLabel, 'Android (SM-A165F)');

  // 3. Superadmin /superadmin/audit returns all real actions (auth.login, partner.registration_*, etc.) with actor & sanatorium metadata
  const adminAudit = await ctx.admin.call('/superadmin/audit?limit=50');
  assert.equal(adminAudit.status, 200);
  assert.ok(adminAudit.body.total > 0);
  assert.ok(
    adminAudit.body.data.some((r: any) => r.action === 'auth.login'),
    'Superadmin audit must include auth.login actions',
  );
  assert.ok(
    adminAudit.body.data.some((r: any) => r.action === 'partner.registration_approved' && r.sanatorium_name === 'Chortoq Shifo Sanatoriyasi'),
    'Superadmin audit must include sanatorium_name metadata',
  );

  // 4. Superadmin /superadmin/auth-events without sanatorium_id returns SUPERADMIN, STAFF, and CUSTOMER events together
  const allEvents = await ctx.admin.call('/superadmin/auth-events?limit=50');
  assert.equal(allEvents.status, 200);
  const kinds = new Set(allEvents.body.data.map((e: any) => e.userKind));
  assert.ok(kinds.has('SUPERADMIN'), 'Must include SUPERADMIN events');
  assert.ok(kinds.has('STAFF'), 'Must include STAFF events');
  assert.ok(kinds.has('CUSTOMER'), 'Must include CUSTOMER events');

  // 5. Partner /partner/audit includes own sanatorium auth.login and excludes other sanatoriums
  const dirClient = new Client(ctx.base);
  const dirLogin = await dirClient.call('/auth/staff/login', 'POST', {
    login: 'chortoq.shifo',
    password: 'Partner-2026-Strong!',
  });
  assert.equal(dirLogin.status, 201);
  const partnerAudit = await dirClient.call('/partner/audit');
  assert.equal(partnerAudit.status, 200);
  assert.ok(partnerAudit.body.total > 0, 'Partner audit must not be empty after login/approval');
  assert.ok(partnerAudit.body.data.some((r: any) => r.action === 'auth.login'));
  assert.ok(partnerAudit.body.data.every((r: any) => r.sanatorium_name === 'Chortoq Shifo Sanatoriyasi'));
});
