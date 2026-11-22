import { Inject, Injectable } from '@nestjs/common';
import { createSign } from 'node:crypto';
import { CONFIG, resolveFirebaseCredentials, type Config, type FirebaseServiceAccount } from '../common/config';

export const ANDROID_PUSH_CHANNEL_ID = 'sihhat_notifications';
export const ANDROID_PUSH_ICON = 'ic_stat_sihhat';
export const ANDROID_PUSH_COLOR = '#00866C';

export const URGENT_PUSH_TOPICS = new Set<string>([
  'payment.succeeded',
  'payment.exception',
  'booking.confirmed',
  'booking.cancelled',
  'refund.succeeded',
  'support.replied',
  'support.opened',
  'auth.bruteforce_alert',
  'partner.password_reset_requested',
]);

export function isUrgentPushTopic(topic: string, payload: Record<string, unknown> = {}): boolean {
  if (URGENT_PUSH_TOPICS.has(topic)) return true;
  if (topic === 'message.created' && String(payload.kind || '').toUpperCase() === 'WARNING') return true;
  return false;
}

export function resolveNotificationRoute(topic: string, payload: Record<string, unknown> = {}): string {
  if (topic === 'app.update' && typeof payload.download_url === 'string' && payload.download_url.startsWith('https://')) {
    return 'update';
  }
  if ((topic === 'support.replied' || topic === 'support.opened') && typeof payload.ticket_id === 'string' && payload.ticket_id) {
    return 'support';
  }
  if (typeof payload.booking_id === 'string' && payload.booking_id) {
    return 'booking';
  }
  return 'notifications';
}

export interface PushNotificationInput {
  notificationId?: string;
  topic: string;
  title: string;
  body: string;
  kind?: string | null;
  bookingId?: string | null;
  ticketId?: string | null;
  messageId?: string | null;
  downloadUrl?: string | null;
  route?: string | null;
  urgent?: boolean;
}

export interface FcmSendResult {
  ok: boolean;
  messageName?: string;
  invalidToken?: boolean;
  errorCode?: string;
  retryable?: boolean;
}

export function maskPushToken(token: string): string {
  const clean = token.trim();
  if (clean.length <= 16) return '***';
  return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildAndroidFcmMessage(token: string, input: PushNotificationInput) {
  const title = truncate(input.title || 'Sihhat.uz', 140);
  const body = truncate(input.body || 'Sizda yangi bildirishnoma bor.', 600);
  const urgent = input.urgent ?? isUrgentPushTopic(input.topic, { kind: input.kind });
  const route = input.route || resolveNotificationRoute(input.topic, {
    booking_id: input.bookingId,
    ticket_id: input.ticketId,
    download_url: input.downloadUrl,
  });

  const data: Record<string, string> = {
    topic: String(input.topic || 'notification'),
    route,
    title,
    body,
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
    priority: urgent ? 'HIGH' : 'NORMAL',
  };
  if (input.notificationId) data.notification_id = String(input.notificationId);
  if (input.bookingId) data.booking_id = String(input.bookingId);
  if (input.ticketId) data.ticket_id = String(input.ticketId);
  if (input.messageId) data.message_id = String(input.messageId);
  if (input.kind) data.kind = String(input.kind);
  if (input.downloadUrl && input.downloadUrl.startsWith('https://')) {
    data.download_url = input.downloadUrl;
  }

  return {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: urgent ? 'HIGH' : 'NORMAL',
        ttl: '86400s',
        notification: {
          channel_id: ANDROID_PUSH_CHANNEL_ID,
          icon: ANDROID_PUSH_ICON,
          color: ANDROID_PUSH_COLOR,
          sound: 'default',
          default_vibrate_timings: true,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          notification_priority: urgent ? 'PRIORITY_HIGH' : 'PRIORITY_DEFAULT',
        },
      },
    },
  };
}

function classifyFcmError(status: number, body: any): { errorCode: string; invalidToken: boolean; retryable: boolean } {
  const err = body?.error;
  const details = Array.isArray(err?.details) ? err.details : [];
  const fcmDetail = details.find((d: any) => typeof d?.errorCode === 'string');
  const errorCode = String(fcmDetail?.errorCode || err?.status || `HTTP_${status}`);
  const message = String(err?.message || '').toLowerCase();

  const invalidToken =
    errorCode === 'UNREGISTERED' ||
    errorCode === 'SENDER_ID_MISMATCH' ||
    (errorCode === 'INVALID_ARGUMENT' && (message.includes('registration token') || message.includes('not a valid fcm')));

  const retryable = !invalidToken && (status === 429 || status >= 500 || errorCode === 'UNAVAILABLE' || errorCode === 'INTERNAL' || errorCode === 'QUOTA_EXCEEDED');
  return { errorCode, invalidToken, retryable };
}

