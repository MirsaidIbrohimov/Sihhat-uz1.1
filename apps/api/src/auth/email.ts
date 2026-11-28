import { Inject, Injectable, Optional } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG, type Config } from '../common/config';
import { formatAdminAlert } from '../common/admin-alerts';
import { fail } from '../common/errors';
import { Db } from '../common/db';

@Injectable()
export class EmailService {
  readonly sent = new Map<string, string>();
  readonly sentAlerts: Array<{ id: string; to: string; topic: string; subject: string; text: string }> = [];
  readonly sentPartnerEmails: Array<{
    id: string;
    to: string;
    kind: 'approved' | 'rejected';
    subject: string;
    text: string;
    username: string;
    sanatoriumName: string;
  }> = [];
  readonly sentDeleteCodes: Array<{
    id: string;
    to: string;
    code: string;
    sanatoriumName: string;
  }> = [];
  private transporter: Transporter | null = null;

  get configured(): boolean {
    return Boolean(this.config.RESEND_API_KEY || this.transporter);
  }

  constructor(@Inject(CONFIG) private readonly config: Config, @Optional() @Inject(Db) private readonly db?: Db) {
    if (this.config.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_SECURE,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
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

    const subject = `Sihhat uz — Kirish tasdiqlash kodi: ${code}`;
    const text = `Sihhat uz ilovasiga kirish uchun tasdiqlash kodingiz: ${code}\n\nUshbu kod 2 daqiqa davomida amal qiladi. Kodni hech kimga bermang.`;
    const html = `
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
          `;

    return this.deliverEmail({
      id: `otp-${id}`,
      to: email,
      subject,
      text,
      html,
      devPayload: { email, code, expiresAt },
      failOnError: true,
      errorMessage: 'Emailga kod yuborishda xatolik yuz berdi. Qayta urinib ko‘ring.',
    });
  }

  async sendSanatoriumDeleteCode(params: {
    id: string;
    email: string;
    code: string;
    sanatoriumName: string;
    adminName?: string | null;
    expiresAt: Date;
  }) {
    if (this.config.NODE_ENV !== 'production') {
      this.sentDeleteCodes.push({
        id: params.id,
        to: params.email,
        code: params.code,
        sanatoriumName: params.sanatoriumName,
      });
    }
    const greeting = params.adminName?.trim()
      ? `Assalomu alaykum, ${params.adminName.trim()}!`
      : 'Assalomu alaykum, Superadmin!';
    const subject = `Sihhat.uz — Sanatoriyani o‘chirish tasdiqlash kodi: ${params.code}`;
    const text = `${greeting}\n\n«${params.sanatoriumName}» sanatoriyasini tizimdan butunlay o‘chirish uchun 6 xonali tasdiqlash kodi: ${params.code}\n\nUshbu kod 5 daqiqa davomida amal qiladi. Agar bu amalni siz bajarmayotgan bo‘lsangiz, kodni hech kimga bermang va parolingizni tekshiring.`;

    const safeGreeting = this.escapeHtml(greeting);
    const safeSanatorium = this.escapeHtml(params.sanatoriumName);
    const safeCode = this.escapeHtml(params.code);

    const html = `
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 36px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #fecaca; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 26px 32px; text-align: center;">
                          <div style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px;">XAVFSIZLIK TASDIQLASH KODI</div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">Sihhat.uz</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px 32px 24px 32px;">
                          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">Sanatoriyani o‘chirishni tasdiqlang</h2>
                          <p style="font-size: 14px; color: #475569; margin: 0 0 18px 0; line-height: 1.6;">
                            ${safeGreeting} Superadmin panelida <strong>«${safeSanatorium}»</strong> sanatoriyasini tizimdan o‘chirish so‘rovi yuborildi.
                          </p>
                          <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px;">
                            <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #991b1b; font-family: 'Courier New', Courier, monospace; line-height: 1;">
                              ${safeCode}
                            </div>
                          </div>
                          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-bottom: 18px;">
                            <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
                              ⚠️ <strong>Diqqat:</strong> Kod <strong>5 daqiqa</strong> amal qiladi. Sanatoriya o‘chirilsa, unga tegishli profil, xonalar va bog‘langan ma’lumotlar qayta tiklanmaydi.
                            </p>
                          </div>
                          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                            Agar bu so‘rovni siz yubormagan bo‘lsangiz, kodni hech kimga bermang va hisobingiz xavfsizligini tekshiring.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Sihhat.uz · Superadmin xavfsizlik tizimi</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;

    return this.deliverEmail({
      id: `sanatorium-delete-${params.id}`,
      to: params.email,
      subject,
      text,
      html,
      devPayload: {
        email: params.email,
        code: params.code,
        sanatoriumName: params.sanatoriumName,
        expiresAt: params.expiresAt,
      },
      failOnError: true,
      errorMessage: 'Admin emailiga tasdiqlash kodini yuborishda xatolik yuz berdi. Qayta urinib ko‘ring yoki admin paroli orqali tasdiqlang.',
    });
  }

  async sendSupportReplyNotification(params: {
    id: string;
    email: string;
    recipientName?: string | null;
    ticketTitle: string;
    messageText: string;
    hasAttachment?: boolean;
  }) {
    const cleanName = params.recipientName && !['Mijoz', 'User'].includes(params.recipientName)
      ? params.recipientName.trim()
      : '';
    const previewRaw = params.messageText.trim() || (params.hasAttachment ? '📎 Fayl yoki rasm yuborildi' : 'Yangi javob');
    const previewShort = previewRaw.length > 500 ? `${previewRaw.slice(0, 497)}...` : previewRaw;
    const attachmentLine = params.hasAttachment && params.messageText.trim() ? '\n📎 Qo‘shimcha fayl/rasm biriktirilgan.' : '';

    const subject = `Sihhat.uz — Sizga admin javob berdi`;
    const greetingText = cleanName ? `Assalomu alaykum, ${cleanName}!` : 'Assalomu alaykum!';
    const text = `${greetingText}\n\nYordam xizmati bo‘limida sizga admin javob berdi.\n\nMavzu: ${params.ticketTitle}\nXabar: ${previewShort}${attachmentLine}\n\nBatafsil o‘qish va javob yozish uchun Sihhat.uz mobil ilovasining «Yordam xizmati» bo‘limiga kiring.`;

    const safeGreeting = this.escapeHtml(greetingText);
    const safeTitle = this.escapeHtml(params.ticketTitle);
    const safePreview = this.escapeHtml(previewShort).replace(/\r?\n/g, '<br/>');
    const attachmentHtml = params.hasAttachment && params.messageText.trim()
      ? `<p style="font-size: 13px; color: #047857; margin: 10px 0 0 0; font-weight: 600;">📎 Xabarga rasm yoki fayl ham biriktirilgan.</p>`
      : '';

    const html = `
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 36px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 26px 32px; text-align: center;">
                          <h1 style="color: #ffffff; font-size: 25px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Sihhat<span style="opacity: 0.85;">.uz</span></h1>
                          <p style="color: #ecfdf5; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Yordam xizmati bildirishnomasi</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px 32px 24px 32px;">
                          <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">Sizga admin javob berdi</h2>
                          <p style="font-size: 14px; color: #475569; margin: 0 0 18px 0; line-height: 1.6;">
                            ${safeGreeting} «Yordam xizmati» bo‘limidagi murojaatingiz bo‘yicha sizga yangi javob keldi.
                          </p>
                          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 700; margin-bottom: 4px;">Murojaat mavzusi</div>
                            <div style="font-size: 14px; color: #0f172a; font-weight: 700;">${safeTitle}</div>
                          </div>
                          <div style="background: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; font-weight: 700; margin-bottom: 6px;">Admin javobi</div>
                            <div style="font-size: 14px; color: #064e3b; line-height: 1.55; word-break: break-word;">${safePreview}</div>
                            ${attachmentHtml}
                          </div>
                          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.55;">
                            To‘liq suhbatni ko‘rish va javob yozish uchun <strong>Sihhat.uz</strong> ilovasidagi «Yordam xizmati» bo‘limini oching.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
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
          `;

    return this.deliverEmail({
      id: `support-${params.id}`,
      to: params.email,
      subject,
      text,
      html,
      devPayload: {
        email: params.email,
        ticketTitle: params.ticketTitle,
        messageText: previewShort,
        hasAttachment: Boolean(params.hasAttachment),
      },
      failOnError: false,
      errorMessage: 'Yordam xizmati bildirishnomasini emailga yuborishda xatolik',
    });
  }

  async sendAdminAlert(params: {
    id: string;
    email: string;
    recipientName?: string | null;
    topic: string;
    payload: Record<string, any>;
    failOnError?: boolean;
  }): Promise<'SENT' | 'SKIPPED'> {
    if (this.config.NODE_ENV === 'production' && !this.configured) {
      return 'SKIPPED';
    }
    const alert = formatAdminAlert(params.topic, params.payload);
    const greeting = params.recipientName?.trim() ? `Assalomu alaykum, ${params.recipientName.trim()}!` : 'Assalomu alaykum, Superadmin!';
    const detailsText = alert.rows.map(r => `• ${r.label}: ${r.value}`).join('\n');
    const text = `${greeting}\n\n${alert.headline}\n${alert.summary}\n\n${detailsText}\n\nSihhat.uz Superadmin paneli`;

    const headerBg = alert.severity === 'critical'
      ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
      : alert.severity === 'warning'
        ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
        : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';

    const rowsHtml = alert.rows
      .map(
        r => `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; width: 38%;">${this.escapeHtml(r.label)}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">${this.escapeHtml(r.value)}</td></tr>`,
      )
      .join('');

    const panelUrl = this.config.TELEGRAM_ADMIN_URL
      ? `${this.config.TELEGRAM_ADMIN_URL.replace(/\/+$/, '')}/${alert.siteSection || 'dashboard'}`
      : '';
    const buttonHtml = panelUrl && /^https:\/\//.test(panelUrl)
      ? `<div style="margin-top: 20px; text-align: center;"><a href="${this.escapeHtml(panelUrl)}" style="display: inline-block; background: #087d66; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 11px 22px; border-radius: 10px;">Superadmin panelini ochish</a></div>`
      : '';

    const html = `
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 32px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td style="background: ${headerBg}; padding: 24px 30px; text-align: center;">
                          <div style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px;">${this.escapeHtml(alert.badge)}</div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">Sihhat.uz</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 26px 30px;">
                          <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">${this.escapeHtml(alert.headline)}</h2>
                          <p style="font-size: 14px; color: #475569; margin: 0 0 18px 0; line-height: 1.6;">${this.escapeHtml(greeting)} ${this.escapeHtml(alert.summary)}</p>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            ${rowsHtml}
                          </table>
                          ${buttonHtml}
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 14px 30px; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Sihhat.uz · Xavfsizlik va monitoring tizimi</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>`;

    if (this.config.NODE_ENV !== 'production') {
      this.sentAlerts.push({ id: params.id, to: params.email, topic: params.topic, subject: alert.subject, text });
    }

    await this.deliverEmail({
      id: `admin-alert-${params.id}`,
      to: params.email,
      subject: alert.subject,
      text,
      html,
      devPayload: { email: params.email, topic: params.topic, subject: alert.subject, rows: alert.rows, payload: params.payload },
      failOnError: params.failOnError ?? false,
      errorMessage: 'Superadmin email ogohlantirishini yuborishda xatolik',
    });
    return 'SENT';
  }

  async sendPartnerAccountApproved(params: {
    id: string;
    email: string;
    applicantName: string;
    username: string;
    publicId?: number | null;
    sanatoriumName: string;
    region?: string | null;
  }): Promise<'SENT' | 'SKIPPED' | 'FAILED'> {
    if (this.config.NODE_ENV === 'production' && !this.configured) {
      return 'SKIPPED';
    }
    const partnerUrl = (this.config.TELEGRAM_PARTNER_URL || 'https://www.sihhat.uz/hamkorlar').replace(/\/+$/, '');
    const subject = `Sihhat.uz — «${params.sanatoriumName}» hamkor hisobingiz ochildi!`;
    const publicIdLine = params.publicId ? `\n• Foydalanuvchi ID: #${params.publicId}` : '';
    const regionLine = params.region ? `\n• Hudud: ${params.region}` : '';
    const text =
      `Assalomu alaykum, ${params.applicantName}!\n\n` +
      `Tabriklaymiz! «${params.sanatoriumName}» sanatoriyasi bo‘yicha hamkorlik arizangiz Superadmin tomonidan tasdiqlandi.\n` +
      `Hamkor hisobingiz ochildi va sanatoriyangiz Sihhat.uz sanatoriyalar ro‘yxatiga qo‘shilib, foydalanuvchilarga ko‘rinmoqda.\n\n` +
      `Hisob ma’lumotlaringiz:\n` +
      `• Sanatoriya: ${params.sanatoriumName}${regionLine}${publicIdLine}\n` +
      `• Username (Login): @${params.username}\n` +
      `• Email: ${params.email}\n` +
      `• Lavozim: Direktor\n\n` +
      `Ro‘yxatdan o‘tishda o‘zingiz kiritgan parol bilan Hamkorlar paneliga kirishingiz mumkin:\n${partnerUrl}\n\n` +
      `Panel ichida sanatoriyangiz rasmlari, xonalar, tariflar va qo‘shimcha ma’lumotlarni istalgan payt yangilashingiz mumkin.\n\n` +
      `Hurmat bilan,\nSihhat.uz jamoasi`;

    const safeName = this.escapeHtml(params.applicantName);
    const safeSan = this.escapeHtml(params.sanatoriumName);
    const safeUsername = this.escapeHtml(params.username);
    const safeEmail = this.escapeHtml(params.email);
    const safeRegion = params.region ? this.escapeHtml(params.region) : '';
    const safeUrl = this.escapeHtml(partnerUrl);

    const rowsHtml = [
      { label: 'Sanatoriya', value: safeSan },
      ...(safeRegion ? [{ label: 'Hudud', value: safeRegion }] : []),
      ...(params.publicId ? [{ label: 'Foydalanuvchi ID', value: `#${params.publicId}` }] : []),
      { label: 'Username (Login)', value: `@${safeUsername}` },
      { label: 'Elektron pochta', value: safeEmail },
      { label: 'Lavozim', value: 'Direktor (Faol)' },
    ]
      .map(
        (r) =>
          `<tr><td style="padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; width: 40%;">${r.label}</td><td style="padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700;">${r.value}</td></tr>`,
      )
      .join('');

    const html = `
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 36px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 32px; text-align: center;">
                          <div style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 999px; margin-bottom: 8px;">HAMKOR HISOBI TASDIQLANDI</div>
                          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0;">Sihhat<span style="opacity: 0.85;">.uz</span></h1>
                          <p style="color: #ecfdf5; font-size: 13px; margin: 6px 0 0 0;">Hamkorlar boshqaruv portali</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px 32px 24px 32px;">
                          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Hisobingiz ochildi!</h2>
                          <p style="font-size: 14px; color: #334155; margin: 0 0 18px 0; line-height: 1.65;">
                            Assalomu alaykum, <strong>${safeName}</strong>! «<strong>${safeSan}</strong>» sanatoriyasi bo‘yicha arizangiz Superadmin tomonidan tasdiqlandi.
                            Hamkor hisobingiz faollashtirildi va sanatoriyangiz Sihhat.uz katalogiga qo‘shilib foydalanuvchilarga ko‘rinmoqda.
                          </p>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 22px;">
                            ${rowsHtml}
                          </table>
                          <div style="text-align: center; margin-bottom: 20px;">
                            <a href="${safeUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 26px; border-radius: 12px;">Hamkorlar paneliga kirish →</a>
                          </div>
                          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.55;">
                            Ariza topshirishda o‘zingiz yaratgan parol bilan kirishingiz mumkin. Panel ichida sanatoriya rasmlarini, xonalarni va tariflarni istalgan payt boyitishingiz mumkin.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Sihhat.uz · Barcha huquqlar himoyalangan.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>`;

    if (this.config.NODE_ENV !== 'production') {
      this.sentPartnerEmails.push({
        id: params.id,
        to: params.email,
        kind: 'approved',
        subject,
        text,
        username: params.username,
        sanatoriumName: params.sanatoriumName,
      });
    }

    try {
      await this.deliverEmail({
        id: `partner-approved-${params.id}`,
        to: params.email,
        subject,
        text,
        html,
        devPayload: {
          email: params.email,
          kind: 'approved',
          applicantName: params.applicantName,
          username: params.username,
          publicId: params.publicId ?? null,
          sanatoriumName: params.sanatoriumName,
          partnerUrl,
        },
        failOnError: false,
        errorMessage: 'Hamkor hisobi tasdiqlanganligi haqidagi emailni yuborishda xatolik',
      });
      return 'SENT';
    } catch {
      return 'FAILED';
    }
  }

  async sendPartnerAccountRejected(params: {
    id: string;
    email: string;
    applicantName: string;
    username: string;
    sanatoriumName: string;
    reason: string;
  }): Promise<'SENT' | 'SKIPPED' | 'FAILED'> {
    if (this.config.NODE_ENV === 'production' && !this.configured) {
      return 'SKIPPED';
    }
    const subject = `Sihhat.uz — «${params.sanatoriumName}» hamkorlik arizasi bo‘yicha qaror`;
    const text =
      `Assalomu alaykum, ${params.applicantName}!\n\n` +
      `«${params.sanatoriumName}» sanatoriyasi bo‘yicha yuborgan hamkorlik arizangiz ko‘rib chiqildi va hozircha tasdiqlanmadi.\n\n` +
      `Sabab / izoh: ${params.reason}\n\n` +
      `Kamchiliklarni bartaraf etib, Hamkorlar paneli orqali qayta ariza topshirishingiz mumkin.\n\n` +
      `Hurmat bilan,\nSihhat.uz jamoasi`;

    const safeName = this.escapeHtml(params.applicantName);
    const safeSan = this.escapeHtml(params.sanatoriumName);
    const safeReason = this.escapeHtml(params.reason).replace(/\r?\n/g, '<br/>');

    const html = `
            <!doctype html>
            <html lang="uz">
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 36px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 24px 32px; text-align: center;">
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">Sihhat.uz</h1>
                          <p style="color: #e2e8f0; font-size: 13px; margin: 6px 0 0 0;">Hamkorlik arizasi holati</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 28px 32px;">
                          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Arizangiz hozircha tasdiqlanmadi</h2>
                          <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
                            Assalomu alaykum, <strong>${safeName}</strong>! «<strong>${safeSan}</strong>» sanatoriyasi bo‘yicha arizangiz ko‘rib chiqildi.
                          </p>
                          <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #b91c1c; font-weight: 700; margin-bottom: 6px;">Administrator izohi</div>
                            <div style="font-size: 14px; color: #7f1d1d; line-height: 1.55;">${safeReason}</div>
                          </div>
                          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.55;">
                            Ma’lumotlarni to‘ldirib, Hamkorlar paneli orqali qayta ariza yuborishingiz mumkin.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background: #f8fafc; padding: 14px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Sihhat.uz</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>`;

    if (this.config.NODE_ENV !== 'production') {
      this.sentPartnerEmails.push({
        id: params.id,
        to: params.email,
        kind: 'rejected',
        subject,
        text,
        username: params.username,
        sanatoriumName: params.sanatoriumName,
      });
    }

    try {
      await this.deliverEmail({
        id: `partner-rejected-${params.id}`,
        to: params.email,
        subject,
        text,
        html,
        devPayload: {
          email: params.email,
          kind: 'rejected',
          applicantName: params.applicantName,
          username: params.username,
          sanatoriumName: params.sanatoriumName,
          reason: params.reason,
        },
        failOnError: false,
        errorMessage: 'Hamkor arizasi rad etilganligi haqidagi emailni yuborishda xatolik',
      });
      return 'SENT';
    } catch {
      return 'FAILED';
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async deliverEmail(params: {
    id: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    devPayload: Record<string, unknown>;
    failOnError: boolean;
    errorMessage: string;
  }) {
    if (!this.transporter || this.config.NODE_ENV !== 'production') {
      const folder = resolve('../../.local/dev-email');
      try {
        await mkdir(folder, { recursive: true });
        await writeFile(resolve(folder, `${params.id}.json`), JSON.stringify(params.devPayload), { mode: 0o600 });
      } catch (_) {
        // Dev folder creation might fail silently if path not accessible
      }
    }

    if (this.config.RESEND_API_KEY) {
      try {
        const fromAddress = (this.config.SMTP_FROM && this.config.SMTP_FROM.includes('@') && !this.config.SMTP_FROM.includes('@gmail.com'))
          ? this.config.SMTP_FROM
          : 'Sihhat uz <noreply@sihhat.uz>';
        let response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(6000),
          headers: {
            Authorization: `Bearer ${this.config.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [params.to],
            subject: params.subject,
            text: params.text,
            html: params.html,
          }),
        });
        if (!response.ok && fromAddress !== 'Sihhat uz <onboarding@resend.dev>') {
          response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            signal: AbortSignal.timeout(6000),
            headers: {
              Authorization: `Bearer ${this.config.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Sihhat uz <onboarding@resend.dev>',
              to: [params.to],
              subject: params.subject,
              text: params.text,
              html: params.html,
            }),
          });
        }
        if (!response.ok) {
          const detail = await response.text();
          console.error('[EmailService] Resend HTTP error:', response.status, detail);
          throw new Error(`Resend API: ${response.status} ${detail}`);
        }
        return;
      } catch (err: any) {
        console.error('[EmailService] Resend error:', err?.message || err);
        if (params.failOnError && !this.transporter && this.config.NODE_ENV === 'production' && !this.config.DEMO_OTP_ENABLED) {
          fail('EMAIL_SEND_FAILED', params.errorMessage, 500);
        }
      }
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.config.SMTP_FROM || 'Sihhat uz <no-reply@sihhat.uz>',
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html,
        });
      } catch (err: any) {
        console.error('[EmailService] SMTP error:', err?.message || err);
        if (params.failOnError && this.config.NODE_ENV === 'production' && !this.config.DEMO_OTP_ENABLED) {
          fail('EMAIL_SEND_FAILED', params.errorMessage, 500);
        }
      }
    }
  }
}
