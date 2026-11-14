import { fail } from '../common/errors';

export const MAX_AVATAR_BYTES = 15 * 1024 * 1024;

export function normalizeAvatarInput(rawValue: string | null | undefined): string | null | undefined {
  if (rawValue === undefined) return undefined;
  const raw = rawValue?.trim() ?? '';
  if (!raw) return null;

  if (raw.startsWith('data:')) {
    const m = /^data:(image\/(?:png|jpeg|jpg|pjpeg|x-png|webp|gif))(?:;[^;,]+)*;base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw);
    if (!m) fail('INVALID_AVATAR', 'Faqat PNG, JPEG, WEBP yoki GIF rasm yuklash mumkin', 422);
    const cleanB64 = m[2].replace(/\s+/g, '');
    const decodedBytes = Buffer.from(cleanB64, 'base64').byteLength;
    if (!decodedBytes) fail('INVALID_AVATAR', 'Rasm ma’lumoti yaroqsiz', 422);
    if (decodedBytes > MAX_AVATAR_BYTES) fail('AVATAR_TOO_LARGE', 'Rasm hajmi 15 MB dan oshmasligi kerak', 422);
    let mime = m[1].toLowerCase();
    if (mime === 'image/jpg' || mime === 'image/pjpeg') mime = 'image/jpeg';
    if (mime === 'image/x-png') mime = 'image/png';
    return `data:${mime};base64,${cleanB64}`;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.protocol !== 'https:' || raw.length > 2048) {
    fail('INVALID_AVATAR', 'Rasm havolasi to‘g‘ri HTTPS manzil bo‘lishi kerak', 422);
  }
  return parsed.href;
}
