import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../src/app';
import { Db, audit, lock } from '../src/common/db';
import { base32, encrypt, decrypt, passwordHash, passwordMatches } from '../src/common/crypto';
import { loginSchema, passwordSchema } from '../src/auth/auth.service';

type Access = { login: string; password: string; mfa_secret: string; created_at: string };

async function main() {
  const { app, config } = await createApp({ quiet: true, swagger: false });
  try {
    const url = new URL(config.DATABASE_URL);
    if (config.NODE_ENV !== 'development' || url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/sihhat') {
      throw new Error('LOCAL_ONLY');
    }
    const folder = resolve('../../.local');
    await mkdir(folder, { recursive: true });
    const path = resolve(folder, 'superadmin-access.json');
    let access: Access;
    try { access = JSON.parse(await readFile(path, 'utf8')); }
    catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      access = { login: 'sihhat.owner', password: `Su9!${randomBytes(24).toString('base64url')}`, mfa_secret: base32(randomBytes(20)), created_at: new Date().toISOString() };
      await writeFile(path, JSON.stringify(access, null, 2), { mode: 0o600, flag: 'wx' });
    }
    loginSchema.parse(access.login);
    passwordSchema.parse(access.password);
    if (!/^[A-Z2-7]{32}$/.test(access.mfa_secret)) throw new Error('ACCESS_INVALID');
    const db = app.get(Db);
    const encoded = await passwordHash(access.password);
    await db.atomic(async tx => {
      await lock(tx, 'local-owner');
      const existing = await tx.user.findUnique({ where: { login: access.login } });
      if (existing) {
        if (existing.kind !== 'SUPERADMIN' || existing.status !== 'ACTIVE' || !existing.mfaSecret || !await passwordMatches(access.password, existing.passwordHash) || decrypt(existing.mfaSecret, config.MFA_ENCRYPTION_KEY) !== access.mfa_secret) throw new Error('ACCESS_CHANGED');
        return;
      }
      const user = await tx.user.create({ data: { kind: 'SUPERADMIN', name: 'Sihhat uz egasi', login: access.login, passwordHash: encoded, mfaSecret: encrypt(access.mfa_secret, config.MFA_ENCRYPTION_KEY) } });
      await audit(tx, user.id, 'auth.local_owner_provisioned', user.id);
    });
    const uri = `otpauth://totp/Sihhat%20uz:${encodeURIComponent(access.login)}?secret=${access.mfa_secret}&issuer=Sihhat%20uz`;
    const template = await readFile(resolve('scripts/local-access.html'), 'utf8');
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    const html = template.replace(/\{\{(LOGIN|PASSWORD|MFA_SECRET|MFA_URI)\}\}/g, (_, key: string) => escape(({ LOGIN: access.login, PASSWORD: access.password, MFA_SECRET: access.mfa_secret, MFA_URI: uri } as Record<string, string>)[key]));
    await writeFile(resolve(folder, 'SUPERADMIN_KIRISH.html'), html, { mode: 0o600 });
    const text = `Sihhat uz — lokal superadmin\n\nSayt: http://localhost:3000\nLogin: ${access.login}\nParol: ${access.password}\nMFA kaliti: ${access.mfa_secret}\nMFA ulash: ${uri}\n\nJonli MFA kod: .local/SUPERADMIN_KIRISH.html faylini brauzerda oching.\nYoki MFA kalitini authenticator ilovasiga kiriting (TOTP, 6 raqam, 30 soniya).\nKod har 30 soniyada almashadi va bir marta ishlatiladi.\n\nDirektor/resepsion: http://localhost:3001\nXizmatlarni ishga tushirish: npm run local:start\nHolat: npm run local:status\nTo'xtatish: npm run local:stop\nAPK: .local/releases/sihhat-uz-preview.apk\nTelefon USBga ulangan bo'lishi kerak; APK lokal demo SMS bilan ishlaydi.\n\nBu fayl maxfiy. Gitga yoki umumiy joyga ko'chirmang.\n`;
    await writeFile(resolve(folder, 'SUPERADMIN_KIRISH.txt'), text, { mode: 0o600 });
    console.log('Lokal superadmin tayyor. Login/parol/MFA: .local/SUPERADMIN_KIRISH.html va .txt. Mavjud hisoblar saqlandi; sirlar logga chiqarilmadi.');
  } finally { await app.close(); }
}
main().catch(() => { console.error('Lokal superadmin tayyorlanmadi. Development konfiguratsiyasi, baza yoki mavjud kirish faylini tekshiring; mavjud hisob paroli avtomatik almashtirilmaydi.'); process.exitCode = 1; });
