"use client";
import { useState } from "react";
import { Coins, CreditCard, Download, Printer, Wallet } from "lucide-react";
import { formatMoney, query } from "@sihhat/api-client";
import { XlsxDownload } from "./report-download";
import {
  Card,
  date,
  dateTime,
  ErrorBox,
  label,
  Loading,
  localDate,
  PageHeading,
  StatValue,
  Table,
  usePortal,
  useRemote,
} from "./components";
import {
  previousReportPeriod,
  reportPeriod,
  shiftDate,
  type ReportPreset,
} from "./report-period";

const presets: { id: ReportPreset; label: string }[] = [
  { id: "TODAY", label: "Bugun" },
  { id: "DAYS_7", label: "7 kun" },
  { id: "DAYS_30", label: "30 kun" },
  { id: "DAYS_90", label: "90 kun" },
  { id: "MONTH", label: "Oy bo‘yicha" },
  { id: "CUSTOM", label: "Sana oralig‘i" },
];
export function AccountantReports() {
  const ctx = usePortal(),
    today = localDate();
  const [preset, setPreset] = useState<ReportPreset>("MONTH");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [through, setThrough] = useState(today);
  const [compare, setCompare] = useState(false);
  const period = reportPeriod(preset, today, month, from, through);
  const financial = ctx.allowed("reports.financial.read");
  const allowed = financial || ctx.allowed("reports.operational.read");
  const reportPath = (p: { from: string; to: string }) =>
    "/partner/reports" +
    query({
      sanatorium_id: ctx.tenant,
      ...p,
      financial: String(financial),
      booking_basis: "SERVICE",
    });
  const remote = useRemote(
    period && ctx.tenant && allowed ? reportPath(period) : null,
    ctx.epoch,
  );
  const previous = period ? previousReportPeriod(period, preset) : null;
  const comparison = useRemote(
    compare && previous && ctx.tenant && allowed ? reportPath(previous) : null,
    ctx.epoch,
  );
  const r = remote.data;
  const tenantName = ctx.tenants.find((s) => s.id === ctx.tenant)?.name ?? "";
  return (
    <div className="accountant-report">
      <PageHeading
        title="Hisobchi hisobotlari"
        subtitle={`${tenantName} · Asia/Tashkent`}
      >
        <button
          className="button secondary report-controls"
          onClick={ctx.refresh}
        >
          Yangilash
        </button>
      </PageHeading>
      <Card title="Hisobot davri">
        <div
          className="report-presets report-controls"
          role="group"
          aria-label="Hisobot davrini tanlash"
        >
          {presets.map((p) => (
            <button
              key={p.id}
              className={`button ${preset === p.id ? "primary" : "secondary"}`}
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="date-filter report-controls">
          {preset === "MONTH" && (
            <label>
              Hisobot oyi
              <input
                aria-label="Hisobot oyi"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          )}
          {preset === "CUSTOM" && (
            <>
              <label>
                Davr boshi
                <input
                  aria-label="Davr boshi"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                Davr oxiri
                <input
                  aria-label="Davr oxiri"
                  type="date"
                  value={through}
                  onChange={(e) => setThrough(e.target.value)}
                />
              </label>
            </>
          )}
          <label className="report-compare">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />{" "}
            Oldingi davr bilan solishtirish
          </label>
        </div>
        {period ? (
          <p className="report-period-summary">
            {date(period.from)} — {date(shiftDate(period.to, -1))} · Ikkala sana
            ham kiradi.
          </p>
        ) : (
          <p className="field-error" role="alert">
            To‘g‘ri sana yoki 1–366 kun oralig‘ini tanlang.
          </p>
        )}
      </Card>
      {!allowed ? (
        <ErrorBox message="Hisobotni ko‘rish vakolati berilmagan." />
      ) : remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        r && (
          <>
            <div className="stats">
              {(financial
                ? [
                    {
                      title: "Onlayn tushum",
                      value: formatMoney(r.gmv),
                      detail: "Tasdiqlangan onlayn to‘lovlar",
                      icon: CreditCard,
                    },
                    {
                      title: "Qaytarilgan pul",
                      value: formatMoney(r.refunds),
                      detail: "Yakunlangan onlayn qaytarishlar",
                      icon: Wallet,
                    },
                    {
                      title: "Sof onlayn tushum",
                      value: formatMoney(r.net_online_receipts),
                      detail: "Onlayn tushum − qaytarilgan pul",
                      icon: Coins,
                    },
                    {
                      title: "Joyida to‘lovlar",
                      value: formatMoney(r.verified_offline_receipts),
                      detail: "Tasdiqlangan naqd va terminal qaydlari",
                      icon: Wallet,
                    },
                  ]
                : [
                    {
                      title: "Bronlar",
                      value: r.bookings,
                      detail: "Yashash davri bo‘yicha",
                      icon: CreditCard,
                    },
                    {
                      title: "Xona-tunlar",
                      value: r.room_nights,
                      detail: "Tanlangan davrga to‘g‘ri keladi",
                      icon: Wallet,
                    },
                    {
                      title: "Mehmon-tunlar",
                      value: r.guest_nights,
                      detail: "Tanlangan davrga to‘g‘ri keladi",
                      icon: Coins,
                    },
                    {
                      title: "Bandlik",
                      value: `${(r.occupancy * 100).toFixed(1)}%`,
                      detail: "Ta’mir tunlari chiqarilgan",
                      icon: Wallet,
                    },
                  ]
              ).map((s) => (
                <div className="stat-card" key={s.title}>
                  <div className="stat-icon">
                    <s.icon size={17} />
                  </div>
                  <div className="stat-label">{s.title}</div>
                  <StatValue value={s.value} />
                  <div className="stat-detail">{s.detail}</div>
                </div>
              ))}
            </div>
            {financial && (
              <div className="two-cols">
                <Card title="Davr ichidagi to‘lovlar">
                  <div className="number-list">
                    {[
                      ["Naqd", r.offline_cash_receipts],
                      ["Terminal", r.offline_terminal_receipts],
                      [
                        "Tasdiqlanmagan joyida to‘lovlar",
                        r.unverified_offline_receipts,
                      ],
                      ["Bank tasdiqlagan o‘tkazmalar", r.paid_payouts],
                    ].map(([title, value]) => (
                      <div className="number-row" key={title}>
                        <span>{title}</span>
                        <strong>{formatMoney(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="muted report-note">
                    Joyida to‘lovlar qayd sanasi va joriy tasdiqlash holati
                    bo‘yicha. Tasdiqlanmagan va tuzatilgan eski qaydlar
                    tasdiqlangan jami summaga kirmaydi.
                  </p>
                </Card>
                <Card title="Davr oxiridagi qoldiqlar">
                  <div className="number-list">
                    {[
                      ["Sanatoriyaga qarzdorlik", r.sanatorium_payable],
                      ["Refund majburiyati", r.refund_payable],
                      ["Bankka yuborilayotgan", r.payout_in_transit],
                      ["Undiriladigan summa", r.receivable],
                    ].map(([title, value]) => (
                      <div className="number-row" key={title}>
                        <span>{title}</span>
                        <strong>{formatMoney(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="muted report-note">
                    Qoldiqlar tanlangan davr oxirigacha yig‘iladi. Ular shu
                    davrning tushumi bilan qo‘shilmaydi.
                  </p>
                </Card>
              </div>
            )}
            <Card title="Bronlar va bandlik">
              <p>
                {r.bookings} ta bron · {r.room_nights} xona-tun ·{" "}
                {r.guest_nights} mehmon-tun · {(r.occupancy * 100).toFixed(1)}%
                bandlik
              </p>
              <Table
                rows={Object.entries(r.booking_statuses).map(
                  ([status, count]) => ({ id: status, status, count }),
                )}
                columns={[
                  {
                    label: "Holat",
                    render: (row) => label[row.status] ?? row.status,
                  },
                  { label: "Soni", key: "count" },
                ]}
              />
            </Card>
            {compare && previous && (
              <Card title="Oldingi davr bilan solishtirish">
                <p className="muted">
                  {date(previous.from)} — {date(shiftDate(previous.to, -1))}
                </p>
                {comparison.loading ? (
                  <Loading />
                ) : comparison.error ? (
                  <ErrorBox
                    message={comparison.error}
                    retry={comparison.reload}
                  />
                ) : (
                  comparison.data && (
                    <Table
                      rows={[
                        {
                          id: "bookings",
                          title: "Bronlar",
                          current: String(r.bookings),
                          previous: String(comparison.data.bookings),
                        },
                        {
                          id: "room_nights",
                          title: "Xona-tunlar",
                          current: String(r.room_nights),
                          previous: String(comparison.data.room_nights),
                        },
                        ...(financial
                          ? [
                              "gmv",
                              "refunds",
                              "net_online_receipts",
                              "verified_offline_receipts",
                            ].map((key, n) => ({
                              id: key,
                              title: [
                                "Onlayn tushum",
                                "Qaytarilgan pul",
                                "Sof onlayn tushum",
                                "Joyida to‘lovlar",
                              ][n],
                              current: formatMoney(r[key]),
                              previous: formatMoney(comparison.data[key]),
                            }))
                          : []),
                      ]}
                      columns={[
                        { label: "Ko‘rsatkich", key: "title" },
                        { label: "Tanlangan davr", key: "current" },
                        { label: "Oldingi davr", key: "previous" },
                      ]}
                    />
                  )
                )}
              </Card>
            )}
            <div className="report-downloads report-controls">
              {ctx.allowed("reports.export") && period && (
                <XlsxDownload
                  href={
                    "/api/partner/reports/export.xlsx" +
                    query({
                      sanatorium_id: ctx.tenant,
                      ...period,
                      financial: String(financial),
                      booking_basis: "SERVICE",
                    })
                  }
                />
              )}
              {ctx.allowed("reports.export") && period && (
                <a
                  className="button primary"
                  href={
                    "/api/partner/reports/export" +
                    query({
                      sanatorium_id: ctx.tenant,
                      ...period,
                      financial: String(financial),
                      booking_basis: "SERVICE",
                    })
                  }
                >
                  <Download size={17} />
                  CSV yuklash (Excel)
                </a>
              )}
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                <Printer size={17} />
                Chop etish / PDF
              </button>
            </div>
            <p className="muted report-note">
              Hisobot yaratilgan: {dateTime(r.generated_at)}. Onlayn to‘lov,
              qaytarish va o‘tkazmalar yakunlangan sanasi bo‘yicha; bronlar
              yashash davri bo‘yicha hisoblanadi.
            </p>
          </>
        )
      )}
    </div>
  );
}
