"use client";
import { useEffect, useState } from "react";
import {
  Globe,
  Laptop,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  TimerOff,
  X,
} from "lucide-react";
import { query } from "@sihhat/api-client";
import {
  Card,
  Empty,
  ErrorBox,
  Loading,
  Pager,
  Table,
  dateTime,
  usePortal,
  useRemote,
  type Row,
} from "./components";
import { formatUserPublicId } from "./account";

const EVENT_META: Record<
  string,
  { label: string; tone: "green" | "red" | "amber" | "gray"; kind: "in" | "out" | "revoked" | "expired" }
> = {
  LOGIN: { label: "Kirish", tone: "green", kind: "in" },
  LOGOUT: { label: "Chiqish", tone: "gray", kind: "out" },
  SESSION_REVOKED: { label: "Sessiya yopildi", tone: "amber", kind: "revoked" },
  SESSION_EXPIRED: { label: "Vaqt tugadi (chiqdi)", tone: "red", kind: "expired" },
};

const METHOD_LABELS: Record<string, string> = {
  PASSWORD: "Login / Parol",
  EMAIL_OTP: "Email OTP",
  SMS_OTP: "SMS OTP",
  OTP: "Bir martalik kod",
  LOGOUT: "Qo‘lda chiqish",
  REVOKE: "Qurilmani yopish",
  REVOKE_OTHERS: "Boshqa qurilmalarni yopish",
  ADMIN_REVOKE: "Superadmin yopdi",
  IDLE_EXPIRED: "Faolsizlik muddati",
};

function formatAuthHistoryError(message: string): string {
  if (/Cannot GET \/(?:auth\/login-history|superadmin\/auth-events|partner\/auth-events)/i.test(message)) {
    return "Kirish va chiqish tarixi endpointi API serverda hali yangilanmagan (404). Backend serverni oxirgi versiyaga yangilang.";
  }
  return message;
}

const USER_KIND_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  STAFF: "Hamkor xodim",
  CUSTOMER: "Ilova mijozi",
};

export function AuthEventBadge({ eventType }: { eventType: string }) {
  const meta = EVENT_META[eventType] ?? { label: eventType, tone: "gray" as const, kind: "out" as const };
  return (
    <span className={`badge ${meta.tone} auth-event-badge`}>
      {meta.kind === "in" ? (
        <LogIn size={12} />
      ) : meta.kind === "out" ? (
        <LogOut size={12} />
      ) : meta.kind === "revoked" ? (
        <ShieldAlert size={12} />
      ) : (
        <TimerOff size={12} />
      )}
      {meta.label}
    </span>
  );
}

const GENERIC_LABELS = new Set([
  "",
  "unknown",
  "web",
  "mobile",
  "brauzer",
  "veb brauzer",
  "veb panel",
  "mobil ilova",
  "noma’lum qurilma",
  "noma'lum qurilma",
  "brauzer · noma’lum qurilma",
  "brauzer · noma'lum qurilma",
]);

