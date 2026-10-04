import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { setup, Client, staff, testPassword } from './helpers';
import { totp, base32 } from '../src/common/crypto';
import { loadConfig } from '../src/common/config';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => { ctx = await setup(); });
after(async () => { await ctx?.app.close(); });
test('B0: live/ready, request IDs and required env validation', async () => {
  assert.equal((await ctx.admin.call('/health/live')).status, 200);
  const ready = await ctx.admin.call('/health/ready'); assert.equal(ready.status, 200); assert.match(ready.headers.get('x-request-id')!, /^[0-9a-f-]{36}$/);
  assert.throws(() => loadConfig({}), /Konfiguratsiya xatosi/);
  assert.equal(totp(base32(Buffer.from('12345678901234567890')), 1, 8), '94287082');
});
test('B1: superadmin cannot log in without MFA; TOTP cannot be replayed', async () => {
  const client = new Client(ctx.base);
  assert.equal((await client.call('/auth/staff/login', 'POST', { login: 'admin.test', password: testPassword })).body.code, 'MFA_REQUIRED');
  assert.equal((await client.call('/auth/staff/login', 'POST', { login: 'admin.test', password: testPassword, mfa_code: ctx.mfaCode })).body.code, 'MFA_INVALID');
  assert.equal((await ctx.auth.db.user.findFirst({ where: { kind: 'SUPERADMIN' } }))?.mfaSecret?.includes(ctx.secret), false);
});
test('B1: OTP survives incorrect-attempt accounting and is consumed once under concurrency', async () => {
  const client = new Client(ctx.base); const request = await client.call('/auth/customer/otp/request', 'POST', { phone: '+998901234567' });
  assert.equal(request.status, 201); assert.equal(request.body.code, undefined);
  assert.equal(request.body.demo_code, undefined);
  const challenge = request.body.challenge_id; const code = ctx.auth.sms.sent.get(challenge)!;
  const wrong = code === '000000' ? '000001' : '000000';
  assert.equal((await client.call('/auth/customer/otp/verify','POST',{ challenge_id: challenge, code: wrong })).status, 401);
  assert.equal((await ctx.db.otpChallenge.findUniqueOrThrow({ where: { id: challenge } })).attempts, 1);
  const results = await Promise.all([client.call('/auth/customer/otp/verify','POST',{ challenge_id: challenge, code }),client.call('/auth/customer/otp/verify','POST',{ challenge_id: challenge, code })]);
  assert.deepEqual(results.map(r => r.status).sort(), [201,401]);
  assert.equal((await client.call('/auth/customer/otp/request','POST',{ phone: '+998901234567' })).status, 429);
});
test('B1: opt-in local demo code uses normal OTP verification, creates a customer only after confirmation and cannot be replayed', async () => {
  const config = ctx.auth.config, saved = config.DEMO_OTP_ENABLED;
  config.DEMO_OTP_ENABLED = true;
  try {
    const phone = `+99890${randomInt(1_000_000, 10_000_000)}`, client = new Client(ctx.base);
    const request = await client.call('/auth/customer/otp/request', 'POST', { phone });
    assert.equal(request.status, 201);
    assert.match(request.body.demo_code, /^\d{6}$/);
    assert.equal(await ctx.db.user.findUnique({ where: { phone } }), null);
    const challenge_id = request.body.challenge_id, code = request.body.demo_code;
    assert.equal(code, ctx.auth.sms.sent.get(challenge_id));
    const wrong = code === '000000' ? '000001' : '000000';
    assert.equal((await client.call('/auth/customer/otp/verify', 'POST', { challenge_id, code: wrong })).status, 401);
    assert.equal(await ctx.db.user.findUnique({ where: { phone } }), null);
    const login = await client.call('/auth/customer/otp/verify', 'POST', { challenge_id, code });
    assert.equal(login.status, 201);
    client.token = login.body.access_token;
    assert.equal((await client.call('/auth/me')).body.kind, 'CUSTOMER');
    assert.equal((await client.call('/auth/customer/otp/verify', 'POST', { challenge_id, code })).status, 401);
    const anotherPhone = `+99891${randomInt(1_000_000, 10_000_000)}`;
    const expired = await client.call('/auth/customer/otp/request', 'POST', { phone: anotherPhone });
    await ctx.db.otpChallenge.update({ where: { id: expired.body.challenge_id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await client.call('/auth/customer/otp/verify', 'POST', { challenge_id: expired.body.challenge_id, code: expired.body.demo_code })).status, 401);
  } finally { config.DEMO_OTP_ENABLED = saved; }
});
test('B1: demo OTP configuration is rejected for production or a real SMS adapter', () => {
  assert.throws(() => loadConfig({ ...process.env, NODE_ENV: 'production', DEMO_OTP_ENABLED: 'true' }), /Demo OTP/);
  assert.throws(() => loadConfig({ ...process.env, NODE_ENV: 'development', SMS_ADAPTER: 'http', DEMO_OTP_ENABLED: 'true' }), /Demo OTP/);
});
test('B1: cross-tenant reads, writes and staff escalation are denied; blocking invalidates session', async () => {
  const a = (await ctx.admin.call('/superadmin/sanatoriums','POST',{ name: 'Sanatoriya A' })).body;
  const b = (await ctx.admin.call('/superadmin/sanatoriums','POST',{ name: 'Sanatoriya B' })).body;
  const director = await staff(ctx.admin, 'director.a', '+998901111111', a.id);
  assert.equal((await director.client.call(`/partner/sanatoriums/${b.id}`)).status, 404);
  assert.equal((await director.client.call(`/partner/sanatorium-revisions/${b.revision.id}`,'PATCH',{ version: 1, data: { name: 'Hack' } })).status, 404);
  const invitation = await director.client.call('/partner/staff-invitations','POST',{ sanatorium_id:a.id,name:'Pending',login:'pending.a',phone:'+998902222222',temporary_password:testPassword });
  assert.equal(invitation.status,201); assert.equal(invitation.body.membership.status,'PENDING_APPROVAL');
  const pending = new Client(ctx.base);
  assert.equal((await pending.call('/auth/staff/login','POST',{ login:'pending.a',password:testPassword })).status,403);
  const member = invitation.body.membership;
  assert.equal((await director.client.call(`/partner/staff/${member.id}/permissions`,'PATCH',{ version:1,grants:['payouts.manage'],denies:[] })).status,422);
  assert.equal((await director.client.call(`/partner/staff/${director.membership.id}/permissions`,'PATCH',{ version:1,grants:[],denies:[] })).status,403);
  assert.equal((await ctx.admin.call(`/superadmin/staff-approvals/${member.id}/approve`,'POST',{ version:1 })).status,201);
  assert.equal((await pending.call('/auth/staff/login','POST',{ login:'pending.a',password:testPassword })).status,201);
  assert.equal((await pending.call('/partner/sanatoriums')).body.code,'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await pending.call('/auth/change-password','POST',{ current_password:testPassword,new_password:`${testPassword}Changed` })).status,201);
  assert.equal((await ctx.admin.call(`/superadmin/staff/${member.id}/block`,'POST',{ version:2,reason:'Test uchun bloklash' })).status,201);
  assert.equal((await pending.call('/partner/sanatoriums')).status,401);
});
test('B1: web mutations require CSRF; mobile cannot impersonate staff', async () => {
  const csrf = ctx.admin.csrf; ctx.admin.csrf = '';
  assert.equal((await ctx.admin.call('/superadmin/sanatoriums','POST',{ name:'CSRF' })).status,403); ctx.admin.csrf=csrf;
  const mobile = new Client(ctx.base); mobile.token=ctx.admin.cookies.get('sihhat_access')!;
  assert.equal((await mobile.call('/superadmin/sanatoriums')).status,401);
  assert.equal((await ctx.admin.call('/partner/sanatoriums/'+randomUUID())).status,404);
});
