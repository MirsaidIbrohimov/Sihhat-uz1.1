"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CircleHelp,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { api, can, restoreSession, type Actor } from "@sihhat/api-client";
import { PublicArticles } from "./articles";
import { TelegramSettings } from "./telegram";
import {
  ErrorBox,
  FormDialog,
  Loading,
  PortalContext,
  type FormSpec,
  type Row,
} from "./components";
import {
  Dashboard,
  Sanatoriums,
  Profile,
  Staff,
  Inventory,
  Bookings,
  Payments,
  Finance,
  Billing,
  Communications,
  Reviews,
  Support,
  Audit,
  Reconciliation,
  Notifications,
} from "./modules";

const links = [
  {
    id: "dashboard",
    label: "Umumiy ko‘rinish",
    icon: LayoutDashboard,
    permission: "reports.operational.read",
    group: "Ish jarayoni",
  },
  { id: "sanatoriums", label: "Sanatoriyalar", icon: Building2, admin: true },
  {
    id: "profile",
    label: "Sanatoriya profili",
    icon: Building2,
    partner: true,
    permission: "sanatorium.profile.edit",
  },
  {
    id: "bookings",
    label: "Bronlar",
    icon: BookOpen,
    permission: "bookings.read",
  },
  {
    id: "inventory",
    label: "Xonalar va tariflar",
    icon: CalendarDays,
    permission: "bookings.read",
  },
  {
    id: "staff",
    label: "Jamoa va ruxsatlar",
    icon: Users,
    permission: "staff.invite",
  },
  {
    id: "payments",
    label: "To‘lovlar",
    icon: CreditCard,
    permission: "payments.read",
    group: "Moliya",
  },
  { id: "refunds", label: "Pulni qaytarish", icon: Wallet, admin: true },
  {
    id: "payouts",
    label: "Sanatoriyaga o‘tkazma",
    icon: FileCheck,
    permission: "payouts.read",
  },
  {
    id: "billing",
    label: "Abonent va hisoblar",
    icon: FileText,
    permission: "invoices.read",
  },
  { id: "ads", label: "Reklama", icon: Megaphone, permission: "ads.request" },
  {
    id: "reconciliation",
    label: "To‘lovlarni solishtirish",
    icon: ChartNoAxesCombined,
    admin: true,
  },
  { id: "messages", label: "Xabarlar", icon: Mail, group: "Aloqa" },
  { id: "articles", label: "Yangilik va tavsiyalar", icon: FileText, admin: true },
  { id: "tasks", label: "Vazifalar", icon: ClipboardList },
  {
    id: "surveys",
    label: "Anketalar",
    icon: FileText,
    permission: "surveys.respond",
  },
  {
    id: "reviews",
    label: "Sharhlar",
    icon: HeartPulse,
    permission: "reviews.reply",
  },
  { id: "support", label: "Yordam xizmati", icon: CircleHelp },
  { id: "notifications", label: "Bildirishnomalar", icon: Bell },
  { id: "telegram", label: "Telegram bot", icon: Mail },
  { id: "audit", label: "Amallar tarixi", icon: ShieldCheck, admin: true },
];
function Login({
  mode,
  onLogin,
}: {
  mode: "admin" | "partner";
  onLogin: (a: Actor) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await api("/auth/staff/login", "POST", {
        login: data.get("login"),
        password: data.get("password"),
        ...(mode === "admin" ? { mfa_code: data.get("mfa_code") } : {}),
      });
      const actor = await restoreSession();
      if (actor.kind !== (mode === "admin" ? "SUPERADMIN" : "STAFF")) {
        await api("/auth/logout", "POST", {});
        throw new Error("Bu panel uchun tegishli xodim hisobi bilan kiring.");
      }
      onLogin(actor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-screen">
      <div className="login-art">
        <div className="brand">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          sihhat<span style={{ fontWeight: 400 }}>.uz</span>
        </div>
        <div className="login-story">
          <p className="eyebrow">SOG‘LOM DAM OLISH, OSON BOSHQARUV</p>
          <h1>
            Har bir mehmon.
            <br />
            Har bir xona.
            <br />
            Bir joyda.
          </h1>
          <p>
            Sanatoriya ish jarayoni, bronlar va jamoangiz bilan aloqani
            Sihhat.uz orqali boshqaring.
          </p>
        </div>
        <div className="login-foot">
          © {new Date().getFullYear()} Sihhat.uz · Sanatoriyalar platformasi
        </div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={login}>
          <p className="eyebrow">
            {mode === "admin" ? "SUPERADMIN PANELI" : "SANATORIYA PANELI"}
          </p>
          <h1>Xush kelibsiz</h1>
          <p className="muted">
            Ishni davom ettirish uchun hisobingizga kiring.
          </p>
          <label className="field">
            <span>Login</span>
            <input name="login" required autoComplete="username" autoFocus />
          </label>
          <label className="field">
            <span>Parol</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          {mode === "admin" && (
            <label className="field">
              <span>Autentifikator kodi</span>
              <input
                name="mfa_code"
                required
                pattern="[0-9]{6}"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <small>Autentifikator ilovasidagi joriy 6 raqamli kod.</small>
            </label>
          )}
          {error && <ErrorBox message={error} />}
          <button className="button primary" disabled={busy}>
            {busy ? "Tekshirilmoqda…" : "Kirish"}
            <ArrowRight size={16} />
          </button>
          <p className="login-note">
            {mode === "admin"
              ? "Ikki bosqichli himoya yoqilgan."
              : "Kirish ma’lumotlarini direktoringiz yoki administratordan oling."}
          </p>
        </form>
      </div>
    </div>
  );
}
function PasswordChange({ refresh }: { refresh: () => void }) {
  return (
    <div className="content">
      <div className="hero-card">
        <h1>Yangi parol o‘rnating</h1>
        <p>
          Vaqtinchalik parolni shaxsiy parolga almashtirgach, ish paneli
          ochiladi.
        </p>
      </div>
      <FormDialog
        spec={{
          title: "Parolni almashtirish",
          description: "Kamida 10 belgi, katta-kichik harf va raqam ishlating.",
          fields: [
            {
              key: "current_password",
              label: "Vaqtinchalik parol",
              type: "password",
              required: true,
            },
            {
              key: "new_password",
              label: "Yangi parol",
              type: "password",
              required: true,
              minLength: 10,
            },
          ],
          submit: (v) => api("/auth/change-password", "POST", v),
          done: refresh,
        }}
        onClose={refresh}
        notice={() => {}}
      />
    </div>
  );
}
export function Portal({ mode }: { mode: "admin" | "partner" }) {
  const [actor, setActor] = useState<Actor | null>(null),
    [ready, setReady] = useState(false),
    [tenants, setTenants] = useState<Row[]>([]),
    [tenant, setTenant] = useState(""),
    [section, setSection] = useState("dashboard"),
    [menu, setMenu] = useState(false),
    [form, setForm] = useState<FormSpec | null>(null),
    [toast, setToast] = useState(""),
    [epoch, setEpoch] = useState(0),
    [tenantError, setTenantError] = useState("");
  const admin = mode === "admin";
  const refresh = useCallback(() => setEpoch((n) => n + 1), []);
  const notice = useCallback((s: string) => setToast(s), []);
  const session = useCallback(
    () =>
      restoreSession()
        .then((a) => {
          if (a.kind !== (admin ? "SUPERADMIN" : "STAFF")) {
            setActor(null);
            return;
          }
          setActor(a);
        })
        .catch(() => setActor(null))
        .finally(() => setReady(true)),
    [admin],
  );
  useEffect(() => {
    void session();
    const timer = setInterval(() => {
      void session();
    }, 45000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    const sync = () =>
      setSection(location.pathname.split("/")[1] || "dashboard");
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (!actor || actor.mustChangePassword) return;
    api((admin ? "/superadmin" : "/partner") + "/sanatoriums?limit=100")
      .then((r) => {
        setTenants(r.data);
        setTenant((id) =>
          r.data.some((s: Row) => s.id === id) ? id : (r.data[0]?.id ?? ""),
        );
        setTenantError("");
      })
      .catch((e) => setTenantError(e.message));
  }, [actor?.id, actor?.mustChangePassword, admin, epoch]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const go = useCallback((id: string) => {
    window.history.pushState({}, "", id === "dashboard" ? "/" : "/" + id);
    setSection(id);
    setMenu(false);
  }, []);
  if (!ready)
    return (
      <div className="content">
        <Loading />
      </div>
    );
  if (!actor)
    return (
      <Login
        mode={mode}
        onLogin={(a) => {
          setActor(a);
          refresh();
        }}
      />
    );
  if (actor.mustChangePassword)
    return (
      <PasswordChange
        refresh={() => {
          void session();
        }}
      />
    );
  const allowed = (p: string) => can(actor, tenant, p);
  const menuLinks = links.filter(
    (l) =>
      (!l.admin || admin) &&
      (!l.partner || !admin) &&
      (!l.permission || allowed(l.permission)),
  );
  const authorized = menuLinks.some((l) => l.id === section);
  const changePassword = () =>
    setForm({
      title: "Parolni almashtirish",
      fields: [
        {
          key: "current_password",
          label: "Joriy parol",
          type: "password",
          required: true,
        },
        {
          key: "new_password",
          label: "Yangi parol",
          type: "password",
          required: true,
          minLength: 10,
        },
      ],
      submit: (v) => api("/auth/change-password", "POST", v),
      done: () => {
        void session();
      },
    });
  const content = () => {
    if (!authorized)
      return (
        <ErrorBox message="Bu sahifaga kirish uchun ruxsat yo‘q. Menyudan mavjud bo‘limni tanlang." />
      );
    switch (section) {
      case "telegram":
        return <TelegramSettings />;
      case "dashboard":
        return <Dashboard />;
      case "sanatoriums":
        return <Sanatoriums />;
      case "profile":
        return <Profile />;
      case "staff":
        return <Staff />;
      case "inventory":
        return <Inventory />;
      case "bookings":
        return <Bookings />;
      case "payments":
        return <Payments />;
      case "refunds":
      case "payouts":
        return <Finance kind={section} />;
      case "billing":
      case "ads":
        return <Billing kind={section} />;
      case "messages":
      case "tasks":
      case "surveys":
        return <Communications kind={section} />;
      case "reviews":
        return <Reviews />;
      case "support":
        return <Support />;
      case "audit":
        return <Audit />;
      case "reconciliation":
        return <Reconciliation />;
      case "notifications":
        return <Notifications />;
      case "articles":
        return <PublicArticles />;
      default:
        return null;
    }
  };
  return (
    <PortalContext.Provider
      value={{
        actor,
        tenant,
        tenants,
        admin,
        form: setForm,
        notice,
        refresh,
        epoch,
        go,
        allowed,
      }}
    >
      <div className="app-shell">
        <div
          className={`mobile-scrim ${menu ? "open" : ""}`}
          onClick={() => setMenu(false)}
        />
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <a
            href="/"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              go("dashboard");
            }}
          >
            <span className="brand-mark">
              <Activity size={23} />
            </span>
            sihhat<span style={{ fontWeight: 400 }}>.uz</span>
          </a>
          <div className="brand-sub">
            {admin ? "Platforma boshqaruvi" : "Sanatoriya boshqaruvi"}
          </div>
          <nav className="nav-list" aria-label="Asosiy menyu">
            {menuLinks.map((l) => (
              <div key={l.id}>
                {l.group && <div className="nav-group-title">{l.group}</div>}
                <button
                  className={`nav-link ${section === l.id ? "active" : ""}`}
                  aria-current={section === l.id ? "page" : undefined}
                  onClick={() => go(l.id)}
                >
                  <l.icon size={17} />
                  {l.label}
                </button>
              </div>
            ))}
          </nav>
          <div className="sidebar-foot">
            Bron uchun komissiya — 0%
            <br />
            Sanatoriyalar bilan ochiq hamkorlik
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button menu-toggle"
                aria-label="Menyuni ochish"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={18} />
              </button>
              <select
                className="tenant-select"
                aria-label="Sanatoriyani tanlash"
                value={tenant}
                onChange={(e) => {
                  setTenant(e.target.value);
                  refresh();
                }}
              >
                {!tenants.length && <option value="">Sanatoriya yo‘q</option>}
                {tenants.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="topbar-right">
              <button
                className="icon-button"
                aria-label="Bildirishnomalar"
                onClick={() => go("notifications")}
              >
                <Bell size={17} />
              </button>
              <div className="user-block">
                <div className="avatar">
                  {actor.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="user-name">{actor.name}</span>
                  <span className="user-role">
                    {admin
                      ? "SUPERADMIN"
                      : actor.memberships.find((m) => m.sanatoriumId === tenant)
                            ?.role === "DIRECTOR"
                        ? "DIREKTOR"
                        : "RESEPSHN"}
                  </span>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label="Parolni almashtirish"
                onClick={changePassword}
              >
                <Settings size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Chiqish"
                onClick={() =>
                  api("/auth/logout", "POST", {})
                    .then(() => {
                      setActor(null);
                      setTenants([]);
                    })
                    .catch((e) => notice(e.message))
                }
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>
          <main className="content">
            {tenantError && <ErrorBox message={tenantError} retry={refresh} />}{" "}
            {!admin && !tenant ? (
              <ErrorBox message="Faol sanatoriyaga kirish ruxsati yo‘q. Direktoringiz bilan bog‘laning." />
            ) : (
              content()
            )}
          </main>
        </div>
      </div>
      {form && (
        <FormDialog spec={form} onClose={() => setForm(null)} notice={notice} />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </PortalContext.Provider>
  );
}
