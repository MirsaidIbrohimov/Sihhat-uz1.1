import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, type Config } from '../common/config';

export type Button = { text: string; callback_data?: string; url?: string };
export type Markup = { inline_keyboard: Button[][] } | { keyboard: { text: string }[][]; resize_keyboard: boolean; is_persistent?: boolean };
export class TelegramError extends Error {
  constructor(readonly status: number, readonly retryAfter = 0) {
    super(`Telegram so‘rovi bajarilmadi (${status}).`);
  }
}

@Injectable()
export class TelegramClient {
  // Test mode cannot contact Telegram or expose a real credential.
  readonly sent: { method: string; body: Record<string, any> }[] = [];
  constructor(@Inject(CONFIG) readonly config: Config) {}
  get botId() { return this.config.TELEGRAM_BOT_TOKEN.split(':')[0] || 'disabled'; }
  get enabled() { return this.config.TELEGRAM_MODE !== 'disabled' && !!this.config.TELEGRAM_BOT_TOKEN; }
  async call<T = any>(method: string, body: Record<string, any> = {}): Promise<T> {
    if (!/^[A-Za-z]+$/.test(method)) throw new TelegramError(400);
    if (this.config.NODE_ENV === 'test') {
      this.sent.push({ method, body: structuredClone(body) });
      return (method === 'getMe' ? { id: 10001, username: 'sihhat_test_bot', is_bot: true }
        : method === 'getWebhookInfo' ? { url: '' }
        : method === 'getUpdates' ? [] : { message_id: this.sent.length }) as T;
    }
    if (!this.enabled) throw new TelegramError(503);
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(method === 'getUpdates' ? 35000 : 12000),
      });
      const data: any = await response.json();
      if (!response.ok || data.ok !== true) throw new TelegramError(Number(data.error_code || response.status), Number(data.parameters?.retry_after || 0));
      return data.result as T;
    } catch (error) {
      // Fetch exceptions can contain the credential-bearing URL: never propagate them.
      if (error instanceof TelegramError) throw error;
      throw new TelegramError(503);
    }
  }
  send(chatId: string, text: string, replyMarkup?: Markup) {
    return this.call('sendMessage', { chat_id: chatId, text: text.slice(0, 4000),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      link_preview_options: { is_disabled: true }, protect_content: true });
  }
}
