import { Inject, Injectable } from '@nestjs/common';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { CONFIG, type Config } from '../common/config';
import { Db, emit, lock } from '../common/db';
import { encrypt, decrypt } from '../common/crypto';
import { AppError, fail, parse, uuid } from '../common/errors';
import { scope } from '../auth/permissions';
import { EngagementService } from '../engagement/engagement.service';
import { BookingService } from '../bookings/booking.service';
import { TelegramClient, TelegramError, type Button } from './client';
import { TelegramLinkService } from './link.service';
import { TelegramViews, type BotContext, type BotPage } from './views';
import { updateInput, callback as b, navigation, localDate, localHour, plusDays, moneyText, statusText, type TelegramUpdate } from './types';

const buttons: Record<string, string> = {
  '📅 Bugun': 'today', '📖 Bronlar': 'bookings:all:0', '🔎 Bron qidirish': 'search', '🛏 Bo‘sh xonalar': 'rooms:1',
  '📊 Hisobot': 'report:month', '✅ Vazifalar': 'tasks:0', '💳 Moliya': 'finance', '💬 Aloqa': 'communication',
  '👥 Boshqaruv': 'management', '⚙️ Sozlamalar': 'settings', '🏥 Sanatoriya': 'tenants:0', '🖥 Sayt': 'site:dashboard',
  '❓ Yordam': 'help', '🏠 Bosh menyu': 'menu', '⬅️ Orqaga': 'menu', '🔗 Hisobni ulash': 'linkhelp',
};
const commands: Record<string, string> = { start: 'menu', menu: 'menu', help: 'help', bugun: 'today', bronlar: 'bookings:all:0', hisobot: 'report:month', vazifalar: 'tasks:0', sozlamalar: 'settings', cancel: 'menu' };
const boolSettings = ['notificationsEnabled', 'notifyBookings', 'notifyPayments', 'notifyTasks', 'notifySupport', 'notifyBilling', 'dailyDigest', 'quietHours'] as const;
const numeric = (value: string | undefined, max = 10000) => {
  if (!value || !/^\d{1,5}$/.test(value) || Number(value) > max) fail('BUTTON_INVALID', 'Tugma eskirgan. Bosh menyudan qayta oching.', 422);
  return Number(value);
};

