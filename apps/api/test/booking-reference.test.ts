import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOKING_REFERENCE_REGEX,
  allocateBookingReference,
  ensureBookingReferencesMigrated,
  formatBookingReference,
  normalizeBookingReference,
} from '../src/bookings/booking-reference.util';
import { matchingBookings } from '../src/bookings/search';

test('normalizeBookingReference and formatBookingReference handle 5-digit BR- codes', () => {
  assert.equal(formatBookingReference(48291), 'BR-48291');
  assert.equal(formatBookingReference('7'), 'BR-00007');
  assert.equal(normalizeBookingReference('48291'), 'BR-48291');
  assert.equal(normalizeBookingReference('BR-48291'), 'BR-48291');
  assert.equal(normalizeBookingReference('br-48291'), 'BR-48291');
  assert.equal(normalizeBookingReference('#BR-48291'), 'BR-48291');
  assert.equal(normalizeBookingReference('BR 48291'), 'BR-48291');
  assert.equal(normalizeBookingReference('4829'), null);
  assert.equal(normalizeBookingReference('482910'), null);
  assert.equal(normalizeBookingReference('+998901234567'), null);
});

test('allocateBookingReference produces non-sequential, unique 5-digit BR-XXXXX codes and never repeats', async () => {
  const permanentRegistry = new Set<string>();
  const activeBookings = new Map<string, string>();
  const mockDb = {
    async $queryRaw(_strings: TemplateStringsArray, ...values: unknown[]) {
      const sql = _strings.join('?');
      if (sql.includes('generate_series')) {
        const start = Number(values[1]);
        const end = Number(values[2]);
        for (let g = start; g <= end; g++) {
          const code = `BR-${String(g).padStart(5, '0')}`;
          if (!permanentRegistry.has(code) && ![...activeBookings.values()].includes(code)) {
            permanentRegistry.add(code);
            return [{ reference: code }];
          }
        }
        return [];
      }
      const candidate = String(values[0]);
      if (permanentRegistry.has(candidate) || [...activeBookings.values()].includes(candidate)) {
        return [];
      }
      permanentRegistry.add(candidate);
      return [{ reference: candidate }];
    },
  };

  const generated: string[] = [];
  for (let i = 0; i < 600; i++) {
    const code = await allocateBookingReference(mockDb as any);
    assert.match(code, BOOKING_REFERENCE_REGEX);
    assert.equal(generated.includes(code), false, `Duplicate code generated: ${code}`);
    generated.push(code);
    activeBookings.set(`b-${i}`, code);
  }
  assert.equal(new Set(generated).size, 600);

  // Verify randomness (not sequential increments like +1/+1/+1)
  const numericValues = generated.slice(0, 25).map((c) => Number(c.slice(3)));
  let sequentialPairs = 0;
  for (let i = 1; i < numericValues.length; i++) {
    if (Math.abs(numericValues[i] - numericValues[i - 1]) === 1) sequentialPairs++;
  }
  assert.ok(sequentialPairs < 3, 'Generated booking codes must be random, not sequential');

  // Even if the 1st booking is removed from activeBookings, its ID stays in BookingReference and can never be reused
  const firstCode = generated[0];
  activeBookings.delete('b-0');
  let collideFirst = true;
  const collidingDb = {
    async $queryRaw(_strings: TemplateStringsArray, ...values: unknown[]) {
      const candidate = collideFirst ? firstCode : String(values[0]);
      collideFirst = false;
      if (permanentRegistry.has(candidate)) return [];
      permanentRegistry.add(candidate);
      return [{ reference: candidate }];
    },
  };
  const afterDelete = await allocateBookingReference(collidingDb as any);
  assert.notEqual(afterDelete, firstCode);
  assert.match(afterDelete, BOOKING_REFERENCE_REGEX);
});

test('ensureBookingReferencesMigrated upgrades legacy SH- references to unique BR-XXXXX codes', async () => {
  const registry = new Set<string>(['BR-55555']);
  const rows = [
    { id: '00000000-0000-4000-8000-000000000001', reference: 'BR-55555' },
    { id: '00000000-0000-4000-8000-000000000002', reference: 'SH-8F92A1C3E4B2' },
    { id: '00000000-0000-4000-8000-000000000003', reference: 'SH-AABBCCDDEEFF' },
  ];
  const mockDb = {
    async $executeRawUnsafe() {
      return 0;
    },
    async $queryRaw(_strings: TemplateStringsArray, ...values: unknown[]) {
      const candidate = String(values[0]);
      if (registry.has(candidate) || rows.some((r) => r.reference === candidate)) return [];
      registry.add(candidate);
      return [{ reference: candidate }];
    },
    booking: {
      async findMany() {
        return [...rows];
      },
      async update({ where, data }: any) {
        const target = rows.find((r) => r.id === where.id);
        if (target) target.reference = data.reference;
        return target;
      },
    },
  };

  await ensureBookingReferencesMigrated(mockDb);
  assert.equal(rows[0].reference, 'BR-55555');
  assert.match(rows[1].reference, BOOKING_REFERENCE_REGEX);
  assert.match(rows[2].reference, BOOKING_REFERENCE_REGEX);
  assert.equal(new Set(rows.map((r) => r.reference)).size, 3);
});

test('matchingBookings matches explicit BR-XXXXX strictly on reference without false phone matches', async () => {
  const sampleBookings = [
    { id: 'b-exact', reference: 'BR-90144', guest: { name: 'Ali Valiyev', phone: '+998911112233' } },
    { id: 'b-phone-collision', reference: 'BR-33445', guest: { name: 'Sardor', phone: '+998901444444' } },
  ];

  const fakeDb = {
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      const sql = strings.join('?');
      if (sql.includes('upper(reference) =') && !sql.includes("guest->>'phone'")) {
        const hasExact = Boolean(values[0]);
        const exactCode = String(values[1]);
        const prefixPattern = String(values[3]).replace(/%$/, '');
        return sampleBookings
          .filter((b) =>
            hasExact
              ? b.reference.toUpperCase() === exactCode
              : b.reference.toUpperCase().startsWith(prefixPattern),
          )
          .map((b) => ({ id: b.id }));
      }
      const digits = String(values[6] ?? '').replace(/%/g, '');
      const brPrefix = String(values[3] ?? '').replace(/%$/, '');
      return sampleBookings
        .filter(
          (b) =>
            (brPrefix && b.reference.toUpperCase().startsWith(brPrefix)) ||
            (digits && b.guest.phone.replace(/\D/g, '').includes(digits)),
        )
        .map((b) => ({ id: b.id }));
    },
  };

  // Explicit BR-90144 must ONLY return b-exact, NOT b-phone-collision
  const exactMatches = await matchingBookings(fakeDb as any, 'BR-90144');
  assert.deepEqual(exactMatches, ['b-exact']);

  // Partial BR-901 prefix
  const prefixMatches = await matchingBookings(fakeDb as any, 'BR-901');
  assert.deepEqual(prefixMatches, ['b-exact']);
});
