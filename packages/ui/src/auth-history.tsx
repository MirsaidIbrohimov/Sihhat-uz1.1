"use client";
import { useState } from "react";
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
  LOGOUT: "Qo‘lda chiqish",
  REVOKE: "Qurilmani yopish",
  REVOKE_OTHERS: "Boshqa qurilmalarni yopish",
  ADMIN_REVOKE: "Superadmin yopdi",
  IDLE_EXPIRED: "Faolsizlik muddati",
};

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

export function DeviceCell({
  deviceLabel,
  channel,
  userAgent,
}: {
  deviceLabel?: string | null;
  channel?: string | null;
  userAgent?: string | null;
}) {
  const text = deviceLabel || (channel === "MOBILE" ? "Mobil ilova" : "Veb brauzer");
  const isMobile =
    channel === "MOBILE" || /android|iphone|ipad|mobile|ios|ilova/i.test(text);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8 }}
      title={userAgent || text}
    >
      {isMobile ? (
        <Smartphone size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
      ) : (
        <Laptop size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
      )}
      <div>
        <strong style={{ fontSize: 13 }}>{text}</strong>
        <span className="subcell">{channel === "MOBILE" ? "Mobil ilova" : "Veb panel"}</span>
      </div>
    </div>
  );
}

export function AuthHistoryPanel({
  mode,
  userId,
  title,
  showUserColumn = true,
  compact = false,
}: {
  mode: "superadmin" | "partner" | "self";
  userId?: string;
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
              : !userId && ctx.tenant
                ? ctx.tenant
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
        </div>
      </div>

      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
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
                label: "Qurilma",
                render: (r) => (
                  <DeviceCell
                    deviceLabel={r.deviceLabel}
                    channel={r.channel}
                    userAgent={r.userAgent}
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
  onClose,
}: {
  user: { id: string; name?: string | null; login?: string | null; publicId?: number | null };
  onClose: () => void;
}) {
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
            mode="superadmin"
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
