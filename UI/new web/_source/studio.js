"use strict";
(function () {
  const LOGO = "../../web/assets/sihhat-logo.jpg";
  const HERO_IMG = "../../../apps/superadmin-web/public/branding/wellness-retreat.png";

  const EXTRA_ICONS = {
    Smartphone: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    Laptop: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>',
    Globe: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    UserCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
    KeyRound: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    LogIn: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
    ShieldAlert: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    Camera: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    Trash2: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    XCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    User: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  };

  function ic(name) {
    return EXTRA_ICONS[name] || (window.WEB_ICONS && window.WEB_ICONS[name]) || "";
  }

  function spark(points, stroke, fill) {
    return `<svg width="78" height="28" viewBox="0 0 78 28" fill="none" style="flex-shrink:0">
      <path d="M${points} L76,26 L2,26 Z" fill="${fill}" />
      <polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  const NAV_GROUPS = [
    {
      title: "Ish jarayoni",
      items: [
        { id: "dashboard", label: "Umumiy ko‘rinish", icon: "LayoutDashboard" },
        { id: "today", label: "Bugungi ishlar", icon: "CalendarDays", badge: "14" },
        { id: "sanatoriums", label: "Sanatoriyalar", icon: "Building2", badge: "16" },
        { id: "partner-registrations", label: "Hamkor arizalari", icon: "ClipboardList", badge: "3", tone: "warn" },
        { id: "bookings", label: "Bronlar va CRM", icon: "BookOpen", badge: "142" },
        { id: "inventory", label: "Xonalar va tariflar", icon: "BedDouble" },
        { id: "staff", label: "Jamoa va ruxsatlar", icon: "Users", badge: "2", tone: "warn" },
        { id: "app-users", label: "Ilova mijozlari", icon: "Smartphone", badge: "1 480" },
      ],
    },
    {
      title: "Moliya",
      items: [
        { id: "payments", label: "To‘lovlar", icon: "CreditCard" },
        { id: "payouts", label: "Sanatoriyaga o‘tkazma", icon: "FileCheck", badge: "3" },
        { id: "refunds", label: "Pulni qaytarish", icon: "Wallet", badge: "1", tone: "warn" },
        { id: "billing", label: "Abonent va hisoblar", icon: "FileText" },
        { id: "ads", label: "Reklama vitrinasi", icon: "Megaphone", badge: "LIVE", tone: "live" },
        { id: "reconciliation", label: "Solishtirish", icon: "ChartNoAxesCombined" },
      ],
    },
    {
      title: "Aloqa va nazorat",
      items: [
        { id: "support", label: "Yordam va jonli chat", icon: "MessageSquare", badge: "4", tone: "accent" },
        { id: "messages", label: "E’lonlar va xabarlar", icon: "Megaphone" },
        { id: "reviews", label: "Sharhlar", icon: "HeartPulse" },
        { id: "notifications", label: "Bildirishnomalar", icon: "Bell", badge: "5" },
      ],
    },
    {
      title: "Sozlamalar",
      items: [
        { id: "telegram", label: "Telegram bot", icon: "Mail", badge: "Faol", tone: "live" },
        { id: "audit", label: "Amallar tarixi", icon: "ShieldCheck" },
        { id: "account", label: "Mening hisobim", icon: "Settings" },
      ],
    },
  ];

  function renderSidebar(activeId) {
    return `
      <aside class="sidebar">
        <div class="sb-brand">
          <div class="sb-logo"><img src="${LOGO}" alt="Sihhat uz" /></div>
          <div>
            <div class="brand-name">sihhat<span>.uz</span></div>
            <div class="brand-sub">Platforma boshqaruvi</div>
          </div>
          <span class="sb-role-pill">Admin</span>
        </div>
        <nav class="sb-nav" style="gap:9px">
          ${NAV_GROUPS.map(
            (g) => `
            <div>
              <div class="sb-group-title">${g.title}</div>
              <div class="sb-items">
                ${g.items
                  .map(
                    (it) => `
                  <div class="sb-item ${it.id === activeId ? "active" : ""}" style="padding:5.5px 10px;font-size:12.6px">
                    ${ic(it.icon)}
                    <span>${it.label}</span>
                    ${it.badge ? `<span class="sb-badge ${it.tone || ""}">${it.badge}</span>` : ""}
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          ).join("")}
        </nav>
        <div class="sb-footer" style="padding-top:9px">
          <div class="sb-foot-card" style="padding:8px 10px">
            <div class="sb-foot-icon">${ic("HeartPulse")}</div>
            <div>
              <strong>0% bron komissiyasi</strong>
              <span>Ochiq hamkorlik · v0.2.10</span>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  function renderTopbar({ crumb, tenantFilter, dark }) {
    return `
      <header class="topbar">
        <div class="tb-left">
          <div class="breadcrumb">
            <span>Superadmin</span>
            <span>/</span>
            <strong>${crumb}</strong>
          </div>
          ${
            tenantFilter
              ? `<div class="tb-divider"></div>
                 <div class="tenant-pill">
                   ${ic("Building2")}
                   <span>${tenantFilter}</span>
                   ${ic("ChevronDown")}
                 </div>`
              : ""
          }
        </div>
        <div class="tb-right">
          <div class="cmd-search">
            ${ic("Search")}
            <span>Bo‘lim, bron yoki #ID qidirish...</span>
            <kbd>Ctrl K</kbd>
          </div>
          <div class="health-chip">
            <span class="dot-pulse"></span>
            <span>Tizim faol</span>
          </div>
          <div class="icon-btn" title="Mavzu">${ic(dark ? "Sun" : "Moon")}</div>
          <div class="icon-btn" title="Bildirishnomalar">${ic("Bell")}<span class="notif-dot"></span></div>
          <div class="icon-btn" title="Yo‘riqnoma">${ic("CircleHelp")}</div>
          <div class="user-pill">
            <div class="avatar">SA<span class="online-ring"></span></div>
            <div class="user-meta">
              <strong>Sardor Alimov</strong>
              <span>#100001 · Superadmin</span>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function shell({ activeId, crumb, tenantFilter, dark, body }) {
    return `
      <div class="app-shell">
        ${renderSidebar(activeId)}
        <div class="main">
          ${renderTopbar({ crumb, tenantFilter, dark })}
          <main class="content">
            ${body}
          </main>
        </div>
      </div>
    `;
  }

  /* ==================== BOARD 00: DESIGN SYSTEM ==================== */
  function board00() {
    return `
      <div class="ds-stage">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:14px">
            <div class="sb-logo" style="width:48px;height:48px;border-radius:14px"><img src="${LOGO}" alt="Sihhat uz" /></div>
            <div>
              <div style="display:flex;align-items:center;gap:10px">
                <h1 style="margin:0;font-size:24px;font-weight:800">Sihhat.uz Superadmin — «Serenity Pro V4» Dizayn Tizimi</h1>
                <span class="badge ok">Ko‘rish uchun qulay · Tasdiqlash maketi</span>
              </div>
              <p style="margin:4px 0 0;color:var(--muted);font-size:13.5px">
                Kundalik 8 soatlik boshqaruv uchun ko‘zni charchatmaydigan neytral-botanik palitra, aniq tipografiya, siqilmagan menyu va barcha yangi modullar (2026-11-24 holati)
              </p>
            </div>
          </div>
          <div style="text-align:right">
            <span class="badge info">12 ta ekran · Kunduzgi + Tungi + Mobil</span>
            <div style="font-size:12px;color:var(--muted);margin-top:4px">Manrope + DM Sans · Lucide SVG · Tabular Numerals</div>
          </div>
        </div>

        <div class="grid-3" style="flex:1">
          <!-- Column 1: Colors & Eye Comfort -->
          <div class="card">
            <div class="card-head"><h3>${ic("Sun")} 1. Ko‘zni charchatmaydigan rang tizimi</h3><span class="badge ok">WCAG AAA</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
              <div>
                <div class="f-label" style="margin-bottom:7px">KUNDUZGI REJIM — SOKIN ALABASTER (Asosiy ish foni)</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                  <div class="swatch" style="background:#f4f6f4"><strong style="font-size:12px">Canvas</strong><span style="font-size:11px;color:#657c74">#F4F6F4</span></div>
                  <div class="swatch" style="background:#ffffff"><strong style="font-size:12px">Karta / Sidebar</strong><span style="font-size:11px;color:#657c74">#FFFFFF</span></div>
                  <div class="swatch" style="background:#0d7a5f;color:#fff;border-color:transparent"><strong style="font-size:12px">Brend Zumrad</strong><span style="font-size:11px;opacity:.85">#0D7A5F</span></div>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">TUNGI REJIM — SLATE CHARCOAL (Neon nursiz, sokin)</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                  <div class="swatch" style="background:#0d1211;color:#eef4f2;border-color:#24332f"><strong style="font-size:12px">Tungi Canvas</strong><span style="font-size:11px;color:#869d95">#0D1211</span></div>
                  <div class="swatch" style="background:#151e1c;color:#eef4f2;border-color:#24332f"><strong style="font-size:12px">Tungi Karta</strong><span style="font-size:11px;color:#869d95">#151E1C</span></div>
                  <div class="swatch" style="background:#2ad0a0;color:#07241c;border-color:transparent"><strong style="font-size:12px">Yumshoq Yalpiz</strong><span style="font-size:11px">#2AD0A0</span></div>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">HOLAT RANGLARI (Yumshoq fon + aniq kontrast)</div>
                <div class="chip-wrap">
                  <span class="badge ok">● Tasdiqlangan / Faol</span>
                  <span class="badge warn">● Kutilmoqda / Tekshiruv</span>
                  <span class="badge err">● Rad etilgan / Xavf</span>
                  <span class="badge info">● Users / Mobil ilova</span>
                  <span class="badge violet">● Profsoyuz / AI</span>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">YON MENYU ARXITEKTURASI (SIQILMAGAN 1-QATORLI)</div>
                <div style="display:flex;flex-direction:column;gap:4px;padding:10px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                  <div class="sb-item active" style="padding:6px 10px;font-size:12.5px">${ic("LayoutDashboard")} <span>Umumiy ko‘rinish</span></div>
                  <div class="sb-item" style="padding:6px 10px;font-size:12.5px">${ic("ClipboardList")} <span>Hamkor arizalari</span><span class="sb-badge warn">3</span></div>
                  <div class="sb-item" style="padding:6px 10px;font-size:12.5px">${ic("MessageSquare")} <span>Yordam va jonli chat</span><span class="sb-badge accent">4</span></div>
                </div>
              </div>
              <div class="callout-banner info" style="margin-top:auto">
                <div class="callout-left">
                  <div>
                    <strong>Oldingi V3 dan asosiy farq:</strong>
                    <span>Og‘ir qora-yashil yon panel va yorqin neon soyalar o‘rniga sokin oq arxitektura, yagona qatorli menyu va tiniq kontrast joriy etildi.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Typography & Components -->
          <div class="card">
            <div class="card-head"><h3>${ic("SlidersHorizontal")} 2. Tipografiya va Komponentlar</h3><span class="badge muted">UI Kit</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:13px">
              <div style="padding:12px 14px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                <div style="font-family:Manrope;font-size:22px;font-weight:800;color:var(--ink)">184 500 000 so‘m</div>
                <div style="font-size:12px;color:var(--muted);margin-top:3px">Manrope Bold + Tabular Numerals — raqamlar hech qachon 2 qatorga bo‘linib ketmaydi</div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">TUGMALAR IYERARXIYASI</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  <span class="btn primary">${ic("Plus")} Yangi e’lon</span>
                  <span class="btn soft">${ic("CheckCheck")} API tekshirish</span>
                  <span class="btn secondary">${ic("Download")} XLSX</span>
                  <span class="btn danger">${ic("XCircle")} Rad etish</span>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">INTERAKTIV ELEMENTLAR VA ID CHIPLAR</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                  <span class="id-chip">#482915</span>
                  <span class="ip-chip">${ic("Globe")} 185.139.138.42</span>
                  <span class="switch"><span class="switch-track on"><span class="switch-knob"></span></span> Bosh sahifada</span>
                  <span class="switch"><span class="switch-track"><span class="switch-knob"></span></span> Katalogda</span>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">JONLI BAZA TEKSHIRUVI (USERNAME & EMAIL)</div>
                <div class="f-input ok">
                  <span>@chortoq.direktor</span>
                  <span class="badge ok" style="padding:1px 7px;font-size:11px">${ic("Check")} Bo‘sh, tasdiqlandi</span>
                </div>
              </div>
              <div>
                <div class="f-label" style="margin-bottom:7px">KPI KARTA NAMUNASI (BENTO + SPARKLINE)</div>
                <div class="kpi-card" style="padding:12px 14px;gap:5px;background:var(--card-subtle)">
                  <div class="kpi-top"><span class="kpi-label">To‘langan bronlar</span><span class="delta">▲ +18.4%</span></div>
                  <div class="kpi-mid"><div class="kpi-val" style="font-size:20px">142<small>ta bron</small></div>${spark("2,23 15,19 28,21 42,13 55,15 67,8 76,5", "#0d7a5f", "rgba(13,122,95,0.12)")}</div>
                </div>
              </div>
              <div style="margin-top:auto">
                <div class="f-label" style="margin-bottom:6px">SEGMENTLI TABLAR VA FILTRLAR</div>
                <div class="segmented" style="width:100%;justify-content:space-between">
                  <span class="seg-item active">Kutilmoqda (3)</span>
                  <span class="seg-item">Tasdiqlangan (16)</span>
                  <span class="seg-item">Rad etilgan (2)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 3: Full Superadmin Module Map -->
          <div class="card">
            <div class="card-head"><h3>${ic("LayoutDashboard")} 3. Qamrab olingan 12 ta Superadmin ekrani</h3><span class="badge ok">100% Real</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:7px">
              ${[
                ["01", "Kirish sahifasi", "Tog‘ sanatoriyasi foni, HTTPS/CSRF, 5+ urinish trevogasi"],
                ["02", "Bosh sahifa (Kunduzgi)", "4 KPI, GMV/Daromad, Top sanatoriyalar, Gemini AI, XLSX"],
                ["03", "Bosh sahifa (Tungi)", "Ko‘zni toliqtirmaydigan Slate Dark rejim"],
                ["04", "Sanatoriyalar + Mashhur", "Mashhur switch, Profil moderatsiyasi va Bank rekviziti"],
                ["05", "Hamkor arizalari (YANGI)", "Mustaqil ro‘yxatdan o‘tish arizalari va 1-klik tasdiq"],
                ["06", "Bronlar CRM & E-mehmon", "3-tabli CRM, Profsoyuz kvotasi, 🖨️ E-mehmon anketasi"],
                ["07", "Jamoa & Ilova mijozlari", "#ID, profil suratlari, StaffManageModal, 25 ruxsat"],
                ["08", "Moliya, O‘tkazma & Reklama", "Tezcheck kassa, Bank dalili, HOME reklama preview"],
                ["09", "Yordam chati & Biriktirish", "Markaziy chat + «Xodimga biriktirish» (0ms alert)"],
                ["10", "E’lonlar markazi (YANGI)", "Users/Hamkor yetkazilishi, API verify-delivery, Preview"],
                ["11", "Amallar tarixi & Xavfsizlik", "Qurilma & IP jurnali, Telegram bot va Mobil ko‘rinish"],
              ]
                .map(
                  ([n, t, d]) => `
                <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border)">
                  <span class="id-chip" style="background:var(--accent-soft);color:var(--accent-deep);border-color:var(--accent-border)">${n}</span>
                  <div style="min-width:0">
                    <strong style="font-size:12.5px;display:block;line-height:1.2">${t}</strong>
                    <span style="font-size:11px;color:var(--muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d}</span>
                  </div>
                </div>`
                )
                .join("")}
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)">
          <span><strong>Qoida:</strong> Barcha ekranlar amaldagi NestJS/Prisma API va 21 ta migratsiyaga 100% mos. Tasdiqlangach, bevosita <code>packages/ui</code> va <code>apps/superadmin-web</code> ga tatbiq etiladi.</span>
          <span>Sihhat.uz · Superadmin Dizayn Taklifi · 2026</span>
        </div>
      </div>
    `;
  }

  /* ==================== BOARD 01: SUPERADMIN LOGIN ==================== */
  function board01() {
    return `
      <div class="login-shell">
        <div class="login-visual">
          <img class="login-visual-bg" src="${HERO_IMG}" alt="Sihhat.uz tog‘ sanatoriyasi" />
          <div class="login-visual-scrim"></div>

          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="sb-logo" style="width:44px;height:44px;border-radius:13px;border-color:rgba(255,255,255,0.28)"><img src="${LOGO}" alt="Sihhat uz" /></div>
              <div>
                <div style="font-family:Manrope;font-size:20px;font-weight:800;letter-spacing:-0.02em">sihhat<span style="color:#6ee7b7">.uz</span></div>
                <div style="font-size:12px;opacity:.8">O‘zbekiston sanatoriyalari ekotizimi</div>
              </div>
            </div>
            <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.22);font-size:12px;font-weight:600">
              <span style="width:7px;height:7px;border-radius:50%;background:#34d399"></span>
              Superadmin Portali
            </span>
          </div>

          <div style="max-width:600px">
            <div style="font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#86efac;margin-bottom:10px">
              MARKAZIY PLATFORMA BOSHQARUVI
            </div>
            <h1 style="margin:0;font-size:40px;line-height:1.12;font-weight:800">
              Sog‘lom dam olish.<br/>Tiniq va xotirjam boshqaruv.
            </h1>
            <p style="margin:16px 0 24px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85)">
              Barcha hamkor sanatoriyalar, yangi hamkor arizalari, onlayn bronlar, Tezcheck kassa, mijozlar bazasi (#ID), markaziy yordam chati, FCM push va Gemini AI sarfini yagona markazdan nazorat qiling.
            </p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
              ${[
                ["16 ta", "Faol sanatoriya"],
                ["0%", "Bron komissiyasi"],
                ["24/7", "Telegram & Push"],
              ]
                .map(
                  ([v, l]) => `
                <div style="padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.11);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.18)">
                  <div style="font-family:Manrope;font-size:22px;font-weight:800;color:#fff">${v}</div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.78);margin-top:2px">${l}</div>
                </div>`
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:16px;background:rgba(6,28,22,0.68);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15)">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:10px;background:rgba(52,211,153,0.18);color:#6ee7b7;display:flex;align-items:center;justify-content:center">${ic("ShieldCheck")}</div>
              <div>
                <strong style="display:block;font-size:13px">HTTPS · HttpOnly Cookie · CSRF Himoya</strong>
                <span style="font-size:11.5px;color:rgba(255,255,255,0.72)">Har bir kirish qurilmasi va IP manzili «Amallar tarixi» jurnalida qayd etiladi</span>
              </div>
            </div>
            <span style="font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;background:rgba(52,211,153,0.2);color:#86efac">Himoyalangan</span>
          </div>
        </div>

        <div class="login-form-side">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12.5px;color:var(--muted);font-weight:500">sihhat.uz/superadmin</span>
            <div class="segmented">
              <span class="seg-item active" style="display:inline-flex;align-items:center;gap:5px">${ic("Sun")} Kunduzgi</span>
              <span class="seg-item" style="display:inline-flex;align-items:center;gap:5px">${ic("Moon")} Tungi</span>
            </div>
          </div>

          <div class="login-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
              <div class="sb-logo" style="width:52px;height:52px;border-radius:15px"><img src="${LOGO}" alt="Sihhat uz" /></div>
              <span class="badge ok">${ic("LockKeyhole")} Xavfsiz seans</span>
            </div>

            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:4px">
              SUPERADMIN PANELI
            </div>
            <h2 style="margin:0;font-size:26px;font-weight:800;color:var(--ink)">Xush kelibsiz</h2>
            <p style="margin:6px 0 24px;color:var(--muted);font-size:13.5px">
              Platforma boshqaruvini davom ettirish uchun administrator hisobingizga kiring.
            </p>

            <div style="display:flex;flex-direction:column;gap:16px">
              <div class="f-field">
                <div style="display:flex;justify-content:space-between">
                  <span class="f-label">Administrator logini</span>
                  <span style="font-size:11px;color:var(--accent);font-weight:600">Faqat Superadmin</span>
                </div>
                <div class="f-input" style="padding:11px 13px;border-color:var(--accent)">
                  <span style="display:flex;align-items:center;gap:9px">${ic("User")} <strong>superadmin</strong></span>
                  <span style="color:var(--accent)">${ic("Check")}</span>
                </div>
              </div>

              <div class="f-field">
                <div style="display:flex;justify-content:space-between">
                  <span class="f-label">Maxfiy parol</span>
                  <span style="font-size:11px;color:var(--muted)">Kamida 10 belgi</span>
                </div>
                <div class="f-input" style="padding:11px 13px">
                  <span style="display:flex;align-items:center;gap:9px;letter-spacing:2px">${ic("KeyRound")} ••••••••••••••</span>
                  <span style="color:var(--muted)">${ic("Eye")}</span>
                </div>
              </div>

              <div style="padding:13px 16px;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(13,122,95,0.24);margin-top:4px">
                <span>Superadmin paneliga kirish</span>
                ${ic("ArrowRight")}
              </div>
            </div>

            <div style="margin-top:22px;padding:12px 14px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
              <span style="color:var(--accent);margin-top:1px">${ic("Info")}</span>
              <div style="font-size:12px;color:var(--muted);line-height:1.45">
                <strong style="color:var(--ink)">Brute-force himoya faol:</strong> 1 soatda 5 marta xato parol terilsa, Superadmin elektron pochtasi va <code>@sihhat_admins_bot</code> ga darhol ogohlantirish yuboriladi.
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted)">
            <span>© 2026 Sihhat.uz · Barcha huquqlar himoyalangan</span>
            <span>Toshkent vaqti (UTC+5)</span>
          </div>
        </div>
      </div>
    `;
  }

  /* ==================== BOARD 02 & 03: DASHBOARD (LIGHT & DARK) ==================== */
  function dashboardBody(dark) {
    const strokeAccent = dark ? "#2ad0a0" : "#0d7a5f";
    const fillAccent = dark ? "rgba(42,208,160,0.16)" : "rgba(13,122,95,0.10)";
    const bars = [
      { label: "Tasdiqlangan", val: 84, pct: 100, color: dark ? "#2ad0a0" : "#0d7a5f" },
      { label: "Joylashtirilgan", val: 31, pct: 46, color: dark ? "#38bdf8" : "#2563eb" },
      { label: "Yakunlangan", val: 18, pct: 32, color: dark ? "#818cf8" : "#4f46e5" },
      { label: "Kutilmoqda", val: 6, pct: 16, color: "#d97706" },
      { label: "Bekor", val: 3, pct: 10, color: "#e11d48" },
    ];

    return `
      <div class="page-head">
        <div>
          <h1>Platforma ko‘rsatkichlari</h1>
          <p>Bron aylanmasi (GMV · 0% komissiya) va platforma xizmatlari daromadi alohida hisoblanadi · Toshkent vaqti (UTC+5).</p>
        </div>
        <div class="head-actions">
          <div class="segmented">
            <span class="seg-item">Bugun</span>
            <span class="seg-item">7 kun</span>
            <span class="seg-item active">Noyabr 2026</span>
            <span class="seg-item">90 kun</span>
          </div>
          <span class="select-pill">${ic("CalendarDays")} 01.11 — 27.11 · Yashash davri ${ic("ChevronDown")}</span>
          <span class="btn secondary">${ic("FileSpreadsheet")} XLSX</span>
          <span class="btn primary">${ic("Download")} CSV</span>
        </div>
      </div>

      <!-- 4 KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">To‘langan bronlar</span>
            <div class="kpi-icon">${ic("BookOpen")}</div>
          </div>
          <div class="kpi-mid">
            <div class="kpi-val">142<small>ta bron</small></div>
            ${spark("2,23 15,19 28,21 42,13 55,15 67,8 76,5", strokeAccent, fillAccent)}
          </div>
          <div class="kpi-foot">
            <span class="delta">▲ +18.4%</span>
            <span>106 ilova · 36 qo‘lda va profsoyuz</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">O‘rtacha xonalar bandligi</span>
            <div class="kpi-icon">${ic("BedDouble")}</div>
          </div>
          <div class="kpi-mid">
            <div class="kpi-val">76.4<small>%</small></div>
            ${spark("2,22 16,18 30,15 45,17 59,10 70,7 76,5", strokeAccent, fillAccent)}
          </div>
          <div class="kpi-foot">
            <span class="delta">▲ +6.8%</span>
            <span>940 / 1 230 xona-tun · 1 820 mehmon-tun</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Bron aylanmasi (GMV)</span>
            <div class="kpi-icon">${ic("CreditCard")}</div>
          </div>
          <div class="kpi-mid">
            <div class="kpi-val">214.8 mln<small>so‘m</small></div>
            ${spark("2,24 15,20 29,18 44,19 57,12 68,8 76,4", strokeAccent, fillAccent)}
          </div>
          <div class="kpi-foot">
            <span class="delta neutral">0% komissiya</span>
            <span>214 800 000 so‘m tasdiqlangan</span>
          </div>
        </div>

        <div class="kpi-card accent">
          <div class="kpi-top">
            <span class="kpi-label">Platforma sof daromadi</span>
            <div class="kpi-icon">${ic("Coins")}</div>
          </div>
          <div class="kpi-mid">
            <div class="kpi-val">22.4 mln<small>so‘m</small></div>
            ${spark("2,24 17,20 32,16 48,13 62,8 76,3", "#8ff5dc", "rgba(143,245,220,0.22)")}
          </div>
          <div class="kpi-foot">
            <span class="delta">▲ +22.0%</span>
            <span>16 ta faol abonent · Reklama xizmatlari</span>
          </div>
        </div>
      </div>

      <!-- Main Analytics Row -->
      <div class="grid-main-side" style="flex:1.15">
        <div class="card">
          <div class="card-head">
            <div>
              <h3>${ic("ChartNoAxesCombined")} Bronlar holati va Top sanatoriyalar bandligi</h3>
              <div class="card-sub">Yashash sanalari kesishgan tasdiqlangan bronlar va yetakchi sanatoriyalar kesimi</div>
            </div>
            <span class="badge ok">Jami 142 ta bron</span>
          </div>
          <div class="card-body" style="display:grid;grid-template-columns:1fr 1.15fr;gap:22px;align-items:end">
            <div style="display:flex;flex-direction:column;height:100%;justify-content:flex-end">
              <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;height:190px;padding:12px 8px 0">
                ${bars
                  .map(
                    (b) => `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
                    <strong style="font-size:13px;color:var(--ink)">${b.val}</strong>
                    <div style="width:100%;max-width:46px;height:${Math.round(b.pct * 1.42)}px;border-radius:10px 10px 4px 4px;background:${b.color};opacity:${dark ? 0.9 : 0.92}"></div>
                    <span style="font-size:11px;color:var(--muted);white-space:nowrap">${b.label}</span>
                  </div>`
                  )
                  .join("")}
              </div>
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted)">
                <span>Hisob mezoni: <strong>Yashash davri</strong></span>
                <span>Bekor qilish darajasi: <strong style="color:var(--ok-ink)">2.1%</strong></span>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:13px;justify-content:center;height:100%">
              <div class="f-label" style="letter-spacing:0.05em">TOP SANATORIYALAR BANDLIGI</div>
              ${[
                ["Zomin Sog‘lomlik Maskani", "Jizzax · 52 bron · 78.4 mln", 88],
                ["Chimyon Sanatoriyasi", "Farg‘ona · 41 bron · 61.2 mln", 81],
                ["Oqtosh Tog‘ Kurorti", "Toshkent · 29 bron · 44.6 mln", 73],
                ["Chortoq Mineral Suv", "Namangan · 20 bron · 30.6 mln", 65],
              ]
                .map(
                  ([n, sub, p]) => `
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
                    <div><strong style="font-size:13px">${n}</strong> <span style="font-size:11.5px;color:var(--muted)">· ${sub}</span></div>
                    <strong style="font-size:13px;color:var(--accent)">${p}%</strong>
                  </div>
                  <div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div>
                </div>`
                )
                .join("")}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <h3>${ic("Wallet")} Hisob-kitob va Kassa qoldiqlari</h3>
              <div class="card-sub">Davr oxirigacha ledger bo‘yicha hisoblangan</div>
            </div>
            <span class="badge info">Ledger Guard 4/4</span>
          </div>
          <div class="card-body">
            <div class="kv-list">
              <div class="kv-row"><span class="kv-row-l">${ic("CreditCard")} Sof onlayn tushum (Net)</span><strong>182 400 000 so‘m</strong></div>
              <div class="kv-row"><span class="kv-row-l">${ic("Coins")} Joyida to‘lovlar (Naqd / Terminal)</span><strong>32 400 000 so‘m</strong></div>
              <div class="kv-row"><span class="kv-row-l">${ic("ArrowUpRight")} Sanatoriyalarga o‘tkazilgan</span><strong style="color:var(--ok-ink)">166 200 000 so‘m</strong></div>
              <div class="kv-row"><span class="kv-row-l">${ic("Clock")} Bankka yuborilayotgan (In-transit)</span><strong style="color:var(--warn-ink)">16 200 000 so‘m</strong></div>
              <div class="kv-row"><span class="kv-row-l">${ic("RefreshCw")} Mijozga qaytarilgan (Refund)</span><strong>4 850 000 so‘m</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom 3 Cards: AI Usage, Integrations, Mobile App & Partner Queue -->
      <div class="grid-3" style="flex:0.78">
        <div class="card">
          <div class="card-head">
            <h3>${ic("Sparkles")} Gemini AI Maslahatchi sarfi</h3>
            <span class="badge ok">Faol · 3.1-flash-lite</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
              <div style="padding:10px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border);text-align:center">
                <strong style="font-size:18px;display:block">386</strong>
                <span style="font-size:11px;color:var(--muted)">So‘rovlar</span>
              </div>
              <div style="padding:10px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border);text-align:center">
                <strong style="font-size:18px;display:block">134.2k</strong>
                <span style="font-size:11px;color:var(--muted)">Kirish token</span>
              </div>
              <div style="padding:10px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border);text-align:center">
                <strong style="font-size:18px;display:block;color:var(--accent)">$0.05</strong>
                <span style="font-size:11px;color:var(--muted)">Taxminiy USD</span>
              </div>
            </div>
            <div style="font-size:12px;color:var(--muted)">Telefon va email avtomatik niqoblanadi · Kunlik limit: 100/mijoz · Faqat tasdiqlangan katalog IDlari.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>${ic("ShieldCheck")} Provayderlar va Push xizmati</h3>
            <span class="badge ok">4/4 Tayyor</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:7px">
            <div class="kv-row" style="padding:7px 10px"><span class="kv-row-l">Tezcheck Kassa (Click · Payme)</span><span class="badge ok">accepts_payments</span></div>
            <div class="kv-row" style="padding:7px 10px"><span class="kv-row-l">Firebase Push (FCM HTTP v1)</span><span class="badge ok">Ulashgan · 0 ms</span></div>
            <div class="kv-row" style="padding:7px 10px"><span class="kv-row-l">Telegram Bot (@sihhat_admins_bot)</span><span class="badge ok">Webhook Faol</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>${ic("Smartphone")} Mobil Ilova va Tezkor Navbat</h3>
            <span class="badge info">APK v0.2.10</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;justify-content:space-between;gap:8px">
            <div style="display:flex;flex-direction:column;gap:7px">
              <div class="kv-row" style="padding:7px 10px"><span class="kv-row-l">Tasdiq kutayotgan hamkor arizalari</span><span class="badge warn">3 ta yangi →</span></div>
              <div class="kv-row" style="padding:7px 10px"><span class="kv-row-l">Ochiq markaziy yordam suhbatlari</span><span class="badge info">4 ta suhbat →</span></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted);padding-top:4px;border-top:1px solid var(--border)">
              <span>Universal APK (31.3 MB) · iOS PWA</span>
              <span style="color:var(--accent);font-weight:700">GitHub Releases ✓</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==================== BOARD 04: SANATORIUMS & FEATURED ==================== */
  function board04() {
    const rows = [
      { name: "Zomin Sog‘lomlik Maskani", loc: "Jizzax · Zomin tumani", status: ["Faol", "ok"], feat: true, rev: ["Nashrda", "ok"], bank: "Tasdiqlangan", online: true },
      { name: "Chimyon Sanatoriyasi", loc: "Farg‘ona · Chimyon", status: ["Faol", "ok"], feat: true, rev: ["Nashrda", "ok"], bank: "Tasdiqlangan", online: true },
      { name: "Oqtosh Tog‘ Kurorti", loc: "Toshkent · Bo‘stonliq", status: ["Faol", "ok"], feat: true, rev: ["Nashrda", "ok"], bank: "Tasdiqlangan", online: true },
      { name: "Bo‘ston Sanatoriyasi", loc: "Toshkent · Qibray tumani", status: ["Faol", "ok"], feat: false, rev: ["Tekshiruvda", "warn"], bank: "Yangi rekvizit (1)", online: true, selected: true },
      { name: "Chortoq Mineral Suv", loc: "Namangan · Chortoq", status: ["Faol", "ok"], feat: true, rev: ["Nashrda", "ok"], bank: "Tasdiqlangan", online: true },
      { name: "Sangardak Shifo", loc: "Surxondaryo · Sariosiyo", status: ["To‘xtatilgan", "warn"], feat: false, rev: ["Qoralama", "muted"], bank: "Kiritilmagan", online: false },
    ];
    return shell({
      activeId: "sanatoriums",
      crumb: "Sanatoriyalar",
      body: `
        <div class="page-head">
          <div>
            <h1>Sanatoriyalar va «Mashhur» vitrinasi</h1>
            <p>«Bosh sahifada» tugmasi orqali mobil ilova va saytning asosiy vitrinasida chiqadigan sanatoriyalarni belgilang.</p>
          </div>
          <div class="head-actions">
            <div class="segmented">
              <span class="seg-item active">Barchasi (16)</span>
              <span class="seg-item">Faol (13)</span>
              <span class="seg-item">Tekshiruvda (2)</span>
              <span class="seg-item">⭐ Mashhur (4)</span>
            </div>
            <span class="btn primary">${ic("Plus")} Yangi sanatoriya</span>
          </div>
        </div>

        <div class="callout-banner">
          <div class="callout-left">
            <div class="callout-icon">${ic("ClipboardList")}</div>
            <div>
              <strong>3 ta yangi hamkor sanatoriya arizasi tasdiq kutmoqda</strong>
              <span>Tasdiqlanganda hamkor direktor hisobi ochiladi, sanatoriya katalogga chiqadi va ariza emailiga xabar yuboriladi.</span>
            </div>
          </div>
          <span class="btn primary sm">Hamkor arizalarini ko‘rish (3) ${ic("ArrowRight")}</span>
        </div>

        <div class="grid-main-side">
          <div class="card">
            <div class="card-head">
              <h3>${ic("Building2")} Ro‘yxatdan o‘tgan sanatoriyalar</h3>
              <div style="display:flex;gap:8px;align-items:center">
                <div class="search-box" style="min-width:210px;padding:5.5px 10px">${ic("Search")} <span>Nomi yoki viloyat...</span></div>
                <span class="btn secondary sm">${ic("RefreshCw")} Yangilash</span>
              </div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th style="min-width:195px">Sanatoriya</th>
                    <th>Holat</th>
                    <th>Mashhur</th>
                    <th>Profil & Bank</th>
                    <th>Bron</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (r) => `
                    <tr class="${r.selected ? "selected" : ""}">
                      <td>
                        <div class="cell-main">${r.name}</div>
                        <span class="cell-sub">${r.loc}</span>
                      </td>
                      <td><span class="badge ${r.status[1]}">${r.status[0]}</span></td>
                      <td>
                        <span class="switch">
                          <span class="switch-track ${r.feat ? "on" : ""}"><span class="switch-knob"></span></span>
                          <span>${r.feat ? "Mashhur" : "Katalogda"}</span>
                        </span>
                      </td>
                      <td>
                        <span class="badge ${r.rev[1]}">${r.rev[0]}</span>
                        <span class="cell-sub">Bank: ${r.bank}</span>
                      </td>
                      <td><span class="badge ${r.online ? "ok" : "muted"}">${r.online ? "Ochiq" : "Yopiq"}</span></td>
                      <td>
                        <div style="display:flex;gap:6px">
                          <span class="btn secondary xs">Profil</span>
                          <span class="btn secondary xs">Sozlash</span>
                        </div>
                      </td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("ShieldCheck")} Moderatsiya va Bank rekviziti</h3>
                <div class="card-sub">Bo‘ston Sanatoriyasi · Yangi tahrir #4</div>
              </div>
              <span class="badge warn">Tasdiq kutilmoqda</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="padding:13px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <strong style="font-size:13px">1. Profil anketasi va 14 ta surat</strong>
                  <span class="badge ok">To‘liq (100%)</span>
                </div>
                <p style="margin:0 0 10px;font-size:12px;color:var(--muted)">
                  Sharoitlar (Yopiq basseyn, Tuzli g‘or, Wi-Fi), «Qaysi dardga davo?» (Yurak-qon tomir, Asab tizimi), Google Maps havolasi va Hamkor shartlari tasdiqlangan.
                </p>
                <div style="display:flex;gap:8px">
                  <span class="btn primary sm">${ic("Check")} Profilni e’lon qilish</span>
                  <span class="btn secondary sm">Tuzatishga qaytarish</span>
                </div>
              </div>

              <div style="padding:13px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <strong style="font-size:13px">2. Bank rekvizitlari (Qo‘lda tekshiruv)</strong>
                  <span class="badge warn">Yangi so‘rov</span>
                </div>
                <div class="f-grid" style="margin-bottom:10px;font-size:12px">
                  <div><span class="f-label">Yuridik nom</span><br/><strong>«BO‘STON SIHHAT» MChJ</strong></div>
                  <div><span class="f-label">STIR / MFO</span><br/><strong>305112980 · 00401</strong></div>
                  <div class="f-field full"><span class="f-label">Hisob raqami (20 xonali) · O‘zmilliybank AJ</span><span class="ip-chip" style="margin-top:3px">2020 8000 9051 1298 0001</span></div>
                </div>
                <div style="display:flex;gap:8px">
                  <span class="btn primary sm">${ic("Check")} Rekvizitni tasdiqlash</span>
                  <span class="btn danger sm">Rad etish</span>
                </div>
              </div>

              <div style="padding:12px 13px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border);display:flex;flex-direction:column;gap:8px">
                <strong style="font-size:13px">3. Onlayn bron va Abonent qoidasi</strong>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
                  <span>Onlayn bron qabul qilishni ochish</span>
                  <span class="switch"><span class="switch-track on"><span class="switch-knob"></span></span></span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
                  <span>Faol abonent talab qilinsin</span>
                  <span class="switch"><span class="switch-track"><span class="switch-knob"></span></span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 05: PARTNER REGISTRATIONS (NEW!) ==================== */
  function board05() {
    const apps = [
      { san: "Chortoq Shifo Sanatoriyasi", loc: "Namangan · Chortoq tumani", price: "480 000 so‘m/kun", dir: "Alisher Karimov", user: "@chortoq.shifo · info@chortoqshifo.uz", phone: "+998 90 412 33 10", dt: "27.11.2026, 14:22", ip: "185.139.138.42 · Chrome", st: ["Kutilmoqda", "warn"], selected: true },
      { san: "Omonxona Mineral Maskani", loc: "Surxondaryo · Boysun tumani", price: "420 000 so‘m/kun", dir: "Jamshid Xolmatov", user: "@omonxona.dir · dir@omonxona.uz", phone: "+998 91 550 18 04", dt: "26.11.2026, 18:05", ip: "84.54.71.19 · Safari macOS", st: ["Kutilmoqda", "warn"] },
      { san: "Farg‘ona Bog‘i Kurorti", loc: "Farg‘ona · Vodil qishlog‘i", price: "510 000 so‘m/kun", dir: "Nodira Usmonova", user: "@vodil.sanatoriya · nodira@vodil.uz", phone: "+998 93 771 29 55", dt: "25.11.2026, 11:40", ip: "94.158.52.88 · Chrome Android", st: ["Kutilmoqda", "warn"] },
      { san: "Zomin Sog‘lomlik Maskani", loc: "Jizzax · Zomin tumani", price: "550 000 so‘m/kun", dir: "Bahrom Jo‘rayev", user: "@zomin.direktor · zomin@sihhat.uz", phone: "+998 90 123 45 67", dt: "19.11.2026, 09:15", ip: "195.158.12.40 · Chrome", st: ["Tasdiqlangan", "ok"] },
    ];
    return shell({
      activeId: "partner-registrations",
      crumb: "Hamkor arizalari",
      body: `
        <div class="page-head">
          <div>
            <h1>Hamkor arizalari (Yangi hisob ochish so‘rovlari)</h1>
            <p>Hamkorlar kirish sahifasidan yuborilgan yangi sanatoriya arizalarini tekshiring — tasdiqlanganda hisob ochiladi va katalogga chiqariladi.</p>
          </div>
          <div class="head-actions">
            <span class="btn secondary">${ic("RefreshCw")} Yangilash</span>
          </div>
        </div>

        <div class="kpi-grid cols-3">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Tasdiq kutayotgan arizalar</span><div class="kpi-icon" style="background:var(--warn-bg);color:var(--warn-ink)">${ic("Clock")}</div></div>
            <div class="kpi-val">3<small>ta yangi ariza</small></div>
            <div class="kpi-foot"><span>Superadmin qarorini kutmoqda · Email + Bot ogohlantirilgan</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Tasdiqlangan hamkorlar</span><div class="kpi-icon">${ic("CircleCheck")}</div></div>
            <div class="kpi-val">16<small>ta sanatoriya</small></div>
            <div class="kpi-foot"><span>Direktor hisobi ochilib, ommaviy katalogga chiqarilgan</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Rad etilgan arizalar</span><div class="kpi-icon" style="background:var(--err-bg);color:var(--err-ink)">${ic("XCircle")}</div></div>
            <div class="kpi-val">2<small>ta ariza</small></div>
            <div class="kpi-foot"><span>Username/email avtomatik bo‘shatilgan, qayta yuborishi mumkin</span></div>
          </div>
        </div>

        <div class="grid-side-wide">
          <div class="card">
            <div class="card-head">
              <div class="segmented">
                <span class="seg-item active">Kutilmoqda (3)</span>
                <span class="seg-item">Tasdiqlangan (16)</span>
                <span class="seg-item">Rad etilgan (2)</span>
                <span class="seg-item">Barchasi</span>
              </div>
              <div class="search-box" style="min-width:210px;padding:5.5px 10px">${ic("Search")} <span>Sanatoriya, @user, email...</span></div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th>Sanatoriya</th>
                    <th>Direktor hisobi</th>
                    <th>Manba & Vaqt</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  ${apps
                    .map(
                      (a) => `
                    <tr class="${a.selected ? "selected" : ""}">
                      <td>
                        <div class="cell-main">${a.san}</div>
                        <span class="cell-sub">${a.loc}</span>
                        <span class="cell-sub" style="color:var(--accent);font-weight:600">${a.price}</span>
                      </td>
                      <td>
                        <div class="cell-main">${a.dir}</div>
                        <span class="cell-sub">${a.user}</span>
                        <span class="cell-sub">${a.phone}</span>
                      </td>
                      <td>
                        <div style="font-size:12.5px;font-weight:600">${a.dt}</div>
                        <span class="cell-sub">${a.ip}</span>
                      </td>
                      <td><span class="badge ${a.st[1]}">${a.st[0]}</span></td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Inspector: Application Details -->
          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("ClipboardList")} Chortoq Shifo Sanatoriyasi</h3>
                <div class="card-sub">Yuborilgan: 27.11.2026, 14:22 · Namangan viloyati</div>
              </div>
              <span class="badge warn">Tasdiq kutilmoqda</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div class="f-grid" style="font-size:12.5px">
                <div style="padding:9px 11px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border)">
                  <span class="f-label">Mas’ul shaxs (Direktor)</span><br/><strong>Alisher Karimov</strong>
                </div>
                <div style="padding:9px 11px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border)">
                  <span class="f-label">Username (Baza bo‘sh ✓)</span><br/><strong style="color:var(--accent)">@chortoq.shifo</strong>
                </div>
                <div style="padding:9px 11px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border)">
                  <span class="f-label">Email (Xabarnoma uchun)</span><br/><strong>info@chortoqshifo.uz</strong>
                </div>
                <div style="padding:9px 11px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border)">
                  <span class="f-label">Yuridik / STIR</span><br/><strong>Chortoq Shifo MChJ · 308412901</strong>
                </div>
              </div>

              <div style="padding:10px 12px;border-radius:10px;background:var(--card-subtle);border:1px solid var(--border);font-size:12.5px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <strong>Boshlang‘ich xona va narx</strong>
                  <strong style="color:var(--accent)">480 000 so‘m / tun</strong>
                </div>
                <span style="color:var(--muted)">Standart 2 kishilik xona (12 ta xona) · Check-in 14:00 / Check-out 12:00 · 3 mahal parhez ovqat</span>
              </div>

              <div>
                <div class="f-label" style="margin-bottom:5px">DAVOLASH YO‘NALISHLARI VA SHAROITLAR</div>
                <div class="chip-wrap">
                  <span class="tag-chip active">Mineral yod-brom suvi</span>
                  <span class="tag-chip active">Yurak-qon tomir</span>
                  <span class="tag-chip active">Bo‘g‘im va umurtqa</span>
                  <span class="tag-chip">Yopiq basseyn</span>
                  <span class="tag-chip">Shifokor ko‘rigi</span>
                  <span class="tag-chip">Wi-Fi · Avtoturargoh</span>
                </div>
              </div>

              <div style="padding:10px 12px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-border);font-size:12px;color:var(--ink-2)">
                <strong>Tasdiqlanganda avtomatik bajariladi:</strong> «@chortoq.shifo» Direktor hisobi ochiladi, sanatoriya katalogda «ACTIVE» bo‘ladi va <code>info@chortoqshifo.uz</code> ga kirish xati yuboriladi.
              </div>

              <div style="display:flex;gap:10px;margin-top:auto">
                <span class="btn primary" style="flex:1;justify-content:center">${ic("CircleCheck")} Tasdiqlash va katalogga chiqarish</span>
                <span class="btn danger">${ic("XCircle")} Rad etish</span>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 06: BOOKINGS CRM + TODAY + E-MEHMON ==================== */
  function board06() {
    const bks = [
      { ref: "#SH-261184", san: "Zomin Sog‘lomlik", guest: "Rustamov Bekzod", phone: "+998 90 314 22 10", dates: "27.11 — 04.12 (7 tun)", place: "🏠 Butun xona · Lyuks 204", sum: "5 250 000 so‘m", st: ["Tasdiqlangan", "ok"], selected: true },
      { ref: "#SH-261179", san: "Chimyon Sanatoriyasi", guest: "Karimova Dilnoza", phone: "+998 93 811 45 09", dates: "27.11 — 02.12 (5 tun)", place: "👩 1 kishilik joy (Ayollar)", sum: "2 150 000 so‘m", st: ["Joylashtirilgan", "info"] },
      { ref: "#SH-261172", san: "Oqtosh Tog‘ Kurorti", guest: "O‘zmetkombinat (Profsoyuz)", phone: "+998 71 200 44 12", dates: "28.11 — 08.12 (10 tun)", place: "🏛 Kasaba uyushmasi · 4 xona", sum: "18 400 000 so‘m", st: ["Tasdiqlangan", "violet"] },
      { ref: "#SH-261165", san: "Chortoq Mineral Suv", guest: "Toshmatov Oybek", phone: "+998 97 502 18 77", dates: "27.11 — 01.12 (4 tun)", place: "👨 1 kishilik joy (Erkaklar)", sum: "1 920 000 so‘m", st: ["To‘lov kutilmoqda", "warn"] },
      { ref: "#SH-261151", san: "Zomin Sog‘lomlik", guest: "Aliyeva Malika", phone: "+998 99 410 08 61", dates: "20.11 — 27.11 (7 tun)", place: "🏠 Butun xona · Standart 108", sum: "3 850 000 so‘m", st: ["Bugun ketadi", "muted"] },
    ];
    return shell({
      activeId: "bookings",
      crumb: "Bronlar va Mijozlar CRM",
      tenantFilter: "Barcha sanatoriyalar (16)",
      body: `
        <div class="page-head">
          <div>
            <h1>Bronlar va Mijozlar CRM</h1>
            <p>Onlayn, qo‘lda va kasaba uyushmasi (Profsoyuz) bronlari, joylashish turlari hamda 1-klikda E-mehmon anketasi.</p>
          </div>
          <div class="head-actions">
            <div class="segmented">
              <span class="seg-item active">Barcha bronlar (142)</span>
              <span class="seg-item">Kutish ro‘yxati & 6+ oy (19)</span>
              <span class="seg-item">Korxona & Profsoyuz (7)</span>
            </div>
            <span class="btn primary">${ic("Plus")} Qo‘lda bron</span>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="padding:13px 16px"><div class="kpi-top"><span class="kpi-label">Bugun keladiganlar (Check-in)</span><span class="badge ok">9 mehmon</span></div><div class="kpi-val" style="font-size:21px">9 <small>ta bron</small></div></div>
          <div class="kpi-card" style="padding:13px 16px"><div class="kpi-top"><span class="kpi-label">Bugun ketadiganlar (Check-out)</span><span class="badge info">5 mehmon</span></div><div class="kpi-val" style="font-size:21px">5 <small>ta bron</small></div></div>
          <div class="kpi-card" style="padding:13px 16px"><div class="kpi-top"><span class="kpi-label">Kutish ro‘yxati (Bo‘sh joy)</span><span class="badge warn">11 so‘rov</span></div><div class="kpi-val" style="font-size:21px">19 <small>mijoz</small></div></div>
          <div class="kpi-card" style="padding:13px 16px"><div class="kpi-top"><span class="kpi-label">Profsoyuz & Korxona kvotasi</span><span class="badge violet">74% band</span></div><div class="kpi-val" style="font-size:21px">37 / 50 <small>o‘rin</small></div></div>
        </div>

        <div class="grid-main-side">
          <div class="card">
            <div class="card-head">
              <h3>${ic("BookOpen")} Faol bronlar jadvali</h3>
              <div style="display:flex;gap:8px">
                <div class="search-box" style="min-width:220px;padding:5.5px 10px">${ic("Search")} <span>#SH-..., ism, telefon...</span></div>
                <span class="select-pill">Holat: Barchasi ${ic("ChevronDown")}</span>
              </div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th>Bron & Sanatoriya</th>
                    <th>Mehmon</th>
                    <th>Sana & Joylashish</th>
                    <th>Summa</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  ${bks
                    .map(
                      (b) => `
                    <tr class="${b.selected ? "selected" : ""}">
                      <td>
                        <div class="cell-main">${b.ref}</div>
                        <span class="cell-sub">${b.san}</span>
                      </td>
                      <td>
                        <div class="cell-main">${b.guest}</div>
                        <span class="cell-sub">${b.phone}</span>
                      </td>
                      <td>
                        <div style="font-size:12.5px;font-weight:600">${b.dates}</div>
                        <span class="cell-sub">${b.place}</span>
                      </td>
                      <td style="white-space:nowrap"><strong>${b.sum}</strong></td>
                      <td><span class="badge ${b.st[1]}">${b.st[0]}</span></td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("Printer")} Bron #SH-261184 · E-mehmon</h3>
                <div class="card-sub">Zomin Sog‘lomlik Maskani · 27.11 — 04.12.2026</div>
              </div>
              <span class="badge ok">To‘langan</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="btn primary sm">${ic("Check")} Joylashtirish (Check-in)</span>
                <span class="btn soft sm">${ic("Printer")} E-mehmon chop etish</span>
                <span class="btn secondary sm">Pasport kiritish</span>
              </div>

              <div class="emehmon-box">
                <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px solid var(--border);margin-bottom:9px">
                  <div>
                    <strong style="font-size:12px;letter-spacing:0.03em">MEHMONNI RO‘YXATGA OLISH ANKETASI (E-MEHMON)</strong>
                    <span class="cell-sub">Rasmiy chop etish blankasi · QR-vaucher tasdiqlangan</span>
                  </div>
                  <span class="id-chip">#SH-261184</span>
                </div>
                <div class="kv-list" style="gap:6px">
                  <div class="kv-row" style="padding:6px 10px;background:var(--card)"><span>Mehmon F.I.Sh.</span><strong>Rustamov Bekzod Aliyevich</strong></div>
                  <div class="kv-row" style="padding:6px 10px;background:var(--card)"><span>Pasport / JShShIR</span><strong>AD 4829104 · 31204910280014</strong></div>
                  <div class="kv-row" style="padding:6px 10px;background:var(--card)"><span>Xona va joylashish</span><strong>Lyuks 204 · 🏠 Butun xona (2 katta)</strong></div>
                  <div class="kv-row" style="padding:6px 10px;background:var(--card)"><span>Yo‘llanma dasturi</span><strong>🩺 To‘liq davolanish + 3 mahal ovqat</strong></div>
                  <div class="kv-row" style="padding:6px 10px;background:var(--card)"><span>Onlayn to‘lov (Tezcheck)</span><strong style="color:var(--ok-ink)">5 250 000 so‘m · Tasdiqlangan</strong></div>
                </div>
              </div>

              <div style="margin-top:auto">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                  <span style="font-weight:600">Kasaba uyushmalari kvotasi (Noyabr)</span>
                  <strong style="color:var(--accent)">37 / 50 yo‘llanma (74%)</strong>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:74%"></div></div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 07: STAFF & APP USERS + MODAL ==================== */
  function board07() {
    const users = [
      { av: "BJ", clr: "", online: true, name: "Bahrom Jo‘rayev", id: "#204911", role: ["Direktor", "ok"], san: "Zomin Sog‘lomlik", meta: "@zomin.direktor · +998 90 123 45 67", perms: "25 / 25 vakolat", sess: "2 faol sessiya", selected: true },
      { av: "MS", clr: "blue", online: true, name: "Malika Sobirova", id: "#519042", role: ["Resepshn", "info"], san: "Chimyon Sanatoriyasi", meta: "@chimyon.recep · +998 91 344 12 08", perms: "10 / 25 vakolat", sess: "1 faol sessiya" },
      { av: "OA", clr: "violet", online: false, name: "Otabek Abdullayev", id: "#603817", role: ["Hisobchi", "violet"], san: "Oqtosh Tog‘ Kurorti", meta: "@oqtosh.bux · +998 93 701 44 21", perms: "3 / 25 (Hisobot)", sess: "1 faol sessiya" },
      { av: "DK", clr: "amber", online: false, name: "Dilshod Komilov", id: "#748201", role: ["Tasdiq kutilmoqda", "warn"], san: "Bo‘ston Sanatoriyasi", meta: "@boston.recep · +998 94 210 88 90", perms: "Taklif qilingan", sess: "0 faol" },
      { av: "AR", clr: "rose", online: true, name: "Azizbek Rahimov", id: "#482915", role: ["Ilova mijozi", "muted"], san: "Samsung SM-A165F", meta: "3 bron · 1 murojaat · 94.158.52.104", perms: "Mobil ilova", sess: "● Onlayn" },
    ];
    return shell({
      activeId: "staff",
      crumb: "Jamoa, Ruxsatlar va Ilova foydalanuvchilari",
      tenantFilter: "Barcha sanatoriyalar (16)",
      body: `
        <div class="page-head">
          <div>
            <h1>Jamoa, Ruxsatlar va Ilova mijozlari</h1>
            <p>6 xonali unikal #ID, profil suratlari, onlayn indikator, baza bo‘yicha jonli login/email tekshiruvi va 25 ta vakolat matritsasi.</p>
          </div>
          <div class="head-actions">
            <div class="segmented">
              <span class="seg-item active">Hamkor xodimlar (48)</span>
              <span class="seg-item">Tasdiq kutmoqda (2)</span>
              <span class="seg-item">Ilova mijozlari (1 480)</span>
            </div>
            <span class="btn primary">${ic("Plus")} Xodim qo‘shish</span>
          </div>
        </div>

        <div class="grid-side-wide">
          <div class="card">
            <div class="card-head">
              <h3>${ic("Users")} Xodimlar va mijozlar ro‘yxati</h3>
              <div class="search-box" style="min-width:230px;padding:5.5px 10px">${ic("Search")} <span>#ID, ism, @login, email...</span></div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th>Foydalanuvchi & #ID</th>
                    <th>Lavozim & Sanatoriya</th>
                    <th>Vakolat / Sessiya</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  ${users
                    .map(
                      (u) => `
                    <tr class="${u.selected ? "selected" : ""}">
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div class="avatar ${u.clr}">${u.av}${u.online ? '<span class="online-ring"></span>' : ""}</div>
                          <div>
                            <div class="cell-main">${u.name} <span class="id-chip">${u.id}</span></div>
                            <span class="cell-sub">${u.meta}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge ${u.role[1]}">${u.role[0]}</span>
                        <span class="cell-sub" style="color:var(--ink-2);font-weight:500">${u.san}</span>
                      </td>
                      <td>
                        <div style="font-size:12.5px;font-weight:600">${u.perms}</div>
                        <span class="cell-sub">${u.sess}</span>
                      </td>
                      <td style="white-space:nowrap">
                        <span class="btn secondary xs">Boshqarish</span>
                      </td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Inspector: StaffManageModal / CustomerManageModal -->
          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("UserCheck")} Bahrom Jo‘rayev · <span class="id-chip">#204911</span></h3>
                <div class="card-sub">Zomin Sog‘lomlik Maskani · Xodim profili va vakolatlari</div>
              </div>
              <span class="badge ok">● Onlayn</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                <div class="avatar xl">BJ<span class="online-ring"></span></div>
                <div style="flex:1">
                  <strong style="font-size:13.5px;display:block">Profil surati (maks. 15 MB)</strong>
                  <span style="font-size:12px;color:var(--muted);display:block;margin-bottom:8px">Chatda, panelda va xodimlar jadvalida ko‘rinadi</span>
                  <div style="display:flex;gap:7px">
                    <span class="btn secondary xs">${ic("Camera")} Almashtirish</span>
                    <span class="btn danger xs">${ic("Trash2")} O‘chirish</span>
                  </div>
                </div>
              </div>

              <div class="f-grid">
                <div class="f-field">
                  <span class="f-label">Login (Jonli baza tekshiruvi)</span>
                  <div class="f-input ok"><span>zomin.direktor</span><span style="color:var(--ok-ink)">${ic("Check")}</span></div>
                </div>
                <div class="f-field">
                  <span class="f-label">Elektron pochta (Email)</span>
                  <div class="f-input ok"><span>zomin@sihhat.uz</span><span style="color:var(--ok-ink)">${ic("Check")}</span></div>
                </div>
                <div class="f-field">
                  <span class="f-label">Lavozim</span>
                  <div class="f-input"><span>Direktor</span>${ic("ChevronDown")}</div>
                </div>
                <div class="f-field">
                  <span class="f-label">Hisob holati</span>
                  <div class="f-input"><span>Faol (ACTIVE)</span>${ic("ChevronDown")}</div>
                </div>
                <div class="f-field full">
                  <span class="f-label">Yangi parol o‘rnatish (ixtiyoriy · 8+ belgi)</span>
                  <div class="f-input"><span>Bo‘sh qoldirilsa joriy parol o‘zgarmaydi</span>${ic("Eye")}</div>
                </div>
              </div>

              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span class="f-label">ASOSIY VAKOLATLAR (25 TADAN 25 TASI YOQILGAN)</span>
                  <span style="font-size:11.5px;color:var(--accent);font-weight:700">Matritsani ochish →</span>
                </div>
                <div class="chip-wrap">
                  <span class="tag-chip active">✓ Profil tahriri</span>
                  <span class="tag-chip active">✓ Xonalar & Shaxmatka</span>
                  <span class="tag-chip active">✓ Qo‘lda bron</span>
                  <span class="tag-chip active">✓ Moliyaviy hisobot</span>
                  <span class="tag-chip active">✓ Xodim taklif qilish</span>
                  <span class="tag-chip active">✓ Murojaatlarga javob</span>
                </div>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border);margin-top:auto">
                <span class="btn secondary sm">${ic("LogOut")} Sessiyalarni yopish (2)</span>
                <div style="display:flex;gap:8px">
                  <span class="btn secondary sm">Kirish tarixi</span>
                  <span class="btn primary sm">${ic("Check")} Saqlash</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 08: FINANCE, TEZCHECK & ADS ==================== */
  function board08() {
    const payouts = [
      { rec: "«ZOMIN SIHHAT» MChJ", acc: "2020 8000 1048 2910 0001 · Ipak Yo‘li", sum: "48 600 000 so‘m", st: ["Bank tasdig‘i kutilmoqda", "warn"], dt: "27.11.2026", act: "Bank natijasi" },
      { rec: "«CHIMYON KURORT» AJ", acc: "2020 8000 4091 8402 0001 · Milliybank", sum: "36 400 000 so‘m", st: ["To‘langan", "ok"], dt: "24.11.2026", act: "Dalil (PDF)" },
      { rec: "«OQTOSH SHIFO» MChJ", acc: "2020 8000 9012 4401 0002 · Kapitalbank", sum: "28 900 000 so‘m", st: ["Qoralama", "muted"], dt: "27.11.2026", act: "Ma’qullash" },
      { rec: "Refund · #SH-261104", acc: "Mijoz: D. Karimova · Payme callback", sum: "1 850 000 so‘m", st: ["Ma’qullash kutilmoqda", "err"], dt: "26.11.2026", act: "Ko‘rib chiqish" },
    ];
    return shell({
      activeId: "payments",
      crumb: "Moliya, O‘tkazmalar va Reklama Vitrinasi",
      body: `
        <div class="page-head">
          <div>
            <h1>Moliya, O‘tkazmalar va Reklama Vitrinasi</h1>
            <p>Tezcheck kassa monitoringi, sanatoriyalarga bank dalili bilan o‘tkazmalar, refund nazorati va ilovadagi HOME reklama previewi.</p>
          </div>
          <div class="head-actions">
            <div class="segmented">
              <span class="seg-item">To‘lovlar</span>
              <span class="seg-item active">O‘tkazmalar (3)</span>
              <span class="seg-item">Refund (1)</span>
              <span class="seg-item">Abonent</span>
              <span class="seg-item">Reklama (LIVE)</span>
              <span class="seg-item">Solishtirish</span>
            </div>
            <span class="btn primary">${ic("Plus")} O‘tkazma tayyorlash</span>
          </div>
        </div>

        <div class="kpi-grid cols-3">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Tezcheck Kassa holati</span><span class="badge ok">● Active</span></div>
            <div class="kpi-val" style="font-size:21px">Click · Payme · Uzcard · Humo</div>
            <div class="kpi-foot"><span>accepts_payments=true · Direct settlement tayyor</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Sanatoriyalarga o‘tkazma (Noyabr)</span><div class="kpi-icon">${ic("FileCheck")}</div></div>
            <div class="kpi-val">166.2 mln<small>so‘m</small></div>
            <div class="kpi-foot"><span class="delta warn">16.2 mln jarayonda</span><span>Bank dalili majburiy</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">To‘lovlarni solishtirish (Reestr)</span><div class="kpi-icon">${ic("ChartNoAxesCombined")}</div></div>
            <div class="kpi-val">0<small>ta farq</small></div>
            <div class="kpi-foot"><span class="delta">100% mos</span><span>Oxirgi CSV import: 26.11.2026</span></div>
          </div>
        </div>

        <div class="grid-main-side">
          <div class="card">
            <div class="card-head">
              <h3>${ic("FileCheck")} Sanatoriyaga o‘tkazmalar va Refund nazorati</h3>
              <span class="btn secondary sm">${ic("Upload")} Bank / Payme CSV import</span>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th>Qabul qiluvchi / Bank rekviziti</th>
                    <th>Summa</th>
                    <th>Holat</th>
                    <th>Sana</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  ${payouts
                    .map(
                      (p, i) => `
                    <tr class="${i === 0 ? "selected" : ""}">
                      <td>
                        <div class="cell-main">${p.rec}</div>
                        <span class="cell-sub">${p.acc}</span>
                      </td>
                      <td style="white-space:nowrap"><strong>${p.sum}</strong></td>
                      <td><span class="badge ${p.st[1]}">${p.st[0]}</span></td>
                      <td>${p.dt}</td>
                      <td><span class="btn ${i === 0 ? "primary" : "secondary"} xs">${p.act}</span></td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--card-subtle);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)">
              <span><strong>Eslatma:</strong> Bank natijasi va PDF/PNG dalil fayli yuklangach o‘tkazma «To‘langan» deb yopiladi.</span>
              <span class="badge info">Abonent tariflari: 3 ta</span>
            </div>
          </div>

          <!-- Right Card: Live Mobile HOME Ad Preview -->
          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("Megaphone")} Reklama vitrinasi · Jonli preview</h3>
                <div class="card-sub">Ilovaning bosh ekranida (HOME) ko‘rinishi</div>
              </div>
              <span class="badge ok">LIVE · Bepul</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
              <div style="display:flex;gap:16px;align-items:center">
                <div class="phone-frame" style="flex-shrink:0">
                  <div style="background:#0b5f4a;color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700">
                    <span>sihhat.uz</span>
                    <span>09:41</span>
                  </div>
                  <div style="padding:10px">
                    <div style="position:relative;border-radius:14px;overflow:hidden;height:132px;margin-bottom:9px">
                      <img src="${HERO_IMG}" alt="Reklama" style="width:100%;height:100%;object-fit:cover" />
                      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 20%,rgba(6,32,25,0.88) 100%);padding:10px;display:flex;flex-direction:column;justify-content:space-between">
                        <span style="align-self:flex-start;background:#f59e0b;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px">-20% Qishki aksiya</span>
                        <div style="color:#fff">
                          <strong style="font-size:12.5px;display:block">Zomin Sog‘lomlik Maskani</strong>
                          <span style="font-size:10.5px;opacity:.85">10 kunlik davolanish + basseyn</span>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
                      <span style="color:var(--muted)">Ochadigan joy:</span>
                      <strong style="color:var(--accent)">Sanatoriya profili →</strong>
                    </div>
                  </div>
                </div>

                <div style="flex:1;display:flex;flex-direction:column;gap:10px">
                  <div>
                    <span class="badge ok" style="margin-bottom:6px">Asosiy sahifada (HOME)</span>
                    <strong style="display:block;font-size:14px">Zomin Qishki Yo‘llanma</strong>
                    <span style="font-size:12px;color:var(--muted)">25.11.2026 — 15.12.2026</span>
                  </div>
                  <div class="kv-list" style="gap:6px">
                    <div class="kv-row" style="padding:6px 10px"><span>Joylashuv</span><strong>HOME Banner</strong></div>
                    <div class="kv-row" style="padding:6px 10px"><span>Chegirma</span><strong style="color:var(--warn-ink)">20%</strong></div>
                    <div class="kv-row" style="padding:6px 10px"><span>Yangilanish</span><strong>Har 30 soniya</strong></div>
                  </div>
                  <div style="display:flex;gap:7px;margin-top:4px">
                    <span class="btn primary sm" style="flex:1;justify-content:center">Tahrirlash</span>
                    <span class="btn danger sm">To‘xtatish</span>
                  </div>
                </div>
              </div>

              <div style="padding:12px 14px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px">
                <div>
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px">
                    <span class="badge warn" style="font-size:10.5px">Tasdiq kutilmoqda</span>
                    <strong style="font-size:12.5px">Chimyon — Yangi yil dasturi</strong>
                  </div>
                  <span style="font-size:11.5px;color:var(--muted)">POPUP joylashuv · 01.12 — 31.12 · Admin tasdiqlagach bepul chiqadi</span>
                </div>
                <span class="btn soft xs">Ma’qullash</span>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 09: SUPPORT CHAT + STAFF ASSIGNMENT (NEW!) ==================== */
  function board09() {
    const threads = [
      { av: "AR", clr: "", name: "Azizbek Rahimov", id: "#482915", tag: "Mobil mijoz", msg: "Erta soat 09:00 da yetib borsak, xonaga joylashish mumkinmi?", time: "14:28", unread: 2, assigned: "Superadmin", active: true },
      { av: "DK", clr: "blue", name: "Dilnoza Karimova", id: "#739104", tag: "Mobil mijoz", msg: "Ayollar xonasidan 1 kishilik joy bron qilmoqchi edim...", time: "13:50", unread: 1, assigned: "M. Sobirova (Chimyon)" },
      { av: "OT", clr: "amber", name: "Oybek Toshmatov", id: "#518290", tag: "Mobil mijoz", msg: "To‘lov cheki qayerda ko‘rinadi?", time: "11:15", unread: 0, assigned: "Superadmin" },
      { av: "BJ", clr: "violet", name: "Bahrom Jo‘rayev", id: "#204911", tag: "Zomin · Direktor", msg: "Yangi qishki tariflarni tekshirib bera olasizmi?", time: "Kecha", unread: 0, assigned: "Superadmin" },
    ];
    return shell({
      activeId: "support",
      crumb: "Yordam va jonli chat",
      body: `
        <div class="page-head">
          <div>
            <h1>Yordam va jonli chat (Markaziy qabulxona)</h1>
            <p>Mobil ilovadagi barcha mijoz murojaatlari bevosita Superadminga tushadi — o‘zingiz javob bering yoki aniq sanatoriya xodimiga biriktiring.</p>
          </div>
          <div class="head-actions">
            <span class="badge ok">${ic("CheckCheck")} Telegram Bot sinxron</span>
            <span class="btn primary">${ic("Plus")} Yangi suhbat</span>
          </div>
        </div>

        <div class="messenger-grid">
          <!-- Column 1: Ticket List -->
          <div class="card">
            <div class="card-head" style="flex-direction:column;align-items:stretch;gap:9px">
              <div class="segmented" style="width:100%">
                <span class="seg-item active" style="flex:1;text-align:center">Ochiq (4)</span>
                <span class="seg-item" style="flex:1;text-align:center">Yopilgan (41)</span>
              </div>
              <div class="search-box" style="min-width:0;width:100%;padding:6px 10px">${ic("Search")} <span>Mijoz, #ID yoki bron...</span></div>
            </div>
            <div style="flex:1;overflow:hidden">
              ${threads
                .map(
                  (t) => `
                <div class="chat-item ${t.active ? "active" : ""}">
                  <div class="avatar ${t.clr}">${t.av}${t.active ? '<span class="online-ring"></span>' : ""}</div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
                      <strong style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</strong>
                      <span style="font-size:11px;color:var(--muted)">${t.time}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:5px;margin:2px 0 4px">
                      <span class="id-chip" style="font-size:10px;padding:0.5px 5px">${t.id}</span>
                      <span style="font-size:11px;color:var(--muted)">${t.tag}</span>
                    </div>
                    <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.msg}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                      <span class="badge ${t.assigned === "Superadmin" ? "muted" : "info"}" style="font-size:10.5px;padding:1.5px 7px">${t.assigned}</span>
                      ${t.unread ? `<span class="sb-badge accent">${t.unread}</span>` : ""}
                    </div>
                  </div>
                </div>`
                )
                .join("")}
            </div>
          </div>

          <!-- Column 2: Active Conversation -->
          <div class="card">
            <div class="card-head">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="avatar lg">AR<span class="online-ring"></span></div>
                <div>
                  <div style="display:flex;align-items:center;gap:7px">
                    <strong style="font-size:14.5px">Azizbek Rahimov</strong>
                    <span class="id-chip">#482915</span>
                    <span class="badge ok" style="font-size:10.5px">Onlayn</span>
                  </div>
                  <div class="card-sub">+998 90 123 45 67 · Bron #SH-261184 · Zomin Sog‘lomlik</div>
                </div>
              </div>
              <div style="display:flex;gap:7px">
                <span class="btn soft sm">${ic("UserCheck")} Xodimga biriktirish</span>
                <span class="btn secondary sm">Yopish</span>
              </div>
            </div>

            <div class="card-body" style="display:flex;flex-direction:column;gap:12px;background:var(--canvas);justify-content:space-between">
              <div style="display:flex;flex-direction:column;gap:11px">
                <div style="align-self:center;font-size:11px;font-weight:600;color:var(--muted);padding:3px 11px;border-radius:99px;background:var(--card);border:1px solid var(--border)">Bugun, 27-noyabr</div>

                <div class="chat-bubble in">
                  <strong style="font-size:11.5px;color:var(--accent);display:block;margin-bottom:3px">Azizbek Rahimov (#482915 · Mobil ilova)</strong>
                  Assalomu alaykum! Zomin sanatoriyasiga ertaga ertalab soat 09:00 da yetib borsak, xonaga erta joylashish imkoni bo‘ladimi? Bron raqamim #SH-261184.
                  <div class="meta"><span>14:22</span><span>Ilovadan keldi</span></div>
                </div>

                <div class="chat-bubble out">
                  <strong style="font-size:11.5px;opacity:.9;display:block;margin-bottom:3px">Platforma Superadmini</strong>
                  Vaalaykum assalom, Azizbek! Hozir Zomin sanatoriyasi resepshn xodimi bilan bog‘lanib aniqlaymiz — murojaatingizni sanatoriya qabulxonasiga ham biriktirib qo‘yaman.
                  <div class="meta"><span>14:25</span><span>✓✓ O‘qildi · FCM Push yuborildi</span></div>
                </div>

                <div class="chat-bubble in">
                  Rahmat katta! Javobingizni ilovada kutaman.
                  <div class="meta"><span>14:28</span></div>
                </div>
              </div>

              <div style="display:flex;gap:8px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--card);border:1px solid var(--border-strong)">
                <span class="icon-btn" style="width:34px;height:34px">${ic("Paperclip")}</span>
                <span style="flex:1;color:var(--muted);font-size:13px">Javob yozing (ilovada va FCM push orqali darhol chiqadi)...</span>
                <span class="btn primary sm">${ic("Send")} Yuborish</span>
              </div>
            </div>
          </div>

          <!-- Column 3: Assign to Sanatorium Staff Drawer -->
          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("UserCheck")} Xodimga biriktirish</h3>
                <div class="card-sub">Murojaatni sanatoriya xodimiga yo‘naltirish</div>
              </div>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:11px">
              <div style="padding:10px 12px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-border);font-size:12px">
                <strong>Joriy mas’ul:</strong> Superadmin (O‘zi javob beradi)<br/>
                <span style="color:var(--muted)">Biriktirilganda xodimga 0 ms da In-App, Push va Telegram ogohlantirishi boradi.</span>
              </div>

              <div class="f-field">
                <span class="f-label">Sanatoriya bo‘yicha filtr</span>
                <div class="f-input"><span>Zomin Sog‘lomlik Maskani</span>${ic("ChevronDown")}</div>
              </div>

              <div class="f-field">
                <span class="f-label">Mas’ulni tanlang</span>
                <div style="display:flex;flex-direction:column;gap:7px;margin-top:2px">
                  <div style="padding:9px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card-subtle);display:flex;align-items:center;gap:9px">
                    <div class="avatar slate" style="width:28px;height:28px;font-size:11px">SA</div>
                    <div style="flex:1"><strong style="font-size:12.5px;display:block">Superadmin o‘zi javob beradi</strong><span style="font-size:11px;color:var(--muted)">Markaziy nazoratda qoldirish</span></div>
                  </div>
                  <div style="padding:9px 11px;border-radius:10px;border:1.5px solid var(--accent);background:var(--accent-soft);display:flex;align-items:center;gap:9px">
                    <div class="avatar" style="width:28px;height:28px;font-size:11px">BJ</div>
                    <div style="flex:1"><strong style="font-size:12.5px;display:block">Bahrom Jo‘rayev · Direktor</strong><span style="font-size:11px;color:var(--muted)">Zomin · #204911 · ● Onlayn</span></div>
                    <span style="color:var(--accent)">${ic("Check")}</span>
                  </div>
                  <div style="padding:9px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card);display:flex;align-items:center;gap:9px">
                    <div class="avatar blue" style="width:28px;height:28px;font-size:11px">NR</div>
                    <div style="flex:1"><strong style="font-size:12.5px;display:block">Nilufar Rahimova · Resepshn</strong><span style="font-size:11px;color:var(--muted)">Zomin · #502194 · ● Onlayn</span></div>
                  </div>
                </div>
              </div>

              <div class="f-field">
                <span class="f-label">Xodim uchun qisqa izoh</span>
                <div class="f-input" style="align-items:flex-start;min-height:58px;font-size:12px;color:var(--ink-2)">
                  Erta check-in (09:00) imkoniyatini tekshirib, mijozga javob bering.
                </div>
              </div>

              <div style="display:flex;gap:8px;margin-top:auto">
                <span class="btn primary" style="flex:1;justify-content:center">${ic("UserCheck")} Biriktirishni saqlash</span>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 10: ANNOUNCEMENTS & MESSAGES CENTER (NEW!) ==================== */
  function board10() {
    const items = [
      { kind: "MESSAGE", aud: ["🌐 Butun tizim", "ok"], title: "Sihhat.uz ilovasida yangi qishki yo‘llanmalar va 0% komissiya!", dt: "27.11.2026, 10:15", uDel: "1 480 / 1 480", uRead: "1 124 o‘qidi (76%)", pDel: "48 / 48", pRead: "44 o‘qidi · 39 tasdiqladi", pctU: 100, pctP: 100, selected: true },
      { kind: "WARNING", aud: ["🏥 Hamkorlarga", "warn"], title: "Muhim: Bandlik kalendari (Shaxmatka) va E-mehmon tartibi", dt: "25.11.2026, 16:40", uDel: "—", uRead: "Faqat hamkorlar", pDel: "48 / 48", pRead: "48 o‘qidi · 46 tasdiqladi", pctU: 0, pctP: 100 },
      { kind: "MESSAGE", aud: ["📱 Users (Mijozlar)", "info"], title: "Yangi funksiya: «Qaysi dardga davo?» va sherikli koyka-o‘rin", dt: "22.11.2026, 09:00", uDel: "1 445 / 1 445", uRead: "1 210 o‘qidi (84%)", pDel: "—", pRead: "Faqat ilova mijozlari", pctU: 100, pctP: 0 },
    ];
    return shell({
      activeId: "messages",
      crumb: "E’lonlar va xabarlar",
      body: `
        <div class="page-head">
          <div>
            <h1>E’lonlar va xabarlar markazi</h1>
            <p>Ilova foydalanuvchilari (Users) va hamkor sanatoriyalarga 0 ms kechikish bilan e’lon yuborish hamda API yetkazilish nazorati.</p>
          </div>
          <div class="head-actions">
            <span class="btn soft">${ic("CheckCheck")} API yetkazilishni tekshirish</span>
            <span class="btn primary">${ic("Plus")} Yangi e’lon berish</span>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="padding:14px 16px">
            <div class="kpi-top"><span class="kpi-label">Yuborilgan e’lonlar</span><div class="kpi-icon">${ic("Megaphone")}</div></div>
            <div class="kpi-val" style="font-size:21px">18 <small>ta e’lon</small></div>
            <div class="kpi-foot"><span>Kiruvchi: 6 (2 yangi) · Ogohlantirish: 4</span></div>
          </div>
          <div class="kpi-card" style="padding:14px 16px">
            <div class="kpi-top"><span class="kpi-label">Users (Ilova mijozlari)</span><span class="badge ok">100% bordi</span></div>
            <div class="kpi-val" style="font-size:21px">1 480 / 1 480</div>
            <div class="kpi-foot"><span>O‘qilgan: <strong>1 124</strong> (76%) · FCM Push faol</span></div>
          </div>
          <div class="kpi-card" style="padding:14px 16px">
            <div class="kpi-top"><span class="kpi-label">Hamkorlar (Sanatoriyalar)</span><span class="badge ok">100% bordi</span></div>
            <div class="kpi-val" style="font-size:21px">48 / 48</div>
            <div class="kpi-foot"><span>16 sanatoriya · O‘qildi: 44 · Qabul: 39</span></div>
          </div>
          <div class="kpi-card" style="padding:14px 16px">
            <div class="kpi-top"><span class="kpi-label">API Yetkazish Nazorati</span><span class="badge info">IN_APP · TG · FCM</span></div>
            <div style="font-size:12.5px;font-weight:700;color:var(--ok-ink);margin-top:2px">✓ 100% sinxron (0 ms)</div>
            <div class="kpi-foot"><span>Oxirgi verify-delivery: 2 daqiqa oldin</span></div>
          </div>
        </div>

        <div class="grid-side-wide">
          <!-- Left: Sent Announcements List -->
          <div class="card">
            <div class="card-head">
              <div class="segmented">
                <span class="seg-item active">📤 Yuborilgan (18)</span>
                <span class="seg-item">📥 Kiruvchi (6)</span>
              </div>
              <div style="display:flex;gap:7px">
                <span class="select-pill">Auditoriya: Barchasi ${ic("ChevronDown")}</span>
                <div class="search-box" style="min-width:170px;padding:5.5px 9px">${ic("Search")} <span>Qidirish...</span></div>
              </div>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:11px">
              ${items
                .map(
                  (m) => `
                <div style="padding:13px 15px;border-radius:14px;border:1.5px solid ${m.selected ? "var(--accent)" : "var(--border)"};background:${m.selected ? "var(--accent-soft)" : "var(--card-subtle)"}">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
                    <div>
                      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
                        <span class="badge ${m.aud[1]}">${m.aud[0]}</span>
                        ${m.kind === "WARNING" ? '<span class="badge err">⚠️ Ogohlantirish</span>' : ""}
                        <span style="font-size:11.5px;color:var(--muted)">${m.dt}</span>
                      </div>
                      <strong style="font-size:13.5px;color:var(--ink)">${m.title}</strong>
                    </div>
                    <div style="display:flex;gap:5px;flex-shrink:0">
                      <span class="btn secondary xs">Kimga bordi</span>
                      <span class="btn soft xs">${ic("CheckCheck")} Tekshirish</span>
                    </div>
                  </div>
                  <div class="grid-2" style="gap:10px">
                    <div style="padding:8px 10px;border-radius:9px;background:var(--card);border:1px solid var(--border)">
                      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
                        <span style="color:var(--muted)">📱 Users yetkazilishi</span>
                        <strong>${m.uDel}</strong>
                      </div>
                      <div class="bar-track" style="height:5px;margin-bottom:4px"><div class="bar-fill blue" style="width:${m.pctU}%"></div></div>
                      <span style="font-size:11px;color:var(--muted)">${m.uRead}</span>
                    </div>
                    <div style="padding:8px 10px;border-radius:9px;background:var(--card);border:1px solid var(--border)">
                      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
                        <span style="color:var(--muted)">🏥 Hamkorlar yetkazilishi</span>
                        <strong>${m.pDel}</strong>
                      </div>
                      <div class="bar-track" style="height:5px;margin-bottom:4px"><div class="bar-fill" style="width:${m.pctP}%"></div></div>
                      <span style="font-size:11px;color:var(--muted)">${m.pRead}</span>
                    </div>
                  </div>
                </div>`
                )
                .join("")}
            </div>
          </div>

          <!-- Right: Live Composer + Templates + Preview -->
          <div class="card">
            <div class="card-head">
              <div>
                <h3>${ic("Send")} E’lon konstruktori & Preview</h3>
                <div class="card-sub">Tayyor shablonlar va jonli qabul qiluvchilar hisobi</div>
              </div>
              <span class="badge ok">1 528 qabul qiluvchi</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:11px">
              <div>
                <div class="f-label" style="margin-bottom:5px">1. AUDITORIYANI TANLANG</div>
                <div class="segmented" style="width:100%">
                  <span class="seg-item active" style="flex:1;text-align:center">🌐 Butun tizim</span>
                  <span class="seg-item" style="flex:1;text-align:center">📱 Users</span>
                  <span class="seg-item" style="flex:1;text-align:center">🏥 Hamkorlar</span>
                </div>
              </div>

              <div>
                <div class="f-label" style="margin-bottom:5px">2. TEZKOR SHABLONLAR</div>
                <div class="chip-wrap">
                  <span class="tag-chip active">📱 Mavsumiy chegirma</span>
                  <span class="tag-chip">🏥 Shaxmatka yangilash</span>
                  <span class="tag-chip">⚠️ Muhim ogohlantirish</span>
                </div>
              </div>

              <div class="f-field">
                <span class="f-label">Sarlavha *</span>
                <div class="f-input"><span>Sihhat.uz ilovasida qishki yo‘llanmalar ochildi!</span></div>
              </div>

              <div class="f-field">
                <span class="f-label">Matn *</span>
                <div class="f-input" style="font-size:12px;line-height:1.45;color:var(--ink-2)">
                  Hurmatli foydalanuvchi! O‘zbekistonning eng sara sanatoriyalariga 0% komissiya bilan onlayn bron qiling.
                </div>
              </div>

              <!-- Live Notification Preview Box -->
              <div style="padding:11px 13px;border-radius:12px;background:var(--card-subtle);border:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span class="f-label">JONLI PREVIEW (MOBIL PUSH + VEB)</span>
                  <span class="badge info" style="font-size:10px">FCM + In-App</span>
                </div>
                <div style="display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border-radius:10px;background:var(--card);border:1px solid var(--border)">
                  <div class="sb-logo" style="width:30px;height:30px;border-radius:8px"><img src="${LOGO}" alt="" /></div>
                  <div>
                    <strong style="font-size:12.5px;display:block">Sihhat.uz · Yangi e’lon</strong>
                    <span style="font-size:11.5px;color:var(--muted)">Sihhat.uz ilovasida qishki yo‘llanmalar ochildi!</span>
                  </div>
                </div>
              </div>

              <span class="btn primary" style="justify-content:center;margin-top:auto">${ic("Send")} E’lonni yuborish (1 480 user + 48 hamkor)</span>
            </div>
          </div>
        </div>
      `,
    });
  }

  /* ==================== BOARD 11: AUDIT, AUTH HISTORY (DEVICE & IP) & SECURITY ==================== */
  function board11() {
    const events = [
      { tm: "27.11, 14:32", user: "Sardor Alimov", id: "#100001", kind: "Superadmin · Platforma", ev: ["Kirish", "ok", "LogIn"], meth: "Login / Parol", dev: "Chrome 131 · Windows 11", ch: "Veb panel", mob: false, ip: "185.139.138.42" },
      { tm: "27.11, 14:18", user: "Azizbek Rahimov", id: "#482915", kind: "Ilova mijozi · Mobil ilova", ev: ["Kirish", "ok", "LogIn"], meth: "Email OTP", dev: "Samsung SM-A165F", ch: "Android 15 · Ilova", mob: true, ip: "94.158.52.104" },
      { tm: "27.11, 13:45", user: "Bahrom Jo‘rayev", id: "#204911", kind: "Direktor · Zomin Sog‘lomlik", ev: ["Kirish", "ok", "LogIn"], meth: "Login / Parol", dev: "Safari 18 · macOS", ch: "Veb panel", mob: false, ip: "84.54.71.19" },
      { tm: "27.11, 12:10", user: "Malika Sobirova", id: "#519042", kind: "Resepshn · Chimyon", ev: ["Sessiya yopildi", "warn", "ShieldAlert"], meth: "Superadmin yopdi", dev: "Edge · Windows 10", ch: "Veb panel", mob: false, ip: "195.158.12.77" },
      { tm: "27.11, 10:05", user: "Chortoq Shifo", id: "Audit", kind: "Hamkor arizasi tasdiqlandi", ev: ["Tizim amali", "info", "Check"], meth: "partner.approved", dev: "Superadmin paneli", ch: "Sardor Alimov", mob: false, ip: "185.139.138.42" },
    ];
    return shell({
      activeId: "audit",
      crumb: "Amallar tarixi va Xavfsizlik",
      body: `
        <div class="page-head">
          <div>
            <h1>Amallar tarixi, Kirish-chiqish (Qurilma & IP) va Xavfsizlik</h1>
            <p>Barcha hisoblar (Superadmin, Hamkor, Mobil mijoz) kirish-chiqish qurilmasi, IP manzili, tizim amallari hamda Telegram Bot holati.</p>
          </div>
          <div class="head-actions">
            <div class="segmented">
              <span class="seg-item active">Barchasi</span>
              <span class="seg-item">Kirish-chiqish (Qurilma & IP)</span>
              <span class="seg-item">Tizim amallari</span>
            </div>
          </div>
        </div>

        <div class="filter-bar">
          <div style="display:flex;gap:8px;align-items:center">
            <div class="search-box">${ic("Search")} <span>Ism, #ID, @username, IP yoki qurilma...</span></div>
            <span class="select-pill">Hisob turi: Barchasi ${ic("ChevronDown")}</span>
            <span class="select-pill">Sanatoriya: Barchasi / Platforma ${ic("ChevronDown")}</span>
            <span class="select-pill">Hodisa: Barchasi ${ic("ChevronDown")}</span>
          </div>
          <span class="btn secondary sm">${ic("RefreshCw")} Yangilash</span>
        </div>

        <div class="grid-main-side">
          <div class="card">
            <div class="card-head">
              <h3>${ic("ShieldCheck")} Kirish-chiqish va Audit jurnali</h3>
              <span class="badge ok">Jonli sinxronizatsiya</span>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>Hisob & Sanatoriya</th>
                    <th>Hodisa</th>
                    <th>Qurilma</th>
                    <th>IP manzil</th>
                  </tr>
                </thead>
                <tbody>
                  ${events
                    .map(
                      (e) => `
                    <tr>
                      <td style="white-space:nowrap;font-weight:600;font-size:12.5px">${e.tm}</td>
                      <td>
                        <div class="cell-main">${e.user} <span class="id-chip">${e.id}</span></div>
                        <span class="cell-sub">${e.kind}</span>
                      </td>
                      <td>
                        <span class="badge ${e.ev[1]}">${ic(e.ev[2])} ${e.ev[0]}</span>
                        <span class="cell-sub">${e.meth}</span>
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:7px">
                          <span style="color:var(--accent)">${ic(e.mob ? "Smartphone" : "Laptop")}</span>
                          <div>
                            <div style="font-size:12.5px;font-weight:600;white-space:nowrap">${e.dev}</div>
                            <span class="cell-sub">${e.ch}</span>
                          </div>
                        </div>
                      </td>
                      <td><span class="ip-chip">${ic("Globe")} ${e.ip}</span></td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Column: Telegram Bot + Account Security + Mobile Preview -->
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="card">
              <div class="card-head">
                <h3>${ic("Mail")} Telegram Bot & Xavfsizlik</h3>
                <span class="badge ok">Bog‘langan</span>
              </div>
              <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
                <div class="kv-row" style="padding:8px 11px"><span class="kv-row-l">Bot manzili</span><strong>@sihhat_admins_bot</strong></div>
                <div class="kv-row" style="padding:8px 11px"><span class="kv-row-l">Email ogohlantirish</span><strong>admin@sihhat.uz</strong></div>
                <div class="kv-row" style="padding:8px 11px"><span class="kv-row-l">Faol qurilmalaringiz</span><strong>2 ta (Joriy + iPhone)</strong></div>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <span class="btn soft sm" style="flex:1;justify-content:center">Mening hisobim</span>
                  <span class="btn danger sm">Boshqalarni yopish</span>
                </div>
              </div>
            </div>

            <!-- Mobile Responsive Superadmin Preview -->
            <div class="card" style="flex:1">
              <div class="card-head">
                <h3>${ic("Smartphone")} Mobil ekran mosligi (≤760px)</h3>
                <span class="badge info">Responsive</span>
              </div>
              <div class="card-body" style="display:flex;gap:14px;align-items:center">
                <div class="phone-frame" style="width:196px;border-width:4px;border-radius:22px;flex-shrink:0">
                  <div style="padding:9px 11px;background:var(--sidebar);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
                    <span style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12px">${ic("Menu")} sihhat<span style="color:var(--accent)">.uz</span></span>
                    <span class="avatar" style="width:22px;height:22px;font-size:9px">SA</span>
                  </div>
                  <div style="padding:9px;display:flex;flex-direction:column;gap:7px;background:var(--canvas)">
                    <div style="padding:8px 10px;border-radius:10px;background:var(--card);border:1px solid var(--border)">
                      <span style="font-size:10px;color:var(--muted)">To‘langan bronlar</span>
                      <div style="font-family:Manrope;font-size:16px;font-weight:800">142 <span style="font-size:10px;color:var(--ok-ink)">▲ +18%</span></div>
                    </div>
                    <div style="padding:8px 10px;border-radius:10px;background:var(--warn-bg);border:1px solid var(--warn-border);font-size:10.5px;font-weight:600;color:var(--warn-ink)">
                      3 ta yangi hamkor arizasi →
                    </div>
                    <div style="padding:8px 10px;border-radius:10px;background:var(--card);border:1px solid var(--border);font-size:10.5px">
                      <strong>4 ta ochiq yordam chati</strong>
                      <div style="color:var(--muted);font-size:10px">Azizbek · #482915</div>
                    </div>
                  </div>
                </div>
                <div style="font-size:12px;color:var(--muted);line-height:1.55">
                  <strong style="color:var(--ink);display:block;margin-bottom:5px">Telefonlarda ham qulay:</strong>
                  • Yon menyu ustma-ust chiqmaydi (z-index 50 > scrim 40)<br/>
                  • Jadvallar ixcham kartalarga aylanadi<br/>
                  • 1 barmoqda tasdiqlash va chat javoblari
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  const BOARDS = {
    "00-superadmin-dizayn-tizimi": { theme: "light", render: board00 },
    "01-superadmin-kirish": { theme: "light", render: board01 },
    "02-superadmin-bosh-sahifa-kunduzgi": {
      theme: "light",
      render: () => shell({ activeId: "dashboard", crumb: "Umumiy ko‘rinish (Kunduzgi)", dark: false, body: dashboardBody(false) }),
    },
    "03-superadmin-bosh-sahifa-tungi": {
      theme: "dark",
      render: () => shell({ activeId: "dashboard", crumb: "Umumiy ko‘rinish (Tungi rejim)", dark: true, body: dashboardBody(true) }),
    },
    "04-superadmin-sanatoriyalar-va-mashhur": { theme: "light", render: board04 },
    "05-superadmin-hamkor-arizalari": { theme: "light", render: board05 },
    "06-superadmin-bronlar-va-bugungi-ishlar": { theme: "light", render: board06 },
    "07-superadmin-jamoa-va-ilova-foydalanuvchilari": { theme: "light", render: board07 },
    "08-superadmin-moliya-va-reklama": { theme: "light", render: board08 },
    "09-superadmin-yordam-jonli-chat-biriktirish": { theme: "light", render: board09 },
    "10-superadmin-elonlar-va-xabarlar-markazi": { theme: "light", render: board10 },
    "11-superadmin-amallar-tarixi-va-xavfsizlik": { theme: "light", render: board11 },
  };

  function boot() {
    const params = new URLSearchParams(location.search);
    const id = params.get("board") || "02-superadmin-bosh-sahifa-kunduzgi";
    const def = BOARDS[id] || BOARDS["02-superadmin-bosh-sahifa-kunduzgi"];
    document.documentElement.setAttribute("data-theme", def.theme);
    const stage = document.getElementById("stage");
    stage.innerHTML = def.render();
    document.body.setAttribute("data-ready", "true");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
