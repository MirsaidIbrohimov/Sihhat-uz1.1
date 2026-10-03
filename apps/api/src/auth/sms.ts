import { Inject, Injectable, Optional } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CONFIG, type Config } from '../common/config';
import { fail } from '../common/errors';
import { EskizClient } from './eskiz';
import { Db, emit } from '../common/db';

@Injectable()
export class Sms {
  readonly sent = new Map<string, string>();
  private readonly eskiz: EskizClient;
  constructor(@Inject(CONFIG) private readonly config: Config, @Optional() @Inject(Db) private readonly db?: Db) { this.eskiz = new EskizClient(config); }
  async send(id: string, phone: string, code: string, expiresAt: Date) {
    if (this.config.SMS_ADAPTER === 'local') {
      if (this.config.NODE_ENV === 'production') fail('SMS_UNAVAILABLE', 'SMS xizmati sozlanmagan', 503);
      this.sent.set(id, code);
      if (this.config.NODE_ENV !== 'test') {
        const folder = resolve('../../.local/dev-sms');
        await mkdir(folder, { recursive: true });
        await writeFile(resolve(folder, `${id}.json`), JSON.stringify({ phone, code, expiresAt }), { mode: 0o600 });
      }
      return;
    }
    if (this.config.SMS_ADAPTER === 'eskiz' && !this.config.ESKIZ_OTP_APPROVED) {
      fail('SMS_NOT_READY', 'Kirish SMS xizmati hali faollashtirilmagan. Eskiz hisobi va kirish kodi shabloni tasdiqlanishi kerak.', 503);
    }
    try {
      if (this.config.SMS_ADAPTER === 'eskiz') {
        await this.eskiz.send(id, phone, code, expiresAt);
        return;
      }
      const response = await fetch(this.config.SMS_HTTP_URL, {
        method: 'POST', signal: AbortSignal.timeout(8000), redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.SMS_HTTP_TOKEN}`, 'Idempotency-Key': id },
        body: JSON.stringify({ phone, message: `Sihhat uz kirish kodi: ${code}. Kodni hech kimga bermang.`, request_id: id }),
      });
      if (!response.ok) throw new Error('SMS rejected');
    } catch {
      try { if(this.db)await this.db.atomic(async tx => { const admins=await tx.user.findMany({where:{kind:'SUPERADMIN',status:'ACTIVE'},select:{id:true}});await emit(tx,'provider.sms.failed',{recipient_ids:admins.map(a=>a.id)}); }); } catch { /* The original provider error remains authoritative. */ }
      fail('SMS_UNAVAILABLE', 'SMS yuborilmadi. Keyinroq qayta urinib ko‘ring', 503);
    }
  }
}
