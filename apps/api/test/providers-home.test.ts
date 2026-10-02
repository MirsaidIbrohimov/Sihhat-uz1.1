import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setup, Client } from './helpers';
import { customer, sanatorium } from './fixtures';
import { loadConfig } from '../src/common/config';
import { EskizClient } from '../src/auth/eskiz';
import { Sms } from '../src/auth/sms';
import { selectWithProvider } from '../src/ai/provider';
import { AiService } from '../src/ai/ai.service';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => { ctx = await setup(); });
after(async () => { await ctx?.app.close(); });

test('home: public feed shows published articles and eligible catalog; publication is versioned and admin-only', async () => {
  const s = await sanatorium(ctx.admin);
  const reader = new Client(ctx.base);
  const user = await customer(ctx.base, ctx.auth);
  const input = { title: 'Sanatoriya tanlash haqida', summary: 'Safarni rejalashtirish uchun amaliy ma’lumotlar.', body: 'Sanatoriya xizmatlari va kelish shartlarini safardan oldin tekshiring.', kind: 'NEWS', status: 'DRAFT' };
  assert.equal((await user.call('/superadmin/articles', 'POST', input)).status, 403);
  const created = await ctx.admin.call('/superadmin/articles', 'POST', input);
  assert.equal(created.status, 201);
  assert.equal((await reader.call(`/catalog/news/${created.body.id}`)).status, 404);
  const emptyNews = await reader.call('/catalog/home');
  assert.equal(emptyNews.body.news.length, 0);
  assert.ok(emptyNews.body.featured.some((r: any) => r.id === s.id));
  assert.deepEqual(emptyNews.body.regions, ['Toshkent']);
  const published = await ctx.admin.call(`/superadmin/articles/${created.body.id}`, 'PATCH', { ...input, status: 'PUBLISHED', version: 1 });
  assert.equal(published.status, 200);
  const publicNews = (await reader.call('/catalog/home')).body.news;
  assert.equal(publicNews.length, 1); assert.equal(publicNews[0].createdBy, undefined);
  assert.equal((await reader.call(`/catalog/news/${created.body.id}`)).status, 200);
  assert.equal((await ctx.admin.call(`/superadmin/articles/${created.body.id}`, 'PATCH', { ...input, status: 'ARCHIVED', version: 1 })).body.code, 'VERSION_CONFLICT');
  assert.equal((await ctx.admin.call(`/superadmin/articles/${created.body.id}`, 'PATCH', { ...input, status: 'ARCHIVED', version: 2 })).status, 200);
  assert.equal((await reader.call(`/catalog/news/${created.body.id}`)).status, 404);
  const current = (await ctx.admin.call(`/partner/sanatoriums/${s.id}`)).body;
  assert.equal((await ctx.admin.call(`/superadmin/sanatoriums/${s.id}/pause`, 'POST', { version: current.version, reason: 'Bosh sahifa filtrini tekshirish' })).status, 201);
  assert.ok(!(await reader.call('/catalog/home')).body.featured.some((r: any) => r.id === s.id));
});

test('Gemini: key stays in header; personal numbers and emails are redacted; only structured selection is accepted', async () => {
  const config = { ...loadConfig(), AI_ADAPTER: 'gemini', GEMINI_API_KEY: 'fake-provider-key' } as const;
  const fetcher: typeof fetch = async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-/);
    assert.equal(new URL(String(url)).search, '');
    assert.equal((init!.headers as any)['x-goog-api-key'], 'fake-provider-key');
    assert.equal(init!.redirect, 'error');
    const sent = JSON.parse(init!.body as string);
    assert.equal(sent.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.ok(!JSON.stringify(sent).includes('fake-provider-key'));
    assert.ok(!JSON.stringify(sent).includes('+998901234567'));
    assert.ok(!JSON.stringify(sent).includes('private@example.com'));
    assert.ok(!JSON.stringify(sent).includes('privateBank'));
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ordered_ids: ['public-id'], faq_ids: ['price'] }) }] } }], usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 25 } });
  };
  const result = await selectWithProvider(config, 'Narxni tushuntiring, +998901234567 private@example.com', [{ id: 'public-id', name: 'Sanatoriya', region: 'Toshkent', amenities: ['Wi-Fi'], services: ['Yashash'], privateBank: 'privateBank' }], fetcher);
  assert.equal(result.inputTokens, 150); assert.deepEqual(result.selection.faq_ids, ['price']);
  await assert.rejects(() => selectWithProvider(config, 'Savol', [], async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"ordered_ids":[],"price":1}' }] } }] })));
});