@Injectable()
export class FcmService {
  private readonly credentials: FirebaseServiceAccount | null;
  private cachedAccessToken: { token: string; expiresAt: number } | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor(@Inject(CONFIG) private readonly config: Config) {
    this.credentials = resolveFirebaseCredentials(config);
  }

  get configured(): boolean {
    return this.credentials !== null;
  }

  get enabled(): boolean {
    if (this.config.PUBLIC_DEMO_ENABLED) return false;
    if (this.config.PUSH_ADAPTER === 'fcm') return this.credentials !== null;
    if (this.config.PUSH_ADAPTER === 'local' && this.config.NODE_ENV !== 'test') {
      return this.credentials !== null;
    }
    return false;
  }

  get adapterMode(): 'fcm' | 'http' | 'local' {
    if (this.enabled) return 'fcm';
    if (this.config.PUSH_ADAPTER === 'http') return 'http';
    return 'local';
  }

  get projectId(): string | null {
    return this.credentials?.projectId ?? null;
  }

  private createSignedJwt(creds: FirebaseServiceAccount): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimSet = base64UrlEncode(JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: this.config.FCM_OAUTH_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }));
    const unsigned = `${header}.${claimSet}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = base64UrlEncode(signer.sign(creds.privateKey));
    return `${unsigned}.${signature}`;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.credentials) throw new Error('FCM_NOT_CONFIGURED');
    if (this.cachedAccessToken && Date.now() < this.cachedAccessToken.expiresAt - 120_000) {
      return this.cachedAccessToken.token;
    }
    if (this.tokenPromise) return this.tokenPromise;

    const creds = this.credentials;
    this.tokenPromise = (async () => {
      const assertion = this.createSignedJwt(creds);
      const res = await fetch(this.config.FCM_OAUTH_TOKEN_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }).toString(),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || typeof json.access_token !== 'string' || !json.access_token) {
        const errCode = typeof json.error === 'string' ? json.error : `OAUTH_HTTP_${res.status}`;
        throw new Error(`FCM_OAUTH_FAILED:${errCode}`);
      }
      const expiresIn = Number(json.expires_in ?? 3600);
      this.cachedAccessToken = {
        token: json.access_token,
        expiresAt: Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
      };
      return json.access_token;
    })().finally(() => {
      this.tokenPromise = null;
    });
    return this.tokenPromise;
  }

  async sendToToken(token: string, input: PushNotificationInput): Promise<FcmSendResult> {
    if (!this.enabled || !this.credentials) {
      return { ok: false, errorCode: 'FCM_NOT_CONFIGURED', retryable: false };
    }
    const baseUrl = this.config.FCM_API_BASE_URL.replace(/\/$/, '');
    const endpoint = `${baseUrl}/v1/projects/${encodeURIComponent(this.credentials.projectId)}/messages:send`;
    const body = buildAndroidFcmMessage(token, input);

    try {
      const accessToken = await this.getAccessToken();
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (res.ok) {
        return { ok: true, messageName: typeof json.name === 'string' ? json.name : undefined };
      }
      if (res.status === 401) {
        this.cachedAccessToken = null;
      }
      const classified = classifyFcmError(res.status, json);
      console.warn(JSON.stringify({
        event: 'fcm.send.failed',
        topic: input.topic,
        token_hint: maskPushToken(token),
        status: res.status,
        error_code: classified.errorCode,
        invalid_token: classified.invalidToken,
      }));
      return {
        ok: false,
        invalidToken: classified.invalidToken,
        errorCode: classified.errorCode,
        retryable: classified.retryable,
      };
    } catch (err: any) {
      const errorCode = err?.message?.startsWith('FCM_OAUTH_FAILED:') ? err.message : 'FCM_NETWORK_ERROR';
      console.error(JSON.stringify({
        event: 'fcm.send.error',
        topic: input.topic,
        token_hint: maskPushToken(token),
        error_code: errorCode,
      }));
      return { ok: false, errorCode, retryable: true };
    }
  }
}