@Injectable()
export class TelegramService {
  constructor(@Inject(Db) readonly db: Db, @Inject(CONFIG) readonly config: Config,
    @Inject(TelegramClient) readonly client: TelegramClient, @Inject(TelegramLinkService) readonly links: TelegramLinkService,
    @Inject(TelegramViews) readonly views: TelegramViews, @Inject(EngagementService) readonly engagement: EngagementService,
    @Inject(BookingService) readonly bookings: BookingService) {}
  async identity() {
    const info = await this.client.call<{ id: number; username: string; is_bot: boolean }>('getMe');
    if (!info.is_bot || String(info.id) !== this.client.botId && this.config.NODE_ENV !== 'test') throw new TelegramError(401);
    await this.db.telegramBotState.upsert({ where: { botId: this.client.botId }, create: { botId: this.client.botId, username: info.username }, update: { username: info.username } });
    return { id: info.id, username: info.username };
  }
  async configure() {
    const info = await this.identity();
    const list = [
      ['start', 'Botni ochish'], ['menu', 'Bosh menyu'], ['bugun', 'Bugungi kelish va ketish'], ['bronlar', 'Bronlar ro‘yxati'],
      ['hisobot', 'Hisobot'], ['vazifalar', 'Vazifalar'], ['sozlamalar', 'Bildirishnoma sozlamalari'], ['cancel', 'Orqaga qaytish'], ['help', 'Yordam'],
    ].map(([command, description]) => ({ command, description }));
    await this.client.call('setMyCommands', { commands: list });
    await this.client.call('setMyDescription', { description: 'Sihhat uz admin, direktor va resepsion yordamchisi. Bronlar, kunlik hisobotlar, vazifalar va muhim bildirishnomalar. Hisobni Sihhat uz saytida Telegram bot bo‘limidan ulang.' });
    await this.client.call('setMyShortDescription', { short_description: 'Sihhat uz · sanatoriya xodimlari yordamchisi' });
    await this.client.call('setChatMenuButton', { menu_button: { type: 'commands' } });
    return info;
  }
  async enqueue(raw: unknown, advanceOffset = false) {
    const raws = Array.isArray(raw) ? raw : [raw];
    const parsed = raws.map(value => parse(updateInput, value));
    await this.db.atomic(async tx => {
      for (const update of parsed) {
        const chat = update.message?.chat || update.callback_query?.message?.chat;
        const id = `${this.client.botId}:${update.update_id}`;
        await tx.telegramInbound.upsert({ where: { id }, create: { id, botId: this.client.botId, updateId: BigInt(update.update_id), chatId: chat ? String(chat.id) : null, encryptedPayload: encrypt(JSON.stringify(update), this.config.MFA_ENCRYPTION_KEY) }, update: {} });
      }
      const highest = parsed.length ? BigInt(Math.max(...parsed.map(u => u.update_id)) + 1) : 0n;
      await tx.telegramBotState.upsert({ where: { botId: this.client.botId }, create: { botId: this.client.botId, offset: advanceOffset ? highest : 0n, lastPollAt: new Date() }, update: { lastPollAt: new Date() } });
      if (advanceOffset) await tx.telegramBotState.updateMany({ where: { botId: this.client.botId, offset: { lt: highest } }, data: { offset: highest } });
    });
    return { success: true };
  }
  async webhook(secret: string | undefined, body: unknown) {
    const expected = Buffer.from(this.config.TELEGRAM_WEBHOOK_SECRET), received = Buffer.from(secret || '');
    if (this.config.TELEGRAM_MODE !== 'webhook' || expected.length < 32 || received.length !== expected.length || !timingSafeEqual(expected, received)) fail('TELEGRAM_WEBHOOK_DENIED', 'Webhook ruxsati yo‘q.', 401);
    return this.enqueue(body);
  }
  async runPending(limit = 20) {
    let processed = 0;
    for (let n = 0; n < limit; n++) {
      const record = await this.db.atomic(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT t.id FROM "TelegramInbound" t WHERE t."botId"=${this.client.botId}
          AND t.status IN ('PENDING','PROCESSING') AND t."availableAt"<=now() AND (t."leaseUntil" IS NULL OR t."leaseUntil"<=now())
          AND NOT EXISTS (SELECT 1 FROM "TelegramInbound" p WHERE p."botId"=t."botId" AND p."chatId"=t."chatId" AND p."updateId"<t."updateId" AND p.status IN ('PENDING','PROCESSING'))
          ORDER BY t."updateId" FOR UPDATE OF t SKIP LOCKED LIMIT 1`;
        if (!rows.length) return null;
        return tx.telegramInbound.update({ where: { id: rows[0].id }, data: { status: 'PROCESSING', leaseUntil: new Date(Date.now() + 120000), attempts: { increment: 1 } } });
      });
      if (!record) break;
      try {
        const update = parse(updateInput, JSON.parse(decrypt(record.encryptedPayload, this.config.MFA_ENCRYPTION_KEY)));
        await this.handle(update);
        await this.db.telegramInbound.update({ where: { id: record.id }, data: { status: 'COMPLETED', encryptedPayload: '', leaseUntil: null, lastError: null } });
        processed++;
      } catch (error) {
        const permanent = error instanceof TelegramError && [400, 403].includes(error.status);
        const delay = Math.max(error instanceof TelegramError ? error.retryAfter : 0, Math.min(900, 2 ** record.attempts));
        await this.db.telegramInbound.update({ where: { id: record.id }, data: { status: permanent || record.attempts >= 10 ? 'FAILED' : 'PENDING', leaseUntil: null, availableAt: new Date(Date.now() + delay * 1000), lastError: 'UPDATE_FAILED', ...(permanent ? { encryptedPayload: '' } : {}) } });
      }
    }
    return processed;
  }
  async context(telegramUserId: string, chatId: string): Promise<BotContext | null> {
    let account = await this.db.telegramAccount.findUnique({ where: { telegramUserId } });
    if (!account || account.chatId !== chatId) return null;
    const actor = await this.links.actor(account.userId);
    const active = actor.memberships.filter(m => m.status === 'ACTIVE');
    if (actor.kind !== 'SUPERADMIN' && !active.some(m => m.sanatoriumId === account!.sanatoriumId)) account = await this.db.telegramAccount.update({ where: { id: account.id }, data: { sanatoriumId: active.length === 1 ? active[0].sanatoriumId : null, state: {}, stateUpdatedAt: new Date() } });
    return { account, actor };
  }
  state(ctx: BotContext) {
    return ctx.account.stateUpdatedAt.getTime() > Date.now() - 15 * 60000 ? ctx.account.state as Record<string, any> : {};
  }
  async setState(ctx: BotContext, state: Record<string, any>) {
    ctx.account = await this.db.telegramAccount.update({ where: { id: ctx.account.id }, data: { state, stateUpdatedAt: new Date() } });
  }
  async send(chatId: string, page: BotPage) { await this.client.send(chatId, page.text, page.markup); }
  unlinked(): BotPage {
    return { text: 'Sihhat uz xodimlar botiga xush kelibsiz.\n\n1. Sihhat uz saytida o‘z xodim hisobingizga kiring.\n2. “Telegram bot” bo‘limida “Telegramga ulash”ni bosing.\n3. Bot ochilgach, saytga qaytib Telegram hisobingizni tasdiqlang.\n\nLogin, parol va tasdiqlash kodlarini botga yuborish talab qilinmaydi.', markup: { keyboard: [[{ text: '🔗 Hisobni ulash' }, { text: '❓ Yordam' }]], resize_keyboard: true } };
  }
  async handle(update: TelegramUpdate) {
    const q = update.callback_query, message = update.message || q?.message, person = update.message?.from || q?.from;
    if (!message || !person || person.is_bot) return;
    if (message.chat.type !== 'private' || message.chat.id !== person.id) {
      if (q) await this.client.call('answerCallbackQuery', { callback_query_id: q.id, text: 'Botni shaxsiy chatda oching.', show_alert: true });
      return;
    }
    const chatId = String(message.chat.id), telegramId = String(person.id);
    if (q) {
      try { await this.client.call('answerCallbackQuery', { callback_query_id: q.id }); }
      catch (error) { if (!(error instanceof TelegramError && error.status === 400)) throw error; }
    }
    try {
      const text = update.message?.text?.trim() || '';
      if (/\d{8,20}:[A-Za-z0-9_-]{30,60}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
        await this.send(chatId, this.views.page('Maxfiy kalit yoki bot tokenini chat orqali yubormang. Kerakli amalni menyudan tanlang.')); return;
      }
      const start = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{32,64})$/.exec(text);
      if (start) {
        await this.links.claim(start[1], telegramId, chatId, [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Telegram foydalanuvchisi', person.username);
        await this.send(chatId, this.views.page('Telegram hisobingiz bog‘lashga tayyor.\n\nSihhat uz saytiga qaytib ism va Telegram IDni tekshiring, so‘ng “Bog‘lashni tasdiqlash”ni bosing.', [[b('✅ Tasdiqlashni tekshirish', 'menu')]]));
        return;
      }
      const ctx = await this.context(telegramId, chatId);
      if (!ctx) { await this.send(chatId, this.unlinked()); return; }
      if (ctx.account.blockedAt) ctx.account = await this.db.telegramAccount.update({ where: { id: ctx.account.id }, data: { blockedAt: null } });
      const command = /^\/([a-z_]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/.exec(text);
      const action = q?.data || buttons[text] || (command ? commands[command[1]] : undefined);
      if (action) {
        if (!['assignee', 'taskdue', 'taskconfirm', 'ticketconfirm', 'replyconfirm'].includes(action.split(':')[0])) await this.setState(ctx, {});
        await this.send(chatId, await this.action(ctx, action));
      } else if (text) await this.send(chatId, await this.input(ctx, text));
      else await this.send(chatId, this.views.page('Matn yoki menyudagi tugmani yuboring.'));
    } catch (error: any) {
      if (error instanceof TelegramError) throw error;
      const message = error instanceof AppError ? error.message : 'Amal bajarilmadi. Bosh menyudan qayta urinib ko‘ring.';
      await this.send(chatId, this.views.page(`⚠️ ${message}`, [[b('🔄 Bosh menyu', 'menu')]]));
    }
  }
  async action(ctx: BotContext, data: string): Promise<BotPage> {
    const [action, id, value] = data.split(':');
    switch (action) {
      case 'menu': return ctx.actor.kind !== 'SUPERADMIN' && !ctx.account.sanatoriumId ? this.views.tenants(ctx) : this.views.menu(ctx);
      case 'today': return this.views.today(ctx);
      case 'tomorrow': return this.views.today(ctx, plusDays(localDate(), 1));
      case 'bookings': return this.views.bookingList(ctx, numeric(value, 9999), id);
      case 'booking': parse(uuid, id); return this.views.booking(ctx, id);
      case 'rooms': { const days = numeric(id, 7); if (![1, 7].includes(days)) fail('BUTTON_INVALID', 'Davrni tanlang.', 422); return this.views.rooms(ctx, days); }
      case 'report': return this.views.report(ctx, id === 'day');
      case 'finance': return this.views.financeMenu(ctx);
      case 'payments': return this.views.paymentList(ctx, numeric(id));
      case 'refunds': return this.views.refunds(ctx, numeric(id));
      case 'payouts': return this.views.payouts(ctx, numeric(id));
      case 'billing': return this.views.billing(ctx, numeric(id));
      case 'tasks': return this.views.tasks(ctx, numeric(id));
      case 'task': parse(uuid, id); return this.views.task(ctx, id);
      case 'taskaccept': case 'taskdone':
        parse(uuid, id); await this.engagement.taskReply(ctx.actor, id, { version: numeric(value), status: action === 'taskaccept' ? 'ACCEPTED' : 'COMPLETED' });
        return this.views.task(ctx, id);
      case 'checkin': case 'checkout': {
        parse(uuid, id); const version = numeric(value); const booking = await this.bookings.get(ctx.actor, id);
        scope(ctx.actor, booking.sanatoriumId, action === 'checkin' ? 'bookings.check_in' : 'bookings.check_out');
        return this.views.page(`${booking.reference}\n${action === 'checkin' ? 'Mehmon kelganini' : 'Mehmon ketganini'} tasdiqlaysizmi?`, [[b('✅ Tasdiqlash', `${action}ok:${id}:${version}`)]], `booking:${id}`);
      }
      case 'checkinok': case 'checkoutok':
        parse(uuid, id); await this.bookings.transition(ctx.actor, id, action === 'checkinok' ? 'CHECKED_IN' : 'CHECKED_OUT', { version: numeric(value) });
        return this.views.booking(ctx, id);
      case 'management': return this.views.management(ctx);
      case 'staff': return this.views.staff(ctx, numeric(id));
      case 'approvals': return this.views.approvals(ctx, numeric(id));
      case 'health': return this.views.health(ctx);
      case 'communication': return this.views.communication(ctx);
      case 'tickets': return this.views.tickets(ctx, numeric(id));
      case 'ticket': parse(uuid, id); return this.views.ticket(ctx, id);
      case 'messages': return this.views.messages(ctx, numeric(id));
      case 'message': parse(uuid, id); return this.views.message(ctx, id);
      case 'messageread': parse(uuid, id); await this.engagement.receipt(ctx.actor, id, { accepted: true }); return this.views.page('✅ Xabar bilan tanishganingiz qayd qilindi.', [], 'messages:0');
      case 'tenants': return this.views.tenants(ctx, numeric(id));
      case 'tenant': {
        if (id === 'all') { if (ctx.actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Admin vakolati kerak.', 403); }
        else { parse(uuid, id); scope(ctx.actor, id); if (!await this.db.sanatorium.findUnique({ where: { id } })) fail('NOT_FOUND', 'Sanatoriya topilmadi.', 404); }
        ctx.account = await this.db.telegramAccount.update({ where: { id: ctx.account.id }, data: { sanatoriumId: id === 'all' ? null : id, state: {}, stateUpdatedAt: new Date() } });
        return this.views.menu(ctx);
      }
      case 'search': this.views.where(ctx, 'bookings.read'); await this.setState(ctx, { step: 'search' }); return this.views.page('🔎 Bron raqamini yuboring. Masalan: SH-XXXXXXXXXXXX.');
      case 'settings': return this.views.settings(ctx);
      case 'setting': {
        if (!boolSettings.includes(id as any)) fail('BUTTON_INVALID', 'Sozlamani tanlang.', 422);
        const key = id as typeof boolSettings[number];
        ctx.account = await this.db.telegramAccount.update({ where: { id: ctx.account.id }, data: { [key]: !ctx.account[key] } });
        return this.views.settings(ctx);
      }
      case 'digesthour': return this.views.page('🕗 Kunlik hisobot qaysi vaqtda kelsin?\nToshkent vaqti.', [[b('07:00', 'hour:7'), b('08:00', 'hour:8')], [b('09:00', 'hour:9'), b('10:00', 'hour:10')]], 'settings');
      case 'hour': { const hour = numeric(id, 23); ctx.account = await this.db.telegramAccount.update({ where: { id: ctx.account.id }, data: { digestHour: hour } }); return this.views.settings(ctx); }
      case 'account': return this.views.page(`🔗 ${ctx.actor.name}\nTelegram: ${ctx.account.displayName}\nTelegram ID: ${ctx.account.telegramUserId}\n\nRol va ruxsatlar Sihhat uz hisobingizdan olinadi.`, [], 'settings');
      case 'disconnectask': return this.views.page('Botni hisobingizdan uzasizmi?\nTelegramdagi bildirishnomalar to‘xtaydi. Keyin saytdan qayta ulashingiz mumkin.', [[b('🔌 Ha, uzish', 'disconnect')]], 'settings');
      case 'disconnect': await this.links.disconnect(ctx.actor); return this.unlinked();
      case 'site': {
        if (!['dashboard', 'profile', 'bookings', 'inventory', 'payments', 'payouts', 'billing', 'staff', 'sanatoriums', 'refunds', 'messages', 'reconciliation'].includes(id)) fail('BUTTON_INVALID', 'Bo‘limni tanlang.', 422);
        const button = this.views.site(ctx, id);
        if (button.url) return this.views.page('Saytdagi hisobingiz orqali davom eting.', [[button]]);
        const base = ctx.actor.kind === 'SUPERADMIN' ? this.config.TELEGRAM_ADMIN_URL : this.config.TELEGRAM_PARTNER_URL;
        return this.views.page(`Sayt hozir loyiha ishlayotgan kompyuterda ochiladi:\n${new URL('/' + id, base)}\n\nTelefon orqali kirish uchun saytning ommaviy HTTPS manzili sozlanishi kerak.`);
      }
      case 'ticketnew': this.views.where(ctx, 'support.read'); await this.setState(ctx, { step: 'ticket-title', requestId: randomUUID() }); return this.views.page('✍️ Murojaat sarlavhasini yuboring (2–150 belgi).');
      case 'ticketconfirm': {
        const state = this.state(ctx); if (state.step !== 'ticket-confirm') fail('FORM_EXPIRED', 'Murojaatni qayta boshlang.', 409);
        this.views.where(ctx, 'support.read');
        const ticket = await this.engagement.ticket(ctx.actor, { title: state.title, text: state.text, ...(ctx.account.sanatoriumId ? { sanatorium_id: ctx.account.sanatoriumId } : {}) }, `telegram:${state.requestId}`);
        await this.setState(ctx, {}); return this.views.ticket(ctx, ticket.id);
      }
      case 'ticketreply': parse(uuid, id); await this.engagement.ticketGet(ctx.actor, id); await this.setState(ctx, { step: 'ticket-reply', ticketId: id, requestId: randomUUID() }); return this.views.page('✍️ Javob matnini yuboring (3–2000 belgi).', [], `ticket:${id}`);
      case 'replyconfirm': {
        const state = this.state(ctx); if (state.step !== 'reply-confirm') fail('FORM_EXPIRED', 'Javobni qayta boshlang.', 409);
        await this.engagement.ticketReply(ctx.actor, state.ticketId, { text: state.text }, `telegram:${state.requestId}`);
        await this.setState(ctx, {}); return this.views.ticket(ctx, state.ticketId);
      }
      case 'tasknew': {
        return this.views.taskAssignees(ctx, id === undefined ? 0 : numeric(id));
      }
      case 'assignee': {
        parse(uuid, id); const where = this.views.where(ctx, 'tasks.manage');
        if (!where.sanatoriumId || !await this.db.membership.findFirst({ where: { ...where, userId: id, status: 'ACTIVE' } })) fail('NOT_FOUND', 'Faol xodim topilmadi.', 404);
        await this.setState(ctx, { step: 'task-title', assignee: id, requestId: randomUUID() }); return this.views.page('✅ Vazifa sarlavhasini yuboring (2–150 belgi).', [], 'tasks:0');
      }
      case 'taskdue': {
        const state = this.state(ctx), days = numeric(id, 7); if (state.step !== 'task-due' || ![0, 1, 3, 7].includes(days)) fail('FORM_EXPIRED', 'Vazifani qayta boshlang.', 409);
        const due = `${plusDays(localDate(), days)}T18:00:00+05:00`;
        if (new Date(due) <= new Date()) fail('PAST_DATE', 'Bugungi muddat o‘tgan. Ertangi kunni tanlang.', 422);
        await this.setState(ctx, { ...state, step: 'task-confirm', due });
        return this.views.page(`✅ ${state.title}\n${state.body}\nMuddat: ${plusDays(localDate(), days)} 18:00\n\nVazifani yuborasizmi?`, [[b('📤 Yuborish', 'taskconfirm')]], 'tasks:0');
      }
      case 'taskconfirm': {
        const state = this.state(ctx); if (state.step !== 'task-confirm') fail('FORM_EXPIRED', 'Vazifani qayta boshlang.', 409);
        const where = this.views.where(ctx, 'tasks.manage');
        if (!where.sanatoriumId) fail('TENANT_REQUIRED', 'Sanatoriyani tanlang.', 422);
        const task = await this.engagement.task(ctx.actor, { sanatorium_id: where.sanatoriumId, assigned_to: state.assignee, title: state.title, body: state.body, due_at: new Date(state.due).toISOString() }, `telegram:${state.requestId}`);
        await this.setState(ctx, {}); return this.views.task(ctx, task.id);
      }
      case 'linkhelp': return this.unlinked();
      case 'help': return this.views.page('❓ Sihhat uz yordamchisi\n\n• “Bugun” — kelish va ketish jadvali.\n• “Bronlar” — filtr, qidiruv va bron tafsilotlari.\n• “Vazifalar” — topshiriqlarni qabul qilish va yakunlash.\n• “Moliya” — to‘lovlar, qaytarishlar va o‘tkazma holati.\n• “Aloqa” — murojaatlar va xabarlar.\n• “Sozlamalar” — xabar turlari va kunlik hisobot vaqti.\n\nHar bir amal joriy xodim ruxsatlari bilan tekshiriladi.\n/cancel — joriy kiritishni bekor qilish.');
      default: return this.views.page('Tugma eskirgan. Bosh menyudan bo‘limni qayta oching.');
    }
  }
  async input(ctx: BotContext, text: string): Promise<BotPage> {
    const state = this.state(ctx);
    const valid = (min: number, max: number) => { if (text.length < min || text.length > max) fail('TEXT_LENGTH', `Matn ${min}–${max} belgi bo‘lsin.`, 422); };
    switch (state.step) {
      case 'search': return this.views.search(ctx, text);
      case 'ticket-title': valid(2, 150); await this.setState(ctx, { ...state, step: 'ticket-body', title: text }); return this.views.page('Murojaatingizni batafsil yozing (3–2000 belgi). Parol yoki maxfiy kalit yubormang.');
      case 'ticket-body': valid(3, 2000); await this.setState(ctx, { ...state, step: 'ticket-confirm', text }); return this.views.page(`✍️ ${state.title}\n${text}\n\nMurojaatni yuborasizmi?`, [[b('📤 Yuborish', 'ticketconfirm')]], 'tickets:0');
      case 'ticket-reply': valid(3, 2000); await this.setState(ctx, { ...state, step: 'reply-confirm', text }); return this.views.page(`✍️ ${text}\n\nJavobni yuborasizmi?`, [[b('📤 Yuborish', 'replyconfirm')]], `ticket:${state.ticketId}`);
      case 'task-title': valid(2, 150); await this.setState(ctx, { ...state, step: 'task-body', title: text }); return this.views.page('Vazifa tavsifini yuboring (3–2000 belgi).', [], 'tasks:0');
      case 'task-body': valid(3, 2000); await this.setState(ctx, { ...state, step: 'task-due', body: text }); return this.views.page('Vazifa qachongacha bajarilsin?\nTanlangan kuni soat 18:00 · Toshkent vaqti.', [[...(localHour() < 18 ? [b('Bugun', 'taskdue:0')] : []), b('Ertaga', 'taskdue:1')], [b('3 kundan keyin', 'taskdue:3'), b('7 kundan keyin', 'taskdue:7')]], 'tasks:0');
      default: return this.views.page('Kerakli bo‘limni menyudan tanlang. Bron raqamini qidirish uchun “Bron qidirish”ni bosing.');
    }
  }
  async notification(ctx: BotContext, topic: string, payload: any): Promise<BotPage | null> {
    if (topic === 'telegram.linked') return this.views.menu(ctx);
    if (topic === 'telegram.daily') {
      if (!ctx.account.dailyDigest || payload.date !== localDate() || !this.views.has(ctx, 'bookings.read')) return null;
      const page = await this.views.today(ctx);
      page.text = '☀️ Kunlik ma’lumot\n' + page.text;
      return page;
    }
    if (topic === 'system.health.issue' || topic === 'provider.sms.failed') {
      if (ctx.actor.kind !== 'SUPERADMIN' || !ctx.account.notifyPayments) return null;
      return this.views.page(topic === 'provider.sms.failed' ? '⚠️ SMS yuborish bajarilmadi. Xizmat sozlamalari va bildirishnomalar navbatini tekshiring.' : `⚠️ Tizim tekshiruvi\nAPI: ${payload.api_ready ? 'tayyor' : 'javob bermayapti'}\nKechikkan xabarlar: ${Number(payload.pending || 0)}\nWorker: ${payload.worker_ready ? 'faol' : 'tekshirish kerak'}`, [[b('🛠 Tizim holati', 'health')]]);
    }
    if (topic.startsWith('booking.') || topic.startsWith('payment.') || topic.startsWith('refund.')) {
      const paymentCategory = topic.startsWith('payment.') || topic.startsWith('refund.');
      if (paymentCategory ? !ctx.account.notifyPayments : !ctx.account.notifyBookings) return null;
      const order = payload.order_id ? await this.db.paymentOrder.findUnique({ where: { id: payload.order_id } }) : null;
      const bookingId = payload.booking_id || order?.bookingId;
      if (!bookingId) return null;
      const booking = await this.bookings.get(ctx.actor, bookingId);
      if (paymentCategory) scope(ctx.actor, booking.sanatoriumId, 'payments.read');
      const labels: Record<string, string> = { 'booking.created': 'Yangi bron', 'payment.succeeded': 'Bron to‘lovi tasdiqlandi', 'payment.exception': 'Pul tushdi, bronni tekshirish kerak', 'refund.requested': 'Qaytarish so‘rovi', 'refund.succeeded': 'Pul qaytarildi', 'booking.checked_in': 'Mehmon kelishi qayd qilindi', 'booking.checked_out': 'Mehmon ketishi qayd qilindi' };
      return this.views.page(`🔔 ${labels[topic] || 'Bron holati yangilandi'}\n${booking.reference}\n${booking.checkIn.toISOString().slice(0, 10)} → ${booking.checkOut.toISOString().slice(0, 10)}\n${statusText[booking.status] || booking.status}`, [[b('📖 Bronni ochish', `booking:${booking.id}`)]]);
    }
    if (topic === 'task.assigned') {
      if (!ctx.account.notifyTasks) return null;
      const page = await this.views.task(ctx, payload.task_id); page.text = '🔔 Yangi topshiriq\n' + page.text; return page;
    }
    if (topic === 'message.created') {
      if (!ctx.account.notifySupport) return null;
      if (!await this.db.messageRecipient.findUnique({ where: { messageId_userId: { messageId: payload.message_id, userId: ctx.actor.id } } })) return null;
      const message = await this.db.message.findUnique({ where: { id: payload.message_id } });
      return message ? this.views.page(`📨 Yangi xabar: ${message.title}`, [[b('📨 O‘qish', `message:${message.id}`)]]) : null;
    }
    if (topic === 'support.replied' || topic === 'support.opened') {
      if (!ctx.account.notifySupport) return null;
      const ticket = await this.engagement.ticketGet(ctx.actor, payload.ticket_id);
      return this.views.page(`💬 ${topic === 'support.opened' ? 'Yangi murojaat' : 'Murojaatga javob'}: ${ticket.title}`, [[b('💬 Ochish', `ticket:${ticket.id}`)]]);
    }
    if (topic.startsWith('subscription.')) {
      if (!ctx.account.notifyBilling) return null;
      scope(ctx.actor, payload.sanatorium_id, 'invoices.read');
      const s = await this.db.subscription.findUnique({ where: { sanatoriumId: payload.sanatorium_id } });
      return s ? this.views.page(`📜 Abonent eslatmasi\nMuddat: ${s.endsAt.toISOString().slice(0, 10)}\nHolat: ${statusText[s.status] || s.status}`, [[b('📜 Hisoblar', 'billing:0')]]) : null;
    }
    if (topic === 'staff.invited' || topic === 'sanatorium.submitted') {
      if (ctx.actor.kind !== 'SUPERADMIN') return null;
      return this.views.page(`📝 ${topic === 'staff.invited' ? 'Yangi resepsion tasdiqlashni kutmoqda.' : 'Sanatoriya anketasi tekshiruvga yuborildi.'}`, [[b('📝 Tasdiqlashlar', 'approvals:0')]]);
    }
    if (topic === 'sanatorium.moderated') {
      const revision = await this.db.sanatoriumRevision.findUnique({ where: { id: payload.revision_id } });
      if (!revision) return null; scope(ctx.actor, revision.sanatoriumId, 'sanatorium.profile.edit');
      return this.views.page(`🏥 Sanatoriya anketasi: ${statusText[revision.status] || revision.status}`, [[this.views.site(ctx, 'profile')]]);
    }
    return null;
  }
  async flushNotifications(limit = 20) {
    if (!this.client.enabled) return 0;
    let sent = 0;
    for (let n = 0; n < limit; n++) {
      const row = await this.db.atomic(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "NotificationDelivery" WHERE channel='TELEGRAM' AND status='PENDING' AND "availableAt"<=now() AND ("leaseUntil" IS NULL OR "leaseUntil"<=now()) ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        return rows.length ? tx.notificationDelivery.update({ where: { id: rows[0].id }, data: { leaseUntil: new Date(Date.now() + 120000), attempts: { increment: 1 } } }) : null;
      });
      if (!row) break;
      try {
        const account = await this.db.telegramAccount.findUnique({ where: { userId: row.userId } });
        if (!account || account.blockedAt || !account.notificationsEnabled) {
          await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: 'CANCELLED', leaseUntil: null } }); continue;
        }
        const actor = await this.links.actor(account.userId), payload = row.payload as any, topic = String(payload.topic || '');
        const urgent = ['payment.exception', 'system.health.issue', 'provider.sms.failed'].includes(topic);
        const hour = localHour();
        if (!urgent && account.quietHours && (hour >= 22 || hour < 7)) {
          const morning = `${plusDays(localDate(), hour >= 22 ? 1 : 0)}T07:00:00+05:00`;
          await this.db.notificationDelivery.update({ where: { id: row.id }, data: { availableAt: new Date(morning), leaseUntil: null } }); continue;
        }
        const ctx = { actor, account };
        // Notifications can relate to another authorized membership than the selected menu.
        if (payload.sanatorium_id) ctx.account = { ...account, sanatoriumId: payload.sanatorium_id };
        const page = await this.notification(ctx, topic, payload);
        if (page) { await this.send(account.chatId, page); sent++; }
        await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: page ? 'SENT' : 'SKIPPED', sentAt: page ? new Date() : null, leaseUntil: null, lastError: null } });
      } catch (error: any) {
        const denied = typeof error?.code === 'string' && ['TELEGRAM_ACCESS_DENIED', 'PERMISSION_DENIED', 'NOT_FOUND'].includes(error.code);
        const blocked = error instanceof TelegramError && error.status === 403;
        if (blocked) await this.db.telegramAccount.updateMany({ where: { userId: row.userId }, data: { blockedAt: new Date() } });
        const delay = Math.max(error instanceof TelegramError ? error.retryAfter : 0, Math.min(900, 2 ** Math.min(row.attempts, 10)));
        await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: denied || blocked ? 'CANCELLED' : row.attempts >= 16 ? 'FAILED' : 'PENDING', availableAt: new Date(Date.now() + delay * 1000), leaseUntil: null, lastError: denied ? 'ACCESS_REVOKED' : blocked ? 'BOT_BLOCKED' : 'TELEGRAM_DELIVERY_FAILED' } });
      }
    }
    return sent;
  }
  async scheduled(key: string, topic: string, payload: Record<string, any>) {
    return this.db.atomic(async tx => {
      await lock(tx, `telegram-schedule:${key}`);
      if (await tx.telegramScheduledEvent.findUnique({ where: { id: key } })) return false;
      await tx.telegramScheduledEvent.create({ data: { id: key } });
      await emit(tx, topic, payload); return true;
    });
  }
  async schedule(now = new Date()) {
    if (!this.client.enabled) return;
    const day = localDate(now), hour = localHour(now);
    const accounts = await this.db.telegramAccount.findMany({ where: { notificationsEnabled: true, blockedAt: null } });
    for (const account of accounts) {
      try {
        const actor = await this.links.actor(account.userId), ctx = { actor, account };
        if (account.dailyDigest && hour >= account.digestHour && hour < 22 && this.views.has(ctx, 'bookings.read')) await this.scheduled(`daily:${account.id}:${day}`, 'telegram.daily', { recipient_ids: [account.userId], date: day });
      } catch { /* A revoked membership is checked again before every delivery. */ }
    }
    const subscriptions = await this.db.subscription.findMany({ where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] }, endsAt: { gte: new Date(day), lt: new Date(plusDays(day, 4)) } } });
    for (const subscription of subscriptions) {
      const days = Math.ceil((Date.parse(subscription.endsAt.toISOString().slice(0, 10)) - Date.parse(day)) / 86400000);
      if (![0, 1, 3].includes(days)) continue;
      const recipients = await this.db.membership.findMany({ where: { sanatoriumId: subscription.sanatoriumId, role: 'DIRECTOR', status: 'ACTIVE' }, select: { userId: true } });
      await this.scheduled(`subscription:${subscription.id}:${day}`, 'subscription.expiring', { sanatorium_id: subscription.sanatoriumId, recipient_ids: recipients.map(r => r.userId), days_left: days });
    }
    await this.db.telegramLinkRequest.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
    await this.db.telegramInbound.deleteMany({ where: { status: { in: ['COMPLETED', 'FAILED'] }, createdAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
    await this.db.telegramScheduledEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 45 * 86400000) } } });
  }
  async monitor() {
    if (!this.client.enabled || this.config.NODE_ENV === 'test') return;
    let apiReady = false;
    try { apiReady = (await fetch(`http://127.0.0.1:${this.config.PORT}/health/ready`, { signal: AbortSignal.timeout(5000) })).ok; } catch { /* No credential-bearing errors are logged. */ }
    const [pending, state, admins] = await Promise.all([
      this.db.outboxEvent.count({ where: { processedAt: null, createdAt: { lt: new Date(Date.now() - 120000) } } }),
      this.db.telegramBotState.findUnique({ where: { botId: this.client.botId } }),
      this.db.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } }),
    ]);
    const workerReady = !!state?.workerHeartbeatAt && state.workerHeartbeatAt.getTime() > Date.now() - 90000;
    if (!apiReady || pending > 0 || !workerReady) await this.scheduled(`health:${new Date().toISOString().slice(0, 13)}`, 'system.health.issue', { recipient_ids: admins.map(a => a.id), api_ready: apiReady, pending, worker_ready: workerReady });
  }
}
