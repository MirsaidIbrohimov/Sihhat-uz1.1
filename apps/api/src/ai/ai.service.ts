import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CONFIG, type Config } from '../common/config';
import { Db } from '../common/db';
import { parse } from '../common/errors';
import { Actor } from '../auth/permissions';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { guidance } from '../catalog/guidance';
import { PricingService, quoteInput, availableRooms } from '../pricing/pricing.service';
import { selectWithProvider } from './provider';
import { greetingReply, planConversation, salutation, thanksReply } from './conversation';

export const aiInput = z.object({ message: z.string().trim().min(1).max(1000), history: z.array(z.object({ role: z.enum(['user', 'assistant']), message: z.string().trim().min(1).max(1000) }).strict()).max(12).default([]), region: z.string().max(80).optional(), quote: quoteInput.optional(), share_with_provider: z.boolean().default(false) }).strict();

function conversationReply(message: string) {
  return { message, cards: [], faq: [], fallback: false, provider_status: 'conversation', provider_message_shared: false, actions: ['search'], can_execute_financial_actions: false };
}

@Injectable()
export class AiService {
  constructor(@Inject(CONFIG) readonly config: Config, @Inject(Db) readonly db: Db, @Inject(AuthService) readonly auth: AuthService, @Inject(CatalogService) readonly catalog: CatalogService, @Inject(PricingService) readonly pricing: PricingService) {}
  async message(actor: Actor, body: unknown) {
    const i = parse(aiInput, body);
    await this.auth.limit(`ai:${actor.id}`, 30, 3600);
    const hello = greetingReply(i.message), thanks = thanksReply(i.message), welcome = salutation(i.message);
    if (!i.quote && hello && !i.history.length) return conversationReply(`${hello} Sizga mos sanatoriya topishga yordam beraman. Qaysi hududga bormoqchisiz?`);
    if (!i.quote && thanks) return conversationReply(thanks);
    const list = await this.catalog.list({ limit: 100, ...(i.region ? { region: i.region } : {}) });
    const conversation = planConversation(i.message, i.history, list.data, i.region);
    const medical = conversation.medical;
    if (!i.quote && conversation.question) {
      const prefix = welcome ? `${welcome} ` : '';
      const notice = medical ? 'Tibbiy moslikni sanatoriya mutaxassisi bilan aniqlang. ' : '';
      return conversationReply(`${prefix}${notice}${conversation.question}`);
    }
    if (!i.quote && hello) return conversationReply(`${hello} Sanatoriya tanlashda yana qanday yordam kerak?`);
    const card = (s: any) => ({ id: s.id, name: s.name, region: s.region, amenities: s.amenities, price: null, price_status: 'Sana, xona va mehmonlar sonini tanlang' });
    const terms = conversation.searchMessage.toLocaleLowerCase().split(/\s+/).filter(t => t.length > 2);
    const ranked = [...conversation.candidates].sort((a: any, b: any) => {
      const score = (s: any) => terms.filter(t => `${s.name} ${s.region} ${(s.amenities ?? []).join(' ')} ${(s.services ?? []).join(' ')}`.toLocaleLowerCase().includes(t)).length;
      return score(b) - score(a);
    });
    let cards: any[] = ranked.slice(0, 3).map(card);
    let faq = guidance.filter(f => f.keywords.test(i.message)).slice(0, 2);
    let fallback = true, shared = false;
    let providerStatus = this.config.AI_ADAPTER === 'catalog' ? 'catalog' : i.share_with_provider ? 'unavailable' : 'consent_required';
    if (medical) providerStatus = 'medical_guidance';
    if (!medical && i.share_with_provider && this.config.AI_ADAPTER !== 'catalog') {
      try {
        await this.auth.limit(`ai-provider:${this.config.AI_ADAPTER}`, this.config.AI_DAILY_REQUEST_LIMIT, 86400);
        shared = true;
        const result = await selectWithProvider(this.config, conversation.searchMessage, ranked.slice(0, 20));
        const ids = [...new Set(result.selection.ordered_ids)];
        if (ids.some(id => !ranked.slice(0, 20).some((s: any) => s.id === id))) throw new Error('AI_UNKNOWN_CATALOG_ID');
        cards = ids.map(id => card(list.data.find((s: any) => s.id === id)));
        faq = [...new Set(result.selection.faq_ids)].map(id => guidance.find(f => f.id === id)!);
        fallback = false; providerStatus = 'connected';
        await this.db.aiUsage.create({ data: { userId: actor.id, provider: this.config.AI_ADAPTER, model: this.config.AI_ADAPTER === 'gemini' ? this.config.GEMINI_MODEL : 'http', outcome: 'SUCCESS', inputTokens: result.inputTokens, outputTokens: result.outputTokens } });
      } catch (e: any) {
        fallback = true;
        providerStatus = e?.code === 'RATE_LIMITED' ? 'daily_limit' : 'unavailable';
        if (shared) await this.db.aiUsage.create({ data: { userId: actor.id, provider: this.config.AI_ADAPTER, model: this.config.AI_ADAPTER === 'gemini' ? this.config.GEMINI_MODEL : 'http', outcome: 'FALLBACK' } });
      }
    }
    if (i.quote) {
      try {
        await this.catalog.get(i.quote.sanatorium_id);
        const calculated = await this.db.$transaction(async tx => {
          const value = await this.pricing.calculate(tx, i.quote!);
          const demand = new Map<string, number>();
          for (const item of i.quote!.items) demand.set(item.room_type_id, (demand.get(item.room_type_id) ?? 0) + 1);
          for (const [type, n] of demand) if ((await availableRooms(tx, i.quote!.sanatorium_id, type, new Date(i.quote!.check_in), new Date(i.quote!.check_out))).length < n) throw new Error('Unavailable');
          return value;
        });
        const detail = await this.catalog.get(i.quote.sanatorium_id);
        cards = [{ id: detail.id, name: detail.name, region: detail.region, price: calculated.total_amount, currency: 'UZS', minor_unit: 'tiyin', price_status: 'Joriy hisob; bron vaqtida yana tekshiriladi' }];
      } catch {
        cards = cards.map(c => ({ ...c, price: null, price_status: 'Tanlangan davr uchun tasdiqlangan hisob mavjud emas' }));
      }
    }
    const intro = medical ? 'Tibbiy moslik va davolanishni sanatoriya mutaxassisi bilan aniqlang.' : cards.length ? 'Katalogdagi tasdiqlangan variantlar. Yakuniy narx va bo‘sh joy bron hisobida tekshiriladi.' : 'Bu so‘rov uchun tasdiqlangan variant topilmadi.';
    return { message: [welcome ? `${welcome} ${intro}` : intro, ...faq.map(f => f.text)].join('\n\n'), cards, faq: faq.map(({ keywords, ...f }) => f), fallback, provider_status: providerStatus, provider_message_shared: shared, actions: ['open_sanatorium', 'search'], can_execute_financial_actions: false };
  }
}
