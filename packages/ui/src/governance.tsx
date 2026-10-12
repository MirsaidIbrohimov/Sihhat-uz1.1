"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BedDouble,
  BookOpen,
  CalendarDays,
  Clock,
  Coins,
  CreditCard,
  Download,
  FileText,
  Info,
  RotateCcw,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { api, formatMoney, query } from "@sihhat/api-client";
import { ProfileWizard } from "./wizard";
import { ListFilters, useSavedFilters } from "./list-filters";
import { newPasswordFields } from "./password-fields";
import { XlsxDownload } from "./report-download";
import { MerchantSetupPanel } from "./merchant-setup";
import { PhotoGallery } from "./photo-gallery";
import {
  facilityOptions,
  sanatoriumAmenities,
  sanatoriumServices,
} from "./sanatorium-options";
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
  StatValue,
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
const accountantDefaults = [
  "reports.operational.read",
  "reports.financial.read",
  "reports.export",
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
  const aiUsage = useRemote(
    ctx.admin ? "/superadmin/ai/usage" + query({ from, to }) : null,
    ctx.epoch,
  );
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
          <CalendarDays size={17} aria-hidden="true" />
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
                  icon: financial ? CreditCard : Users,
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
              ].map((s, index) => (
                <div
                  className={`stat-card ${index === 3 ? "featured-stat" : ""}`}
                  key={s.title}
                >
                  <div className="stat-icon">
                    <s.icon size={17} />
                  </div>
                  <div className="stat-label">{s.title}</div>
                  <StatValue value={s.value} />
                  <div className="stat-detail">{s.detail}</div>
                </div>
              ))}
            </div>
            <details className="report-context">
              <summary>
                <Info size={15} />
                Hisoblash tartibi · Toshkent vaqti
              </summary>
              <p>
                Hisobot Toshkent vaqti (UTC+5) bo‘yicha. Davrning oxirgi sanasi
                hisobga kirmaydi; ketish kuni yangi bron uchun ochiq.
              </p>
            </details>
            <div className="two-cols dashboard-main-grid">
              <Card
                title="Bronlar holati"
                className="dashboard-chart"
                aside={
                  <span className="period-pill">
                    {date(from)} — {date(to)}
                  </span>
                }
              >
                <p className="card-description">
                  Tanlangan davrga tegishli bronlar
                </p>
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
                                  170,
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
                  <div className="chart-legend">
                    <span>
                      Hisob mezoni:{" "}
                      {basis === "SERVICE"
                        ? "yashash davri"
                        : basis === "PAYMENT"
                          ? "to‘lov sanasi"
                          : "yaratilgan sana"}
                    </span>
                    <strong>Jami {r.bookings} ta bron</strong>
                  </div>
                </div>
              </Card>
              <Card
                className="dashboard-balances"
                title={
                  financial ? "Hisob-kitob qoldiqlari" : "Xonalar bandligi"
                }
              >
                <p className="card-description">
                  {financial
                    ? "Davr oxirigacha hisoblangan"
                    : "Sotiladigan xona-tunlar bo‘yicha"}
                </p>
                <div className="number-list">
                  {financial ? (
                    [
                      {
                        title: "Sof onlayn tushum",
                        value: r.net_online_receipts,
                        icon: CreditCard,
                      },
                      {
                        title: "Mijozga qaytarilgan",
                        value: r.refunds,
                        icon: RotateCcw,
                      },
                      {
                        title: "Refund majburiyati",
                        value: r.refund_payable,
                        icon: Clock,
                      },
                      {
                        title: "Bankka yuborilayotgan",
                        value: r.payout_in_transit,
                        icon: ArrowUpRight,
                      },
                      {
                        title: "Undiriladigan summa",
                        value: r.receivable,
                        icon: FileText,
                      },
                    ].map(({ title, value, icon: Icon }) => (
                      <div className="number-row" key={title}>
                        <span>
                          <Icon size={18} aria-hidden="true" />
                          {title}
                        </span>
                        <strong>{formatMoney(value)}</strong>
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
            <div className="two-cols dashboard-tools">
              {ctx.admin && (
                <Card
                  title="AI sarfi"
                  className="ai-card"
                  aside={<Sparkles size={19} />}
                >
                  {aiUsage.loading ? (
                    <Loading />
                  ) : aiUsage.error ? (
                    <ErrorBox message={aiUsage.error} retry={aiUsage.reload} />
                  ) : (
                    aiUsage.data && (
                      <>
                        <dl className="ai-metrics">
                          <div>
                            <dd>{aiUsage.data.requests}</dd>
                            <dt>so‘rov</dt>
                          </div>
                          <div>
                            <dd>{aiUsage.data.input_tokens}</dd>
                            <dt>kirish tokeni</dt>
                          </div>
                          <div>
                            <dd>{aiUsage.data.output_tokens}</dd>
                            <dt>chiqish tokeni</dt>
                          </div>
                        </dl>
                        <p className="muted ai-note">
                          Xarajat joriy sozlangan narxlar asosida taxmin
                          qilinadi. Provayder invoicei kelgach haqiqiy xarajat
                          aniqlanadi. {aiUsage.data.unmetered_requests} ta
                          so‘rovda token sarfi to‘liq olinmagan.
                        </p>
                        {!!aiUsage.data.groups?.length && (
                          <details className="ai-breakdown">
                            <summary>Model va xarajat tafsilotlari</summary>
                            <Table
                              rows={aiUsage.data.groups}
                              columns={[
                                { label: "Model", key: "model" },
                                { label: "Natija", key: "outcome" },
                                { label: "So‘rovlar", key: "requests" },
                                {
                                  label: "Taxminiy xarajat, USD",
                                  render: (row: Row) =>
                                    row.estimated_cost_usd ??
                                    "Narx yoki token sarfi mavjud emas",
                                },
                              ]}
                            />
                          </details>
                        )}
                      </>
                    )
                  )}
                </Card>
              )}
              {!ctx.admin && (
                <Card title="Tezkor amallar" aside={<BookOpen size={19} />}>
                  <div className="card-body quick-actions">
                    <p className="muted">
                      Kundalik ishlar uchun kerakli bo‘limni oching.
                    </p>
                    {ctx.allowed("bookings.read") && (
                      <button
                        className="button soft"
                        onClick={() => ctx.go("bookings")}
                      >
                        <BookOpen size={17} />
                        Bronlarni ko‘rish
                      </button>
                    )}
                    {ctx.allowed("inventory.manage") && (
                      <button
                        className="button soft"
                        onClick={() => ctx.go("inventory")}
                      >
                        <CalendarDays size={17} />
                        Xonalar va tariflar
                      </button>
                    )}
                  </div>
                </Card>
              )}
              {ctx.allowed("reports.export") && (
                <Card title="Hisobotni yuklash" aside={<FileText size={19} />}>
                  <div className="card-body export-card">
                    <XlsxDownload
                      href={
                        "/api/partner/reports/export.xlsx" +
                        query({
                          sanatorium_id: ctx.admin ? undefined : ctx.tenant,
                          from,
                          to,
                          financial: String(financial),
                          booking_basis: basis,
                        })
                      }
                    />
                    <p className="muted">
                      Tanlangan davr bo‘yicha CSV nusxasini saqlang.
                    </p>
                    <a
                      className="button soft"
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
                      <Download size={17} />
                      CSV hisobotni yuklash
                    </a>
                  </div>
                </Card>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
function FeaturedSanatoriumChoice({ row }: { row: Row }) {
  const ctx = usePortal();
  const [featured, setFeatured] = useState(row.featuredOnHome === true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => setFeatured(row.featuredOnHome === true),
    [row.featuredOnHome],
  );
  return (
    <div>
      <label className="featured-choice">
        <input
          type="checkbox"
          aria-label={`Mashhur sanatoriya: ${row.name}`}
          checked={featured}
          disabled={saving || !ctx.allowed("sanatoriums.manage")}
          onChange={async (event) => {
            const featured = event.target.checked;
            setFeatured(featured);
            setSaving(true);
            setError(null);
            try {
              await api(`/superadmin/sanatoriums/${row.id}/featured`, "PATCH", {
                version: row.version,
                featured,
              });
              ctx.notice(
                featured
                  ? "Mashhur sanatoriyalarga qo‘shildi."
                  : "Mashhur sanatoriyalardan chiqarildi.",
              );
              ctx.refresh();
            } catch (cause) {
              setFeatured(row.featuredOnHome === true);
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Tanlovni saqlab bo‘lmadi.",
              );
            } finally {
              setSaving(false);
            }
          }}
        />
        <span>{saving ? "Saqlanmoqda…" : "Bosh sahifada"}</span>
      </label>
      {error && (
        <span className="featured-choice-error" role="alert">
          {error}
        </span>
      )}
    </div>
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
        subtitle="Mashhur ustunidagi tick bilan bosh sahifa uchun sanatoriyalarni tanlang. Faqat faol va e’lon qilingan profillar ko‘rinadi; reklama bo‘lsa shu joyni egallaydi."
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
        title="Sanatoriyalar ro‘yxati"
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
            label: "Mashhur",
            render: (r) => <FeaturedSanatoriumChoice row={r} />,
          },
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
  {
    key: "name",
    label: "Sanatoriya nomi",
    required: true,
    minLength: 2,
    maxLength: 150,
  },
  {
    key: "description",
    label: "Tavsif",
    type: "textarea",
    required: true,
    minLength: 30,
    maxLength: 10000,
  },
  {
    key: "legal_name",
    label: "Yuridik nom",
    required: true,
    minLength: 2,
    maxLength: 150,
  },
  {
    key: "stir",
    label: "STIR",
    required: true,
    pattern: "[0-9]{9}",
    maxLength: 9,
    hint: "9 ta raqam",
  },
  {
    key: "region",
    label: "Hudud",
    required: true,
    minLength: 2,
    maxLength: 80,
  },
  {
    key: "address",
    label: "Manzil",
    required: true,
    minLength: 5,
    maxLength: 500,
  },
  {
    key: "map_url",
    label: "Google Maps yoki Yandex Maps havolasi",
    required: true,
    maxLength: 2048,
    hint: "Xaritada sanatoriya joyini tanlang, Ulashish tugmasidan havolani nusxalab shu yerga joylang.",
  },
  {
    key: "contact_phone",
    label: "Aloqa telefoni",
    required: true,
    pattern: "\\+998[0-9]{9}",
    hint: "+998901234567 shaklida kiriting",
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
    type: "checks",
    options: facilityOptions(sanatoriumAmenities),
    hint: "Sanatoriyada mavjud sharoitlarni belgilang. Belgilanmagan sharoit mavjud emas deb ko‘rsatiladi.",
  },
  {
    key: "services",
    label: "Xizmatlar",
    type: "checks",
    options: facilityOptions(sanatoriumServices),
    hint: "Haqiqatan ko‘rsatiladigan xizmatlarni belgilang. Narx va cheklovlarni tavsifda yozing.",
  },
  { key: "meals", label: "Ovqatlanish", type: "textarea", maxLength: 1000 },
  {
    key: "child_rules",
    label: "Bolalar qoidalari",
    type: "textarea",
    maxLength: 2000,
  },
  {
    key: "medical_requirements",
    label: "Tibbiy talablar",
    type: "textarea",
    maxLength: 2000,
  },
  {
    key: "directions",
    label: "Yetib borish",
    type: "textarea",
    maxLength: 2000,
  },
  {
    key: "required_documents",
    label: "Mehmon hujjatlari",
    type: "textarea",
    maxLength: 2000,
  },
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
    const uploaded = new Map<File, string>();
    ctx.form({
      title: kind === "photo" ? "Sanatoriya rasmini yuklash" : "Hujjat yuklash",
      fields: [
        {
          key: "file",
          label: "Fayl",
          type: "file",
          multiple: kind === "photo",
          required: true,
          accept:
            kind === "photo"
              ? "image/png,image/jpeg,image/webp"
              : "application/pdf,image/png,image/jpeg",
          hint:
            kind === "photo"
              ? "Bir vaqtning o‘zida 4 ta yoki undan ko‘p surat tanlang. Jami 30 tagacha; har biri 8 MBgacha."
              : "8 MB gacha. Hujjatlar faqat vakolatli xodimlarga ko‘rinadi.",
        },
      ],
      submit: async (v) => {
        const key = kind === "photo" ? "photo_ids" : "document_ids";
        const files: File[] = Array.isArray(v.file) ? v.file : [v.file];
        if (
          (data[key]?.length ?? 0) + files.length >
          (kind === "photo" ? 30 : 15)
        )
          throw new Error(
            kind === "photo"
              ? "Jami 30 tagacha surat yuklash mumkin."
              : "Jami 15 tagacha hujjat yuklash mumkin.",
          );
        for (const selected of files) {
          if (!uploaded.has(selected)) {
            const asset = await uploadAsset(
              selected,
              tenant,
              r.id,
              kind === "photo" ? "PUBLIC" : "PRIVATE",
            );
            uploaded.set(selected, asset.id);
          }
        }
        return api(`/partner/sanatorium-revisions/${r.id}`, "PATCH", {
          version: r.version,
          data: {
            [key]: [
              ...(data[key] ?? []),
              ...files.map((f) => uploaded.get(f)!),
            ],
          },
        });
      },
      done: ctx.refresh,
    });
  }
  if (editing && r)
    return (
      <ProfileWizard
        key={r.id}
        revision={r}
        fields={profileFields}
        onComplete={() => {
          setEditing(false);
          setTab("files");
          ctx.refresh();
        }}
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
                ctx.form({
                  title: "Profilni tekshiruvga yuborish",
                  description:
                    "Profil, rasmlar, hujjatlar, xona va tariflar tekshiriladi. Yetishmagan ma’lumotlar shu yerda ko‘rsatiladi.",
                  fields: [],
                  button: "Yuborish",
                  submit: () =>
                    api(
                      `/partner/sanatorium-revisions/${r.id}/submit`,
                      "POST",
                      { version: r.version },
                    ),
                  done: ctx.refresh,
                })
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
          <section className="profile-cover" aria-label="Sanatoriya haqida">
            <div>
              <p className="eyebrow">SIHHAT.UZ HAMKORI</p>
              <h2>{data.name ?? s.name}</h2>
              <p>
                {data.region ?? "Hudud kiritilmagan"} ·{" "}
                {data.address ?? "Manzil kiritilmagan"}
              </p>
              <Badge value={r.status} />
            </div>
            <img
              src={
                data.photo_ids?.[0]
                  ? `/api/media/${data.photo_ids[0]}`
                  : "/branding/welcome-retreat.png"
              }
              alt={data.photo_ids?.[0] ? "Sanatoriya muqovasi" : ""}
              width={230}
              height={130}
            />
          </section>
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
                <PhotoGallery
                  ids={data.photo_ids ?? []}
                  editable={
                    edit && ["DRAFT", "CHANGES_REQUESTED"].includes(r.status)
                  }
                  save={async (ids) => {
                    try {
                      await api(
                        `/partner/sanatorium-revisions/${r.id}`,
                        "PATCH",
                        { version: r.version, data: { photo_ids: ids } },
                      );
                      ctx.refresh();
                    } catch (error) {
                      ctx.notice(
                        error instanceof Error
                          ? error.message
                          : "Suratlarni saqlab bo‘lmadi.",
                      );
                      throw error;
                    }
                  }}
                />
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
            <>
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
                <div className="card-body muted">
                  Bank rekvizitlarini platforma superadmini tekshiradi va
                  tasdiqlaydi.
                  {ctx.admin
                    ? " Quyidagi kutilayotgan rekvizitlarni tekshirib, «Tasdiqlash» tugmasini bosing."
                    : " Tasdiqlangandan keyin holati yangilanadi."}
                </div>
                {banks.loading ? (
                  <Loading />
                ) : banks.error ? (
                  <ErrorBox message={banks.error} />
                ) : (
                  <Table
                    rows={list(banks.data)}
                    columns={[
                      {
                        label: "Yuridik nom",
                        render: (r) => r.data.legal_name,
                      },
                      { label: "Hisob raqami", render: (r) => r.data.account },
                      { label: "MFO", render: (r) => r.data.mfo },
                      { label: "STIR", render: (r) => r.data.stir },
                      {
                        label: "Holati",
                        render: (r) =>
                          r.status === "PENDING" ? (
                            "Superadmin tasdig‘i kutilmoqda"
                          ) : (
                            <Badge value={r.status} />
                          ),
                      },
                    ]}
                    actions={
                      ctx.admin
                        ? (r) =>
                            r.status === "PENDING" && (
                              <Act
                                onClick={() =>
                                  ctx.form({
                                    title: "Bank rekvizitini tasdiqlash",
                                    description:
                                      "Yuridik nom, hisob raqami, MFO va STIRni tekshirgandan keyin tasdiqlang.",
                                    fields: [],
                                    button: "Tasdiqlash",
                                    submit: () =>
                                      api(
                                        `/superadmin/bank-revisions/${r.id}/approve`,
                                        "POST",
                                        {},
                                      ),
                                    done: ctx.refresh,
                                  })
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
              {(ctx.admin || ctx.allowed("bank.request")) && (
                <MerchantSetupPanel tenant={tenant} banks={list(banks.data)} />
              )}
            </>
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
  const filters = useSavedFilters("staff", { status: "", role: "" });
  const [search, setSearch] = useState(""),
    [q, setQ] = useState("");
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
        ...(!director
          ? [
              {
                key: "role",
                label: "Lavozim",
                type: "select" as const,
                required: true,
                value: "RECEPTION",
                options: [
                  { value: "RECEPTION", label: "Resepshn" },
                  { value: "ACCOUNTANT", label: "Hisobchi" },
                ],
                hint: "Hisobchi faqat o‘z sanatoriyasining hisobotlarini ko‘radi va yuklaydi.",
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
        r.role === "DIRECTOR"
          ? Object.keys(permissions)
          : r.role === "ACCOUNTANT"
            ? accountantDefaults
            : receptionDefaults;
    ctx.form({
      title: `${r.user?.name} — ruxsatlar`,
      description: ctx.admin
        ? "Belgilanmagan vakolatga admin taqiqi qo‘yiladi."
        : "Admin tomonidan taqiqlangan vakolatlarni direktor bera olmaydi.",
      fields: [
        {
          key: "permissions",
          label: "Ruxsat etilgan amallar",
          type: "switches",
          value: selected,
          options: Object.entries(permissions)
            .filter(
              ([value]) =>
                r.role !== "ACCOUNTANT" || accountantDefaults.includes(value),
            )
            .map(([value, label]) => ({
              value,
              label,
              disabled:
                !ctx.admin &&
                (r.adminDenies.includes(value) ||
                  (r.ceiling.length && !r.ceiling.includes(value)) ||
                  !ctx.allowed(value)),
            })),
          hint: "Har bir ruxsatni tugma bilan yoqing yoki o‘chiring, so‘ng saqlang.",
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
        subtitle="Direktor, resepshn va hisobchi vakolatlari har bir amal uchun tekshiriladi."
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
        roles
        statuses={[
          "ACTIVE",
          "PENDING_APPROVAL",
          "REJECTED",
          "REVOKED",
          "BLOCKED",
        ]}
        placeholder="Xodim ismi, login yoki telefon"
      />
      <DataPanel
        key={ctx.tenant}
        path="/partner/staff"
        params={{
          sanatorium_id: ctx.tenant || undefined,
          q: q || undefined,
          status: filters.values.status || undefined,
          role: filters.values.role || undefined,
        }}
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
            {(ctx.admin || ["RECEPTION", "ACCOUNTANT"].includes(r.role)) &&
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
            {(ctx.admin ||
              (ctx.allowed("staff.reset") &&
                ["RECEPTION", "ACCOUNTANT"].includes(r.role) &&
                r.status === "ACTIVE")) && (
              <Act
                onClick={() =>
                  ctx.form({
                    title: "Parolni tiklash",
                    description: `${r.user.name} uchun yangi parol o‘rnating. Saqlangach kiritilgan parol amal qiladi va oldingi kirishlar yopiladi.`,
                    fields: newPasswordFields,
                    submit: (values) =>
                      api(
                        ctx.admin
                          ? `/superadmin/staff/${r.userId}/reset-password`
                          : `/partner/staff/${r.id}/reset-password`,
                        "POST",
                        values,
                      ),
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
