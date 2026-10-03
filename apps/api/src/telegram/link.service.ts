import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CONFIG, type Config } from '../common/config';
import { Db, audit, emit, hash, lock } from '../common/db';
import { opaque } from '../common/crypto';
import { fail, parse, uuid } from '../common/errors';
import { effective, type Actor } from '../auth/permissions';
import { TelegramClient } from './client';

@Injectable()
export class TelegramLinkService {
  constructor(@Inject(Db) readonly db: Db, @Inject(CONFIG) readonly config: Config, @Inject(TelegramClient) readonly client: TelegramClient) {}
  async actor(userId: string): Promise<Actor> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE' || !['SUPERADMIN', 'STAFF'].includes(user.kind) || user.mustChangePassword) fail('TELEGRAM_ACCESS_DENIED', 'Xodim hisobining kirish ruxsati faol emas.', 403);
    const memberships = await this.db.membership.findMany({ where: { userId } });
    if (user.kind === 'STAFF' && !memberships.some(m => m.status === 'ACTIVE')) fail('TELEGRAM_ACCESS_DENIED', 'Xodim vakolati faol emas.', 403);
    return { id: user.id, kind: user.kind, name: user.name, phone: user.phone, login: user.login, sessionId: 'telegram', mustChangePassword: false,
      memberships: memberships.map(m => ({ id: m.id, sanatoriumId: m.sanatoriumId, role: m.role, status: m.status, version: m.version, permissions: m.status === 'ACTIVE' ? effective(m) : [] })) };
  }
  async username() {
    return this.config.TELEGRAM_BOT_USERNAME || (await this.db.telegramBotState.findUnique({ where: { botId: this.client.botId } }))?.username || '';
  }
  async status(actor: Actor) {
    await this.actor(actor.id);
    const [account, link, username] = await Promise.all([
      this.db.telegramAccount.findUnique({ where: { userId: actor.id } }),
      this.db.telegramLinkRequest.findFirst({ where: { userId: actor.id, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } }),
      this.username(),
    ]);
    return { enabled: this.client.enabled, bot_username: username,
      account: account ? { telegram_user_id: account.telegramUserId, display_name: account.displayName, username: account.username, connected_at: account.createdAt, blocked: !!account.blockedAt } : null,
      link: link ? { id: link.id, expires_at: link.expiresAt, claimed: !!link.claimedAt, telegram_user_id: link.telegramUserId, display_name: link.displayName, username: link.username } : null };
  }
  async start(actor: Actor) {
    await this.actor(actor.id);
    if (!this.client.enabled) fail('TELEGRAM_DISABLED', 'Telegram bot hali yoqilmagan.', 503);
    const username = await this.username();
    if (!username) fail('TELEGRAM_NOT_READY', 'Telegram bot sozlamalari tayyorlanmoqda. Birozdan keyin qayta urining.', 503);
    const token = opaque();
    return this.db.atomic(async tx => {
      await lock(tx, `telegram-link:${actor.id}`);
      await tx.telegramLinkRequest.updateMany({ where: { userId: actor.id, consumedAt: null }, data: { consumedAt: new Date() } });
      const request = await tx.telegramLinkRequest.create({ data: { userId: actor.id, sessionId: actor.sessionId, tokenHash: hash(token), expiresAt: new Date(Date.now() + this.config.TELEGRAM_LINK_TTL_SECONDS * 1000) } });
      await audit(tx, actor.id, 'telegram.link_started', request.id);
      return { id: request.id, expires_at: request.expiresAt, url: `https://t.me/${username}?start=${token}` };
    });
  }
  async claim(token: string, telegramUserId: string, chatId: string, displayName: string, username?: string) {
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token) || chatId !== telegramUserId) fail('TELEGRAM_LINK_INVALID', 'Bog‘lash havolasi yaroqsiz.', 400);
    return this.db.atomic(async tx => {
      await lock(tx, `telegram-token:${hash(token)}`);
      const request = await tx.telegramLinkRequest.findUnique({ where: { tokenHash: hash(token) } });
      if (!request || request.consumedAt || request.expiresAt <= new Date()) fail('TELEGRAM_LINK_EXPIRED', 'Havola eskirgan. Saytdan yangi havola oling.', 410);
      const session = await tx.session.findUnique({ where: { id: request.sessionId } });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) fail('TELEGRAM_LINK_EXPIRED', 'Saytga qayta kirib yangi havola oling.', 410);
      await this.actor(request.userId);
      if (request.telegramUserId && request.telegramUserId !== telegramUserId) fail('TELEGRAM_LINK_CLAIMED', 'Havola allaqachon ochilgan. Saytdan yangi havola oling.', 409);
      const current = await tx.telegramAccount.findUnique({ where: { telegramUserId } });
      if (current && current.userId !== request.userId) fail('TELEGRAM_ALREADY_LINKED', 'Bu Telegram boshqa xodim hisobiga bog‘langan.', 409);
      await tx.telegramLinkRequest.update({ where: { id: request.id }, data: { telegramUserId, chatId, displayName: displayName.slice(0, 200), username: username?.slice(0, 100), claimedAt: new Date() } });
      return { request_id: request.id };
    });
  }
  async confirm(actor: Actor, id: string, body: unknown) {
    parse(uuid, id);
    const input = parse(z.object({ telegram_user_id: z.string().regex(/^[1-9]\d{0,19}$/) }).strict(), body);
    await this.actor(actor.id);
    return this.db.atomic(async tx => {
      await lock(tx, `telegram-link:${actor.id}`);
      await lock(tx, `telegram-identity:${input.telegram_user_id}`);
      const request = await tx.telegramLinkRequest.findUnique({ where: { id } });
      if (!request || request.userId !== actor.id || request.consumedAt || request.expiresAt <= new Date() || !request.claimedAt || request.telegramUserId !== input.telegram_user_id || !request.chatId || !request.displayName) fail('TELEGRAM_LINK_INVALID', 'Telegram hisobini tekshirib, bog‘lashni qayta boshlang.', 409);
      const current = await tx.telegramAccount.findUnique({ where: { telegramUserId: input.telegram_user_id } });
      if (current && current.userId !== actor.id) fail('TELEGRAM_ALREADY_LINKED', 'Bu Telegram boshqa hisobga bog‘langan.', 409);
      const data = { telegramUserId: input.telegram_user_id, chatId: request.chatId, displayName: request.displayName, username: request.username, blockedAt: null, state: {}, stateUpdatedAt: new Date() };
      await tx.telegramAccount.upsert({ where: { userId: actor.id }, create: { userId: actor.id, sanatoriumId: actor.memberships.find(m => m.status === 'ACTIVE')?.sanatoriumId, ...data }, update: data });
      await tx.telegramLinkRequest.updateMany({ where: { userId: actor.id, consumedAt: null }, data: { consumedAt: new Date() } });
      await audit(tx, actor.id, 'telegram.link_confirmed', id, undefined, undefined, { telegram_user_id: input.telegram_user_id });
      await emit(tx, 'telegram.linked', { recipient_ids: [actor.id] });
      return { success: true };
    });
  }
  async disconnect(actor: Actor) {
    await this.db.atomic(async tx => {
      await lock(tx, `telegram-link:${actor.id}`);
      await tx.telegramAccount.deleteMany({ where: { userId: actor.id } });
      await tx.telegramLinkRequest.updateMany({ where: { userId: actor.id, consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.notificationDelivery.updateMany({ where: { userId: actor.id, channel: 'TELEGRAM', status: 'PENDING' }, data: { status: 'CANCELLED', leaseUntil: null } });
      await audit(tx, actor.id, 'telegram.disconnected', actor.id);
    });
    return { success: true };
  }
}
