import { z } from "zod";
import type { Db } from "../common/db";
import { fail } from "../common/errors";

export const searchInput = {
  q: z.string().trim().max(120).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
};
export function dateFilter(from?: string, to?: string, instant = false) {
  if (from && to && to < from)
    fail("DATE_RANGE_INVALID", "Davr oxiri davr boshidan oldin bo‘lmasin", 422);
  const suffix = instant ? "T00:00:00+05:00" : "T00:00:00Z";
  return {
    ...(from ? { gte: new Date(from + suffix) } : {}),
    ...(to ? { lt: new Date(Date.parse(to + suffix) + 86400000) } : {}),
  };
}
export async function matchingBookings(db: Db, value: string) {
  const pattern = "%" + value.replace(/[\\%_]/g, "\\$&") + "%";
  const digits = value.replace(/\D/g, "");
  const compact = value.replace(/[-\s]/g, "").toUpperCase();
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Booking" WHERE reference ILIKE ${pattern}
      OR replace(reference, '-', '') = ${compact}
      OR guest->>'name' ILIKE ${pattern}
      OR (${digits.length > 0} AND regexp_replace(guest->>'phone', '[^0-9]', '', 'g') LIKE ${"%" + digits + "%"})`;
  return rows.map((row) => row.id);
}
