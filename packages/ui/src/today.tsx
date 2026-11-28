"use client";
import { useEffect, useState } from "react";
import { api, formatMoney, query } from "@sihhat/api-client";
import {
  Act,
  Badge,
  Card,
  date,
  Empty,
  ErrorBox,
  localDate,
  Loading,
  PageHeading,
  Table,
  useAction,
  usePortal,
  useRemote,
  type Row,
} from "./components";

export function TodayWork() {
  const ctx = usePortal(),
    action = useAction(),
    [day, setDay] = useState(localDate()),
    [brDigits, setBrDigits] = useState(""),
    [brBusy, setBrBusy] = useState(false);
  async function findByBr(event: React.FormEvent) {
    event.preventDefault();
    const digits = brDigits.replace(/\D/g, "").slice(0, 5);
    if (!digits) return;
    const code = `BR-${digits}`;
    setBrBusy(true);
    try {
      const res = await api(
        (ctx.admin ? "/superadmin/bookings" : "/partner/bookings") +
          query({
            sanatorium_id: ctx.tenant || undefined,
            q: code,
            limit: 5,
          }),
      );
      const rows: Row[] = Array.isArray(res?.data) ? res.data : [];
      const matched =
        rows.find((r) => String(r.reference ?? "").toUpperCase() === code) ??
        (rows.length === 1 ? rows[0] : null);
      if (matched?.id) {
        setBrDigits("");
        ctx.go("bookings", { booking: matched.id });
      } else {
        ctx.notice(`${code} raqamli bron topilmadi.`);
      }
    } catch (err) {
      ctx.notice((err as Error).message);
    } finally {
      setBrBusy(false);
    }
  }
  const remote = useRemote(
    ctx.admin || ctx.tenant
      ? "/partner/bookings/daily" +
          query({ sanatorium_id: ctx.tenant || undefined, date: day })
      : null,
    ctx.epoch,
  );
  useEffect(() => {
    const timer = setInterval(remote.reload, 20000);
    return () => clearInterval(timer);
  }, [ctx.tenant, day]);
  const groups = [
    { id: "arrivals", title: "Keladigan mehmonlar" },
    { id: "departures", title: "Ketadigan mehmonlar" },
    { id: "unpaid", title: "To‘lovi yakunlanmagan bronlar" },
  ];
  return (
    <>
      <PageHeading
        title="Bugungi ishlar"
        subtitle="Kelish, ketish va to‘lov holati serverdan tekshiriladi."
      >
        <button className="button secondary" onClick={remote.reload}>
          Yangilash
        </button>
      </PageHeading>
      <div className="filters">
        <label className="field">
          <span>Ish kuni</span>
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
        <button
          className="button secondary"
          onClick={() => setDay(localDate())}
        >
          Bugun
        </button>
        <form
          onSubmit={findByBr}
          style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}
        >
          <label className="field">
            <span>Bron tezkor qidiruv</span>
            <div className="prefixed-search-input">
              <span className="prefixed-search-badge" aria-hidden="true">
                BR-
              </span>
              <input
                aria-label="Bron ID tezkor qidirish"
                inputMode="numeric"
                value={brDigits}
                onChange={(e) =>
                  setBrDigits(
                    e.target.value
                      .replace(/^\s*#?\s*br\s*-\s*/i, "")
                      .replace(/\D/g, "")
                      .slice(0, 5),
                  )
                }
                placeholder="5 xonali raqam"
                maxLength={10}
                autoComplete="off"
              />
            </div>
          </label>
          <button type="submit" className="button primary" disabled={brBusy}>
            Topish
          </button>
        </form>
      </div>
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        remote.data &&
        groups.map((group) => (
          <Card
            title={`${group.title} · ${remote.data.counts[group.id]}`}
            key={group.id}
          >
            {remote.data.counts[group.id] > remote.data.limit && (
              <p className="muted">
                Eng yangi {remote.data.limit} ta bron ko‘rsatildi. Qolgan
                bronlarni Bronlar bo‘limidagi filtrlar bilan toping.
              </p>
            )}
            {!remote.data[group.id].length ? (
              <Empty />
            ) : (
              <Table
                rows={remote.data[group.id]}
                columns={[
                  { label: "Bron", key: "reference" },
                  {
                    label: "Mehmon",
                    render: (row) => (
                      <>
                        {row.guest.name}
                        <span className="subcell">{row.guest.phone}</span>
                      </>
                    ),
                  },
                  {
                    label: "Yashash",
                    render: (row) =>
                      `${date(row.checkIn)} — ${date(row.checkOut)}`,
                  },
                  {
                    label: "Holat",
                    render: (row) => <Badge value={row.status} />,
                  },
                  ...(group.id === "unpaid"
                    ? [
                        {
                          label: "To‘lanmagan qoldiq",
                          render: (row: Row) =>
                            formatMoney(row.remaining_amount),
                        },
                      ]
                    : []),
                ]}
                actions={(row) => (
                  <>
                    <Act
                      onClick={() => ctx.go("bookings", { booking: row.id })}
                    >
                      Bronni ochish
                    </Act>
                    {group.id === "arrivals" &&
                      row.status === "CONFIRMED" &&
                      ctx.allowed("bookings.check_in") && (
                        <Act
                          onClick={() =>
                            action(
                              "Mehmon kelishini qayd etish",
                              `/partner/bookings/${row.id}/check-in`,
                              { version: row.version },
                            )
                          }
                        >
                          Kelishni tasdiqlash
                        </Act>
                      )}
                    {group.id === "departures" &&
                      row.status === "CHECKED_IN" &&
                      ctx.allowed("bookings.check_out") && (
                        <Act
                          onClick={() =>
                            action(
                              "Mehmon ketishini qayd etish",
                              `/partner/bookings/${row.id}/check-out`,
                              { version: row.version },
                            )
                          }
                        >
                          Ketishni tasdiqlash
                        </Act>
                      )}
                  </>
                )}
              />
            )}
          </Card>
        ))
      )}
    </>
  );
}
