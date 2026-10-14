import 'dotenv/config';
import { parse as parseEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_PLATFORM: z.enum(['generic', 'hostra']).default('generic'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY: z.enum(['none', 'private']).default('none'),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  TEST_DATABASE_URL: z.string().optional(),
  CORS_ORIGINS: z.string().min(1).transform(value => value.split(',').map(origin => origin.trim()).join(',')),
  AUTH_SECRET: z.string().min(32).refine(s => !s.startsWith('replace-'), 'Tasodifiy AUTH_SECRET belgilang'),
  MFA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i, '64 hex belgili MFA_ENCRYPTION_KEY kerak'),
  OTP_TTL_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  OTP_RESEND_SECONDS: z.coerce.number().int().min(30).default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  HOLD_MINUTES: z.coerce.number().int().min(1).max(30).default(5),
  SMS_ADAPTER: z.enum(['local', 'http', 'eskiz', 'disabled']).default('local'),
  DEMO_OTP_ENABLED: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  SMS_HTTP_URL: z.string().default(''), SMS_HTTP_TOKEN: z.string().default(''),
  ESKIZ_TOKEN: z.string().default(''), ESKIZ_EMAIL: z.string().default(''), ESKIZ_PASSWORD: z.string().default(''),
  ESKIZ_SENDER: z.string().min(1).max(20).default('4546'),
  ESKIZ_OTP_APPROVED: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  ESKIZ_OTP_TEMPLATE: z.string().min(1).max(500).default('Sihhat uz kirish kodi: {code}. Kodni hech kimga bermang.'),
  STORAGE_ADAPTER: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().default('../../.local/uploads'),
  S3_ENDPOINT: z.string().default(''), S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('sihhat'), S3_ACCESS_KEY: z.string().default(''), S3_SECRET_KEY: z.string().default(''),
  WORKER_MODE: z.enum(['database', 'redis']).default('database'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_SOCKET_PATH: z.enum(['', '/run/redis/redis.sock']).default(''),
  PAYMENT_MODE: z.enum(['local', 'payme', 'tezcheck']).default('local'),
  BOOKING_SETTLEMENT_MODE: z.enum(['direct', 'legacy_platform']).default('direct'),
  TEZCHECK_API_KEY: z.string().default(''),
  TEZCHECK_CASH_DESK_CODE: z.string().max(128).default(''),
  TEZCHECK_WEBHOOK_SECRET: z.string().default(''),
  TEZCHECK_HOLD_MINUTES: z.coerce.number().int().min(5).max(30).default(5),
  PAYME_MERCHANT_ID: z.string().default(''), PAYME_KEY: z.string().default(''),
  PAYME_CHECKOUT_URL: z.string().url().default('https://checkout.paycom.uz'),
  AI_ADAPTER: z.enum(['catalog', 'http', 'gemini']).default('catalog'),
  AI_HTTP_URL: z.string().default(''), AI_HTTP_TOKEN: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().regex(/^gemini-[a-z0-9.-]+$/).default('gemini-3.1-flash-lite'),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).max(10000).default(100),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(128).max(2048).default(768),
  AI_INPUT_USD_PER_MILLION: z.string().regex(/^$|^\d{1,6}(\.\d{1,6})?$/).default(''),
  AI_OUTPUT_USD_PER_MILLION: z.string().regex(/^$|^\d{1,6}(\.\d{1,6})?$/).default(''),
  PUSH_ADAPTER: z.enum(['local', 'http']).default('local'),
  PUSH_HTTP_URL: z.string().default(''), PUSH_HTTP_TOKEN: z.string().default(''),
  TELEGRAM_MODE: z.enum(['disabled', 'polling', 'webhook']).default('disabled'),
  TELEGRAM_BOT_TOKEN: z.string().default('').refine(v => !v || /^\d{5,20}:[A-Za-z0-9_-]{30,60}$/.test(v), 'Telegram token formati noto‘g‘ri'),
  TELEGRAM_BOT_USERNAME: z.string().regex(/^[A-Za-z0-9_]{5,32}$/).or(z.literal('')).default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
  TELEGRAM_ADMIN_URL: z.string().url().default('http://localhost:3000'),
  TELEGRAM_PARTNER_URL: z.string().url().default('http://localhost:3001'),
  TELEGRAM_LINK_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
});

