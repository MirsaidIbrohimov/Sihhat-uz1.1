import { z } from "zod";
import type { Db, Tx } from "../common/db";
import { fail, parse, uuid } from "../common/errors";
import { type Actor, requirePlatform, scope } from "../auth/permissions";

export const reportInput = z
  .object({
    sanatorium_id: uuid.optional(),
    from: z.iso.date(),
    to: z.iso.date(),
    booking_basis: z.enum(["CREATED", "PAYMENT", "SERVICE"]).default("SERVICE"),
    financial: z.enum(["true", "false"]).default("false"),
  })
  .strict();

export async function buildReport(
  db: Db | Tx,
  actor: Actor,
  query: unknown,
  global = false,
) {
  const i = parse(reportInput, query);
  if (
    i.to <= i.from ||
    Date.parse(i.to) - Date.parse(i.from) > 366 * 86400000
  ) {
    fail("DATE_RANGE_INVALID", "Davr 1–366 kun bo‘lsin", 422);
  }
  if (global) requirePlatform(actor, "platform.reports");
  const tenant =
    i.sanatorium_id ??
    (global
      ? undefined
      : actor.memberships.find((m) => m.status === "ACTIVE")?.sanatoriumId);
  if (!global && !tenant) fail("TENANT_REQUIRED", "Sanatoriyani tanlang", 422);
  if (tenant)
    scope(
      actor,
      tenant,
      i.financial === "true"
        ? "reports.financial.read"
        : "reports.operational.read",
    );
  const sanatorium = tenant
    ? await db.sanatorium.findUnique({
        where: { id: tenant },
        select: { id: true, name: true },
      })
    : null;
  if (tenant && !sanatorium) fail("NOT_FOUND", "Sanatoriya topilmadi", 404);
  const from = new Date(`${i.from}T00:00:00+05:00`);
  const to = new Date(`${i.to}T00:00:00+05:00`);
  const checkIn = new Date(i.from),
    checkOut = new Date(i.to);
  const where = tenant ? { sanatoriumId: tenant } : {};
  const payments = await db.paymentOrder.findMany({
    where: {
      ...where,
      purpose: "BOOKING",
      status: "SUCCEEDED",
      paidAt: { gte: from, lt: to },
    },
  });
  const countWhere: any = { ...where };
  if (i.booking_basis === "CREATED")
    countWhere.createdAt = { gte: from, lt: to };
  else if (i.booking_basis === "PAYMENT")
    countWhere.id = { in: payments.map((p) => p.bookingId!).filter(Boolean) };
  else {
    countWhere.checkIn = { lt: checkOut };
    countWhere.checkOut = { gt: checkIn };
  }
  const [bookings, service, rooms, maintenance] = await Promise.all([
    db.booking.findMany({ where: countWhere }),
    db.booking.findMany({
      where: {
        ...where,
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    }),
    db.room.findMany({ where: { ...where, active: true } }),
    db.roomAllocation.findMany({
      where: {
        ...where,
        kind: "MAINTENANCE",
        active: true,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    }),
  ]);
  const items = await db.bookingItem.findMany({
    where: { bookingId: { in: service.map((b) => b.id) } },
  });
  const clip = (a: Date, b: Date) =>
    Math.max(
      0,
      (Math.min(b.getTime(), checkOut.getTime()) -
        Math.max(a.getTime(), checkIn.getTime())) /
        86400000,
    );
  const blocked = maintenance.reduce(
    (n, m) => n + clip(m.checkIn, m.checkOut),
    0,
  );
  const denominator =
    (rooms.length * (checkOut.getTime() - checkIn.getTime())) / 86400000 -
    blocked;
  let roomNights = 0,
    guestNights = 0;
  for (const b of service) {
    const n = clip(b.checkIn, b.checkOut),
      group = items.filter((item) => item.bookingId === b.id);
    roomNights += n * group.length;
    guestNights +=
      n *
      group.reduce(
        (sum, item) => sum + item.adults + item.childrenAges.length,
        0,
      );
  }
  const result: any = {
    sanatorium,
    generated_at: new Date().toISOString(),
    period: {
      from: i.from,
      to: i.to,
      to_exclusive: true,
      timezone: "Asia/Tashkent",
      booking_basis: i.booking_basis,
      payment_basis: "paid_at",
      refund_basis: "completed_at",
      payout_basis: "paid_at",
      service_basis: "overlap",
      offline_basis: "created_at_current_status",
    },
    bookings: bookings.length,
    booking_statuses: bookings.reduce(
      (a: Record<string, number>, b) => ({
        ...a,
        [b.status]: (a[b.status] ?? 0) + 1,
      }),
      {},
    ),
    room_nights: roomNights,
    guest_nights: guestNights,
    sellable_room_nights: Math.max(0, denominator),
    occupancy: denominator > 0 ? roomNights / denominator : 0,
  };
  if (i.financial === "true" || global) {
    const [refunds, journals, offline, paidPayouts] = await Promise.all([
      db.refundRequest.findMany({
        where: {
          ...where,
          status: "SUCCEEDED",
          completedAt: { gte: from, lt: to },
        },
      }),
      db.ledgerJournal.findMany({
        where: { ...where, createdAt: { lt: to } },
        select: { id: true, createdAt: true },
      }),
      db.offlinePayment.groupBy({
        by: ["method", "status"],
        where: {
          ...where,
          createdAt: { gte: from, lt: to },
          status: { in: ["VERIFIED", "UNVERIFIED"] },
        },
        _sum: { amount: true },
      }),
      db.payout.aggregate({
        where: { ...where, status: "PAID", paidAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
    ]);
    const lines = await db.ledgerLine.findMany({
      where: { journalId: { in: journals.map((j) => j.id) } },
    });
    const net = (account: string) =>
      lines
        .filter((l) => l.account === account)
        .reduce((n, l) => n + l.credit - l.debit, 0n);
    const periodIds = new Set(
      journals.filter((j) => j.createdAt >= from).map((j) => j.id),
    );
    const revenue = lines
      .filter(
        (l) =>
          periodIds.has(l.journalId) &&
          ["AD_REVENUE", "SUBSCRIPTION_REVENUE"].includes(l.account),
      )
      .reduce((n, l) => n + l.credit - l.debit, 0n);
    const offlineAmount = (status: string, method?: string) =>
      offline
        .filter(
          (row) => row.status === status && (!method || row.method === method),
        )
        .reduce((n, row) => n + (row._sum.amount ?? 0n), 0n);
    const gmv = payments.reduce((n, p) => n + p.amount, 0n);
    const refunded = refunds.reduce((n, r) => n + r.amount, 0n);
    Object.assign(result, {
      gmv: gmv.toString(),
      refunds: refunded.toString(),
      net_online_receipts: (gmv - refunded).toString(),
      verified_offline_receipts: offlineAmount("VERIFIED").toString(),
      offline_cash_receipts: offlineAmount("VERIFIED", "CASH").toString(),
      offline_terminal_receipts: offlineAmount(
        "VERIFIED",
        "TERMINAL",
      ).toString(),
      unverified_offline_receipts: offlineAmount("UNVERIFIED").toString(),
      paid_payouts: (paidPayouts._sum.amount ?? 0n).toString(),
      sanatorium_payable: net("SANATORIUM_PAYABLE").toString(),
      refund_payable: net("REFUND_PAYABLE").toString(),
      payout_in_transit: net("PAYOUT_IN_TRANSIT").toString(),
      receivable: (-net("RECEIVABLE")).toString(),
      deferred_service_revenue: net("DEFERRED_SERVICE_REVENUE").toString(),
      ...(global ? { platform_revenue: revenue.toString() } : {}),
      currency: "UZS",
      minor_unit: "tiyin",
    });
  }
  return result;
}

const metricLabels: Record<string, string> = {
  bookings: "Bronlar soni",
  room_nights: "Xona-tunlar",
  guest_nights: "Mehmon-tunlar",
  sellable_room_nights: "Sotiladigan xona-tunlar",
  occupancy: "Xonalar bandligi",
  gmv: "Tasdiqlangan onlayn to‘lovlar",
  refunds: "Mijozga qaytarilgan pul",
  net_online_receipts: "Sof onlayn tushum",
  verified_offline_receipts: "Tasdiqlangan joyida to‘lov qaydlari",
  offline_cash_receipts: "Naqd to‘lov qaydlari",
  offline_terminal_receipts: "Terminal to‘lov qaydlari",
  unverified_offline_receipts: "Tasdiqlanmagan joyida to‘lov qaydlari",
  paid_payouts: "Bank tasdiqlagan o‘tkazmalar",
  sanatorium_payable: "Sanatoriyaga qarzdorlik qoldig‘i",
  refund_payable: "Refund majburiyati qoldig‘i",
  payout_in_transit: "Bankka yuborilayotgan qoldiq",
  receivable: "Undiriladigan qoldiq",
  deferred_service_revenue: "Kelgusi xizmat daromadi qoldig‘i",
  platform_revenue: "Platforma daromadi",
};
const statusLabels: Record<string, string> = {
  HOLD: "Vaqtincha band",
  PAYMENT_PENDING: "To‘lov kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  CHECKED_IN: "Joylashtirilgan",
  CHECKED_OUT: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
  EXPIRED: "Muddati tugagan",
  NO_SHOW: "Kelmagan",
  PAYMENT_EXCEPTION: "To‘lov muammosi",
};
const monetary = new Set([
  "gmv",
  "refunds",
  "net_online_receipts",
  "verified_offline_receipts",
  "offline_cash_receipts",
  "offline_terminal_receipts",
  "unverified_offline_receipts",
  "paid_payouts",
  "sanatorium_payable",
  "refund_payable",
  "payout_in_transit",
  "receivable",
  "deferred_service_revenue",
  "platform_revenue",
]);

export function reportRows(report: any) {
  const rows: string[][] = [
    ["Ko‘rsatkich", "Qiymat", "Birlik"],
    ["Sanatoriya", report.sanatorium?.name ?? "Barcha sanatoriyalar", ""],
    ["Sanatoriya ID", report.sanatorium?.id ?? "platform", ""],
    ["Davr boshi", report.period.from, "sana"],
    [
      "Davr oxiri (kiradi)",
      new Date(Date.parse(report.period.to) - 86400000)
        .toISOString()
        .slice(0, 10),
      "sana",
    ],
    ["Vaqt mintaqasi", report.period.timezone, ""],
    ["Yaratilgan vaqt", report.generated_at, "UTC"],
    [
      "Bron hisobi",
      (
        {
          SERVICE: "Yashash davri",
          CREATED: "Yaratilgan sana",
          PAYMENT: "To‘langan sana",
        } as Record<string, string>
      )[report.period.booking_basis] ?? report.period.booking_basis,
      "",
    ],
    [
      "Onlayn to‘lov / refund / o‘tkazma",
      "To‘langan / qaytarilgan / bank tasdiqlagan sana bo‘yicha",
      "",
    ],
    [
      "Joyida to‘lov qaydlari",
      "Qayd sanasi va joriy tasdiqlash holati bo‘yicha; tuzatilgan eski qaydlar kiritilmaydi",
      "",
    ],
    ["Qoldiqlar", "Davr oxirigacha yig‘ilgan qoldiq; davr tushumi emas", ""],
  ];
  for (const [key, title] of Object.entries(metricLabels)) {
    if (report[key] === undefined) continue;
    let value = String(report[key]),
      unit = "son";
    if (monetary.has(key)) {
      const amount = BigInt(value),
        absolute = amount < 0n ? -amount : amount;
      value = `${amount < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
      unit = "UZS";
    } else if (key === "occupancy") {
      value = (Number(value) * 100).toFixed(2);
      unit = "%";
    }
    rows.push([title, value, unit]);
  }
  for (const [status, count] of Object.entries(report.booking_statuses))
    rows.push([
      `Bron holati: ${statusLabels[status] ?? status}`,
      String(count),
      "son",
    ]);
  return rows;
}

export function reportCsv(report: any) {
  const rows = reportRows(report);
  const safe = (s: string) =>
    `"${(/^[\s\u0000-\u001f]*[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(safe).join(",")).join("\r\n") + "\r\n";
}
