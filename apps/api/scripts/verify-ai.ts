import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { AiService } from '../src/ai/ai.service';
import type { Actor } from '../src/auth/permissions';
import { selectWithProvider } from '../src/ai/provider';
import { CatalogService } from '../src/catalog/catalog.service';

async function main() {
  const { app, config } = await createApp({ quiet: true, swagger: false });
  try {
    const url = new URL(config.DATABASE_URL);
    if (config.NODE_ENV === 'production' || url.hostname !== '127.0.0.1' || url.pathname !== '/sihhat') throw new Error('Local verification only');
    const db = app.get(Db);
    const user = await db.user.findFirst({ where: { kind: 'CUSTOMER' }, select: { id: true } });
    if (!user) throw new Error('Local customer required');
    const actor: Actor = { id: user.id, kind: 'CUSTOMER', name: 'Local verification', sessionId: 'local-verification', mustChangePassword: false, memberships: [] };
    if (process.argv.includes('--diagnose')) {
      const list = await app.get(CatalogService).list({ limit: 10 });
      try {
        const result = await selectWithProvider(config, 'Bron narxi qanday hisoblanadi?', list.data, async (url, init) => {
          const response = await fetch(url, init);
          const raw = await response.clone().json() as any;
          console.log(JSON.stringify({ http_status: response.status, error_status: raw?.error?.status ?? null, error_message: typeof raw?.error?.message === 'string' ? raw.error.message.replaceAll(config.GEMINI_API_KEY, '[private]').replace(/AQ\.[\w-]+|AIza[\w-]+/g, '[private]').slice(0, 500) : null, finish_reason: raw?.candidates?.[0]?.finishReason ?? null }));
          return response;
        });
        console.log(JSON.stringify({ structured_output: true, cards: result.selection.ordered_ids.length, faq: result.selection.faq_ids }));
      } catch { process.exitCode = 1; }
      return;
    }
    const result = await app.get(AiService).message(actor, { message: 'Toshkent viloyatida dam olish uchun sanatoriya tavsiya qiling. Bron narxi qanday hisoblanadi?', share_with_provider: true });
    console.log(JSON.stringify({ provider_status: result.provider_status, fallback: result.fallback, provider_message_shared: result.provider_message_shared, catalog_cards: result.cards.length, faq_count: result.faq.length, financial_actions: result.can_execute_financial_actions }));
    if (result.fallback) process.exitCode = 1;
  } finally { await app.close(); }
}
void main().catch(() => { console.error('AI connection verification failed; no secrets or customer data logged.'); process.exitCode = 1; });
