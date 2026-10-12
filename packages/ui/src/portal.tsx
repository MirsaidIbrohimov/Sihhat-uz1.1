"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChartNoAxesCombined,
  Check,
  CircleHelp,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  Eye,
  EyeOff,
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
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  can,
  restoreSession,
  type Actor,
} from "@sihhat/api-client";
import { useIdleSession } from "./session-idle";
import { ThemeToggle } from "./appearance";
import { PublicArticles } from "./articles";
import { TelegramSettings } from "./telegram";
import { AccountantReports } from "./accounting";
import { MyAccount, RoleGuide } from "./account";
import { TodayWork } from "./today";
import { newPasswordFields } from "./password-fields";
import "./portal-enhancements.css";
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
  {
    id: "articles",
    label: "Yangilik va tavsiyalar",
    icon: FileText,
    admin: true,
  },
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
  {
    id: "audit",
    label: "Amallar tarixi",
    icon: ShieldCheck,
    permission: "audit.read",
  },
  {
    id: "today",
    label: "Bugungi ishlar",
    icon: CalendarDays,
    permission: "bookings.read",
  },
  { id: "account", label: "Mening hisobim", icon: Settings },
  { id: "guide", label: "Foydalanish yo‘riqnomasi", icon: CircleHelp },
];
const navigationGroups = [
  {
    label: "Ish jarayoni",
    ids: [
      "dashboard",
      "today",
      "sanatoriums",
      "profile",
      "bookings",
      "inventory",
      "staff",
    ],
  },
  {
    label: "Moliya",
    ids: ["payments", "refunds", "payouts", "billing", "ads", "reconciliation"],
  },
  {
    label: "Aloqa",
    ids: [
      "messages",
      "articles",
      "tasks",
      "surveys",
      "reviews",
      "support",
      "notifications",
    ],
  },
  { label: "Sozlamalar", ids: ["account", "telegram", "audit", "guide"] },
];
function SidebarNavigation({
  items,
  section,
  accountant,
  go,
}: {
  items: typeof links;
  section: string;
  accountant: boolean;
  go: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    const group = navigationGroups.find((group) => group.ids.includes(section));
    if (group)
      setExpanded((previous) =>
        previous.includes(group.label) ? previous : [...previous, group.label],
      );
  }, [section]);
  return (
    <nav className="nav-list" aria-label="Asosiy menyu">
      {navigationGroups.map((group) => {
        const members = items.filter((item) => group.ids.includes(item.id));
        if (!members.length) return null;
        const open = expanded.includes(group.label);
        const id = `navigation-${group.ids[0]}`;
        return (
          <div className="nav-group" key={group.label}>
            <button
              type="button"
              className="nav-group-toggle"
              aria-expanded={open}
              aria-controls={id}
              onClick={() =>
                setExpanded((previous) =>
                  open
                    ? previous.filter((name) => name !== group.label)
                    : [...previous, group.label],
                )
              }
            >
              {group.label}
              <ChevronDown size={15} className={open ? "rotated" : ""} />
            </button>
            <div id={id} hidden={!open}>
              {members.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-link ${section === item.id ? "active" : ""}`}
                  aria-current={section === item.id ? "page" : undefined}
                  onClick={() => go(item.id)}
                >
                  <item.icon size={19} />
                  {accountant && item.id === "dashboard"
                    ? "Hisobotlar"
                    : item.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
function Login({
  mode,
  onLogin,
  notice,
}: {
  mode: "admin" | "partner";
  onLogin: (a: Actor) => void;
  notice?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
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
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <div className="login-art">
        <div className="brand">
          <img
            className="brand-logo"
            src="/branding/sihhat-logo.jpg"
            alt="Sihhat uz logosi"
            width={56}
            height={56}
          />
          <span>
            sihhat<span style={{ fontWeight: 400 }}>.uz</span>
          </span>
        </div>
        <div className="login-story">
          <p className="eyebrow">SOG‘LOM DAM OLISH, OSON BOSHQARUV</p>
          <h1>
            Sog‘lom dam olish.
            <br />
            Oson boshqaruv.
          </h1>
          <p>
            Sanatoriya ish jarayoni, bronlar va jamoangiz bilan aloqani
            Sihhat.uz orqali boshqaring.
          </p>
          <img
            className="login-illustration"
            src="/branding/welcome-retreat.png"
            alt=""
            width={560}
            height={360}
          />
        </div>
        <div className="login-foot">
          © {new Date().getFullYear()} Sihhat.uz · Sanatoriyalar platformasi
        </div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={login}>
          <img
            className="login-logo"
            src="/branding/sihhat-logo.jpg"
            alt="Sihhat uz logosi"
            width={112}
            height={112}
          />
          <p className="eyebrow">
            {mode === "admin" ? "SUPERADMIN PANELI" : "SANATORIYA PANELI"}
          </p>
          <h1>Xush kelibsiz</h1>
          <p className="muted">
            Ishni davom ettirish uchun hisobingizga kiring.
          </p>
          {notice && (
            <p className="alert-note" role="status">
              {notice}
            </p>
          )}
          <label className="field">
            <span>Login</span>
            <input name="login" required autoComplete="username" autoFocus />
          </label>
          <label className="field">
            <span>Parol</span>
            <span className="password-input">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"
                }
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
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
              <small>
                Telefoningizdagi Google Authenticator yoki Microsoft
                Authenticator ilovasining joriy 6 raqamli kodi.
              </small>
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
              minLength: 12,
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
    [smallScreen, setSmallScreen] = useState(false),
    [form, setForm] = useState<FormSpec | null>(null),
    [toast, setToast] = useState(""),
    [epoch, setEpoch] = useState(0),
    [idleNotice, setIdleNotice] = useState(""),
    [tenantError, setTenantError] = useState("");
  const sessionGeneration = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      setSmallScreen(media.matches);
      if (!media.matches) setMenu(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const clearSession = useCallback((reason = "") => {
    sessionGeneration.current++;
    setActor(null);
    setTenants([]);
    setForm(null);
    setMenu(false);
    setTenantError("");
    setIdleNotice(reason);
  }, []);
  const expired = useCallback(
    () => clearSession("Faolsizlik sababli hisobdan chiqdingiz. Qayta kiring."),
    [clearSession],
  );
  useIdleSession(actor, expired);
  const admin = mode === "admin";
  const refresh = useCallback(() => setEpoch((n) => n + 1), []);
  const notice = useCallback((s: string) => setToast(s), []);
  const session = useCallback(() => {
    const generation = sessionGeneration.current;
    return restoreSession()
      .then((a) => {
        if (sessionGeneration.current !== generation) return;
        if (a.kind !== (admin ? "SUPERADMIN" : "STAFF")) {
          setActor(null);
          return;
        }
        setActor(a);
      })
      .catch((error) => {
        if (sessionGeneration.current !== generation) return;
        clearSession(
          error instanceof ApiError && error.code === "SESSION_IDLE_EXPIRED"
            ? error.message
            : "",
        );
      })
      .finally(() => setReady(true));
  }, [admin, clearSession]);
  useEffect(() => {
    void session();
    const timer = setInterval(() => {
      void session();
    }, 45000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    const sync = () => {
      setSection(location.pathname.split("/")[1] || "dashboard");
      setEpoch((value) => value + 1);
    };
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
  const go = useCallback((id: string, params?: Record<string, string>) => {
    const suffix =
      params && Object.keys(params).length
        ? "?" + new URLSearchParams(params).toString()
        : "";
    window.history.pushState(
      {},
      "",
      (id === "dashboard" ? "/" : "/" + id) + suffix,
    );
    setSection(id);
    setMenu(false);
    setForm(null);
    setEpoch((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById("portal-sidebar");
    const buttons = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) ?? [],
      ).filter((node) => node.getClientRects().length > 0);
    buttons()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key !== "Tab") return;
      const nodes = buttons(),
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [menu]);
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
        notice={idleNotice}
        onLogin={(a) => {
          sessionGeneration.current++;
          setIdleNotice("");
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
  const accountant =
    !admin &&
    actor.memberships.find(
      (m) => m.sanatoriumId === tenant && m.status === "ACTIVE",
    )?.role === "ACCOUNTANT";
  const menuLinks = links.filter(
    (l) =>
      (!l.admin || admin) &&
      (!l.partner || !admin) &&
      (!accountant || ["dashboard", "account", "guide"].includes(l.id)) &&
      (accountant && l.id === "dashboard"
        ? allowed("reports.operational.read") ||
          allowed("reports.financial.read")
        : !l.permission || allowed(l.permission)),
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
        ...newPasswordFields,
      ],
      submit: (v) => {
        if (v.new_password !== v.confirm_password)
          throw new Error("Yangi parollar bir xil bo‘lsin.");
        return api("/auth/change-password", "POST", {
          current_password: v.current_password,
          new_password: v.new_password,
        });
      },
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
      case "account":
        return <MyAccount changePassword={changePassword} />;
      case "guide":
        return <RoleGuide />;
      case "today":
        return <TodayWork />;
      case "telegram":
        return <TelegramSettings />;
      case "dashboard":
        return accountant ? <AccountantReports /> : <Dashboard />;
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
        reloadActor: () => {
          void session();
        },
      }}
    >
      <div className="app-shell">
        <div
          className={`mobile-scrim ${menu ? "open" : ""}`}
          onClick={() => setMenu(false)}
        />
        <aside
          id="portal-sidebar"
          className={`sidebar ${menu ? "open" : ""}`}
          aria-label="Panel menyusi"
          inert={smallScreen && !menu}
          role={smallScreen && menu ? "dialog" : undefined}
          aria-modal={smallScreen && menu ? true : undefined}
        >
          <button
            type="button"
            className="icon-button sidebar-close"
            aria-label="Menyuni yopish"
            onClick={() => setMenu(false)}
          >
            <X size={19} />
          </button>
          <a
            href="/"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              go("dashboard");
            }}
          >
            <img
              className="brand-logo"
              src="/branding/sihhat-logo.jpg"
              alt="Sihhat uz logosi"
              width={56}
              height={56}
            />
            <span>
              sihhat<span style={{ fontWeight: 400 }}>.uz</span>
            </span>
          </a>
          <div className="brand-sub">
            <ShieldCheck size={17} aria-hidden="true" />
            {admin
              ? "Platforma boshqaruvi"
              : accountant
                ? "Hisobchi paneli"
                : "Sanatoriya boshqaruvi"}
          </div>
          <SidebarNavigation
            items={menuLinks}
            section={section}
            accountant={accountant}
            go={go}
          />
          <div className="sidebar-foot">
            <HeartPulse size={19} aria-hidden="true" />
            <div>
              <strong>Bron uchun komissiya — 0%</strong>
              <br />
              Sanatoriyalar bilan ochiq hamkorlik
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button menu-toggle"
                aria-label="Menyuni ochish"
                aria-controls="portal-sidebar"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Menu size={18} />
              </button>
              <div className="tenant-context">
                <Building2 size={19} />
                <div>
                  <span className="context-label">
                    {admin ? "Platforma boshqaruvi" : "Sanatoriya"}
                  </span>
                  <select
                    className="tenant-select"
                    aria-label="Sanatoriyani tanlash"
                    value={tenant}
                    onChange={(e) => {
                      setTenant(e.target.value);
                      refresh();
                    }}
                  >
                    {!tenants.length && (
                      <option value="">Sanatoriya yo‘q</option>
                    )}
                    {tenants.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="topbar-right">
              <ThemeToggle />
              {!accountant && (
                <button
                  className="icon-button"
                  aria-label="Bildirishnomalar"
                  onClick={() => go("notifications")}
                >
                  <Bell size={17} />
                </button>
              )}
              <div className="user-block">
                <div className="avatar">
                  {actor.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="user-name">{actor.name}</span>
                  <span className="user-role">
                    {admin
                      ? "SUPERADMIN"
                      : accountant
                        ? "HISOBCHI"
                        : actor.memberships.find(
                              (m) => m.sanatoriumId === tenant,
                            )?.role === "DIRECTOR"
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
                      clearSession();
                    })
                    .catch((e) => notice(e.message))
                }
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>
          <main
            className="content"
            data-section={section}
            inert={smallScreen && menu}
          >
            <div className="breadcrumb">
              {admin
                ? "Superadmin"
                : accountant
                  ? "Hisobchi"
                  : "Sanatoriya paneli"}
              <span>/</span>
              {accountant && section === "dashboard"
                ? "Hisobotlar"
                : menuLinks.find((item) => item.id === section)?.label}
            </div>
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
