import { z } from 'zod';
import type { Config } from '../common/config';

const tokenResponse = z.object({ data: z.object({ token: z.string().min(10) }) });
const sendResponse = z.object({ id: z.string().min(1), status: z.literal('waiting') });
const base = 'https://notify.eskiz.uz';

export class EskizClient {
  private token: string | null;
  private expiresAt: number;
  private authenticating?: Promise<string>;
  constructor(private readonly config: Config, private readonly fetcher: typeof fetch = fetch) {
    this.token = config.ESKIZ_TOKEN || null;
    this.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  }
  private async login() {
    const form = new FormData();
    form.set('email', this.config.ESKIZ_EMAIL); form.set('password', this.config.ESKIZ_PASSWORD);
    const refreshing = !(this.config.ESKIZ_EMAIL && this.config.ESKIZ_PASSWORD) && Boolean(this.token);
    const response = await this.fetcher(`${base}/api/auth/${refreshing ? 'refresh' : 'login'}`, {
      method: refreshing ? 'PATCH' : 'POST', ...(refreshing ? { headers: { Authorization: `Bearer ${this.token}` } } : { body: form }),
      signal: AbortSignal.timeout(8000), redirect: 'error',
    });
    if (!response.ok) throw new Error('ESKIZ_AUTH_UNAVAILABLE');
    this.token = tokenResponse.parse(await response.json()).data.token;
    this.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    return this.token;
  }
  private async authenticated() {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    this.authenticating ??= this.login().finally(() => { this.authenticating = undefined; });
    return this.authenticating;
  }
  async send(id: string, phone: string, code: string, expiresAt: Date) {
    if (!/^\+?998\d{9}$/.test(phone) || !/^\d{6}$/.test(code) || expiresAt.getTime() <= Date.now()) throw new Error('ESKIZ_INVALID_OTP');
    const send = async (token: string) => {
      const form = new FormData();
      form.set('mobile_phone', phone.replace(/^\+/, ''));
      form.set('message', this.config.ESKIZ_OTP_TEMPLATE.replaceAll('{code}', code));
      form.set('from', this.config.ESKIZ_SENDER);
      return this.fetcher(`${base}/api/message/sms/send`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': id }, body: form, signal: AbortSignal.timeout(8000), redirect: 'error' });
    };
    let response = await send(await this.authenticated());
    // Retry only an explicit authentication rejection; never replay a timeout
    // or ambiguous provider failure, since Eskiz does not promise deduplication.
    if (response.status === 401 && this.config.ESKIZ_EMAIL && this.config.ESKIZ_PASSWORD) {
      this.expiresAt = 0;
      response = await send(await this.authenticated());
    }
    if (!response.ok) throw new Error('ESKIZ_SMS_REJECTED');
    return sendResponse.parse(await response.json());
  }
}
