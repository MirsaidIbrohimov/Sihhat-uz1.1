"use client";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  KeyRound,
  Laptop,
  Megaphone,
  MessageSquare,
  Monitor,
  Newspaper,
  Search,
  ShieldCheck,
  Smartphone,
  User,
  Users,
} from "lucide-react";
import { api } from "@sihhat/api-client";
import {
  Act,
  Card,
  dateTime,
  ErrorBox,
  label,
  Loading,
  PageHeading,
  Table,
  usePortal,
  useRemote,
} from "./components";

export function MyAccount({ changePassword }: { changePassword: () => void }) {
  const ctx = usePortal(),
    sessions = useRemote("/auth/sessions", ctx.epoch);
  const role = ctx.admin
    ? "SUPERADMIN"
    : (ctx.actor.memberships.find(
        (m) => m.sanatoriumId === ctx.tenant && m.status === "ACTIVE",
      )?.role ?? ctx.actor.memberships.find((m) => m.status === "ACTIVE")?.role ?? "STAFF");

  const close = (id?: string) =>
    ctx.form({
      title: id
        ? "Boshqa qurilmadagi kirishni yopish"
        : "Boshqa qurilmalardan chiqish",
      fields: [],
      description:
        "Ushbu qurilmadagi kirish saqlanadi. Yopilgan qurilmada qayta kirish talab qilinadi.",
      submit: () =>
        api(
          id ? `/auth/sessions/${id}/revoke` : "/auth/sessions/revoke-others",
          "POST",
          {},
        ),
      done: ctx.refresh,
    });

  const tenantName =
    ctx.tenants.find((s) => s.id === ctx.tenant)?.name ??
    (ctx.admin ? "Barcha sanatoriyalar (Markaziy platforma)" : "Biriktirilgan sanatoriya");

  return (
    <>
      <PageHeading
        title="Mening hisobim"
        subtitle="Shaxsiy profilingiz, xavfsizlik sozlamalari va faol qurilmalar."
      />

      {/* Modern Profile Hero Card */}
      <div className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-hero-avatar">
            {ctx.actor.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="profile-hero-name">{ctx.actor.name}</h2>
            <div className="profile-pills">
              <span className="role-pill">{label[role] ?? role}</span>
              <span className="login-pill">@{ctx.actor.login ?? "user"}</span>
              <span className="status-pill online">
                <span className="status-dot" /> Faol
              </span>
            </div>
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 0 }}>
          <button
            className="button secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={() =>
              ctx.form({
                title: "Ismni o‘zgartirish",
                fields: [
                  {
                    key: "name",
                    label: "Ism",
                    required: true,
                    minLength: 2,
                    maxLength: 120,
                    value: ctx.actor.name,
                  },
                ],
                submit: (values) => api("/auth/profile", "PATCH", values),
                done: () => {
                  ctx.reloadActor?.();
                  ctx.refresh();
                },
              })
            }
          >
            <Edit3 size={15} /> Ismni o‘zgartirish
          </button>
          <button
            className="button primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={changePassword}
          >
            <KeyRound size={15} /> Parolni almashtirish
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <span className="profile-stat-label">To‘liq ism</span>
          <div className="profile-stat-value">{ctx.actor.name}</div>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Tizim logini</span>
          <div className="profile-stat-value">{ctx.actor.login ?? "—"}</div>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Telefon raqam</span>
          <div className="profile-stat-value">{ctx.actor.phone ?? "—"}</div>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Tizim doirasi / Sanatoriya</span>
          <div className="profile-stat-value">{tenantName}</div>
        </div>
      </div>

      {/* Active Sessions Card */}
      <Card
        title="Faol kirishlar va sessiyalar"
        aside={
          <button
            className="button secondary"
            disabled={!sessions.data?.data.some((row: any) => !row.current)}
            onClick={() => close()}
          >
            Boshqa qurilmalardan chiqish
          </button>
        }
      >
        {sessions.loading ? (
          <Loading />
        ) : sessions.error ? (
          <ErrorBox message={sessions.error} retry={sessions.reload} />
        ) : (
          <Table
            rows={sessions.data?.data ?? []}
            columns={[
              {
                label: "Qurilma / Brauzer",
                render: (row) => {
                  const isMobile = /mobile|android|iphone|ipad/i.test(row.deviceLabel || "");
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {isMobile ? <Smartphone size={18} color="#34d399" /> : <Laptop size={18} color="#34d399" />}
                      <div>
                        <strong>{row.deviceLabel}</strong>
                        {row.current && (
                          <div style={{ marginTop: "2px" }}>
                            <span className="status-pill online" style={{ fontSize: "11px", padding: "1px 6px" }}>
                              <span className="status-dot" /> Joriy qurilma
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                label: "Kirish boshlangan",
                render: (row) => dateTime(row.createdAt),
              },
              {
                label: "Oxirgi faollik",
                render: (row) => dateTime(row.lastActivityAt),
              },
            ]}
            actions={(row) =>
              row.current ? (
                <span className="muted" style={{ fontSize: "13px" }}>Ushbu brauzer</span>
              ) : (
                <Act danger onClick={() => close(row.id)}>Kirishni yopish</Act>
              )
            }
          />
        )}
      </Card>
    </>
  );
}

export function RoleGuide() {
  const ctx = usePortal();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const role = ctx.admin
    ? "SUPERADMIN"
    : (ctx.actor.memberships.find(
        (m) => m.sanatoriumId === ctx.tenant && m.status === "ACTIVE",
      )?.role ?? ctx.actor.memberships.find((m) => m.status === "ACTIVE")?.role ?? "STAFF");

  const allGuides = [
    {
      category: "security",
      categoryLabel: "Xavfsizlik",
      title: "Hisob va shaxsiy xavfsizlik",
      icon: <ShieldCheck size={22} />,
      text: "Shaxsiy parolni yangilash, profildagi ma’lumotlarni to‘g‘rilash va boshqa qurilmalardagi faol kirishlarni nazorat qilish.",
      steps: [
        "«Mening hisobim» bo‘limida parolingizni muntazam ravishda almashtirib turing.",
        "Notanish yoki eski qurilmalardan kirishlarni «Kirishni yopish» tugmasi bilan to‘xtating.",
        "Parolni unutgan holda direktor yoki superadminga murojaat qiling.",
      ],
      section: "account",
    },
    ...(ctx.allowed("bookings.read")
      ? [
          {
            category: "bookings",
            categoryLabel: "Bronlash",
            title: "Bronlarni boshqarish va qidiruv",
            icon: <BookOpen size={22} />,
            text: "Mehmonlarning barcha bronlarini topish, to‘lov va kelish holatlarini tekshirish hamda qo‘lda bron yaratish.",
            steps: [
              "Bron raqami, mehmon ismi yoki telefon raqami orqali tezkor qidiruvdan foydalaning.",
              "Tasdiqlangan, kelgan, ketgan yoki bekor qilingan bronlar filtri mavjud.",
              "Telefon orqali murojaat qilgan mijozlar uchun «Qo‘lda bron» tugmasini bosing.",
            ],
            section: "bookings",
          },
          {
            category: "bookings",
            categoryLabel: "Bronlash",
            title: "Bugungi ishlar va navbatchilik",
            icon: <CalendarCheck size={22} />,
            text: "Bugun keladigan (check-in) va ketadigan (check-out) mehmonlarni qabul qilish hamda xonalarni topshirish.",
            steps: [
              "Keladigan mehmonning shaxsini tasdiqlovchi hujjati va bron raqamini tekshiring.",
              "Xonaga joylashtirilgach «Joylashtirish» (Check-in) amalini bosing.",
              "Mehmon safari tugagach «Ketishni qayd etish» (Check-out) amalini yakunlang.",
            ],
            section: "today",
          },
        ]
      : []),
    ...(ctx.allowed("inventory.manage") || ctx.allowed("bookings.read")
      ? [
          {
            category: "bookings",
            categoryLabel: "Bronlash",
            title: "Xonalar fondi va tariflar",
            icon: <Building2 size={22} />,
            text: "Xona turlari, raqamlar, yotoq o‘rinlari sig‘imi va mavsumiy narx tariflarini sozlash.",
            steps: [
              "Xona turlari (Standart, Lyuks, Kottej) va mehmon sig‘imini belgilang.",
              "Har bir xonaga raqam yoki maxsus kod biriktiring.",
              "Faol tariflar bo‘yicha kunlik narx va bekor qilish qoidalarini belgilang.",
            ],
            section: "inventory",
          },
        ]
      : []),
    ...(ctx.allowed("reports.operational.read") || ctx.allowed("reports.financial.read")
      ? [
          {
            category: "finance",
            categoryLabel: "Moliya",
            title: "Moliyaviy hisobotlar va eksport",
            icon: <FileSpreadsheet size={22} />,
            text: "Faqat to‘langan bronlar tushumi, xona-tun bandligi va buxgalteriya uchun Excel/CSV hisobotlar.",
            steps: [
              "Kerakli hisobot davrini (kun, oy yoki sana oralig‘i) tanlang.",
              "Statistika va grafiklarda faqat haqiqiy to‘langan bronlar aks etadi.",
              "Batafsil ro‘yxatni olish uchun «Excel yuklab olish» tugmasidan foydalaning.",
            ],
            section: "dashboard",
          },
        ]
      : []),
    ...(ctx.allowed("payments.read")
      ? [
          {
            category: "finance",
            categoryLabel: "Moliya",
            title: "Onlayn to‘lovlar va TezCheck",
            icon: <CreditCard size={22} />,
            text: "Payme, Click, Uzcard va Humo orqali amalga oshirilgan to‘lovlar monitoringi hamda kassa holati.",
            steps: [
              "Ro‘yxatda faqat muvaffaqiyatli yakunlangan to‘lovlar ko‘rsatiladi.",
              "TezCheck integratsiyasi orqali kassa va API ulanishini yangilab turing.",
              "Tezkor sana tugmalari (Bugun, 7 kun, 30 kun, Bu oy) yordamida saralang.",
            ],
            section: "payments",
          },
        ]
      : []),
    ...(ctx.allowed("staff.invite") || ctx.allowed("staff.reset")
      ? [
          {
            category: "staff",
            categoryLabel: "Jamoa",
            title: "Jamoa va xodimlar boshqaruvi",
            icon: <Users size={22} />,
            text: "Yangi resepshn yoki hisobchini taklif qilish, huquqlarni belgilash va parolni tiklash.",
            steps: [
              "«Xodim taklif qilish» tugmasi orqali resepshn yoki hisobchini ro‘yxatdan o‘tkazing.",
              "Yangi xodimga bir martalik login va vaqtinchalik parolni taqdim eting.",
              "Parolini unutgan xodimlar uchun «Parolni tiklash» amalini bajaring.",
            ],
            section: "staff",
          },
        ]
      : []),
    {
      category: "communication",
      categoryLabel: "Aloqa",
      title: "Yordam xizmati va murojaatlar",
      icon: <MessageSquare size={22} />,
      text: "Mijozlar va sanatoriyalar bilan Telegram uslubidagi qulay chatda suhbatlashish va muammolarni hal qilish.",
      steps: [
        "Murojaatlar ro‘yxatidan kerakli suhbatni tanlang va xabarlar tarixini ko‘ring.",
        "Quyi maydonga to‘g‘ridan-to‘g‘ri javob yozib yuboring (har 10 soniyada yangilanadi).",
        "Masala hal qilingach, murojaatni «Yopish» tugmasi orqali yakunlang.",
      ],
      section: "support",
    },
    ...(ctx.admin
      ? [
          {
            category: "communication",
            categoryLabel: "Aloqa",
            title: "Yangilik va tavsiyalar",
            icon: <Newspaper size={22} />,
            text: "Mobil ilova bosh sahifasida mijozlarga ko‘rinadigan foydali maqola va yangiliklarni nashr etish hamda boshqarish.",
            steps: [
              "«Maqola yozish» orqali yangilik yoki salomatlik tavsiyasini kiriting.",
              "Ilovada ko‘rinishi uchun «E’lon qilish» holatini belgilang.",
              "Eskirgan yoki xato yangiliklarni «O‘chirish» tugmasi orqali o‘chirib tashlang.",
            ],
            section: "articles",
          },
          {
            category: "communication",
            categoryLabel: "Aloqa",
            title: "Reklama va bannerlar",
            icon: <Megaphone size={22} />,
            text: "Mobil ilovada ko‘rsatiladigan reklama bannerlari va e’lonlar kampaniyasini yaratish.",
            steps: [
              "Reklama uchun rasm, havola va yo‘naltiriladigan sanatoriyani tanlang.",
              "Bosh sahifadagi joylashuv turi va faol muddatini belgilang.",
              "Reklama muddati tugaganda uni arxivga oling yoki to‘xtating.",
            ],
            section: "ads",
          },
        ]
      : []),
  ];

  const categories = [
    { id: "all", label: "Barchasi" },
    { id: "security", label: "Xavfsizlik" },
    { id: "bookings", label: "Bronlash" },
    { id: "finance", label: "Moliya" },
    { id: "staff", label: "Jamoa" },
    { id: "communication", label: "Aloqa" },
  ];

  const filteredGuides = allGuides.filter((g) => {
    const matchesCategory = activeCategory === "all" || g.category === activeCategory;
    const matchesSearch =
      !search.trim() ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.text.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <PageHeading
        title="Foydalanish yo‘riqnomasi"
        subtitle={`${label[role] ?? role} roli uchun batafsil qo‘llanmalar va tezkor ko‘rsatmalar.`}
      />

      {/* Guide Controls: Search & Category Chips */}
      <div className="guide-controls">
        <input
          type="text"
          className="guide-search"
          placeholder="Yo‘riqnomalardan qidirish (masalan: bron, xodim, to‘lov, hisobot)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="guide-category-chips">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`guide-chip ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Cards Grid */}
      <div className="guide-grid">
        {!filteredGuides.length && (
          <div style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", color: "#8ea69d" }}>
            Qidiruv bo‘yicha yo‘riqnoma topilmadi. Boshqa so‘z bilan izlab ko‘ring.
          </div>
        )}
        {filteredGuides.map((guide) => (
          <div className="guide-card" key={guide.title}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="guide-card-icon">{guide.icon}</div>
                <span className="role-pill" style={{ textTransform: "none" }}>
                  {guide.categoryLabel}
                </span>
              </div>
              <h3 className="guide-card-title">{guide.title}</h3>
              <p className="guide-card-text">{guide.text}</p>
              <ul className="guide-step-list">
                {guide.steps.map((step, idx) => (
                  <li className="guide-step-item" key={idx}>
                    <Check size={14} />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="button secondary"
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "10px",
              }}
              onClick={() => ctx.go(guide.section)}
            >
              Bo‘limga o‘tish <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