test('AI: consent, medical boundary, daily cap and invalid catalog responses fall back without executing actions', async (t) => {
  const user = await customer(ctx.base, ctx.auth);
  const s = await sanatorium(ctx.admin);
  const service = ctx.app.get(AiService);
  const saved = { ...service.config };
  Object.assign(service.config, { AI_ADAPTER: 'gemini', GEMINI_API_KEY: 'fake-provider-key', AI_DAILY_REQUEST_LIMIT: 2 });
  const originalFetch = globalThis.fetch;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: any, init: any) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return originalFetch(url, init);
    calls++;
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ordered_ids: [calls === 1 ? s.id : randomUUID()], faq_ids: ['price'] }) }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });
  });
  try {
    const consent = (await user.call('/ai/messages', 'POST', { message: 'Narxlar' })).body;
    assert.equal(calls, 0); assert.equal(consent.provider_message_shared, false); assert.equal(consent.fallback, true);
    await user.call('/ai/messages', 'POST', { message: 'Kasallik uchun dori tavsiya qil', share_with_provider: true }); assert.equal(calls, 0);
    const good = (await user.call('/ai/messages', 'POST', { message: 'Narxlar', share_with_provider: true })).body;
    assert.equal(good.fallback, false); assert.equal(good.provider_message_shared, true); assert.equal(good.cards[0].id, s.id); assert.equal(good.cards[0].price, null);
    const invalid = (await user.call('/ai/messages', 'POST', { message: 'Variantlar', share_with_provider: true })).body;
    assert.equal(invalid.fallback, true); assert.ok(invalid.cards.every((r: any) => r.id !== undefined && r.price === null));
    const capped = (await user.call('/ai/messages', 'POST', { message: 'Variantlar', share_with_provider: true })).body;
    assert.equal(calls, 2); assert.equal(capped.provider_status, 'daily_limit'); assert.equal(capped.provider_message_shared, false);
    assert.equal(capped.can_execute_financial_actions, false);
    const usage = await ctx.db.aiUsage.findMany(); assert.equal(usage.length, 2);
    assert.ok(!JSON.stringify(usage).includes('fake-provider-key')); assert.ok(!JSON.stringify(usage).includes('Variantlar'));
  } finally { Object.assign(service.config, saved); }
});

test('Eskiz: concurrent OTPs share one login; payload uses country code and approved configurable template', async () => {
  const config = { ...loadConfig(), ESKIZ_TOKEN: '', ESKIZ_EMAIL: 'fake@example.com', ESKIZ_PASSWORD: 'fake-pass', ESKIZ_OTP_TEMPLATE: 'Sihhat kod: {code}' };
  let logins = 0, sends = 0;
  const client = new EskizClient(config, async (url, init) => {
    assert.equal(init!.redirect, 'error');
    if (String(url).endsWith('/auth/login')) { logins++; assert.equal((init!.body as FormData).get('password'), 'fake-pass'); return Response.json({ data: { token: 'fake-sms-token' } }); }
    sends++;
    assert.equal((init!.headers as any).Authorization, 'Bearer fake-sms-token');
    assert.equal((init!.body as FormData).get('mobile_phone'), '998901234567');
    assert.equal((init!.body as FormData).get('message'), 'Sihhat kod: 123456');
    assert.equal((init!.body as FormData).get('from'), '4546');
    return Response.json({ id: randomUUID(), status: 'waiting' });
  });
  await Promise.all([client.send('one', '+998901234567', '123456', new Date(Date.now() + 60000)), client.send('two', '+998901234567', '123456', new Date(Date.now() + 60000))]);
  assert.equal(logins, 1); assert.equal(sends, 2);
});

test('Eskiz: retries an explicit 401 once, rejects 200 error payloads and does not replay ambiguous failures', async () => {
  const config = { ...loadConfig(), ESKIZ_TOKEN: 'fake-old-token', ESKIZ_EMAIL: 'fake@example.com', ESKIZ_PASSWORD: 'fake-pass' };
  let sends = 0;
  const client = new EskizClient(config, async (url) => {
    if (String(url).endsWith('/auth/login')) return Response.json({ data: { token: 'fake-new-token' } });
    sends++;
    return sends === 1 ? new Response('', { status: 401 }) : Response.json({ id: 'accepted', status: 'waiting' });
  });
  await client.send('one', '+998901234567', '123456', new Date(Date.now() + 60000)); assert.equal(sends, 2);
  let failures = 0;
  const failed = new EskizClient(config, async () => { failures++; throw new Error('timeout'); });
  await assert.rejects(() => failed.send('one', '+998901234567', '123456', new Date(Date.now() + 60000))); assert.equal(failures, 1);
  const rejected = new EskizClient(config, async () => Response.json({ status: 'error', message: 'Rejected' }));
  await assert.rejects(() => rejected.send('one', '+998901234567', '123456', new Date(Date.now() + 60000)));
});

test('Eskiz: real OTP is blocked until account and template are approved', async () => {
  const config = { ...loadConfig(), SMS_ADAPTER: 'eskiz' as const, ESKIZ_EMAIL: 'fake@example.com', ESKIZ_PASSWORD: 'fake-pass', ESKIZ_OTP_APPROVED: false };
  const sms = new Sms(config);
  await assert.rejects(() => sms.send('one', '+998901234567', '123456', new Date(Date.now() + 60000)), (error: any) => error.code === 'SMS_NOT_READY' && error.getStatus() === 503);
  assert.equal(sms.sent.size, 0);
});
