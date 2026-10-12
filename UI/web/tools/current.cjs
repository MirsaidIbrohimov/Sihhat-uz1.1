const { chromium } = require("playwright");
const {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} = require("node:fs");
const { resolve, join } = require("node:path");
const root = resolve(__dirname, "../../..");
const output = join(root, "UI/web");
const browserPath =
  "C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const permissions = [
  "sanatorium.profile.edit",
  "inventory.manage",
  "pricing.manage",
  "discounts.manage",
  "bookings.read",
  "bookings.create_manual",
  "bookings.guarantee",
  "bookings.check_in",
  "bookings.check_out",
  "payments.read",
  "offline_payments.record",
  "offline_payments.verify",
  "reports.operational.read",
  "reports.financial.read",
  "reports.export",
  "refunds.request",
  "messages.send",
  "tasks.manage",
  "surveys.respond",
  "reviews.reply",
  "support.read",
  "invoices.read",
  "invoices.pay",
  "ads.request",
  "payouts.read",
  "staff.invite",
  "staff.permissions.manage",
  "bank.request",
];
const day = "2026-10-10";
const at = "2026-10-10T05:00:00.000Z";
const tenantId = "11111111-1111-4111-8111-111111111111";
const profileData = {
  name: "Chimyon",
  description:
    "Tog‘ bag‘rida dam olish va sog‘lomlashtirish maskani. Tabiat, qulay xonalar va mehmonlarga e’tibor.",
  legal_name: "Sanatoriya",
  region: "Farg‘ona",
  address: "Tog‘ hududi",
  contact_phone: "+998 ** *** ** **",
  map_url: "",
  check_in_time: "14:00",
  check_out_time: "12:00",
  amenities: ["wifi", "pool", "parking"],
  services: ["massage"],
  meals: "Kuniga 3 mahal",
  child_rules: "Bolalar kattalar bilan joylashadi.",
  medical_requirements: "Kelishdan oldin sanatoriya bilan aniqlashtiring.",
  photo_ids: [],
  document_ids: [],
  stir: "*********",
  terms: "Shartlar kelishdan oldin taqdim etiladi.",
};
const sanatoriums = ["Chimyon", "Zomin", "Oqtosh", "Chortoq", "Bo‘ston"].map(
  (name, i) => ({
    id: i ? `22222222-2222-4222-8222-${String(i).padStart(12, "0")}` : tenantId,
    name,
    status: i === 3 ? "PAUSED" : "ACTIVE",
    featuredOnHome: i < 2,
    paymentReady: i !== 3,
    subscriptionRequired: false,
    version: 1,
    createdAt: at,
    publicRevisionId: `revision-${i}`,
    revision: {
      id: `revision-${i}`,
      status: i === 4 ? "SUBMITTED" : "APPROVED",
      data: {
        ...profileData,
        name,
        region: ["Farg‘ona", "Jizzax", "Toshkent", "Namangan", "Toshkent"][i],
      },
      version: 1,
    },
    revisions: [
      {
        id: `revision-${i}`,
        status: i === 4 ? "SUBMITTED" : "APPROVED",
        data: { ...profileData, name },
        version: 1,
      },
    ],
  }),
);
const bookings = [
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "HOLD",
  "CANCELLED",
  "CONFIRMED",
].map((status, i) => ({
  id: `booking-${i}`,
  reference: `BR-NAMUNA-00${i + 1}`,
  sanatoriumId: tenantId,
  guest: {
    name: `Mehmon ${String.fromCharCode(65 + i)}.`,
    phone: "+998 ** *** ** **",
  },
  source: i === 1 ? "MANUAL" : "APP",
  status,
  checkIn: `2026-10-${String(10 + i).padStart(2, "0")}`,
  checkOut: `2026-10-${String(13 + i).padStart(2, "0")}`,
  amount: String((i + 2) * 45000000),
  createdAt: at,
  version: 1,
}));
const rooms = Array.from({ length: 8 }, (_, i) => ({
  id: `room-${i}`,
  code: String(101 + i),
  roomTypeId: "type-standard",
  active: true,
}));
const inventory = {
  types: [
    {
      id: "type-standard",
      name: "Standart",
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 1,
    },
  ],
  rooms,
  rates: [
    {
      id: "rate-standard",
      name: "Standart paket",
      roomTypeId: "type-standard",
      mode: "ROOM",
      baseAmount: "45000000",
      active: true,
      policyId: "policy-1",
      minNights: 1,
      maxNights: 90,
      packageDetails: { included: ["3 mahal ovqat", "Hovuz"] },
      childRules: [],
    },
  ],
  policies: [{ id: "policy-1", name: "Moslashuvchan", version: 1 }],
  allocations: rooms.slice(0, 5).map((r, i) => ({
    id: `allocation-${i}`,
    roomId: r.id,
    kind: i === 4 ? "MAINTENANCE" : i === 3 ? "HOLD" : "BOOKING",
    checkIn: `2026-10-${10 + i}`,
    checkOut: `2026-10-${13 + i}`,
    reason: "Rejali ta’mir",
  })),
  daily_rates: [],
  discounts: [],
};
const staffRows = ["DIRECTOR", "RECEPTION", "ACCOUNTANT", "RECEPTION"].map(
  (role, i) => ({
    id: `membership-${i}`,
    sanatoriumId: tenantId,
    userId: `staff-${i}`,
    user: {
      id: `staff-${i}`,
      name: ["Direktor", "Qabulxona xodimi", "Hisobchi", "Yangi xodim"][i],
      phone: "+998 ** *** ** **",
      login: "********",
    },
    role,
    status: i === 3 ? "PENDING_APPROVAL" : "ACTIVE",
    permissions,
    adminDenied: [],
    directorOverrides: {},
    version: 1,
    createdAt: at,
  }),
);
const report = {
  bookings: 41,
  room_nights: 370,
  sellable_room_nights: 600,
  guest_nights: 740,
  occupancy: 370 / 600,
  gmv: "5490000000",
  platform_revenue: "640000000",
  sanatorium_payable: "280000000",
  net_online_receipts: "5340000000",
  refunds: "150000000",
  refund_payable: "45000000",
  payout_in_transit: "120000000",
  receivable: "90000000",
  booking_statuses: {
    CONFIRMED: 28,
    CHECKED_IN: 8,
    CHECKED_OUT: 3,
    CANCELLED: 2,
  },
  verified_offline_receipts: "870000000",
  offline_cash_receipts: "520000000",
  offline_terminal_receipts: "350000000",
  unverified_offline_receipts: "65000000",
  paid_payouts: "4820000000",
  rows: [],
  payments: [],
  offline_payments: [],
  payouts: [],
};
const invoices = [
  {
    id: "invoice-1",
    purpose: "SUBSCRIPTION",
    status: "PAID",
    amount: "30000000",
    startsAt: "2026-10-01",
    endsAt: "2026-11-01",
    createdAt: at,
  },
  {
    id: "invoice-2",
    purpose: "SUBSCRIPTION",
    status: "UNPAID",
    amount: "30000000",
    startsAt: "2026-11-01",
    endsAt: "2026-12-01",
    createdAt: at,
  },
];
const ads = [
  {
    id: "ad-1",
    sanatoriumId: tenantId,
    title: "Kuzgi dam olish",
    status: "APPROVED",
    publication_status: "LIVE",
    placement: "HOME",
    startsAt: "2026-10-10",
    endsAt: "2026-10-20",
    createdAt: at,
    data: {
      text: "Tabiat bag‘rida sokin hordiq.",
      target_type: "SANATORIUM",
      target_id: tenantId,
      discount_percent: 10,
    },
    version: 1,
  },
  {
    id: "ad-2",
    sanatoriumId: sanatoriums[1].id,
    title: "Tog‘lar chorlaydi",
    status: "PENDING_APPROVAL",
    publication_status: "WAITING_APPROVAL",
    placement: "HOME",
    startsAt: "2026-10-20",
    endsAt: "2026-10-30",
    createdAt: at,
    data: { text: "Yangi mavsum, yangi taassurotlar." },
    version: 1,
  },
];
const articles = [
  {
    id: "article-1",
    title: "Kuzgi hordiq uchun tayyorgarlik",
    summary:
      "Sayohat oldidan kerakli buyumlar va kelish ma’lumotlarini tekshiring.",
    body: "Namuna maqola matni.",
    kind: "NEWS",
    status: "PUBLISHED",
    publishedAt: at,
    version: 1,
  },
  {
    id: "article-2",
    title: "Kelishdan oldin nimalarni bilish kerak?",
    summary: "Sanatoriya bilan kelish va ovqatlanish vaqtini aniqlashtiring.",
    body: "Namuna tavsiya matni.",
    kind: "TIP",
    status: "DRAFT",
    publishedAt: null,
    version: 1,
  },
];
const notifications = [
  {
    id: "notice-1",
    title: "Yangi bron",
    body: "Mehmon uchun xona tasdiqlandi.",
    readAt: null,
    createdAt: at,
    data: { title: "Yangi bron", body: "Mehmon uchun xona tasdiqlandi." },
  },
  {
    id: "notice-2",
    title: "Profil tasdiqlandi",
    body: "Sanatoriya profili e’lon qilindi.",
    readAt: at,
    createdAt: at,
    data: {
      title: "Profil tasdiqlandi",
      body: "Sanatoriya profili e’lon qilindi.",
    },
  },
];
const pageResult = (data) => ({
  data,
  page: 1,
  pages: 1,
  total: data.length,
  limit: 15,
});
function mock(path, role, login) {
  if (path === "/auth/me")
    return login
      ? null
      : {
          id: "ui-actor",
          kind: role === "admin" ? "SUPERADMIN" : "STAFF",
          name:
            role === "admin"
              ? "Platforma administratori"
              : role === "accountant"
                ? "Hisobchi"
                : "Sanatoriya direktori",
          mustChangePassword: false,
          memberships:
            role === "admin"
              ? []
              : [
                  {
                    id: "ui-membership",
                    sanatoriumId: tenantId,
                    role: role === "accountant" ? "ACCOUNTANT" : "DIRECTOR",
                    status: "ACTIVE",
                    permissions:
                      role === "accountant"
                        ? [
                            "reports.operational.read",
                            "reports.financial.read",
                            "reports.export",
                          ]
                        : permissions,
                    version: 1,
                  },
                ],
        };
  if (path === "/auth/refresh") return null;
  if (/\/sanatoriums$/.test(path)) return pageResult(sanatoriums);
  if (path.endsWith("/bank-revisions")) return [];
  if (path.endsWith("/inventory")) return inventory;
  if (/\/sanatoriums\//.test(path))
    return sanatoriums.find((s) => path.endsWith(s.id)) ?? sanatoriums[0];
  if (path.endsWith("/reports")) return report;
  if (path.endsWith("/ai/usage"))
    return {
      requests: 86,
      input_tokens: 25800,
      output_tokens: 6400,
      unmetered_requests: 0,
      groups: [],
    };
  if (path.endsWith("/integrations/tezcheck")) return { configured: false };
  if (path.endsWith("/merchant") || path.endsWith("/merchant-connection"))
    return { configured: false, status: "NOT_CONFIGURED" };
  if (path.endsWith("/bookings")) return pageResult(bookings);
  if (path.endsWith("/staff") || path.endsWith("/staff-approvals"))
    return pageResult(staffRows);
  if (path.endsWith("/payments"))
    return pageResult(
      bookings.slice(0, 4).map((b, i) => ({
        id: `payment-${i}`,
        bookingId: b.id,
        purpose: "BOOKING",
        amount: b.amount,
        status: i === 3 ? "PENDING" : "SUCCEEDED",
        createdAt: at,
        paidAt: i === 3 ? null : at,
      })),
    );
  if (path.endsWith("/payouts"))
    return pageResult([
      {
        id: "payout-1",
        amount: "120000000",
        status: "IN_TRANSIT",
        createdAt: at,
        bankSnapshot: {
          legal_name: "Sanatoriya",
          account: "********************",
        },
        bankReference: null,
      },
      {
        id: "payout-2",
        amount: "4820000000",
        status: "PAID",
        createdAt: at,
        bankSnapshot: {
          legal_name: "Sanatoriya",
          account: "********************",
        },
        bankReference: "********",
      },
    ]);
  if (path.endsWith("/refunds"))
    return pageResult([
      {
        id: "refund-1",
        amount: "45000000",
        status: "REQUESTED",
        reason: "Mehmon sanani o‘zgartirmoqchi.",
        decisionReason: null,
        createdAt: at,
      },
      {
        id: "refund-2",
        amount: "150000000",
        status: "SUCCEEDED",
        reason: "Bron bekor qilindi.",
        decisionReason: "Shart bo‘yicha qaytarildi.",
        createdAt: at,
      },
    ]);
  if (path.endsWith("/invoices")) return pageResult(invoices);
  if (path.endsWith("/subscription-plans"))
    return [
      {
        id: "plan-1",
        name: "Asosiy",
        amount: "30000000",
        periodDays: 30,
        graceDays: 3,
        features: ["Bronlar", "Jamoa", "Hisobotlar"],
      },
    ];
  if (path.endsWith("/ad-campaigns")) return ads;
  if (path.endsWith("/articles")) return pageResult(articles);
  if (path === "/messages")
    return pageResult([
      {
        id: "message-1",
        messageId: "message-1",
        message: {
          title: "Mavsumga tayyorgarlik",
          body: "Xonalar va tariflarning yangilanganini tekshiring.",
          kind: "INFO",
          assetIds: [],
        },
        readAt: null,
        acceptedAt: null,
      },
    ]);
  if (path === "/tasks")
    return [
      {
        id: "task-1",
        sanatoriumId: tenantId,
        title: "Keladigan mehmonlar xonasini tekshirish",
        body: "101–104 xonalarning tayyorligini qayd eting.",
        assignedTo: "ui-actor",
        status: "ASSIGNED",
        dueAt: "2026-10-10T12:00:00.000Z",
        version: 1,
      },
      {
        id: "task-2",
        sanatoriumId: tenantId,
        title: "Tariflarni yangilash",
        body: "Kelgusi mavsum narxlarini tekshirish.",
        assignedTo: "ui-actor",
        status: "ACCEPTED",
        dueAt: "2026-10-11T12:00:00.000Z",
        version: 1,
      },
    ];
  if (path === "/surveys")
    return [
      {
        id: "survey-1",
        title: "Mavsumga tayyorgarlik",
        questions: [
          {
            id: "q-1",
            label: "Xonalar tayyormi?",
            type: "BOOLEAN",
            required: true,
          },
          { id: "q-2", label: "Takliflaringiz", type: "TEXT", required: false },
        ],
        recipientIds: ["ui-actor"],
        response_count: 3,
        version: 1,
        createdAt: at,
        answered: false,
      },
    ];
  if (path.endsWith("/reviews"))
    return pageResult([
      {
        id: "review-1",
        rating: 5,
        text: "Xonalar qulay, tabiat juda chiroyli.",
        status: "PUBLISHED",
        createdAt: at,
        reply: "Tashrifingiz uchun rahmat.",
      },
      {
        id: "review-2",
        rating: 4,
        text: "Yaxshi dam oldik, yana kelamiz.",
        status: "PUBLISHED",
        createdAt: at,
        reply: null,
      },
    ]);
  if (path === "/support/tickets")
    return [
      {
        id: "ticket-1",
        title: "Bron sanasini aniqlashtirish",
        status: "OPEN",
        createdAt: at,
      },
      {
        id: "ticket-2",
        title: "Xona rasmlarini yangilash",
        status: "CLOSED",
        createdAt: at,
      },
    ];
  if (path.endsWith("/audit"))
    return pageResult([
      {
        id: "audit-1",
        action: "sanatorium.featured_updated",
        actorId: "Administrator",
        entityType: "Sanatoriya",
        entityId: "Chimyon",
        createdAt: at,
      },
      {
        id: "audit-2",
        action: "booking.checked_in",
        actorId: "Qabulxona",
        entityType: "Bron",
        entityId: "BR-NAMUNA-001",
        createdAt: at,
      },
    ]);
  if (path.includes("/reconciliation"))
    return [
      {
        id: "comparison-1",
        status: "NEEDS_REVIEW",
        createdAt: at,
        data: { amount: "45000000", state: 2 },
      },
    ];
  if (path === "/notifications") return pageResult(notifications);
  if (path === "/telegram/account")
    return { enabled: false, bot_username: "", account: null, link: null };
  return pageResult([]);
}
const cases = [
  ["01-superadmin-kirish", "admin", "login", "Superadmin: kirish"],
  ["02-direktor-kirish", "director", "login", "Direktor: kirish"],
  [
    "03-superadmin-bosh-sahifa",
    "admin",
    "dashboard",
    "Superadmin: bosh sahifa",
  ],
  [
    "04-superadmin-sanatoriyalar",
    "admin",
    "sanatoriums",
    "Sanatoriyalar va Mashhur tanlovi",
  ],
  ["05-direktor-profil", "director", "profile", "Sanatoriya profili"],
  ["06-direktor-bronlar", "director", "bookings", "Bronlar"],
  ["07-direktor-xonalar", "director", "inventory", "Xonalar va tariflar"],
  ["08-direktor-jamoa", "director", "staff", "Jamoa va ruxsatlar"],
  ["09-superadmin-tolovlar", "admin", "payments", "Onlayn to‘lovlar"],
  ["10-superadmin-otkazmalar", "admin", "payouts", "Sanatoriyaga o‘tkazmalar"],
  ["11-superadmin-qaytarish", "admin", "refunds", "Pulni qaytarish"],
  ["12-superadmin-abonent", "admin", "billing", "Abonent va hisoblar"],
  ["13-superadmin-reklama", "admin", "ads", "Reklama kampaniyalari"],
  ["14-superadmin-maqolalar", "admin", "articles", "Yangilik va tavsiyalar"],
  ["15-direktor-xabarlar", "director", "messages", "Xabarlar"],
  ["16-direktor-vazifalar", "director", "tasks", "Jamoa vazifalari"],
  ["17-direktor-yordam", "director", "support", "Yordam xizmati"],
  ["18-direktor-sharhlar", "director", "reviews", "Mehmonlar sharhlari"],
  ["19-superadmin-audit", "admin", "audit", "Amallar tarixi"],
  [
    "20-superadmin-solishtirish",
    "admin",
    "reconciliation",
    "To‘lovlarni solishtirish",
  ],
  [
    "21-direktor-bildirishnomalar",
    "director",
    "notifications",
    "Bildirishnomalar",
  ],
  ["22-direktor-anketalar", "director", "surveys", "Anketalar"],
  ["23-direktor-telegram", "director", "telegram", "Telegram bot"],
  ["24-hisobchi-hisobotlar", "accountant", "dashboard", "Hisobchi hisobotlari"],
  ["25-direktor-bosh-sahifa", "director", "dashboard", "Direktor: bosh sahifa"],
  ["26-superadmin-jamoa", "admin", "staff", "Superadmin: jamoa va tasdiqlash"],
];
module.exports = {
  cases,
  mock,
  report,
  sanatoriums,
  bookings,
  inventory,
  staffRows,
  ads,
  articles,
  invoices,
  notifications,
  captureCurrent: main,
};
async function main() {
  const current = join(output, "hozirgi");
  mkdirSync(current, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(browserPath) ? { executablePath: browserPath } : {}),
  });
  const fonts = ["DMSans", "Manrope"]
    .map(
      (name) =>
        `@font-face{font-family:"${name === "DMSans" ? "DM Sans" : name}";src:url(data:font/ttf;base64,${readFileSync(join(root, "apps/mobile/assets/fonts", name + ".ttf")).toString("base64")}) format('truetype');font-weight:100 900;font-display:block}`,
    )
    .join("");
  const results = [];
  try {
    for (const [id, role, section, title] of cases) {
      const errors = [];
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        locale: "uz-UZ",
        timezoneId: "Asia/Tashkent",
      });
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/")) {
          const path = url.pathname.slice(4);
          if (route.request().method() !== "GET" && path !== "/auth/refresh")
            return route.fulfill({
              status: 409,
              json: {
                code: "UI_PREVIEW_ONLY",
                message: "Bu ko‘rinishda o‘zgarish saqlanmaydi.",
              },
            });
          const data = mock(path, role, section === "login");
          return route.fulfill(
            data === null
              ? {
                  status: 401,
                  json: {
                    code: "SESSION_REQUIRED",
                    message: "Hisobingizga kiring.",
                  },
                }
              : { status: 200, json: data },
          );
        }
        if (!["127.0.0.1", "localhost"].includes(url.hostname))
          return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      const port = role === "admin" ? 3000 : 3001;
      await page.goto(
        `http://127.0.0.1:${port}/${["login", "dashboard"].includes(section) ? "" : section}`,
        { waitUntil: "networkidle" },
      );
      await page.addStyleTag({ content: fonts });
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator(section === "login" ? ".login-form" : ".app-shell")
        .waitFor();
      await page.waitForFunction(() => !document.querySelector(".skeletons"));
      await page.waitForTimeout(150);
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        imagesMissing: Array.from(document.images).filter(
          (i) => !i.complete || !i.naturalWidth,
        ).length,
        heading:
          document.querySelector(".page-heading h1,.login-form h1")
            ?.textContent ?? "",
        errorText: document.querySelector(".error-box")?.textContent ?? "",
      }));
      await page.screenshot({
        path: join(current, id + ".png"),
        fullPage: true,
        animations: "disabled",
      });
      results.push({
        id,
        role,
        section,
        title,
        file: `hozirgi/${id}.png`,
        ...metrics,
        pageErrors: errors,
      });
      await context.close();
      console.log(
        JSON.stringify({
          id,
          heading: metrics.heading,
          errors: errors.length,
          overflow: metrics.documentWidth > metrics.width,
          missingImages: metrics.imagesMissing,
          apiError: !!metrics.errorText,
        }),
      );
    }
  } finally {
    await browser.close();
  }
  writeFileSync(
    join(root, ".local/web-ui-current-validation.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        data: "Synthetic masked UI data; every API request intercepted; no login or mutation sent to live API.",
        results,
      },
      null,
      2,
    ),
  );
  const invalid = results.filter(
    (r) =>
      r.pageErrors.length ||
      r.imagesMissing ||
      r.errorText ||
      r.documentWidth > r.width,
  );
  if (invalid.length)
    throw new Error(
      `Current UI capture issues: ${invalid.map((r) => r.id).join(", ")}`,
    );
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
