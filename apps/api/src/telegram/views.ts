import { Inject, Injectable } from '@nestjs/common';
import { Db } from '../common/db';
import { CONFIG, type Config } from '../common/config';
import { fail } from '../common/errors';
import { scope, type Actor } from '../auth/permissions';
import type { TelegramAccount } from '../generated/prisma/client';
import { BookingService } from '../bookings/booking.service';
import { PaymentService } from '../payments/payment.service';
import { FinanceService } from '../finance/finance.service';
import { ReportsService } from '../reports/reports.service';
import { BillingService } from '../billing/billing.service';
import { EngagementService } from '../engagement/engagement.service';
import type { Button, Markup } from './client';
import { callback as b, navigation, localDate, plusDays, moneyText, statusText } from './types';

export type BotContext = { actor: Actor; account: TelegramAccount };
export type BotPage = { text: string; markup?: Markup };
const status = (s: string) => statusText[s] || s;
const short = (s: string, n = 55) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const date = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const pageSize = 6;

@Injectable()
export class TelegramViews {
  constructor(@Inject(Db) readonly db: Db, @Inject(CONFIG) readonly config: Config,
    @Inject(BookingService) readonly bookings: BookingService, @Inject(PaymentService) readonly payments: PaymentService,
    @Inject(FinanceService) readonly finance: FinanceService, @Inject(ReportsService) readonly reports: ReportsService,
    @Inject(BillingService) readonly billingService: BillingService, @Inject(EngagementService) readonly engagement: EngagementService) {}
  has(ctx: BotContext, permission: string) {
    return ctx.actor.kind === 'SUPERADMIN' || ctx.actor.memberships.some(m => m.status === 'ACTIVE'
      && (!ctx.account.sanatoriumId || ctx.account.sanatoriumId === m.sanatoriumId) && m.permissions.includes(permission));
  }
  where(ctx: BotContext, permission: string): { sanatoriumId?: string } {
    if (ctx.actor.kind === 'SUPERADMIN') return ctx.account.sanatoriumId ? { sanatoriumId: ctx.account.sanatoriumId } : {};
    const id = ctx.account.sanatoriumId;
    if (!id) fail('TENANT_REQUIRED', 'Avval sanatoriyani tanlang.', 422);
    scope(ctx.actor, id, permission);
    return { sanatoriumId: id };
  }
  query(ctx: BotContext) { return ctx.account.sanatoriumId ? { sanatorium_id: ctx.account.sanatoriumId } : {}; }
  page(text: string, rows: Button[][] = [], parent = 'menu'): BotPage {
    return { text, markup: { inline_keyboard: [...rows, navigation(parent)] } };
  }
  pager(rows: Button[][], page: number, total: number, action: string) {
    const controls: Button[] = [];
    if (page > 0) controls.push(b('◀️ Oldingi', `${action}:${page - 1}`));
    if ((page + 1) * pageSize < total) controls.push(b('Keyingi ▶️', `${action}:${page + 1}`));
    if (controls.length) rows.push(controls);
  }
  site(ctx: BotContext, section: string, label = '🖥 Saytda ochish'): Button {
    const base = ctx.actor.kind === 'SUPERADMIN' ? this.config.TELEGRAM_ADMIN_URL : this.config.TELEGRAM_PARTNER_URL;
    const url = new URL('/' + section, base);
    // Telegram cannot reach a local-only portal; the callback explains how to open it.
    if (url.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(url.hostname) && !url.hostname.endsWith('.invalid')) return { text: label, url: url.toString() };
    return b(label, `site:${section}`);
  }
  async menu(ctx: BotContext): Promise<BotPage> {
    const selected = ctx.account.sanatoriumId ? await this.db.sanatorium.findUnique({ where: { id: ctx.account.sanatoriumId }, select: { name: true } }) : null;
    const role = ctx.actor.kind === 'SUPERADMIN' ? 'Admin' : ctx.actor.memberships.find(m => m.sanatoriumId === ctx.account.sanatoriumId)?.role === 'DIRECTOR' ? 'Direktor' : 'Resepsion';
    const rows: string[][] = [];
    if (this.has(ctx, 'bookings.read')) rows.push(['📅 Bugun', '📖 Bronlar'], ['🔎 Bron qidirish', '🛏 Bo‘sh xonalar']);
    rows.push([...(this.has(ctx, 'reports.operational.read') ? ['📊 Hisobot'] : []), '✅ Vazifalar']);
    rows.push([...(this.has(ctx, 'payments.read') || this.has(ctx, 'invoices.read') || this.has(ctx, 'payouts.read') ? ['💳 Moliya'] : []), '💬 Aloqa']);
    rows.push([...(this.has(ctx, 'staff.invite') || ctx.actor.kind === 'SUPERADMIN' ? ['👥 Boshqaruv'] : []), '⚙️ Sozlamalar']);
    rows.push(['🏥 Sanatoriya', '🖥 Sayt'], ['❓ Yordam', '🏠 Bosh menyu']);
    return { text: `Sihhat uz · ${role}\n${ctx.actor.name}\n${selected?.name || (ctx.actor.kind === 'SUPERADMIN' ? 'Barcha sanatoriyalar' : 'Sanatoriyani tanlang')}\n\nKerakli bo‘limni tanlang.`, markup: { keyboard: rows.filter(r => r.length).map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true } };
  }
  async tenants(ctx: BotContext, page = 0) {
    const ids = ctx.actor.kind === 'SUPERADMIN' ? undefined : ctx.actor.memberships.filter(m => m.status === 'ACTIVE').map(m => m.sanatoriumId);
    const where = ids ? { id: { in: ids } } : {};
    const [items, total] = await Promise.all([this.db.sanatorium.findMany({ where, orderBy: { name: 'asc' }, take: pageSize, skip: page * pageSize }), this.db.sanatorium.count({ where })]);
    const rows: Button[][] = items.map(s => [b(`${ctx.account.sanatoriumId === s.id ? '✅ ' : ''}${short(s.name)}`, `tenant:${s.id}`)]);
    if (ctx.actor.kind === 'SUPERADMIN') rows.unshift([b('🌐 Barcha sanatoriyalar', 'tenant:all')]);
    this.pager(rows, page, total, 'tenants');
    return this.page('🏥 Qaysi sanatoriya bilan ishlaysiz?', rows);
  }
  async today(ctx: BotContext, day = localDate()): Promise<BotPage> {
    const where = this.where(ctx, 'bookings.read'), start = new Date(day), end = new Date(plusDays(day, 1));
    const [arrivals, departures, stays, rooms] = await Promise.all([
      this.db.booking.findMany({ where: { ...where, checkIn: start, status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, take: 8, orderBy: { reference: 'asc' } }),
      this.db.booking.findMany({ where: { ...where, checkOut: start, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } }, take: 8, orderBy: { reference: 'asc' } }),
      this.db.roomAllocation.count({ where: { ...where, active: true, kind: 'BOOKING', checkIn: { lt: end }, checkOut: { gt: start } } }),
      this.db.room.count({ where: { ...where, active: true } }),
    ]);
    const arrivalCount = await this.db.booking.count({ where: { ...where, checkIn: start, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } });
    const departureCount = await this.db.booking.count({ where: { ...where, checkOut: start, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } } });
    const lines = [`📅 ${day} · Toshkent vaqti`, `Kelishlar: ${arrivalCount}`, `Ketishlar: ${departureCount}`, `Bron bilan band xonalar: ${stays} / ${rooms}`];
    if (arrivals.length) lines.push('\nKeladigan mehmonlar:', ...arrivals.map(x => `• ${x.reference} · ${short(String((x.guest as any).name || 'Mehmon'), 30)}`));
    if (departures.length) lines.push('\nKetadigan mehmonlar:', ...departures.map(x => `• ${x.reference} · ${status(x.status)}`));
    const rows = [...arrivals.slice(0, 3), ...departures.filter(x => !arrivals.some(a => a.id === x.id)).slice(0, 3)].map(x => [b(`📖 ${x.reference}`, `booking:${x.id}`)]);
    rows.push([b('Bugun', 'today'), b('Ertaga', 'tomorrow')]);
    return this.page(lines.join('\n'), rows);
  }
  async bookingList(ctx: BotContext, page = 0, filter = 'all') {
    const filters: Record<string, string | undefined> = { all: undefined, confirmed: 'CONFIRMED', pending: 'PAYMENT_PENDING', exception: 'PAYMENT_EXCEPTION' };
    if (!(filter in filters)) fail('INVALID_FILTER', 'Bron filtrini tanlang.', 422);
    this.where(ctx, 'bookings.read');
    const result = await this.bookings.list(ctx.actor, { ...this.query(ctx), page: page + 1, limit: pageSize, ...(filters[filter] ? { status: filters[filter] } : {}) });
    const rows: Button[][] = result.data.map(x => [b(short(`${x.reference} · ${status(x.status)}`), `booking:${x.id}`)]);
    this.pager(rows, page, result.total, `bookings:${filter}`);
    rows.unshift([b('Barchasi', 'bookings:all:0'), b('Tasdiqlangan', 'bookings:confirmed:0')], [b('To‘lov jarayonda', 'bookings:pending:0'), b('Tekshirish kerak', 'bookings:exception:0')]);
    if (this.has(ctx, 'bookings.create_manual')) rows.push([this.site(ctx, 'bookings', '➕ Saytda bron yaratish')]);
    return this.page(`📖 Bronlar · ${result.total} ta\n${result.total ? 'Tafsilot uchun bronni tanlang.' : 'Bu filtr bo‘yicha bron yo‘q.'}`, rows);
  }
  async booking(ctx: BotContext, id: string) {
    const x = await this.bookings.get(ctx.actor, id);
    const s = await this.db.sanatorium.findUnique({ where: { id: x.sanatoriumId }, select: { name: true } });
    const rooms = await this.db.room.findMany({ where: { id: { in: x.items.map(i => i.roomId) } }, select: { code: true } });
    const lines = [`📖 ${x.reference}`, s?.name || '', `${date(x.checkIn)} → ${date(x.checkOut)}`, `Holat: ${status(x.status)}`, `Mehmon: ${short(String((x.guest as any).name || 'Mehmon'))}`, `Xonalar: ${rooms.map(r => r.code).join(', ') || '—'}`];
    if (ctx.actor.kind === 'SUPERADMIN' || ctx.actor.memberships.some(m => m.status === 'ACTIVE' && m.sanatoriumId === x.sanatoriumId && m.permissions.includes('payments.read'))) lines.push(`Bron summasi: ${moneyText(x.amount)}`, `To‘lov: ${x.payment ? status(x.payment.status) : 'Hali boshlanmagan'}`);
    if (x.refund) lines.push(`Qaytarish: ${status(x.refund.status)}`);
    const rows: Button[][] = [];
    const can = (p: string) => ctx.actor.kind === 'SUPERADMIN' || ctx.actor.memberships.some(m => m.status === 'ACTIVE' && m.sanatoriumId === x.sanatoriumId && m.permissions.includes(p));
    if (x.status === 'CONFIRMED' && can('bookings.check_in')) rows.push([b('✅ Kelishni qayd qilish', `checkin:${id}:${x.version}`)]);
    if (x.status === 'CHECKED_IN' && can('bookings.check_out')) rows.push([b('🏁 Ketishni qayd qilish', `checkout:${id}:${x.version}`)]);
    rows.push([this.site(ctx, 'bookings', '🖥 Bronni saytda ko‘rish')]);
    return this.page(lines.join('\n'), rows, 'bookings:all:0');
  }
  async search(ctx: BotContext, value: string) {
    const where = this.where(ctx, 'bookings.read');
    const reference = value.trim().toUpperCase();
    if (!/^SH-[A-F0-9]{6,12}$/.test(reference)) return this.page('🔎 Bron raqamini SH-XXXXXXXXXXXX ko‘rinishida yuboring. Uni bron kartasidan nusxalash mumkin.', [[b('Qidirishni davom ettirish', 'search')]]);
    const x = await this.db.booking.findFirst({ where: { ...where, reference } });
    return x ? this.booking(ctx, x.id) : this.page('Bu sanatoriyada shu raqamli bron topilmadi. Raqamni tekshirib qayta qidiring.', [[b('🔎 Qayta qidirish', 'search')]]);
  }
  async rooms(ctx: BotContext, days = 1) {
    const where = this.where(ctx, 'bookings.read'), start = new Date(localDate()), end = new Date(plusDays(localDate(), days));
    const [rooms, allocations, types] = await Promise.all([
      this.db.room.findMany({ where: { ...where, active: true }, orderBy: { code: 'asc' } }),
      this.db.roomAllocation.findMany({ where: { ...where, active: true, checkIn: { lt: end }, checkOut: { gt: start } }, select: { roomId: true } }),
      this.db.roomType.findMany({ where, select: { id: true, name: true } }),
    ]);
    const busy = new Set(allocations.map(a => a.roomId)), free = rooms.filter(r => !busy.has(r.id));
    const lines = [`🛏 ${localDate()} → ${plusDays(localDate(), days)}`, `Butun davr uchun bo‘sh: ${free.length} / ${rooms.length}`];
    for (const type of types) { const list = free.filter(r => r.roomTypeId === type.id); if (list.length) lines.push(`• ${type.name}: ${list.length} ta · ${list.slice(0, 12).map(r => r.code).join(', ')}${list.length > 12 ? '…' : ''}`); }
    lines.push('\nMavjudlik bronni yaratish vaqtida yana tekshiriladi.');
    return this.page(lines.join('\n'), [[b('1 tun', 'rooms:1'), b('7 tun', 'rooms:7')], [this.site(ctx, 'inventory')]]);
  }
  async report(ctx: BotContext, daily = false) {
    const financial = this.has(ctx, 'reports.financial.read');
    this.where(ctx, 'reports.operational.read');
    const from = daily ? localDate() : localDate().slice(0, 8) + '01', to = plusDays(localDate(), 1);
    const x = await this.reports.report(ctx.actor, { ...this.query(ctx), from, to, financial: financial ? 'true' : 'false', booking_basis: 'SERVICE' }, ctx.actor.kind === 'SUPERADMIN' && !ctx.account.sanatoriumId);
    const lines = [`📊 ${from} → ${to} (oxirgi sana kirmaydi)`, `Bronlar: ${x.bookings}`, `Xona-tun: ${x.room_nights}`, `Mehmon-tun: ${x.guest_nights}`, `Xona bandligi: ${(x.occupancy * 100).toFixed(1)}%`];
    if (x.gmv !== undefined) lines.push(`Onlayn bron to‘lovlari: ${moneyText(x.gmv)}`, `Qaytarilgan: ${moneyText(x.refunds)}`, `Sanatoriyaga majburiyat: ${moneyText(x.sanatorium_payable)}`);
    if (x.platform_revenue !== undefined) lines.push(`Platforma daromadi: ${moneyText(x.platform_revenue)}`);
    return this.page(lines.join('\n'), [[b('Bugungi hisobot', 'report:day'), b('Shu oy', 'report:month')]]);
  }
  financeMenu(ctx: BotContext) {
    const rows: Button[][] = [];
    if (this.has(ctx, 'payments.read')) rows.push([b('💳 To‘lovlar', 'payments:0')]);
    if (ctx.actor.kind === 'SUPERADMIN' || this.has(ctx, 'refunds.request')) rows.push([b('💸 Pulni qaytarish', 'refunds:0')]);
    if (this.has(ctx, 'payouts.read')) rows.push([b('🏦 Sanatoriyaga o‘tkazmalar', 'payouts:0')]);
    if (this.has(ctx, 'invoices.read')) rows.push([b('📜 Abonent va hisoblar', 'billing:0')]);
    return this.page('💳 Moliya\nKerakli bo‘limni tanlang.', rows);
  }
  async paymentList(ctx: BotContext, page = 0) {
    this.where(ctx, 'payments.read');
    const x = await this.payments.list(ctx.actor, { ...this.query(ctx), page: page + 1, limit: pageSize });
    const lines = ['💳 To‘lovlar', ...x.data.map(p => `• ${moneyText(p.amount)} · ${status(p.status)} · ${date(p.createdAt)}`)];
    if (!x.total) lines.push('To‘lovlar hali yo‘q.');
    const rows: Button[][] = x.data.filter(p => p.bookingId && this.has(ctx, 'bookings.read')).map(p => [b(`📖 ${moneyText(p.amount)} · bron`, `booking:${p.bookingId}`)]);
    this.pager(rows, page, x.total, 'payments'); rows.push([this.site(ctx, 'payments')]);
    return this.page(lines.join('\n'), rows, 'finance');
  }
  async refunds(ctx: BotContext, page = 0) {
    const where = this.where(ctx, 'refunds.request');
    const [items, total] = await Promise.all([this.db.refundRequest.findMany({ where, take: pageSize, skip: page * pageSize, orderBy: { createdAt: 'desc' } }), this.db.refundRequest.count({ where })]);
    const rows: Button[][] = this.has(ctx, 'bookings.read') ? items.map(r => [b(`📖 ${moneyText(r.amount)} · ${status(r.status)}`, `booking:${r.bookingId}`)]) : [];
    this.pager(rows, page, total, 'refunds');
    rows.push([this.site(ctx, ctx.actor.kind === 'SUPERADMIN' ? 'refunds' : 'bookings', '🖥 Saytda ko‘rib chiqish')]);
    return this.page(`💸 Qaytarish so‘rovlari · ${total} ta\nTasdiqlash va provayder orqali qaytarish saytdagi hisob bilan bajariladi.`, rows, 'finance');
  }
  async payouts(ctx: BotContext, page = 0) {
    this.where(ctx, 'payouts.read');
    const x = await this.finance.payouts(ctx.actor, { ...this.query(ctx), page: page + 1, limit: pageSize });
    const lines = ['🏦 Sanatoriyaga o‘tkazmalar', ...x.data.map(p => `• ${moneyText(p.amount)} · ${status(p.status)} · ${date(p.createdAt)}`)];
    if (!x.total) lines.push('O‘tkazmalar hali yo‘q.');
    lines.push('\nO‘tkazma faqat bank tasdig‘idan keyin to‘langan hisoblanadi.');
    const rows: Button[][] = [[this.site(ctx, 'payouts', '🖥 Saytda ko‘rib chiqish')]]; this.pager(rows, page, x.total, 'payouts');
    return this.page(lines.join('\n'), rows, 'finance');
  }
  async billing(ctx: BotContext, page = 0) {
    const where = this.where(ctx, 'invoices.read');
    const [invoices, subscriptions] = await Promise.all([this.billingService.invoices(ctx.actor, { ...this.query(ctx), page: page + 1, limit: pageSize }), this.db.subscription.findMany({ where, take: 6 })]);
    const lines = ['📜 Abonent va hisoblar', ...subscriptions.map(s => `• Abonent: ${status(s.status)} · ${date(s.endsAt)} gacha`), ...invoices.data.map(i => `• ${i.purpose === 'AD' ? 'Reklama' : 'Abonent'}: ${moneyText(i.amount)} · ${status(i.status)}`)];
    if (!subscriptions.length && !invoices.total) lines.push('Abonent va hisoblar hali yo‘q.');
    const rows: Button[][] = [[this.site(ctx, 'billing', '🖥 Hisoblarni saytda ochish')]]; this.pager(rows, page, invoices.total, 'billing');
    return this.page(lines.join('\n'), rows, 'finance');
  }
  async tasks(ctx: BotContext, page = 0) {
    const all = (await this.engagement.tasks(ctx.actor)).filter(t => !ctx.account.sanatoriumId || t.sanatoriumId === ctx.account.sanatoriumId);
    const rows: Button[][] = all.slice(page * pageSize, (page + 1) * pageSize).map(t => [b(short(`${status(t.status)} · ${t.title}`), `task:${t.id}`)]);
    if (this.has(ctx, 'tasks.manage')) rows.unshift([b('➕ Yangi vazifa', 'tasknew')]);
    this.pager(rows, page, all.length, 'tasks');
    return this.page(`✅ Vazifalar · ${all.length} ta\n${all.length ? 'Vazifani tanlang.' : 'Hozircha vazifa yo‘q.'}`, rows);
  }
  async task(ctx: BotContext, id: string) {
    const t = await this.db.task.findUnique({ where: { id } });
    if (!t) fail('NOT_FOUND', 'Vazifa topilmadi.', 404);
    scope(ctx.actor, t.sanatoriumId, t.assignedTo === ctx.actor.id ? undefined : 'tasks.manage');
    const person = await this.db.user.findUnique({ where: { id: t.assignedTo }, select: { name: true } });
    const rows: Button[][] = [];
    if (ctx.actor.kind === 'SUPERADMIN' || t.assignedTo === ctx.actor.id) {
      if (t.status === 'ASSIGNED') rows.push([b('✅ Qabul qildim', `taskaccept:${id}:${t.version}`)]);
      if (t.status === 'ACCEPTED') rows.push([b('🏁 Bajarildi', `taskdone:${id}:${t.version}`)]);
    }
    return this.page(`✅ ${t.title}\n${t.body}\n\nXodim: ${person?.name || '—'}\nHolat: ${status(t.status)}\nMuddat: ${t.dueAt.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`, rows, 'tasks:0');
  }
  async taskAssignees(ctx: BotContext, page = 0) {
    const where = this.where(ctx, 'tasks.manage');
    if (!where.sanatoriumId) return this.page('Vazifa yaratish uchun avval sanatoriyani tanlang.', [[b('🏥 Sanatoriya tanlash', 'tenants:0')]], 'tasks:0');
    const members = await this.db.membership.findMany({ where: { ...where, status: 'ACTIVE' }, select: { userId: true } });
    const users = { id: { in: members.map(m => m.userId) }, status: 'ACTIVE' };
    const [people, total] = await Promise.all([
      this.db.user.findMany({ where: users, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: pageSize, skip: page * pageSize }),
      this.db.user.count({ where: users }),
    ]);
    const rows = people.map(p => [b(short(p.name), `assignee:${p.id}`)]);
    this.pager(rows, page, total, 'tasknew');
    return this.page(`👤 Vazifa kimga beriladi?\n${total ? 'Faol xodimni tanlang.' : 'Bu sanatoriyada faol xodim yo‘q.'}`, rows, 'tasks:0');
  }
  management(ctx: BotContext) {
    const rows: Button[][] = [];
    if (this.has(ctx, 'staff.invite')) rows.push([b('👥 Jamoa va ruxsatlar', 'staff:0')]);
    if (ctx.actor.kind === 'SUPERADMIN') rows.push([b('📝 Tasdiqlash navbati', 'approvals:0')], [b('🛠 Tizim holati', 'health')]);
    return this.page('👥 Boshqaruv', rows);
  }
  async staff(ctx: BotContext, page = 0) {
    const where = this.where(ctx, 'staff.invite');
    const [items, total] = await Promise.all([this.db.membership.findMany({ where, orderBy: { createdAt: 'desc' }, take: pageSize, skip: page * pageSize }), this.db.membership.count({ where })]);
    const users = await this.db.user.findMany({ where: { id: { in: items.map(m => m.userId) } }, select: { id: true, name: true } });
    const lines = ['👥 Jamoa', ...items.map(m => `• ${users.find(u => u.id === m.userId)?.name || 'Xodim'} · ${m.role === 'DIRECTOR' ? 'Direktor' : 'Resepsion'} · ${status(m.status)}`)];
    if (!total) lines.push('Xodimlar hali yo‘q.');
    const rows: Button[][] = [[this.site(ctx, 'staff', '➕ Xodim va ruxsatlarni boshqarish')]]; this.pager(rows, page, total, 'staff');
    return this.page(lines.join('\n'), rows, 'management');
  }
  async approvals(ctx: BotContext, page = 0) {
    if (ctx.actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Admin vakolati kerak.', 403);
    const where = ctx.account.sanatoriumId ? { sanatoriumId: ctx.account.sanatoriumId } : {};
    const [members, revisions, refunds] = await Promise.all([
      this.db.membership.findMany({ where: { ...where, status: 'PENDING_APPROVAL' }, take: 6, skip: page * 6 }),
      this.db.sanatoriumRevision.findMany({ where: { ...where, status: 'SUBMITTED' }, take: 6, skip: page * 6 }),
      this.db.refundRequest.count({ where: { ...where, status: 'REQUESTED' } }),
    ]);
    const people = await this.db.user.findMany({ where: { id: { in: members.map(m => m.userId) } }, select: { id: true, name: true } });
    const lines = ['📝 Tasdiqlash navbati', `Qaytarish so‘rovlari: ${refunds}`, ...members.map(m => `• Resepsion: ${people.find(p => p.id === m.userId)?.name || 'Xodim'}`), ...revisions.map(r => `• Anketa: ${String((r.data as any).name || 'Sanatoriya')}`)];
    if (!members.length && !revisions.length && !refunds) lines.push('Ko‘rib chiqishni kutayotgan so‘rov yo‘q.');
    const rows: Button[][] = [[this.site(ctx, 'staff', '👥 Xodimlarni ko‘rib chiqish')], [this.site(ctx, 'sanatoriums', '🏥 Anketalarni ko‘rib chiqish')], [this.site(ctx, 'refunds', '💸 Qaytarishlarni ko‘rib chiqish')]];
    if (page > 0) rows.push([b('◀️ Oldingi', `approvals:${page - 1}`)]);
    if (members.length === 6 || revisions.length === 6) rows.push([b('Keyingi ▶️', `approvals:${page + 1}`)]);
    return this.page(lines.join('\n'), rows, 'management');
  }
  communication(ctx: BotContext) { return this.page('💬 Aloqa', [[b('💬 Murojaatlar', 'tickets:0'), b('📨 Xabarlar', 'messages:0')]]); }
  async tickets(ctx: BotContext, page = 0) {
    const all = (await this.engagement.tickets(ctx.actor)).filter(t => !ctx.account.sanatoriumId || t.sanatoriumId === ctx.account.sanatoriumId || t.userId === ctx.actor.id);
    const rows = all.slice(page * pageSize, (page + 1) * pageSize).map(t => [b(short(`${status(t.status)} · ${t.title}`), `ticket:${t.id}`)]);
    if (this.has(ctx, 'support.read')) rows.unshift([b('✍️ Yangi murojaat', 'ticketnew')]);
    this.pager(rows, page, all.length, 'tickets');
    return this.page(`💬 Murojaatlar · ${all.length} ta`, rows, 'communication');
  }
  async ticket(ctx: BotContext, id: string) {
    const t = await this.engagement.ticketGet(ctx.actor, id);
    const lines = [`💬 ${t.title}`, `Holat: ${status(t.status)}`, ...t.messages.slice(-5).map(m => `\n${m.userId === ctx.actor.id ? 'Siz' : 'Javob'}: ${short(m.text, 450)}`)];
    return this.page(lines.join('\n'), t.status === 'OPEN' ? [[b('✍️ Javob yozish', `ticketreply:${id}`)]] : [], 'tickets:0');
  }
  async messages(ctx: BotContext, page = 0) {
    const x = await this.engagement.messages(ctx.actor, { page: page + 1, limit: pageSize });
    const rows = x.data.filter(r => r.message).map(r => [b(short(`${r.readAt ? '📨' : '🆕'} ${r.message!.title}`), `message:${r.messageId}`)]);
    this.pager(rows, page, x.total, 'messages');
    return this.page(`📨 Xabarlar · ${x.total} ta`, rows, 'communication');
  }
  async message(ctx: BotContext, id: string) {
    const recipient = await this.db.messageRecipient.findUnique({ where: { messageId_userId: { messageId: id, userId: ctx.actor.id } } });
    if (!recipient) fail('NOT_FOUND', 'Xabar topilmadi.', 404);
    const message = await this.db.message.findUniqueOrThrow({ where: { id } });
    await this.engagement.receipt(ctx.actor, id, {});
    return this.page(`📨 ${message.title}\n\n${short(message.body, 2800)}${message.assetIds.length ? '\n\nBiriktirilgan fayllarni saytda ochishingiz mumkin.' : ''}`, [[b('✅ Tanishdim', `messageread:${id}`)], [this.site(ctx, 'messages')]], 'messages:0');
  }
  async health(ctx: BotContext) {
    if (ctx.actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Admin vakolati kerak.', 403);
    const [pending, exceptions, differences, smsErrors] = await Promise.all([
      this.db.outboxEvent.count({ where: { processedAt: null, createdAt: { lt: new Date(Date.now() - 120000) } } }),
      this.db.booking.count({ where: { status: 'PAYMENT_EXCEPTION' } }), this.db.reconciliationDifference.count(),
      this.db.outboxEvent.count({ where: { topic: 'provider.sms.failed', createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);
    return this.page(`🛠 Tizim holati\nBaza: ulanish mavjud\n2 daqiqadan ortiq kutayotgan xabarlar: ${pending}\nTekshirish kerak bo‘lgan bronlar: ${exceptions}\nTo‘lov solishtirish tafovutlari: ${differences}\nOxirgi 24 soatdagi SMS xatolari: ${smsErrors}`, [[b('🔄 Yangilash', 'health'), this.site(ctx, 'reconciliation')]], 'management');
  }
  settings(ctx: BotContext) {
    const a = ctx.account;
    const toggle = (title: string, key: string, value: boolean) => [b(`${value ? '✅' : '🔕'} ${title}`, `setting:${key}`)];
    return this.page(`⚙️ Bildirishnomalar\nKunlik hisobot: ${a.digestHour.toString().padStart(2, '0')}:00 · Toshkent vaqti\nTungi sokin vaqt: 22:00–07:00\nMuhim to‘lov muammolari sokin vaqtda ham yuboriladi.`, [
      toggle('Bildirishnomalar', 'notificationsEnabled', a.notificationsEnabled), toggle('Bronlar', 'notifyBookings', a.notifyBookings),
      toggle('To‘lovlar', 'notifyPayments', a.notifyPayments), toggle('Vazifalar', 'notifyTasks', a.notifyTasks),
      toggle('Xabar va murojaatlar', 'notifySupport', a.notifySupport), toggle('Abonent eslatmalari', 'notifyBilling', a.notifyBilling),
      toggle('Kunlik hisobot', 'dailyDigest', a.dailyDigest), [b('🕗 Hisobot vaqtini tanlash', 'digesthour')], toggle('Tungi sokin vaqt', 'quietHours', a.quietHours),
      [b('🔗 Hisob ma’lumotlari', 'account'), b('🔌 Botni uzish', 'disconnectask')],
    ]);
  }
}
