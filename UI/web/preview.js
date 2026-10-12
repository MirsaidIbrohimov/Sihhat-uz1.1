(() => {
  "use strict";
  const screens = window.WEB_SCREENS;
  const d = window.WEB_SAMPLE;
  const params = new URLSearchParams(location.search);
  let screen = screens.find((s) => s.id === params.get("screen")) ?? screens[2];
  let theme = params.get("theme") ?? screen.theme ?? "light";
  let inventoryTab = "calendar";
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const icon = (name, cls = "") =>
    `<span class="icon ${cls}">${window.WEB_ICONS[name] ?? window.WEB_ICONS.CircleHelp}</span>`;
  const labels = {
    ACTIVE: "Faol",
    PAUSED: "To‘xtatilgan",
    APPROVED: "Tasdiqlangan",
    SUBMITTED: "Tekshiruvda",
    PENDING_APPROVAL: "Tasdiq kutilmoqda",
    DIRECTOR: "Direktor",
    RECEPTION: "Qabulxona",
    ACCOUNTANT: "Hisobchi",
    CONFIRMED: "Tasdiqlangan",
    CHECKED_IN: "Joylashgan",
    CHECKED_OUT: "Yakunlangan",
    HOLD: "To‘lov kutilmoqda",
    CANCELLED: "Bekor qilingan",
    APP: "Ilova",
    MANUAL: "Telefon / joyida",
    SUCCEEDED: "To‘langan",
    PENDING: "Kutilmoqda",
    IN_TRANSIT: "Bankka yuborilgan",
    PAID: "To‘langan",
    REQUESTED: "So‘ralgan",
    UNPAID: "To‘lanmagan",
    DRAFT: "Qoralama",
    PUBLISHED: "E’lon qilingan",
    OPEN: "Ochiq",
    CLOSED: "Yopilgan",
    ASSIGNED: "Biriktirilgan",
    ACCEPTED: "Qabul qilingan",
    COMPLETED: "Bajarilgan",
    LIVE: "Ilovada chiqmoqda",
    WAITING_APPROVAL: "Tasdiq kutilmoqda",
  };
  const tag = (value, color) => {
    const tone =
      color ??
      ([
        "ACTIVE",
        "APPROVED",
        "CONFIRMED",
        "CHECKED_OUT",
        "SUCCEEDED",
        "PAID",
        "PUBLISHED",
        "LIVE",
        "COMPLETED",
      ].includes(value)
        ? "green"
        : [
              "HOLD",
              "PENDING",
              "UNPAID",
              "REQUESTED",
              "SUBMITTED",
              "PENDING_APPROVAL",
              "WAITING_APPROVAL",
              "ASSIGNED",
            ].includes(value)
          ? "amber"
          : ["CANCELLED"].includes(value)
            ? "red"
            : ["CHECKED_IN", "IN_TRANSIT", "ACCEPTED"].includes(value)
              ? "blue"
              : "");
    return `<span class="tag ${tone}"><i class="dot"></i>${esc(labels[value] ?? value)}</span>`;
  };
  const money = (minor) =>
    `${(Number(minor ?? 0) / 100).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} so‘m`;
  const date = (value) =>
    String(value).slice(0, 10).split("-").reverse().join(".");
  const button = (
    text,
    name = "Plus",
    action = "sample",
    tone = "primary",
    attrs = "",
  ) =>
    `<button type="button" class="button ${tone}" data-action="${action}" ${attrs}>${icon(name)}<span>${esc(text)}</span></button>`;
  const iconButton = (name, title, action, cls = "") =>
    `<button type="button" class="icon-button ${cls}" aria-label="${esc(title)}" title="${esc(title)}" data-action="${action}">${icon(name)}</button>`;
  const heading = (title, subtitle, actions = "") =>
    `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions}</div>`;
  const card = (title, body, aside = "", subtitle = "", cls = "") =>
    `<section class="card ${cls}"><div class="card-head"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${aside}</div>${body}</section>`;
  const note = (text, tone = "", name = "Info") =>
    `<div class="note ${tone}">${icon(name)}<p>${esc(text)}</p></div>`;
  const actions = (body) => `<div class="actions">${body}</div>`;
  const link = (text, action = "sample", name = "ArrowUpRight") =>
    `<button class="text-button" data-action="${action}">${esc(text)}${icon(name)}</button>`;
  const pager = (n) =>
    `<div class="pager"><span>${n} ta yozuv · 1 / 1 sahifa</span><div class="flex">${iconButton("ChevronLeft", "Oldingi sahifa", "sample")}${iconButton("ChevronRight", "Keyingi sahifa", "sample")}</div></div>`;
  const table = (
    headers,
    rows,
    title,
    cls = "",
    toolbarActions = "",
    footer = true,
  ) =>
    `<section class="card ${cls}"><div class="toolbar"><span class="toolbar-title">${esc(title)}<span class="count">${rows.length}</span></span>${toolbarActions || iconButton("RefreshCw", "Yangilash", "refresh")}</div><div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, i) => `<td data-label="${esc(headers[i])}">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${footer ? pager(rows.length) : ""}</section>`;
  const period = () =>
    `<div class="period">${icon("CalendarDays")}<input aria-label="Davr boshi" type="date" value="2026-10-01"><span>—</span><input aria-label="Davr oxiri" type="date" value="2026-11-01"><select aria-label="Hisob mezoni"><option>Yashash davri</option><option>Yaratilgan sana</option><option>To‘langan sana</option></select></div>`;
  const metric = (title, value, detail, name, highlight = false, unit = "") =>
    `<section class="metric ${highlight ? "highlight" : ""}"><div class="metric-top">${esc(title)}<span class="metric-icon">${icon(name)}</span></div><div class="metric-value">${esc(value)}${unit ? `<span class="unit">${esc(unit)}</span>` : ""}</div><p>${esc(detail)}</p></section>`;
  const balance = (rows) =>
    `<div class="card-body">${rows.map(([label, value, name]) => `<div class="balance-row"><span class="label">${name ? icon(name) : ""}${esc(label)}</span><strong class="money">${esc(money(value))}</strong></div>`).join("")}</div>`;
  const chart = () =>
    card(
      "Bronlar holati",
      `<div class="chart"><div class="bar-chart">${Object.entries(
        d.report.booking_statuses,
      )
        .map(
          ([status, count]) =>
            `<div class="bar-col"><strong>${count}</strong><div class="bar" style="height:${Math.max(10, (count / 28) * 135)}px"></div></div>`,
        )
        .join("")}</div><div class="chart-labels">${Object.keys(
        d.report.booking_statuses,
      )
        .map((status) => `<span>${labels[status]}</span>`)
        .join(
          "",
        )}</div></div><div class="chart-footer"><span>Yashash davri bo‘yicha</span><strong>Jami 41 ta bron</strong></div>`,
      tag("01–31 oktabr", ""),
      "Tanlangan davrga tegishli bronlar",
    );
  function dashboard() {
    if (screen.role === "accountant") return accounting();
    const admin = screen.role === "admin";
    return (
      heading(
        admin ? "Platforma ko‘rsatkichlari" : "Bugungi ishlar, bir qarashda",
        admin
          ? "Bron aylanmasi va platforma daromadi alohida hisoblanadi."
          : "Chimyon sanatoriyasi · bronlar, bandlik va hisob-kitob.",
        period(),
      ) +
      `<div class="metrics">${metric("Bronlar", "41", "Yashash davri bo‘yicha", "BookOpen")}${metric("Xonalar bandligi", "61,7%", "370 / 600 xona-tun", "BedDouble")}${metric("Bron aylanmasi", "54 900 000", "Onlayn to‘lovlar (GMV)", "CreditCard", false, "so‘m")}${metric(admin ? "Platforma daromadi" : "Sanatoriyaga qarzdorlik", admin ? "6 400 000" : "2 800 000", admin ? "Abonent va reklama xizmatlari" : "Davr oxirigacha qoldiq", "Coins", true, "so‘m")}</div>` +
      `<div class="grid-two">${chart()}${card(
        "Hisob-kitob qoldiqlari",
        balance([
          ["Sof onlayn tushum", d.report.net_online_receipts, "CreditCard"],
          ["Mijozga qaytarilgan", d.report.refunds, "Wallet"],
          ["Refund majburiyati", d.report.refund_payable, "Clock"],
          ["Bankka yuborilayotgan", d.report.payout_in_transit, "ArrowUpRight"],
          ["Undiriladigan summa", d.report.receivable, "FileText"],
        ]),
        "",
        "Davr oxirigacha hisoblangan",
      )}</div>` +
      (admin
        ? `<div class="grid-two">${card("AI sarfi", `<div class="card-body"><div class="flex space"><div><strong style="font-size:23px">86</strong><p class="small muted">so‘rov</p></div><div><strong>25 800</strong><p class="small muted">kirish tokeni</p></div><div><strong>6 400</strong><p class="small muted">chiqish tokeni</p></div></div><p class="small muted mt">Provayder hisoboti kelgach, haqiqiy xarajat aniqlanadi.</p></div>`, icon("Sparkles"))}${card("Hisobotni yuklash", `<div class="card-body"><p class="small muted">Tanlangan davr bo‘yicha CSV nusxasini saqlang.</p><div class="mt">${button("CSV hisobot", "Download", "sample", "soft")}</div></div>`, icon("FileSpreadsheet"))}</div>`
        : `<div class="mb">${note("Ketish kuni keyingi bron uchun ochiq. Davrning oxirgi sanasi hisobotga kirmaydi; vaqt Asia/Tashkent bo‘yicha.")}</div>`)
    );
  }
  function sanatoriums() {
    return (
      heading(
        "Sanatoriyalar",
        "Faol profillarni boshqaring va Bosh sahifa uchun mashhur sanatoriyalarni belgilang.",
        actions(button("Yangi sanatoriya", "Plus", "create-sanatorium")),
      ) +
      `<div class="mb">${note("Mashhur tanlovi: faqat faol va e’lon qilingan sanatoriyalar ko‘rinadi. Reklama tugaganda tanlangan ro‘yxat shu joyga qaytadi.", "", "Star")}</div>` +
      table(
        ["Sanatoriya", "Holat", "Mashhur", "Profil", "Onlayn bron", "Amallar"],
        d.sanatoriums.map((s) => [
          `<div class="person-cell"><span class="figure">${icon("Building2")}</span><span><strong>${esc(s.name)}</strong><small>${esc(s.region)}</small></span></div>`,
          tag(s.status),
          `<label class="check-choice"><input type="checkbox" aria-label="Mashhur sanatoriya: ${esc(s.name)}" ${s.featured ? "checked" : ""}><span>Bosh sahifada</span></label>`,
          tag(s.revision),
          `<span class="flex small">${icon(s.ready ? "CircleCheck" : "LockKeyhole")}${s.ready ? "Ochiq" : "Yopiq"}</span>`,
          `<div class="table-actions">${link("Profil", "go-profile")}${iconButton("Ellipsis", `${s.name}: boshqa amallar`, "sanatorium-options")}</div>`,
        ]),
        "Barcha sanatoriyalar",
      )
    );
  }
  function bookingRows(rows = d.bookings) {
    return rows.map((b) => [
      `<strong>${esc(b.reference)}</strong><small>${esc(labels[b.source])}</small>`,
      `<strong>${esc(b.name)}</strong><small>${esc(b.phone)}</small>`,
      `${date(b.checkIn)} — ${date(b.checkOut)}`,
      `<strong class="money">${money(b.amount)}</strong>`,
      tag(b.status),
      link("Ochish", "go-booking-detail"),
    ]);
  }
  function bookings() {
    return (
      heading(
        "Bronlar",
        "Ilova, telefon va joyida yaratilgan bronlar bir ro‘yxatda.",
        actions(button("Qo‘lda bron", "Plus", "manual-booking")),
      ) +
      table(
        ["Bron", "Mehmon", "Yashash", "Summa", "Holat", "Amal"],
        bookingRows(),
        "Bronlar ro‘yxati",
        "booking-table",
        `<div class="actions"><select aria-label="Bron holati" id="booking-status"><option value="">Barcha holatlar</option>${["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "HOLD", "CANCELLED"].map((v) => `<option value="${v}">${labels[v]}</option>`).join("")}</select>${iconButton("RefreshCw", "Ro‘yxatni yangilash", "refresh")}</div>`,
      )
    );
  }
  function bookingDetail() {
    return (
      heading(
        "BR-NAMUNA-001",
        "Mehmon A. · 10–13 oktabr 2026",
        actions(button("Bronlarga qaytish", "ArrowLeft", "go-bookings", "")),
      ) +
      `<div class="grid-two">${card("Bron ma’lumotlari", `<div class="card-body"><dl class="info-grid"><div><dt>Mehmon</dt><dd>Mehmon A.</dd></div><div><dt>Telefon</dt><dd>+998 ** *** ** **</dd></div><div><dt>Sanatoriya</dt><dd>Chimyon</dd></div><div><dt>Manba</dt><dd>Ilova</dd></div><div><dt>Joylashish</dt><dd>10.10.2026 · 14:00</dd></div><div><dt>Ketish</dt><dd>13.10.2026 · 12:00</dd></div><div><dt>Xona</dt><dd>101 · Standart</dd></div><div><dt>Mehmonlar</dt><dd>2 katta · 0 bola</dd></div></dl><div class="mt">${note("Mehmon hujjatini qabulxonada tekshiring. Joylashtirish xona bandligini yangilaydi.", "", "ShieldCheck")}</div><div class="mt">${actions(button("Mehmonni joylashtirish", "CircleCheck", "sample") + button("Xonani almashtirish", "BedDouble", "sample", ""))}</div></div>`, tag("CONFIRMED"))}${card(
        "To‘lov va summa",
        balance([
          ["Jami bron", "90000000", "BookOpen"],
          ["Onlayn to‘langan", "90000000", "CreditCard"],
          ["Qolgan summa", "0", "Wallet"],
        ]) +
          `<div class="card-body"><div class="note">${icon("CircleCheck")}<p>To‘lov tasdiqlangan. Holat provayder tasdig‘i bilan yangilanadi.</p></div></div>`,
        tag("SUCCEEDED"),
      )}</div>` +
      `<div class="grid-two">${card("Bron tarixi", `<div class="card-body"><div class="timeline"><div class="timeline-item"><strong>Bron tasdiqlandi</strong><p>10.10.2026 · 10:00 · Onlayn to‘lov qabul qilindi.</p></div><div class="timeline-item"><strong>To‘lov kutilgan</strong><p>10.10.2026 · 09:57 · Xona vaqtincha band qilindi.</p></div><div class="timeline-item"><strong>Bron yaratildi</strong><p>10.10.2026 · 09:55 · Ilova orqali.</p></div></div></div>`, icon("History"))}${card("Joyida to‘lovlar", `<div class="empty"><span class="figure">${icon("Wallet")}</span><h2>Joyida to‘lov qaydi yo‘q</h2><p>Naqd yoki terminal to‘lovi bo‘lsa, alohida qayd etiladi.</p>${button("To‘lovni qayd etish", "Plus", "sample", "")}</div>`)}</div>`
    );
  }
  function inventory() {
    const tabs = [
      ["calendar", "Bandlik taqvimi"],
      ["types", "Xona turlari"],
      ["rooms", "Xonalar"],
      ["rates", "Tariflar"],
      ["discounts", "Chegirmalar"],
    ];
    const nav = `<div class="tabs" role="tablist">${tabs.map(([id, title]) => `<button role="tab" aria-selected="${inventoryTab === id}" class="${inventoryTab === id ? "active" : ""}" data-tab="${id}">${title}</button>`).join("")}</div>`;
    let body;
    if (inventoryTab === "calendar")
      body = card(
        "10–23 oktabr 2026",
        `<div class="calendar"><table><thead><tr><th>Xona</th>${Array.from({ length: 14 }, (_, i) => `<th>${i + 10}<small class="muted"> okt</small></th>`).join("")}</tr></thead><tbody>${d.rooms
          .map(
            (room, r) =>
              `<tr><td><strong>${room}</strong><small class="muted">Standart</small></td>${Array.from(
                { length: 14 },
                (_, i) => {
                  const booked = r < 3 && i >= r && i < r + 3;
                  const held = r === 3 && i >= 3 && i < 6;
                  const repair = r === 4 && i >= 4 && i < 7;
                  return `<td><span class="calendar-cell ${booked ? "booked" : held ? "held" : repair ? "maintenance" : ""}" title="${booked ? "Band" : held ? "To‘lov kutilmoqda" : repair ? "Ta’mir" : "Bo‘sh"}">${booked ? "B" : held ? "K" : repair ? "T" : "·"}</span></td>`;
                },
              ).join("")}</tr>`,
          )
          .join(
            "",
          )}</tbody></table></div><div class="calendar-legend"><span><i></i>B — band</span><span><i style="background:#ffe8b6"></i>K — to‘lov kutilmoqda</span><span><i style="background:#e3e8e5"></i>T — ta’mir</span><span><i style="background:var(--bg)"></i>Bo‘sh</span></div>`,
        actions(
          button("Ta’mirga yopish", "LockKeyhole", "sample", "") +
            iconButton("ChevronLeft", "Oldingi davr", "sample") +
            iconButton("ChevronRight", "Keyingi davr", "sample"),
        ),
      );
    else if (inventoryTab === "rates")
      body = table(
        ["Tarif", "Xona turi", "Hisob", "Bir tun", "Holat"],
        [
          [
            "<strong>Standart paket</strong><small>3 mahal ovqat · Hovuz</small>",
            "Standart",
            "Butun xona",
            money("45000000"),
            tag("ACTIVE"),
          ],
        ],
        "Asosiy tariflar",
      );
    else if (inventoryTab === "rooms")
      body = table(
        ["Xona", "Xona turi", "Holat"],
        d.rooms.map((r) => [
          `<strong>${r}</strong>`,
          "Standart",
          tag("ACTIVE"),
        ]),
        "Fizik xonalar",
      );
    else if (inventoryTab === "types")
      body = table(
        ["Xona turi", "Jami sig‘im", "Kattalar", "Bolalar"],
        [["<strong>Standart</strong>", "2", "2", "1"]],
        "Xona turlari",
      );
    else
      body = card(
        "Chegirmalar",
        `<div class="empty"><span class="figure">${icon("Wallet")}</span><h2>Chegirma belgilanmagan</h2><p>Chegirma qo‘shilganda miqdori va amal qilish davri shu yerda ko‘rinadi.</p>${button("Chegirma qo‘shish", "Plus", "sample", "soft")}</div>`,
      );
    return (
      heading(
        "Xonalar va tariflar",
        "Bandlik, fizik xonalar va narxlar bir joyda.",
        actions(button("Xona qo‘shish", "Plus", "create-room")),
      ) +
      nav +
      body
    );
  }
  function profile(edit = false) {
    if (edit)
      return (
        heading(
          "Profilni tahrirlash",
          "Qoralamani saqlang, keyin tekshiruvga yuboring.",
          actions(button("Profilga qaytish", "ArrowLeft", "go-profile", "")),
        ) +
        `<div class="progress-steps">${["Asosiy ma’lumot", "Sharoitlar", "Kelish qoidalari", "Rasmlar va hujjatlar"].map((t, i) => `<span class="step ${i === 0 ? "active" : ""}"><b>${i + 1}</b>${t}</span>`).join("")}</div>` +
        card(
          "Asosiy ma’lumotlar",
          `<div class="card-body padded"><div class="form-grid">${field("Sanatoriya nomi", "Chimyon")}${field("Yuridik nom", "Sanatoriya")}${field("Hudud", "Farg‘ona")}${field("Aloqa telefoni", "+998 ** *** ** **")}${field("Manzil", "Tog‘ hududi", "text", true)}${field("Tavsif", "Tog‘ bag‘rida dam olish va sog‘lomlashtirish maskani. Tabiat, qulay xonalar va mehmonlarga e’tibor.", "textarea", true)}${field("Joylashish vaqti", "14:00", "time")}${field("Ketish vaqti", "12:00", "time")}</div></div><div class="form-foot">${button("Qoralamani saqlash", "Check", "sample", "")}${button("Davom etish", "ArrowRight", "sample")}</div>`,
        )
      );
    return (
      heading(
        "Sanatoriya profili",
        "Nashrdagi profil yangi tahrir tasdiqlanguncha saqlanadi.",
        actions(button("Tahrirlash", "NotebookPen", "go-profile-edit")),
      ) +
      `<div class="tabs"><button class="active">Profil</button><button data-action="profile-files">Rasmlar va hujjatlar</button><button data-action="profile-bank">Bank ma’lumotlari</button></div><section class="card"><div class="profile-banner"><div><h2>Chimyon</h2><p class="flex">${icon("MapPin")}Farg‘ona · Tog‘ hududi</p></div>${tag("APPROVED")}</div><div class="profile-info"><div><h2>Sanatoriya haqida</h2><p>Tog‘ bag‘rida dam olish va sog‘lomlashtirish maskani. Tabiat, qulay xonalar va mehmonlarga e’tibor.</p><h3 class="small mb">Sharoit va xizmatlar</h3><div class="service-tags"><span>${icon("Wifi")}Wi-Fi</span><span>${icon("Waves")}Hovuz</span><span>${icon("Car")}Avtoturargoh</span><span>${icon("Utensils")}3 mahal ovqat</span></div></div><dl class="info-grid"><div><dt>Joylashish</dt><dd>14:00</dd></div><div><dt>Ketish</dt><dd>12:00</dd></div><div><dt>Telefon</dt><dd>+998 ** *** ** **</dd></div><div><dt>Onlayn bron</dt><dd>${tag("Ochiq", "green")}</dd></div><div><dt>Profil holati</dt><dd>E’lon qilingan</dd></div><div><dt>Hudud</dt><dd>Farg‘ona</dd></div></dl></div></section><div class="mt">${note("Xaritadagi manzil, kelish talablari va rasmlar profil tekshiruvida tasdiqlanadi.", "", "ShieldCheck")}</div>`
    );
  }
  function field(label, value = "", type = "text", wide = false) {
    return `<label class="field ${wide ? "wide" : ""}"><span>${esc(label)}</span>${type === "textarea" ? `<textarea>${esc(value)}</textarea>` : `<input type="${type}" value="${esc(value)}">`}</label>`;
  }
  function staff() {
    const admin = screen.role === "admin";
    return (
      heading(
        "Jamoa va ruxsatlar",
        admin
          ? "Xodimlarni tasdiqlang va vakolatlarini boshqaring."
          : "Xodim roli va uning joriy ruxsatlari alohida boshqariladi.",
        actions(
          (admin
            ? button("Direktor tayinlash", "Users", "invite-staff", "")
            : "") + button("Xodim taklif qilish", "Plus", "invite-staff"),
        ),
      ) +
      (admin
        ? `<div class="mb">${note("1 ta yangi xodim taklifi tasdiq kutmoqda.", "amber", "Clock")}</div>`
        : "") +
      table(
        ["Xodim", "Lavozim", "Holat", "Vakolatlar", "Amallar"],
        d.staff.map((s, i) => [
          `<div class="person-cell"><span class="avatar ${i === 2 ? "blue" : ""}">${icon(i === 2 ? "Coins" : "Users")}</span><span><strong>${esc(s.name)}</strong><small>+998 ** *** ** **</small></span></div>`,
          tag(labels[s.role], s.role === "ACCOUNTANT" ? "blue" : ""),
          tag(s.status),
          s.role === "ACCOUNTANT"
            ? "Hisobotlarni ko‘rish va yuklash"
            : s.role === "DIRECTOR"
              ? "Sanatoriya boshqaruvi"
              : "Qabulxona ishlari",
          s.status === "PENDING_APPROVAL" && admin
            ? actions(
                button("Tasdiqlash", "Check", "sample", "soft") +
                  iconButton("X", "Rad etish", "sample"),
              )
            : link("Ruxsatlar", "permissions", "ShieldCheck"),
        ]),
        "Sanatoriya jamoasi",
      ) +
      `<div class="mt">${note("Hisobchi o‘z sanatoriyasining hisobotlarini ko‘radi va yuklaydi. Yangi xodim superadmin tasdiqlaganidan keyin ishlaydi.", "", "ShieldCheck")}</div>`
    );
  }
  function payments() {
    return (
      heading(
        "Onlayn to‘lovlar",
        "To‘lov holati provayder tasdig‘i bilan belgilanadi.",
      ) +
      `<div class="mb">${note("Tezcheck ulanishi hali sozlanmagan.", "amber", "CreditCard")}</div>` +
      table(
        ["Bron", "Maqsad", "Summa", "Holat", "Yaratilgan", "To‘langan"],
        d.bookings
          .slice(0, 4)
          .map((b, i) => [
            `<strong>${esc(b.reference)}</strong>`,
            "Bron to‘lovi",
            `<strong class="money">${money(b.amount)}</strong>`,
            tag(i === 3 ? "PENDING" : "SUCCEEDED"),
            "10.10.2026",
            i === 3 ? "—" : "10.10.2026",
          ]),
        "To‘lovlar",
      )
    );
  }
  function payouts() {
    return (
      heading(
        "Sanatoriyaga o‘tkazmalar",
        "Yakunlangan va onlayn to‘langan bronlar bo‘yicha hisob-kitob.",
        actions(button("O‘tkazma tayyorlash", "Plus", "sample")),
      ) +
      `<div class="mb">${note("Bankka yuborish va bank natijasini tekshirish alohida amallar. Hisobdagi qoldiq tasdiqdan keyin yangilanadi.", "", "ShieldCheck")}</div>` +
      table(
        [
          "Bank oluvchi",
          "Summa",
          "Holat",
          "Yaratilgan",
          "Bank tasdig‘i",
          "Amal",
        ],
        [
          [
            "<strong>Sanatoriya</strong><small>********************</small>",
            `<strong>${money("120000000")}</strong>`,
            tag("IN_TRANSIT"),
            "10.10.2026",
            "Kutilmoqda",
            link("Bank natijasini tekshirish", "sample"),
          ],
          [
            "<strong>Sanatoriya</strong><small>********************</small>",
            `<strong>${money("4820000000")}</strong>`,
            tag("PAID"),
            "10.10.2026",
            "Dalil mavjud",
            link("Dalilni ko‘rish", "sample"),
          ],
        ],
        "Bank o‘tkazmalari",
      )
    );
  }
  function refunds() {
    return (
      heading(
        "Pulni qaytarish",
        "So‘rov va qaror sababi har bir qaytarishda saqlanadi.",
      ) +
      table(
        ["So‘ralgan", "Summa", "Sabab", "Holat", "Qaror", "Amallar"],
        [
          [
            "10.10.2026",
            `<strong>${money("45000000")}</strong>`,
            "Mehmon sanani o‘zgartirmoqchi.",
            tag("REQUESTED"),
            "Qaror kutilmoqda",
            actions(
              button("Ma’qullash", "Check", "sample", "soft") +
                button("Rad etish", "X", "sample", "danger"),
            ),
          ],
          [
            "10.10.2026",
            `<strong>${money("150000000")}</strong>`,
            "Bron bekor qilindi.",
            tag("Qaytarilgan", "green"),
            "Shart bo‘yicha qaytarildi.",
            "—",
          ],
        ],
        "Qaytarish so‘rovlari",
      ) +
      `<div class="mt">${note("Qaytarish summasi bron yaratilganda saqlangan shart va to‘lov holati asosida belgilanadi.", "", "Wallet")}</div>`
    );
  }
  function billing() {
    return (
      heading(
        "Abonent va hisoblar",
        "Bronlar uchun komissiya — 0%. Platforma xizmatlari alohida hisoblanadi.",
      ) +
      `<div class="tabs"><button class="active">Hisoblar</button><button data-action="billing-plans">Abonent tariflari</button><button data-action="billing-subscriptions">Abonentlar</button><button data-action="billing-policies">Qaytarish shartlari</button></div>` +
      table(
        ["Xizmat", "Davr", "Summa", "Holat", "Amal"],
        d.invoices.map((v) => [
          "<strong>Abonent xizmati</strong>",
          `${date(v.startsAt)} — ${date(v.endsAt)}`,
          `<strong>${money(v.amount)}</strong>`,
          tag(v.status),
          v.status === "UNPAID"
            ? button("To‘lash", "CreditCard", "sample", "soft")
            : "—",
        ]),
        "Hisoblar",
      )
    );
  }
  function ads() {
    return (
      heading(
        "Reklama kampaniyalari",
        "Kampaniya holati, muddati va ilovadagi joylashuvini tekshiring.",
        actions(button("Reklama yaratish", "Plus", "create-ad")),
      ) +
      `<div class="campaign-layout">${card("Kampaniyalar", `<div>${d.ads.map((a) => `<article class="campaign"><div class="flex space"><div class="flex"><span class="figure">${icon("Megaphone")}</span><div><h3>${esc(a.title)}</h3><p class="small muted">${esc(a.sanatorium)}</p></div></div>${tag(a.publication)}</div><p class="small muted mt">${esc(a.text)}</p><div class="campaign-meta"><span>${icon("CalendarDays")}${date(a.startsAt)} — ${date(a.endsAt)}</span><span>${icon("LayoutDashboard")}Bosh sahifa</span></div><div class="campaign-actions">${tag(a.status)}${a.publication === "LIVE" ? link("Tahrirlash", "create-ad", "NotebookPen") : actions(button("Tasdiqlash", "Check", "sample", "soft") + button("Rad etish", "X", "sample", "danger"))}</div></article>`).join("")}</div>`, tag("Barcha sanatoriyalar"))}${card("Ilovadagi ko‘rinish", `<div class="card-body"><div class="phone-preview"><div class="phone-top"><strong>10:00</strong><span>4G · 94%</span></div><div class="phone-brand"><img src="assets/sihhat-logo.jpg" alt="Sihhat uz logosi">Sihhat <span style="color:var(--primary)">uz</span></div><div class="phone-box">Sanatoriya yoki hudud qidiring...</div><div class="phone-hero">Sog‘lom hayot<br>sari bir qadam!</div><div class="phone-ad"><img src="assets/sihhat-logo.jpg" alt="Reklama uchun namunaviy rasm"><h3>Kuzgi dam olish</h3><p>Tabiat bag‘rida sokin hordiq.</p></div><div class="phone-nav">${["LayoutDashboard", "Building2", "CalendarDays", "MessageSquare", "Users"].map((n) => icon(n)).join("")}</div></div><p class="small muted">Reklama mashhur sanatoriyalar joyida chiqadi. Reklama bo‘lmasa tanlangan ro‘yxat qaytadi.</p></div>`, icon("Eye"), "Bosh sahifa joylashuvi", "phone-panel")}</div>`
    );
  }
  function articles() {
    return (
      heading(
        "Yangilik va tavsiyalar",
        "E’lon qilingan maqolalar Android bosh sahifasida ko‘rinadi.",
        actions(button("Maqola yozish", "Plus", "create-article")),
      ) +
      `<div class="list-grid">${d.articles.map((a) => `<article class="card"><div class="article-art ${a.kind === "TIP" ? "blue" : ""}"><div><p class="eyebrow">${a.kind === "NEWS" ? "YANGILIK" : "TAVSIYA"}</p><p class="small" style="margin-top:8px">Sihhat uz</p></div>${icon(a.kind === "NEWS" ? "Leaf" : "NotebookPen", "big-icon")}</div><div class="article-body"><div class="flex space mb">${tag(a.status)}<span class="small muted">${a.publishedAt ? "10.10.2026" : "Qoralama"}</span></div><h2>${esc(a.title)}</h2><p>${esc(a.summary)}</p>${link("Tahrirlash", "create-article", "NotebookPen")}</div></article>`).join("")}</div>`
    );
  }
  function messages(support = false) {
    if (!support)
      return (
        heading(
          "Xabarlar",
          "Tegishli qabul qiluvchilarga yuborilgan xabar va tasdiqlar.",
          actions(button("Xabar yuborish", "Plus", "create-message")),
        ) +
        `<div class="vertical-list"><article class="list-item"><span class="figure">${icon("Mail")}</span><div class="grow"><div class="flex space"><h3>Mavsumga tayyorgarlik</h3>${tag("Yangi", "blue")}</div><p>Xonalar va tariflarning yangilanganini tekshiring.</p><div class="flex space mt"><span class="small muted">10.10.2026 · Qabul qilinmagan</span>${button("Qabul qildim", "Check", "sample", "soft")}</div></div></article></div>`
      );
    return (
      heading(
        "Yordam xizmati",
        "Bron va platforma bo‘yicha murojaatlar.",
        actions(button("Yangi murojaat", "Plus", "create-ticket")),
      ) +
      `<section class="card chat"><div class="chat-list"><button class="active"><strong>Bron sanasini aniqlashtirish</strong><p>10.10.2026 · Ochiq</p></button><button><strong>Xona rasmlarini yangilash</strong><p>10.10.2026 · Yopilgan</p></button></div><div class="chat-panel"><div class="chat-header flex space"><div><h3>Bron sanasini aniqlashtirish</h3><p class="small muted" style="margin-top:5px">Sihhat uz yordam xizmati</p></div>${tag("OPEN", "blue")}</div><div class="chat-body"><p class="chat-date">10 oktabr 2026</p><div class="bubble">Mehmon kelish vaqtini aniqlashtirishni so‘radi. Bron bo‘yicha yordam kerak.<small>Sanatoriya · 09:45</small></div><div class="bubble mine">Bron raqamini tekshiryapmiz. Kelish ma’lumotini aniqlashtirib javob beramiz.<small>Yordam xizmati · 09:52</small></div></div><form class="chat-composer"><textarea aria-label="Javob matni" placeholder="Javob yozing..."></textarea>${button("Yuborish", "Send", "sample")}</form></div></section>`
    );
  }
  function tasks() {
    const rows = [
      {
        title: "Keladigan mehmonlar xonasini tekshirish",
        body: "101–104 xonalarning tayyorligini qayd eting.",
        status: "ASSIGNED",
        date: "10.10.2026 · 17:00",
      },
      {
        title: "Tariflarni yangilash",
        body: "Kelgusi mavsum narxlarini tekshirish.",
        status: "ACCEPTED",
        date: "11.10.2026 · 17:00",
      },
    ];
    return (
      heading(
        "Jamoa vazifalari",
        "Qabul qilish, bajarish va javoblar holati tarixda saqlanadi.",
        actions(button("Vazifa berish", "Plus", "create-task")),
      ) +
      `<div class="vertical-list">${rows.map((t) => `<article class="list-item"><span class="figure">${icon("ClipboardList")}</span><div class="grow"><div class="flex space"><h3>${t.title}</h3>${tag(t.status)}</div><p>${t.body}</p><div class="flex space mt"><span class="small muted flex">${icon("Clock")}${t.date} · Siz</span>${button(t.status === "ASSIGNED" ? "Qabul qilish" : "Bajarildi", "Check", "sample", "soft")}</div></div></article>`).join("")}</div>`
    );
  }
  function reviews() {
    return (
      heading(
        "Mehmonlar sharhlari",
        "Sharh yakunlangan yashashdan keyin yoziladi.",
      ) +
      `<div class="vertical-list">${[
        {
          rating: 5,
          text: "Xonalar qulay, tabiat juda chiroyli.",
          reply: "Tashrifingiz uchun rahmat.",
        },
        { rating: 4, text: "Yaxshi dam oldik, yana kelamiz.", reply: "" },
      ]
        .map(
          (r, i) =>
            `<article class="list-item"><span class="avatar">${String.fromCharCode(65 + i)}</span><div class="grow"><div class="flex space"><strong>Mehmon ${String.fromCharCode(65 + i)}.</strong><span class="flex" style="color:var(--amber)">${icon("Star")}<strong>${r.rating} / 5</strong></span></div><p>${r.text}</p><div class="flex space mt"><span class="small muted">10.10.2026 · ${tag("PUBLISHED")}</span>${link("Javob yozish", "review-reply", "MessageSquare")}</div>${r.reply ? `<div class="note mt">${icon("MessageSquare")}<p><strong>Sanatoriya javobi</strong><br>${r.reply}</p></div>` : ""}</div></article>`,
        )
        .join("")}</div>`
    );
  }
  function audit() {
    return (
      heading(
        "Amallar tarixi",
        "Muhim o‘zgarishlar audit yozuvlarida saqlanadi.",
      ) +
      table(
        ["Vaqt", "Amal", "Xodim", "Obyekt"],
        [
          [
            "10.10.2026 · 10:00",
            '<div class="person-cell"><span class="figure">' +
              icon("Star") +
              "</span><strong>Mashhur sanatoriyalar tanlovi yangilandi</strong></div>",
            "Administrator",
            "Chimyon",
          ],
          [
            "10.10.2026 · 10:00",
            '<div class="person-cell"><span class="figure">' +
              icon("CheckCheck") +
              "</span><strong>Mehmon joylashtirildi</strong></div>",
            "Qabulxona",
            "BR-NAMUNA-001",
          ],
        ],
        "Amallar",
      ) +
      `<div class="mt">${note("Audit yozuvlari o‘chirilmaydi. Amal va vaqt ketma-ketligini shu yerda kuzating.", "", "ShieldCheck")}</div>`
    );
  }
  function reconciliation() {
    return (
      heading(
        "To‘lovlarni solishtirish",
        "Reestrdagi summa yoki holat farqlarini tekshiring.",
        actions(button("Reestr import qilish", "Upload", "import-register")),
      ) +
      `<div class="mb">${note("Mos kelmagan summa yoki holat alohida farq sifatida qayd etiladi.", "amber", "CircleAlert")}</div>` +
      table(
        ["Natija", "Reestr summasi", "Provayder holati", "Aniqlangan"],
        [
          [
            tag("Tekshirish kerak", "amber") +
              "<small>Summa, holat yoki to‘lov mos kelmagan</small>",
            "45 000 000 tiyin",
            "2",
            "10.10.2026",
          ],
        ],
        "Aniqlangan farqlar",
      )
    );
  }
  function notifications() {
    return (
      heading(
        "Bildirishnomalar",
        "Yangi bron, profil va jamoa bo‘yicha xabarlar.",
      ) +
      `<div class="vertical-list">${d.notifications.map((n, i) => `<article class="list-item"><span class="figure">${icon(i ? "CircleCheck" : "BookOpen")}</span><div class="grow"><div class="flex space"><h3>${esc(n.title)}</h3>${tag(i ? "Ko‘rilgan" : "Yangi", i ? "" : "blue")}</div><p>${esc(n.body)}</p><div class="flex space mt"><span class="small muted">10.10.2026 · 10:00</span>${i ? "" : link("Ko‘rdim", "sample", "Check")}</div></div></article>`).join("")}</div>`
    );
  }
  function surveys() {
    return (
      heading(
        "Anketalar",
        "Har bir anketa versiyasiga alohida javob saqlanadi.",
      ) +
      `<article class="card"><div class="card-head"><div class="flex"><span class="figure">${icon("FileText")}</span><div><h2>Mavsumga tayyorgarlik</h2><p>1-versiya · 2 ta savol</p></div></div>${tag("Javob kutilmoqda", "amber")}</div><div class="card-body"><p class="small muted mb">10.10.2026 · Xonalar tayyorligi va takliflaringiz haqida.</p>${button("Savollarni ko‘rish", "ArrowRight", "survey-questions", "soft")}</div></article>`
    );
  }
  function telegram() {
    return (
      heading(
        "Telegram bot",
        "Bronlar, vazifalar va muhim xabarlarni Telegramda kuzating.",
      ) +
      card(
        "Telegram hisobingiz",
        `<div class="empty"><span class="figure">${icon("Send")}</span><h2>Bot hali yoqilmagan</h2><p>Administrator bilan bog‘laning. Bot yoqilgach, hisobingizni bir martalik havola orqali ulaysiz.</p>${button("Holatni yangilash", "RefreshCw", "refresh", "soft")}</div>`,
      )
    );
  }
  function accounting() {
    return (
      heading(
        "Hisobchi hisobotlari",
        "Chimyon · Asia/Tashkent",
        actions(button("Yangilash", "RefreshCw", "refresh", "")),
      ) +
      card(
        "Hisobot davri",
        `<div class="card-body"><div class="report-controls">${["Bugun", "7 kun", "30 kun", "90 kun", "Oy bo‘yicha", "Sana oralig‘i"].map((t) => button(t, "CalendarDays", "report-period", t === "Oy bo‘yicha" ? "primary" : "")).join("")}</div><div class="flex space"><label class="field"><span>Hisobot oyi</span><input type="month" value="2026-10"></label><label class="switch"><input type="checkbox" id="compare-report">Oldingi davr bilan solishtirish</label></div><p class="small muted mt">01.10.2026 — 31.10.2026 · Ikkala sana ham kiradi.</p></div>`,
      ) +
      `<div class="metrics mt">${metric("Sof onlayn tushum", "53 400 000", "To‘lovlar minus qaytarishlar", "CreditCard", true, "so‘m")}${metric("Qaytarilgan", "1 500 000", "Tanlangan davr ichida", "Wallet", false, "so‘m")}${metric("Joyida to‘lovlar", "8 700 000", "Tasdiqlangan naqd va terminal", "Coins", false, "so‘m")}${metric("Sanatoriyaga qarzdorlik", "2 800 000", "Davr oxirigacha qoldiq", "FileCheck", false, "so‘m")}</div><div class="grid-two grid-equal">${card(
        "Davr ichidagi to‘lovlar",
        balance([
          ["Naqd", d.report.offline_cash_receipts],
          ["Terminal", d.report.offline_terminal_receipts],
          ["Tasdiqlanmagan qaydlar", d.report.unverified_offline_receipts],
          ["Bank tasdiqlagan o‘tkazmalar", d.report.paid_payouts],
        ]),
      )}${card(
        "Davr oxiridagi qoldiqlar",
        balance([
          ["Sanatoriyaga qarzdorlik", d.report.sanatorium_payable],
          ["Refund majburiyati", d.report.refund_payable],
          ["Bankka yuborilayotgan", d.report.payout_in_transit],
          ["Undiriladigan summa", d.report.receivable],
        ]),
      )}</div><div class="mb">${note("Davr tushumi va davr oxiridagi qoldiqlar alohida hisoblanadi. Tasdiqlanmagan joyida to‘lovlar tushumga qo‘shilmaydi.")}</div>${card("Bronlar va bandlik", `<div class="card-body"><div class="flex space"><span class="small">41 bron · 370 xona-tun · 740 mehmon-tun</span><strong>61,7%</strong></div><div class="mini-progress"><i style="width:61.7%"></i></div></div>`)}<div class="export-buttons">${button("CSV yuklash", "Download", "sample", "")}${button("Chop etish / PDF", "Printer", "sample", "")}</div>`
    );
  }
  function login() {
    const admin = screen.role === "admin";
    return `<main class="login-screen"><section class="login-art"><a class="brand" href="index.html"><img src="assets/sihhat-logo.jpg" alt="Sihhat uz logosi"><div class="brand-name">Sihhat <em>uz</em></div></a><div class="login-story"><span class="tag">SOG‘LOM DAM OLISH · OSON BOSHQARUV</span><h1>Har bir mehmon.<br>Har bir xona.<br><em>Bir joyda.</em></h1><p>Bronlar, sanatoriya ishlari va jamoangiz bilan aloqani Sihhat uz orqali boshqaring.</p><div class="login-feature"><span class="figure">${icon("BookOpen")}</span>Bronlar va bandlik<span class="figure" style="margin-left:10px">${icon("ShieldCheck")}</span>Rollar va ruxsatlar</div></div><footer class="login-foot"><span>© 2026 Sihhat uz</span><span>Sanatoriyalar platformasi</span></footer></section><section class="login-form-wrap">${iconButton(theme === "dark" ? "Sun" : "Moon", "Ko‘rinishni almashtirish", "theme", "login-theme")}<form class="login-form"><img class="login-logo" src="assets/sihhat-logo.jpg" alt="Sihhat uz logosi"><p class="eyebrow">${admin ? "SUPERADMIN PANELI" : "SANATORIYA PANELI"}</p><h1>Xush kelibsiz</h1><p class="muted">Ishni davom ettirish uchun hisobingizga kiring.</p><label class="field"><span>Login</span><input name="login" placeholder="Loginingiz" autocomplete="username" required></label><label class="field"><span>Parol</span><span class="password-wrap"><input name="password" type="password" placeholder="Parolingiz" autocomplete="current-password" required>${iconButton("Eye", "Parolni ko‘rsatish", "password")}</span></label>${admin ? `<label class="field"><span>Autentifikator kodi</span><input name="mfa_code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6 raqamli kod" autocomplete="one-time-code" required><span class="mfa-info">${icon("Info")}Autentifikator ilovasidagi joriy 6 raqamli kodni kiriting.</span></label>` : ""}<button class="button primary" type="submit">Kirish${icon("ArrowRight")}</button><p class="login-safe">${icon("ShieldCheck")}${admin ? "Ikki bosqichli himoya yoqilgan." : "Rol va ruxsatlaringiz asosida kirish."}</p><div class="login-divider">SIHHAT UZ</div><p class="login-help">Kirish ma’lumotlarini ${admin ? "platforma administratori" : "direktoringiz yoki administrator"}dan oling.</p><p class="login-footer-mobile">© 2026 Sihhat uz · Sanatoriyalar platformasi</p></form></section></main>`;
  }
  const nav = [
    [
      "Ish jarayoni",
      [
        ["dashboard", "Umumiy ko‘rinish", "LayoutDashboard"],
        ["sanatoriums", "Sanatoriyalar", "Building2", "admin"],
        ["profile", "Sanatoriya profili", "Building2", "partner"],
        ["bookings", "Bronlar", "BookOpen"],
        ["inventory", "Xonalar va tariflar", "CalendarDays"],
        ["staff", "Jamoa va ruxsatlar", "Users"],
      ],
    ],
    [
      "Moliya",
      [
        ["payments", "To‘lovlar", "CreditCard"],
        ["refunds", "Pulni qaytarish", "Wallet", "admin"],
        ["payouts", "Sanatoriyaga o‘tkazma", "FileCheck"],
        ["billing", "Abonent va hisoblar", "FileText"],
        [
          "reconciliation",
          "To‘lovlarni solishtirish",
          "ChartNoAxesCombined",
          "admin",
        ],
      ],
    ],
    [
      "Aloqa",
      [
        ["messages", "Xabarlar", "Mail"],
        ["tasks", "Vazifalar", "ClipboardList"],
        ["surveys", "Anketalar", "FileText"],
        ["reviews", "Sharhlar", "HeartPulse"],
        ["support", "Yordam xizmati", "Headphones"],
        ["notifications", "Bildirishnomalar", "Bell"],
        ["telegram", "Telegram bot", "Send"],
      ],
    ],
    [
      "Kontent va nazorat",
      [
        ["ads", "Reklama", "Megaphone"],
        ["articles", "Yangilik va tavsiyalar", "NotebookPen", "admin"],
        ["audit", "Amallar tarixi", "ShieldCheck", "admin"],
      ],
    ],
  ];
  function render() {
    document.documentElement.dataset.theme = theme;
    document.title = `Sihhat uz — ${screen.title}`;
    if (screen.section === "login")
      document.querySelector("#app").innerHTML = login();
    else {
      const account = screen.role === "accountant";
      let activeSection =
        screen.section === "booking-detail"
          ? "bookings"
          : screen.section === "profile-edit"
            ? "profile"
            : screen.section;
      if (screen.role === "admin" && activeSection === "profile")
        activeSection = "sanatoriums";
      const breadcrumbTitle =
        screen.section === "booking-detail"
          ? "Bron tafsiloti"
          : screen.section === "profile-edit"
            ? "Profilni tahrirlash"
            : (nav
                .flatMap((group) => group[1])
                .find((entry) => entry[0] === screen.section)?.[1] ??
              screen.title);
      const roleName =
        screen.role === "admin"
          ? "Superadmin"
          : account
            ? "Hisobchi"
            : "Direktor";
      const selectedGroups = nav
        .map(([title, items]) => [
          title,
          items.filter((v) =>
            account
              ? v[0] === "dashboard"
              : v[3] === "admin"
                ? screen.role === "admin"
                : v[3] === "partner"
                  ? screen.role !== "admin"
                  : true,
          ),
        ])
        .filter((v) => v[1].length);
      const navbar = selectedGroups
        .map(
          ([title, items]) =>
            `<details ${items.some((v) => v[0] === activeSection) ? "open" : ""}><summary>${title}${icon("ChevronDown")}</summary>${items.map(([id, text, name]) => `<button class="nav-link ${id === activeSection ? "active" : ""}" data-go="${id}" ${id === activeSection ? 'aria-current="page"' : ""}>${icon(name)}${account ? "Hisobotlar" : text}</button>`).join("")}</details>`,
        )
        .join("");
      const renderPage =
        {
          dashboard,
          sanatoriums,
          bookings,
          "booking-detail": bookingDetail,
          inventory,
          profile,
          "profile-edit": () => profile(true),
          staff,
          payments,
          payouts,
          refunds,
          billing,
          ads,
          articles,
          messages,
          tasks,
          support: () => messages(true),
          reviews,
          audit,
          reconciliation,
          notifications,
          surveys,
          telegram,
        }[screen.section] ?? dashboard;
      document.querySelector("#app").innerHTML =
        `<div class="shell"><button class="scrim" aria-label="Menyuni yopish" data-action="menu"></button><aside class="sidebar"><a href="index.html" class="brand"><img src="assets/sihhat-logo.jpg" alt="Sihhat uz logosi"><div><span class="brand-name">Sihhat <em>uz</em></span><small>Sanatoriyalar platformasi</small></div></a><div class="workspace-badge">${icon(account ? "Coins" : "ShieldCheck")}${screen.role === "admin" ? "Platforma boshqaruvi" : account ? "Hisobchi paneli" : "Sanatoriya boshqaruvi"}</div><nav class="nav" aria-label="Asosiy menyu">${navbar}</nav><footer class="sidebar-foot">${icon("Leaf")}<div><strong>Bron komissiyasi — 0%</strong>Ochiq va qulay hamkorlik</div></footer></aside><div class="main"><header class="topbar"><div class="topbar-left">${iconButton("Menu", "Menyuni ochish", "menu", "mobile-menu")}<div class="workspace-select"><span>${icon("Building2")}</span><label><small>${screen.role === "admin" ? "Tanlangan sanatoriya" : "Sanatoriyangiz"}</small><select aria-label="Sanatoriyani tanlash">${(screen.role === "admin" ? d.sanatoriums : [d.sanatoriums[0]]).map((s) => `<option>${esc(s.name)}</option>`).join("")}</select></label></div></div><div class="topbar-right">${iconButton(theme === "dark" ? "Sun" : "Moon", "Ko‘rinishni almashtirish", "theme")}${account ? "" : iconButton("Bell", "Bildirishnomalar", "go-notifications")}<span class="header-divider"></span><span class="avatar">${roleName[0]}</span><div class="user-info"><strong>${screen.role === "admin" ? "Platforma administratori" : "Sanatoriya xodimi"}</strong><small>${roleName}</small></div>${iconButton("Settings", "Parolni almashtirish", "change-password", "settings")}${iconButton("LogOut", "Chiqish", "logout", "logout")}</div></header><main class="content"><div class="breadcrumb">${screen.role === "admin" ? "Platforma" : account ? "Hisobchi paneli" : "Chimyon"}${icon("ChevronRight")}<span>${esc(breadcrumbTitle)}</span></div>${renderPage()}</main></div></div>`;
    }
    document.body.dataset.screen = screen.id;
    document.body.dataset.ready = "true";
  }
  let toastTimer;
  function toast(text) {
    const el = document.querySelector("#toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3200);
  }
  function go(section) {
    screen = screens.find(
      (s) =>
        s.role === screen.role &&
        s.section === section &&
        !s.theme &&
        s.width === 1440,
    ) ?? {
      ...screen,
      id: `${screen.role}-${section}`,
      section,
      title:
        nav.flatMap((v) => v[1]).find((v) => v[0] === section)?.[1] ??
        (section === "booking-detail"
          ? "Bron tafsiloti"
          : section === "profile-edit"
            ? "Profilni tahrirlash"
            : "Sanatoriya profili"),
    };
    const url = new URL(location.href);
    url.searchParams.set("screen", screen.id);
    url.searchParams.set("theme", theme);
    history.replaceState({}, "", url);
    render();
    window.scrollTo(0, 0);
  }
  function dialog(title, body, footer = button("Saqlash", "Check", "sample")) {
    document.querySelector(".modal-overlay")?.remove();
    const wrapper = document.createElement("div");
    wrapper.className = "modal-overlay";
    wrapper.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="modal-title" class="modal"><div class="card-head"><h2 id="modal-title">${esc(title)}</h2>${iconButton("X", "Oynani yopish", "close")}</div><div class="card-body">${body}</div><div class="form-foot">${button("Bekor qilish", "X", "close", "")}${footer}</div></section>`;
    document.body.append(wrapper);
    wrapper.querySelector("input,textarea,button")?.focus();
  }
  document.addEventListener("click", (e) => {
    const next = e.target.closest("[data-go]");
    if (next) return go(next.dataset.go);
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      inventoryTab = tab.dataset.tab;
      render();
      return;
    }
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action.startsWith("go-")) return go(action.slice(3));
    if (action === "theme") {
      theme = theme === "dark" ? "light" : "dark";
      render();
      return;
    }
    if (action === "menu") {
      document.querySelector(".shell")?.classList.toggle("menu-open");
      return;
    }
    if (action === "close") {
      document.querySelector(".modal-overlay")?.remove();
      return;
    }
    if (action === "password") {
      const input = target.closest(".password-wrap").querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      target.setAttribute(
        "aria-label",
        input.type === "text" ? "Parolni yashirish" : "Parolni ko‘rsatish",
      );
      return;
    }
    if (action === "logout") return go("login");
    if (action === "permissions")
      return dialog(
        "Xodim ruxsatlari",
        `<p class="small muted mb">Faqat belgilangan vakolatlar beriladi.</p><div class="permission-grid">${["Bronlarni ko‘rish", "Mehmonni joylashtirish", "Ketishni qayd etish", "Xonalarni boshqarish", "Moliyaviy hisobot", "Hisobotni yuklash"].map((v, i) => `<label><input type="checkbox" ${i < 3 ? "checked" : ""}>${v}</label>`).join("")}</div>`,
      );
    if (action === "sanatorium-options")
      return dialog(
        "Sanatoriya amallari",
        `<div class="vertical-list">${button("Onlayn bron sozlamasi", "Settings", "sample", "")}${button("Sanatoriyani to‘xtatish", "LockKeyhole", "sample", "danger")}${button("Arxivlash", "History", "sample", "danger")}</div>`,
      );
    if (action === "profile-files")
      return dialog(
        "Rasmlar va hujjatlar",
        `<div class="empty"><span class="figure">${icon("Image")}</span><h2>Suratlar va hujjatlarni yuklash</h2><p>Suratlarni guruh qilib tanlash mumkin. Hujjatlar vakolatli xodimlarga ko‘rinadi.</p><label class="field"><span>Fayllar</span><input type="file" multiple accept="image/*,application/pdf"></label></div>`,
      );
    if (action === "profile-bank")
      return dialog(
        "Bank ma’lumotlari",
        `<div class="form-grid">${field("Yuridik nom", "Sanatoriya")}${field("Hisob raqami", "********************")}${field("STIR", "*********")}${field("Bank nomi", "")}</div><div class="mt">${note("Bank rekvizitlari tekshiruvdan keyin qo‘llanadi.")}</div>`,
      );
    if (action === "survey-questions")
      return dialog(
        "Mavsumga tayyorgarlik",
        `<div class="form-grid"><label class="field wide"><span>Xonalar tayyormi?</span><select><option>Javobni tanlang</option><option>Ha</option><option>Yo‘q</option></select></label>${field("Takliflaringiz", "", "textarea", true)}</div>`,
        button("Javob yuborish", "Send", "sample"),
      );
    if (action === "billing-plans")
      return dialog(
        "Abonent tariflari",
        `<h2 class="mb">Asosiy tarif</h2><p>300 000 so‘m · 30 kun</p><p class="muted small mt">Bronlar, jamoa va hisobotlar.</p>`,
      );
    if (action === "billing-subscriptions")
      return dialog(
        "Abonentlar",
        `<p>Chimyon · Asosiy tarif</p><p class="small muted mt">Tugash sanasi: 01.11.2026</p>`,
      );
    if (action === "billing-policies")
      return dialog(
        "Qaytarish shartlari",
        `<p>Bron yaratilgandagi shart versiyasi saqlanadi.</p><p class="small muted mt">Yangi shart avvalgi bron shartini o‘zgartirmaydi.</p>`,
      );
    const forms = {
      "create-sanatorium": ["Yangi sanatoriya", field("Sanatoriya nomi")],
      "create-room": [
        "Xona qo‘shish",
        `<div class="form-grid">${field("Xona raqami")}${field("Xona turi", "Standart")}</div>`,
      ],
      "invite-staff": [
        "Xodim taklif qilish",
        `<div class="form-grid">${field("Ism va familiya")}${field("Login")}${field("Telefon")}<label class="field"><span>Lavozim</span><select><option>Qabulxona</option><option>Hisobchi</option></select></label></div>`,
      ],
      "manual-booking": [
        "Qo‘lda bron",
        `<div class="form-grid">${field("Kelish", "2026-10-10", "date")}${field("Ketish", "2026-10-13", "date")}${field("Mehmon ismi")}${field("Telefon")}${field("Kattalar", "2", "number")}${field("Bolalar", "0", "number")}</div><div class="mt">${note("Bron yaratishdan oldin bo‘sh xona va joriy narx tekshiriladi.")}</div>`,
      ],
      "create-ad": [
        "Reklama kampaniyasi",
        `<div class="form-grid">${field("Sarlavha", "Kuzgi dam olish", "text", true)}${field("Matn", "Tabiat bag‘rida sokin hordiq.", "textarea", true)}${field("Boshlanish", "2026-10-10", "date")}${field("Tugash", "2026-10-20", "date")}<label class="field wide"><span>Joylashuv</span><select><option>Bosh sahifa</option><option>Popup</option></select></label></div>`,
      ],
      "create-article": [
        "Maqola yozish",
        `<div class="form-grid">${field("Sarlavha", "", "text", true)}${field("Qisqa mazmun", "", "textarea", true)}${field("To‘liq matn", "", "textarea", true)}<label class="field"><span>Turi</span><select><option>Yangilik</option><option>Tavsiya</option></select></label><label class="field"><span>Holat</span><select><option>Qoralama</option><option>E’lon qilish</option></select></label></div>`,
      ],
      "create-message": [
        "Xabar yuborish",
        `<div class="form-grid">${field("Sarlavha", "", "text", true)}${field("Xabar matni", "", "textarea", true)}</div>`,
      ],
      "create-task": [
        "Vazifa berish",
        `<div class="form-grid">${field("Vazifa", "", "text", true)}${field("Tavsif", "", "textarea", true)}${field("Muddat", "2026-10-11", "date")}${field("Xodim", "Qabulxona")}</div>`,
      ],
      "create-ticket": [
        "Yangi murojaat",
        `<div class="form-grid">${field("Mavzu", "", "text", true)}${field("Murojaat matni", "", "textarea", true)}</div>`,
      ],
      "review-reply": ["Sharhga javob", field("Javob", "", "textarea", true)],
      "change-password": [
        "Parolni almashtirish",
        `<div class="form-grid">${field("Joriy parol", "", "password", true)}${field("Yangi parol", "", "password", true)}</div><p class="small muted mt">Kamida 10 belgi, katta-kichik harf va raqam ishlating.</p>`,
      ],
      "import-register": [
        "Reestr import qilish",
        `<div class="form-grid"><label class="field wide"><span>Reestr turi</span><select><option>To‘lov provayderi</option><option>Bank</option></select></label><label class="field wide"><span>CSV reestr</span><input type="file" accept=".csv,text/csv"></label></div>`,
      ],
    };
    if (forms[action]) return dialog(...forms[action]);
    if (action === "refresh") return toast("Ko‘rinish yangilandi.");
    if (action === "report-period") {
      target
        .closest(".report-controls")
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("primary"));
      target.classList.add("primary");
      return;
    }
    toast("Bu dizayn namunasi. O‘zgarish bazaga yuborilmaydi.");
  });
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("Bu dizayn namunasi. Ma’lumot serverga yuborilmaydi.");
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches(".check-choice input"))
      toast(
        e.target.checked
          ? "Mashhur tanlovi belgilandi — namuna."
          : "Mashhur tanlovi olib tashlandi — namuna.",
      );
    if (e.target.id === "booking-status") {
      const rows = e.target.value
        ? d.bookings.filter((b) => b.status === e.target.value)
        : d.bookings;
      const body = document.querySelector(".booking-table tbody");
      const headers = ["Bron", "Mehmon", "Yashash", "Summa", "Holat", "Amal"];
      body.innerHTML = bookingRows(rows)
        .map(
          (row) =>
            `<tr>${row.map((c, i) => `<td data-label="${headers[i]}">${c}</td>`).join("")}</tr>`,
        )
        .join("");
      document.querySelector(".booking-table .count").textContent = rows.length;
      document.querySelector(".booking-table .pager>span").textContent =
        `${rows.length} ta yozuv · 1 / 1 sahifa`;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelector(".modal-overlay")?.remove();
      document.querySelector(".shell")?.classList.remove("menu-open");
    }
  });
  render();
})();
