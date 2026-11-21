import { randomInt } from 'node:crypto';

export function fallbackPublicIdFromUuid(id?: string | null): number {
  if (!id) return 100000;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 100000 + ((h >>> 0) % 900000);
}

export function resolveUserPublicId(user: { id: string; publicId?: number | null }): number {
  if (typeof user.publicId === 'number' && user.publicId >= 100000 && user.publicId <= 999999) {
    return user.publicId;
  }
  return fallbackPublicIdFromUuid(user.id);
}

export async function allocateUserPublicId(
  tx: { user?: { findFirst?: (args: any) => Promise<any> } },
  seedId?: string,
): Promise<number> {
  const findFirst = tx?.user?.findFirst;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate =
      attempt === 0 && seedId
        ? fallbackPublicIdFromUuid(seedId)
        : randomInt(100_000, 1_000_000);
    if (typeof findFirst !== 'function') return candidate;
    try {
      const taken = await findFirst.call(tx.user, {
        where: { publicId: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    } catch {
      return candidate;
    }
  }
  return randomInt(100_000, 1_000_000);
}
