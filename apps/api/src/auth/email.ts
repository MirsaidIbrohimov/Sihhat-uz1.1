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
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 36px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 32px; text-align: center;">
                          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Sihhat<span style="opacity: 0.85;">.uz</span></h1>
                          <p style="color: #ecfdf5; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Sanatoriylarni onlayn tanlash va bron qilish</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px 32px 24px 32px;">
                          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Kirishni tasdiqlang</h2>
                          <p style="font-size: 15px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
                            Ilovaga kirish uchun quyidagi 6 xonali bir martalik tasdiqlash kodidan foydalaning:
                          </p>
                          <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                            <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #065f46; font-family: 'Courier New', Courier, monospace; line-height: 1;">
                              ${code}
                            </div>
                          </div>
                          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px;">
                            <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
                              ⚠️ <strong>Muhim:</strong> Ushbu kod <strong>2 daqiqa</strong> davomida amal qiladi. Kodni begonalarga bermang.
                            </p>
                          </div>
                          <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">
                            Agar siz bu so‘rovni amalga oshirmagan bo‘lsangiz, ushbu xatni e’tiborsiz qoldiring.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 18px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                            © ${new Date().getFullYear()} Sihhat.uz · Barcha huquqlar himoyalangan.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
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