export type Config = z.infer<typeof schema>;
function remoteUrl(value: string, protocols: string[], originOnly = false) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return protocols.includes(url.protocol)
      && !['localhost', '0.0.0.0', '[::]', '[::1]'].includes(hostname)
      && !hostname.endsWith('.localhost') && !/^127\./.test(hostname)
      && (!originOnly || (url.origin === value && !url.username && !url.password));
  } catch { return false; }
}

function productionDatabase(c: Config) {
  try {
    const url = new URL(c.DATABASE_URL);
    if (!url.searchParams.has('host')) return remoteUrl(c.DATABASE_URL, ['postgresql:']);
    const username = decodeURIComponent(url.username);
    return c.DEPLOYMENT_PLATFORM === 'hostra'
      && url.protocol === 'postgresql:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && url.searchParams.getAll('host').length === 1 && url.searchParams.get('host') === '/run/postgresql'
      && /^[a-z0-9][a-z0-9_-]{2,31}$/.test(username) && Boolean(url.password)
      && decodeURIComponent(url.pathname).startsWith(`/${username}_`);
  } catch { return false; }
}

// Return only requirement names/messages; connection strings and credentials
// must never enter deployment diagnostics.
export function productionIssues(c: Config): string[] {
  const issues: string[] = [];
  if (!productionDatabase(c)) issues.push('Production: tashqi PostgreSQL yoki Hostra private socket DATABASE_URL kerak');
  if (c.BOOKING_SETTLEMENT_MODE !== 'direct') issues.push('Production: yangi bronlar sanatoriyaning o‘z merchant hisobiga yo‘naltirilishi kerak');
  if (c.SMS_ADAPTER === 'eskiz' && !c.ESKIZ_OTP_APPROVED) issues.push('Production: Eskiz OTP hisobini va shablonini tasdiqlash kerak');
  if (c.SMS_ADAPTER === 'local' || (c.SMS_ADAPTER === 'http' && (!c.SMS_HTTP_URL || !c.SMS_HTTP_TOKEN))) issues.push('Production: haqiqiy SMS adapteri kerak');
  if (c.PAYMENT_MODE === 'local' || (c.PAYMENT_MODE === 'payme' && (!c.PAYME_KEY || !c.PAYME_MERCHANT_ID))) issues.push('Production: merchant rekvizitlari kerak');
  if (c.PAYMENT_MODE === 'tezcheck' && !c.TEZCHECK_CASH_DESK_CODE) issues.push('Production: TEZCHECK_CASH_DESK_CODE kerak');
  const hostraStorage = c.DEPLOYMENT_PLATFORM === 'hostra' && c.STORAGE_ADAPTER === 'local'
    && c.STORAGE_PATH === '/home/terminal/.sihhat/media';
  if (!hostraStorage && (c.STORAGE_ADAPTER !== 's3' || !c.S3_BUCKET || !c.S3_ACCESS_KEY || !c.S3_SECRET_KEY)) issues.push('Production: private S3 yoki Hostra persistent media papkasi kerak');
  if (c.STORAGE_ADAPTER === 's3' && c.S3_ENDPOINT && !remoteUrl(c.S3_ENDPOINT, ['https:'])) issues.push('Production: S3_ENDPOINT tashqi HTTPS manzil bo‘lishi kerak');
  if (c.WORKER_MODE !== 'redis') issues.push('Production: Redis worker kerak');
  if (c.REDIS_SOCKET_PATH ? c.DEPLOYMENT_PLATFORM !== 'hostra' : !remoteUrl(c.REDIS_URL, ['redis:', 'rediss:'])) issues.push('Production: tashqi Redis yoki Hostra private socket kerak');
  if (c.CORS_ORIGINS.split(',').some(origin => !remoteUrl(origin, ['https:'], true))) issues.push('Production: CORS_ORIGINS uchun to‘liq HTTPS originlar kerak');
  if (c.TELEGRAM_MODE !== 'disabled' && [c.TELEGRAM_ADMIN_URL, c.TELEGRAM_PARTNER_URL].some(url => !remoteUrl(url, ['https:']))) issues.push('Production: Telegram panel manzillari tashqi HTTPS bo‘lishi kerak');
  if (c.PUSH_ADAPTER === 'http' && (!c.PUSH_HTTP_URL || !c.PUSH_HTTP_TOKEN)) issues.push('Production: push HTTP adapteri uchun URL/token kerak');
  if (c.AI_ADAPTER === 'http' && (!c.AI_HTTP_URL || !c.AI_HTTP_TOKEN)) issues.push('Production: AI HTTP adapteri uchun URL/token kerak');
  for (const [name, url] of [['SMS_HTTP_URL', c.SMS_HTTP_URL], ['AI_HTTP_URL', c.AI_HTTP_URL], ['PUSH_HTTP_URL', c.PUSH_HTTP_URL]]) {
    if (url && !remoteUrl(url, ['https:'])) issues.push(`Production: ${name} tashqi HTTPS manzil bo‘lishi kerak`);
  }
  return issues;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Optional local secrets stay outside app sources, public assets and APK builds.
  // Tests never load these credentials. Deployment can use environment variables.
  const path = resolve(env.SIHHAT_SECRETS_FILE ?? '../../.local/secrets/providers.env');
  const secrets = env === process.env && env.NODE_ENV !== 'test' && existsSync(path) ? parseEnv(readFileSync(path)) : {};
  const result = schema.safeParse({ ...secrets, ...env });
  if (!result.success) throw new Error(`Konfiguratsiya xatosi: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const c = result.data;
  if (env.RAILWAY_ENVIRONMENT_ID && c.NODE_ENV !== 'production') throw new Error('Production: Railwayda NODE_ENV=production kerak');
  if (c.DEMO_OTP_ENABLED && (c.NODE_ENV === 'production' || c.SMS_ADAPTER !== 'local')) throw new Error('Demo OTP faqat lokal development/test SMS adapteri bilan ishlaydi');
  if (c.PAYMENT_MODE === 'tezcheck' && !c.TEZCHECK_API_KEY) throw new Error('Tezcheck: server API kaliti kerak');
  if (c.TELEGRAM_MODE !== 'disabled' && !c.TELEGRAM_BOT_TOKEN) throw new Error('Telegram: server bot tokeni kerak');
  if (c.TELEGRAM_MODE === 'webhook' && !/^[A-Za-z0-9_-]{32,256}$/.test(c.TELEGRAM_WEBHOOK_SECRET)) throw new Error('Telegram: webhook uchun tasodifiy maxfiy kalit kerak');
  if (c.AI_ADAPTER === 'gemini' && !c.GEMINI_API_KEY) throw new Error('Gemini: server API kaliti kerak');
  if (c.SMS_ADAPTER === 'eskiz' && !c.ESKIZ_TOKEN && !(c.ESKIZ_EMAIL && c.ESKIZ_PASSWORD)) throw new Error('Eskiz: API token yoki login rekvizitlari kerak');
  if (!c.ESKIZ_OTP_TEMPLATE.includes('{code}')) throw new Error('Eskiz: OTP shablonida {code} bo‘lishi kerak');
  if (c.NODE_ENV === 'production') {
    const issues = productionIssues(c);
    if (issues.length) throw new Error(issues.join('; '));
  }
  return c;
}
export const CONFIG = 'SIHHAT_CONFIG';
