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
  const trimmed = value.trim().replace(/^#+\s*/, "");
  if (!trimmed) return [];
  const explicitBrMatch = /^br[\s-]*(\d{1,5})$/i.exec(trimmed);
  if (explicitBrMatch) {
    const brDigits = explicitBrMatch[1];
    const exactCode = brDigits.length === 5 ? `BR-${brDigits}` : null;
    const prefixPattern = `BR-${brDigits}%`;
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE (${exactCode !== null} AND upper(reference) = ${exactCode ?? ""})
         OR (${exactCode === null} AND upper(reference) LIKE ${prefixPattern})`;
    return rows.map((row) => row.id);
  }
  const escaped = trimmed.replace(/[\\%_]/g, "\\$&");
  const pattern = "%" + escaped + "%";
  const digits = trimmed.replace(/\D/g, "");
  const compact = trimmed.replace(/[-\s]/g, "").toUpperCase();
  const isShortDigits = /^\d{1,5}$/.test(trimmed);
  const brPrefix = isShortDigits ? `BR-${trimmed}%` : "";
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Booking" WHERE reference ILIKE ${pattern}
      OR upper(replace(reference, '-', '')) = ${compact}
      OR (${isShortDigits} AND upper(reference) LIKE ${brPrefix})
      OR guest->>'name' ILIKE ${pattern}
      OR (${digits.length > 0} AND regexp_replace(guest->>'phone', '[^0-9]', '', 'g') LIKE ${"%" + digits + "%"})`;
  return rows.map((row) => row.id);
}
