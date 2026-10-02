import { fail } from '../common/errors';

export const DELEGATABLE = [
  'sanatorium.profile.edit', 'inventory.manage', 'pricing.manage', 'discounts.manage',
  'bookings.read', 'bookings.create_manual', 'bookings.guarantee', 'bookings.check_in', 'bookings.check_out',
  'payments.read', 'offline_payments.record', 'offline_payments.verify', 'reports.operational.read',
  'reports.financial.read', 'reports.export', 'refunds.request', 'messages.send', 'tasks.manage',
  'surveys.respond', 'reviews.reply', 'support.read', 'invoices.read', 'invoices.pay', 'ads.request', 'payouts.read',
] as const;
export const PLATFORM = ['sanatoriums.manage', 'moderation.manage', 'staff.approve', 'refunds.approve', 'payouts.manage', 'announcements.broadcast', 'audit.read', 'billing.manage', 'reconciliation.manage', 'platform.reports', 'reviews.moderate', 'catalog.manage', 'staff.reset'] as const;
export const DIRECTOR = [...DELEGATABLE, 'staff.invite', 'staff.permissions.manage', 'bank.request'];
export const RECEPTION = ['sanatorium.profile.edit', 'bookings.read', 'bookings.create_manual', 'bookings.guarantee', 'bookings.check_in', 'bookings.check_out', 'payments.read', 'reports.operational.read', 'surveys.respond', 'support.read'];
export type Actor = { id: string; kind: string; name: string; phone?:string|null; login?:string|null; sessionId: string; mustChangePassword: boolean; memberships: { id: string; sanatoriumId: string; role: string; status: string; permissions: string[]; version: number }[] };
export function effective(m: { role: string; grants: string[]; denies: string[]; adminDenies?: string[]; ceiling: string[] }) {
  const allowed = new Set([...DELEGATABLE, 'staff.invite', 'staff.permissions.manage', 'bank.request']);
  const template = m.role === 'DIRECTOR' ? DIRECTOR : RECEPTION;
  return [...new Set([...template, ...m.grants])].filter(p => allowed.has(p as any) && !m.denies.includes(p) && !m.adminDenies?.includes(p) && (m.ceiling.length === 0 || m.ceiling.includes(p)));
}
export function requirePlatform(actor: Actor, _permission: string) { if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Bu amal uchun superadmin vakolati kerak', 403); }
export function scope(actor: Actor, sanatoriumId: string, permission?: string) {
  if (actor.kind === 'SUPERADMIN') return;
  const m = actor.memberships.find(m => m.sanatoriumId === sanatoriumId && m.status === 'ACTIVE');
  if (!m) fail('NOT_FOUND', 'Ma’lumot topilmadi', 404);
  if (permission && !m.permissions.includes(permission)) fail('PERMISSION_DENIED', 'Bu amal uchun ruxsat berilmagan', 403);
}
export function tenantIds(actor: Actor, permission?: string): string[] | undefined {
  if (actor.kind === 'SUPERADMIN') return undefined;
  return actor.memberships.filter(m => m.status === 'ACTIVE' && (!permission || m.permissions.includes(permission))).map(m => m.sanatoriumId);
}
