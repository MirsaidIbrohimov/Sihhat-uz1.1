import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { CONFIG, type Config } from './config';
import { json, fail } from './errors';
import { createHash } from 'node:crypto';

export type Tx = Prisma.TransactionClient;
export function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const bodyHash = (body: unknown) => hash(JSON.stringify(canonical(json(body))));
export const lock = async (tx: Tx, key: string) => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`; };

@Injectable()
export class Db extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(CONFIG) config: Config) { super({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL, max: 25, options:'-c timezone=UTC' }) }); }
  async onModuleDestroy() { await this.$disconnect(); }
  async atomic<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.$transaction(fn, { maxWait: 15000, timeout: 20000 }); }
      catch (error: any) {
        const retry = error.code === 'P2034' || ['40001', '40P01'].includes(error.meta?.code);
        if (!retry || attempt >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
      }
    }
  }
  async idempotent<T>(userId: string, action: string, key: string | undefined, body: unknown, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!key || !/^[\w:.-]{8,128}$/.test(key)) fail('IDEMPOTENCY_KEY_REQUIRED', '8–128 belgili Idempotency-Key kerak', 422);
    return this.atomic(async tx => {
      await lock(tx, `idem:${userId}:${action}:${key}`);
      const saved = await tx.idempotencyRecord.findUnique({ where: { userId_action_key: { userId, action, key } } });
      const digest = bodyHash(body);
      if (saved) {
        if (saved.bodyHash !== digest) fail('IDEMPOTENCY_CONFLICT', 'Bu kalit boshqa so‘rov uchun ishlatilgan');
        return saved.result as T;
      }
      const result = await fn(tx);
      await tx.idempotencyRecord.create({ data: { userId, action, key, bodyHash: digest, result: json(result) } });
      return result;
    });
  }
}

export async function audit(tx: Tx, actorId: string | null, action: string, entityId: string, sanatoriumId?: string, before?: unknown, after?: unknown) {
  await tx.auditLog.create({ data: { actorId, action, entityId, sanatoriumId, ...(before !== undefined ? { before: json(before) } : {}), ...(after !== undefined ? { after: json(after) } : {}) } });
}
export async function emit(tx: Tx, topic: string, payload: unknown) { return tx.outboxEvent.create({ data: { topic, payload: json(payload) } }); }