export function resolveClientDeviceDetails(input: {
  deviceLabel?: string | null;
  channel?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  deviceTypeLabel?: string | null;
  browser?: string | null;
  os?: string | null;
  channelLabel?: string | null;
  deviceSummary?: string | null;
}) {
  const ua = String(input.userAgent || "");
  const isMobileChannel = input.channel === "MOBILE";
  const rawLabel = String(input.deviceLabel || "").trim();
  const isGeneric = GENERIC_LABELS.has(rawLabel.toLowerCase());

  let browser = String(input.browser || "").trim();
  if (!browser) {
    if (isMobileChannel) {
      const ver = /v(\d+\.\d+(?:\.\d+)?)/i.exec(rawLabel)?.[1];
      browser = ver ? `Sihhat.uz ilovasi v${ver}` : "Sihhat.uz mobil ilovasi";
    } else if (/Edg\/([\d.]+)/i.test(ua)) {
      browser = `Microsoft Edge ${/Edg\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/OPR\/|Opera/i.test(ua)) {
      browser = `Opera ${/(?:OPR|Opera)\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/YaBrowser/i.test(ua)) {
      browser = `Yandex Browser ${/YaBrowser\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/SamsungBrowser/i.test(ua)) {
      browser = `Samsung Internet ${/SamsungBrowser\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/Firefox/i.test(ua)) {
      browser = `Mozilla Firefox ${/Firefox\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/Chrome/i.test(ua)) {
      browser = `Google Chrome ${/Chrome\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (/Safari/i.test(ua)) {
      browser = `Apple Safari ${/Version\/(\d+)/i.exec(ua)?.[1] ?? ""}`.trim();
    } else if (!isGeneric && rawLabel.includes("·")) {
      browser = rawLabel.split("·")[0].trim();
    } else {
      browser = isMobileChannel ? "Sihhat.uz mobil ilovasi" : "Veb brauzer";
    }
  }

  let os = String(input.os || "").trim();
  let deviceType = String(input.deviceType || "").trim();
  if (!os) {
    if (/iPad/i.test(ua) || /iPad/i.test(rawLabel)) {
      os = "iPad (iPadOS)";
      deviceType ||= "TABLET";
    } else if (/iPhone/i.test(ua) || /iPhone|iOS/i.test(rawLabel)) {
      os = "iPhone (iOS)";
      deviceType ||= "SMARTPHONE";
    } else if (/Android/i.test(ua) || /Android/i.test(rawLabel) || isMobileChannel) {
      const m =
        /Android\s+([\d.]+);\s*([^;)]+?)(?:\s+Build\/|\))/i.exec(ua) ??
        /Android\s*\(([^)]+)\)/i.exec(rawLabel);
      if (m && m.length >= 3) {
        const model = !/^K$|^wv$/i.test(m[2].trim()) ? m[2].trim() : "";
        os = model ? `Android ${m[1]} (${model})` : `Android ${m[1]}`;
      } else if (m && m[1]) {
        os = `Android (${m[1].trim()})`;
      } else {
        os = "Android smartfoni";
      }
      deviceType ||= /Tablet|Pad/i.test(ua) ? "TABLET" : "SMARTPHONE";
    } else if (/Windows/i.test(ua) || /Windows/i.test(rawLabel)) {
      os = /Windows NT 10\.0/i.test(ua) ? "Windows 10/11" : "Windows";
      deviceType ||= "DESKTOP";
    } else if (/Macintosh|Mac OS X/i.test(ua) || /macOS|Mac/i.test(rawLabel)) {
      os = "Apple macOS";
      deviceType ||= "DESKTOP";
    } else if (/Linux/i.test(ua) || /Linux/i.test(rawLabel)) {
      os = "Linux";
      deviceType ||= "DESKTOP";
    } else {
      os = isMobileChannel ? "Mobil tizim" : "Kompyuter tizimi";
      deviceType ||= isMobileChannel ? "SMARTPHONE" : "DESKTOP";
    }
  }

  const deviceTypeLabel =
    input.deviceTypeLabel ||
    (deviceType === "SMARTPHONE"
      ? "Smartfon"
      : deviceType === "TABLET"
        ? "Planshet"
        : "Kompyuter");
  const channelLabel =
    input.channelLabel ||
    (isMobileChannel ? "Sihhat.uz mobil ilovasi" : "Veb boshqaruv paneli");
  const title = !isGeneric
    ? rawLabel
    : isMobileChannel
      ? `${os} · Mobil ilova`
      : `${browser} · ${os}`;
  const description = `${deviceTypeLabel} · ${os} · ${browser}`;
  const isMobile =
    isMobileChannel ||
    deviceType === "SMARTPHONE" ||
    deviceType === "TABLET" ||
    /android|iphone|ipad|mobile|ios|ilova/i.test(title);

  return {
    title,
    deviceTypeLabel,
    os,
    browser,
    channelLabel,
    description,
    isMobile,
  };
}

export function DeviceCell({
  deviceLabel,
  channel,
  userAgent,
  deviceType,
  deviceTypeLabel,
  browser,
  os,
  channelLabel,
  deviceSummary,
  current,
  isOnline,
}: {
  deviceLabel?: string | null;
  channel?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  deviceTypeLabel?: string | null;
  browser?: string | null;
  os?: string | null;
  channelLabel?: string | null;
  deviceSummary?: string | null;
  current?: boolean;
  isOnline?: boolean;
}) {
  const details = resolveClientDeviceDetails({
    deviceLabel,
    channel,
    userAgent,
    deviceType,
    deviceTypeLabel,
    browser,
    os,
    channelLabel,
    deviceSummary,
  });
  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
      title={userAgent || details.description}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "var(--green-light)",
          color: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {details.isMobile ? <Smartphone size={16} /> : <Laptop size={16} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13, color: "var(--ink)" }}>{details.title}</strong>
          {current && (
            <span className="status-pill online" style={{ fontSize: 10.5, padding: "1px 7px" }}>
              <span className="status-dot" /> Joriy qurilma
            </span>
          )}
          {!current && isOnline && (
            <span className="badge green" style={{ fontSize: 10.5, padding: "1px 7px" }}>
              Onlayn
            </span>
          )}
        </div>
        <span className="subcell" style={{ display: "block", marginTop: 2 }}>
          {details.description}
        </span>
        <span className="subcell" style={{ display: "block", fontSize: 11, opacity: 0.88 }}>
          Kanal: {details.channelLabel}
        </span>
      </div>
    </div>
  );
}

