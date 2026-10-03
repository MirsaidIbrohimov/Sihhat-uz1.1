import { z } from 'zod';

const identity = z.object({ id: z.number().int().positive().safe(), is_bot: z.boolean().optional(), first_name: z.string().max(200).optional(), last_name: z.string().max(200).optional(), username: z.string().max(100).optional() });
const chat = z.object({ id: z.number().int().safe(), type: z.enum(['private', 'group', 'supergroup', 'channel']) });
const message = z.object({ message_id: z.number().int().optional(), from: identity.optional(), chat, text: z.string().max(4096).optional(), date: z.number().int().optional() });
export const updateInput = z.object({
  update_id: z.number().int().nonnegative().safe(), message: message.optional(),
  callback_query: z.object({ id: z.string().max(200), from: identity, message: message.optional(), data: z.string().max(64).optional() }).optional(),
});
export type TelegramUpdate = z.infer<typeof updateInput>;
export const callback = (text: string, data: string) => ({ text, callback_data: data });
export const navigation = (parent = 'menu') => [callback('⬅️ Orqaga', parent), callback('🏠 Bosh menyu', 'menu')];
export const localDate = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
export const localHour = (now = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hourCycle: 'h23' }).format(now));
export const plusDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const moneyText = (amount: bigint | string) => {
  const n = BigInt(amount), a = n < 0n ? -n : n;
  return `${n < 0n ? '−' : ''}${(a / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${a % 100n ? ',' + (a % 100n).toString().padStart(2, '0') : ''} so‘m`;
};
export const statusText: Record<string, string> = {
  HOLD: 'To‘lov kutilmoqda', PAYMENT_PENDING: 'To‘lov jarayonda', CONFIRMED: 'Tasdiqlangan', CHECKED_IN: 'Mehmon kelgan', CHECKED_OUT: 'Yashash yakunlangan',
  CANCELLED: 'Bekor qilingan', EXPIRED: 'Muddati tugagan', NO_SHOW: 'Mehmon kelmagan', PAYMENT_EXCEPTION: 'Tekshirish kerak',
  CREATED: 'Yaratilgan', PENDING: 'Kutilmoqda', SUCCEEDED: 'Muvaffaqiyatli', REQUESTED: 'So‘rov yuborilgan', APPROVED: 'Ma’qullangan', REJECTED: 'Rad etilgan', PROCESSING: 'Bajarilmoqda', PAID: 'To‘langan', UNPAID: 'To‘lanmagan',
  ACTIVE: 'Faol', PENDING_APPROVAL: 'Tasdiq kutilmoqda', BLOCKED: 'Bloklangan', TRIAL: 'Sinov muddati', PAST_DUE: 'To‘lov kechikkan', SUSPENDED: 'To‘xtatilgan',
  ASSIGNED: 'Yangi vazifa', ACCEPTED: 'Qabul qilingan', COMPLETED: 'Bajarilgan', OPEN: 'Ochiq', CLOSED: 'Yopilgan', DRAFT: 'Qoralama', SUBMITTED: 'Tekshiruvda',
};
