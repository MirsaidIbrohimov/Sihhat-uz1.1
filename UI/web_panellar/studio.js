(() => {
  "use strict";

  const EXTRA_ICONS = {
    Smartphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    Camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    Trash2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    KeyRound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    Activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
    Globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    QrCode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
  };

  const ic = (name, cls = "") => {
    const svg = (window.WEB_ICONS && window.WEB_ICONS[name]) || EXTRA_ICONS[name] || (window.WEB_ICONS && window.WEB_ICONS.CircleHelp) || "";
    return `<span class="icon ${cls}">${svg}</span>`;
  };

  const spark = (points, stroke = "#10b981", fill = "rgba(16,185,129,0.18)") =>
    `<svg class="kpi-spark" viewBox="0 0 84 32" fill="none"><path d="M${points} L82,30 L2,30 Z" fill="${fill}"/><polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const BOARDS = [
    {
      id: "00-umumiy-dizayn-konsepsiyasi",
      portal: "overview",
      theme: "dark",
      title: "00 · Umumiy dizayn konsepsiyasi — Aurora Emerald Command V3",
      subtitle: "Superadmin va Hamkorlar panellarining yangi avlod dizayn tizimi",
    },
    {
      id: "01-superadmin-kirish-va-mfa",
      portal: "superadmin",
      theme: "light",
      section: "login",
      title: "01 · Superadmin — Kirish va 2-bosqichli MFA himoyasi",
      subtitle: "Split-ekran, zumrad tog‘ illyustratsiyasi va 6 raqamli autentifikator qadami",
    },
    {
      id: "02-superadmin-bosh-sahifa-kunduzgi",
      portal: "superadmin",
      theme: "light",
      section: "dashboard",
      title: "02 · Superadmin — Platforma ko‘rsatkichlari (Kunduzgi Crystal)",
      subtitle: "Bento KPI kartalar, sparkline trendlar, hududlar kesimi, AI sarfi va integratsiyalar",
    },
    {
      id: "03-superadmin-bosh-sahifa-tungi",
      portal: "superadmin",
      theme: "dark",
      section: "dashboard",
      title: "03 · Superadmin — Platforma ko‘rsatkichlari (Tungi Neon Aurora)",
      subtitle: "Chuqur zumrad-obsidian fon, neon-yalpiz grafiklar va shisha kartalar",
    },
    {
      id: "04-superadmin-sanatoriyalar-va-mashhur",
      portal: "superadmin",
      theme: "light",
      section: "sanatoriums",
      title: "04 · Superadmin — Sanatoriyalar, Moderatsiya va «Mashhur» vitrinasi",
      subtitle: "Bosh sahifa uchun Mashhur tanlovi, bank rekvizitlari tasdig‘i va tezkor inspektor",
    },
    {
      id: "05-superadmin-ilova-foydalanuvchilari-modal",
      portal: "superadmin",
      theme: "light",
      section: "app-users",
      title: "05 · Superadmin — Ilova foydalanuvchilari (#6-xonali ID) va Tahrirlash oynasi",
      subtitle: "#482915 ID, onlayn indikator, login/email jonli baza tekshiruvi va sessiyalarni yopish",
    },
    {
      id: "06-superadmin-jamoa-va-ruxsatlar",
      portal: "superadmin",
      theme: "light",
      section: "staff",
      title: "06 · Superadmin — Hamkorlar jamoasi, Tasdiqlash va 24 ta Ruxsat matritsasi",
      subtitle: "Yangi xodim taklifi, parol tiklash so‘rovlari va vakolatlarni guruhlab boshqarish",
    },
    {
      id: "07-superadmin-moliya-tezcheck-va-reklama",
      portal: "superadmin",
      theme: "light",
      section: "payments",
      title: "07 · Superadmin — Moliya markazi, Tezcheck kassa va Ilovadagi Reklama previewi",
      subtitle: "Tezcheck jonli holati, bank o‘tkazmalari va mobil ilovadagi HOME reklama vitrinasi",
    },
    {
      id: "08-superadmin-aloqa-yordam-chat-va-elon",
      portal: "superadmin",
      theme: "dark",
      section: "support",
      title: "08 · Superadmin — Telegram-uslubidagi Yordam Chati, E’lon berish va Audit",
      subtitle: "Ikki ustunli messenger, xabar tahrir/o‘chirish auditi va ommaviy e’lon oynasi",
    },
    {
      id: "09-hamkorlar-kirish-va-shartlar",
      portal: "partner",
      theme: "light",
      section: "login",
      title: "09 · Hamkorlar sayti — Kirish, «Parolni unutdingizmi?» va Hamkor shartlari",
      subtitle: "Direktor/Resepshn/Hisobchi kirish oynasi, tezkor parol tiklash va 9 bo‘limli nizom",
    },
    {
      id: "10-hamkorlar-direktor-bosh-sahifa-va-bugun",
      portal: "partner",
      theme: "light",
      section: "dashboard",
      title: "10 · Hamkorlar (Direktor & Resepshn) — Bosh sahifa va «Bugungi ishlar»",
      subtitle: "Zomin sanatoriyasi operatsion markazi, bugun kelish/ketish va kunlik muolaja tartibi",
    },
    {
      id: "11-hamkorlar-shaxmatka-bandlik-kalendari",
      portal: "partner",
      theme: "light",
      section: "inventory",
      title: "11 · Hamkorlar — Interaktiv Bandlik Kalendari (Shaxmatka Pro V3)",
      subtitle: "Butun xona va Erkaklar/Ayollar koyka-o‘rinlari (3/4 band) hamda Xona Pasporti",
    },
    {
      id: "12-hamkorlar-bronlar-crm-va-profsoyuz",
      portal: "partner",
      theme: "light",
      section: "bookings",
      title: "12 · Hamkorlar — Bronlar, Kutish ro‘yxati (CRM) va Kasaba uyushmalari kvotasi",
      subtitle: "3 tabli CRM: barcha bronlar, bo‘sh joy kutayotganlar / 6+ oy mijozlar va Profsoyuz kvotasi",
    },
    {
      id: "13-hamkorlar-bron-tafsiloti-va-emehmon",
      portal: "partner",
      theme: "light",
      section: "bookings",
      title: "13 · Hamkorlar — Bron tafsiloti, Pasport/Koyka-o‘rin va «🖨️ E-mehmon anketasi»",
      subtitle: "Pasport/JShShIR kiritish, joyida to‘lov va bir tugmada chop etiladigan rasmiy anketa",
    },
    {
      id: "14-hamkorlar-sanatoriya-profili-va-ustaxona",
      portal: "partner",
      theme: "light",
      section: "profile",
      title: "14 · Hamkorlar — Sanatoriya profili, «Qaysi dardga davo?» va Yo‘llanma tarkibi",
      subtitle: "4 bosqichli profil ustaxonasi, tibbiy yo‘nalishlar, narx tarkibi va 30 surat galereyasi",
    },
    {
      id: "15-hamkorlar-hisobchi-va-mobil-tungi",
      portal: "partner",
      theme: "dark",
      section: "accountant",
      title: "15 · Hamkorlar — Hisobchi paneli (Tungi) va Telefon (Mobil) ko‘rinishlari",
      subtitle: "Hisobchining davrlar bo‘yicha taqqoslash/XLSX eksporti hamda smartfonda Resepshn",
    },
  ];

  window.WEB_PANELLAR_BOARDS = BOARDS;

  function shell({
    portal = "superadmin",
    roleLabel = "SUPERADMIN",
    userName = "Mirsaid Ibrohimov",
    userId = "#100001",
    tenantLabel = "Barcha sanatoriyalar (14)",
    activeNav = "dashboard",
    breadcrumb = "Platforma ko‘rsatkichlari",
    content = "",
  }) {
    const isAdmin = portal === "superadmin";
    const isAccountant = activeNav === "accountant";
    const navGroups = isAdmin
      ? [
          [
            "Ish jarayoni",
            [
              ["dashboard", "Umumiy ko‘rinish", "LayoutDashboard", ""],
              ["today", "Bugungi ishlar", "CalendarDays", "19"],
              ["sanatoriums", "Sanatoriyalar", "Building2", "14"],
              ["bookings", "Bronlar va CRM", "BookOpen", "128"],
              ["inventory", "Shaxmatka & Tariflar", "CalendarDays", ""],
              ["staff", "Jamoa va ruxsatlar", "Users", "2 tasdiq", "amber"],
              ["app-users", "Ilova foydalanuvchilari", "Smartphone", "1 420"],
            ],
          ],
          [
            "Moliya va Reklama",
            [
              ["payments", "Onlayn to‘lovlar", "CreditCard", ""],
              ["payouts", "Sanatoriyaga o‘tkazma", "FileCheck", "3"],
              ["refunds", "Pulni qaytarish", "Wallet", "1", "amber"],
              ["billing", "Abonent va hisoblar", "FileText", ""],
              ["ads", "Reklama vitrinasi", "Megaphone", "LIVE"],
              ["reconciliation", "To‘lov solishtirish", "ChartNoAxesCombined", ""],
            ],
          ],
          [
            "Aloqa va Nazorat",
            [
              ["support", "Yordam va E’lonlar", "MessageSquare", "4 yangi"],
              ["reviews", "Mehmonlar sharhlari", "HeartPulse", ""],
              ["notifications", "Bildirishnomalar", "Bell", "5"],
              ["telegram", "Telegram bot", "Send", "Faol"],
              ["audit", "Amallar tarixi (Audit)", "ShieldCheck", ""],
              ["account", "Mening hisobim", "Settings", ""],
            ],
          ],
        ]
      : isAccountant
        ? [
            [
              "Moliya va Hisobot",
              [
                ["accountant", "Hisobchi hisobotlari", "ChartNoAxesCombined", "Okt-Noy"],
                ["partner-terms", "Hamkor shartlari", "FileCheck", "9 bo‘lim"],
                ["account", "Mening hisobim", "Settings", ""],
                ["guide", "Yo‘riqnoma", "CircleHelp", ""],
              ],
            ],
          ]
        : [
            [
              "Ish jarayoni",
              [
                ["dashboard", "Umumiy ko‘rinish", "LayoutDashboard", ""],
                ["today", "Bugungi ishlar", "CalendarDays", "14"],
                ["profile", "Sanatoriya profili", "Building2", "Nashrda"],
                ["inventory", "Shaxmatka & Tariflar", "CalendarDays", "48 xona"],
                ["bookings", "Bronlar va Mijoz CRM", "BookOpen", "9 kutish", "amber"],
                ["staff", "Jamoa va ruxsatlar", "Users", "8"],
              ],
            ],
            [
              "Moliya",
              [
                ["payments", "To‘lovlar va Cheklar", "CreditCard", ""],
                ["payouts", "Bank o‘tkazmalari", "FileCheck", ""],
                ["billing", "Abonent va hisoblar", "FileText", "0% kom."],
                ["ads", "Reklama so‘rash", "Megaphone", "Bepul"],
              ],
            ],
            [
              "Aloqa va Nizom",
              [
                ["support", "Yordam va E’lonlar", "MessageSquare", "2"],
                ["reviews", "Mehmonlar sharhlari", "HeartPulse", "4.9★"],
                ["telegram", "Telegram bot", "Send", "Ulangan"],
                ["partner-terms", "Hamkor shartlari", "FileCheck", "v2026.11"],
                ["account", "Mening hisobim", "Settings", ""],
              ],
            ],
          ];

    return `
      <div class="portal-shell">
        <aside class="portal-sidebar">
          <div class="brand-row">
            <div class="brand-logo-wrap">
              <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
            </div>
            <div>
              <div class="brand-title">sihhat<em>.uz</em></div>
              <span class="brand-caption">${isAdmin ? "Markaziy Boshqaruv Tizimi" : "Sanatoriya Hamkorlar Portali"}</span>
            </div>
          </div>

          <div class="role-capsule">
            ${ic("ShieldCheck", "sm")}
            <span>${isAdmin ? "Platforma Superadmini" : isAccountant ? "Hisobchi Kabineti" : "Sanatoriya Boshqaruvi"}</span>
            <span class="pulse-dot"></span>
          </div>

          <div class="nav-scroll">
            ${navGroups
              .map(
                ([groupTitle, items]) => `
              <div class="nav-section">
                <div class="nav-section-head">
                  <span>${groupTitle}</span>
                  ${ic("ChevronDown", "sm")}
                </div>
                ${items
                  .map(
                    ([id, label, iconName, badgeText, badgeTone]) => `
                  <div class="nav-item ${id === activeNav ? "active" : ""}">
                    ${ic(iconName)}
                    <span>${label}</span>
                    ${badgeText ? `<span class="nav-badge ${badgeTone || ""}">${badgeText}</span>` : ""}
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
              )
              .join("")}
          </div>

          <div class="sidebar-commission-card">
            <strong>${ic("HeartPulse", "sm")} Bron komissiyasi — 0%</strong>
            <span>Sanatoriyalar bilan ochiq shaffof hamkorlik · To‘g‘ridan-to‘g‘ri hisob-kitob</span>
            <span class="sidebar-commission-link">Hamkorlik nizomi (9 bo‘lim) ${ic("ArrowRight", "sm")}</span>
          </div>
        </aside>

        <div class="portal-main">
          <header class="portal-topbar">
            <div class="topbar-left">
              <div class="tenant-switcher">
                <span class="tenant-switcher-icon">${ic("Building2")}</span>
                <div class="tenant-switcher-meta">
                  <small>${isAdmin ? "Ko‘rilayotgan sanatoriya" : "Faol sanatoriya"}</small>
                  <strong>${tenantLabel} ${ic("ChevronDown", "sm")}</strong>
                </div>
              </div>
              <div class="command-search">
                ${ic("Search", "sm")}
                <span>Bron raqami, mijoz #ID, pasport yoki telefon qidirish...</span>
                <kbd>Ctrl + K</kbd>
              </div>
            </div>

            <div class="topbar-right">
              <div class="system-health-pill">
                <i></i>
                <span>${isAdmin ? "API · Tezcheck · Telegram Bot · APK v0.2.8" : "Onlayn bron · Shaxmatka · E-mehmon faol"}</span>
              </div>
              <div class="circle-btn" title="Kun / Tun rejimi">${ic("Sun")}</div>
              <div class="circle-btn" title="Bildirishnomalar">
                ${ic("Bell")}
                <span class="notif-dot"></span>
              </div>
              <div class="actor-pill">
                <div class="actor-avatar">${userName.slice(0, 1)}</div>
                <div class="actor-meta">
                  <strong>${userName} <span style="opacity:0.65;font-weight:700">${userId}</span></strong>
                  <small>${roleLabel}</small>
                </div>
              </div>
              <div class="circle-btn" title="Sozlamalar">${ic("Settings")}</div>
            </div>
          </header>

          <main class="portal-content">
            <div class="breadcrumb-row">
              <div class="breadcrumb-pill">
                <span>${isAdmin ? "Superadmin (/superadmin)" : "Hamkorlar (/hamkorlar)"}</span>
                <span>/</span>
                <strong>${breadcrumb}</strong>
              </div>
              <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);font-weight:600">
                ${ic("Clock", "sm")}
                <span>Toshkent vaqti (Asia/Tashkent) · Jonli sinxronizatsiya</span>
              </div>
            </div>
            ${content}
          </main>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     BOARD 00: MASTER OVERVIEW POSTER
     ========================================================================== */
  function board00() {
    return `
      <div class="poster-canvas">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px">
          <div style="display:flex;align-items:center;gap:16px">
            <div class="brand-logo-wrap" style="width:62px;height:62px;border-radius:18px">
              <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
            </div>
            <div>
              <div style="display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border-radius:999px;background:rgba(62,230,191,0.14);border:1px solid rgba(62,230,191,0.38);color:#8ff5dc;font-size:11.5px;font-weight:800;letter-spacing:0.08em">
                <span style="width:8px;height:8px;border-radius:50%;background:#3ee6bf"></span>
                SIHHAT.UZ WEB PANELLAR · YANGI DIZAYN KONSEPSIYASI (V3 · 2026)
              </div>
              <h1 style="font-size:36px;font-weight:800;color:#ffffff;margin-top:8px">
                Aurora Emerald Command Center — <span style="color:#3ee6bf">Superadmin & Hamkorlar</span>
              </h1>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="padding:12px 18px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(62,230,191,0.28);text-align:center">
              <div style="font-family:Manrope;font-size:26px;font-weight:800;color:#3ee6bf">16 ta</div>
              <div style="font-size:11.5px;color:#b2dfd2">Yuqori aniqlikdagi maket</div>
            </div>
            <div style="padding:12px 18px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(62,230,191,0.28);text-align:center">
              <div style="font-family:Manrope;font-size:26px;font-weight:800;color:#8ff5dc">2 Sayt · 4 Rol</div>
              <div style="font-size:11.5px;color:#b2dfd2">Admin · Direktor · Resepshn · Hisobchi</div>
            </div>
            <div style="padding:12px 18px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(62,230,191,0.28);text-align:center">
              <div style="font-family:Manrope;font-size:26px;font-weight:800;color:#ffffff">Kun & Tun</div>
              <div style="font-size:11.5px;color:#b2dfd2">Crystal Light + Neon Aurora Dark</div>
            </div>
          </div>
        </div>

        <!-- Two Portal Visual Showcase Cards -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px">
          <!-- Superadmin Portal Card -->
          <div style="padding:24px;border-radius:26px;background:linear-gradient(155deg,rgba(12,56,48,0.88),rgba(4,28,24,0.94));border:1px solid rgba(62,230,191,0.38);box-shadow:0 22px 54px rgba(0,0,0,0.42);display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#8ff5dc,#3ee6bf);color:#03241e;font-weight:800;font-size:12px">
                1. SUPERADMIN SAYTI (/superadmin)
              </span>
              <span style="font-size:12px;color:#8ff5dc;font-weight:700">01 – 08 ekranlar</span>
            </div>
            <h2 style="font-size:23px;color:#ffffff">Markaziy Platforma, Moliya, Mijozlar va Xavfsizlik Boshqaruvi</h2>
            <p style="color:#b4dfd3;font-size:13px">
              Hozirgi Neon Emerald Glass uslubidan ilhomlangan holda Bento KPI sparkline kartalar, yonma-yon ochiladigan Inspector Drawer oynalari va jonli integratsiya vidjetlari bilan boyitildi.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${[
                ["ShieldCheck", "Split Kirish + 6-raqamli MFA", "2-bosqichli TOTP himoya va faol sessiyalar nazorati"],
                ["LayoutDashboard", "Bento KPI & Sparkline", "GMV aylanma, platforma daromadi, Gemini AI token sarfi"],
                ["Building2", "Sanatoriyalar & «⭐ Mashhur»", "1-klikda Bosh sahifa vitrinasi va Bank rekviziti tasdig‘i"],
                ["Smartphone", "Mijozlar (#482915) & Modal", "6-xonali ID, profil rasmi, login/email jonli baza tekshiruvi"],
                ["Users", "Jamoa & 24 Ruxsat Matritsasi", "Xodim taklifini tasdiqlash, parol tiklash so‘rovlari"],
                ["MessageSquare", "Telegram Yordam & E’lonlar", "2-ustunli chat, audit izi va 3 yo‘nalishli ommaviy e’lon"],
              ]
                .map(
                  ([icon, title, desc]) => `
                <div style="padding:11px 13px;border-radius:15px;background:rgba(255,255,255,0.05);border:1px solid rgba(62,230,191,0.18);display:flex;gap:10px;align-items:flex-start">
                  <span style="width:32px;height:32px;border-radius:10px;background:rgba(62,230,191,0.16);color:#3ee6bf;display:grid;place-items:center;flex-shrink:0">${ic(icon, "sm")}</span>
                  <div>
                    <strong style="display:block;font-size:12.5px;color:#ffffff">${title}</strong>
                    <span style="font-size:11px;color:#9bc9bc">${desc}</span>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- Hamkorlar Portal Card -->
          <div style="padding:24px;border-radius:26px;background:linear-gradient(155deg,rgba(244,251,248,0.96),rgba(226,243,236,0.96));color:#06312a;border:1px solid rgba(0,134,108,0.38);box-shadow:0 22px 54px rgba(0,0,0,0.35);display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#009e7e,#006e58);color:#ffffff;font-weight:800;font-size:12px">
                2. HAMKORLAR SAYTI (/hamkorlar · Direktor, Resepshn, Hisobchi)
              </span>
              <span style="font-size:12px;color:#007a61;font-weight:800">09 – 15 ekranlar</span>
            </div>
            <h2 style="font-size:23px;color:#06312a">Shaxmatka Pro, Koyka-o‘rin CRM, Kasaba Uyushmalari va E-Mehmon</h2>
            <p style="color:#375c53;font-size:13px">
              Sanatoriya kundalik ish oqimi uchun maxsus: butun xona va erkaklar/ayollar koyka-o‘rinlari, kutish ro‘yxati, profsoyuz yo‘llanmalari hamda 1 tugmada E-mehmon chop etish.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${[
                ["CalendarDays", "Shaxmatka Pro V3 Kalendari", "Gantt-barlar, koyka sig‘imi (●●●○ 3/4) va Xona Pasporti"],
                ["BookOpen", "3-Tabli Bronlar va Mijoz CRM", "Barcha bronlar, Kutish ro‘yxati, 6+ oy qayta chaqirish"],
                ["Building2", "Kasaba uyushmalari (Profsoyuz)", "Tashkilot va korxonalar shartnoma kvotasi progress-bari"],
                ["Printer", "1-Klikda «🖨️ E-Mehmon Anketasi»", "Pasport/JShShIR (PINFL), joylashish turi va QR blanka"],
                ["HeartPulse", "«Qaysi dardga davo?» va Tarif", "Tibbiy ixtisoslik, yo‘llanma tarkibi va kunlik tartib"],
                ["Coins", "Hisobchi Paneli + Mobil Resepshn", "Davr solishtirish, XLSX/PDF eksport va telefon ko‘rinishi"],
              ]
                .map(
                  ([icon, title, desc]) => `
                <div style="padding:11px 13px;border-radius:15px;background:rgba(255,255,255,0.85);border:1px solid rgba(0,134,108,0.18);display:flex;gap:10px;align-items:flex-start">
                  <span style="width:32px;height:32px;border-radius:10px;background:rgba(0,134,108,0.12);color:#00866c;display:grid;place-items:center;flex-shrink:0">${ic(icon, "sm")}</span>
                  <div>
                    <strong style="display:block;font-size:12.5px;color:#06312a">${title}</strong>
                    <span style="font-size:11px;color:#527067">${desc}</span>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <!-- Design System Tokens & Palette Bar -->
        <div style="padding:20px 24px;border-radius:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(62,230,191,0.24);display:grid;grid-template-columns:1.2fr 1.8fr;gap:24px;align-items:center">
          <div>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#3ee6bf;text-transform:uppercase">DIZAYN TOKENLARI VA USLUB QOIDALARI</div>
            <h3 style="font-size:18px;color:#ffffff;margin-top:4px">Manrope + DM Sans · Lucide 1.9px · Shisha qatlamlar</h3>
            <p style="font-size:12px;color:#a4cfc2;margin-top:4px">
              Barcha 16 ta rasm <code>UI/web_panellar/</code> papkasida tayyorlandi. Tasdiqlangandan so‘ng <code>packages/ui/src</code> komponentlariga funksiyalarni buzmasdan joriy etiladi.
            </p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">
            ${[
              ["#F1F8F5", "#06312A", "Crystal Canvas", "Kunduzgi fon"],
              ["#FFFFFF", "#06312A", "Frost Glass", "Kunduzgi karta"],
              ["#00866C", "#FFFFFF", "Emerald Core", "Asosiy amal"],
              ["#3EE6BF", "#03241E", "Neon Mint", "Faol aksent"],
              ["#03211C", "#EEFAF6", "Aurora Obsidian", "Tungi fon"],
              ["#0A302A", "#8FF5DC", "Dark Glass", "Tungi karta"],
            ]
              .map(
                ([hex, fg, name, role]) => `
              <div style="padding:10px 12px;border-radius:14px;background:${hex};color:${fg};border:1px solid rgba(62,230,191,0.3)">
                <div style="font-family:Manrope;font-weight:800;font-size:12px">${hex}</div>
                <div style="font-weight:700;font-size:11.5px;margin-top:4px">${name}</div>
                <div style="font-size:10px;opacity:0.78">${role}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     BOARD 01: SUPERADMIN SPLIT LOGIN & MFA
     ========================================================================== */
  function board01() {
    return `
      <div class="login-v3">
        <section class="login-showcase">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="brand-row" style="padding:0">
              <div class="brand-logo-wrap">
                <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
              </div>
              <div>
                <div class="brand-title">sihhat<em>.uz</em></div>
                <span class="brand-caption">O‘zbekiston Sanatoriyalari Platformasi</span>
              </div>
            </div>
            <span style="display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(62,230,191,0.12);border:1px solid rgba(62,230,191,0.34);font-size:11px;font-weight:800;color:#8ff5dc">
              <span class="pulse-dot" style="margin:0"></span>
              SIHHAT.UZ · SUPERADMIN PORTALI
            </span>
          </div>

          <div>
            <div style="font-size:11.5px;font-weight:800;letter-spacing:0.14em;color:#8ff5dc;text-transform:uppercase">
              MARKAZIY BOSHQARUV VA XAVFSIZLIK
            </div>
            <h1>
              Sog‘lom dam olish.<br />
              <span>Shaffof platforma nazorati.</span>
            </h1>
            <p style="color:#b2ddd1;font-size:14px;max-width:560px">
              Barcha hamkor sanatoriyalar, onlayn bronlar, Tezcheck kassa, mijozlar bazasi (#6-xonali ID), Telegram bot va Gemini AI sarfini yagona markazdan boshqaring.
            </p>

            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
              ${[
                "🛡️ 2-bosqichli MFA (TOTP) himoya",
                "🏥 14 ta faol sanatoriya",
                "💳 0% bron komissiyasi",
                "🤖 Telegram Webhook & AI",
              ]
                .map(
                  (t) =>
                    `<span style="padding:7px 13px;border-radius:999px;background:rgba(62,230,191,0.1);border:1px solid rgba(62,230,191,0.26);font-size:12px;font-weight:700;color:#d8fbf0">${t}</span>`
                )
                .join("")}
            </div>

            <div class="login-art-frame">
              <img src="../web/assets/retreat.png" alt="Sanatoriya manzarasi" />
              <div class="login-art-overlay">
                <div>
                  <strong style="display:block;font-size:13px;color:#ffffff">Hostra & Render HTTPS Himoyalangan Seans</strong>
                  <span style="font-size:11.5px;color:#9fd4c5">HttpOnly Cookie · CSRF Token · 5+ xato parol urinishida Email + Bot trevoga</span>
                </div>
                <span class="badge-pill green"><i></i> Tizim barqaror</span>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:12px;color:#8dbcb0">
            <span>© 2026 Sihhat.uz · Markaziy Superadmin Portali</span>
            <span>sihhat.uz/superadmin · v0.2.8</span>
          </div>
        </section>

        <section class="login-panel-wrap">
          <div style="position:absolute;top:24px;right:24px;display:flex;gap:8px">
            <span class="btn sm">${ic("Sun", "sm")} Kunduzgi Crystal</span>
            <span class="btn sm" style="opacity:0.7">${ic("Moon", "sm")} Tungi Aurora</span>
          </div>

          <div class="login-card-v3">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div class="brand-logo-wrap" style="width:58px;height:58px;border-radius:18px">
                <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
              </div>
              <span class="badge-pill green">${ic("ShieldCheck", "sm")} 2FA / MFA Yoqilgan</span>
            </div>

            <div>
              <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:var(--primary);text-transform:uppercase">
                SUPERADMIN PANELI · XAVFSIZ KIRISH
              </div>
              <h2 style="font-size:28px;font-weight:800;margin-top:4px">Xush kelibsiz</h2>
              <p style="color:var(--muted);font-size:13px;margin-top:2px">
                Platforma egasi hisobi va 6 raqamli autentifikator kodi bilan kiring.
              </p>
            </div>

            <div class="form-field">
              <label>
                <span>Administrator logini</span>
                <span class="live-check-tag">${ic("CircleCheck", "sm")} Tasdiqlangan hisob</span>
              </label>
              <div class="input-box verified">
                ${ic("Users", "sm")}
                <span>superadmin</span>
              </div>
            </div>

            <div class="form-field">
              <label>
                <span>Maxfiy parol</span>
                <span style="font-size:11px;color:var(--muted)">Kamida 10 belgi</span>
              </label>
              <div class="input-box" style="justify-content:space-between">
                <span style="display:flex;align-items:center;gap:10px">
                  ${ic("KeyRound", "sm")}
                  <span>••••••••••••••••</span>
                </span>
                ${ic("Eye", "sm")}
              </div>
            </div>

            <div class="form-field" style="padding:14px;border-radius:18px;background:var(--neon-soft);border:1px solid var(--line-strong)">
              <label style="color:var(--ink)">
                <span>${ic("ShieldCheck", "sm")} Autentifikator kodi (MFA / 2FA)</span>
                <span class="badge-pill green">30s yangilanadi</span>
              </label>
              <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:6px">
                ${["4", "8", "2", "9", "1", "5"]
                  .map(
                    (d) =>
                      `<div style="height:44px;border-radius:12px;background:var(--surface-strong);border:1.5px solid var(--primary);display:grid;place-items:center;font-family:Manrope;font-size:20px;font-weight:800;color:var(--ink)">${d}</div>`
                  )
                  .join("")}
              </div>
              <span style="font-size:11.5px;color:var(--muted);margin-top:6px">
                Google Authenticator yoki private kirish sahifasidagi joriy 6 raqamli kod.
              </span>
            </div>

            <button class="btn primary" style="width:100%;padding:13px;font-size:14px">
              <span>Superadmin paneliga kirish</span>
              ${ic("ArrowRight", "sm")}
            </button>

            <div style="padding:11px 14px;border-radius:14px;background:var(--surface-soft);border:1px solid var(--line);display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--muted)">
              ${ic("Info", "sm")}
              <span>1 soatda 5 marta xato parol terilsa, Superadmin Email va Telegram botiga darhol xavfsizlik ogohlantirishi yuboriladi.</span>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  /* ==========================================================================
     BOARD 02 & 03: SUPERADMIN DASHBOARD (LIGHT & DARK)
     ========================================================================== */
  function superadminDashboardContent() {
    return `
      <div class="page-header">
        <div>
          <h1>Platforma ko‘rsatkichlari va Analitika</h1>
          <p>Bron aylanmasi (GMV · 0% komissiya) va platformaning abonent/reklama daromadi alohida hisoblanadi.</p>
        </div>
        <div class="header-controls">
          <div class="pill-tabs">
            <span class="pill-tab">Bugun</span>
            <span class="pill-tab">7 kun</span>
            <span class="pill-tab active">Noyabr 2026</span>
            <span class="pill-tab">90 kun</span>
          </div>
          <div class="filter-input">
            ${ic("CalendarDays", "sm")}
            <span>01.11.2026 — 22.11.2026 · Yashash davri</span>
            ${ic("ChevronDown", "sm")}
          </div>
          <button class="btn soft">${ic("FileSpreadsheet", "sm")} XLSX yuklash</button>
          <button class="btn primary">${ic("Download", "sm")} CSV hisobot</button>
        </div>
      </div>

      <!-- 4 Bento KPI Cards with Sparklines -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">TO‘LANGAN BRONLAR</span>
            <span class="kpi-icon">${ic("BookOpen")}</span>
          </div>
          <div class="kpi-mid">
            <div class="kpi-value">128<span class="kpi-unit">ta bron</span></div>
            ${spark("2,26 16,22 30,24 44,15 58,17 70,9 82,5")}
          </div>
          <div class="kpi-foot">
            <span class="kpi-trend">▲ +18.4%</span>
            <span class="kpi-sub">94 ilova · 34 qo‘lda / profsoyuz</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">O‘RTACHA XONALAR BANDLIGI</span>
            <span class="kpi-icon">${ic("BedDouble")}</span>
          </div>
          <div class="kpi-mid">
            <div class="kpi-value">74,2<span class="kpi-unit">%</span></div>
            ${spark("2,24 18,20 32,16 48,18 62,11 74,8 82,6")}
          </div>
          <div class="kpi-foot">
            <span class="kpi-trend">▲ +6.8%</span>
            <span class="kpi-sub">890 / 1 200 xona-tun · 1 740 mehmon-tun</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">BRON AYLANMASI (GMV)</span>
            <span class="kpi-icon">${ic("CreditCard")}</span>
          </div>
          <div class="kpi-mid">
            <div class="kpi-value">184 500 000<span class="kpi-unit">so‘m</span></div>
            ${spark("2,27 16,23 30,19 46,20 60,13 72,9 82,4")}
          </div>
          <div class="kpi-foot">
            <span class="kpi-trend">0% komissiya</span>
            <span class="kpi-sub">Tasdiqlangan onlayn + joyida to‘lovlar</span>
          </div>
        </div>

        <div class="kpi-card featured">
          <div class="kpi-top">
            <span class="kpi-label">PLATFORMA DAROMADI (SOF)</span>
            <span class="kpi-icon">${ic("Coins")}</span>
          </div>
          <div class="kpi-mid">
            <div class="kpi-value">18 900 000<span class="kpi-unit">so‘m</span></div>
            ${spark("2,25 18,21 34,17 50,14 66,10 82,3", "#8ff5dc", "rgba(143,245,220,0.25)")}
          </div>
          <div class="kpi-foot">
            <span class="kpi-trend">▲ +22.0%</span>
            <span class="kpi-sub">14 ta faol abonent · HOME reklamalar bepul</span>
          </div>
        </div>
      </div>

      <!-- Middle Row: Analytics Chart + Ledger Balances -->
      <div class="grid-2">
        <section class="glass-card">
          <div class="card-header">
            <div>
              <h2>${ic("ChartNoAxesCombined")} Bronlar holati va Hududlar bo‘yicha taqsimot</h2>
              <p>Tanlangan davrda yashash sanalari kesishgan barcha bronlar va top sanatoriyalar ulushi</p>
            </div>
            <span class="badge-pill green"><i></i> Jami 128 ta bron</span>
          </div>
          <div class="card-body" style="display:grid;grid-template-columns:1.15fr 1fr;gap:22px;align-items:center">
            <!-- Bar Chart -->
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="height:178px;display:flex;align-items:flex-end;justify-content:space-around;gap:14px;padding:12px 10px 0;border-bottom:1px solid var(--line)">
                ${[
                  ["Tasdiqlangan", 76, "142px", "linear-gradient(180deg,#3ee6bf,#00866c)"],
                  ["Joylashgan", 29, "84px", "linear-gradient(180deg,#38bdf8,#0284c7)"],
                  ["Yakunlangan", 14, "52px", "linear-gradient(180deg,#10b981,#047857)"],
                  ["Kutilmoqda", 6, "30px", "linear-gradient(180deg,#fbbf24,#d97706)"],
                  ["Bekor qilingan", 3, "18px", "linear-gradient(180deg,#f87171,#dc2626)"],
                ]
                  .map(
                    ([lbl, cnt, h, bg]) => `
                  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">
                    <strong style="font-family:Manrope;font-size:13.5px">${cnt}</strong>
                    <div style="width:100%;max-width:46px;height:${h};border-radius:10px 10px 4px 4px;background:${bg};box-shadow:0 6px 16px rgba(0,134,108,0.2)"></div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              <div style="display:flex;justify-content:space-around;font-size:11px;color:var(--muted);font-weight:700">
                <span>Tasdiqlangan</span>
                <span>Joylashgan</span>
                <span>Yakunlangan</span>
                <span>Kutilmoqda</span>
                <span>Bekor</span>
              </div>
            </div>

            <!-- Regional Breakdown -->
            <div style="display:flex;flex-direction:column;gap:11px;padding-left:16px;border-left:1px solid var(--line)">
              <div style="font-size:12px;font-weight:800;color:var(--ink-secondary)">TOP SANATORIYALAR BANDLIGI</div>
              ${[
                ["Zomin Sog‘lomlik Maskani · Jizzax", "86%", "48 bron · 68,4 mln"],
                ["Chimyon Sanatoriyasi · Farg‘ona", "79%", "39 bron · 54,9 mln"],
                ["Oqtosh Tog‘ Kurorti · Toshkent", "71%", "26 bron · 38,2 mln"],
                ["Chortoq Mineral Suv · Namangan", "62%", "15 bron · 23,0 mln"],
              ]
                .map(
                  ([name, pct, meta]) => `
                <div style="display:flex;flex-direction:column;gap:4px">
                  <div style="display:flex;justify-content:space-between;font-size:12px">
                    <strong>${name}</strong>
                    <span style="color:var(--primary);font-weight:800">${pct}</span>
                  </div>
                  <div style="height:7px;border-radius:999px;background:var(--surface-soft);overflow:hidden">
                    <div style="width:${pct};height:100%;border-radius:999px;background:linear-gradient(90deg,#00866c,#3ee6bf)"></div>
                  </div>
                  <span style="font-size:10.5px;color:var(--muted)">${meta}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </section>

        <!-- Ledger Balance Card -->
        <section class="glass-card">
          <div class="card-header">
            <div>
              <h2>${ic("Wallet")} Hisob-kitob va Kassa qoldiqlari</h2>
              <p>Davr oxirigacha provayder va bank tasdiqlari bo‘yicha</p>
            </div>
            <span class="badge-pill blue">Ledger Guard 4/4</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:11px">
            ${[
              ["CreditCard", "Sof onlayn tushum (Net)", "178 200 000 so‘m", "green"],
              ["Coins", "Tasdiqlangan joyida to‘lov (Naqd/Term.)", "32 400 000 so‘m", "blue"],
              ["ArrowUpRight", "Sanatoriyalarga o‘tkazilgan", "162 000 000 so‘m", "neutral"],
              ["Clock", "Bankka yuborilayotgan (In-transit)", "16 200 000 so‘m", "amber"],
              ["Wallet", "Mijozga qaytarilgan (Refund)", "6 300 000 so‘m", "red"],
            ]
              .map(
                ([iconName, label, val, tone]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:13px;background:var(--surface-soft);border:1px solid var(--line)">
                <span style="display:flex;align-items:center;gap:9px;font-size:12.5px;font-weight:600">
                  ${ic(iconName, "sm")}
                  <span>${label}</span>
                </span>
                <strong style="font-family:Manrope;font-size:13.5px;font-variant-numeric:tabular-nums">${val}</strong>
              </div>
            `
              )
              .join("")}
          </div>
        </section>
      </div>

      <!-- Bottom Row: Gemini AI Usage + Integrations + App Version Release -->
      <div class="grid-3">
        <section class="glass-card">
          <div class="card-header">
            <div>
              <h2>${ic("Sparkles")} Gemini AI Maslahatchi sarfi</h2>
              <p>Model: <code>gemini-3.1-flash-lite</code> · Kunlik limit: 100</p>
            </div>
            <span class="badge-pill green"><i></i> AI Faol</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
              <div style="padding:10px;border-radius:12px;background:var(--surface-soft)">
                <div style="font-family:Manrope;font-size:20px;font-weight:800">342</div>
                <div style="font-size:11px;color:var(--muted)">So‘rovlar</div>
              </div>
              <div style="padding:10px;border-radius:12px;background:var(--surface-soft)">
                <div style="font-family:Manrope;font-size:20px;font-weight:800">118,4k</div>
                <div style="font-size:11px;color:var(--muted)">Kirish token</div>
              </div>
              <div style="padding:10px;border-radius:12px;background:var(--surface-soft)">
                <div style="font-family:Manrope;font-size:20px;font-weight:800">$0.04</div>
                <div style="font-size:11px;color:var(--muted)">Taxminiy USD</div>
              </div>
            </div>
            <div style="font-size:11.5px;color:var(--muted)">
              Telefon va email avtomatik niqoblanadi · AI faqat tasdiqlangan katalog IDlarini tavsiya qiladi.
            </div>
          </div>
        </section>

        <section class="glass-card">
          <div class="card-header">
            <div>
              <h2>${ic("ShieldCheck")} Tashqi provayderlar va Bot holati</h2>
              <p>Tezcheck · Telegram Webhook · Eskiz SMS</p>
            </div>
            <span class="badge-pill green">3/3 Ulangan</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:9px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
              <span><strong>Tezcheck Kassa</strong> (Click, Payme, Uzcard, Humo)</span>
              <span class="badge-pill green"><i></i> accepts_payments</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
              <span><strong>Telegram Bot</strong> (@sihhat_admins_bot)</span>
              <span class="badge-pill green"><i></i> Webhook Sync</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
              <span><strong>Eskiz SMS & Email OTP</strong> (Qo‘sh-OTP himoya)</span>
              <span class="badge-pill blue"><i></i> Email OTP Faol</span>
            </div>
          </div>
        </section>

        <section class="glass-card">
          <div class="card-header">
            <div>
              <h2>${ic("Smartphone")} Mobil Ilova Versiya Nazorati</h2>
              <p>GitHub Releases avto-bildirishnoma va iOS PWA</p>
            </div>
            <span class="badge-pill green">v0.2.8+11</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;font-size:12.5px">
              <span>Universal Android APK (v1+v2+v3 imzo)</span>
              <strong>~30.9 MB</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px">
              <span>Eski ilovalarga <code>app.update</code> xabari</span>
              <span class="badge-pill green">Yuborilgan</span>
            </div>
            <button class="btn soft sm" style="width:100%">
              ${ic("Megaphone", "sm")} Yangi APK chiqqanini e’lon qilish
            </button>
          </div>
        </section>
      </div>
    `;
  }

  /* ==========================================================================
     BOARD 04: SUPERADMIN SANATORIUMS & FEATURED ("MASHHUR")
     ========================================================================== */
  function board04() {
    const rows = [
      ["Zomin Sog‘lomlik Maskani", "Jizzax · Zomin tumani", "STIR: 204819201", "ACTIVE", true, "APPROVED", "Tasdiqlangan", "Ochiq · Direct", "12 xona · 4 tarif"],
      ["Chimyon Sanatoriyasi", "Farg‘ona · Chimyon", "STIR: 201948512", "ACTIVE", true, "APPROVED", "Tasdiqlangan", "Ochiq · Direct", "18 xona · 5 tarif"],
      ["Oqtosh Tog‘ Kurorti", "Toshkent · Bo‘stonliq", "STIR: 302918440", "ACTIVE", true, "APPROVED", "Tasdiqlangan", "Ochiq · Direct", "14 xona · 3 tarif"],
      ["Bo‘ston Sanatoriyasi", "Toshkent · Qibray", "STIR: 305112980", "ACTIVE", false, "SUBMITTED", "Tekshiruvda (1)", "Ochiq", "10 xona · 2 tarif"],
      ["Chortoq Mineral Suv", "Namangan · Chortoq", "STIR: 207841229", "PAUSED", false, "APPROVED", "Tasdiqlangan", "Yopiq", "8 xona · 2 tarif"],
    ];
    return shell({
      portal: "superadmin",
      activeNav: "sanatoriums",
      breadcrumb: "Sanatoriyalar va Bosh sahifa «Mashhur» vitrinasi",
      content: `
        <div class="page-header">
          <div>
            <h1>Sanatoriyalar va «Mashhur» vitrinasi boshqaruvi</h1>
            <p>«Bosh sahifada» ustunidagi switch orqali mobil ilova va saytning asosiy vitrinasidagi sanatoriyalarni belgilang.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab active">Barchasi <span class="count-pill">14</span></span>
              <span class="pill-tab">Faol <span class="count-pill">11</span></span>
              <span class="pill-tab">Moderatsiyada <span class="count-pill">2</span></span>
              <span class="pill-tab">⭐ Mashhur <span class="count-pill">4</span></span>
            </div>
            <button class="btn primary">${ic("Plus", "sm")} Yangi sanatoriya yaratish</button>
          </div>
        </div>

        <div class="grid-split-drawer">
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Building2")} Ro‘yxatdan o‘tgan sanatoriyalar</h2>
                <p>Faol HOME reklama yo‘q paytda «⭐ Bosh sahifada» belgilangan sanatoriyalar ilovada ko‘rinadi</p>
              </div>
              <span class="btn sm">${ic("RefreshCw", "sm")} Yangilash</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Sanatoriya va Hudud</th>
                  <th>Holat</th>
                  <th>⭐ Bosh sahifada</th>
                  <th>Profil / Bank</th>
                  <th>Bron</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    ([name, reg, stir, st, feat, rev, bank, ready, inv], i) => `
                  <tr class="${i === 3 ? "selected-row" : ""}">
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar" style="width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#00866c,#044e40)">${ic("Building2", "sm")}</div>
                        <div>
                          <strong>${name}</strong>
                          <span class="cell-sub">${reg} · ${stir}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge-pill ${st === "ACTIVE" ? "green" : "amber"}">
                        <i></i> ${st === "ACTIVE" ? "Faol" : "To‘xtatilgan"}
                      </span>
                    </td>
                    <td>
                      <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;background:${feat ? "var(--neon-soft)" : "var(--surface-soft)"};border:1px solid ${feat ? "var(--line-strong)" : "var(--line)"};font-weight:700;font-size:11.5px;white-space:nowrap">
                        <span style="width:15px;height:15px;border-radius:4px;background:${feat ? "var(--primary)" : "transparent"};border:1.5px solid var(--primary);color:#fff;display:grid;place-items:center;font-size:10px">${feat ? "✓" : ""}</span>
                        <span>${feat ? "⭐ Mashhur" : "Katalogda"}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge-pill ${rev === "APPROVED" ? "green" : "amber"}"><i></i> ${rev === "APPROVED" ? "Nashrda" : "Tekshiruvda"}</span>
                      <span class="cell-sub">Bank: ${bank}</span>
                    </td>
                    <td>
                      <span class="badge-pill ${ready.startsWith("Ochiq") ? "green" : "neutral"}">${ready.split(" · ")[0]}</span>
                    </td>
                    <td>
                      <div style="display:flex;gap:5px">
                        <span class="btn sm soft">Ko‘rish</span>
                        <span class="btn sm">${ic("Settings", "sm")}</span>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <!-- Right Side: Moderation & Bank Verification Drawer -->
          <section class="glass-card elevated">
            <div class="card-header">
              <div>
                <h2>${ic("ShieldCheck")} Moderatsiya va Bank Rekviziti</h2>
                <p>Bo‘ston Sanatoriyasi · Yangi tahrir #3 va Bank hisobi</p>
              </div>
              <span class="badge-pill amber"><i></i> Tasdiq kutilmoqda</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
              <div style="padding:13px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong>1. Profil anketasi va 12 ta surat</strong>
                  <span class="badge-pill green">To‘liq (100%)</span>
                </div>
                <p style="font-size:12px;color:var(--muted)">
                  Sharoitlar (Wi-Fi, Yopiq basseyn, Tuzli g‘or), Qaysi dardga davo (Yurak-qon tomir, Asab tizimi), Google Maps havolasi va Hamkor shartlari (v2026-11-15) tasdiqlangan.
                </p>
                <div style="display:flex;gap:8px">
                  <button class="btn primary sm">${ic("Check", "sm")} Profilni e’lon qilish</button>
                  <button class="btn sm">Tuzatishga qaytarish</button>
                </div>
              </div>

              <div style="padding:13px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong>2. Bank rekvizitlari (Qo‘lda tekshiruv)</strong>
                  <span class="badge-pill amber">Yangi so‘rov</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
                  <div><span class="cell-sub">Yuridik nom:</span><strong>"BO‘STON SIHHAT" MChJ</strong></div>
                  <div><span class="cell-sub">STIR / MFO:</span><strong>305112980 · MFO 00401</strong></div>
                  <div style="grid-column:1/-1"><span class="cell-sub">Hisob raqami (20 xonali):</span><strong style="font-family:Manrope">2020 8000 9051 1298 0001 · O‘zmilliybank AJ</strong></div>
                </div>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <button class="btn primary sm">${ic("Check", "sm")} Bank rekvizitini tasdiqlash</button>
                  <button class="btn danger sm">Rad etish</button>
                </div>
              </div>

              <div style="padding:13px;border-radius:16px;background:var(--neon-soft);border:1px solid var(--line-strong);display:flex;flex-direction:column;gap:6px">
                <strong style="font-size:12.5px">3. Onlayn bron va Abonent qoidasi</strong>
                <div style="display:flex;justify-content:space-between;font-size:12px">
                  <span>☑ Onlayn bron qabul qilishni ochish</span>
                  <span class="badge-pill green">Yoqilgan</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px">
                  <span>☐ Faol abonent talab qilinsin</span>
                  <span class="badge-pill neutral">Ixtiyoriy</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 05: SUPERADMIN APP USERS (#6-DIGIT ID) & CUSTOMER MANAGE MODAL
     ========================================================================== */
  function board05() {
    const users = [
      ["#482915", "Azizbek Rahimov", "@azizbek_r", "azizbek@gmail.com", "+998 90 123 45 67", true, "4 ta bron", "1 ta ochiq", "Bugun, 12:48 · Samsung SM-A165F (v0.2.8)", "ACTIVE"],
      ["#739104", "Dilnoza Karimova", "@dilnoza_k", "d.karimova@mail.uz", "+998 93 555 44 33", true, "2 ta bron", "0 ta", "Bugun, 12:35 · iPhone 15 Safari PWA", "ACTIVE"],
      ["#615820", "Rustam Toshmatov", "@rustam_t", "rustam88@inbox.uz", "+998 97 700 88 99", false, "1 ta bron", "2 ta", "21.11.2026 · Redmi Note 13 (v0.2.8)", "ACTIVE"],
      ["#304918", "Sardor Aliyev", "@sardor_a", "sardor.aliyev@uz", "+998 99 404 11 22", false, "0 ta bron", "0 ta", "18.11.2026 · Android 13 (v0.2.7)", "ACTIVE"],
      ["#928173", "Noma’lum Spam Hisob", "@spam_user", "—", "+998 91 000 11 00", false, "0 ta bron", "5 ta", "12.11.2026 · Bloklangan", "BLOCKED"],
    ];
    return shell({
      portal: "superadmin",
      activeNav: "app-users",
      breadcrumb: "Ilova foydalanuvchilari (#6-xonali unikal ID va Profil boshqaruvi)",
      content: `
        <div class="page-header">
          <div>
            <h1>Ilova foydalanuvchilari (Mijozlar bazasi)</h1>
            <p>Har bir foydalanuvchiga 6 xonali unikal raqamli ID (<code>#482915</code>) biriktirilgan. Profil surati, login, email va faol sessiyalar boshqaruvi.</p>
          </div>
          <div class="header-controls">
            <div class="filter-input" style="width:320px">
              ${ic("Search", "sm")}
              <span>#482915, ism, @login, email yoki telefon...</span>
            </div>
            <div class="pill-tabs">
              <span class="pill-tab active">Barchasi <span class="count-pill">1 420</span></span>
              <span class="pill-tab">🟢 Onlayn <span class="count-pill">38</span></span>
              <span class="pill-tab">Bloklangan <span class="count-pill">3</span></span>
            </div>
          </div>
        </div>

        <div class="grid-split-drawer">
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Smartphone")} Ro‘yxatdan o‘tgan mijozlar</h2>
                <p>Profil ustiga bosilganda suratni kattalashtirish yoki to‘liq boshqaruv oynasi ochiladi</p>
              </div>
              <span class="badge-pill green">Jonli baza</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Foydalanuvchi va #ID</th>
                  <th>Telefon</th>
                  <th>Bron / Chat</th>
                  <th>Oxirgi faollik & Qurilma</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                ${users
                  .map(
                    ([uid, name, login, email, phone, online, bks, tks, dev, st], idx) => `
                  <tr class="${idx === 0 ? "selected-row" : ""}">
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar ${online ? "online" : ""}" style="width:34px;height:34px;background:${idx % 2 === 0 ? "linear-gradient(135deg,#10b981,#047857)" : "linear-gradient(135deg,#0ea5e9,#0369a1)"}">${name.slice(0, 1)}</div>
                        <div>
                          <div style="display:flex;align-items:center;gap:5px">
                            <strong>${name}</strong>
                            <span class="id-chip">${uid}</span>
                          </div>
                          <span class="cell-sub">${login} · ${email}</span>
                        </div>
                      </div>
                    </td>
                    <td><strong style="color:var(--primary);white-space:nowrap">${phone}</strong></td>
                    <td>
                      <span class="badge-pill ${bks.startsWith("0") ? "neutral" : "green"}">${bks}</span>
                      <span class="cell-sub">Chat: ${tks}</span>
                    </td>
                    <td>
                      <span style="font-size:11.5px;font-weight:600">${dev.split(" · ")[0]}</span>
                      <span class="cell-sub">${dev.split(" · ")[1] || ""}</span>
                    </td>
                    <td>
                      <div style="display:flex;gap:5px;white-space:nowrap">
                        <span class="btn sm ${idx === 0 ? "primary" : "soft"}">Tahrir</span>
                        <span class="btn sm">${st === "ACTIVE" ? "Blok" : "Ochish"}</span>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <!-- Right Side: CustomerManageModal Preview -->
          <section class="glass-card elevated">
            <div class="card-header">
              <div>
                <h2>Azizbek Rahimov · <span class="id-chip">#482915</span></h2>
                <p>Profil rasmi, shaxsiy ma’lumotlar, jonli login/email tekshiruvi va sessiyalar</p>
              </div>
              <span class="circle-btn" style="width:32px;height:32px">${ic("X", "sm")}</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:13px">
              <!-- Avatar upload box -->
              <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line)">
                <div class="user-avatar online" style="width:62px;height:62px;font-size:22px;background:linear-gradient(135deg,#10b981,#047857)">A</div>
                <div style="flex:1">
                  <strong style="font-size:13px">Foydalanuvchi profil surati</strong>
                  <span class="cell-sub">Ilovadan o‘rnatilgan (maks. 15 MB, avtomatik WebP/JPEG siqish)</span>
                  <div style="display:flex;gap:8px;margin-top:8px">
                    <span class="btn sm">${ic("Camera", "sm")} Rasmni almashtirish</span>
                    <span class="btn sm danger">${ic("Trash2", "sm")} Rasmni o‘chirish</span>
                  </div>
                </div>
              </div>

              <div class="grid-2-equal" style="gap:10px">
                <div class="form-field">
                  <label><span>To‘liq ism *</span></label>
                  <div class="input-box">Azizbek Rahimov</div>
                </div>
                <div class="form-field">
                  <label><span>Telefon raqami</span></label>
                  <div class="input-box">+998901234567</div>
                </div>
                <div class="form-field">
                  <label>
                    <span>Login (username)</span>
                    <span class="live-check-tag">${ic("CircleCheck", "sm")} Baza: bo‘sh</span>
                  </label>
                  <div class="input-box verified">@azizbek_r</div>
                </div>
                <div class="form-field">
                  <label>
                    <span>Elektron pochta (Email)</span>
                    <span class="live-check-tag">${ic("CircleCheck", "sm")} Baza: bo‘sh</span>
                  </label>
                  <div class="input-box verified">azizbek@gmail.com</div>
                </div>
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px 13px;border-radius:13px;background:var(--neon-soft);border:1px solid var(--line-strong);font-size:12px">
                <span>ID: <strong>#482915</strong></span>
                <span>·</span>
                <span>Holat: <strong style="color:var(--success-ink)">Faol (Onlayn)</strong></span>
                <span>·</span>
                <span>Bronlar: <strong>4 ta</strong></span>
                <span>·</span>
                <span>Faol sessiyalar: <strong>2 ta qurilma</strong></span>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:6px;border-top:1px solid var(--line)">
                <div style="display:flex;gap:6px">
                  <span class="btn sm">${ic("LogOut", "sm")} Sessiyalarni yopish (2)</span>
                  <span class="btn sm danger">${ic("Trash2", "sm")} O‘chirish</span>
                </div>
                <div style="display:flex;gap:8px">
                  <span class="btn sm">Yopish</span>
                  <span class="btn sm primary">${ic("Check", "sm")} Saqlash</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 06: SUPERADMIN STAFF APPROVAL & 24 PERMISSIONS MATRIX
     ========================================================================== */
  function board06() {
    const staffRows = [
      ["#519204", "Bahrom Jo‘rayev", "@zomin.direktor", "Zomin Maskani", "DIRECTOR", "ACTIVE", "24 / 24 vakolat", true],
      ["#682011", "Malika Umarova", "@zomin.resepshn", "Zomin Maskani", "RECEPTION", "ACTIVE", "10 / 24 vakolat", true],
      ["#840192", "Jamshid Xolmatov", "@zomin.hisobchi", "Zomin Maskani", "ACCOUNTANT", "ACTIVE", "3 / 24 vakolat", false],
      ["#903418", "Nilufar Qodirova", "@chimyon.resepshn2", "Chimyon Sanatoriyasi", "RECEPTION", "PENDING_APPROVAL", "10 / 24 (Taklif)", false],
    ];
    return shell({
      portal: "superadmin",
      activeNav: "staff",
      tenantLabel: "Zomin Sog‘lomlik Maskani",
      breadcrumb: "Jamoa, Xodim tasdig‘i va 24 ta Ruxsatlar matritsasi",
      content: `
        <div class="page-header">
          <div>
            <h1>Sanatoriya jamoasi, Xodimlarni tasdiqlash va Ruxsatlar</h1>
            <p>Direktor taklif qilgan yangi xodimlar superadmin tasdiqlaganidan so‘ng tizimga kira oladi. Har bir vakolat alohida boshqariladi.</p>
          </div>
          <div class="header-controls">
            <button class="btn soft">${ic("Users", "sm")} Direktor tayinlash</button>
            <button class="btn primary">${ic("Plus", "sm")} Yangi xodim qo‘shish</button>
          </div>
        </div>

        <!-- Alert Banner for Pending Approvals & Forgot Password -->
        <div style="padding:12px 18px;border-radius:16px;background:var(--amber-bg);border:1px solid rgba(245,158,11,0.38);color:var(--amber-ink);display:flex;align-items:center;justify-content:space-between;gap:14px">
          <div style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:13px">
            ${ic("Clock")}
            <span>1 ta yangi xodim taklifi (Nilufar Qodirova · Chimyon) va 1 ta «Parolni unutdingizmi?» so‘rovi tasdiq kutmoqda.</span>
          </div>
          <span class="btn sm" style="background:rgba(255,255,255,0.85);color:#78350f">So‘rovlarni ko‘rish</span>
        </div>

        <div class="grid-split-drawer">
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Users")} Sanatoriya xodimlari ro‘yxati</h2>
                <p>6 xonali ID, lavozim, jonli onlayn holat va vakolatlar</p>
              </div>
              <div class="pill-tabs">
                <span class="pill-tab active">Barchasi (8)</span>
                <span class="pill-tab">Direktor</span>
                <span class="pill-tab">Resepshn</span>
                <span class="pill-tab">Hisobchi</span>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Xodim, #ID va Sanatoriya</th>
                  <th>Lavozim</th>
                  <th>Holat</th>
                  <th>Vakolatlar</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                ${staffRows
                  .map(
                    ([uid, name, login, san, role, st, perms, on], i) => `
                  <tr class="${i === 1 ? "selected-row" : ""}">
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar ${on ? "online" : ""}" style="width:34px;height:34px;background:${role === "DIRECTOR" ? "linear-gradient(135deg,#00866c,#064e3b)" : role === "ACCOUNTANT" ? "linear-gradient(135deg,#0284c7,#1e3a8a)" : "linear-gradient(135deg,#10b981,#047857)"}">${name.slice(0, 1)}</div>
                        <div>
                          <div style="display:flex;align-items:center;gap:5px">
                            <strong>${name}</strong>
                            <span class="id-chip">${uid}</span>
                          </div>
                          <span class="cell-sub">${login} · <strong>${san}</strong></span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge-pill ${role === "DIRECTOR" ? "green" : role === "ACCOUNTANT" ? "blue" : "purple"}">
                        ${role === "DIRECTOR" ? "Direktor" : role === "ACCOUNTANT" ? "Hisobchi" : "Resepshn"}
                      </span>
                    </td>
                    <td>
                      <span class="badge-pill ${st === "ACTIVE" ? "green" : "amber"}">
                        <i></i> ${st === "ACTIVE" ? "Faol" : "Tasdiq kutilmoqda"}
                      </span>
                    </td>
                    <td><strong style="font-size:11.5px;white-space:nowrap">${perms}</strong></td>
                    <td>
                      ${
                        st === "PENDING_APPROVAL"
                          ? `<div style="display:flex;gap:5px;white-space:nowrap"><span class="btn sm primary">${ic("Check", "sm")} Tasdiqlash</span><span class="btn sm danger">Rad</span></div>`
                          : `<div style="display:flex;gap:5px;white-space:nowrap"><span class="btn sm soft">Tahrir</span><span class="btn sm">Ruxsat</span></div>`
                      }
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <!-- Right Side: StaffManageModal & Permissions Matrix -->
          <section class="glass-card elevated">
            <div class="card-header">
              <div>
                <h2>Malika Umarova · <span class="id-chip">#682011</span></h2>
                <p>Xodim hisobi, yangi vaqtinchalik parol va 24 ta ruxsatlar matritsasi</p>
              </div>
              <span class="badge-pill purple">Resepshn</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div class="grid-2-equal" style="gap:9px">
                <div class="form-field">
                  <label><span>Login</span><span class="live-check-tag">✓ Bo‘sh</span></label>
                  <div class="input-box verified">zomin.resepshn</div>
                </div>
                <div class="form-field">
                  <label><span>Yangi parol berish</span><span style="font-size:10.5px;color:var(--muted)">Tiklash uchun</span></label>
                  <div class="input-box">•••••••••••• ${ic("KeyRound", "sm")}</div>
                </div>
              </div>

              <div style="font-size:11.5px;font-weight:800;color:var(--ink-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px">
                GRANULYAR VAKOLATLAR MATRITSASI (10 / 24 YOQILGAN)
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px">
                ${[
                  [true, "Bronlarni ko‘rish (bookings.read)"],
                  [true, "Qo‘lda bron yaratish (create_manual)"],
                  [true, "Mehmonni joylashtirish (check_in)"],
                  [true, "Ketishni qayd etish (check_out)"],
                  [true, "Joyida to‘lov qaydi (offline.record)"],
                  [false, "Joyida to‘lovni tasdiqlash (verify)"],
                  [true, "Xonalar va Shaxmatka (inventory)"],
                  [false, "Tarif va narx o‘zgartirish (pricing)"],
                  [true, "Murojaat va yordam chati (support)"],
                  [false, "Moliyaviy hisobot va eksport"],
                ]
                  .map(
                    ([on, text]) => `
                  <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:${on ? "var(--neon-soft)" : "var(--surface-soft)"};border:1px solid ${on ? "var(--line-strong)" : "var(--line)"}">
                    <span style="width:16px;height:16px;border-radius:5px;background:${on ? "var(--primary)" : "transparent"};border:1.5px solid var(--primary);color:#fff;display:grid;place-items:center;font-size:10px;flex-shrink:0">${on ? "✓" : ""}</span>
                    <span style="font-weight:${on ? 700 : 500}">${text}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line)">
                <span class="btn sm">${ic("LogOut", "sm")} Xodim sessiyalarini yopish</span>
                <span class="btn sm primary">${ic("Check", "sm")} O‘zgarishlarni saqlash</span>
              </div>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 07: SUPERADMIN FINANCE, TEZCHECK & MOBILE AD PREVIEW
     ========================================================================== */
  function board07() {
    return shell({
      portal: "superadmin",
      activeNav: "payments",
      breadcrumb: "Moliya markazi: Tezcheck Kassa, O‘tkazmalar va Ilovadagi Reklama vitrinasi",
      content: `
        <div class="page-header">
          <div>
            <h1>Moliya markazi, Tezcheck va Reklama kampaniyalari</h1>
            <p>Onlayn to‘lovlar, sanatoriyaga bank o‘tkazmalari, abonent hisoblari va mobil ilovadagi HOME reklama previewi.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab active">Onlayn to‘lovlar</span>
              <span class="pill-tab">Bank o‘tkazmalari (3)</span>
              <span class="pill-tab">Refund (1)</span>
              <span class="pill-tab">HOME Reklama (2)</span>
            </div>
            <button class="btn primary">${ic("Plus", "sm")} O‘tkazma / Reklama yaratish</button>
          </div>
        </div>

        <!-- Tezcheck Live Status Strip -->
        <section class="glass-card" style="padding:14px 20px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:center">
            <div style="display:flex;align-items:center;gap:12px">
              <span class="kpi-icon">${ic("CreditCard")}</span>
              <div>
                <span class="cell-sub">TO‘LOV PROVAYDERI</span>
                <strong style="font-size:14px">Tezcheck Signed API</strong>
              </div>
            </div>
            <div>
              <span class="cell-sub">API VA KASSA HOLATI</span>
              <div style="display:flex;gap:6px;margin-top:3px">
                <span class="badge-pill green"><i></i> API Faol</span>
                <span class="badge-pill green"><i></i> accepts_payments: true</span>
              </div>
            </div>
            <div>
              <span class="cell-sub">QABUL QILINADIGAN USULLAR</span>
              <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
                ${["Click", "Payme", "Uzcard", "Humo", "Direct Merchant"].map((m) => `<span class="id-chip">${m}</span>`).join("")}
              </div>
            </div>
            <div style="text-align:right">
              <span class="btn sm soft">${ic("RefreshCw", "sm")} Kassa holatini tekshirish</span>
            </div>
          </div>
        </section>

        <div style="display:grid;grid-template-columns:1.45fr 355px;gap:18px;align-items:start">
          <div style="display:flex;flex-direction:column;gap:16px">
            <section class="glass-card">
              <div class="card-header">
                <div>
                  <h2>${ic("FileCheck")} Onlayn to‘lovlar va Bank o‘tkazmalari</h2>
                  <p>Yakunlangan bronlar bo‘yicha bank dalili (PDF/PNG) biriktirilgan o‘tkazmalar</p>
                </div>
                <span class="badge-pill green">0% platforma komissiyasi</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Bron / Sanatoriya</th>
                    <th>Tur va Usul</th>
                    <th>Summa</th>
                    <th>Holat</th>
                    <th>Bank tasdig‘i / Dalil</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>BR-2026-0842</strong><span class="cell-sub">Zomin Sog‘lomlik Maskani</span></td>
                    <td>Bron to‘lovi · Click</td>
                    <td><strong style="font-family:Manrope">3 600 000 so‘m</strong></td>
                    <td><span class="badge-pill green"><i></i> To‘langan</span></td>
                    <td><span class="btn sm soft">Chek #TC-99412</span></td>
                  </tr>
                  <tr>
                    <td><strong>BR-2026-0839</strong><span class="cell-sub">Chimyon Sanatoriyasi</span></td>
                    <td>Bron to‘lovi · Payme</td>
                    <td><strong style="font-family:Manrope">4 500 000 so‘m</strong></td>
                    <td><span class="badge-pill green"><i></i> To‘langan</span></td>
                    <td><span class="btn sm soft">Chek #PM-44108</span></td>
                  </tr>
                  <tr>
                    <td><strong>O‘TKAZMA #PO-118</strong><span class="cell-sub">"ZOMIN SIHHAT" MChJ · 20208000...</span></td>
                    <td>Sanatoriyaga payout</td>
                    <td><strong style="font-family:Manrope">42 800 000 so‘m</strong></td>
                    <td><span class="badge-pill blue"><i></i> Bankka yuborilgan</span></td>
                    <td><span class="btn sm primary">Bank dalilini tasdiqlash</span></td>
                  </tr>
                  <tr>
                    <td><strong>ABONENT #INV-204</strong><span class="cell-sub">Oqtosh Tog‘ Kurorti · Noyabr</span></td>
                    <td>Oylik abonent to‘lovi</td>
                    <td><strong style="font-family:Manrope">1 500 000 so‘m</strong></td>
                    <td><span class="badge-pill green"><i></i> To‘langan</span></td>
                    <td><span class="cell-sub">01.11.2026 — 01.12.2026</span></td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="glass-card">
              <div class="card-header">
                <div>
                  <h2>${ic("Megaphone")} HOME Reklama kampaniyalari (Admin tasdiqlagach bepul)</h2>
                  <p>Faol reklama mobil ilova bosh sahifasida «Mashhur sanatoriyalar» o‘rnida chiqadi</p>
                </div>
                <span class="badge-pill green">1 ta LIVE · 1 ta kutmoqda</span>
              </div>
              <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="padding:13px;border-radius:16px;background:var(--neon-soft);border:1px solid var(--line-strong);display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between">
                    <strong>Zomin: Tog‘ archazori va Tuzli g‘or</strong>
                    <span class="badge-pill green"><i></i> LIVE · Ilovada</span>
                  </div>
                  <span style="font-size:12px;color:var(--muted)">15.11.2026 — 30.11.2026 · Joylashuv: Bosh sahifa (HOME)</span>
                </div>
                <div style="padding:13px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between">
                    <strong>Chimyon: Qishki sog‘lomlashtirish -15%</strong>
                    <span class="badge-pill amber"><i></i> Tasdiq kutilmoqda</span>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:4px">
                    <span class="btn sm primary">Tasdiqlash (Bepul)</span>
                    <span class="btn sm danger">Rad etish</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Side: Live Mobile App HOME Ad Preview -->
          <div class="phone-frame">
            <div class="phone-screen">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#9fd4c5;font-weight:700">
                <span>09:41 · Sihhat.uz APK v0.2.8</span>
                <span>5G · 98%</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="../web/assets/sihhat-logo.jpg" style="width:28px;height:28px;border-radius:8px" />
                  <strong style="font-family:Manrope;font-size:15px">Sihhat<span style="color:#3ee6bf">.uz</span></strong>
                </div>
                <span class="badge-pill green" style="font-size:10px">HOME Preview</span>
              </div>
              <div style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid rgba(62,230,191,0.25);font-size:11px;color:#9fd4c5">
                🔍 Sanatoriya yoki dard bo‘yicha qidiring...
              </div>
              <div style="position:relative;border-radius:16px;overflow:hidden;height:145px;border:1px solid rgba(62,230,191,0.4)">
                <img src="../web/assets/retreat.png" style="width:100%;height:100%;object-fit:cover" />
                <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 20%,rgba(2,20,17,0.92) 100%);padding:11px;display:flex;flex-direction:column;justify-content:flex-end">
                  <span style="align-self:flex-start;padding:2px 8px;border-radius:999px;background:#3ee6bf;color:#03241e;font-size:9.5px;font-weight:800">⚡ FAOL HOME REKLAMA</span>
                  <strong style="font-size:13.5px;margin-top:4px">Zomin: Tog‘ archazori va Tuzli g‘or</strong>
                  <span style="font-size:10.5px;color:#b8e5d8">Nafas yo‘llari va asab tizimi uchun · 450 000 so‘m/tun</span>
                </div>
              </div>
              <div style="font-size:10.5px;color:#9fd4c5;line-height:1.45;padding:6px 8px;border-radius:10px;background:rgba(62,230,191,0.08)">
                ✓ Reklama muddati tugagach, shu joyga avtomatik Superadmin tick bilan tanlagan 4 ta «⭐ Mashhur» sanatoriya qaytadi.
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 08: SUPERADMIN TELEGRAM-STYLE SUPPORT CHAT & ANNOUNCEMENTS (DARK)
     ========================================================================== */
  function board08() {
    return shell({
      portal: "superadmin",
      activeNav: "support",
      breadcrumb: "Aloqa markazi: Telegram-uslubidagi Yordam Chati va Ommaviy E’lonlar",
      content: `
        <div class="page-header">
          <div>
            <h1>Yordam va Xabarlar Markazi (Telegram Messenger V3)</h1>
            <p>Mijozlar va sanatoriya xodimlari bilan jonli suhbat, @sihhat_admins_bot sinxronizatsiyasi hamda tizim bo‘ylab ommaviy e’lonlar.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab active">💬 Yordam suhbatlari <span class="count-pill">4</span></span>
              <span class="pill-tab">📢 E’lonlar va Xabarlar <span class="count-pill">12</span></span>
              <span class="pill-tab">📋 So‘rovnomalar (Anketa)</span>
            </div>
            <button class="btn primary">${ic("Megaphone", "sm")} Yangi ommaviy e’lon berish</button>
          </div>
        </div>

        <div class="grid-split-drawer">
          <!-- Telegram Messenger Hub -->
          <div class="tg-hub-v3" style="height:640px">
            <div class="tg-list-pane">
              <div style="padding:12px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px">
                <div class="filter-input">
                  ${ic("Search", "sm")}
                  <span>Mijoz, #ID yoki sanatoriya...</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <span class="btn sm primary">Ochiq (4)</span>
                  <span class="btn sm">Yopilgan (38)</span>
                </div>
              </div>
              <div>
                ${[
                  ["Azizbek Rahimov · #482915", "📱 Mobil mijoz", "Bron SH-105B8A bo‘yicha kelish vaqti...", "12:46", true, true],
                  ["Zomin Sog‘lomlik Maskani", "🏥 Bahrom J. (Direktor)", "Yangi qishki tariflarni tasdiqlash haqida", "11:20", true, false],
                  ["Dilnoza Karimova · #739104", "📱 Mobil mijoz", "1 kishilik ayollar xonasi bo‘shami?", "Kecha", true, false],
                  ["Chimyon Sanatoriyasi", "🏥 Qabulxona", "E-mehmon blankasi bo‘yicha savol", "20.11", false, false],
                ]
                  .map(
                    ([title, role, prev, tm, on, act]) => `
                  <div class="tg-thread-item ${act ? "active" : ""}">
                    <div class="user-avatar ${on ? "online" : ""}" style="background:linear-gradient(135deg,#10b981,#047857)">${title.slice(0, 1)}</div>
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;justify-content:space-between;font-size:12.5px">
                        <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</strong>
                        <span style="font-size:11px;opacity:0.75">${tm}</span>
                      </div>
                      <span class="cell-sub" style="font-weight:700">${role}</span>
                      <span class="cell-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${prev}</span>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            <div class="tg-chat-pane">
              <div style="padding:11px 15px;border-bottom:1px solid var(--line);background:var(--surface-strong);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                <div class="user-cell">
                  <div class="user-avatar online" style="width:34px;height:34px;background:linear-gradient(135deg,#10b981,#047857)">A</div>
                  <div>
                    <div style="display:flex;align-items:center;gap:6px">
                      <strong>Azizbek Rahimov</strong>
                      <span class="id-chip">#482915</span>
                    </div>
                    <span class="cell-sub">🟢 Onlayn · +998 90 123 45 67 · Bron: SH-105B8A</span>
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  <span class="badge-pill green">Bot ulangan</span>
                  <span class="btn sm">Yopish</span>
                </div>
              </div>

              <div class="tg-messages-area">
                <div style="align-self:center;padding:3px 12px;border-radius:999px;background:var(--surface-strong);font-size:11px;font-weight:700;color:var(--muted)">
                  Bugun, 22-noyabr
                </div>
                <div class="chat-bubble incoming">
                  <div style="font-size:11px;font-weight:800;color:var(--primary);margin-bottom:3px">Azizbek Rahimov (#482915 · Mobil ilova)</div>
                  Assalomu alaykum! Zomin sanatoriyasiga 24-noyabr kuni ertalab soat 09:00 da yetib borsak, xonaga erta joylashish imkoni bo‘ladimi?
                  <div style="font-size:10px;color:var(--muted);text-align:right;margin-top:4px">12:42 · Tahrirlangan (audit saqlangan)</div>
                </div>
                <div class="chat-bubble outgoing">
                  <div style="font-size:11px;font-weight:800;margin-bottom:3px">🛡️ Platforma Superadmini (Telegram bot orqali)</div>
                  Vaalaykum assalom, Azizbek! Zomin sanatoriyasi resepshni bilan bog‘landik — 104-xona hozir bo‘sh, soat 09:00 da bemalol joylashishingiz mumkin. QR-vaucheringiz tayyor!
                  <div style="font-size:10px;opacity:0.75;text-align:right;margin-top:4px">12:46 · ✓✓ O‘qildi (Email + Push yuborildi)</div>
                </div>
              </div>

              <div style="padding:12px 16px;border-top:1px solid var(--line);background:var(--surface-strong);display:flex;align-items:center;gap:10px">
                <span class="circle-btn" style="width:36px;height:36px">${ic("Paperclip", "sm")}</span>
                <div class="filter-input grow" style="border-radius:999px">Javob yozing (ilovada, saytda va mijoz emailida darhol chiqadi)...</div>
                <button class="btn primary">${ic("Send", "sm")} Yuborish</button>
              </div>
            </div>
          </div>

          <!-- Right Side: New Announcement Modal Preview -->
          <section class="glass-card elevated">
            <div class="card-header">
              <div>
                <h2>${ic("Megaphone")} Yangi ommaviy e’lon berish</h2>
                <p>Kimga yuborilishini tanlang (In-App + Bildirishnoma)</p>
              </div>
              <span class="badge-pill green">2-qadam</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                ${[
                  ["🌐 Butun tizimga", "Mijoz + Hamkor", false],
                  ["📱 Mijozlarga", "Ilova egalariga", false],
                  ["🏥 Hamkorlarga", "Sanatoriyalarga", true],
                ]
                  .map(
                    ([t, d, act]) => `
                  <div style="padding:10px;border-radius:14px;background:${act ? "var(--neon-soft)" : "var(--surface-soft)"};border:1.5px solid ${act ? "var(--primary)" : "var(--line)"};text-align:center">
                    <strong style="display:block;font-size:12px">${t}</strong>
                    <span style="font-size:10.5px;color:var(--muted)">${d}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>

              <div class="form-field">
                <label><span>Tanlangan sanatoriyalar</span><span class="live-check-tag">Barchasi (14 ta)</span></label>
                <div class="input-box">☑ Zomin · ☑ Chimyon · ☑ Oqtosh · ☑ Bo‘ston (+10)</div>
              </div>

              <div class="form-field">
                <label><span>E’lon sarlavhasi *</span><span class="badge-pill amber">Ogohlantirish</span></label>
                <div class="input-box">Qishki mavsum tariflari va E-mehmon anketasi yangilandi</div>
              </div>

              <div class="form-field">
                <label><span>E’lon matni *</span></label>
                <div class="input-box" style="height:86px;align-items:flex-start;font-weight:500;font-size:12.5px">
                  Hurmatli sanatoriya rahbarlari! 1-dekabrdan boshlab barcha koyka-o‘rin va kasaba uyushmasi kvotalarini Shaxmatka bo‘limida yangilab qo‘yishingizni so‘raymiz.
                </div>
              </div>

              <button class="btn primary" style="width:100%">
                ${ic("Send", "sm")} E’lonni barcha hamkorlarga yuborish
              </button>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 09: HAMKORLAR LOGIN, FORGOT PASSWORD & 9-SECTION PARTNER TERMS
     ========================================================================== */
  function board09() {
    return `
      <div class="login-v3">
        <section class="login-showcase">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="brand-row" style="padding:0">
              <div class="brand-logo-wrap">
                <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
              </div>
              <div>
                <div class="brand-title">sihhat<em>.uz</em></div>
                <span class="brand-caption">Sanatoriya Hamkorlar Portali (/hamkorlar)</span>
              </div>
            </div>
            <span style="display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(62,230,191,0.12);border:1px solid rgba(62,230,191,0.34);font-size:11px;font-weight:800;color:#8ff5dc">
              <span class="pulse-dot" style="margin:0"></span>
              DIREKTOR · RESEPSHN · HISOBCHI
            </span>
          </div>

          <div>
            <div style="font-size:11.5px;font-weight:800;letter-spacing:0.14em;color:#8ff5dc;text-transform:uppercase">
              SANATORIYANGIZ UCHUN ZAMONAVIY ISH STOLI
            </div>
            <h1>
              Har bir xona va koyka.<br />
              <span>Yagona Shaxmatka va CRMda.</span>
            </h1>
            <p style="color:#b2ddd1;font-size:13.5px;max-width:580px">
              Onlayn va telefon bronlari, erkaklar/ayollar koyka-o‘rinlari, kutish ro‘yxati, kasaba uyushmalari kvotasi hamda 1 tugmada E-mehmon anketasini chop etish.
            </p>

            <!-- 9-Section Partner Terms Preview Card inside Showcase -->
            <div style="margin-top:16px;padding:18px 20px;border-radius:22px;background:rgba(3,28,23,0.78);border:1px solid rgba(62,230,191,0.32);backdrop-filter:blur(12px);display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <strong style="font-size:14px;color:#ffffff;display:flex;align-items:center;gap:8px">
                  ${ic("FileCheck", "sm")} Sihhat.uz Hamkorlik Nizomi va Shartlari (9 bo‘lim · v2026-11-15)
                </strong>
                <span class="badge-pill green">0% Bron Komissiyasi</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:11.5px;color:#bfe6da">
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">1. 0% komissiya va abonent modeli</div>
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">2. Profil va narx haqqoniyligi</div>
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">3. Kvota va Overbooking taqiqi</div>
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">4. Direct/Tezcheck to‘lov intizomi</div>
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">5. RBAC rollar va xavfsizlik</div>
                <div style="padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05)">6. E-mehmon va shaxsiy ma’lumot</div>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:12px;color:#8dbcb0">
            <span>© 2026 Sihhat.uz · Sanatoriyalar Hamkorlik Platformasi</span>
            <span>Telegram bot: @sihhat_admins_bot</span>
          </div>
        </section>

        <section class="login-panel-wrap" style="gap:16px">
          <div class="login-card-v3">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div class="brand-logo-wrap" style="width:54px;height:54px;border-radius:16px">
                <img src="../web/assets/sihhat-logo.jpg" alt="Sihhat.uz" />
              </div>
              <div class="pill-tabs">
                <span class="pill-tab active">Direktor</span>
                <span class="pill-tab">Resepshn</span>
                <span class="pill-tab">Hisobchi</span>
              </div>
            </div>

            <div>
              <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:var(--primary);text-transform:uppercase">
                SANATORIYA BOSHQARUV PANELI
              </div>
              <h2 style="font-size:26px;font-weight:800;margin-top:2px">Hisobingizga kiring</h2>
            </div>

            <div class="form-field">
              <label><span>Xodim logini</span></label>
              <div class="input-box verified">${ic("Users", "sm")} <span>zomin.direktor</span></div>
            </div>

            <div class="form-field">
              <label><span>Parol</span></label>
              <div class="input-box" style="justify-content:space-between">
                <span>••••••••••••</span>
                ${ic("Eye", "sm")}
              </div>
            </div>

            <button class="btn primary" style="width:100%;padding:12px">
              <span>Panelga kirish</span>
              ${ic("ArrowRight", "sm")}
            </button>

            <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;color:var(--primary)">
              <span>🔑 Parolni unutdingizmi?</span>
              <span>📜 Hamkor shartlari bilan tanishish ↗</span>
            </div>
          </div>

          <!-- Instant Forgot Password Modal Preview Below Login Card -->
          <div class="glass-card elevated" style="width:100%;max-width:470px;padding:18px 22px;border-radius:22px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <strong style="font-size:14.5px;display:flex;align-items:center;gap:8px">
                ${ic("KeyRound", "sm")} «Parolni unutdingizmi?» — Tezkor tiklash oynasi
              </strong>
              <span class="badge-pill green">Email + Telegram Bot</span>
            </div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:10px">
              Loginingiz va telefoningizni kiriting — so‘rov darhol Superadminning elektron pochtasi va Telegram botiga boradi:
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
              <div class="input-box" style="padding:8px 11px;font-size:12px">Login: <strong>zomin.resepshn</strong></div>
              <div class="input-box" style="padding:8px 11px;font-size:12px">Tel: <strong>+998 90 123 45 67</strong></div>
            </div>
            <button class="btn soft sm" style="width:100%">
              ${ic("Send", "sm")} Superadminga parol tiklash so‘rovini yuborish
            </button>
          </div>
        </section>
      </div>
    `;
  }

  /* ==========================================================================
     BOARD 10: HAMKORLAR DIRECTOR DASHBOARD & TODAY'S WORK
     ========================================================================== */
  function board10() {
    return shell({
      portal: "partner",
      roleLabel: "DIREKTOR",
      userName: "Bahrom Jo‘rayev",
      userId: "#519204",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Jizzax",
      activeNav: "dashboard",
      breadcrumb: "Direktor Bosh sahifasi va «Bugungi ishlar» operatsion markazi",
      content: `
        <div class="page-header">
          <div>
            <h1>Zomin Sog‘lomlik Maskani — Bugungi ishlar, bir qarashda</h1>
            <p>22-noyabr 2026 · Bugun keladigan va ketadigan mehmonlar, xonalar bandligi hamda sanatoriyadagi kunlik tartib.</p>
          </div>
          <div class="header-controls">
            <span class="badge-pill green">⭐ Bosh sahifada (Mashhur)</span>
            <button class="btn soft">${ic("CalendarDays", "sm")} Shaxmatkani ochish</button>
            <button class="btn primary">${ic("Plus", "sm")} Qo‘lda bron yaratish</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">FAOL BRONLAR (NOYABR)</span><span class="kpi-icon">${ic("BookOpen")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">48<span class="kpi-unit">ta bron</span></div>${spark("2,24 18,21 34,15 50,17 66,9 82,4")}</div>
            <div class="kpi-foot"><span class="kpi-trend">▲ +14%</span><span class="kpi-sub">32 butun xona · 16 koyka-o‘rin</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">XONALAR VA KOYKA BANDLIGI</span><span class="kpi-icon">${ic("BedDouble")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">86,4<span class="kpi-unit">%</span></div>${spark("2,22 20,18 38,16 54,12 70,8 82,5")}</div>
            <div class="kpi-foot"><span class="kpi-trend">42 / 48 xona</span><span class="kpi-sub">6 ta bo‘sh o‘rin qoldi</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">BUGUN KELADIGAN / KETADIGAN</span><span class="kpi-icon">${ic("Users")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">9 / 5<span class="kpi-unit">mehmon</span></div>${spark("2,20 22,15 42,18 62,10 82,7")}</div>
            <div class="kpi-foot"><span class="kpi-trend">Check-in 14:00</span><span class="kpi-sub">Check-out 12:00 gacha</span></div>
          </div>
          <div class="kpi-card featured">
            <div class="kpi-top"><span class="kpi-label">TASDIQLANGAN TUSHUM</span><span class="kpi-icon">${ic("Coins")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">68 400 000<span class="kpi-unit">so‘m</span></div>${spark("2,26 20,21 40,16 60,11 82,3", "#8ff5dc", "rgba(143,245,220,0.24)")}</div>
            <div class="kpi-foot"><span class="kpi-trend">0% komissiya</span><span class="kpi-sub">54,2 mln onlayn · 14,2 mln joyida</span></div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Today's Arrivals & Departures Live Table -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("CalendarDays")} Bugungi ishlar: Kelish (Check-in) va Ketish (Check-out)</h2>
                <p>Har 20 soniyada yangilanadi · 1 tugmada joylashtirish va E-mehmon chop etish</p>
              </div>
              <div class="pill-tabs">
                <span class="pill-tab active">Keladiganlar (9)</span>
                <span class="pill-tab">Ketadiganlar (5)</span>
                <span class="pill-tab">To‘lovi qolgan (2)</span>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Bron va Manba</th>
                  <th>Mehmon va Pasport</th>
                  <th>Xona / Joylashish turi</th>
                  <th>Holat</th>
                  <th>Tezkor amal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>BR-2026-0842</strong><span class="cell-sub">🏛 Kasaba uyushmasi</span></td>
                  <td><strong>Rustam Karimov</strong><span class="cell-sub">AD 4829104 · +998 90 123 45 67</span></td>
                  <td><strong>104-xona (2-koyka)</strong><span class="cell-sub">👨 1 joy · Erkaklar xonasi</span></td>
                  <td><span class="badge-pill green"><i></i> Tasdiqlangan</span></td>
                  <td>
                    <div style="display:flex;gap:5px;white-space:nowrap">
                      <span class="btn sm primary">✓ Joylashtirish</span>
                      <span class="btn sm" title="E-mehmon chop etish">🖨️</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>BR-2026-0845</strong><span class="cell-sub">📱 Mobil ilova</span></td>
                  <td><strong>Azizbek Rahimov</strong><span class="cell-sub">AB 7712093 · +998 93 555 44 33</span></td>
                  <td><strong>201-xona · Lyuks</strong><span class="cell-sub">🏠 Butun xona (2 katta, 1 bola)</span></td>
                  <td><span class="badge-pill green"><i></i> To‘langan</span></td>
                  <td>
                    <div style="display:flex;gap:5px;white-space:nowrap">
                      <span class="btn sm primary">✓ Joylashtirish</span>
                      <span class="btn sm">🖨️</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>BR-2026-0849</strong><span class="cell-sub">📞 Telefon bron</span></td>
                  <td><strong>Dilfuza Saidova</strong><span class="cell-sub">AC 1190442 · +998 97 400 11 22</span></td>
                  <td><strong>105-xona (1-koyka)</strong><span class="cell-sub">👩 1 joy · Ayollar xonasi</span></td>
                  <td><span class="badge-pill amber"><i></i> Joyida to‘lov</span></td>
                  <td>
                    <div style="display:flex;gap:5px;white-space:nowrap">
                      <span class="btn sm soft">To‘lov qabuli</span>
                      <span class="btn sm">🖨️</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Daily Sanatorium Schedule & Treatment Regimen -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("HeartPulse")} Sanatoriyadagi kunlik tartib</h2>
                <p>Tasdiqlangan bron vaucherida mehmonga ham ko‘rinadi</p>
              </div>
              <span class="badge-pill green">Muolaja kundaligi</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
              ${[
                ["07:30 – 08:30", "Ertalabki tog‘ havosida sayr va mineral suv ichish", "Leaf"],
                ["08:30 – 09:30", "Parhez nonushta (shifokor tavsiyasi bo‘yicha)", "Utensils"],
                ["09:30 – 12:30", "Asosiy tibbiy muolajalar (Tuzli g‘or, Fizioterapiya, Massaj)", "HeartPulse"],
                ["13:00 – 14:00", "Tushlik va shifobaxsh damlama", "Utensils"],
                ["14:00 – 16:00", "Tinch uyqu / Xonaga yangi mehmonlarni joylashtirish", "BedDouble"],
                ["16:30 – 18:30", "Yopiq basseyn, terrenkur va fitobar", "Waves"],
              ]
                .map(
                  ([tm, txt, icn]) => `
                <div style="display:flex;align-items:center;gap:10px;padding:7.5px 11px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--line);font-size:12px">
                  <span style="font-family:Manrope;font-weight:800;color:var(--primary);white-space:nowrap">${tm}</span>
                  <span style="flex:1">${txt}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 11: HAMKORLAR INTERACTIVE SHAXMATKA PRO V3
     ========================================================================== */
  function board11() {
    const days = [
      ["22", "Yak", true],
      ["23", "Dush", false],
      ["24", "Sesh", false],
      ["25", "Chor", false],
      ["26", "Pay", false],
      ["27", "Jum", false],
      ["28", "Shan", true],
      ["29", "Yak", true],
      ["30", "Dush", false],
      ["01", "Sesh", false],
    ];
    const rooms = [
      ["101 · Standart", "🏠 Butun xona (2 kishilik)", ["booked", "booked", "booked", "free", "free", "booked", "booked", "booked", "booked", "free"]],
      ["102 · Standart", "🏠 Butun xona (2 kishilik)", ["free", "hold", "hold", "booked", "booked", "booked", "free", "free", "free", "free"]],
      ["104 · Erkaklar koyka", "👨 4 o‘rinli koyka-xona", ["beds", "beds", "focus", "beds", "beds", "free", "beds", "beds", "beds", "free"]],
      ["105 · Ayollar koyka", "👩 4 o‘rinli koyka-xona", ["beds2", "beds2", "beds2", "beds2", "free", "free", "beds2", "beds2", "free", "free"]],
      ["201 · Lyuks Oilaviy", "🏠 Butun xona (4 kishilik)", ["booked", "booked", "booked", "booked", "booked", "free", "free", "booked", "booked", "booked"]],
      ["202 · Lyuks", "🏠 Butun xona (2 kishilik)", ["repair", "repair", "repair", "free", "free", "booked", "booked", "booked", "free", "free"]],
    ];

    const renderCell = (state) => {
      if (state === "booked")
        return `<div class="shaxmatka-cell booked"><span>Band (2/2)</span><small style="font-size:9px;opacity:0.8">📱 Ilova</small></div>`;
      if (state === "beds")
        return `<div class="shaxmatka-cell beds"><span>3/4 Koyka</span><span class="bed-dots"><i></i><i></i><i></i><i class="open"></i></span></div>`;
      if (state === "focus")
        return `<div class="shaxmatka-cell beds active-focus"><span>3/4 · 1 bo‘sh</span><span class="bed-dots"><i></i><i></i><i></i><i class="open"></i></span></div>`;
      if (state === "beds2")
        return `<div class="shaxmatka-cell beds"><span>2/4 Koyka</span><span class="bed-dots"><i></i><i></i><i class="open"></i><i class="open"></i></span></div>`;
      if (state === "hold")
        return `<div class="shaxmatka-cell hold"><span>Kutilmoqda</span><small style="font-size:9px">5 daq</small></div>`;
      if (state === "repair")
        return `<div class="shaxmatka-cell repair"><span>Ta’mirda</span></div>`;
      return `<div class="shaxmatka-cell free"><span>+ Bo‘sh</span></div>`;
    };

    return shell({
      portal: "partner",
      roleLabel: "DIREKTOR",
      userName: "Bahrom Jo‘rayev",
      userId: "#519204",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Jizzax",
      activeNav: "inventory",
      breadcrumb: "Xonalar, Tariflar va Interaktiv Bandlik Kalendari (Shaxmatka Pro V3)",
      content: `
        <div class="page-header">
          <div>
            <h1>Interaktiv Bandlik Kalendari (Shaxmatka Pro V3)</h1>
            <p>Katakcha ustiga bosilganda xona sig‘imi, koyka-o‘rinlar holati (Erkaklar/Ayollar xonasi) va tezkor bron oynasi ochiladi.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab active">📅 Shaxmatka taqvimi</span>
              <span class="pill-tab">🛏️ Xona turlari (4)</span>
              <span class="pill-tab">🚪 Fizik xonalar (48)</span>
              <span class="pill-tab">🏷️ Tarif va Paketlar (5)</span>
              <span class="pill-tab">％ Chegirmalar</span>
            </div>
            <button class="btn primary">${ic("Plus", "sm")} Xona / Tarif qo‘shish</button>
          </div>
        </div>

        <div class="grid-split-drawer">
          <section class="glass-card">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="btn sm">${ic("ChevronLeft", "sm")} 7 kun</span>
                <strong>22-noyabr — 01-dekabr 2026</strong>
                <span class="btn sm">7 kun ${ic("ChevronRight", "sm")}</span>
              </div>
              <div style="display:flex;gap:6px;font-size:11px;font-weight:700;flex-wrap:wrap">
                <span class="badge-pill green">■ Butun xona</span>
                <span class="badge-pill blue">●●●○ Koyka-o‘rin</span>
                <span class="badge-pill amber">■ Kutilmoqda</span>
                <span class="badge-pill red">■ Ta’mirda</span>
              </div>
            </div>
            <div style="overflow-x:auto">
              <table class="shaxmatka-table">
                <thead>
                  <tr>
                    <th>Xona va Joylashish turi</th>
                    ${days
                      .map(
                        ([d, w, wk]) =>
                          `<th class="${wk ? "weekend" : ""}"><div>${d}-noy</div><small style="opacity:0.75">${w}</small></th>`
                      )
                      .join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rooms
                    .map(
                      ([rName, rSub, states]) => `
                    <tr>
                      <td>
                        <strong style="font-size:13px">${rName}</strong>
                        <span class="cell-sub">${rSub}</span>
                      </td>
                      ${states.map((st) => `<td>${renderCell(st)}</td>`).join("")}
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>

          <!-- Right Side: Interactive Cell Inspector Drawer -->
          <section class="glass-card elevated">
            <div class="card-header">
              <div>
                <h2>104-xona · 24-noyabr (Seshanba)</h2>
                <p>👨 Erkaklar koyka-xonasi · Sig‘imi: 4 o‘rin</p>
              </div>
              <span class="badge-pill blue">3/4 Band · 1 o‘rin bo‘sh</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="font-size:11.5px;font-weight:800;color:var(--ink-secondary);text-transform:uppercase">
                XONADAGI MEHMONLAR VA KOYKA-O‘RINLAR (4 TA)
              </div>

              ${[
                ["1-koyka", "Rustam Karimov", "🏛 Profsoyuz · AD 4829104", "22.11 — 29.11", "green"],
                ["2-koyka", "Otabek Nurmatov", "📱 Mobil ilova · AB 3319021", "21.11 — 27.11", "green"],
                ["3-koyka", "Shavkatbek Mirzayev", "📞 Telefon · AC 8820144", "23.11 — 28.11", "green"],
                ["4-koyka (BO‘SH)", "Yangi erkak mehmon joylashtirish mumkin", "Narxi: 380 000 so‘m / tun (3 mahal ovqat + muolaja)", "24.11 sanada bo‘sh", "blue"],
              ]
                .map(
                  ([bed, guest, sub, dt, tone], i) => `
                <div style="padding:10px 12px;border-radius:13px;background:${i === 3 ? "var(--neon-soft)" : "var(--surface-soft)"};border:1px solid ${i === 3 ? "var(--line-strong)" : "var(--line)"};display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <div>
                    <strong style="font-size:12.5px">${bed}: ${guest}</strong>
                    <span class="cell-sub">${sub}</span>
                  </div>
                  <span class="badge-pill ${tone}">${dt}</span>
                </div>
              `
                )
                .join("")}

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
                <button class="btn primary sm">${ic("Plus", "sm")} 4-koykaga bron qo‘shish</button>
                <button class="btn soft sm">${ic("Bell", "sm")} Kutish ro‘yxatidan chaqirish</button>
                <button class="btn sm">${ic("BedDouble", "sm")} Boshqa xonaga ko‘chirish</button>
                <button class="btn danger sm">${ic("LockKeyhole", "sm")} Xonani ta’mirga yopish</button>
              </div>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 12: HAMKORLAR BOOKINGS, WAITLIST CRM & PROFSOYUZ QUOTAS
     ========================================================================== */
  function board12() {
    return shell({
      portal: "partner",
      roleLabel: "DIREKTOR",
      userName: "Bahrom Jo‘rayev",
      userId: "#519204",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Jizzax",
      activeNav: "bookings",
      breadcrumb: "Bronlar, Mijoz so‘rovlari (Kutish ro‘yxati) va Kasaba uyushmalari kvotasi (CRM)",
      content: `
        <div class="page-header">
          <div>
            <h1>Bronlar va Mijozlar CRM Markazi (3-Tabli Tizim)</h1>
            <p>Onlayn/qo‘lda bronlar, bo‘sh joy kutayotgan va 6+ oyda qayta chaqiriladigan mijozlar hamda Profsoyuz shartnoma kvotalari.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab">📋 Barcha bronlar <span class="count-pill">48</span></span>
              <span class="pill-tab active">📞 Kutish ro‘yxati & CRM <span class="count-pill">9</span></span>
              <span class="pill-tab">🏢 Kasaba uyushmalari kvotasi <span class="count-pill">4</span></span>
            </div>
            <button class="btn soft">${ic("Plus", "sm")} So‘rov / Kvota qo‘shish</button>
            <button class="btn primary">${ic("Plus", "sm")} Qo‘lda bron yaratish</button>
          </div>
        </div>

        <!-- CRM Funnel Summary Strip -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">KUTISH RO‘YXATIDA (WAITLIST)</span><span class="kpi-icon">${ic("Bell")}</span></div>
            <div class="kpi-value">9<span class="kpi-unit">nafar mijoz</span></div>
            <div class="kpi-foot"><span class="badge-pill amber">Joy bo‘shasa qo‘ng‘iroq</span><span class="kpi-sub">5 koyka · 4 butun xona</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">DOIMIY MIJOZLAR (6+ OY QAYTA TAKLIF)</span><span class="kpi-icon">${ic("RefreshCw")}</span></div>
            <div class="kpi-value">18<span class="kpi-unit">nafar mijoz</span></div>
            <div class="kpi-foot"><span class="badge-pill blue">🔄 Qayta chaqirish</span><span class="kpi-sub">6 oy oldin dam olganlar</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">KASABA UYUSHMALARI KVOTASI</span><span class="kpi-icon">${ic("Building2")}</span></div>
            <div class="kpi-value">24 / 35<span class="kpi-unit">yo‘llanma</span></div>
            <div class="kpi-foot"><span class="badge-pill green">68.5% o‘zlashtirildi</span><span class="kpi-sub">4 ta shartnoma tashkiloti</span></div>
          </div>
          <div class="kpi-card featured">
            <div class="kpi-top"><span class="kpi-label">KOYKA-O‘RIN BANDLIGI</span><span class="kpi-icon">${ic("Users")}</span></div>
            <div class="kpi-value">28 / 32<span class="kpi-unit">o‘rin</span></div>
            <div class="kpi-foot"><span class="kpi-trend">👨 15/16 · 👩 13/16</span><span class="kpi-sub">Erkaklar va Ayollar xonalari</span></div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Tab 2: CRM Leads & Waitlist Table -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Phone")} Mijoz so‘rovlari, Kutish ro‘yxati va Qayta taklif (CRM)</h2>
                <p>Telefon qilib bo‘sh joy so‘raganlar hamda 6+ oy oldin dam olgan doimiy mijozlar</p>
              </div>
              <span class="btn sm primary">${ic("Plus", "sm")} So‘rov qo‘shish</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mijoz va Telefon</th>
                  <th>Sana va Joylashish</th>
                  <th>CRM Holati</th>
                  <th>Izoh / Dard yo‘nalishi</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Rustam Karimov</strong><span class="cell-sub" style="color:var(--primary);font-weight:700">+998 90 123 45 67</span></td>
                  <td><strong>26.11.2026</strong><span class="cell-sub">👨 1 joy (Erkaklar)</span></td>
                  <td><span class="badge-pill amber">🔔 Kutish ro‘yxati</span></td>
                  <td>Nafas yo‘llari (Tuzli g‘or), 104-xona</td>
                  <td><span class="btn sm primary">Bron qilindi</span></td>
                </tr>
                <tr>
                  <td><strong>Dilnoza Rahimova</strong><span class="cell-sub" style="color:var(--primary);font-weight:700">+998 93 555 44 33</span></td>
                  <td><strong>02.12.2026</strong><span class="cell-sub">🏠 Butun xona</span></td>
                  <td><span class="badge-pill blue">🔄 6+ oy qayta</span></td>
                  <td>May oyida dam olgan doimiy mijoz</td>
                  <td><span class="btn sm primary">Bron qilindi</span></td>
                </tr>
                <tr>
                  <td><strong>Sabohat Toshpo‘latova</strong><span class="cell-sub" style="color:var(--primary);font-weight:700">+998 97 701 22 88</span></td>
                  <td><strong>28.11.2026</strong><span class="cell-sub">👩 1 joy (Ayollar)</span></td>
                  <td><span class="badge-pill amber">🔔 Kutish ro‘yxati</span></td>
                  <td>Bo‘g‘im va tayanch-harakat, 10 kun</td>
                  <td><span class="btn sm primary">Bron qilindi</span></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Tab 3: Corporate & Trade Union (Profsoyuz) Quotas -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Building2")} Korxona va Kasaba uyushmalari kvotasi</h2>
                <p>Shartnoma asosida ajratilgan yo‘llanmalar hisobi</p>
              </div>
              <span class="btn sm soft">${ic("Plus", "sm")} Kvota qo‘shish</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              ${[
                ["O‘zbekiston Kasaba uyushmalari federatsiyasi", "🏛 Kasaba uyushmasi · Shartnoma: SH-2026/08", 14, 20, "+998 71 256 00 00"],
                ["Navoiy KMK Kasaba uyushmasi qo‘mitasi", "🏛 Kasaba uyushmasi · Shartnoma: NKMK-2026/14", 8, 10, "+998 79 223 44 55"],
                ["O‘zbekiston Temir Yo‘llari AJ", "🏢 Korxona shartnomasi · Shartnoma: TY-2026/03", 2, 5, "+998 71 238 80 00"],
              ]
                .map(
                  ([org, sub, used, total, tel]) => `
                <div style="padding:13px 15px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line);display:flex;flex-direction:column;gap:7px">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                    <div>
                      <strong style="font-size:13.5px">${org}</strong>
                      <span class="cell-sub">${sub} · Aloqa: ${tel}</span>
                    </div>
                    <span class="badge-pill green">${used} / ${total} yo‘llanma</span>
                  </div>
                  <div style="height:8px;border-radius:999px;background:var(--surface);overflow:hidden">
                    <div style="width:${Math.round((used / total) * 100)}%;height:100%;border-radius:999px;background:linear-gradient(90deg,#00866c,#3ee6bf)"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">
                    <span style="font-size:11.5px;color:var(--muted)">Qolgan bo‘sh kvota: <strong>${total - used} ta yo‘llanma</strong></span>
                    <span class="btn sm primary">+1 Yo‘llanma keldi</span>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 13: HAMKORLAR BOOKING DETAIL, PASSPORT/PINFL & E-MEHMON PRINT SHEET
     ========================================================================== */
  function board13() {
    return shell({
      portal: "partner",
      roleLabel: "RESEPSHN",
      userName: "Malika Umarova",
      userId: "#682011",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Jizzax",
      activeNav: "bookings",
      breadcrumb: "Bron tafsiloti (BR-2026-0842) va «🖨️ Mehmon anketasi (E-mehmon chop etish)»",
      content: `
        <div class="page-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="btn sm">${ic("ArrowLeft", "sm")} Bronlarga qaytish</span>
              <h1>Bron #BR-2026-0842 · Rustam Karimov</h1>
              <span class="badge-pill green"><i></i> JOYLASHGAN (CHECKED_IN)</span>
            </div>
            <p style="margin-top:6px">22.11.2026 — 29.11.2026 (7 tun) · 104-xona, 1-koyka (Erkaklar xonasidan 1 o‘rin) · Kasaba uyushmasi yo‘llanmasi</p>
          </div>
          <div class="header-controls">
            <button class="btn soft">${ic("FileText", "sm")} 🪪 Pasport / Koyka-o‘rin tahriri</button>
            <button class="btn soft">${ic("Wallet", "sm")} Joyida to‘lov qaydi</button>
            <button class="btn primary">${ic("Printer", "sm")} 🖨️ Mehmon anketasi (E-mehmon chop etish)</button>
          </div>
        </div>

        <div class="grid-split-drawer">
          <!-- Left Side: Booking Details, Passport Meta & Payment Ledger -->
          <div style="display:flex;flex-direction:column;gap:16px">
            <section class="glass-card">
              <div class="card-header">
                <div>
                  <h2>${ic("Users")} Mehmon, Pasport / JShShIR va Joylashish ma’lumotlari</h2>
                  <p>Resepshnda pasport/ID-karta va yo‘llanma manbasi kiritiladi</p>
                </div>
                <span class="badge-pill blue">👨 1 kishilik koyka-o‘rin</span>
              </div>
              <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="padding:11px 13px;border-radius:14px;background:var(--surface-soft)">
                  <span class="cell-sub">MEHMON F.I.SH. VA TELEFON</span>
                  <strong style="font-size:14px">Karimov Rustam Abdullayevich</strong>
                  <span class="cell-sub" style="color:var(--primary);font-weight:700">+998 90 123 45 67</span>
                </div>
                <div style="padding:11px 13px;border-radius:14px;background:var(--surface-soft)">
                  <span class="cell-sub">PASPORT / ID-KARTA VA JSHSHIR (PINFL)</span>
                  <strong style="font-size:14px;font-family:Manrope">AD 4829104</strong>
                  <span class="cell-sub">JShShIR: 31408851920041 · Tug‘. yili: 14.08.1985</span>
                </div>
                <div style="padding:11px 13px;border-radius:14px;background:var(--surface-soft)">
                  <span class="cell-sub">AJRATILGAN XONA VA JOYLASHISH TURI</span>
                  <strong style="font-size:14px">104-xona · 1-koyka (Erkaklar xonasi)</strong>
                  <span class="cell-sub">Standart to‘liq davolash paketi (3 mahal ovqat + muolaja)</span>
                </div>
                <div style="padding:11px 13px;border-radius:14px;background:var(--surface-soft)">
                  <span class="cell-sub">YO‘LLANMA MANBASI / TASHKILOT</span>
                  <strong style="font-size:14px">🏛 Kasaba uyushmasi yo‘llanmasi</strong>
                  <span class="cell-sub">Navoiy KMK Kasaba uyushmasi · Shartnoma #NKMK-2026/14</span>
                </div>
              </div>
            </section>

            <section class="glass-card">
              <div class="card-header">
                <div>
                  <h2>${ic("CreditCard")} To‘lov va Joyida kassa qaydlari</h2>
                  <p>Jami yo‘llanma qiymati: 2 660 000 so‘m (7 tun × 380 000 so‘m)</p>
                </div>
                <span class="badge-pill green">To‘liq to‘langan</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sana va Vaqt</th>
                    <th>To‘lov usuli</th>
                    <th>Summa</th>
                    <th>Dalil / Chek raqami</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>22.11.2026 · 09:15</td>
                    <td>Shartnoma / Profsoyuz kvotasi</td>
                    <td><strong>2 000 000 so‘m</strong></td>
                    <td>Yo‘llanma blankasi #PU-88412</td>
                    <td><span class="badge-pill green">Tasdiqlangan</span></td>
                  </tr>
                  <tr>
                    <td>22.11.2026 · 09:20</td>
                    <td>Joyida to‘lov · Terminal (Uzcard)</td>
                    <td><strong>660 000 so‘m</strong></td>
                    <td>Terminal cheki #004918</td>
                    <td><span class="badge-pill green">Direktor tasdiqlagan</span></td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <!-- Right Side: Live Printable E-Mehmon Sheet Preview -->
          <div class="emehmon-sheet">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #00866c;padding-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <img src="../web/assets/sihhat-logo.jpg" style="width:42px;height:42px;border-radius:10px" />
                <div>
                  <div style="font-family:Manrope;font-size:15px;font-weight:800;color:#06312a">ZOMIN SOG‘LOMLIK MASKANI</div>
                  <div style="font-size:11px;color:#35584e;font-weight:700">MEHMONNI RO‘YXATGA OLISH ANKETASI (E-MEHMON)</div>
                </div>
              </div>
              <div style="text-align:right;font-size:11px">
                <strong>Bron: BR-2026-0842</strong>
                <div style="color:#527067">Sana: 22.11.2026</div>
              </div>
            </div>

            <table>
              <tr><th>Mehmon F.I.Sh.</th><td><strong>Karimov Rustam Abdullayevich</strong></td></tr>
              <tr><th>Telefon raqami</th><td>+998 90 123 45 67</td></tr>
              <tr><th>Pasport / ID-karta seriyasi</th><td><strong>AD 4829104</strong></td></tr>
              <tr><th>JShShIR (PINFL) / Tug‘. sana</th><td>31408851920041 (14.08.1985)</td></tr>
              <tr><th>Joylashish turi</th><td>1 kishilik joy (Erkaklar xonasidan 1 o‘rin)</td></tr>
              <tr><th>Ajratilgan xona raqami</th><td><strong>104-xona · 1-koyka</strong></td></tr>
              <tr><th>Kelish va ketish sanalari</th><td>22.11.2026 (14:00) — 29.11.2026 (12:00)</td></tr>
              <tr><th>Yo‘llanma manbasi</th><td>Navoiy KMK Kasaba uyushmasi (SH-14)</td></tr>
              <tr><th>Jami to‘lov summasi</th><td><strong>2 660 000 so‘m (To‘langan)</strong></td></tr>
            </table>

            <p style="font-size:11px;color:#35584e;margin-top:10px">
              Sanatoriya ichki tartib-qoidalari, yong‘in xavfsizligi va shifokor belgilagan davolanish rejimi bilan tanishdim.
            </p>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px dashed #cbdcd5;font-size:11.5px">
              <div>
                <div>Mehmon imzosi: ___________________</div>
                <div style="margin-top:10px">Resepshn xodimi: <u>Umarova M. (#682011)</u></div>
              </div>
              <div style="width:58px;height:58px;border:1.5px solid #06312a;border-radius:10px;display:grid;place-items:center;color:#06312a">
                ${ic("QrCode", "xl")}
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 14: HAMKORLAR SANATORIUM PROFILE, MEDICAL SPECIALTIES & WIZARD
     ========================================================================== */
  function board14() {
    return shell({
      portal: "partner",
      roleLabel: "DIREKTOR",
      userName: "Bahrom Jo‘rayev",
      userId: "#519204",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Jizzax",
      activeNav: "profile",
      breadcrumb: "Sanatoriya profili, «Qaysi dardga davo?» ixtisosligi va 4-bosqichli ustaxona",
      content: `
        <div class="page-header">
          <div>
            <h1>Sanatoriya profili va Tibbiy yo‘llanma pasporti</h1>
            <p>Katalogdagi «Qaysi dardga davo?» filtri, yo‘llanma narxi tarkibi, 30 tagacha suratlar galereyasi va bank rekvizitlari.</p>
          </div>
          <div class="header-controls">
            <span class="badge-pill green"><i></i> E’lon qilingan (Nashrda)</span>
            <button class="btn soft">${ic("Image", "sm")} Rasmlar va hujjatlar (16/30)</button>
            <button class="btn primary">${ic("Check", "sm")} Saqlash va tekshiruvga yuborish</button>
          </div>
        </div>

        <!-- 4-Step Visual Wizard Stepper -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          ${[
            ["1", "Asosiy ma’lumot & Xarita", "Nom, STIR, Google/Yandex xarita havolasi", true],
            ["2", "🩺 Qaysi dardga davo & Sharoit", "Tibbiy ixtisoslik va muolaja turlari", true],
            ["3", "🎁 Yo‘llanma tarkibi & Tartib", "Narx ichiga kiruvchi xizmatlar va soatlar", false],
            ["4", "📸 30 ta Surat & Bank hisobi", "Galereya tartibi, litsenziya va MFO/Hisob", false],
          ]
            .map(
              ([num, title, sub, active]) => `
            <div style="padding:12px 15px;border-radius:16px;background:${active ? "var(--neon-soft)" : "var(--surface)"};border:1.5px solid ${active ? "var(--primary)" : "var(--line)"};display:flex;align-items:center;gap:12px">
              <span style="width:32px;height:32px;border-radius:50%;background:${active ? "var(--primary)" : "var(--surface-soft)"};color:${active ? "#fff" : "var(--muted)"};display:grid;place-items:center;font-family:Manrope;font-weight:800">${num}</span>
              <div>
                <strong style="display:block;font-size:13px">${title}</strong>
                <span style="font-size:11px;color:var(--muted)">${sub}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="grid-2">
          <!-- Left: Medical Specializations & Package Inclusions -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("HeartPulse")} «Qaysi dardga davo?» va Yo‘llanma narxi tarkibi</h2>
                <p>Mobil ilova va sihhat.uz katalogidagi tezkor tibbiy filtrlar shu belgilarga bog‘langan</p>
              </div>
              <span class="badge-pill green">18 ta xizmat belgilangan</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
              <div>
                <div style="font-size:11.5px;font-weight:800;color:var(--ink-secondary);margin-bottom:8px">
                  1. SANATORIYA TIBBIY IXTISOSLIGI (QAYSI DARDGA DAVO?)
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${[
                    [true, "🫁 Nafas yo‘llari va bronxial astma"],
                    [true, "🧠 Asab tizimi va uyqusizlik"],
                    [true, "🦴 Bo‘g‘im va tayanch-harakat (osteoxondroz)"],
                    [true, "❤️ Yurak-qon tomir tizimi"],
                    [false, "💧 Oshqozon-ichak va mineral suv"],
                    [true, "🛡️ Umumiy immunitet va reabilitatsiya"],
                  ]
                    .map(
                      ([on, lbl]) => `
                    <span style="padding:7px 12px;border-radius:999px;background:${on ? "var(--neon-soft)" : "var(--surface-soft)"};border:1px solid ${on ? "var(--line-strong)" : "var(--line)"};font-size:12px;font-weight:700;color:${on ? "var(--ink)" : "var(--muted)"}">
                      ${on ? "✓ " : ""}${lbl}
                    </span>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <div>
                <div style="font-size:11.5px;font-weight:800;color:var(--ink-secondary);margin-bottom:8px">
                  2. «YO‘LLANMA NARXI ICHIGA NIMALAR KIRADI?» (STANDART PAKET)
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
                  ${[
                    "🛏️ Tanlangan xona yoki koyka-o‘rinda yashash",
                    "🍽️ Kuniga 3 mahal shifobaxsh parhez ovqatlanish",
                    "👨‍⚕️ Terapevt-shifokor ko‘rigi va davolash rejasi",
                    "🧂 Tuzli g‘or (Speleoterapiya) va Ingalyatsiya",
                    "⚡ Fizioterapiya, parafin va darsonval muolajalari",
                    "🏊 Yopiq basseyn, terrenkur va fitobar damlamalari",
                  ]
                    .map(
                      (item) => `
                    <div style="padding:8px 11px;border-radius:11px;background:var(--surface-soft);border:1px solid var(--line);font-weight:600">
                      ✓ ${item}
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <div class="grid-2-equal" style="gap:10px">
                <div class="form-field">
                  <label><span>Google / Yandex Maps havolasi *</span><span class="live-check-tag">✓ Koordinata shart emas</span></label>
                  <div class="input-box verified">${ic("MapPin", "sm")} https://yandex.uz/maps/-/CDdkmZomin</div>
                </div>
                <div class="form-field">
                  <label><span>Kerakli hujjatlar (Mehmon uchun)</span></label>
                  <div class="input-box">Pasport/ID-karta, sanatoriy-kurort kartasi (072/u)</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Right: Photo Gallery (up to 30 photos) & Live Catalog Preview -->
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("Image")} Sanatoriya suratlari galereyasi (16 / 30)</h2>
                <p>Bir tanlashda 4+ ta surat yuklash, tartibini surish va asosiy muqovani belgilash</p>
              </div>
              <span class="btn sm primary">${ic("Upload", "sm")} +4 ta surat yuklash</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="position:relative;height:185px;border-radius:16px;overflow:hidden;border:1px solid var(--line-strong)">
                <img src="../web/assets/retreat.png" style="width:100%;height:100%;object-fit:cover" />
                <div style="position:absolute;inset:10px 10px auto 10px;display:flex;justify-content:space-between">
                  <span class="badge-pill green" style="background:rgba(3,30,25,0.85);color:#8ff5dc">⭐ 1-surat · Asosiy muqova</span>
                  <span class="badge-pill neutral" style="background:rgba(3,30,25,0.85);color:#fff">1 / 16</span>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                ${["Tashqi ko‘rinish", "Lyuks xona", "Tuzli g‘or", "Yopiq basseyn"]
                  .map(
                    (cap, idx) => `
                  <div style="padding:8px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--line);text-align:center;font-size:11px;font-weight:700">
                    <div style="height:44px;border-radius:8px;background:linear-gradient(135deg,rgba(0,134,108,0.22),rgba(62,230,191,0.14));display:grid;place-items:center;margin-bottom:5px">
                      ${ic("Image", "sm")}
                    </div>
                    <span>#${idx + 2} · ${cap}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
              <div style="padding:10px 13px;border-radius:13px;background:var(--neon-soft);border:1px solid var(--line-strong);font-size:12px;display:flex;align-items:center;gap:8px">
                ${ic("ShieldCheck", "sm")}
                <span>☑ <strong>Sihhat.uz Hamkor shartlari (9 bo‘lim)</strong> o‘qildi va direktor tomonidan tasdiqlandi.</span>
              </div>
            </div>
          </section>
        </div>
      `,
    });
  }

  /* ==========================================================================
     BOARD 15: HAMKORLAR ACCOUNTANT PANEL (DARK) & MOBILE RECEPTION VIEW
     ========================================================================== */
  function board15() {
    return shell({
      portal: "partner",
      roleLabel: "HISOBCHI PANELI",
      userName: "Jamshid Xolmatov",
      userId: "#840192",
      tenantLabel: "Zomin Sog‘lomlik Maskani · Asia/Tashkent",
      activeNav: "accountant",
      breadcrumb: "Hisobchi moliyaviy hisobotlari (Tungi Aurora) va Mobil Resepshn ko‘rinishi",
      content: `
        <div class="page-header">
          <div>
            <h1>Hisobchi Moliyaviy Hisobotlari va Solishtirish</h1>
            <p>Hisobchi faqat o‘z sanatoriyasining moliyaviy va operatsion hisobotlarini ko‘radi hamda XLSX / CSV / PDF shaklida yuklab oladi.</p>
          </div>
          <div class="header-controls">
            <div class="pill-tabs">
              <span class="pill-tab">Bugun</span>
              <span class="pill-tab">7 kun</span>
              <span class="pill-tab">30 kun</span>
              <span class="pill-tab active">Oy bo‘yicha (Noyabr)</span>
              <span class="pill-tab">☑ Oldingi oy bilan solishtirish</span>
            </div>
            <button class="btn soft">${ic("FileSpreadsheet", "sm")} Excel (XLSX)</button>
            <button class="btn primary">${ic("Printer", "sm")} Chop etish / PDF</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card featured">
            <div class="kpi-top"><span class="kpi-label">SOF ONLAYN TUSHUM (NET)</span><span class="kpi-icon">${ic("CreditCard")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">54 200 000<span class="kpi-unit">so‘m</span></div>${spark("2,26 20,21 40,16 60,11 82,4", "#8ff5dc", "rgba(143,245,220,0.24)")}</div>
            <div class="kpi-foot"><span class="kpi-trend">▲ +16.2% (Oktabrga nisb.)</span><span class="kpi-sub">Onlayn tushum minus refund</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">TASDIQLANGAN JOYIDA TO‘LOVLAR</span><span class="kpi-icon">${ic("Coins")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">14 200 000<span class="kpi-unit">so‘m</span></div>${spark("2,24 22,19 42,17 62,12 82,6")}</div>
            <div class="kpi-foot"><span class="kpi-trend">▲ +9.4%</span><span class="kpi-sub">8,4 mln naqd · 5,8 mln terminal</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">QAYTARILGAN PUL (REFUND)</span><span class="kpi-icon">${ic("Wallet")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">1 200 000<span class="kpi-unit">so‘m</span></div></div>
            <div class="kpi-foot"><span class="badge-pill green">▼ -35% kamaygan</span><span class="kpi-sub">1 ta bekor qilingan bron</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">BANK TASDIQLAGAN O‘TKAZMA</span><span class="kpi-icon">${ic("FileCheck")}</span></div>
            <div class="kpi-mid"><div class="kpi-value">49 800 000<span class="kpi-unit">so‘m</span></div></div>
            <div class="kpi-foot"><span class="badge-pill blue">4,4 mln yo‘lda</span><span class="kpi-sub">Hisob raqamiga tushgan</span></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1.45fr 355px;gap:18px;align-items:start">
          <section class="glass-card">
            <div class="card-header">
              <div>
                <h2>${ic("ChartNoAxesCombined")} Davr tushumlari va Oldingi oy bilan solishtirish</h2>
                <p>01.11.2026 — 22.11.2026 vs 01.10.2026 — 22.10.2026 (Asia/Tashkent)</p>
              </div>
              <span class="badge-pill green">Audited Ledger</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ko‘rsatkich nomi</th>
                  <th>Joriy davr (Noyabr)</th>
                  <th>Oldingi davr (Oktabr)</th>
                  <th>Farq / Dinamika</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Onlayn bron tushumi (GMV)</strong></td>
                  <td><strong>55 400 000 so‘m</strong></td>
                  <td>48 100 000 so‘m</td>
                  <td><span class="badge-pill green">▲ +7 300 000 so‘m (+15.1%)</span></td>
                </tr>
                <tr>
                  <td><strong>Joyida naqd to‘lovlar (Tasdiqlangan)</strong></td>
                  <td><strong>8 400 000 so‘m</strong></td>
                  <td>7 600 000 so‘m</td>
                  <td><span class="badge-pill green">▲ +800 000 so‘m (+10.5%)</span></td>
                </tr>
                <tr>
                  <td><strong>Joyida terminal (Uzcard / Humo)</strong></td>
                  <td><strong>5 800 000 so‘m</strong></td>
                  <td>5 380 000 so‘m</td>
                  <td><span class="badge-pill green">▲ +420 000 so‘m (+7.8%)</span></td>
                </tr>
                <tr>
                  <td><strong>Tasdiqlanmagan joyida to‘lovlar</strong><span class="cell-sub">Tushumga qo‘shilmaydi</span></td>
                  <td><strong>660 000 so‘m</strong></td>
                  <td>0 so‘m</td>
                  <td><span class="badge-pill amber">Direktor tasdig‘i kutilmoqda</span></td>
                </tr>
                <tr>
                  <td><strong>Sotilgan xona-tunlar / Bandlik</strong></td>
                  <td><strong>394 xona-tun (86.4%)</strong></td>
                  <td>348 xona-tun (76.3%)</td>
                  <td><span class="badge-pill green">▲ +46 xona-tun (+10.1%)</span></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Right Side: Mobile Responsive Reception Phone Frame -->
          <div class="phone-frame">
            <div class="phone-screen">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#9fd4c5;font-weight:700">
                <span>Smartfon (390×844) · Resepshn</span>
                <span>4G · 100%</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="../web/assets/sihhat-logo.jpg" style="width:28px;height:28px;border-radius:8px" />
                  <div>
                    <strong style="font-size:13.5px;display:block">Zomin · Resepshn</strong>
                    <span style="font-size:10px;color:#8ff5dc">Mobil brauzer ko‘rinishi</span>
                  </div>
                </div>
                <span class="circle-btn" style="width:30px;height:30px">${ic("Menu", "sm")}</span>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="padding:9px;border-radius:12px;background:rgba(62,230,191,0.12);border:1px solid rgba(62,230,191,0.3)">
                  <span style="font-size:10px;color:#9fd4c5">BUGUN KELISH</span>
                  <div style="font-family:Manrope;font-size:18px;font-weight:800">9 mehmon</div>
                </div>
                <div style="padding:9px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(62,230,191,0.2)">
                  <span style="font-size:10px;color:#9fd4c5">BO‘SH KOYKA</span>
                  <div style="font-family:Manrope;font-size:18px;font-weight:800">6 o‘rin</div>
                </div>
              </div>

              <!-- Mobile Booking Card -->
              <div style="padding:11px;border-radius:15px;background:rgba(255,255,255,0.07);border:1px solid rgba(62,230,191,0.28);display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:12.5px">BR-2026-0842 · Rustam K.</strong>
                  <span class="badge-pill green" style="font-size:10px">Tasdiqlangan</span>
                </div>
                <span style="font-size:11px;color:#b8e5d8">👨 104-xona, 1-koyka · 22.11 — 29.11</span>
                <span style="font-size:11px;color:#8ff5dc">🏛 Navoiy KMK Kasaba uyushmasi</span>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                  <span class="btn sm primary" style="font-size:11px;padding:6px">✓ Joylashtirish</span>
                  <span class="btn sm" style="font-size:11px;padding:6px">🖨️ E-mehmon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  function renderBoard(boardId) {
    const board = BOARDS.find((b) => b.id === boardId) || BOARDS[0];
    document.documentElement.dataset.theme = board.theme || "light";
    document.title = `Sihhat.uz — ${board.title}`;

    const stage = document.getElementById("stage");
    switch (board.id) {
      case "00-umumiy-dizayn-konsepsiyasi":
        stage.innerHTML = board00();
        break;
      case "01-superadmin-kirish-va-mfa":
        stage.innerHTML = board01();
        break;
      case "02-superadmin-bosh-sahifa-kunduzgi":
        stage.innerHTML = shell({
          portal: "superadmin",
          activeNav: "dashboard",
          breadcrumb: "Platforma ko‘rsatkichlari (Kunduzgi Crystal uslubi)",
          content: superadminDashboardContent(),
        });
        break;
      case "03-superadmin-bosh-sahifa-tungi":
        stage.innerHTML = shell({
          portal: "superadmin",
          activeNav: "dashboard",
          breadcrumb: "Platforma ko‘rsatkichlari (Tungi Neon Aurora uslubi)",
          content: superadminDashboardContent(),
        });
        break;
      case "04-superadmin-sanatoriyalar-va-mashhur":
        stage.innerHTML = board04();
        break;
      case "05-superadmin-ilova-foydalanuvchilari-modal":
        stage.innerHTML = board05();
        break;
      case "06-superadmin-jamoa-va-ruxsatlar":
        stage.innerHTML = board06();
        break;
      case "07-superadmin-moliya-tezcheck-va-reklama":
        stage.innerHTML = board07();
        break;
      case "08-superadmin-aloqa-yordam-chat-va-elon":
        stage.innerHTML = board08();
        break;
      case "09-hamkorlar-kirish-va-shartlar":
        stage.innerHTML = board09();
        break;
      case "10-hamkorlar-direktor-bosh-sahifa-va-bugun":
        stage.innerHTML = board10();
        break;
      case "11-hamkorlar-shaxmatka-bandlik-kalendari":
        stage.innerHTML = board11();
        break;
      case "12-hamkorlar-bronlar-crm-va-profsoyuz":
        stage.innerHTML = board12();
        break;
      case "13-hamkorlar-bron-tafsiloti-va-emehmon":
        stage.innerHTML = board13();
        break;
      case "14-hamkorlar-sanatoriya-profili-va-ustaxona":
        stage.innerHTML = board14();
        break;
      case "15-hamkorlar-hisobchi-va-mobil-tungi":
        stage.innerHTML = board15();
        break;
      default:
        stage.innerHTML = board00();
    }

    const bar = document.getElementById("studio-bar");
    if (bar) {
      const idx = BOARDS.findIndex((b) => b.id === board.id);
      const prev = BOARDS[(idx - 1 + BOARDS.length) % BOARDS.length];
      const next = BOARDS[(idx + 1) % BOARDS.length];
      bar.innerHTML = `
        <div class="studio-bar-left">
          <a href="index.html">← Galereyaga qaytish</a>
          <select id="board-picker" aria-label="Maketni tanlash">
            ${BOARDS.map((b) => `<option value="${b.id}" ${b.id === board.id ? "selected" : ""}>${b.title}</option>`).join("")}
          </select>
        </div>
        <div class="studio-bar-right">
          <button type="button" id="toggle-theme-btn">Kun / Tun almashtirish</button>
          <a href="?board=${prev.id}">← Oldingi</a>
          <a href="?board=${next.id}">Keyingi →</a>
        </div>
      `;
      const picker = document.getElementById("board-picker");
      picker?.addEventListener("change", (e) => {
        location.search = `?board=${e.target.value}`;
      });
      const themeBtn = document.getElementById("toggle-theme-btn");
      themeBtn?.addEventListener("click", () => {
        document.documentElement.dataset.theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      });
    }

    document.body.dataset.board = board.id;
    document.body.dataset.ready = "true";
  }

  const params = new URLSearchParams(location.search);
  if (params.get("capture") === "1") {
    document.body.classList.add("capture-mode");
  }
  renderBoard(params.get("board") || BOARDS[0].id);
})();
