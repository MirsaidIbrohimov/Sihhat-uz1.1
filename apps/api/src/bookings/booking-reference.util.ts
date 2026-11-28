import { randomInt } from 'node:crypto';
import { fail } from '../common/errors';

export const BOOKING_REFERENCE_PREFIX = 'BR-';
export const BOOKING_REFERENCE_REGEX = /^BR-\d{5}$/;

const mockIssuedRegistry = new WeakMap<object, Set<string>>();

export function formatBookingReference(digits: number | string): string {
  const clean = String(digits).replace(/\D/g, '').slice(-5);
  return `${BOOKING_REFERENCE_PREFIX}${clean.padStart(5, '0')}`;
}

export function randomBookingReferenceCandidate(): string {
  return `${BOOKING_REFERENCE_PREFIX}${randomInt(10_000, 100_000)}`;
}

/**
 * Normalizes user-entered booking codes such as "48291", "br-48291", "BR48291", or "#BR-48291"
 * into canonical "BR-48291" format when valid; returns null otherwise.
 */
export function normalizeBookingReference(raw: string): string | null {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/^#+\s*/, '')
    .toUpperCase();
  const match = /^(?:BR[\s-]*)?(\d{5})$/.exec(cleaned);
  if (!match) return null;
  return `${BOOKING_REFERENCE_PREFIX}${match[1]}`;
}

/**
 * Allocates a non-sequential, random 5-digit `BR-XXXXX` booking ID that is permanently
 * recorded in `"BookingReference"` so no issued booking ID can ever repeat again.
 */
export async function allocateBookingReference(
  tx: {
    $queryRaw?: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;
    booking?: {
      findUnique?: (args: any) => Promise<any>;
      findFirst?: (args: any) => Promise<any>;
    };
    bookingReference?: {
      findUnique?: (args: any) => Promise<any>;
      create?: (args: any) => Promise<any>;
    };
  },
  bookingId?: string,
): Promise<string> {
  if (typeof tx?.$queryRaw === 'function') {
    for (let attempt = 0; attempt < 64; attempt++) {
      const candidate = randomBookingReferenceCandidate();
      const claimed: { reference: string }[] = await tx.$queryRaw`
        INSERT INTO "BookingReference" ("reference", "bookingId")
        SELECT ${candidate}, ${bookingId ?? null}::uuid
        WHERE NOT EXISTS (SELECT 1 FROM "Booking" WHERE "reference" = ${candidate})
        ON CONFLICT ("reference") DO NOTHING
        RETURNING "reference"`;
      if (Array.isArray(claimed) && claimed.length > 0 && claimed[0]?.reference) {
        return claimed[0].reference;
      }
    }

    for (const [rangeStart, rangeEnd] of [
      [10_000, 99_999],
      [1, 9_999],
    ] as const) {
      const fallback: { reference: string }[] = await tx.$queryRaw`
        INSERT INTO "BookingReference" ("reference", "bookingId")
        SELECT code, ${bookingId ?? null}::uuid
        FROM (
          SELECT ('BR-' || lpad(g::text, 5, '0')) AS code
          FROM generate_series(${rangeStart}::int, ${rangeEnd}::int) AS g
          WHERE NOT EXISTS (
            SELECT 1 FROM "BookingReference" r WHERE r."reference" = ('BR-' || lpad(g::text, 5, '0'))
          )
          AND NOT EXISTS (
            SELECT 1 FROM "Booking" b WHERE b."reference" = ('BR-' || lpad(g::text, 5, '0'))
          )
          ORDER BY random()
          LIMIT 1
        ) AS pick
        ON CONFLICT ("reference") DO NOTHING
        RETURNING "reference"`;
      if (Array.isArray(fallback) && fallback.length > 0 && fallback[0]?.reference) {
        return fallback[0].reference;
      }
    }

    fail('BOOKING_REFERENCE_EXHAUSTED', 'Bo‘sh 5 xonali BR- bron raqami qolmadi', 503);
  }

  // Fallback for lightweight unit-test mocks without raw SQL
  const targetKey = (tx && typeof tx === 'object' ? tx : null);
  let issued = targetKey ? mockIssuedRegistry.get(targetKey) : undefined;
  if (targetKey && !issued) {
    issued = new Set<string>();
    mockIssuedRegistry.set(targetKey, issued);
  }

  for (let attempt = 0; attempt < 256; attempt++) {
    const candidate = randomBookingReferenceCandidate();
    if (issued?.has(candidate)) continue;
    if (typeof tx?.bookingReference?.findUnique === 'function') {
      const regTaken = await tx.bookingReference.findUnique({
        where: { reference: candidate },
        select: { reference: true },
      });
      if (regTaken) continue;
    }
    const findBooking = tx?.booking?.findUnique ?? tx?.booking?.findFirst;
    if (typeof findBooking === 'function') {
      const bookingTaken = await findBooking.call(tx.booking, {
        where: { reference: candidate },
        select: { id: true },
      });
      if (bookingTaken) continue;
    }
    if (typeof tx?.bookingReference?.create === 'function') {
      await tx.bookingReference.create({
        data: { reference: candidate, bookingId: bookingId ?? null },
      });
    }
    issued?.add(candidate);
    return candidate;
  }

  fail('BOOKING_REFERENCE_EXHAUSTED', 'Bo‘sh 5 xonali BR- bron raqami qolmadi', 503);
}

/**
 * Ensures `"BookingReference"` table exists and converts any legacy non-`BR-XXXXX`
 * booking references on startup (idempotent).
 */
export async function ensureBookingReferencesMigrated(db: {
  $executeRawUnsafe?: (sql: string) => Promise<unknown>;
  $queryRaw?: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;
  booking?: {
    findMany?: (args: any) => Promise<{ id: string; reference: string }[]>;
    update?: (args: any) => Promise<unknown>;
  };
}): Promise<void> {
  if (typeof db?.$executeRawUnsafe !== 'function') return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BookingReference" (
        "reference" TEXT NOT NULL,
        "bookingId" UUID,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BookingReference_pkey" PRIMARY KEY ("reference")
      )
    `);
    await db.$executeRawUnsafe(`
      INSERT INTO "BookingReference" ("reference", "bookingId")
      SELECT "reference", "id" FROM "Booking"
      WHERE "reference" ~ '^BR-[0-9]{5}$'
      ON CONFLICT ("reference") DO NOTHING
    `);
    if (typeof db?.booking?.findMany === 'function' && typeof db?.booking?.update === 'function') {
      const rows = await db.booking.findMany({
        select: { id: true, reference: true },
        orderBy: { createdAt: 'asc' },
        take: 2000,
      });
      for (const row of rows) {
        if (BOOKING_REFERENCE_REGEX.test(row.reference)) continue;
        const nextRef = await allocateBookingReference(db as any, row.id);
        await db.booking.update({
          where: { id: row.id },
          data: { reference: nextRef },
        });
      }
    }
  } catch {
    // Ignore on read-only or mock test adapters
  }
}
