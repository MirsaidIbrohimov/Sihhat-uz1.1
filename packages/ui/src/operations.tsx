"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ListFilters, useSavedFilters } from "./list-filters";
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
    activeTenant = ctx.tenant || ctx.tenants[0]?.id || "",
    action = useAction(),
    [tab, setTab] = useState("calendar"),
    [start, setStart] = useState(localDate()),
    [selectedCell, setSelectedCell] = useState<Row | null>(null),
    remote = useRemote(
      activeTenant ? `/partner/sanatoriums/${activeTenant}/inventory` : null,
      ctx.epoch,
    );
  const data = remote.data;
  const types = data?.types ?? [],
    rooms = data?.rooms ?? [],
    rates = data?.rates ?? [],
    policies = data?.policies ?? [];
  const day = (n: number) =>
    new Date(Date.parse(start) + n * 86400000).toISOString().slice(0, 10);
  const shiftDays = (delta: number) => {
    const next = new Date(Date.parse(start) + delta * 86400000).toISOString().slice(0, 10);
    setStart(next);
  };
  const getDayLabel = (dStr: string) => {
    const days = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
    const d = new Date(`${dStr}T00:00:00`);
    return days[d.getDay()] ?? "";
  };
  function create(kind: string) {
    if (kind === "types")
      action(
        "Xona turi qo‘shish",
        "/partner/room-types",
        { sanatorium_id: activeTenant },
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
        { sanatorium_id: activeTenant },
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
            sanatorium_id: activeTenant,
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
        { sanatorium_id: activeTenant },
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
            sanatorium_id: activeTenant,
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
          ["calendar", "Bandlik kalendari (Shaxmatka)"],
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
                <Card title="14 kunlik xona bandligi">
                  <div className="calendar-toolbar">
                    <div className="calendar-nav-group">
                      <button
                        type="button"
                        className="calendar-nav-btn"
                        onClick={() => shiftDays(-7)}
                        title="Oldingi 7 kun"
                      >
                        ← 7 kun
                      </button>
                      <button
                        type="button"
                        className={`calendar-nav-btn ${start === localDate() ? "active" : ""}`}
                        onClick={() => setStart(localDate())}
                      >
                        Bugun
                      </button>
                      <button
                        type="button"
                        className="calendar-nav-btn"
                        onClick={() => shiftDays(7)}
                        title="Keyingi 7 kun"
                      >
                        7 kun →
                      </button>
                    </div>
                    <label
                      className="field"
                      style={{
                        margin: 0,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>
                        Boshlanish sanasi:
                      </span>
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value || localDate())}
                        style={{ padding: "6px 10px", fontSize: "13px" }}
                      />
                    </label>
                  </div>
                  <div className="calendar">
                    <div className="calendar-row">
                      <div className="calendar-cell header room-header">Xona</div>
                      {Array.from({ length: 14 }, (_, n) => {
                        const isToday = day(n) === localDate();
                        return (
                          <div
                            className={`calendar-cell header ${isToday ? "today" : ""}`}
                            key={n}
                            title={isToday ? "Bugun" : undefined}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                textTransform: "uppercase",
                                opacity: 0.75,
                              }}
                            >
                              {getDayLabel(day(n))}
                            </span>
                            <span style={{ fontWeight: 700 }}>
                              {day(n).slice(8)}.{day(n).slice(5, 7)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {rooms.map((r: Row) => {
                      const roomTypeObj = types.find(
                        (t: Row) => t.id === r.roomTypeId,
                      );
                      const roomTypeName = roomTypeObj?.name;
                      const maxGuests = roomTypeObj?.maxGuests ?? 2;
                      return (
                        <div className="calendar-row" key={r.id}>
                          <div
                            className="calendar-cell header room-header"
                            title={
                              roomTypeName
                                ? `${r.code} — ${roomTypeName} (${maxGuests} o‘rinli)`
                                : r.code
                            }
                          >
                            <span>{r.code}</span>
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--muted)",
                                fontWeight: 400,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "85px",
                              }}
                            >
                              {roomTypeName
                                ? `${roomTypeName} (${maxGuests} joy)`
                                : `${maxGuests} o‘rinli`}
                            </span>
                          </div>
                          {Array.from({ length: 14 }, (_, n) => {
                            const curDay = day(n);
                            const a = data.allocations.find(
                              (a: Row) =>
                                a.roomId === r.id &&
                                a.checkIn.slice(0, 10) <= curDay &&
                                a.checkOut.slice(0, 10) > curDay,
                            );

                            const isMaintenance = a?.kind === "MAINTENANCE";
                            const isPending =
                              a &&
                              !isMaintenance &&
                              (a.bookingStatus === "HOLD" ||
                                a.bookingStatus === "PAYMENT_PENDING" ||
                                a.kind === "HOLD" ||
                                a.kind === "PAYMENT_PENDING");
                            const isBooked =
                              a &&
                              !isMaintenance &&
                              !isPending &&
                              (a.bookingStatus === "CONFIRMED" ||
                                a.bookingStatus === "CHECKED_IN" ||
                                a.bookingStatus === "CHECKED_OUT" ||
                                a.kind === "BOOKING");

                            const state = isMaintenance
                              ? "maintenance"
                              : isBooked
                                ? "booked"
                                : isPending
                                  ? "held"
                                  : "empty";

                            const symbol = isMaintenance
                              ? "T"
                              : isBooked
                                ? "B"
                                : isPending
                                  ? "K"
                                  : "·";

                            const tooltip = isMaintenance
                              ? `Ta’mir: ${a.reason || "Profilaktika"} (${r.code}-xona)`
                              : isBooked
                                ? `Band · ${r.code}-xona${a.bookingReference ? " · #" + a.bookingReference : ""}${a.guestName ? " · " + a.guestName : ""}`
                                : isPending
                                  ? `To‘lov kutilmoqda · ${r.code}-xona${a.bookingReference ? " · #" + a.bookingReference : ""}`
                                  : `Bo‘sh · ${r.code}-xona (${curDay}) — bosib amal tanlang`;

                            return (
                              <div
                                key={n}
                                className={`calendar-cell ${state !== "empty" ? state : ""}`}
                                title={tooltip}
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                  setSelectedCell({
                                    room: r,
                                    roomTypeName,
                                    maxGuests,
                                    day: curDay,
                                    state,
                                    allocation: a ?? null,
                                  })
                                }
                              >
                                <span className={`calendar-pill ${state}`}>
                                  {symbol}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {selectedCell && (
                    <div
                      className="card-body"
                      style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        borderRadius: 14,
                        background: "var(--soft)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <strong>
                          {selectedCell.room.code}-xona ({selectedCell.roomTypeName || "Standart"} · {selectedCell.maxGuests} o‘rinli) — {date(selectedCell.day)}
                        </strong>
                        <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
                          {selectedCell.state === "booked"
                            ? `Band qilingan${selectedCell.allocation?.bookingReference ? " · Bron #" + selectedCell.allocation.bookingReference : ""}${selectedCell.allocation?.guestName ? " · Mehmon: " + selectedCell.allocation.guestName : ""}`
                            : selectedCell.state === "held"
                              ? `To‘lov kutilmoqda${selectedCell.allocation?.bookingReference ? " · Bron #" + selectedCell.allocation.bookingReference : ""}`
                              : selectedCell.state === "maintenance"
                                ? `Ta’mirga yopilgan: ${selectedCell.allocation?.reason || "Profilaktika"}`
                                : "Ushbu sanada xona va koyka-o‘rinlar bo‘sh."}
                        </p>
                      </div>
                      <div className="toolbar" style={{ margin: 0 }}>
                        {selectedCell.allocation?.bookingId && (
                          <button
                            type="button"
                            className="button primary"
                            onClick={() =>
                              ctx.go("bookings", {
                                booking: selectedCell.allocation.bookingId,
                              })
                            }
                          >
                            Bronni ochish
                          </button>
                        )}
                        {selectedCell.state === "empty" &&
                          ctx.allowed("bookings.create_manual") && (
                            <button
                              type="button"
                              className="button primary"
                              onClick={() => ctx.go("bookings")}
                            >
                              Qo‘lda bron qilish
                            </button>
                          )}
                        {selectedCell.state === "empty" &&
                          ctx.allowed("inventory.manage") && (
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => create("blocks")}
                            >
                              Ta’mirga yopish
                            </button>
                          )}
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setSelectedCell(null)}
                        >
                          Yopish
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    className="card-body"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span className="badge green">B — band (to‘langan)</span>
                      <span className="badge amber">K — to‘lov kutilmoqda</span>
                      <span className="badge gray">T — ta’mir</span>
                      <span className="badge soft">· — bo‘sh xona</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Jami xonalar: {rooms.length} ta
                    </span>
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
                                        sanatorium_id: activeTenant,
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
    activeTenant = ctx.tenant || ctx.tenants[0]?.id || "",
    action = useAction(),
    [viewTab, setViewTab] = useState<"bookings" | "crm" | "corporate">("bookings"),
    [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [guestPassportMap, setGuestPassportMap] = useState<Record<string, { passport: string; pinfl: string; placement: string; voucherOrg: string }>>(() => {
      if (typeof window === "undefined") return {};
      try {
        const raw = localStorage.getItem("sihhat-guest-emehmon");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }),
    [crmLeads, setCrmLeads] = useState<Row[]>(() => {
      if (typeof window === "undefined") return [];
      try {
        const raw = localStorage.getItem("sihhat-crm-leads");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : [
              {
                id: "lead-sample-1",
                name: "Rustam Karimov",
                phone: "+998901234567",
                desired_date: localDate(4),
                placement: "BED_MALE",
                status: "WAITLIST",
                note: "1 kishilik joy (Erkaklar xonasidan 1 o‘rin) so‘radi, joy bo‘shasa qo‘ng‘iroq qilish kerak",
              },
              {
                id: "lead-sample-2",
                name: "Dilnoza Rahimova",
                phone: "+998935554433",
                desired_date: localDate(10),
                placement: "WHOLE_ROOM",
                status: "REPEAT_6M",
                note: "6 oy oldin dam olgan doimiy mijoz — qayta taklif yuborish",
              },
            ];
      } catch {
        return [];
      }
    }),
    [corporateQuotas, setCorporateQuotas] = useState<Row[]>(() => {
      if (typeof window === "undefined") return [];
      try {
        const raw = localStorage.getItem("sihhat-corporate-quotas");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : [
              {
                id: "corp-sample-1",
                org_name: "O‘zbekiston Kasaba uyushmalari federatsiyasi",
                kind: "PROFSOYUZ",
                rooms_count: 5,
                used_count: 2,
                period: `${localDate(0)} — ${localDate(30)}`,
                contact_phone: "+998712560000",
                contract_no: "SH-2026/08",
              },
            ];
      } catch {
        return [];
      }
    }),
    inventory = useRemote(
      activeTenant ? `/partner/sanatoriums/${activeTenant}/inventory` : null,
      ctx.epoch,
    ),
    detail = useRemote(
      selected ? `/partner/bookings/${selected}` : null,
      ctx.epoch,
    );

  const saveLeads = (next: Row[]) => {
    setCrmLeads(next);
    try {
      localStorage.setItem("sihhat-crm-leads", JSON.stringify(next));
    } catch {}
  };
  const saveQuotas = (next: Row[]) => {
    setCorporateQuotas(next);
    try {
      localStorage.setItem("sihhat-corporate-quotas", JSON.stringify(next));
    } catch {}
  };
  const savePassportMeta = (
    bookingId: string,
    meta: { passport: string; pinfl: string; placement: string; voucherOrg: string },
  ) => {
    const next = { ...guestPassportMap, [bookingId]: meta };
    setGuestPassportMap(next);
    try {
      localStorage.setItem("sihhat-guest-emehmon", JSON.stringify(next));
    } catch {}
  };

  function printEmehmonSheet(booking: Row) {
    if (typeof window === "undefined") return;
    const meta = guestPassportMap[booking.id] ?? {
      passport: "",
      pinfl: "",
      placement: "WHOLE_ROOM",
      voucherOrg: "Shaxsiy bron",
    };
    const sanatoriumTitle =
      ctx.tenants.find((s) => s.id === booking.sanatoriumId)?.name ??
      booking.sanatorium_name ??
      "Sihhat.uz Sanatoriyasi";
    const roomCodes = (booking.items ?? [])
      .map(
        (it: Row) =>
          data?.rooms?.find((x: Row) => x.id === it.roomId)?.code ?? "—",
      )
      .join(", ");
    const placementLabel =
      meta.placement === "BED_MALE"
        ? "1 kishilik joy (Erkaklar xonasidan 1 o‘rin)"
        : meta.placement === "BED_FEMALE"
          ? "1 kishilik joy (Ayollar xonasidan 1 o‘rin)"
          : "Butun xona";
    const win = window.open("", "_blank", "width=780,height=860");
    if (!win) return;
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Mehmon anketasi (E-mehmon) — ${booking.reference}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; line-height: 1.5; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #555; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; font-size: 14px; }
    th { background: #f4f7f6; width: 36%; }
    .signs { display: flex; justify-content: space-between; margin-top: 40px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${sanatoriumTitle} — MEHMONNI RO‘YXATGA OLISH ANKETASI (E-MEHMON)</h1>
  <div class="sub">Bron raqami: <strong>${booking.reference}</strong> · Chop etilgan sana: ${new Date().toLocaleDateString("ru-RU")}</div>
  <table>
    <tr><th>Mehmon F.I.Sh.</th><td><strong>${booking.guest?.name ?? "—"}</strong></td></tr>
    <tr><th>Telefon raqami</th><td>${booking.guest?.phone ?? "—"}</td></tr>
    <tr><th>Pasport / ID-karta seriya va raqami</th><td>${meta.passport || "_______________________"}</td></tr>
    <tr><th>JShShIR (PINFL) / Tug‘ilgan sana</th><td>${meta.pinfl || "_______________________"}</td></tr>
    <tr><th>Joylashish turi</th><td>${placementLabel}</td></tr>
    <tr><th>Ajratilgan xona raqami</th><td><strong>${roomCodes || "—"}</strong></td></tr>
    <tr><th>Kelish va ketish sanalari</th><td>${date(booking.checkIn)} — ${date(booking.checkOut)}</td></tr>
    <tr><th>Yo‘llanma manbasi / Tashkilot</th><td>${meta.voucherOrg || label[booking.source] || booking.source}</td></tr>
    <tr><th>To‘lov summasi</th><td><strong>${formatMoney(booking.amount)}</strong></td></tr>
  </table>
  <p style="font-size:13px;color:#444;">Sanatoriya ichki tartib-qoidalari, yong‘in xavfsizligi va davolanish rejimi bilan tanishdim.</p>
  <div class="signs">
    <div>Mehmon imzosi: ______________________</div>
    <div>Resepshn xodimi: ______________________</div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  }
  const b = detail.data,
    data = inventory.data;
  const activeRates = (data?.rates ?? []).filter((r: Row) => r.active);
  const filters = useSavedFilters("bookings", {
    status: "",
    from: "",
    to: "",
    date_kind: "ARRIVAL",
  });
  const previousQuery = useRef<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("booking") ?? "";
    if (id === previousQuery.current) return;
    previousQuery.current = id;
    setSelected(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ? id : null);
  }, [ctx.epoch]);
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
            {
              key: "placement_mode",
              label: "Joylashish turi (Xona yoki Koyka-o‘rin)",
              type: "select",
              value: "WHOLE_ROOM",
              required: true,
              options: [
                { value: "WHOLE_ROOM", label: "🏠 Butun xona (oila yoki yakka)" },
                { value: "BED_MALE", label: "👨 1 kishilik joy (Erkaklar xonasidan 1 o‘rin)" },
                { value: "BED_FEMALE", label: "👩 1 kishilik joy (Ayollar xonasidan 1 o‘rin)" },
              ],
            },
            {
              key: "voucher_org",
              label: "Yo‘llanma turi (Oddiy / Kasaba uyushmasi / Korxona)",
              value: "Shaxsiy yo‘llanma",
              hint: "Masalan: Shaxsiy yo‘llanma, Kasaba uyushmasi (Profsoyuz) yoki korxona nomi",
            },
            {
              key: "passport_no",
              label: "Pasport / ID-karta seriyasi (ixtiyoriy, E-mehmon uchun)",
              hint: "Masalan: AD 1234567",
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
                sanatorium_id: activeTenant,
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
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => printEmehmonSheet(b)}
                >
                  🖨️ Mehmon anketasi (E-mehmon chop etish)
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const current = guestPassportMap[b.id] ?? {
                      passport: "",
                      pinfl: "",
                      placement: "WHOLE_ROOM",
                      voucherOrg: "Shaxsiy yo‘llanma",
                    };
                    ctx.form({
                      title: "Pasport, koyka-o‘rin va E-mehmon ma’lumotlari",
                      description:
                        "Mehmon kelganda pasport/ID seriyasi, JShShIR hamda joylashish turini saqlab qo‘yishingiz mumkin.",
                      fields: [
                        {
                          key: "passport",
                          label: "Pasport / ID-karta seriya va raqami",
                          value: current.passport,
                          hint: "Masalan: AD 1234567",
                        },
                        {
                          key: "pinfl",
                          label: "JShShIR (PINFL) yoki tug‘ilgan sana",
                          value: current.pinfl,
                          hint: "14 xonali JShShIR yoki kun.oy.yil",
                        },
                        {
                          key: "placement",
                          label: "Joylashish turi",
                          type: "select",
                          value: current.placement,
                          options: [
                            { value: "WHOLE_ROOM", label: "🏠 Butun xona" },
                            { value: "BED_MALE", label: "👨 1 kishilik joy (Erkaklar xonasi)" },
                            { value: "BED_FEMALE", label: "👩 1 kishilik joy (Ayollar xonasi)" },
                          ],
                        },
                        {
                          key: "voucherOrg",
                          label: "Yo‘llanma manbasi / Kasaba uyushmasi / Tashkilot",
                          value: current.voucherOrg,
                        },
                      ],
                      submit: async (vals) => {
                        savePassportMeta(b.id, {
                          passport: String(vals.passport || ""),
                          pinfl: String(vals.pinfl || ""),
                          placement: String(vals.placement || "WHOLE_ROOM"),
                          voucherOrg: String(vals.voucherOrg || "Shaxsiy yo‘llanma"),
                        });
                      },
                    });
                  }}
                >
                  🪪 Pasport / Koyka-o‘rin kiritish
                </button>
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
                    <dt>Joylashish turi</dt>
                    <dd>
                      {guestPassportMap[b.id]?.placement === "BED_MALE"
                        ? "👨 1 kishilik joy (Erkaklar xonasidan 1 o‘rin)"
                        : guestPassportMap[b.id]?.placement === "BED_FEMALE"
                          ? "👩 1 kishilik joy (Ayollar xonasidan 1 o‘rin)"
                          : "🏠 Butun xona"}
                    </dd>
                    {guestPassportMap[b.id]?.passport && (
                      <>
                        <dt>Pasport / E-mehmon</dt>
                        <dd>
                          {guestPassportMap[b.id].passport}
                          {guestPassportMap[b.id].pinfl
                            ? ` · JShShIR: ${guestPassportMap[b.id].pinfl}`
                            : ""}
                        </dd>
                      </>
                    )}
                    {guestPassportMap[b.id]?.voucherOrg && (
                      <>
                        <dt>Yo‘llanma turi</dt>
                        <dd>{guestPassportMap[b.id].voucherOrg}</dd>
                      </>
                    )}
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
        title="Bronlar va Mijozlar CRM"
        subtitle="Onlayn bronlar, koyka-o‘rinlar, kutish ro‘yxati hamda kasaba uyushmalari yo‘llanmalari bitta oynada."
      >
        {viewTab === "bookings" &&
          ctx.allowed("bookings.create_manual") &&
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
        {viewTab === "crm" && (
          <AddButton
            onClick={() =>
              ctx.form({
                title: "Yangi mijoz so‘rovi / Kutish ro‘yxatiga qo‘shish",
                description:
                  "Telefon qilib bo‘sh joy so‘ragan yoki kutish ro‘yxatiga yozilgan mijozni kiriting.",
                fields: [
                  { key: "name", label: "Mijoz ism-familiyasi", required: true },
                  {
                    key: "phone",
                    label: "Telefon raqami",
                    required: true,
                    value: "+998",
                  },
                  {
                    key: "desired_date",
                    label: "Kelmoqchi bo‘lgan sana",
                    type: "date",
                    value: localDate(3),
                    required: true,
                  },
                  {
                    key: "placement",
                    label: "Qanday joy kerak?",
                    type: "select",
                    value: "WHOLE_ROOM",
                    options: [
                      { value: "WHOLE_ROOM", label: "🏠 Butun xona" },
                      { value: "BED_MALE", label: "👨 1 kishilik joy (Erkaklar xonasi)" },
                      { value: "BED_FEMALE", label: "👩 1 kishilik joy (Ayollar xonasi)" },
                    ],
                  },
                  {
                    key: "status",
                    label: "So‘rov turi",
                    type: "select",
                    value: "WAITLIST",
                    options: [
                      { value: "WAITLIST", label: "🔔 Kutish ro‘yxati (Joy bo‘shasa xabar berish)" },
                      { value: "LEAD", label: "📞 Telefon so‘rovi (O‘ylab ko‘radi)" },
                      { value: "REPEAT_6M", label: "🔄 Doimiy mijoz (6+ oydan keyin qayta taklif)" },
                    ],
                  },
                  {
                    key: "note",
                    label: "Izoh (qaysi dard bo‘yicha yoki qo‘shimcha istak)",
                    type: "textarea",
                  },
                ],
                submit: async (v) => {
                  saveLeads([
                    {
                      id: `lead-${Date.now()}`,
                      name: v.name,
                      phone: v.phone,
                      desired_date: v.desired_date,
                      placement: v.placement,
                      status: v.status,
                      note: v.note,
                    },
                    ...crmLeads,
                  ]);
                },
              })
            }
          >
            So‘rov qo‘shish
          </AddButton>
        )}
        {viewTab === "corporate" && (
          <AddButton
            onClick={() =>
              ctx.form({
                title: "Korxona / Kasaba uyushmasi (Profsoyuz) kvotasi qo‘shish",
                description:
                  "Tashkilotlar, kasaba uyushmalari yoki turagentliklar uchun ajratilgan yo‘llanma o‘rinlarini kiriting.",
                fields: [
                  {
                    key: "org_name",
                    label: "Tashkilot yoki Kasaba uyushmasi nomi",
                    required: true,
                    hint: "Masalan: Navoiy KMK Kasaba uyushmasi yoki Turagentlik nomi",
                  },
                  {
                    key: "kind",
                    label: "Hamkor turi",
                    type: "select",
                    value: "PROFSOYUZ",
                    options: [
                      { value: "PROFSOYUZ", label: "🏛 Kasaba uyushmasi (Profsoyuz)" },
                      { value: "CORPORATE", label: "🏢 Korxona / Tashkilot (Shartnoma)" },
                      { value: "AGENCY", label: "✈️ Turagentlik / Turoperator" },
                    ],
                  },
                  {
                    key: "rooms_count",
                    label: "Ajratilgan xona / yo‘llanma soni",
                    type: "number",
                    value: 5,
                    min: 1,
                    max: 200,
                    required: true,
                  },
                  {
                    key: "period",
                    label: "Amal qilish davri",
                    value: `${localDate(0)} — ${localDate(30)}`,
                    required: true,
                  },
                  {
                    key: "contact_phone",
                    label: "Mas’ul xodim telefoni",
                    value: "+998",
                    required: true,
                  },
                  {
                    key: "contract_no",
                    label: "Shartnoma raqami",
                    value: "SH-2026/",
                  },
                ],
                submit: async (v) => {
                  saveQuotas([
                    {
                      id: `corp-${Date.now()}`,
                      org_name: v.org_name,
                      kind: v.kind,
                      rooms_count: Number(v.rooms_count) || 1,
                      used_count: 0,
                      period: v.period,
                      contact_phone: v.contact_phone,
                      contract_no: v.contract_no,
                    },
                    ...corporateQuotas,
                  ]);
                },
              })
            }
          >
            Kvota qo‘shish
          </AddButton>
        )}
      </PageHeading>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          ["bookings", "📋 Barcha bronlar"],
          ["crm", `📞 Mijoz so‘rovlari va Kutish ro‘yxati (${crmLeads.length})`],
          ["corporate", `🏢 Korxona va Kasaba uyushmalari (${corporateQuotas.length})`],
        ].map(([key, title]) => (
          <button
            key={key}
            type="button"
            className={`tab ${viewTab === key ? "active" : ""}`}
            onClick={() => setViewTab(key as any)}
          >
            {title}
          </button>
        ))}
      </div>
      {viewTab === "crm" ? (
        <Card
          title="Mijoz so‘rovlari, Kutish ro‘yxati va Qayta taklif (CRM)"
        >
          <p className="card-description">
            Joy bo‘shashini kutayotganlar, telefon orqali narx so‘raganlar hamda 6+ oy oldin dam olib ketgan doimiy mijozlar ro‘yxati.
          </p>
          <Table
            rows={crmLeads}
            columns={[
              {
                label: "Mijoz",
                render: (r) => (
                  <>
                    <strong>{r.name}</strong>
                    <span className="subcell">
                      <a
                        href={`tel:${r.phone}`}
                        style={{ color: "#25e2a2", textDecoration: "none", fontWeight: 600 }}
                      >
                        {r.phone}
                      </a>
                    </span>
                  </>
                ),
              },
              {
                label: "Kelish sanasi",
                render: (r) => date(r.desired_date),
              },
              {
                label: "Joylashish turi",
                render: (r) =>
                  r.placement === "BED_MALE"
                    ? "👨 1 joy (Erkaklar xonasi)"
                    : r.placement === "BED_FEMALE"
                      ? "👩 1 joy (Ayollar xonasi)"
                      : "🏠 Butun xona",
              },
              {
                label: "Holati",
                render: (r) => (
                  <span
                    className={`badge ${
                      r.status === "BOOKED"
                        ? "green"
                        : r.status === "WAITLIST"
                          ? "amber"
                          : "gray"
                    }`}
                  >
                    {r.status === "WAITLIST"
                      ? "🔔 Kutish ro‘yxatida"
                      : r.status === "REPEAT_6M"
                        ? "🔄 Qayta chaqirish (6+ oy)"
                        : r.status === "BOOKED"
                          ? "✅ Bron qilindi"
                          : "📞 Telefon so‘rovi"}
                  </span>
                ),
              },
              {
                label: "Izoh",
                render: (r) => r.note || "—",
              },
            ]}
            actions={(r) => (
              <>
                {r.status !== "BOOKED" && (
                  <Act
                    onClick={() => {
                      saveLeads(
                        crmLeads.map((item) =>
                          item.id === r.id ? { ...item, status: "BOOKED" } : item,
                        ),
                      );
                      ctx.notice(`${r.name} so‘rovi «Bron qilindi» deb belgilandi.`);
                    }}
                  >
                    Bron qilindi
                  </Act>
                )}
                <Act
                  danger
                  onClick={() =>
                    saveLeads(crmLeads.filter((item) => item.id !== r.id))
                  }
                >
                  O‘chirish
                </Act>
              </>
            )}
          />
        </Card>
      ) : viewTab === "corporate" ? (
        <Card title="Korxonalar, Kasaba uyushmalari (Profsoyuz) va Turagentlar kvotasi">
          <p className="card-description">
            Shartnoma asosida korxona va kasaba uyushmalariga ajratilgan yo‘llanmalar va xonalar hisobi.
          </p>
          <Table
            rows={corporateQuotas}
            columns={[
              {
                label: "Tashkilot / Kasaba uyushmasi",
                render: (r) => (
                  <>
                    <strong>{r.org_name}</strong>
                    <span className="subcell">
                      Shartnoma: {r.contract_no || "—"}
                    </span>
                  </>
                ),
              },
              {
                label: "Turi",
                render: (r) =>
                  r.kind === "PROFSOYUZ"
                    ? "🏛 Kasaba uyushmasi"
                    : r.kind === "AGENCY"
                      ? "✈️ Turagentlik"
                      : "🏢 Korxona",
              },
              {
                label: "Ajratilgan / Band",
                render: (r) => (
                  <strong>
                    {r.used_count ?? 0} / {r.rooms_count} ta yo‘llanma
                  </strong>
                ),
              },
              { label: "Davr", key: "period" },
              {
                label: "Aloqa",
                render: (r) => (
                  <a
                    href={`tel:${r.contact_phone}`}
                    style={{ color: "#25e2a2", textDecoration: "none", fontWeight: 600 }}
                  >
                    {r.contact_phone}
                  </a>
                ),
              },
            ]}
            actions={(r) => (
              <>
                <Act
                  onClick={() =>
                    saveQuotas(
                      corporateQuotas.map((item) =>
                        item.id === r.id
                          ? {
                              ...item,
                              used_count: Math.min(
                                item.rooms_count,
                                (item.used_count ?? 0) + 1,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                >
                  +1 Yo‘llanma keldi
                </Act>
                <Act
                  danger
                  onClick={() =>
                    saveQuotas(
                      corporateQuotas.filter((item) => item.id !== r.id),
                    )
                  }
                >
                  O‘chirish
                </Act>
              </>
            )}
          />
        </Card>
      ) : (
        <>
      {ctx.allowed("bookings.create_manual") &&
        (inventory.error ? (
          <ErrorBox message={inventory.error} retry={inventory.reload} />
        ) : !inventory.loading && data && !activeRates.length ? (
          <p className="muted" role="status">
            Qo‘lda bron yaratish uchun «Xonalar va tariflar» bo‘limida faol
            tarif qo‘shing.
          </p>
        ) : null)}
      <ListFilters
        search={search}
        setSearch={setSearch}
        apply={() => setQ(search.trim())}
        reset={() => {
          setSearch("");
          setQ("");
          filters.reset();
        }}
        filters={filters.values}
        setFilter={filters.set}
        dates
        dateKinds
        statuses={[
          "HOLD",
          "PAYMENT_PENDING",
          "CONFIRMED",
          "CHECKED_IN",
          "CHECKED_OUT",
          "CANCELLED",
          "NO_SHOW",
          "EXPIRED",
          "PAYMENT_EXCEPTION",
        ]}
      />
      <DataPanel
        key={ctx.tenant}
        path={ctx.admin ? "/superadmin/bookings" : "/partner/bookings"}
        title="Bronlar ro‘yxati"
        params={{
          sanatorium_id: ctx.tenant || undefined,
          q: q || undefined,
          status: filters.values.status || undefined,
          from: filters.values.from || undefined,
          to: filters.values.to || undefined,
          date_kind: filters.values.date_kind,
        }}
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
          ...(ctx.admin
            ? [
                {
                  label: "Sanatoriya",
                  render: (r: Row) =>
                    ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ??
                    r.sanatorium_name ??
                    "—",
                },
              ]
            : []),
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
      )}
    </>
  );
}
export function Payments() {
  const ctx = usePortal();
  const filters = useSavedFilters("payments", { status: "", from: "", to: "" });
  const [search, setSearch] = useState(""),
    [q, setQ] = useState("");
  const tez = useRemote(ctx.admin ? "/superadmin/integrations/tezcheck" : null);
  return (
    <>
      <PageHeading
        title="Onlayn to‘lovlar"
        subtitle="Holat to‘lov provayderi tasdig‘i bilan belgilanadi."
      />
      {ctx.admin && (
        <Card
          title="Tezcheck to‘lov tizimi holati"
          aside={
            <button
              className="button secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => tez.reload()}
            >
              <RefreshCw size={13} /> Ulanishni yangilash
            </button>
          }
        >
          {tez.loading ? (
            <Loading />
          ) : tez.error ? (
            <ErrorBox message={tez.error} retry={tez.reload} />
          ) : !tez.data?.configured ? (
            <p>Tezcheck ulanishi hali sozlanmagan.</p>
          ) : (
            <div className="gateway-status-grid">
              <div className="gateway-status-card">
                <span className="gateway-status-label">API Ulanishi</span>
                <span className={`status-pill ${tez.data.authenticated ? "online" : "offline"}`}>
                  <span className="status-dot" />
                  {tez.data.authenticated ? "API Faol" : "Aloqa yo‘q"}
                </span>
              </div>
              <div className="gateway-status-card">
                <span className="gateway-status-label">Kassa Holati</span>
                <span className={`status-pill ${tez.data.accepts_payments ? "online" : "offline"}`}>
                  <span className="status-dot" />
                  {tez.data.accepts_payments ? "To‘lov qabul qilmoqda" : "Nofaol"}
                </span>
              </div>
              <div className="gateway-status-card">
                <span className="gateway-status-label">Valyuta</span>
                <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>
                  {tez.data.currency ?? "UZS"}
                </div>
              </div>
              <div className="gateway-status-card">
                <span className="gateway-status-label">Qabul qilinadigan usullar</span>
                <div className="gateway-methods">
                  {(tez.data.methods ?? []).map((m: Row) => (
                    <span className="method-tag" key={m.code ?? m.name}>
                      {m.name}
                    </span>
                  ))}
                  {!(tez.data.methods ?? []).length && (
                    <span className="method-tag">Click, Payme, Uzcard, Humo, WLCM</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
      <ListFilters
        search={search}
        setSearch={setSearch}
        apply={() => setQ(search.trim())}
        reset={() => {
          setSearch("");
          setQ("");
          filters.reset();
        }}
        filters={filters.values}
        setFilter={filters.set}
        dates
        statuses={[
          "SUCCEEDED",
          "REFUNDED",
          "CANCELLED",
          "FAILED",
        ]}
      />
      <DataPanel
        key={ctx.tenant}
        path={ctx.admin ? "/superadmin/payments" : "/partner/payments"}
        params={{
          sanatorium_id: ctx.tenant || undefined,
          q: q || undefined,
          status: filters.values.status || undefined,
          from: filters.values.from || undefined,
          to: filters.values.to || undefined,
        }}
        columns={[
          {
            label: "Bron raqami",
            render: (row) => row.booking_reference ?? "—",
          },
          ...(ctx.admin
            ? [
                {
                  label: "Sanatoriya",
                  render: (r: Row) =>
                    ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ??
                    "—",
                },
              ]
            : []),
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
