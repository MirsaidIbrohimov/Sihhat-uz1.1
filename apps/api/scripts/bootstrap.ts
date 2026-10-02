import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app';
import { AuthService } from '../src/auth/auth.service';
import { base32 } from '../src/common/crypto';

async function main() {
  if (!process.env.BOOTSTRAP_LOGIN || !process.env.BOOTSTRAP_PASSWORD) throw new Error('BOOTSTRAP_LOGIN va BOOTSTRAP_PASSWORD environment orqali kerak');
  const { app } = await createApp({ quiet: true, swagger: false });
  try {
    const secret = base32(randomBytes(20));
    await app.get(AuthService).bootstrap(process.env.BOOTSTRAP_LOGIN, process.env.BOOTSTRAP_PASSWORD, secret);
    console.log(`Superadmin yaratildi. Bir martalik MFA ulash URI: otpauth://totp/Sihhat%20uz:${encodeURIComponent(process.env.BOOTSTRAP_LOGIN)}?secret=${secret}&issuer=Sihhat%20uz`);
  } finally { await app.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
