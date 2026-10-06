"use client";
import { useState } from "react";
import { api, formatMoney, query, toMinor } from "@sihhat/api-client";
import {
  Act,
  AddButton,
  Badge,
  Card,
  DataPanel,
  Empty,
  ErrorBox,
  Loading,
  PageHeading,
  Table,
  date,
  label,
  list,
  localDate,
  moneyColumn,
  options,
  statusColumn,
  useAction,
  usePortal,
  useRemote,
  type Field,
  type Row,
} from "./components";
const ages = (v: any) => {
  const result = (
    Array.isArray(v)
      ? v
      : String(v ?? "")
          .split(",")
          .filter(Boolean)
  ).map(Number);
  if (result.some((n) => !Number.isInteger(n) || n < 0 || n > 17))
    throw new Error("Bolalar yoshi 0–17 orasida butun son bo‘lsin.");
  return result;
};
export function Inventory() {
  const ctx = usePortal(),
    action = useAction(),
    [tab, setTab] = useState("calendar"),
    [start, setStart] = useState(localDate()),
    remote = useRemote(
      ctx.tenant ? `/partner/sanatoriums/${ctx.tenant}/inventory` : null,
      ctx.epoch,
    );
  const data = remote.data;
  const types = data?.types ?? [],
    rooms = data?.rooms ?? [],
    rates = data?.rates ?? [],
    policies = data?.policies ?? [];
  const day = (n: number) =>
    new Date(Date.parse(start) + n * 86400000).toISOString().slice(0, 10);
  function create(kind: string) {
    if (kind === "types")
      action(
        "Xona turi qo‘shish",
        "/partner/room-types",
        { sanatorium_id: ctx.tenant },
        [
          { key: "name", label: "Xona turi nomi", required: true },
          {
            key: "max_guests",
            label: "Jami mehmon sig‘imi",
            type: "number",
            required: true,
            min: 1,
            max: 20,
          },
          {
            key: "max_adults",
            label: "Kattalar sig‘imi",
            type: "number",
            required: true,
            min: 1,
            max: 20,
          },
          {
            key: "max_children",
            label: "Bolalar sig‘imi",
            type: "number",
            required: true,
            min: 0,
            max: 10,
          },
        ],
      );
    if (kind === "rooms")
      action(
        "Fizik xona qo‘shish",
        "/partner/rooms",
        { sanatorium_id: ctx.tenant },
        [
          {
            key: "room_type_id",
            label: "Xona turi",
            type: "select",
            required: true,
            options: options(types),
          },
          { key: "code", label: "Xona raqami", required: true },
        ],
      );
    if (kind === "rates")
      ctx.form({
        title: "Tarif qo‘shish",
        description:
          "Xona uchun narx butun xonani qamraydi. Kishi uchun tarifda har bir bola yoshiga alohida qoida kerak.",
        fields: [
          {
            key: "room_type_id",
            label: "Xona turi",
            type: "select",
            required: true,
            options: options(types),
          },
          { key: "name", label: "Tarif nomi", required: true },
          {
            key: "mode",
            label: "Hisob usuli",
            type: "select",
            required: true,
            options: [
              { value: "ROOM", label: "Butun xona uchun" },
              { value: "PERSON", label: "Kishi uchun" },
            ],
          },
          {
            key: "base_amount",
            label: "Bir tun narxi (so‘m)",
            type: "money",
            required: true,
          },
          {
            key: "policy_id",
            label: "Qaytarish sharti",
            type: "select",
            required: true,
            options: options(policies),
          },
          {
            key: "min_nights",
            label: "Eng kam tun",
            type: "number",
            value: 1,
            required: true,
            min: 1,
            max: 90,
          },
          {
            key: "max_nights",
            label: "Eng ko‘p tun",
            type: "number",
            value: 90,
            required: true,
            min: 1,
            max: 90,
          },
          {
            key: "child_prices",
            label: "Bolalar narxi (so‘m)",
            type: "child-prices",
          },
          {
            key: "included",
            label: "Paketga kiradi",
            type: "string-list",
          },
        ],
        submit: (v) => {
          const child_rules = v.child_prices ?? [];
          const { child_prices, included, ...rest } = v;
          return api("/partner/rate-plans", "POST", {
            sanatorium_id: ctx.tenant,
            ...rest,
            child_rules,
            package_details: { included: included ?? [] },
          });
        },
        done: ctx.refresh,
      });
    if (kind === "blocks")
      action(
        "Xonani ta’mirga yopish",
        "/partner/inventory-blocks",
        { sanatorium_id: ctx.tenant },
        [
          {
            key: "room_id",
            label: "Xona",
            type: "select",
            required: true,
            options: options(rooms, "code"),
          },
          {
            key: "check_in",
            label: "Boshlanish sanasi",
            type: "date",
            required: true,
            value: start,
          },
          {
            key: "check_out",
            label: "Tugash sanasi",
            type: "date",
            required: true,
            value: day(1),
          },
          {
            key: "reason",
            label: "Sabab",
            type: "textarea",
            required: true,
            minLength: 3,
          },
        ],
      );
    if (kind === "discounts")
      ctx.form({
        title: "Chegirma yaratish",
        fields: [
          { key: "name", label: "Chegirma nomi", required: true },
          {
            key: "kind",
            label: "Turi",
            type: "select",
            required: true,
            options: [
              { value: "PERCENT", label: "Foiz" },
              { value: "FIXED", label: "Aniq summa" },
            ],
          },
          {
            key: "value",
            label: "Foiz yoki so‘m",
            required: true,
            hint: "Foiz uchun 1–100. Summani so‘mda kiriting.",
          },
          {
            key: "min_amount",
            label: "Eng kam bron narxi (so‘m)",
            type: "money",
            value: "0",
          },
          {
            key: "max_amount",
            label: "Chegirma chegarasi (so‘m)",
            type: "money",
          },
          {
            key: "starts_at",
            label: "Boshlanish",
            type: "datetime-local",
            required: true,
          },
          {
            key: "ends_at",
            label: "Tugash",
            type: "datetime-local",
            required: true,
          },
        ],
        submit: (v) =>
          api("/partner/discounts", "POST", {
            sanatorium_id: ctx.tenant,
            ...v,
            value: v.kind === "FIXED" ? toMinor(v.value) : String(v.value),
          }),
        done: ctx.refresh,
      });
  }
  return (
    <>
      <PageHeading
        title="Xonalar va tariflar"
        subtitle="Har bir bron butun davr uchun bir xil fizik xonaga biriktiriladi."
      >
        {ctx.allowed(
          tab === "rates"
            ? "pricing.manage"
            : tab === "discounts"
              ? "discounts.manage"
              : "inventory.manage",
        ) && (
          <AddButton
            onClick={() => create(tab === "calendar" ? "blocks" : tab)}
          >
            {tab === "calendar" ? "Ta’mir bloki" : "Qo‘shish"}
          </AddButton>
        )}
      </PageHeading>
      <div className="tabs">
        {[
          ["calendar", "Bandlik kalendari"],
          ["types", "Xona turlari"],
          ["rooms", "Xonalar"],
          ["rates", "Tariflar"],
          ["discounts", "Chegirmalar"],
        ].map(([key, name]) => (
          <button
            key={key}
            className={`tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {name}
          </button>
        ))}
      </div>
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        data && (
          <>
            {tab === "calendar" && (
              <>
                <div className="filters">
                  <label className="field">
                    <span>Kalendar boshi</span>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value || localDate())}
                    />
                  </label>
                </div>
                <Card title="14 kunlik xona bandligi">
                  <div className="calendar">
                    <div className="calendar-row">
                      <div className="calendar-cell header">Xona</div>
                      {Array.from({ length: 14 }, (_, n) => (
                        <div className="calendar-cell header" key={n}>
                          {day(n).slice(8)}.{day(n).slice(5, 7)}
                        </div>
                      ))}
                    </div>
                    {rooms.map((r: Row) => (
                      <div className="calendar-row" key={r.id}>
                        <div className="calendar-cell header">{r.code}</div>
                        {Array.from({ length: 14 }, (_, n) => {
                          const a = data.allocations.find(
                            (a: Row) =>
                              a.roomId === r.id &&
                              a.checkIn.slice(0, 10) <= day(n) &&
                              a.checkOut.slice(0, 10) > day(n),
                          );
                          return (
                            <div
                              key={n}
                              className={`calendar-cell ${a ? (a.kind === "MAINTENANCE" ? "maintenance" : a.kind === "HOLD" ? "held" : "booked") : ""}`}
                              title={
                                a?.kind === "MAINTENANCE"
                                  ? a.reason
                                  : a
                                    ? "Band"
                                    : "Bo‘sh"
                              }
                            >
                              {a
                                ? a.kind === "MAINTENANCE"
                                  ? "T"
                                  : a.kind === "HOLD"
                                    ? "K"
                                    : "B"
                                : "·"}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="card-body">
                    <span className="badge green">B — band</span>{" "}
                    <span className="badge amber">K — to‘lov kutilmoqda</span>{" "}
                    <span className="badge gray">T — ta’mir</span>
                  </div>
                </Card>
                <Card title="Faol ta’mir bloklari">
                  <Table
                    rows={data.allocations.filter(
                      (a: Row) => a.kind === "MAINTENANCE",
                    )}
                    columns={[
                      {
                        label: "Xona",
                        render: (r) =>
                          rooms.find((x: Row) => x.id === r.roomId)?.code,
                      },
                      {
                        label: "Davr",
                        render: (r) =>
                          `${date(r.checkIn)} — ${date(r.checkOut)}`,
                      },
                      { label: "Sabab", key: "reason" },
                    ]}
                    actions={
                      ctx.allowed("inventory.manage")
                        ? (r) => (
                            <Act
                              onClick={() =>
                                action(
                                  "Ta’mir blokini ochish",
                                  `/partner/inventory-blocks/${r.id}/release`,
                                  {},
                                  [
                                    {
                                      key: "reason",
                                      label: "Sabab",
                                      required: true,
                                      minLength: 3,
                                    },
                                  ],
                                )
                              }
                            >
                              Blokni ochish
                            </Act>
                          )
                        : undefined
                    }
                  />
                </Card>
              </>
            )}
            {tab === "types" && (
              <Card>
                <Table
                  rows={types}
                  columns={[
                    { label: "Xona turi", key: "name" },
                    { label: "Jami sig‘im", key: "maxGuests" },
                    { label: "Kattalar", key: "maxAdults" },
                    { label: "Bolalar", key: "maxChildren" },
                  ]}
                />
              </Card>
            )}
            {tab === "rooms" && (
              <Card>
                <Table
                  rows={rooms}
                  columns={[
                    { label: "Xona raqami", key: "code" },
                    {
                      label: "Xona turi",
                      render: (r) =>
                        types.find((t: Row) => t.id === r.roomTypeId)?.name,
                    },
                    {
                      label: "Holat",
                      render: (r) => (
                        <Badge value={r.active ? "ACTIVE" : "PAUSED"} />
                      ),
                    },
                  ]}
                />
              </Card>
            )}
            {tab === "rates" && (
              <>
                <Card title="Asosiy tariflar">
                  <Table
                    rows={rates}
                    columns={[
                      {
                        label: "Tarif",
                        render: (r) => (
                          <>
                            <strong>{r.name}</strong>
                            <span className="subcell">
                              {
                                types.find((t: Row) => t.id === r.roomTypeId)
                                  ?.name
                              }
                            </span>
                          </>
                        ),
                      },
                      { label: "Hisob", render: (r) => label[r.mode] },
                      {
                        label: "Bir tun",
                        render: (r) => formatMoney(r.baseAmount),
                      },
                      {
                        label: "Qaytarish",
                        render: (r) =>
                          policies.find((p: Row) => p.id === r.policyId)?.name,
                      },
                      {
                        label: "Holat",
                        render: (r) => (
                          <Badge value={r.active ? "ACTIVE" : "PAUSED"} />
                        ),
                      },
                    ]}
                    actions={
                      ctx.allowed("pricing.manage")
                        ? (r) => (
                            <>
                              <Act
                                onClick={() =>
                                  action(
                                    "Tarifni yangilash",
                                    `/partner/rate-plans/${r.id}`,
                                    { version: r.version },
                                    [
                                      {
                                        key: "base_amount",
                                        label: "Yangi narx (so‘m)",
                                        type: "money",
                                        required: true,
                                        value: (
                                          BigInt(r.baseAmount) / 100n
                                        ).toString(),
                                      },
                                      {
                                        key: "active",
                                        label: "Tarif faol",
                                        type: "checkbox",
                                        value: r.active,
                                      },
                                    ],
                                    "PATCH",
                                  )
                                }
                              >
                                Tahrirlash
                              </Act>
                              <Act
                                onClick={() =>
                                  ctx.form({
                                    title: "Kunlik narx va sotuv",
                                    fields: [
                                      {
                                        key: "date",
                                        label: "Sana",
                                        type: "date",
                                        required: true,
                                        min: localDate(),
                                      },
                                      {
                                        key: "amount",
                                        label: "Kunlik narx (so‘m)",
                                        type: "money",
                                        required: true,
                                      },
                                      {
                                        key: "closed",
                                        label: "Bu kun sotuvga yopiq",
                                        type: "checkbox",
                                      },
                                    ],
                                    submit: (v) =>
                                      api("/partner/daily-rates", "POST", {
                                        sanatorium_id: ctx.tenant,
                                        rate_plan_id: r.id,
                                        dates: [v],
                                      }),
                                    done: ctx.refresh,
                                  })
                                }
                              >
                                Kunlik narx
                              </Act>
                            </>
                          )
                        : undefined
                    }
                  />
                </Card>
                <Card title="Kunlik o‘zgarishlar">
                  <Table
                    rows={data.daily_rates}
                    columns={[
                      { label: "Sana", render: (r) => date(r.date) },
                      {
                        label: "Tarif",
                        render: (r) =>
                          rates.find((t: Row) => t.id === r.ratePlanId)?.name,
                      },
                      moneyColumn,
                      {
                        label: "Sotuv",
                        render: (r) => (r.closed ? "Yopiq" : "Ochiq"),
                      },
                    ]}
                  />
                </Card>
              </>
            )}
            {tab === "discounts" && (
              <Card>
                <Table
                  rows={data.discounts}
                  columns={[
                    { label: "Chegirma", key: "name" },
                    {
                      label: "Miqdor",
                      render: (r) =>
                        r.kind === "PERCENT"
                          ? `${r.value}%`
                          : formatMoney(r.value),
                    },
                    {
                      label: "Davr",
                      render: (r) => `${date(r.startsAt)} — ${date(r.endsAt)}`,
                    },
                    {
                      label: "Chegara",
                      render: (r) =>
                        r.maxAmount
                          ? formatMoney(r.maxAmount)
                          : "Belgilanmagan",
                    },
                  ]}
                />
              </Card>
            )}
          </>
        )
      )}
    </>
  );
}
export function Bookings() {
  const ctx = usePortal(),
    action = useAction(),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    inventory = useRemote(
      ctx.tenant ? `/partner/sanatoriums/${ctx.tenant}/inventory` : null,
      ctx.epoch,
    ),
    detail = useRemote(
      selected ? `/partner/bookings/${selected}` : null,
      ctx.epoch,
    );
  const b = detail.data,
    data = inventory.data;
  const activeRates = (data?.rates ?? []).filter((r: Row) => r.active);
  function manual() {
    if (inventory.loading || inventory.error || !activeRates.length) return;
    let count = 1;
    ctx.form({
      title: "Qo‘lda bron — xonalar soni",
      fields: [
        {
          key: "count",
          label: "Xonalar soni",
          type: "number",
          required: true,
          value: 1,
          min: 1,
          max: 10,
        },
      ],
      submit: async (v) => {
        count = v.count;
      },
      done: () => {
        let preview: any, payload: any;
        ctx.form({
          title: "Mehmon va xonalar",
          description:
            "Har bir xona uchun tarif, kattalar soni va bolalar yoshini kiriting.",
          fields: [
            { key: "name", label: "Mehmon ism-familiyasi", required: true },
            {
              key: "phone",
              label: "Mehmon telefoni",
              required: true,
              pattern: "\\+998[0-9]{9}",
            },
            {
              key: "check_in",
              label: "Kelish sanasi",
              type: "date",
              required: true,
              value: localDate(1),
              min: localDate(),
            },
            {
              key: "check_out",
              label: "Ketish sanasi",
              type: "date",
              required: true,
              value: localDate(3),
              min: localDate(1),
            },
            {
              key: "source",
              label: "Bron manbasi",
              type: "select",
              value: "PHONE",
              required: true,
              options: ["PHONE", "WALK_IN", "PARTNER_MANUAL"].map((value) => ({
                value,
                label: label[value],
              })),
            },
            ...Array.from({ length: count }, (_, n): Field[] => [
              {
                key: `rate_${n}`,
                label: `${n + 1}-xona tarifi`,
                type: "select",
                required: true,
                options: activeRates.map((r: Row) => ({
                  value: r.id,
                  label: `${data?.types.find((t: Row) => t.id === r.roomTypeId)?.name} · ${r.name} · ${formatMoney(r.baseAmount)}`,
                })),
              },
              {
                key: `adults_${n}`,
                label: `${n + 1}-xona kattalari`,
                type: "number",
                value: 1,
                min: 1,
                max: 20,
                required: true,
              },
              {
                key: `children_${n}`,
                label: `${n + 1}-xona bolalar yoshi`,
                type: "ages",
              },
            ]).flat(),
          ],
          submit: async (v) => {
            const items = Array.from({ length: count }, (_, n) => {
              const r = activeRates.find((r: Row) => r.id === v[`rate_${n}`]);
              if (!r)
                throw new Error(
                  "Tanlangan tarif mavjud emas. Xona tarifini qayta tanlang.",
                );
              return {
                room_type_id: r.roomTypeId,
                rate_plan_id: r.id,
                adults: v[`adults_${n}`],
                children_ages: ages(v[`children_${n}`]),
              };
            });
            payload = {
              quote: {
                sanatorium_id: ctx.tenant,
                check_in: v.check_in,
                check_out: v.check_out,
                items,
              },
              guest: { name: v.name, phone: v.phone },
              source: v.source,
            };
            preview = await api("/partner/quotes", "POST", payload.quote);
          },
          button: "Narxni hisoblash",
          done: () =>
            ctx.form({
              title: `Bron jami: ${formatMoney(preview.amount)}`,
              description: `${preview.data.nights} tun · ${count} xona. ${preview.data.policies.map((p: Row) => p.name).join("; ")}`,
              fields: [
                {
                  key: "accepted",
                  label: "Qaytarish shartlari",
                  type: "checkbox",
                  required: true,
                  hint: "Mehmon qaytarish shartlarini qabul qildi.",
                },
                {
                  key: "guaranteed",
                  label: "Bron kafolati",
                  type: "checkbox",
                  required: true,
                  hint: "Joyida to‘lov va bron kafolatini tasdiqlayman.",
                },
              ],
              submit: () =>
                api("/partner/bookings/manual", "POST", {
                  ...payload,
                  guaranteed: true,
                  quoted_amount: preview.amount,
                  accepted_policy_versions: preview.data.policies.map(
                    (p: Row) => p.id,
                  ),
                }),
              button: "Bronni yaratish",
              done: ctx.refresh,
            }),
        });
      },
    });
  }
  function offline() {
    action(
      "Joyida to‘lovni qayd etish",
      "/partner/offline-payments",
      { booking_id: b.id },
      [
        {
          key: "amount",
          label: "To‘langan summa (so‘m)",
          type: "money",
          required: true,
        },
        {
          key: "method",
          label: "To‘lov usuli",
          type: "select",
          required: true,
          options: [
            { value: "CASH", label: "Naqd" },
            { value: "TERMINAL", label: "Terminal" },
          ],
        },
        {
          key: "evidence",
          label: "Dalil / chek raqami",
          required: true,
          minLength: 3,
        },
      ],
    );
  }
  if (selected)
    return (
      <>
        <button className="button secondary" onClick={() => setSelected(null)}>
          ← Bronlarga qaytish
        </button>
        <PageHeading
          title={b?.reference ?? "Bron tafsiloti"}
          subtitle={b ? `${date(b.checkIn)} — ${date(b.checkOut)}` : undefined}
        />
        {detail.loading ? (
          <Loading />
        ) : detail.error ? (
          <ErrorBox message={detail.error} retry={detail.reload} />
        ) : (
          b && (
            <>
              <div className="toolbar" style={{ marginBottom: 20 }}>
                <Badge value={b.status} />
                {b.status === "CONFIRMED" &&
                  ctx.allowed("bookings.check_in") && (
                    <button
                      className="button primary"
                      onClick={() =>
                        action(
                          "Mehmonni joylashtirish",
                          `/partner/bookings/${b.id}/check-in`,
                          { version: b.version },
                        )
                      }
                    >
                      Joylashtirish
                    </button>
                  )}
                {b.status === "CHECKED_IN" &&
                  ctx.allowed("bookings.check_out") && (
                    <button
                      className="button primary"
                      onClick={() =>
                        action(
                          "Mehmon ketishini qayd etish",
                          `/partner/bookings/${b.id}/check-out`,
                          { version: b.version },
                        )
                      }
                    >
                      Ketishni qayd etish
                    </button>
                  )}
                {b.status === "CONFIRMED" &&
                  ctx.allowed("bookings.check_out") && (
                    <Act
                      danger
                      onClick={() =>
                        action(
                          "Mehmon kelmadi",
                          `/partner/bookings/${b.id}/no-show`,
                          { version: b.version },
                          [
                            {
                              key: "reason",
                              label: "Sabab",
                              required: true,
                              minLength: 3,
                            },
                          ],
                        )
                      }
                    >
                      Kelmagan
                    </Act>
                  )}
                {b.source !== "APP" &&
                  ctx.allowed("offline_payments.record") &&
                  ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(
                    b.status,
                  ) && (
                    <button className="button secondary" onClick={offline}>
                      Joyida to‘lov
                    </button>
                  )}
                {b.payment?.status === "SUCCEEDED" &&
                  !b.refund &&
                  ctx.allowed("refunds.request") && (
                    <Act
                      onClick={() =>
                        action(
                          "To‘liq refund so‘rash",
                          `/partner/bookings/${b.id}/refund-request`,
                          {},
                          [
                            {
                              key: "reason",
                              label: "Qaytarish sababi",
                              type: "textarea",
                              required: true,
                              minLength: 3,
                            },
                          ],
                        )
                      }
                    >
                      Refund so‘rash
                    </Act>
                  )}
              </div>
              <Card title="Bron ma’lumotlari">
                <div className="card-body detail-grid">
                  <dl>
                    <dt>Mehmon</dt>
                    <dd>
                      {b.guest.name}
                      <br />
                      {b.guest.phone}
                    </dd>
                    <dt>Manba</dt>
                    <dd>{label[b.source]}</dd>
                  </dl>
                  <dl>
                    <dt>Jami narx</dt>
                    <dd>{formatMoney(b.amount)}</dd>
                    <dt>Onlayn to‘lov</dt>
                    <dd>
                      {b.payment ? (
                        <Badge value={b.payment.status} />
                      ) : (
                        "Onlayn to‘lov yo‘q"
                      )}
                    </dd>
                    <dt>Qaytarish</dt>
                    <dd>
                      {b.refund ? (
                        <Badge value={b.refund.status} />
                      ) : (
                        "So‘ralmagan"
                      )}
                    </dd>
                  </dl>
                </div>
              </Card>
              <Card title="Ajratilgan xonalar">
                <Table
                  rows={b.items}
                  columns={[
                    {
                      label: "Xona",
                      render: (r) =>
                        data?.rooms.find((x: Row) => x.id === r.roomId)?.code ??
                        "—",
                    },
                    { label: "Kattalar", key: "adults" },
                    {
                      label: "Bolalar yoshi",
                      render: (r) => r.childrenAges.join(", ") || "—",
                    },
                    moneyColumn,
                  ]}
                  actions={
                    ctx.allowed("inventory.manage") &&
                    ["CONFIRMED", "CHECKED_IN"].includes(b.status)
                      ? (r) => (
                          <Act
                            onClick={() =>
                              action(
                                "Boshqa xonaga ko‘chirish",
                                `/partner/bookings/${b.id}/move-room`,
                                { version: b.version, item_id: r.id },
                                [
                                  {
                                    key: "room_id",
                                    label: "Yangi xona",
                                    type: "select",
                                    required: true,
                                    options: options(
                                      (data?.rooms ?? []).filter(
                                        (x: Row) =>
                                          x.roomTypeId === r.roomTypeId &&
                                          x.id !== r.roomId,
                                      ),
                                      "code",
                                    ),
                                  },
                                  {
                                    key: "reason",
                                    label: "Sabab",
                                    required: true,
                                    minLength: 3,
                                  },
                                ],
                              )
                            }
                          >
                            Ko‘chirish
                          </Act>
                        )
                      : undefined
                  }
                />
              </Card>
              <Card title="Joyida to‘lovlar">
                <Table
                  rows={b.offline_payments}
                  columns={[
                    moneyColumn,
                    { label: "Usul", render: (r) => label[r.method] },
                    statusColumn,
                    { label: "Dalil", key: "evidence" },
                  ]}
                  actions={
                    ctx.allowed("offline_payments.verify")
                      ? (r) =>
                          r.status === "UNVERIFIED" &&
                          r.recordedBy !== ctx.actor.id && (
                            <Act
                              onClick={() =>
                                action(
                                  "Joyida to‘lovni tekshirish",
                                  `/partner/offline-payments/${r.id}/verify`,
                                )
                              }
                            >
                              Tekshirish
                            </Act>
                          )
                      : undefined
                  }
                />
              </Card>
              <Card title="Bron tarixi">
                <Table
                  rows={b.events}
                  columns={[
                    { label: "Vaqt", render: (r) => date(r.createdAt) },
                    statusColumn,
                    { label: "Izoh", key: "reason" },
                  ]}
                />
              </Card>
            </>
          )
        )}
      </>
    );
  return (
    <>
      <PageHeading
        title="Bronlar"
        subtitle="Ilova, telefon va joyida yaratilgan bronlar umumiy inventarda yuritiladi."
      >
        {ctx.allowed("bookings.create_manual") &&
          ctx.allowed("bookings.guarantee") && (
            <AddButton
              onClick={manual}
              disabled={
                inventory.loading || !!inventory.error || !activeRates.length
              }
            >
              Qo‘lda bron
            </AddButton>
          )}
      </PageHeading>
      {ctx.allowed("bookings.create_manual") &&
        (inventory.error ? (
          <ErrorBox message={inventory.error} retry={inventory.reload} />
        ) : !inventory.loading && data && !activeRates.length ? (
          <p className="muted" role="status">
            Qo‘lda bron yaratish uchun «Xonalar va tariflar» bo‘limida faol
            tarif qo‘shing.
          </p>
        ) : null)}
      <div className="filters">
        <label className="field">
          <span>Holat</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Barchasi</option>
            {[
              "HOLD",
              "PAYMENT_PENDING",
              "CONFIRMED",
              "CHECKED_IN",
              "CHECKED_OUT",
              "CANCELLED",
              "NO_SHOW",
              "EXPIRED",
            ].map((s) => (
              <option key={s} value={s}>
                {label[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DataPanel
        path={ctx.admin ? "/superadmin/bookings" : "/partner/bookings"}
        params={{ sanatorium_id: ctx.tenant, status: status || undefined }}
        columns={[
          {
            label: "Bron",
            render: (r) => (
              <>
                <strong>{r.reference}</strong>
                <span className="subcell">{label[r.source]}</span>
              </>
            ),
          },
          {
            label: "Mehmon",
            render: (r) => (
              <>
                {r.guest.name}
                <span className="subcell">{r.guest.phone}</span>
              </>
            ),
          },
          {
            label: "Yashash",
            render: (r) => `${date(r.checkIn)} — ${date(r.checkOut)}`,
          },
          moneyColumn,
          statusColumn,
        ]}
        actions={(r) => <Act onClick={() => setSelected(r.id)}>Ochish</Act>}
      />
    </>
  );
}
export function Payments() {
  const ctx = usePortal();
  const tez = useRemote(ctx.admin ? "/superadmin/integrations/tezcheck" : null);
  return (
    <>
      <PageHeading
        title="Onlayn to‘lovlar"
        subtitle="Holat to‘lov provayderi tasdig‘i bilan belgilanadi."
      />
      {ctx.admin && (
        <Card title="Tezcheck ulanishi">
          {tez.loading ? (
            <Loading />
          ) : tez.error ? (
            <ErrorBox message={tez.error} retry={tez.reload} />
          ) : !tez.data?.configured ? (
            <p>Tezcheck ulanishi hali sozlanmagan.</p>
          ) : (
            <>
              <p>
                {tez.data.authenticated
                  ? "API bilan ulanish ishlayapti."
                  : "API bilan ulanishni tekshirish kerak."}
              </p>
              <p>
                {tez.data.accepts_payments
                  ? "Kassa to‘lov qabul qilishga tayyor."
                  : "Kassa hali to‘lov qabul qilmayapti. Tezcheck kabinetida kassani faollashtirish kerak."}
              </p>
              <p>
                Holat: <strong>{tez.data.state ?? "Tekshirilmoqda"}</strong> ·
                Valyuta: {tez.data.currency ?? "UZS"}
              </p>
              <p>
                Usullar:{" "}
                {(tez.data.methods ?? []).map((m: Row) => m.name).join(", ") ||
                  "Hozircha mavjud emas"}
              </p>
              <Act onClick={() => tez.reload()}>Ulanishni yangilash</Act>
            </>
          )}
        </Card>
      )}
      <DataPanel
        path={ctx.admin ? "/superadmin/payments" : "/partner/payments"}
        params={{ sanatorium_id: ctx.tenant }}
        columns={[
          {
            label: "Maqsad",
            render: (r) => label[r.purpose] ?? "Bron to‘lovi",
          },
          moneyColumn,
          statusColumn,
          { label: "Yaratilgan", render: (r) => date(r.createdAt) },
          { label: "To‘langan", render: (r) => date(r.paidAt) },
        ]}
      />
    </>
  );
}
