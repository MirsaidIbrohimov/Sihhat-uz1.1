import { Inject, Injectable, Optional } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG, type Config } from '../common/config';
import { fail } from '../common/errors';
import { Db } from '../common/db';

@Injectable()
export class EmailService {
  readonly sent = new Map<string, string>();
  private transporter: Transporter | null = null;

  constructor(@Inject(CONFIG) private readonly config: Config, @Optional() @Inject(Db) private readonly db?: Db) {
    if (this.config.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_SECURE,
        auth: this.config.SMTP_USER
          ? {
              user: this.config.SMTP_USER,
              pass: this.config.SMTP_PASS,
            }
          : undefined,
      });
    }
  }

  async send(id: string, email: string, code: string, expiresAt: Date) {
    this.sent.set(id, code);

    // Development / demo file log
    if (!this.transporter || this.config.NODE_ENV !== 'production') {
      const folder = resolve('../../.local/dev-email');
      try {
        await mkdir(folder, { recursive: true });
        await writeFile(resolve(folder, `${id}.json`), JSON.stringify({ email, code, expiresAt }), { mode: 0o600 });
      } catch (_) {
        // Dev folder creation might fail silently if path not accessible
      }
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.config.SMTP_FROM || 'Sihhat uz <no-reply@sihhat.uz>',
          to: email,
          subject: `Sihhat uz — Kirish tasdiqlash kodi: ${code}`,
          text: `Sihhat uz ilovasiga kirish uchun tasdiqlash kodingiz: ${code}\n\nUshbu kod 2 daqiqa davomida amal qiladi. Kodni hech kimga bermang.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 20px auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
              <h2 style="color: #0d9488; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Sihhat uz</h2>
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px 0; line-height: 1.5;">
                Ilovaga kirish uchun quyidagi 6 xonali tasdiqlash kodini kiriting:
              </p>
              <div style="background: #f0fdfa; border: 1.5px dashed #0d9488; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace;">${code}</span>
              </div>
              <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
                Ushbu kod 2 daqiqa davomida amal qiladi. Kodni begonalarga bermang.
              </p>
            </div>
          `,
        });
      } catch (err: any) {
        console.error('[EmailService] SMTP error:', err?.message || err);
        if (this.config.NODE_ENV === 'production' && !this.config.DEMO_OTP_ENABLED) {
          fail('EMAIL_SEND_FAILED', 'Emailga kod yuborishda xatolik yuz berdi. Qayta urinib ko‘ring.', 500);
        }
      }
    }
  }
}
