import { createCipheriv, createDecipheriv, createHmac, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  rawScrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result));
});

export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const value = await scrypt(password, salt);
  return `scrypt:${salt}:${value.toString('hex')}`;
}
export async function passwordMatches(password: string, encoded: string | null) {
  const [, salt, expected] = (encoded ?? 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64)).split(':');
  if (!salt || !expected) return false;
  const actual = await scrypt(password, salt);
  const target = Buffer.from(expected, 'hex');
  return target.length === actual.length && timingSafeEqual(actual, target) && encoded !== null;
}
export const opaque = () => randomBytes(32).toString('base64url');
export function encrypt(value: string, key: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64url')).join('.');
}
export function decrypt(value: string, key: string) {
  const [iv, tag, data] = value.split('.').map(s => Buffer.from(s, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]; return output;
}
function decode32(input: string) {
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of input.replace(/=+$/, '').toUpperCase()) { const n = alphabet.indexOf(ch); if (n < 0) throw new Error('Invalid base32'); value = (value << 5) | n; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
export function totp(secret: string, step = Math.floor(Date.now() / 30000), digits = 6) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decode32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const num = digest.readUInt32BE(offset) & 0x7fffffff;
  return (num % 10 ** digits).toString().padStart(digits, '0');
}
export function matchTotp(secret: string, code: string, lastStep: bigint) {
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now, now - 1, now + 1]) {
    if (BigInt(step) > lastStep && /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))) return BigInt(step);
  }
  return null;
}
