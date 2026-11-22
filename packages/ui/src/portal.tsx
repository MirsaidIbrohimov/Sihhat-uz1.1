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
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
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
import { portalSection, portalUrl } from "./portal-routes";
import { ThemeToggle } from "./appearance";
import { PartnerTerms, PartnerTermsDialog } from "./partner-terms";
import { TelegramSettings } from "./telegram";
import { AccountantReports } from "./accounting";
import { formatUserPublicId, getAvatarFallback, MyAccount, RoleGuide } from "./account";
import { TodayWork } from "./today";
import { newPasswordFields } from "./password-fields";
import "./portal-enhancements.css";
import {
  ErrorBox,
  FormDialog,
  Loading,
  PortalContext,
  label,
  type FormSpec,
  type Row,
} from "./components";
import {
  Dashboard,
  Sanatoriums,
  Profile,
  Staff,
  AppUsers,
  Inventory,
  Bookings,
  Payments,
  Finance,
  Billing,
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
    id: "app-users",
    label: "Ilova foydalanuvchilari",
    icon: Smartphone,
    admin: true,
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
  { id: "support", label: "Yordam va xabarlar", icon: MessageSquare, group: "Aloqa" },
  {
    id: "reviews",
    label: "Sharhlar",
    icon: HeartPulse,
    permission: "reviews.reply",
  },
  { id: "notifications", label: "Bildirishnomalar", icon: Bell },
  { id: "telegram", label: "Telegram bot", icon: Mail },
  {
    id: "partner-terms",
    label: "Hamkor shartlari",
    icon: FileCheck,
    partner: true,
  },
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
      "app-users",
    ],
  },
  {
    label: "Moliya",
    ids: ["payments", "refunds", "payouts", "billing", "ads", "reconciliation"],
  },
  {
    label: "Aloqa",
    ids: [
      "support",
      "reviews",
      "notifications",
    ],
  },
  {
    label: "Sozlamalar",
    ids: ["account", "telegram", "partner-terms", "audit", "guide"],
  },
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
    [showPassword, setShowPassword] = useState(false),
    [termsOpen, setTermsOpen] = useState(false),
    [forgotOpen, setForgotOpen] = useState(false),
    [forgotSuccess, setForgotSuccess] = useState("");
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await api("/auth/staff/login", "POST", {
        login: data.get("login"),
        password: data.get("password"),
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
          <span className="brand-logo-tile">
            <img
              className="brand-logo"
              src="/branding/sihhat-logo.jpg"
              alt="Sihhat uz logosi"
              width={56}
              height={56}
            />
          </span>
          <span>
            sihhat<span className="brand-uz">.uz</span>
          </span>
        </div>
        <div className="login-status-pill">
          <span className="status-pulse" aria-hidden="true" />
          {mode === "admin"
            ? "SIHHAT.UZ · SUPERADMIN PORTALI"
            : "SIHHAT.UZ · HAMKORLAR PORTALI"}
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
          <div className="login-highlights">
            {(mode === "admin"
              ? ["🛡️ Barcha sanatoriyalar", "💳 0% bron komissiyasi", "🤖 Telegram & AI"]
              : ["📅 Shaxmatka & Koyka CRM", "🏛 Kasaba uyushmalari", "🖨️ 1-klikda E-mehmon"]
            ).map((item) => (
              <span className="login-highlight-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
          <div className="login-art-frame">
            <img
              className="login-illustration"
              src="/branding/welcome-retreat.png"
              alt=""
              width={560}
              height={360}
            />
            <div className="login-art-overlay">
              <div>
                <strong>
                  {mode === "admin"
                    ? "Hostra & Render HTTPS Himoyalangan Seans"
                    : "0% Bron Komissiyasi · Shaffof Hamkorlik"}
                </strong>
                <span>
                  {mode === "admin"
                    ? "HttpOnly Cookie · CSRF · 5+ xato urinishda Email + Bot trevoga"
                    : "Butun xona, koyka-o‘rin, kutish ro‘yxati va E-mehmon anketasi"}
                </span>
              </div>
              <span className="badge green">Faol</span>
            </div>
          </div>
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
          {error && <ErrorBox message={error} />}
          {forgotSuccess && (
            <p className="alert-note" role="status">
              {forgotSuccess}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Tekshirilmoqda…" : "Kirish"}
            <ArrowRight size={16} />
          </button>
          <p className="login-note">
            {mode === "admin"
              ? "Platforma administratori xavfsiz kirish tizimi."
              : "Kirish ma’lumotlarini direktoringiz yoki administratordan oling."}
          </p>
          {mode === "partner" && (
            <div className="login-partner-links">
              <button
                type="button"
                className="terms-inline-link"
                onClick={() => {
                  setForgotSuccess("");
                  setForgotOpen(true);
                }}
              >
                Parolni unutdingizmi?
              </button>
              <button
                type="button"
                className="terms-inline-link"
                onClick={() => setTermsOpen(true)}
              >
                Hamkor shartlari bilan tanishish ↗
              </button>
            </div>
          )}
        </form>
      </div>
      {termsOpen && (
        <PartnerTermsDialog onClose={() => setTermsOpen(false)} />
      )}
      {forgotOpen && (
        <FormDialog
          onClose={() => setForgotOpen(false)}
          notice={() => undefined}
          spec={{
            title: "Parolni unutdingizmi?",
            description:
              "Tizimga kiradigan loginingizni kiriting. Xabar darhol superadminning elektron pochtasi va Telegram botiga yuboriladi.",
            button: "Superadminga xabar yuborish",
            fields: [
              {
                key: "login",
                label: "Loginingiz",
                required: true,
                minLength: 3,
                maxLength: 64,
                hint: "Masalan: zomin.direktor yoki resepsion logini",
              },
              {
                key: "phone",
                label: "Bog‘lanish telefoni (ixtiyoriy)",
                maxLength: 30,
                hint: "Masalan: +998901234567",
              },
              {
                key: "note",
                label: "Qo‘shimcha izoh (ixtiyoriy)",
                type: "textarea",
                maxLength: 300,
                hint: "Sanatoriya nomi yoki qo‘shimcha ma’lumot yozishingiz mumkin",
              },
            ],
            submit: async (values) =>
              api("/auth/partner-forgot-password", "POST", values),
            done: () => {
              setForgotSuccess(
                "So‘rov superadminga yuborildi. Administrator tez orada siz bilan bog‘lanib vaqtinchalik parol beradi.",
              );
            },
          }}
        />
      )}
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
              minLength: 8,
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
export function Portal({
  mode,
  basePath = "",
}: {
  mode: "admin" | "partner";
  basePath?: string;
}) {
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
    [tenantError, setTenantError] = useState(""),
    [cmdOpen, setCmdOpen] = useState(false),
    [cmdQuery, setCmdQuery] = useState("");
  const sessionGeneration = useRef(0);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCmdOpen((open) => !open);
        setCmdQuery("");
      } else if (event.key === "Escape" && cmdOpen) {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cmdOpen]);
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
        if (a.kind === "STAFF") {
          const active = a.memberships?.find((m: any) => m.status === "ACTIVE");
          if (active?.sanatoriumId) {
            setTenant((current) => current || active.sanatoriumId);
          }
        }
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
      setSection(portalSection(location.pathname, basePath));
      setEpoch((value) => value + 1);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [basePath]);
  const tenantInitRef = useRef(false);
  useEffect(() => {
    if (!actor || actor.mustChangePassword) return;
    api((admin ? "/superadmin" : "/partner") + "/sanatoriums?limit=100")
      .then((r) => {
        setTenants(r.data);
        setTenant((id) => {
          if (id && r.data.some((s: Row) => s.id === id)) {
            tenantInitRef.current = true;
            return id;
          }
          if (admin && tenantInitRef.current && id === "") {
            return "";
          }
          tenantInitRef.current = true;
          const userTenant = actor?.memberships?.find(
            (m) => m.status === "ACTIVE" && r.data.some((s: Row) => s.id === m.sanatoriumId)
          )?.sanatoriumId;
          return userTenant ?? r.data[0]?.id ?? "";
        });
        setTenantError("");
      })
      .catch((e) => setTenantError(e.message));
  }, [actor?.id, actor?.mustChangePassword, admin, epoch]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const go = useCallback(
    (id: string, params?: Record<string, string>) => {
      window.history.pushState({}, "", portalUrl(id, basePath, params));
      setSection(id);
      setMenu(false);
      setForm(null);
      setEpoch((value) => value + 1);
    },
    [basePath],
  );
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
  const activeStaffTenant = !admin
    ? (actor.memberships.find((m) => m.sanatoriumId === tenant && m.status === "ACTIVE")?.sanatoriumId ||
       actor.memberships.find((m) => m.status === "ACTIVE")?.sanatoriumId || "")
    : "";
  const effectiveTenant = tenant || activeStaffTenant;
  const allowed = (p: string) => can(actor, effectiveTenant, p);
  const accountant =
    !admin &&
    actor.memberships.find(
      (m) => m.sanatoriumId === effectiveTenant && m.status === "ACTIVE",
    )?.role === "ACCOUNTANT";
  const menuLinks = links.filter(
    (l) =>
      (!l.admin || admin) &&
      (!l.partner || !admin) &&
      (!accountant || ["dashboard", "account", "partner-terms", "guide"].includes(l.id)) &&
      (accountant && l.id === "dashboard"
        ? allowed("reports.operational.read") ||
          allowed("reports.financial.read")
        : !l.permission || allowed(l.permission)),
  );
  const authorized =
    menuLinks.some((l) => l.id === section) || section === "messages";
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
      case "partner-terms":
        return (
          <PartnerTerms
            onNavigate={go}
            allowed={allowed}
            canAccessSection={(s, p) =>
              menuLinks.some((l) => l.id === s) && (!p || allowed(p))
            }
          />
        );
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
      case "app-users":
        return <AppUsers />;
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
        return <Support initialTab="announcements" />;
      case "reviews":
        return <Reviews />;
      case "support":
        return <Support initialTab="chat" />;
      case "audit":
        return <Audit />;
      case "reconciliation":
        return <Reconciliation />;
      case "notifications":
        return <Notifications />;
      default:
        return null;
    }
  };
  return (
    <PortalContext.Provider
      value={{
        actor,
        tenant: effectiveTenant,
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
            href={portalUrl("dashboard", basePath)}
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              go("dashboard");
            }}
          >
            <span className="brand-logo-tile">
              <img
                className="brand-logo"
                src="/branding/sihhat-logo.jpg"
                alt="Sihhat uz logosi"
                width={56}
                height={56}
              />
            </span>
            <span>
              sihhat<span className="brand-uz">.uz</span>
            </span>
          </a>
          <div className="brand-sub">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>
              {admin
                ? "Platforma boshqaruvi"
                : accountant
                  ? "Hisobchi paneli"
                  : "Sanatoriya boshqaruvi"}
            </span>
            <span
              className="status-pulse"
              aria-hidden="true"
              style={{ marginLeft: "auto" }}
            />
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
              {!admin && (
                <div>
                  <button
                    type="button"
                    className="sidebar-foot-link"
                    onClick={() => go("partner-terms")}
                  >
                    Hamkor shartlari <ArrowRight size={13} />
                  </button>
                </div>
              )}
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
              {admin && ["bookings", "inventory", "staff", "today", "payments"].includes(section) ? (
                <div className="tenant-context">
                  <Building2 size={19} />
                  <div>
                    <span className="context-label">
                      Platforma boshqaruvi
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
                      <option value="">Barchasi</option>
                      {tenants.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                !admin &&
                tenants.length > 0 && (
                  <div className="tenant-context">
                    <Building2 size={19} />
                    <div>
                      <span className="context-label">Faol sanatoriya</span>
                      <strong style={{ fontSize: 13 }}>
                        {tenants.find((s) => s.id === effectiveTenant)?.name ??
                          tenants[0]?.name}
                      </strong>
                    </div>
                  </div>
                )
              )}
              <button
                type="button"
                className="command-search-trigger"
                aria-label="Tezkor bo‘limga o‘tish (Ctrl+K)"
                onClick={() => {
                  setCmdQuery("");
                  setCmdOpen(true);
                }}
              >
                <Search size={15} aria-hidden="true" />
                <span>Bo‘lim, bron yoki mijoz #ID...</span>
                <kbd>Ctrl + K</kbd>
              </button>
            </div>
            <div className="topbar-right">
              <div className="system-health-pill" aria-hidden="true">
                <span className="system-health-dot" />
                <span>
                  {admin
                    ? "API · Tezcheck · Telegram · v0.2.8"
                    : "Onlayn bron · Shaxmatka · E-mehmon"}
                </span>
              </div>
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
              <button
                type="button"
                className="user-block clickable"
                style={{ background: "transparent", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
                onClick={() => go("account")}
                title="Mening hisobim va profil rasmi"
              >
                <div className="avatar-wrap-v3">
                  <div className="avatar">
                    {actor.avatarUrl ?? getAvatarFallback(actor.id) ? (
                      <img
                        src={actor.avatarUrl ?? getAvatarFallback(actor.id) ?? ""}
                        alt={actor.name}
                      />
                    ) : (
                      actor.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span className="avatar-online-dot" aria-hidden="true" />
                </div>
                <div>
                  <span className="user-name">
                    {actor.name}{" "}
                    <span
                      className="id-chip"
                      aria-hidden="true"
                      style={{ marginLeft: 4 }}
                    >
                      #{formatUserPublicId(actor)}
                    </span>
                  </span>
                  <span className="user-role">
                    {admin
                      ? "SUPERADMIN"
                      : accountant
                        ? "HISOBCHI"
                        : (actor.memberships.find(
                              (m) => m.sanatoriumId === effectiveTenant && m.status === "ACTIVE",
                            )?.role === "DIRECTOR" ||
                           (!effectiveTenant && actor.memberships.some((m) => m.role === "DIRECTOR" && m.status === "ACTIVE")))
                          ? "DIREKTOR"
                          : (actor.memberships.find(
                                (m) => m.sanatoriumId === effectiveTenant && m.status === "ACTIVE",
                              )?.role === "RECEPTION" ||
                             (!effectiveTenant && actor.memberships.some((m) => m.role === "RECEPTION" && m.status === "ACTIVE")))
                            ? "RESEPSHN"
                            : (actor.memberships.find((m) => m.status === "ACTIVE")?.role
                                ? (label[actor.memberships.find((m) => m.status === "ACTIVE")!.role] ?? actor.memberships.find((m) => m.status === "ACTIVE")!.role).toUpperCase()
                                : "XODIM")}
                  </span>
                </div>
              </button>
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
            <div className="breadcrumb-bar-v3">
              <div className="breadcrumb">
                {admin
                  ? "Superadmin"
                  : accountant
                    ? "Hisobchi"
                    : "Sanatoriya paneli"}
                <span>/</span>
                {accountant && section === "dashboard"
                  ? "Hisobotlar"
                  : section === "messages"
                    ? "E’lonlar va xabarlar"
                    : menuLinks.find((item) => item.id === section)?.label}
              </div>
              <div className="breadcrumb-meta-v3" aria-hidden="true">
                <span>Asia/Tashkent · 0% komissiya · Jonli sinxronizatsiya</span>
              </div>
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
      {cmdOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCmdOpen(false)}
        >
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Tezkor bo‘limga o‘tish"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-palette-head">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                placeholder="Bo‘lim nomini yozing (masalan: Shaxmatka, Bronlar, Moliya)..."
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setCmdOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="command-palette-list">
              {menuLinks
                .filter((item) => {
                  const q = cmdQuery.trim().toLowerCase();
                  if (!q) return true;
                  const lbl =
                    accountant && item.id === "dashboard"
                      ? "hisobotlar"
                      : item.label.toLowerCase();
                  return lbl.includes(q) || item.id.toLowerCase().includes(q);
                })
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`command-palette-item ${section === item.id ? "active" : ""}`}
                    onClick={() => {
                      setCmdOpen(false);
                      go(item.id);
                    }}
                  >
                    <item.icon size={18} />
                    <span>
                      {accountant && item.id === "dashboard"
                        ? "Hisobotlar"
                        : item.label}
                    </span>
                    <small>{portalUrl(item.id, basePath)}</small>
                  </button>
                ))}
            </div>
          </section>
        </div>
      )}
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
