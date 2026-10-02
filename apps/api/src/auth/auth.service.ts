import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { createHmac, randomInt } from 'node:crypto';
import { CONFIG, type Config } from '../common/config';
import { Db, audit, hash, lock, emit, type Tx } from '../common/db';
import { fail, parse, uuid } from '../common/errors';
import { decrypt, encrypt, matchTotp, opaque, passwordHash, passwordMatches } from '../common/crypto';
import { Sms } from './sms';
import { Actor, effective } from './permissions';

export const phoneSchema = z.string().transform(v => v.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+998\d{9}$/));
export const loginSchema = z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9._-]+$/);
export const passwordSchema = z.string().min(12).max(128).refine(v => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), 'Parolda katta/kichik harf va raqam bo‘lsin');
export const staffLoginInput = z.object({ login: loginSchema, password: z.string().min(1).max(128), mfa_code: z.string().regex(/^\d{6}$/).optional() }).strict();
export const otpRequestInput = z.object({ phone: phoneSchema }).strict();
export const otpVerifyInput = z.object({ challenge_id: uuid, code: z.string().regex(/^\d{6}$/) }).strict();
export const changePasswordInput = z.object({ current_password: z.string().max(128), new_password: passwordSchema }).strict();

@Injectable()
export class AuthService {
  constructor(@Inject(Db) readonly db: Db, @Inject(CONFIG) readonly config: Config, @Inject(Sms) readonly sms: Sms) {}
  async limit(key: string, max: number, seconds: number) {
    const id = hash(key);
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" (id, count, "expiresAt") VALUES (${id}, 1, now() + (${seconds} * interval '1 second'))
      ON CONFLICT (id) DO UPDATE SET count = CASE WHEN "RateLimit"."expiresAt" <= now() THEN 1 ELSE "RateLimit".count + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= now() THEN now() + (${seconds} * interval '1 second') ELSE "RateLimit"."expiresAt" END
      RETURNING count`;
    if (rows[0].count > max) fail('RATE_LIMITED', 'Urinishlar ko‘p. Birozdan keyin qayta urinib ko‘ring', 429);
  }
  private otpHash(id: string, code: string) { return createHmac('sha256', this.config.AUTH_SECRET).update(`${id}:${code}`).digest('hex'); }
  async login(body: unknown, ip: string) {
    const input = parse(staffLoginInput, body);
    await this.limit(`staff-login-ip:${ip}`, 30, 900);
    await this.limit(`staff-login:${input.login}`, 10, 900);
    const user = await this.db.user.findUnique({ where: { login: input.login } });
    const valid = await passwordMatches(input.password, user?.passwordHash ?? null);
    if (!user || !valid || user.status !== 'ACTIVE' || user.kind === 'CUSTOMER') fail('LOGIN_FAILED', 'Login yoki parol noto‘g‘ri', 401);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${user.id}`);
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (current.status !== 'ACTIVE' || current.passwordHash !== user.passwordHash) fail('LOGIN_FAILED', 'Kirish rad etildi', 401);
      if (current.kind === 'SUPERADMIN') {
        if (!current.mfaSecret || !input.mfa_code) fail('MFA_REQUIRED', 'Authenticator kodini kiriting', 401);
        const step = matchTotp(decrypt(current.mfaSecret, this.config.MFA_ENCRYPTION_KEY), input.mfa_code, current.mfaLastStep);
        if (step === null) fail('MFA_INVALID', 'MFA kodi xato yoki avval ishlatilgan', 401);
        await tx.user.update({ where: { id: current.id }, data: { mfaLastStep: step } });
      } else {
        const active = await tx.membership.count({ where: { userId: current.id, status: 'ACTIVE' } });
        if (!active) fail('STAFF_NOT_APPROVED', 'Hisob hali tasdiqlanmagan yoki bloklangan', 403);
      }
      const session = await this.issue(tx, current.id, 'WEB');
      await audit(tx, current.id, 'auth.login', current.id);
      return { ...session, user: this.publicUser(current) };
    });
  }
  async requestOtp(body: unknown, ip: string) {
    const { phone } = parse(otpRequestInput, body);
    await this.limit(`otp-ip:${ip}`, 20, 3600);
    await this.limit(`otp-phone:${phone}`, 10, 3600);
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge = await this.db.atomic(async tx => {
      await lock(tx, `otp:${phone}`);
      const recent = await tx.otpChallenge.findFirst({ where: { phone, purpose: 'LOGIN' }, orderBy: { createdAt: 'desc' } });
      if (recent && recent.createdAt.getTime() + this.config.OTP_RESEND_SECONDS * 1000 > Date.now()) fail('OTP_COOLDOWN', 'Qayta SMS uchun kuting', 429);
      const collision = await tx.user.findUnique({ where: { phone } });
      if (collision && collision.kind !== 'CUSTOMER') fail('CUSTOMER_AUTH_ONLY', 'Bu raqam xodim hisobiga tegishli', 403);
      await tx.otpChallenge.updateMany({ where: { phone, purpose: 'LOGIN', consumedAt: null }, data: { consumedAt: new Date() } });
      const { randomUUID } = await import('node:crypto'); const id = randomUUID();
      return tx.otpChallenge.create({ data: { id, phone, codeHash: this.otpHash(id, code), expiresAt: new Date(Date.now() + this.config.OTP_TTL_SECONDS * 1000) } });
    });
    await this.sms.send(challenge.id, phone, code, challenge.expiresAt);
    return { challenge_id: challenge.id, expires_at: challenge.expiresAt, resend_after: this.config.OTP_RESEND_SECONDS };
  }
  async verifyOtp(body: unknown, ip: string) {
    const input = parse(otpVerifyInput, body);
    await this.limit(`verify-ip:${ip}`, 40, 900);
    const result = await this.db.atomic(async tx => {
      await lock(tx, `challenge:${input.challenge_id}`);
      const challenge = await tx.otpChallenge.findUnique({ where: { id: input.challenge_id } });
      if (!challenge || challenge.purpose !== 'LOGIN' || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= this.config.OTP_MAX_ATTEMPTS) return null;
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      if (challenge.codeHash !== this.otpHash(challenge.id, input.code)) return null;
      await lock(tx, `otp:${challenge.phone}`);
      const user = await tx.user.upsert({ where: { phone: challenge.phone }, create: { kind: 'CUSTOMER', name: 'Mijoz', phone: challenge.phone }, update: {} });
      if (user.kind !== 'CUSTOMER' || user.status !== 'ACTIVE') return null;
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      await tx.booking.updateMany({where:{userId:null,source:{not:'APP'},guest:{path:['phone'],equals:challenge.phone}},data:{userId:user.id}});
      await audit(tx, user.id, 'auth.otp_login', user.id);
      return { ...await this.issue(tx, user.id, 'MOBILE'), user: this.publicUser(user) };
    });
    if (!result) fail('OTP_INVALID', 'Kod xato, muddati tugagan yoki ishlatilgan', 401);
    return result;
  }
  async issue(tx: Tx, userId: string, channel: string) {
    const token = opaque(), refresh = opaque(), csrf = opaque();
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 86400_000);
    const session = await tx.session.create({ data: { userId, channel, tokenHash: hash(token), refreshHash: hash(refresh), csrfHash: hash(csrf), expiresAt, refreshExpiresAt } });
    return { access_token: token, refresh_token: refresh, csrf_token: csrf, expires_at: expiresAt, refresh_expires_at: refreshExpiresAt, session_id: session.id };
  }
  async authenticate(token: string, channel: 'WEB' | 'MOBILE'): Promise<Actor> {
    const session = await this.db.session.findUnique({ where: { tokenHash: hash(token) } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.channel !== channel) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
    const user = await this.db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') fail('UNAUTHENTICATED', 'Hisob bloklangan', 401);
    const memberships = await this.db.membership.findMany({ where: { userId: user.id } });
    if (user.kind === 'STAFF' && !memberships.some(m => m.status === 'ACTIVE')) fail('STAFF_NOT_APPROVED', 'Xodim vakolati faol emas', 403);
    return { id: user.id, name: user.name, phone:user.phone, login:user.login, kind: user.kind, sessionId: session.id, mustChangePassword: user.mustChangePassword, memberships: memberships.map(m => ({ id: m.id, sanatoriumId: m.sanatoriumId, role: m.role, status: m.status, permissions: m.status === 'ACTIVE' ? effective(m) : [], version: m.version })) };
  }
  async csrf(sessionId: string, token: string | undefined, origin: string | undefined) {
    if (!token || !origin || !this.config.CORS_ORIGINS.split(',').includes(origin)) fail('CSRF_INVALID', 'Sahifani yangilab qayta urinib ko‘ring', 403);
    const session = await this.db.session.findUnique({ where: { id: sessionId } });
    if (!session || session.csrfHash !== hash(token)) fail('CSRF_INVALID', 'Sessiya himoyasi xatosi', 403);
  }
  async refresh(refreshToken: string, channel: 'WEB' | 'MOBILE', csrf?: string, origin?: string) {
    return this.db.atomic(async tx => {
      await lock(tx, `refresh:${hash(refreshToken)}`);
      const session = await tx.session.findUnique({ where: { refreshHash: hash(refreshToken) } });
      if (!session || session.revokedAt || session.refreshExpiresAt <= new Date() || session.channel !== channel) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
      if (channel === 'WEB') await this.csrf(session.id, csrf, origin);
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
      if (user.status !== 'ACTIVE' || (user.kind === 'STAFF' && !await tx.membership.count({ where: { userId: user.id, status: 'ACTIVE' } }))) fail('UNAUTHENTICATED', 'Hisob faol emas', 401);
      await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      return { ...await this.issue(tx, user.id, channel), user: this.publicUser(user) };
    });
  }
  async logout(actor: Actor) { await this.db.session.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date() } }); return { success: true }; }
  async changePassword(actor: Actor, body: unknown) {
    const input = parse(changePasswordInput, body);
    const user = await this.db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (user.kind === 'CUSTOMER' || !await passwordMatches(input.current_password, user.passwordHash)) fail('PASSWORD_INVALID', 'Joriy parol xato', 403);
    if (input.current_password === input.new_password) fail('PASSWORD_UNCHANGED', 'Yangi parol boshqacha bo‘lsin', 422);
    const next = await passwordHash(input.new_password);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${actor.id}`);
      const changed = await tx.user.updateMany({ where: { id: actor.id, passwordHash: user.passwordHash }, data: { passwordHash: next, mustChangePassword: false } });
      if (!changed.count) fail('VERSION_CONFLICT', 'Hisob o‘zgargan. Qayta kiring');
      await tx.session.updateMany({ where: { userId: actor.id, id: { not: actor.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, actor.id, 'auth.password_changed', actor.id);
      return { success: true };
    });
  }
  async profile(actor: Actor, body: unknown) {
    const input = parse(z.object({ name: z.string().trim().min(2).max(120), login: loginSchema.optional() }).strict(), body);
    if (actor.kind === 'CUSTOMER' && input.login) fail('PERMISSION_DENIED', 'Mijoz login bilan kirmaydi', 403);
    return this.db.atomic(async tx => {
      const user = await tx.user.update({ where: { id: actor.id }, data: input });
      await audit(tx, actor.id, 'account.profile_updated', actor.id, undefined, undefined, { name: user.name, login: user.login });
      return this.publicUser(user);
    });
  }
  async phoneChangeRequest(actor:Actor,body:unknown){
    if(actor.kind!=='CUSTOMER')fail('PERMISSION_DENIED','Faqat mijoz telefonini o‘zgartiradi',403);
    const i=parse(z.object({new_phone:phoneSchema}).strict(),body);await this.limit(`phone-change:${actor.id}`,5,3600);
    const codes=[randomInt(0,1000000).toString().padStart(6,'0'),randomInt(0,1000000).toString().padStart(6,'0')];
    const result=await this.db.atomic(async tx=>{await lock(tx,`user:${actor.id}`);const user=await tx.user.findUniqueOrThrow({where:{id:actor.id}});if(!user.phone||user.phone===i.new_phone)fail('PHONE_UNCHANGED','Yangi raqam boshqacha bo‘lsin',422);if(await tx.user.findUnique({where:{phone:i.new_phone}}))fail('PHONE_IN_USE','Yangi raqam boshqa hisobga tegishli',409);
      await tx.otpChallenge.updateMany({where:{actorId:actor.id,purpose:{in:['OLD_PHONE','NEW_PHONE']},consumedAt:null},data:{consumedAt:new Date()}});
      const rows=[];for(const[index,purpose]of ['OLD_PHONE','NEW_PHONE'].entries()){const{randomUUID}=await import('node:crypto');const id=randomUUID();rows.push(await tx.otpChallenge.create({data:{id,actorId:actor.id,purpose,phone:index===0?user.phone:i.new_phone,codeHash:this.otpHash(id,codes[index]),expiresAt:new Date(Date.now()+this.config.OTP_TTL_SECONDS*1000)}}));}return rows;});
    for(let n=0;n<result.length;n++)await this.sms.send(result[n].id,result[n].phone,codes[n],result[n].expiresAt);return {old_challenge_id:result[0].id,new_challenge_id:result[1].id,expires_at:result[0].expiresAt};
  }
  async phoneChangeConfirm(actor:Actor,body:unknown){
    if(actor.kind!=='CUSTOMER')fail('PERMISSION_DENIED','Faqat mijoz telefonini o‘zgartiradi',403);
    const i=parse(z.object({old_challenge_id:uuid,new_challenge_id:uuid,old_code:z.string().regex(/^\d{6}$/),new_code:z.string().regex(/^\d{6}$/)}).strict(),body);
    const result=await this.db.atomic(async tx=>{await lock(tx,`user:${actor.id}`);const user=await tx.user.findUniqueOrThrow({where:{id:actor.id}});const old=await tx.otpChallenge.findUnique({where:{id:i.old_challenge_id}}),next=await tx.otpChallenge.findUnique({where:{id:i.new_challenge_id}});
      if(!old||!next||old.purpose!=='OLD_PHONE'||next.purpose!=='NEW_PHONE'||old.phone!==user.phone||[old,next].some(c=>c.actorId!==actor.id||c.consumedAt||c.expiresAt<=new Date()||c.attempts>=this.config.OTP_MAX_ATTEMPTS))return null;
      await tx.otpChallenge.updateMany({where:{id:{in:[old.id,next.id]}},data:{attempts:{increment:1}}});if(old.codeHash!==this.otpHash(old.id,i.old_code)||next.codeHash!==this.otpHash(next.id,i.new_code))return null;
      await tx.otpChallenge.updateMany({where:{id:{in:[old.id,next.id]}},data:{consumedAt:new Date()}});const changed=await tx.user.update({where:{id:actor.id},data:{phone:next.phone}});await tx.session.updateMany({where:{userId:actor.id,id:{not:actor.sessionId},revokedAt:null},data:{revokedAt:new Date()}});await audit(tx,actor.id,'account.phone_changed',actor.id);return this.publicUser(changed);});
    if(!result)fail('OTP_INVALID','Ikkala raqamning tasdiqlash kodini tekshiring',401);return result;
  }
  async bootstrap(login: string, password: string, secret: string) {
    login = parse(loginSchema, login); password = parse(passwordSchema, password);
    const encoded = await passwordHash(password);
    return this.db.atomic(async tx => {
      await lock(tx, 'bootstrap');
      if (await tx.user.count({ where: { kind: 'SUPERADMIN' } })) fail('BOOTSTRAP_DISABLED', 'Superadmin mavjud. Bootstrap yopilgan', 403);
      const user = await tx.user.create({ data: { kind: 'SUPERADMIN', name: 'Superadmin', login, passwordHash: encoded, mfaSecret: encrypt(secret, this.config.MFA_ENCRYPTION_KEY) } });
      await audit(tx, user.id, 'auth.bootstrap', user.id); return this.publicUser(user);
    });
  }
  publicUser(user: { id: string; kind: string; name: string; phone: string | null; login: string | null; mustChangePassword: boolean }) {
    return { id: user.id, kind: user.kind, name: user.name, phone: user.phone, login: user.login, must_change_password: user.mustChangePassword };
  }
}
