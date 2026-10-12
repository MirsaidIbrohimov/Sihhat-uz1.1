"use client";
import { useEffect, useState } from "react";
import { formatMoney, query } from "@sihhat/api-client";
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
    [day, setDay] = useState(localDate());
  const remote = useRemote(
    ctx.tenant
      ? "/partner/bookings/daily" +
          query({ sanatorium_id: ctx.tenant, date: day })
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
