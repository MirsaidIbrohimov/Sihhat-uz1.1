import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, Client } from './helpers';
import { hash } from '../src/common/db';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  const saved = process.env.TRUST_PROXY;
  process.env.TRUST_PROXY = 'private';
  try { ctx = await setup(); }
  finally {
    if (saved === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = saved;
  }
});
after(async () => { await ctx?.app.close(); });

test('deployment: OTP limits use distinct client IPs through private proxies and ignore a forged earlier hop', async () => {
  const client = new Client(ctx.base);
  const first = await client.call('/auth/customer/otp/request', 'POST', { phone: '+998951231231' }, { 'X-Forwarded-For': '203.0.113.9, 198.51.100.10' });
  const second = await client.call('/auth/customer/otp/request', 'POST', { phone: '+998951231232' }, { 'X-Forwarded-For': '198.51.100.11' });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.equal((await ctx.db.rateLimit.findUniqueOrThrow({ where: { id: hash('otp-ip:198.51.100.10') } })).count, 1);
  assert.equal((await ctx.db.rateLimit.findUniqueOrThrow({ where: { id: hash('otp-ip:198.51.100.11') } })).count, 1);
  assert.equal(await ctx.db.rateLimit.findUnique({ where: { id: hash('otp-ip:203.0.113.9') } }), null);
  const trusted = ctx.app.getHttpAdapter().getInstance().get('trust proxy fn');
  assert.equal(trusted('198.51.100.10', 0), false);
  assert.equal(trusted('fd12:3456::1', 0), true);
});
