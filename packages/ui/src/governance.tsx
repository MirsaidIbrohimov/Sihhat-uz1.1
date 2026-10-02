"use client";
import { useState } from "react";
import { BedDouble, BookOpen, Coins, Leaf, Users, Wallet } from "lucide-react";
import { api, formatMoney, query } from "@sihhat/api-client";
import { ProfileWizard } from "./wizard";
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
  options,
  statusColumn,
  uploadAsset,
  useAction,
  usePortal,
  useRemote,
  type Field,
  type Row,
} from "./components";

export const permissions: Record<string, string> = {
  "sanatorium.profile.edit": "Profilni tahrirlash",
  "inventory.manage": "Xonalarni boshqarish",
  "pricing.manage": "Tariflarni boshqarish",
  "discounts.manage": "Chegirma belgilash",
  "bookings.read": "Bronlarni ko‘rish",
  "bookings.create_manual": "Qo‘lda bron yaratish",
  "bookings.guarantee": "Qo‘lda bronni kafolatlash",
  "bookings.check_in": "Mehmonni joylashtirish",
  "bookings.check_out": "Ketishni qayd etish",
  "payments.read": "To‘lovlarni ko‘rish",
  "offline_payments.record": "Joyida to‘lov qaydi",
  "offline_payments.verify": "Joyida to‘lovni tekshirish",
  "reports.operational.read": "Operatsion hisobot",
  "reports.financial.read": "Moliyaviy hisobot",
  "reports.export": "Hisobotni yuklash",
  "refunds.request": "Refund so‘rash",
  "messages.send": "Xabar yuborish",
  "tasks.manage": "Vazifa berish",
  "surveys.respond": "Anketaga javob",
  "reviews.reply": "Sharhga javob",
  "support.read": "Murojaatlarni ko‘rish",
  "invoices.read": "Hisoblarni ko‘rish",
  "invoices.pay": "Hisobni to‘lash",
  "ads.request": "Reklama so‘rash",
  "payouts.read": "O‘tkazmalarni ko‘rish",
};
const receptionDefaults = [
  "sanatorium.profile.edit",
  "bookings.read",
  "bookings.create_manual",
  "bookings.guarantee",
  "bookings.check_in",
  "bookings.check_out",
  "payments.read",
  "reports.operational.read",
  "surveys.respond",
  "support.read",
];
export function Dashboard() {
  const ctx = usePortal(),
    today = localDate(),
    [from, setFrom] = useState(today.slice(0, 8) + "01"),
    [to, setTo] = useState(
      new Date(
        Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1),
      )
        .toISOString()
        .slice(0, 10),
    ),
    [basis, setBasis] = useState("SERVICE");
  const financial = ctx.admin || ctx.allowed("reports.financial.read");
  const remote = useRemote(
    (ctx.admin ? "/superadmin/reports" : "/partner/reports") +
      query({
        from,
        to,
        booking_basis: basis,
        ...(!ctx.admin
          ? { sanatorium_id: ctx.tenant, financial: String(financial) }
          : {}),
      }),
    ctx.epoch,
  );
  const r = remote.data;
  return (
    <>
      <PageHeading
        title={
          ctx.admin
            ? "Platforma ko‘rsatkichlari"
            : "Bugungi ishlar, bir qarashda"
        }
        subtitle={
          ctx.admin
            ? "Bron aylanmasi va platforma daromadi alohida hisoblanadi."
            : "Sanatoriyangizning bronlari, bandlik va jamoa jarayoni."
        }
      >
        <div className="date-filter">
          <input
            aria-label="Davr boshi"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>—</span>
          <input
            aria-label="Davr oxiri"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <select
            aria-label="Bron hisobi mezoni"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
          >
            <option value="SERVICE">Yashash davri</option>
            <option value="CREATED">Yaratilgan sana</option>
            <option value="PAYMENT">To‘langan sana</option>
          </select>
        </div>
      </PageHeading>
      <div className="hero-card">
        <p className="eyebrow">
          {ctx.admin ? "SHAFFOF HISOB-KITOB" : "SIHHAT.UZ HAMKORI"}
        </p>
        <h2>
          {ctx.admin
            ? "Mehmonlar oqimi. Aniq moliya."
            : "Mehmonlar uchun tayyor bo‘ling."}
        </h2>
        <p>
          Hisobot Asia/Tashkent vaqtida yuritiladi. Ketish kuni yangi bron uchun
          ochiq. Tanlangan davrning oxirgi sanasi hisobga kirmaydi.
        </p>
        <Leaf className="hero-graphic" size={105} />
      </div>
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        r && (
          <>
            <div className="stats">
              {[
                {
                  title: "Bronlar",
                  value: r.bookings,
                  detail:
                    label[basis] ??
                    (basis === "SERVICE"
                      ? "Yashash sanalari kesishgan bronlar"
                      : basis === "PAYMENT"
                        ? "To‘lov sanasi bo‘yicha"
                        : "Yaratilgan sana bo‘yicha"),
                  icon: BookOpen,
                },
                {
                  title: "Xonalar bandligi",
                  value: `${(r.occupancy * 100).toFixed(1)}%`,
                  detail: `${r.room_nights} / ${r.sellable_room_nights} xona-tun`,
                  icon: BedDouble,
                },
                {
                  title: financial ? "Bron aylanmasi (GMV)" : "Mehmon-tunlar",
                  value: financial ? formatMoney(r.gmv) : r.guest_nights,
                  detail: financial
                    ? "Tasdiqlangan onlayn to‘lovlar"
                    : "Davrga to‘g‘ri kelgan yashash",
                  icon: Users,
                },
                {
                  title: ctx.admin
                    ? "Platforma daromadi"
                    : financial
                      ? "Sanatoriyaga qarzdorlik"
                      : "Xona-tunlar",
                  value: ctx.admin
                    ? formatMoney(r.platform_revenue)
                    : financial
                      ? formatMoney(r.sanatorium_payable)
                      : r.room_nights,
                  detail: ctx.admin
                    ? "Abonent va reklama xizmatlari"
                    : financial
                      ? "Hisobot oxirigacha qoldiq"
                      : "Davr ichidagi sotilgan tunlar",
                  icon: Coins,
                },
              ].map((s) => (
                <div className="stat-card" key={s.title}>
                  <div className="stat-icon">
                    <s.icon size={17} />
                  </div>
                  <div className="stat-label">{s.title}</div>
                  <div className="stat-number">{s.value}</div>
                  <div className="stat-detail">{s.detail}</div>
                </div>
              ))}
            </div>
            <div className="two-cols">
              <Card title="Bronlar holati">
                <div className="chart-wrap">
                  {Object.keys(r.booking_statuses).length ? (
                    <div className="bar-chart">
                      {Object.entries(r.booking_statuses).map(([key, n]) => (
                        <div className="bar-item" key={key}>
                          <span className="bar-value">{String(n)}</span>
                          <div
                            className="bar-fill"
                            style={{
                              height: Math.max(
                                2,
                                (Number(n) /
                                  Math.max(
                                    ...Object.values(r.booking_statuses).map(
                                      Number,
                                    ),
                                  )) *
                                  110,
                              ),
                            }}
                          />
                          <span className="bar-label">{label[key] ?? key}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty text="Bu davrda bronlar yo‘q" />
                  )}
                  <p className="chart-legend">
                    Hisob mezoni:{" "}
                    {basis === "SERVICE"
                      ? "yashash davri"
                      : basis === "PAYMENT"
                        ? "to‘lov sanasi"
                        : "yaratilgan sana"}
                  </p>
                </div>
              </Card>
              <Card
                title={
                  financial ? "Hisob-kitob qoldiqlari" : "Xonalar bandligi"
                }
              >
                <div className="number-list">
                  {financial ? (
                    [
                      ["Sof onlayn tushum", r.net_online_receipts],
                      ["Mijozga qaytarilgan", r.refunds],
                      ["Refund majburiyati", r.refund_payable],
                      ["Bankka yuborilayotgan", r.payout_in_transit],
                      ["Undiriladigan summa", r.receivable],
                    ].map(([key, n]) => (
                      <div className="number-row" key={key}>
                        <span>{key}</span>
                        <strong>{formatMoney(n)}</strong>
                      </div>
                    ))
                  ) : (
                    <div className="card-body">
                      <strong className="stat-number">
                        {(r.occupancy * 100).toFixed(1)}%
                      </strong>
                      <div className="occupancy-track">
                        <div
                          style={{
                            width: `${Math.min(100, r.occupancy * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="muted">
                        Ta’mir uchun yopilgan tunlar sotiladigan xona-tunlardan
                        chiqarilgan.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            {ctx.allowed("reports.export") && (
              <a
                className="button secondary"
                href={
                  "/api/partner/reports/export" +
                  query({
                    sanatorium_id: ctx.admin ? undefined : ctx.tenant,
                    from,
                    to,
                    booking_basis: basis,
                    financial: String(financial),
                  })
                }
              >
                CSV hisobotni yuklash
              </a>
            )}
          </>
        )
      )}
    </>
  );
}
export function Sanatoriums() {
  const ctx = usePortal(),
    action = useAction(),
    [selected, setSelected] = useState<string | null>(null);
  if (selected)
    return (
      <>
        <button className="button secondary" onClick={() => setSelected(null)}>
          ← Sanatoriyalarga qaytish
        </button>
        <Profile id={selected} />
      </>
    );
  return (
    <>
      <PageHeading
        title="Sanatoriyalar"
        subtitle="Yangi hamkorlar, profil tahrirlari va e’lon holati."
      >
        <AddButton
          onClick={() =>
            action("Sanatoriya yaratish", "/superadmin/sanatoriums", {}, [
              {
                key: "name",
                label: "Sanatoriya nomi",
                required: true,
                minLength: 2,
              },
            ])
          }
        >
          Yangi sanatoriya
        </AddButton>
      </PageHeading>
      <DataPanel
        path="/superadmin/sanatoriums"
        columns={[
          {
            label: "Sanatoriya",
            render: (r) => (
              <>
                <strong>{r.name}</strong>
                <span className="subcell">
                  {r.revision?.data?.region ?? "Profil to‘ldirilmoqda"}
                </span>
              </>
            ),
          },
          statusColumn,
          {
            label: "Profil tahriri",
            render: (r) =>
              r.revision ? <Badge value={r.revision.status} /> : null,
          },
          {
            label: "Onlayn bron",
            render: (r) => (r.paymentReady ? "Ochiq" : "Yopiq"),
          },
          { label: "Yaratilgan", render: (r) => date(r.createdAt) },
        ]}
        actions={(r) => (
          <>
            <Act onClick={() => setSelected(r.id)}>Profilni ko‘rish</Act>
            <Act
              onClick={() =>
                action(
                  "Onlayn bron sozlamasi",
                  `/superadmin/sanatoriums/${r.id}/config`,
                  { version: r.version },
                  [
                    {
                      key: "payment_ready",
                      label: "Onlayn bronni ochish",
                      type: "checkbox",
                      value: r.paymentReady,
                    },
                    {
                      key: "subscription_required",
                      label: "Faol abonent talab qilinadi",
                      type: "checkbox",
                      value: r.subscriptionRequired,
                    },
                  ],
                  "PATCH",
                )
              }
            >
              Sozlash
            </Act>
            {r.status === "ACTIVE" ? (
              <Act
                danger
                onClick={() =>
                  action(
                    "Sanatoriyani to‘xtatish",
                    `/superadmin/sanatoriums/${r.id}/pause`,
                    { version: r.version },
                    [
                      {
                        key: "reason",
                        label: "Sabab",
                        type: "textarea",
                        required: true,
                        minLength: 3,
                      },
                    ],
                  )
                }
              >
                To‘xtatish
              </Act>
            ) : (
              <Act
                onClick={() =>
                  action(
                    "Sanatoriyani ochish",
                    `/superadmin/sanatoriums/${r.id}/reopen`,
                    { version: r.version },
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
                Qayta ochish
              </Act>
            )}
            {r.status !== "ARCHIVED" && (
              <Act
                danger
                onClick={() =>
                  action(
                    "Sanatoriyani arxivlash",
                    `/superadmin/sanatoriums/${r.id}/archive`,
                    { version: r.version },
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
                Arxivlash
              </Act>
            )}
          </>
        )}
      />
    </>
  );
}
const profileFields: Field[] = [
  { key: "name", label: "Sanatoriya nomi", required: true },
  {
    key: "description",
    label: "Tavsif",
    type: "textarea",
    required: true,
    minLength: 30,
  },
  { key: "legal_name", label: "Yuridik nom", required: true },
  { key: "stir", label: "STIR", required: true, pattern: "[0-9]{9}" },
  { key: "region", label: "Hudud", required: true },
  { key: "address", label: "Manzil", required: true, minLength: 5 },
  {
    key: "latitude",
    label: "Kenglik",
    type: "number",
    step: "any",
    required: true,
    min: -90,
    max: 90,
  },
  {
    key: "longitude",
    label: "Uzunlik",
    type: "number",
    step: "any",
    required: true,
    min: -180,
    max: 180,
  },
  {
    key: "contact_phone",
    label: "Aloqa telefoni",
    required: true,
    pattern: "\\+998[0-9]{9}",
  },
  {
    key: "check_in_time",
    label: "Joylashish vaqti",
    type: "time",
    required: true,
  },
  {
    key: "check_out_time",
    label: "Ketish vaqti",
    type: "time",
    required: true,
  },
  {
    key: "amenities",
    label: "Sharoitlar",
    type: "csv",
    hint: "Vergul bilan ajrating: Wi-Fi, Basseyn",
  },
  {
    key: "services",
    label: "Xizmatlar",
    type: "csv",
    hint: "Vergul bilan ajrating.",
  },
  { key: "meals", label: "Ovqatlanish", type: "textarea" },
  { key: "child_rules", label: "Bolalar qoidalari", type: "textarea" },
  { key: "medical_requirements", label: "Tibbiy talablar", type: "textarea" },
  { key: "directions", label: "Yetib borish", type: "textarea" },
  { key: "required_documents", label: "Mehmon hujjatlari", type: "textarea" },
  {
    key: "terms_accepted",
    label: "Platforma xizmat shartlari",
    type: "checkbox",
    required: true,
    hint: "Xizmat shartlarini qabul qilaman",
  },
];
export function Profile({ id }: { id?: string }) {
  const ctx = usePortal(),
    tenant = id ?? ctx.tenant,
    action = useAction(),
    [tab, setTab] = useState("profile"),
    [editing, setEditing] = useState(false),
    remote = useRemote(
      tenant ? `/partner/sanatoriums/${tenant}` : null,
      ctx.epoch,
    ),
    banks = useRemote(
      ctx.admin || ctx.allowed("bank.request")
        ? `/partner/sanatoriums/${tenant}/bank-revisions`
        : null,
      ctx.epoch,
    );
  const s = remote.data,
    r =
      s?.revisions?.find((r: Row) =>
        ["DRAFT", "CHANGES_REQUESTED", "SUBMITTED"].includes(r.status),
      ) ?? s?.revisions?.find((r: Row) => r.id === s.publicRevisionId),
    data = r?.data ?? {},
    edit = ctx.admin || ctx.allowed("sanatorium.profile.edit");
  function editProfile() {
    setEditing(true);
  }
  function file(kind: "photo" | "document") {
    ctx.form({
      title: kind === "photo" ? "Sanatoriya rasmini yuklash" : "Hujjat yuklash",
      fields: [
        {
          key: "file",
          label: "Fayl",
          type: "file",
          required: true,
          accept:
            kind === "photo"
              ? "image/png,image/jpeg,image/webp"
              : "application/pdf,image/png,image/jpeg",
          hint: "8 MB gacha. Hujjatlar faqat vakolatli xodimlarga ko‘rinadi.",
        },
      ],
      submit: async (v) => {
        const asset = await uploadAsset(
          v.file,
          tenant,
          r.id,
          kind === "photo" ? "PUBLIC" : "PRIVATE",
        );
        const key = kind === "photo" ? "photo_ids" : "document_ids";
        return api(`/partner/sanatorium-revisions/${r.id}`, "PATCH", {
          version: r.version,
          data: { [key]: [...(data[key] ?? []), asset.id] },
        });
      },
      done: ctx.refresh,
    });
  }
  if (editing && r)
    return (
      <ProfileWizard
        revision={r}
        fields={profileFields}
        onClose={() => {
          setEditing(false);
          ctx.refresh();
        }}
      />
    );
  const published = s?.revisions?.find((v: Row) => v.id === s.publicRevisionId);
  const changes =
    published && published.id !== r?.id
      ? profileFields
          .filter(
            (f) =>
              JSON.stringify(published.data[f.key]) !==
              JSON.stringify(data[f.key]),
          )
          .map((f) => ({
            label: f.label,
            before: published.data[f.key],
            after: data[f.key],
          }))
      : [];
  const showValue = (v: unknown) =>
    Array.isArray(v)
      ? v.join(", ")
      : typeof v === "boolean"
        ? v
          ? "Ha"
          : "Yo‘q"
        : String(v ?? "To‘ldirilmagan");
  return (
    <>
      <PageHeading
        title={s?.name ?? "Sanatoriya profili"}
        subtitle="Nashrdagi ma’lumotlar tahrir tekshirilguncha saqlanadi."
      >
        {r && edit && ["DRAFT", "CHANGES_REQUESTED"].includes(r.status) ? (
          <>
            <button className="button secondary" onClick={editProfile}>
              Tahrirlash
            </button>
            <AddButton
              onClick={() =>
                action(
                  "Profilni tekshiruvga yuborish",
                  `/partner/sanatorium-revisions/${r.id}/submit`,
                  { version: r.version },
                )
              }
            >
              Tekshiruvga yuborish
            </AddButton>
          </>
        ) : r?.status === "APPROVED" && edit ? (
          <AddButton
            onClick={() =>
              action(
                "Yangi tahrir ochish",
                `/partner/sanatoriums/${tenant}/drafts`,
              )
            }
          >
            Yangi tahrir
          </AddButton>
        ) : null}
      </PageHeading>
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : !r ? (
        <Empty text="Profil tahriri topilmadi" />
      ) : (
        <>
          <div className="tabs">
            {[
              ["profile", "Profil"],
              ["files", "Rasmlar va hujjatlar"],
              ...(ctx.admin || ctx.allowed("bank.request")
                ? [["bank", "Bank rekvizitlari"]]
                : []),
            ].map(([key, title]) => (
              <button
                className={`tab ${tab === key ? "active" : ""}`}
                key={key}
                onClick={() => setTab(key)}
              >
                {title}
              </button>
            ))}
          </div>
          <div className="toolbar" style={{ marginBottom: 20 }}>
            <Badge value={r.status} />
            <span className="muted">Tahrir {r.version}</span>
            {r.reason && <span className="danger-text">{r.reason}</span>}
            {ctx.admin && r.status === "SUBMITTED" && (
              <>
                <button
                  className="button primary"
                  onClick={() =>
                    action(
                      "Profilni tasdiqlash",
                      `/superadmin/moderation/${r.id}/approve`,
                      { version: r.version },
                    )
                  }
                >
                  Tasdiqlash
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    action(
                      "Tuzatish so‘rash",
                      `/superadmin/moderation/${r.id}/request-changes`,
                      { version: r.version },
                      [
                        {
                          key: "reason",
                          label: "Tuzatish sababi",
                          type: "textarea",
                          required: true,
                          minLength: 3,
                        },
                      ],
                    )
                  }
                >
                  Tuzatish so‘rash
                </button>
              </>
            )}
          </div>
          {tab === "profile" && (
            <>
              {published && published.id !== r.id && (
                <Card title="Nashrdagi profil bilan farq">
                  <Table
                    rows={changes}
                    columns={[
                      { label: "Maydon", key: "label" },
                      {
                        label: "Nashrdagi qiymat",
                        render: (v) => showValue(v.before),
                      },
                      {
                        label: "Yangi tahrir",
                        render: (v) => showValue(v.after),
                      },
                    ]}
                  />
                  <div className="card-body muted">
                    Rasmlar: {published.data.photo_ids?.length ?? 0} →{" "}
                    {data.photo_ids?.length ?? 0}; hujjatlar:{" "}
                    {published.data.document_ids?.length ?? 0} →{" "}
                    {data.document_ids?.length ?? 0}.
                  </div>
                </Card>
              )}
              <Card title="Sanatoriya ma’lumotlari">
                <div className="card-body detail-grid">
                  {profileFields
                    .filter((f) => f.key !== "terms_accepted")
                    .map((f) => (
                      <dl key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>
                          {Array.isArray(data[f.key])
                            ? data[f.key].join(", ")
                            : (data[f.key] ?? "To‘ldirilmagan")}
                        </dd>
                      </dl>
                    ))}
                </div>
              </Card>
            </>
          )}
          {tab === "files" && (
            <Card
              title="Rasmlar va hujjatlar"
              aside={
                edit &&
                ["DRAFT", "CHANGES_REQUESTED"].includes(r.status) && (
                  <div className="toolbar">
                    <Act onClick={() => file("photo")}>Rasm yuklash</Act>
                    <Act onClick={() => file("document")}>Hujjat yuklash</Act>
                  </div>
                )
              }
            >
              <div className="card-body">
                <h3>Rasmlar</h3>
                <div className="file-list">
                  {(data.photo_ids ?? []).map((id: string, n: number) => (
                    <a
                      key={id}
                      href={`/api/media/${id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Rasm {n + 1}
                    </a>
                  ))}
                </div>
                <h3 style={{ marginTop: 25 }}>Hujjatlar</h3>
                <div className="file-list">
                  {(data.document_ids ?? []).map((id: string, n: number) => (
                    <a
                      key={id}
                      href={`/api/media/${id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Hujjat {n + 1}
                    </a>
                  ))}
                </div>
                {!data.document_ids?.length && (
                  <p className="muted">
                    Tekshiruvga yuborish uchun hujjat yuklang.
                  </p>
                )}
              </div>
            </Card>
          )}
          {tab === "bank" && (
            <Card
              title="Bank rekvizitlari"
              aside={
                <Act
                  onClick={() =>
                    action(
                      "Bank rekvizitlarini yuborish",
                      `/partner/sanatoriums/${tenant}/bank-revisions`,
                      {},
                      [
                        {
                          key: "legal_name",
                          label: "Yuridik nom",
                          required: true,
                        },
                        {
                          key: "account",
                          label: "Hisob raqami",
                          required: true,
                          pattern: "[0-9]{20}",
                        },
                        {
                          key: "mfo",
                          label: "MFO",
                          required: true,
                          pattern: "[0-9]{5}",
                        },
                        {
                          key: "stir",
                          label: "STIR",
                          required: true,
                          pattern: "[0-9]{9}",
                        },
                      ],
                    )
                  }
                >
                  Yangi rekvizit
                </Act>
              }
            >
              {banks.loading ? (
                <Loading />
              ) : banks.error ? (
                <ErrorBox message={banks.error} />
              ) : (
                <Table
                  rows={list(banks.data)}
                  columns={[
                    { label: "Yuridik nom", render: (r) => r.data.legal_name },
                    { label: "Hisob raqami", render: (r) => r.data.account },
                    { label: "MFO", render: (r) => r.data.mfo },
                    statusColumn,
                  ]}
                  actions={
                    ctx.admin
                      ? (r) =>
                          r.status === "PENDING" && (
                            <Act
                              onClick={() =>
                                action(
                                  "Bank rekvizitini tasdiqlash",
                                  `/superadmin/bank-revisions/${r.id}/approve`,
                                )
                              }
                            >
                              Tasdiqlash
                            </Act>
                          )
                      : undefined
                  }
                />
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
export function Staff() {
  const ctx = usePortal(),
    action = useAction(),
    [credentials, setCredentials] = useState<Row | null>(null);
  function invite(director = false) {
    ctx.form({
      title: director ? "Direktor tayinlash" : "Xodim taklif qilish",
      description: director
        ? "Oldingi direktor vakolati bekor qilinadi."
        : ctx.admin
          ? "Xodim faol hisob bilan yaratiladi."
          : "Yangi xodim superadmin tasdiqlaganidan keyin ishlaydi.",
      fields: [
        ...(ctx.admin
          ? [
              {
                key: "sanatorium_id",
                label: "Sanatoriya",
                type: "select" as const,
                required: true,
                value: ctx.tenant,
                options: options(ctx.tenants),
              },
            ]
          : []),
        { key: "name", label: "Ism va familiya", required: true },
        {
          key: "login",
          label: "Login",
          required: true,
          hint: "Lotin harflari, raqam, nuqta, pastki chiziq.",
        },
        {
          key: "phone",
          label: "Telefon",
          required: true,
          pattern: "\\+998[0-9]{9}",
        },
      ],
      submit: async (v) => {
        const r = await api(
          director
            ? "/superadmin/director-assignments"
            : "/partner/staff-invitations",
          "POST",
          { sanatorium_id: ctx.tenant, ...v },
        );
        setCredentials({
          name: v.name,
          login: v.login,
          password: r.temporary_password,
        });
        return r;
      },
      done: ctx.refresh,
    });
  }
  function permissionEdit(r: Row) {
    const selected = r.permissions.filter((p: string) => p in permissions),
      defaults =
        r.role === "DIRECTOR" ? Object.keys(permissions) : receptionDefaults;
    ctx.form({
      title: `${r.user?.name} — ruxsatlar`,
      description: ctx.admin
        ? "Belgilanmagan vakolatga admin taqiqi qo‘yiladi."
        : "Admin tomonidan taqiqlangan vakolatlarni direktor bera olmaydi.",
      fields: [
        {
          key: "permissions",
          label: "Ruxsat etilgan amallar",
          type: "multi",
          value: selected,
          options: Object.entries(permissions).map(([value, label]) => ({
            value,
            label,
            disabled:
              !ctx.admin &&
              (r.adminDenies.includes(value) ||
                (r.ceiling.length && !r.ceiling.includes(value)) ||
                !ctx.allowed(value)),
          })),
          hint: "Bir nechta tanlash uchun Ctrl (Mac: Cmd) tugmasini bosib turing.",
        },
      ],
      submit: (v) => {
        const picked = v.permissions as string[];
        return api(`/partner/staff/${r.id}/permissions`, "PATCH", {
          version: r.version,
          grants: picked.filter((p) => !defaults.includes(p)),
          denies: defaults.filter(
            (p) =>
              !picked.includes(p) &&
              !(ctx.admin ? [] : r.adminDenies).includes(p),
          ),
        });
      },
      done: ctx.refresh,
    });
  }
  return (
    <>
      <PageHeading
        title="Jamoa va ruxsatlar"
        subtitle="Direktor va resepshn vakolatlari har bir amal uchun tekshiriladi."
      >
        <AddButton onClick={() => invite()}>Xodim taklif qilish</AddButton>
        {ctx.admin && (
          <button className="button secondary" onClick={() => invite(true)}>
            Direktor tayinlash
          </button>
        )}
      </PageHeading>
      {credentials && (
        <div className="alert-note">
          <strong>
            {credentials.name} uchun bir martalik kirish ma’lumotlari
          </strong>
          <p>
            Login: {credentials.login}
            <br />
            Vaqtinchalik parol: <code>{credentials.password}</code>
          </p>
          <p>Xodim ilk kirishda parolni almashtiradi.</p>
          <button className="text-button" onClick={() => setCredentials(null)}>
            Yopish
          </button>
        </div>
      )}
      <DataPanel
        path="/partner/staff"
        columns={[
          {
            label: "Xodim",
            render: (r) => (
              <>
                <strong>{r.user?.name}</strong>
                <span className="subcell">{r.user?.login}</span>
              </>
            ),
          },
          {
            label: "Sanatoriya",
            render: (r) =>
              ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ?? "—",
          },
          { label: "Lavozim", render: (r) => label[r.role] },
          statusColumn,
          { label: "Faol vakolatlar", render: (r) => r.permissions.length },
        ]}
        actions={(r) => (
          <>
            {ctx.admin && r.status === "PENDING_APPROVAL" && (
              <>
                <Act
                  onClick={() =>
                    action(
                      "Xodimni tasdiqlash",
                      `/superadmin/staff-approvals/${r.id}/approve`,
                      { version: r.version },
                    )
                  }
                >
                  Tasdiqlash
                </Act>
                <Act
                  danger
                  onClick={() =>
                    action(
                      "Taklifni rad etish",
                      `/superadmin/staff-approvals/${r.id}/reject`,
                      { version: r.version },
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
                  Rad etish
                </Act>
              </>
            )}
            {(ctx.admin || r.role === "RECEPTION") &&
              ctx.allowed("staff.permissions.manage") &&
              r.status === "ACTIVE" && (
                <Act onClick={() => permissionEdit(r)}>Ruxsatlar</Act>
              )}
            {ctx.admin && r.status === "ACTIVE" && (
              <Act
                danger
                onClick={() =>
                  action(
                    "Xodimni bloklash",
                    `/superadmin/staff/${r.id}/block`,
                    { version: r.version },
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
                Bloklash
              </Act>
            )}
            {ctx.admin && (
              <Act
                onClick={() =>
                  ctx.form({
                    title: "Parolni tiklash",
                    fields: [],
                    submit: async () => {
                      const result = await api(
                        `/superadmin/staff/${r.userId}/reset-password`,
                        "POST",
                        {},
                      );
                      setCredentials({
                        name: r.user.name,
                        login: r.user.login,
                        password: result.temporary_password,
                      });
                    },
                    done: ctx.refresh,
                  })
                }
              >
                Parolni tiklash
              </Act>
            )}
          </>
        )}
      />
    </>
  );
}