export function ActiveDevicesSection({
  devices,
  lastDevice,
  lastDeviceSummary,
  lastIp,
  lastSeenAt,
  onOpenHistory,
}: {
  devices?: Row[] | null;
  lastDevice?: string | null;
  lastDeviceSummary?: string | null;
  lastIp?: string | null;
  lastSeenAt?: string | null;
  onOpenHistory?: () => void;
}) {
  const activeList = Array.isArray(devices) ? devices : [];
  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid var(--line)",
        background: "var(--soft)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <strong style={{ fontSize: 13, color: "var(--ink)" }}>
          Kirilgan qurilmalar va ta’rifi ({activeList.length} ta faol)
        </strong>
        {onOpenHistory && (
          <button
            type="button"
            className="text-button"
            style={{ fontSize: 12.5 }}
            onClick={onOpenHistory}
          >
            Kirish-chiqish tarixini ochish →
          </button>
        )}
      </div>
      {activeList.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeList.map((dev, idx) => (
            <div
              key={dev.id ?? idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                padding: "9px 11px",
                borderRadius: 11,
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <DeviceCell
                deviceLabel={dev.deviceLabel}
                channel={dev.channel}
                userAgent={dev.userAgent}
                deviceType={dev.deviceType}
                deviceTypeLabel={dev.deviceTypeLabel}
                browser={dev.browser}
                os={dev.os}
                channelLabel={dev.channelLabel}
                deviceSummary={dev.deviceSummary}
                isOnline={dev.isOnline}
              />
              <div style={{ textAlign: "right", fontSize: 11.5 }}>
                <span className="ip-chip">
                  <Globe size={11} />
                  {dev.ipAddress || "unknown"}
                </span>
                <div className="subcell" style={{ marginTop: 3 }}>
                  Faollik: {dateTime(dev.lastActivityAt || dev.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Hozirda ochiq sessiya yo‘q.
          {lastDevice ? (
            <span>
              {" "}Oxirgi kirilgan qurilma: <strong style={{ color: "var(--ink)" }}>{lastDevice}</strong>
              {lastDeviceSummary ? ` (${lastDeviceSummary})` : ""}
              {lastIp ? ` · IP: ${lastIp}` : ""}
              {lastSeenAt ? ` · ${dateTime(lastSeenAt)}` : ""}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AuthHistoryPanel({
  mode,
  userId,
  sanatoriumId,
  title,
  showUserColumn = true,
  compact = false,
}: {
  mode: "superadmin" | "partner" | "self";
  userId?: string;
  sanatoriumId?: string;
  title?: string;
  showUserColumn?: boolean;
  compact?: boolean;
}) {
  const ctx = usePortal();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [eventType, setEventType] = useState("");
  const [userKind, setUserKind] = useState("");
  const [selectedSanatorium, setSelectedSanatorium] = useState("");

  const controlledSanatorium = sanatoriumId !== undefined;
  const effectiveSuperadminSanatorium = controlledSanatorium
    ? sanatoriumId
    : selectedSanatorium;

  useEffect(() => {
    setPage(1);
  }, [sanatoriumId, userId, mode]);

  const endpoint =
    mode === "self"
      ? "/auth/login-history"
      : mode === "superadmin"
        ? "/superadmin/auth-events"
        : "/partner/auth-events";

  const params: Record<string, unknown> = {
    page,
    limit: compact ? 10 : 15,
    event_type: eventType || undefined,
    ...(mode !== "self"
      ? {
          q: q || undefined,
          user_id: userId || undefined,
          user_kind: mode === "superadmin" && !userId ? userKind || undefined : undefined,
          sanatorium_id:
            mode === "partner"
              ? ctx.tenant || undefined
              : !userId && effectiveSuperadminSanatorium
                ? effectiveSuperadminSanatorium
                : undefined,
        }
      : {}),
  };

  const remote = useRemote(endpoint + query(params), ctx.epoch);
  const rows: Row[] = remote.data?.data ?? [];

  return (
    <Card
      title={title ?? "Kirish va chiqish tarixi (Qurilma va IP manzil)"}
      aside={
        <button
          type="button"
          className="icon-button"
          aria-label="Yangilash"
          onClick={remote.reload}
        >
          <RefreshCw size={16} />
        </button>
      }
    >
      <div className="card-body" style={{ paddingBottom: 8 }}>
        <div className="toolbar" style={{ margin: 0, gap: 8, alignItems: "center" }}>
          {mode !== "self" && !userId && (
            <>
              <input
                type="search"
                placeholder="Ism, #ID, @username, email, IP yoki qurilma…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setQ(searchInput.trim());
                  }
                }}
                style={{ flex: "1 1 220px", minWidth: 180 }}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setPage(1);
                  setQ(searchInput.trim());
                }}
              >
                <Search size={15} /> Qidirish
              </button>
            </>
          )}
          <select
            aria-label="Hodisa turi"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Barcha hodisalar</option>
            <option value="LOGIN">Faqat kirishlar</option>
            <option value="LOGOUT">Faqat chiqishlar</option>
            <option value="SESSION_REVOKED">Sessiya yopilishi</option>
            <option value="SESSION_EXPIRED">Faolsizlik sabab chiqish</option>
          </select>
          {mode === "superadmin" && !userId && (
            <select
              aria-label="Hisob turi"
              value={userKind}
              onChange={(e) => {
                setUserKind(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Barcha hisoblar</option>
              <option value="SUPERADMIN">Superadmin</option>
              <option value="STAFF">Hamkor xodimlar</option>
              <option value="CUSTOMER">Ilova foydalanuvchilari</option>
            </select>
          )}
          {mode === "superadmin" && !userId && !controlledSanatorium && ctx.tenants.length > 0 && (
            <select
              aria-label="Sanatoriya bo‘yicha filtr"
              value={selectedSanatorium}
              onChange={(e) => {
                setSelectedSanatorium(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Barcha sanatoriyalar / Platforma</option>
              {ctx.tenants.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={formatAuthHistoryError(remote.error)} retry={remote.reload} />
      ) : !rows.length ? (
        <Empty text="Kirish va chiqish qaydlari hali mavjud emas" />
      ) : (
        <>
          <Table
            rows={rows}
            columns={[
              { label: "Vaqt", render: (r) => dateTime(r.createdAt) },
              ...(showUserColumn
                ? [
                    {
                      label: "Hisob",
                      render: (r: Row) => (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <strong>{r.userName || "Foydalanuvchi"}</strong>
                            {r.publicId && (
                              <span className="id-chip">#{formatUserPublicId({ id: r.userId, publicId: r.publicId })}</span>
                            )}
                          </div>
                          <span className="subcell">
                            {[
                              r.userKind ? USER_KIND_LABELS[r.userKind] ?? r.userKind : null,
                              r.userLogin ? `@${r.userLogin}` : null,
                              r.userEmail && r.userEmail !== r.userLogin ? r.userEmail : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      ),
                    },
                  ]
                : []),
              {
                label: "Hodisa",
                render: (r) => (
                  <div>
                    <AuthEventBadge eventType={r.eventType} />
                    {r.authMethod && (
                      <span className="subcell">
                        {METHOD_LABELS[r.authMethod] ?? r.authMethod}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                label: "Qurilma va ta’rifi",
                render: (r) => (
                  <DeviceCell
                    deviceLabel={r.deviceLabel}
                    channel={r.channel}
                    userAgent={r.userAgent}
                    deviceType={r.deviceType}
                    deviceTypeLabel={r.deviceTypeLabel}
                    browser={r.browser}
                    os={r.os}
                    channelLabel={r.channelLabel}
                    deviceSummary={r.deviceSummary}
                  />
                ),
              },
              {
                label: "IP manzil",
                render: (r) => (
                  <span className="ip-chip">
                    <Globe size={12} />
                    {r.ipAddress || "unknown"}
                  </span>
                ),
              },
              ...(mode !== "self"
                ? [
                    {
                      label: "Sanatoriya",
                      render: (r: Row) =>
                        r.sanatoriumName ??
                        (r.userKind === "CUSTOMER"
                          ? "Mobil ilova"
                          : "Platforma"),
                    },
                  ]
                : []),
            ]}
          />
          {remote.data && (
            <Pager
              page={page}
              pages={remote.data.pages ?? 1}
              total={remote.data.total ?? rows.length}
              onChange={setPage}
            />
          )}
        </>
      )}
    </Card>
  );
}

export function UserAuthHistoryModal({
  user,
  mode,
  onClose,
}: {
  user: { id: string; name?: string | null; login?: string | null; publicId?: number | null };
  mode?: "superadmin" | "partner";
  onClose: () => void;
}) {
  const ctx = usePortal();
  const resolvedMode = mode ?? (ctx.admin ? "superadmin" : "partner");
  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1200 }}
      onClick={onClose}
    >
      <section
        className="modal partner-reg-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${user.name || "Hisob"} kirish-chiqish tarixi`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2>{user.name || "Foydalanuvchi"} — Kirish va chiqish tarixi</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              ID: #{formatUserPublicId(user)}
              {user.login ? ` · @${user.login}` : ""} · Har bir kirish/chiqish qurilmasi va IP manzili
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Yopish"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="partner-reg-body">
          <AuthHistoryPanel
            mode={resolvedMode}
            userId={user.id}
            showUserColumn={false}
            compact
            title="Qurilmalar va IP manzillar jurnali"
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="button primary" onClick={onClose}>
            Yopish
          </button>
        </div>
      </section>
    </div>
  );
}
