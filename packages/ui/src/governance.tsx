"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BedDouble,
  BookOpen,
  CalendarDays,
  Camera,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, formatMoney, query } from "@sihhat/api-client";
import { prepareAvatarDataUrl, validateAvatarFile } from "./avatar";
import { formatUserPublicId } from "./account";
import { ActiveDevicesSection, UserAuthHistoryModal } from "./auth-history";
import { ProfileWizard } from "./wizard";
import { ListFilters, useSavedFilters } from "./list-filters";
import { newPasswordFields } from "./password-fields";
import { XlsxDownload } from "./report-download";
import { EmailAvailabilityInput, LoginAvailabilityInput } from "./login-availability";
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
                  title: "To‘langan bronlar",
                  value: r.bookings,
                  detail:
                    label[basis] ??
                    (basis === "SERVICE"
                      ? "Yashash sanalari kesishgan bronlar"
                      : basis === "PAYMENT"
                        ? "To‘lov sanasi bo‘yicha"
                        : "Yaratilgan sana bo‘yicha"),
                  icon: BookOpen,
                  trend: "Faol oqim",
                  spark: "2,25 16,21 30,23 44,15 58,17 70,9 80,5",
                },
                {
                  title: "Xonalar bandligi",
                  value: `${(r.occupancy * 100).toFixed(1)}%`,
                  detail: `${r.room_nights} / ${r.sellable_room_nights} xona-tun`,
                  icon: BedDouble,
                  trend: `${r.guest_nights ?? 0} mehmon-tun`,
                  spark: "2,24 18,20 32,16 48,18 62,11 74,8 80,6",
                },
                {
                  title: financial ? "Bron aylanmasi (GMV)" : "Mehmon-tunlar",
                  value: financial ? formatMoney(r.gmv) : r.guest_nights,
                  detail: financial
                    ? "Tasdiqlangan onlayn to‘lovlar"
                    : "Davrga to‘g‘ri kelgan yashash",
                  icon: financial ? CreditCard : Users,
                  trend: "0% komissiya",
                  spark: "2,26 16,22 30,19 46,20 60,13 72,9 80,4",
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
                  trend: ctx.admin ? "Sof tushum" : "Balans",
                  spark: "2,25 18,21 34,17 50,14 66,10 80,3",
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
                  <div className="stat-mid-row">
                    <StatValue value={s.value} />
                    <svg
                      className="stat-sparkline"
                      viewBox="0 0 82 30"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d={`M${s.spark} L80,28 L2,28 Z`}
                        fill={
                          [
                            "rgba(129, 140, 248, 0.24)",
                            "rgba(56, 189, 248, 0.24)",
                            "rgba(52, 211, 153, 0.24)",
                            "rgba(255, 255, 255, 0.22)",
                          ][index % 4]
                        }
                      />
                      <polyline
                        points={s.spark}
                        fill="none"
                        stroke={["#818cf8", "#38bdf8", "#34d399", "#ffffff"][index % 4]}
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="stat-foot-row">
                    <span className="stat-trend-pill" aria-hidden="true">
                      {s.trend}
                    </span>
                    <div className="stat-detail">{s.detail}</div>
                  </div>
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
                title="To‘langan bronlar holati"
                className="dashboard-chart"
                aside={
                  <span className="period-pill">
                    {date(from)} — {date(to)}
                  </span>
                }
              >
                <p className="card-description">
                  Tanlangan davrga tegishli to‘langan bronlar
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
                    <Empty text="Bu davrda to‘langan bronlar yo‘q" />
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
                    <strong>Jami {r.bookings} ta to‘langan bron</strong>
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

function DeleteSanatoriumModal({
  target,
  onClose,
  onDeleted,
}: {
  target: any;
  onClose: () => void;
  onDeleted: (deletedId: string, name: string) => void;
}) {
  const [method, setMethod] = useState<"PASSWORD" | "EMAIL_CODE">("PASSWORD");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [reason, setReason] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !submitting && !sendingCode) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting, sendingCode]);

  async function handleSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      const res = await api<{
        sent: boolean;
        masked_email: string;
        resend_after?: number;
        demo_code?: string;
      }>(`/superadmin/sanatoriums/${target.id}/delete-code`, "POST", {});
      setCodeSent(true);
      setMaskedEmail(res.masked_email || "admin email");
      setDemoCode(res.demo_code ?? null);
      setCooldown(Number(res.resend_after ?? 30));
    } catch (err: any) {
      setError(err?.message || "Emailga tasdiqlash kodi yuborishda xatolik yuz berdi.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleConfirmDelete(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (method === "PASSWORD" && !password.trim()) {
      setError("Sanatoriyani o‘chirish uchun admin parolini kiriting.");
      return;
    }
    if (method === "EMAIL_CODE" && !/^\d{6}$/.test(emailCode.trim())) {
      setError("Emailga yuborilgan 6 xonali tasdiqlash kodini to‘liq kiriting.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> =
        method === "PASSWORD"
          ? { method: "PASSWORD", password }
          : { method: "EMAIL_CODE", email_code: emailCode.trim() };
      if (reason.trim()) {
        payload.reason = reason.trim();
      }
      await api(`/superadmin/sanatoriums/${target.id}/delete`, "POST", payload);
      onDeleted(target.id, target.name);
    } catch (err: any) {
      setError(err?.message || "Sanatoriyani o‘chirish bajarilmadi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-sanatorium-modal-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget && !submitting && !sendingCode) {
          onClose();
        }
      }}
    >
      <div className="modal" style={{ maxWidth: 520, width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#fef2f2",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={19} />
            </div>
            <div>
              <h2 id="delete-sanatorium-modal-title" style={{ margin: 0, fontSize: 18 }}>
                Sanatoriyani butunlay o‘chirish
              </h2>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                «{target.name}»
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Yopish"
            disabled={submitting || sendingCode}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13,
            color: "#991b1b",
            lineHeight: 1.55,
            marginBottom: 16,
          }}
        >
          <strong>Diqqat! Ushbu amalni ortga qaytarib bo‘lmaydi.</strong>
          <div style={{ marginTop: 4 }}>
            <strong>«{target.name}»</strong> sanatoriyasi, uning barcha xonalari, tariflari,
            suratlari va biriktirilgan xodim ruxsatlari tizimdan to‘liq o‘chiriladi. Davom etish
            uchun admin paroli yoki admin emailiga yuboriladigan tasdiqlash kodi orqali tasdiqlang.
          </div>
        </div>

        <div
          className="tabs"
          role="tablist"
          aria-label="Tasdiqlash usuli"
          style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "PASSWORD"}
            className={`tab ${method === "PASSWORD" ? "active" : ""}`}
            onClick={() => {
              setMethod("PASSWORD");
              setError(null);
            }}
          >
            <KeyRound size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Admin paroli
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "EMAIL_CODE"}
            className={`tab ${method === "EMAIL_CODE" ? "active" : ""}`}
            onClick={() => {
              setMethod("EMAIL_CODE");
              setError(null);
            }}
          >
            <ShieldCheck size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Email kodi orqali
          </button>
        </div>

        <form onSubmit={handleConfirmDelete}>
          {method === "PASSWORD" ? (
            <label className="field" style={{ marginBottom: 12 }}>
              <span>Admin joriy paroli *</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Superadmin parolini kiriting"
                  required
                  style={{ width: "100%", paddingRight: 42 }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    display: "grid",
                    placeItems: "center",
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  background: "var(--surface-soft, #f8fafc)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    {codeSent && maskedEmail ? (
                      <>
                        Tasdiqlash kodi <strong>{maskedEmail}</strong> manziliga yuborildi (5 daqiqa amal qiladi).
                      </>
                    ) : (
                      "Admin email manziliga 6 xonali tasdiqlash kodi yuboriladi."
                    )}
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={sendingCode || cooldown > 0 || submitting}
                    onClick={handleSendCode}
                  >
                    {sendingCode
                      ? "Yuborilmoqda..."
                      : cooldown > 0
                        ? `Qayta yuborish (${cooldown}s)`
                        : codeSent
                          ? "Kodni qayta yuborish"
                          : "Emailga kod yuborish"}
                  </button>
                </div>
                {demoCode && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "var(--green, #047857)",
                      fontWeight: 600,
                    }}
                  >
                    Test rejimi kodi: <code>{demoCode}</code>
                  </div>
                )}
              </div>

              <label className="field">
                <span>Emailga kelgan 6 xonali tasdiqlash kodi *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={emailCode}
                  onChange={(ev) => setEmailCode(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  style={{
                    letterSpacing: "0.32em",
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "center",
                  }}
                />
              </label>
            </div>
          )}

          <label className="field" style={{ marginBottom: 14 }}>
            <span>O‘chirish sababi (ixtiyoriy, audit jurnali uchun)</span>
            <input
              type="text"
              maxLength={300}
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              placeholder="Masalan: Sinov uchun ochilgan dublikat sanatoriya"
            />
          </label>

          {error && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              className="button secondary"
              disabled={submitting}
              onClick={onClose}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="button danger"
              disabled={
                submitting ||
                (method === "PASSWORD" ? !password.trim() : emailCode.trim().length !== 6)
              }
            >
              <Trash2 size={15} />
              {submitting ? "O‘chirilmoqda..." : "Sanatoriyani o‘chirish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Sanatoriums() {
  const ctx = usePortal(),
    action = useAction(),
    [selected, setSelected] = useState<string | null>(null),
    [deletingSanatorium, setDeletingSanatorium] = useState<any | null>(null);
  const pendingApps = useRemote(
    ctx.admin ? "/superadmin/partner-registrations?status=PENDING&limit=1" : null,
    ctx.epoch,
  );
  const pendingCount = Number(pendingApps.data?.pending_count ?? pendingApps.data?.total ?? 0);

  const handleSanatoriumDeleted = (deletedId: string, deletedName: string) => {
    setDeletingSanatorium(null);
    if (selected === deletedId) setSelected(null);
    ctx.notice(`«${deletedName}» sanatoriyasi tizimdan o‘chirildi.`);
    ctx.refresh();
  };

  if (selected)
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <button className="button secondary" onClick={() => setSelected(null)}>
            ← Sanatoriyalarga qaytish
          </button>
          {ctx.admin && (
            <button
              type="button"
              className="button danger"
              onClick={() =>
                setDeletingSanatorium({
                  id: selected,
                  name: ctx.tenants.find((t) => t.id === selected)?.name ?? "Tanlangan sanatoriya",
                })
              }
            >
              <Trash2 size={15} /> Sanatoriyani o‘chirish
            </button>
          )}
        </div>
        <Profile id={selected} />
        {deletingSanatorium && (
          <DeleteSanatoriumModal
            target={deletingSanatorium}
            onClose={() => setDeletingSanatorium(null)}
            onDeleted={handleSanatoriumDeleted}
          />
        )}
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
      {ctx.admin && pendingCount > 0 && (
        <div className="pending-reg-banner" role="status">
          <div>
            <strong>{pendingCount} ta yangi hamkor sanatoriya arizasi tasdiq kutmoqda</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Tasdiqlangandan so‘ng hamkor hisobi ochiladi, sanatoriya ro‘yxatga qo‘shilib foydalanuvchilarga ko‘rinadi va emailiga xabar boradi.
            </p>
          </div>
          <button
            type="button"
            className="button primary"
            onClick={() => ctx.go("partner-registrations")}
          >
            Hamkor arizalarini ko‘rish ({pendingCount}) →
          </button>
        </div>
      )}
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
            <Act danger onClick={() => setDeletingSanatorium(r)}>
              O‘chirish
            </Act>
          </>
        )}
      />
      {deletingSanatorium && (
        <DeleteSanatoriumModal
          target={deletingSanatorium}
          onClose={() => setDeletingSanatorium(null)}
          onDeleted={handleSanatoriumDeleted}
        />
      )}
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
    label: "Hamkor shartlari",
    type: "checkbox",
    required: true,
    hint: "Sihhat.uz Hamkor shartlarini o‘qidim va qabul qilaman",
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
                  : "/branding/sanatorium-default-cover.jpg"
              }
              alt={data.photo_ids?.[0] ? "Sanatoriya muqovasi" : "Sanatoriya standart muqovasi"}
              width={230}
              height={130}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = "1";
                img.src = "/branding/sanatorium-default-cover.jpg";
              }}
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
            {!ctx.admin && (
              <button
                type="button"
                className="button secondary"
                onClick={() => ctx.go("partner-terms")}
              >
                Hamkor shartlari
              </button>
            )}
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
    [credentials, setCredentials] = useState<Row | null>(null),
    [manageStaff, setManageStaff] = useState<Row | null>(null),
    [historyStaff, setHistoryStaff] = useState<Row | null>(null),
    [previewStaffUser, setPreviewStaffUser] = useState<{ row: Row; user: Row } | null>(null),
    [brokenStaffAvatars, setBrokenStaffAvatars] = useState<Record<string, boolean>>({});
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
                value: ctx.admin ? "DIRECTOR" : "RECEPTION",
                options: [
                  ...(ctx.admin ? [{ value: "DIRECTOR", label: "Direktor" }] : []),
                  { value: "RECEPTION", label: "Resepshn" },
                  { value: "ACCOUNTANT", label: "Hisobchi" },
                ],
                hint: ctx.admin
                  ? "Direktor sanatoriyani to‘liq boshqaradi. Resepshn va hisobchi cheklangan vakolatlarga ega."
                  : "Hisobchi faqat o‘z sanatoriyasining hisobotlarini ko‘radi va yuklaydi.",
              },
            ]
          : []),
        { key: "name", label: "Ism va familiya", required: true },
        {
          key: "login",
          label: "Login",
          required: true,
          minLength: 3,
          maxLength: 64,
          loginAvailabilityCheck: true,
          hint: "Kamida 3 belgi: lotin harflari, raqam, nuqta, pastki chiziq.",
        },
        {
          key: "email",
          label: "Elektron pochta (Email, ixtiyoriy)",
          type: "email" as const,
          required: false,
          maxLength: 120,
          emailAvailabilityCheck: true,
          hint: "Faqat boshqa hisobga ulanmagan email manzil kiritilishi mumkin.",
        },
        {
          key: "phone",
          label: "Telefon",
          required: true,
          pattern: "\\+998[0-9]{9}",
        },
      ],
      submit: async (v) => {
        const isDirector = director || v.role === "DIRECTOR";
        const payload = {
          sanatorium_id: ctx.tenant,
          ...v,
          ...(typeof v.email === "string" && v.email.trim()
            ? { email: v.email.trim().toLowerCase() }
            : { email: undefined }),
        };
        const r = await api(
          isDirector
            ? "/superadmin/director-assignments"
            : "/partner/staff-invitations",
          "POST",
          payload,
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
          <>
            <button className="button secondary" onClick={() => invite(true)}>
              Direktor tayinlash
            </button>
            <button
              className="button danger"
              onClick={() =>
                action(
                  "Barcha hisoblarni tozalash",
                  "/superadmin/maintenance/clear-accounts",
                  {},
                  [],
                  "POST",
                  () => {
                    ctx.notice("Barcha hisoblar tozalandi. Faqat superadmin qoldi.");
                    ctx.refresh();
                  },
                )
              }
            >
              Barcha hisoblarni tozalash
            </button>
          </>
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
        placeholder="Xodim ID raqami, ismi, login, email yoki telefon"
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
            render: (r) => {
              const u = r.user ?? {};
              const userId = String(u.id ?? r.userId ?? r.id ?? "");
              const hasAvatar = Boolean(u.avatarUrl) && !brokenStaffAvatars[userId];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="customer-avatar-wrap">
                    {hasAvatar ? (
                      <button
                        type="button"
                        className="customer-avatar-btn"
                        title="Xodim profil suratini ko‘rish"
                        onClick={() => setPreviewStaffUser({ row: r, user: u })}
                      >
                        <img
                          src={u.avatarUrl}
                          alt={u.name || "Xodim"}
                          className="customer-avatar-img"
                          onError={() =>
                            setBrokenStaffAvatars((prev) => ({
                              ...prev,
                              [userId]: true,
                            }))
                          }
                        />
                      </button>
                    ) : (
                      <div className="customer-avatar-fallback">
                        {(u.name || "X").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {u.isOnline && (
                      <span
                        title="Hozir tizimda (onlayn)"
                        className="customer-online-dot"
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <strong style={{ color: "var(--ink)" }}>{u.name ?? "Xodim"}</strong>
                      <span className="id-chip">#{formatUserPublicId(u)}</span>
                    </div>
                    <span className="subcell">
                      ID: #{formatUserPublicId(u)}
                      {u.login ? ` · @${u.login}` : ""}
                      {u.email && u.email !== u.login ? ` · ${u.email}` : ""}
                    </span>
                  </div>
                </div>
              );
            },
          },
          {
            label: "Telefon / Email",
            render: (r) => {
              const u = r.user ?? {};
              return (
                <div>
                  {u.phone ? (
                    <a
                      href={`tel:${u.phone}`}
                      style={{ color: "var(--green)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {u.phone}
                    </a>
                  ) : (
                    <span className="subcell">—</span>
                  )}
                  {u.email && (
                    <span className="subcell" style={{ display: "block" }}>
                      {u.email}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            label: "Sanatoriya",
            render: (r) =>
              ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ?? "—",
          },
          { label: "Lavozim", render: (r) => label[r.role] },
          {
            label: "Kirilgan qurilma",
            render: (r) => {
              const u = r.user ?? {};
              return (
                <div>
                  <strong style={{ fontSize: 12.5 }}>{u.device || "Veb panel"}</strong>
                  <span className="subcell" style={{ display: "block" }}>
                    {u.deviceSummary || (u.lastIp ? `IP: ${u.lastIp}` : "Sessiya ma’lumoti")}
                    {u.deviceSummary && u.lastIp ? ` · IP: ${u.lastIp}` : ""}
                  </span>
                </div>
              );
            },
          },
          statusColumn,
          { label: "Faol vakolatlar", render: (r) => r.permissions.length },
        ]}
        actions={(r) => (
          <>
            {ctx.admin && (
              <Act onClick={() => setManageStaff(r)}>Tahrirlash</Act>
            )}
            {(ctx.admin || ctx.allowed("audit.read")) && r.user?.id && (
              <Act onClick={() => setHistoryStaff(r.user)}>Kirish-chiqish tarixi</Act>
            )}
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
            {ctx.admin && r.role !== "DIRECTOR" && r.status === "ACTIVE" && (
              <Act
                onClick={() =>
                  ctx.form({
                    title: `${r.user?.name || "Xodim"}ni Direktor etib tayinlash`,
                    description: `${r.user?.name} mazkur sanatoriyaning direktori etib tayinlanadi va to‘liq boshqaruv vakolatiga ega bo‘ladi.`,
                    fields: [],
                    submit: async () => {
                      const res = await api<Row>(
                        `/superadmin/director-assignments`,
                        "POST",
                        {
                          sanatorium_id: r.sanatoriumId,
                          name: r.user?.name,
                          login: r.user?.login,
                          phone: r.user?.phone,
                        },
                      );
                      if (res?.temporary_password) {
                        setCredentials({
                          name: r.user?.name,
                          login: r.user?.login,
                          password: res.temporary_password,
                        });
                      }
                      return res;
                    },
                    done: ctx.refresh,
                  })
                }
              >
                Direktor qilish
              </Act>
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
      {manageStaff && (
        <StaffManageModal
          staff={manageStaff}
          sanatoriumName={
            ctx.tenants.find((s) => s.id === manageStaff.sanatoriumId)?.name ?? "—"
          }
          onClose={() => setManageStaff(null)}
          onRefresh={ctx.refresh}
          onEditPermissions={(row) => {
            setManageStaff(null);
            permissionEdit(row);
          }}
          notice={ctx.notice}
        />
      )}
      {historyStaff && (
        <UserAuthHistoryModal
          mode={ctx.admin ? "superadmin" : "partner"}
          user={{
            id: String(historyStaff.id),
            name: historyStaff.name,
            login: historyStaff.login,
            publicId: historyStaff.publicId,
          }}
          onClose={() => setHistoryStaff(null)}
        />
      )}
      {previewStaffUser && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewStaffUser(null)}
        >
          <section
            className="modal avatar-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${previewStaffUser.user.name} surati`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>
                  {previewStaffUser.user.name} · ID #{formatUserPublicId(previewStaffUser.user)}
                </h2>
                <p className="muted">
                  Xodim profil surati ({label[previewStaffUser.row.role] ?? previewStaffUser.row.role})
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setPreviewStaffUser(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="avatar-preview-box">
              <img
                src={previewStaffUser.user.avatarUrl}
                alt={previewStaffUser.user.name}
              />
            </div>
            {ctx.admin && (
              <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const target = previewStaffUser.row;
                    setPreviewStaffUser(null);
                    setManageStaff(target);
                  }}
                >
                  Tahrirlash va boshqarish
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function StaffManageModal({
  staff,
  sanatoriumName,
  onClose,
  onRefresh,
  onEditPermissions,
  notice,
}: {
  staff: Row;
  sanatoriumName: string;
  onClose: () => void;
  onRefresh: () => void;
  onEditPermissions?: (r: Row) => void;
  notice: (msg: string) => void;
}) {
  const u = staff.user ?? {};
  const staffUserId = String(u.id ?? staff.userId ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(String(u.name || ""));
  const [phone, setPhone] = useState(String(u.phone || ""));
  const [login, setLogin] = useState(String(u.login || ""));
  const [email, setEmail] = useState(String(u.email || ""));
  const [role, setRole] = useState(String(staff.role || "RECEPTION"));
  const [status, setStatus] = useState(String(staff.status || "ACTIVE"));
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(u.avatarUrl ?? null);
  const [sessionsCount, setSessionsCount] = useState<number>(
    Number(u.activeSessionsCount ?? 0),
  );
  const [activeDevices, setActiveDevices] = useState<Row[]>(
    Array.isArray(u.activeDevices) ? u.activeDevices : [],
  );
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loginVerifierRef = useRef<(() => Promise<string | null>) | null>(null);
  const emailVerifierRef = useRef<(() => Promise<string | null>) | null>(null);

  const registerLoginVerifier = useCallback(
    (_name: string, verifier: (() => Promise<string | null>) | null) => {
      loginVerifierRef.current = verifier;
    },
    [],
  );
  const registerEmailVerifier = useCallback(
    (_name: string, verifier: (() => Promise<string | null>) | null) => {
      emailVerifierRef.current = verifier;
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const removeAvatar = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api<Row>(
        `/superadmin/staff/${staff.id}`,
        "PATCH",
        { remove_avatar: true, avatarUrl: null },
      );
      setAvatarUrl(updated.avatarUrl ?? null);
      notice("Xodim profil rasmi o‘chirildi");
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const msg = validateAvatarFile(file);
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextUrl = await prepareAvatarDataUrl(file);
      const updated = await api<Row>(
        `/superadmin/staff/${staff.id}`,
        "PATCH",
        { avatarUrl: nextUrl },
      );
      setAvatarUrl(updated.avatarUrl ?? nextUrl);
      notice("Xodim profil rasmi yangilandi");
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (loginVerifierRef.current) {
        const loginErr = await loginVerifierRef.current();
        if (loginErr) {
          setError(loginErr);
          return;
        }
      }
      if (emailVerifierRef.current) {
        const emailErr = await emailVerifierRef.current();
        if (emailErr) {
          setError(emailErr);
          return;
        }
      }
      const trimmedPass = newPassword.trim();
      if (trimmedPass) {
        if (
          trimmedPass.length < 8 ||
          !/[a-z]/.test(trimmedPass) ||
          !/[A-Z]/.test(trimmedPass) ||
          !/[0-9]/.test(trimmedPass)
        ) {
          setError(
            "Yangi parol kamida 8 belgidan iborat bo‘lishi, katta/kichik lotin harfi va raqam qatnashishi kerak.",
          );
          return;
        }
      }
      await api(`/superadmin/staff/${staff.id}`, "PATCH", {
        name: name.trim(),
        phone: phone.trim() || null,
        login: login.trim().toLowerCase(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        role,
        status,
        ...(trimmedPass ? { new_password: trimmedPass } : {}),
      });
      notice(
        trimmedPass
          ? "Xodim ma’lumotlari va yangi paroli saqlandi"
          : "Xodim ma’lumotlari saqlandi",
      );
      onRefresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revokeSessions = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ success: boolean; revoked_count?: number }>(
        `/superadmin/staff/${staff.id}/revoke-sessions`,
        "POST",
        {},
      );
      setSessionsCount(0);
      setActiveDevices([]);
      notice(
        res.revoked_count
          ? `${res.revoked_count} ta faol sessiya yopildi`
          : "Faol sessiyalar topilmadi",
      );
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="modal customer-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${u.name || "Xodim"} — Xodim hisobini tahrirlash`}
      >
        <div className="modal-heading">
          <div>
            <h2>
              {u.name || "Xodim"} · ID #{formatUserPublicId(u)}
            </h2>
            <p className="muted">
              {sanatoriumName} · Xodim profil rasmi, login, parol, email va lavozim tahriri.
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Yopish"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarPicked}
        />

        <div className="customer-manage-photo">
          <div className="customer-manage-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name || "Xodim"} />
            ) : (
              <span>{(name || "X").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="customer-manage-photo-meta">
            <strong>Xodim profil surati</strong>
            <p className="muted">
              {avatarUrl
                ? "Xodim profil surati o‘rnatilgan (chat va panelda ko‘rinadi)."
                : "Xodim profil rasmi o‘rnatilmagan yoki o‘chirilgan."}
            </p>
            <div className="customer-manage-photo-buttons">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={15} />{" "}
                {avatarUrl ? "Rasmni almashtirish" : "Rasm yuklash"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="button danger-soft"
                  disabled={busy}
                  onClick={removeAvatar}
                >
                  <Trash2 size={15} /> Rasmni o‘chirish
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={saveStaff} className="customer-manage-form">
          <div className="form-grid">
            <label className="field">
              <span>
                To‘liq ism va familiya <b className="required">*</b>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>
                Login (kirish logini) <b className="required">*</b>
              </span>
              <LoginAvailabilityInput
                name="login"
                defaultValue={String(u.login || "")}
                required
                disabled={busy}
                excludeUserId={staffUserId}
                onValueChange={setLogin}
                onRegisterVerifier={registerLoginVerifier}
                hint="Kamida 3 belgi: lotin harflari, raqam, . _ -"
              />
            </label>
            <label className="field">
              <span>Elektron pochta (Email)</span>
              <EmailAvailabilityInput
                name="email"
                defaultValue={String(u.email || "")}
                placeholder="xodim@sihhat.uz"
                disabled={busy}
                excludeUserId={staffUserId}
                onValueChange={setEmail}
                onRegisterVerifier={registerEmailVerifier}
              />
            </label>
            <label className="field">
              <span>Telefon raqam</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Lavozim</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={busy}
              >
                <option value="DIRECTOR">Direktor</option>
                <option value="RECEPTION">Resepshn</option>
                <option value="ACCOUNTANT">Hisobchi</option>
              </select>
            </label>
            <label className="field">
              <span>Hisob holati</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
              >
                <option value="ACTIVE">Faol (ACTIVE)</option>
                <option value="PENDING_APPROVAL">Tasdiq kutilmoqda</option>
                <option value="BLOCKED">Bloklangan (BLOCKED)</option>
              </select>
            </label>
            <div className="field wide">
              <span>
                <KeyRound size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Yangi parol o‘rnatish (ixtiyoriy)
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="O‘zgartirish uchun yangi parol kiriting (masalan: Sihhat2026!)"
                  autoComplete="new-password"
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                  style={{ padding: "10px 14px", flexShrink: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <small>
                Bo‘sh qoldirilsa joriy parol o‘zgarmaydi. Kiritilsa kamida 8 belgi (katta/kichik harf va raqam) bo‘lishi kerak.
              </small>
            </div>
          </div>

          <div className="customer-manage-summary">
            <span>
              ID: <strong>#{formatUserPublicId(u)}</strong>
            </span>
            <span>
              Sanatoriya: <strong>{sanatoriumName}</strong>
            </span>
            <span>
              Vakolatlar: <strong>{staff.permissions?.length ?? 0} ta</strong>
            </span>
            <span>
              Faol sessiyalar: <strong>{sessionsCount} ta</strong>
            </span>
          </div>

          <ActiveDevicesSection
            devices={activeDevices}
            lastDevice={u.device}
            lastDeviceSummary={u.deviceSummary}
            lastIp={u.lastIp}
            lastSeenAt={u.lastSeenAt}
            onOpenHistory={staffUserId ? () => setShowHistory(true) : undefined}
          />

          {error && <ErrorBox message={error} />}

          <div className="customer-manage-footer">
            <div className="customer-manage-actions">
              {onEditPermissions && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => onEditPermissions(staff)}
                >
                  <ShieldCheck size={15} /> Ruxsatlarni sozlash
                </button>
              )}
              <button
                type="button"
                className="button secondary"
                disabled={busy || sessionsCount === 0}
                onClick={revokeSessions}
              >
                <LogOut size={15} /> Sessiyalarni yopish
              </button>
            </div>
            <div className="customer-manage-save">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={onClose}
              >
                Yopish
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </div>
        </form>
        {showHistory && staffUserId && (
          <UserAuthHistoryModal
            mode="superadmin"
            user={{
              id: staffUserId,
              name: u.name,
              login: u.login,
              publicId: u.publicId,
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </section>
    </div>
  );
}

function CustomerManageModal({
  user,
  onClose,
  onRefresh,
  onToggleStatus,
  onDelete,
  notice,
}: {
  user: Row;
  onClose: () => void;
  onRefresh: () => void;
  onToggleStatus: (r: Row) => void;
  onDelete: (r: Row) => void;
  notice: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(String(user.name || ""));
  const [phone, setPhone] = useState(String(user.phone || ""));
  const [login, setLogin] = useState(String(user.login || ""));
  const [email, setEmail] = useState(String(user.email || ""));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? null,
  );
  const [sessionsCount, setSessionsCount] = useState<number>(
    Number(user.activeSessionsCount ?? 0),
  );
  const [activeDevices, setActiveDevices] = useState<Row[]>(
    Array.isArray(user.activeDevices) ? user.activeDevices : [],
  );
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loginVerifierRef = useRef<(() => Promise<string | null>) | null>(null);
  const emailVerifierRef = useRef<(() => Promise<string | null>) | null>(null);
  const registerLoginVerifier = useCallback(
    (_name: string, verifier: (() => Promise<string | null>) | null) => {
      loginVerifierRef.current = verifier;
    },
    [],
  );
  const registerEmailVerifier = useCallback(
    (_name: string, verifier: (() => Promise<string | null>) | null) => {
      emailVerifierRef.current = verifier;
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const removeAvatar = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api<Row>(
        `/superadmin/customers/${user.id}`,
        "PATCH",
        { remove_avatar: true, avatarUrl: null },
      );
      setAvatarUrl(updated.avatarUrl ?? null);
      notice("Foydalanuvchi profil rasmi o‘chirildi");
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const msg = validateAvatarFile(file);
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextUrl = await prepareAvatarDataUrl(file);
      const updated = await api<Row>(
        `/superadmin/customers/${user.id}`,
        "PATCH",
        { avatarUrl: nextUrl },
      );
      setAvatarUrl(updated.avatarUrl ?? nextUrl);
      notice("Foydalanuvchi profil rasmi yangilandi");
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (login.trim() && loginVerifierRef.current) {
        const loginErr = await loginVerifierRef.current();
        if (loginErr) {
          setError(loginErr);
          return;
        }
      }
      if (emailVerifierRef.current) {
        const emailErr = await emailVerifierRef.current();
        if (emailErr) {
          setError(emailErr);
          return;
        }
      }
      await api(`/superadmin/customers/${user.id}`, "PATCH", {
        name: name.trim(),
        phone: phone.trim() || null,
        login: login.trim() ? login.trim().toLowerCase() : null,
        email: email.trim() ? email.trim().toLowerCase() : null,
      });
      notice("Foydalanuvchi ma’lumotlari saqlandi");
      onRefresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revokeSessions = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ success: boolean; revoked_count?: number }>(
        `/superadmin/customers/${user.id}/revoke-sessions`,
        "POST",
        {},
      );
      setSessionsCount(0);
      setActiveDevices([]);
      notice(
        res.revoked_count
          ? `${res.revoked_count} ta faol sessiya yopildi`
          : "Faol sessiyalar topilmadi",
      );
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="modal customer-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${user.name} — Foydalanuvchini boshqarish`}
      >
        <div className="modal-heading">
          <div>
            <h2>
              {user.name} · ID #{formatUserPublicId(user)}
            </h2>
            <p className="muted">
              Profil rasmi, shaxsiy ma’lumotlar, faol sessiyalar va holat nazorati.
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Yopish"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarPicked}
        />

        <div className="customer-manage-photo">
          <div className="customer-manage-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} />
            ) : (
              <span>{(name || "M").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="customer-manage-photo-meta">
            <strong>Profil surati</strong>
            <p className="muted">
              {avatarUrl
                ? "Foydalanuvchi ilovadan profil suratini o‘rnatgan."
                : "Foydalanuvchi profil rasmi o‘rnatilmagan yoki o‘chirilgan."}
            </p>
            <div className="customer-manage-photo-buttons">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={15} /> {avatarUrl ? "Rasmni almashtirish" : "Rasm yuklash"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="button danger-soft"
                  disabled={busy}
                  onClick={removeAvatar}
                >
                  <Trash2 size={15} /> Rasmni o‘chirish
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="customer-manage-form">
          <div className="form-grid">
            <label className="field">
              <span>
                To‘liq ism <b className="required">*</b>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Telefon raqam</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Login (ilova username)</span>
              <LoginAvailabilityInput
                name="login"
                defaultValue={String(user.login || "")}
                placeholder="foydalanuvchi_logini"
                disabled={busy}
                excludeUserId={String(user.id)}
                onValueChange={setLogin}
                onRegisterVerifier={registerLoginVerifier}
              />
            </label>
            <label className="field">
              <span>Elektron pochta (Email)</span>
              <EmailAvailabilityInput
                name="email"
                defaultValue={String(user.email || "")}
                placeholder="user@example.com"
                disabled={busy}
                excludeUserId={String(user.id)}
                onValueChange={setEmail}
                onRegisterVerifier={registerEmailVerifier}
              />
            </label>
          </div>

          <div className="customer-manage-summary">
            <span>ID: <strong>#{formatUserPublicId(user)}</strong></span>
            <span>Holat: <strong>{user.status === "ACTIVE" ? "Faol" : "Bloklangan"}</strong></span>
            <span>Bronlar: <strong>{user.bookingsCount ?? 0} ta</strong></span>
            <span>Murojaatlar: <strong>{user.ticketsCount ?? 0} ta</strong></span>
            <span>Faol sessiyalar: <strong>{sessionsCount} ta</strong></span>
          </div>

          <ActiveDevicesSection
            devices={activeDevices}
            lastDevice={user.device}
            lastDeviceSummary={user.deviceSummary}
            lastIp={user.lastIp}
            lastSeenAt={user.lastSeenAt}
            onOpenHistory={user.id ? () => setShowHistory(true) : undefined}
          />

          {error && <ErrorBox message={error} />}

          <div className="customer-manage-footer">
            <div className="customer-manage-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy || sessionsCount === 0}
                onClick={revokeSessions}
              >
                <LogOut size={15} /> Sessiyalarni yopish
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onToggleStatus(user);
                }}
              >
                {user.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
              </button>
              <button
                type="button"
                className="button danger-soft"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onDelete(user);
                }}
              >
                <Trash2 size={15} /> Hisobni o‘chirish
              </button>
            </div>
            <div className="customer-manage-save">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={onClose}
              >
                Yopish
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </div>
        </form>
        {showHistory && user.id && (
          <UserAuthHistoryModal
            mode="superadmin"
            user={{
              id: String(user.id),
              name: user.name,
              login: user.login,
              publicId: user.publicId,
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </section>
    </div>
  );
}

export function AppUsers() {
  const ctx = usePortal();
  const filters = useSavedFilters("app-users", { status: "" });
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [manageUser, setManageUser] = useState<Row | null>(null),
    [historyUser, setHistoryUser] = useState<Row | null>(null),
    [previewUser, setPreviewUser] = useState<Row | null>(null),
    [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

  function editUser(r: Row) {
    setManageUser(r);
  }

  function toggleStatus(r: Row) {
    const isBlock = r.status === "ACTIVE";
    ctx.form({
      title: isBlock ? "Foydalanuvchini bloklash" : "Foydalanuvchini faollashtirish",
      description: isBlock
        ? `${r.name} ilovaga kira olmaydi va barcha faol seanslari bekor qilinadi.`
        : `${r.name} hisobi qayta faollashtiriladi.`,
      fields: [
        {
          key: "reason",
          label: "Sabab / Izoh",
          type: "textarea",
          required: isBlock,
          value: isBlock ? "Qoidabuzarlik yoki admin cheklovi" : "Cheklov bekor qilindi",
        },
      ],
      submit: (v) =>
        api(`/superadmin/customers/${r.id}/toggle-status`, "POST", {
          status: isBlock ? "BLOCKED" : "ACTIVE",
          reason: v.reason,
        }),
      done: ctx.refresh,
    });
  }

  function deleteUser(r: Row) {
    ctx.form({
      title: "Foydalanuvchini butunlay o‘chirish",
      description: `«${r.name}» (${r.phone || r.login || "ID: #" + formatUserPublicId(r)}) hisobini tizimdan butunlay o‘chirib tashlamoqchimisiz? Barcha faol seanslari, yordam xabarlari va shaxsiy ma’lumotlari to‘liq o‘chiriladi. Ushbu amalni ortga qaytarib bo‘lmaydi.`,
      fields: [],
      button: "Ha, butunlay o‘chirilsin",
      submit: () => api(`/superadmin/customers/${r.id}`, "DELETE", {}),
      done: ctx.refresh,
    });
  }

  return (
    <>
      <PageHeading
        title="Ilova foydalanuvchilari"
        subtitle="Mobil ilovadan ro‘yxatdan o‘tgan mijozlar ro‘yxati, ularning buyurtmalari va tizimdagi holati nazorati."
      />
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
        statuses={["ACTIVE", "BLOCKED"]}
        placeholder="Mijoz ID raqami, ismi, login, email yoki telefon"
      />
      <DataPanel
        path="/superadmin/customers"
        params={{
          q: q || undefined,
          status: filters.values.status || undefined,
        }}
        columns={[
          {
            label: "Foydalanuvchi",
            render: (r) => {
              const hasAvatar = Boolean(r.avatarUrl) && !brokenAvatars[r.id];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="customer-avatar-wrap">
                    {hasAvatar ? (
                      <button
                        type="button"
                        className="customer-avatar-btn"
                        title="Profil suratini ko‘rish"
                        onClick={() => setPreviewUser(r)}
                      >
                        <img
                          src={r.avatarUrl}
                          alt={r.name}
                          className="customer-avatar-img"
                          onError={() =>
                            setBrokenAvatars((prev) => ({
                              ...prev,
                              [r.id]: true,
                            }))
                          }
                        />
                      </button>
                    ) : (
                      <div className="customer-avatar-fallback">
                        {(r.name || "M").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {r.isOnline && (
                      <span
                        title="Hozir tizimda (onlayn)"
                        className="customer-online-dot"
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <strong style={{ color: "var(--ink)" }}>{r.name}</strong>
                      <span className="id-chip">#{formatUserPublicId(r)}</span>
                    </div>
                    <span className="subcell">
                      ID: #{formatUserPublicId(r)} {r.login ? `· @${r.login}` : ""}
                      {r.email && r.email !== r.login ? ` · ${r.email}` : ""}
                    </span>
                  </div>
                </div>
              );
            },
          },
          {
            label: "Telefon",
            render: (r) =>
              r.phone ? (
                <a href={`tel:${r.phone}`} style={{ color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>
                  {r.phone}
                </a>
              ) : (
                <span className="subcell">—</span>
              ),
          },
          {
            label: "Bronlar",
            render: (r) => (
              <span
                style={{
                  background: r.bookingsCount > 0 ? "var(--green-light)" : "var(--soft)",
                  color: r.bookingsCount > 0 ? "var(--green)" : "var(--muted)",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
                title={r.bookingsCount > 0 ? `${r.bookingsCount} ta to‘langan bron` : "To‘langan bron yo‘q"}
              >
                {r.bookingsCount} ta
              </span>
            ),
          },
          {
            label: "Murojaatlar",
            render: (r) => (
              <span
                style={{
                  background: r.ticketsCount > 0 ? "var(--warning-bg)" : "var(--soft)",
                  color: r.ticketsCount > 0 ? "var(--warning-ink)" : "var(--muted)",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {r.ticketsCount} ta
              </span>
            ),
          },
          {
            label: "Ro‘yxatdan o‘tgan",
            render: (r) => date(r.createdAt),
          },
          {
            label: "Oxirgi faollik va qurilma",
            render: (r) => (
              <div>
                <div>{date(r.lastSeenAt)}</div>
                <strong style={{ fontSize: 12.5, display: "block", marginTop: 2 }}>
                  {r.device}
                </strong>
                <span className="subcell">
                  {r.deviceSummary ? `${r.deviceSummary}` : ""}
                  {r.lastIp ? `${r.deviceSummary ? " · " : ""}IP: ${r.lastIp}` : ""}
                </span>
              </div>
            ),
          },
          statusColumn,
        ]}
        actions={(r) => (
          <>
            <Act onClick={() => editUser(r)}>Tahrirlash</Act>
            <Act onClick={() => setHistoryUser(r)}>Kirish-chiqish tarixi</Act>
            <Act
              danger={r.status === "ACTIVE"}
              onClick={() => toggleStatus(r)}
            >
              {r.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
            </Act>
            <Act
              danger
              onClick={() => deleteUser(r)}
            >
              O‘chirish
            </Act>
          </>
        )}
      />
      {manageUser && (
        <CustomerManageModal
          user={manageUser}
          onClose={() => setManageUser(null)}
          onRefresh={ctx.refresh}
          onToggleStatus={toggleStatus}
          onDelete={deleteUser}
          notice={ctx.notice}
        />
      )}
      {historyUser && (
        <UserAuthHistoryModal
          user={{
            id: String(historyUser.id),
            name: historyUser.name,
            login: historyUser.login,
            publicId: historyUser.publicId,
          }}
          onClose={() => setHistoryUser(null)}
        />
      )}
      {previewUser && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewUser(null)}
        >
          <section
            className="modal avatar-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${previewUser.name} surati`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>{previewUser.name}</h2>
                <p className="muted">Foydalanuvchi profil surati</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setPreviewUser(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="avatar-preview-box">
              <img src={previewUser.avatarUrl} alt={previewUser.name} />
            </div>
            <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  const target = previewUser;
                  setPreviewUser(null);
                  editUser(target);
                }}
              >
                Tahrirlash va boshqarish
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function QuickAccountProfileModal({
  match,
  onClose,
}: {
  match: Row;
  onClose: () => void;
}) {
  const ctx = usePortal();
  const [showHistory, setShowHistory] = useState(false);

  if (ctx.admin && match.matchType === "PARTNER" && match.staff) {
    const st = match.staff;
    const sanName =
      st.sanatoriumName ??
      ctx.tenants.find((s) => s.id === st.sanatoriumId)?.name ??
      "Sanatoriya";
    const openPermissions = (r: Row) => {
      const defaults =
        r.role === "DIRECTOR"
          ? Object.keys(permissions)
          : r.role === "ACCOUNTANT"
            ? accountantDefaults
            : receptionDefaults;
      const selected = Array.from(
        new Set([...defaults, ...(r.grants ?? [])]),
      ).filter(
        (p) =>
          !(r.denies ?? []).includes(p) &&
          !(r.adminDenies ?? []).includes(p) &&
          (!r.ceiling?.length || r.ceiling.includes(p)) &&
          (r.role !== "ACCOUNTANT" || accountantDefaults.includes(p)),
      );
      onClose();
      ctx.form({
        title: `${r.user?.name || "Xodim"} ruxsatlari`,
        description:
          "Har bir ruxsatni yoqish yoki o‘chirish orqali vakolatlarni belgilang.",
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
              .map(([value, lbl]) => ({ value, label: lbl })),
          },
        ],
        submit: (v) => {
          const picked = v.permissions as string[];
          return api(`/partner/staff/${r.id}/permissions`, "PATCH", {
            version: r.version,
            grants: picked.filter((p) => !defaults.includes(p)),
            denies: defaults.filter((p) => !picked.includes(p)),
          });
        },
        done: ctx.refresh,
      });
    };
    return (
      <StaffManageModal
        staff={st}
        sanatoriumName={sanName}
        onClose={onClose}
        onRefresh={ctx.refresh}
        onEditPermissions={openPermissions}
        notice={ctx.notice}
      />
    );
  }

  if (ctx.admin && match.matchType === "USER" && match.user) {
    const u = match.user;
    const toggleStatus = (r: Row) => {
      const isBlock = r.status === "ACTIVE";
      ctx.form({
        title: isBlock ? "Foydalanuvchini bloklash" : "Foydalanuvchini faollashtirish",
        description: isBlock
          ? `${r.name} ilovaga kira olmaydi va barcha faol seanslari bekor qilinadi.`
          : `${r.name} hisobi qayta faollashtiriladi.`,
        fields: [
          {
            key: "reason",
            label: "Sabab / Izoh",
            type: "textarea",
            required: isBlock,
            value: isBlock ? "Qoidabuzarlik yoki admin cheklovi" : "Cheklov bekor qilindi",
          },
        ],
        submit: (v) =>
          api(`/superadmin/customers/${r.id}/toggle-status`, "POST", {
            status: isBlock ? "BLOCKED" : "ACTIVE",
            reason: v.reason,
          }),
        done: ctx.refresh,
      });
    };
    const deleteUser = (r: Row) => {
      ctx.form({
        title: "Foydalanuvchini butunlay o‘chirish",
        description: `«${r.name}» (ID: #${formatUserPublicId(r)}) hisobini tizimdan butunlay o‘chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo‘lmaydi.`,
        fields: [],
        button: "Ha, butunlay o‘chirilsin",
        submit: () => api(`/superadmin/customers/${r.id}`, "DELETE", {}),
        done: ctx.refresh,
      });
    };
    return (
      <CustomerManageModal
        user={u}
        onClose={onClose}
        onRefresh={ctx.refresh}
        onToggleStatus={toggleStatus}
        onDelete={deleteUser}
        notice={ctx.notice}
      />
    );
  }

  const u = match.user ?? {};
  const st = match.staff;
  const isPartner = match.matchType === "PARTNER";
  const canSeeHistory =
    ctx.admin ||
    u.id === ctx.actor.id ||
    (isPartner && ctx.allowed("audit.read"));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal customer-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${u.name || "Foydalanuvchi"} profili`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2>
              {u.name || "Foydalanuvchi"} · ID #{formatUserPublicId(u)}
            </h2>
            <p className="muted">
              {isPartner
                ? `Hamkor xodimi (${label[st?.role] ?? st?.role ?? "Xodim"}${st?.sanatoriumName ? ` · ${st.sanatoriumName}` : ""})`
                : "Ilova foydalanuvchisi (Mijoz) profili"}
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Yopish"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="customer-manage-photo">
          <div className="customer-manage-avatar">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.name || "Profil"} />
            ) : (
              <span>{(u.name || "U").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="customer-manage-photo-meta">
            <strong>{u.name || "Foydalanuvchi"}</strong>
            <p className="muted">
              ID: <strong>#{formatUserPublicId(u)}</strong>
              {u.login ? ` · @${u.login}` : ""}
              {u.isOnline ? " · Hozir onlayn" : ""}
            </p>
          </div>
        </div>

        <div className="customer-manage-form">
          <div className="customer-manage-summary">
            <span>Telefon: <strong>{u.phone || "—"}</strong></span>
            <span>Email: <strong>{u.email || "—"}</strong></span>
            <span>Holat: <strong>{label[st?.status ?? u.status] ?? u.status ?? "Faol"}</strong></span>
            {!isPartner && (
              <>
                <span>Bronlar: <strong>{u.bookingsCount ?? 0} ta</strong></span>
                <span>Murojaatlar: <strong>{u.ticketsCount ?? 0} ta</strong></span>
              </>
            )}
          </div>

          {canSeeHistory && (
            <ActiveDevicesSection
              devices={u.activeDevices}
              lastDevice={u.device}
              lastDeviceSummary={u.deviceSummary}
              lastIp={u.lastIp}
              lastSeenAt={u.lastSeenAt}
              onOpenHistory={u.id ? () => setShowHistory(true) : undefined}
            />
          )}

          <div className="customer-manage-footer">
            <div className="customer-manage-actions">
              {isPartner && ctx.allowed("staff.invite") && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    onClose();
                    ctx.go("staff");
                  }}
                >
                  <Users size={15} /> Jamoa bo‘limida ko‘rish
                </button>
              )}
              {!isPartner && ctx.allowed("bookings.read") && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    onClose();
                    ctx.go("bookings");
                  }}
                >
                  <BookOpen size={15} /> Bronlar bo‘limiga o‘tish
                </button>
              )}
            </div>
            <div className="customer-manage-save">
              <button type="button" className="button primary" onClick={onClose}>
                Yopish
              </button>
            </div>
          </div>
        </div>

        {showHistory && u.id && (
          <UserAuthHistoryModal
            mode={ctx.admin ? "superadmin" : "partner"}
            user={{
              id: String(u.id),
              name: u.name,
              login: u.login,
              publicId: u.publicId,
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </section>
    </div>
  );
}

