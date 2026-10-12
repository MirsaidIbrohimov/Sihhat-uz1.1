const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const lucide = require("lucide-react");
const {
  cases,
  report,
  sanatoriums,
  bookings,
  inventory,
  staffRows,
  ads,
  articles,
  invoices,
  notifications,
} = require("./current.cjs");
const web = path.resolve(__dirname, "..");
const root = path.resolve(web, "../..");
const assets = path.join(web, "assets");
fs.mkdirSync(assets, { recursive: true });
for (const name of ["DMSans.ttf", "Manrope.ttf"])
  fs.copyFileSync(
    path.join(root, "apps/mobile/assets/fonts", name),
    path.join(assets, name),
  );
for (const name of ["DMSans-OFL.txt", "Manrope-OFL.txt", "LUCIDE.txt"])
  fs.copyFileSync(
    path.join(root, "apps/mobile/assets/licenses", name),
    path.join(assets, name),
  );
fs.copyFileSync(
  path.join(root, "apps/mobile/assets/branding/sihhat-logo.jpg"),
  path.join(assets, "sihhat-logo.jpg"),
);
fs.copyFileSync(
  path.join(root, "apps/mobile/assets/welcome-retreat.png"),
  path.join(assets, "retreat.png"),
);
const names = [
  "LayoutDashboard",
  "Building2",
  "BookOpen",
  "CalendarDays",
  "Users",
  "CreditCard",
  "Wallet",
  "FileCheck",
  "FileText",
  "Megaphone",
  "ChartNoAxesCombined",
  "Mail",
  "ClipboardList",
  "HeartPulse",
  "CircleHelp",
  "Bell",
  "ShieldCheck",
  "Settings",
  "LogOut",
  "Menu",
  "X",
  "ChevronDown",
  "ChevronRight",
  "ChevronLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowUpRight",
  "Check",
  "CheckCheck",
  "CircleCheck",
  "CircleAlert",
  "Info",
  "Plus",
  "Search",
  "SlidersHorizontal",
  "RefreshCw",
  "Ellipsis",
  "MapPin",
  "Star",
  "Clock",
  "BedDouble",
  "Leaf",
  "Sparkles",
  "Sun",
  "Moon",
  "Eye",
  "EyeOff",
  "LockKeyhole",
  "Download",
  "Printer",
  "Paperclip",
  "Send",
  "Upload",
  "Image",
  "MessageSquare",
  "Headphones",
  "Phone",
  "Wifi",
  "Waves",
  "Car",
  "Utensils",
  "Coins",
  "CheckSquare",
  "Link",
  "NotebookPen",
  "FileSpreadsheet",
  "History",
  "ChevronUp",
];
const icons = Object.fromEntries(
  names.map((name) => {
    if (!lucide[name]) throw new Error("Icon missing: " + name);
    return [
      name,
      renderToStaticMarkup(
        React.createElement(lucide[name], {
          width: 20,
          height: 20,
          strokeWidth: 1.8,
          "aria-hidden": true,
        }),
      ),
    ];
  }),
);
fs.writeFileSync(
  path.join(assets, "icons.js"),
  "window.WEB_ICONS = " + JSON.stringify(icons) + ";\n",
);
const screens = cases.map(([id, role, section, title]) => ({
  id,
  role,
  section,
  title,
  width: 1440,
  height: 1000,
  current: `hozirgi/${id}.png`,
  proposed: `yangi/${id}.png`,
  implemented: `joriy/${id}.png`,
  source: ["admin", "director"].includes(role)
    ? `packages/ui/src/${{ dashboard: "governance.tsx", sanatoriums: "governance.tsx", profile: "governance.tsx", staff: "governance.tsx", bookings: "operations.tsx", inventory: "operations.tsx", payments: "operations.tsx", refunds: "financial.tsx", payouts: "financial.tsx", billing: "financial.tsx", ads: "financial.tsx", articles: "articles.tsx", telegram: "telegram.tsx", login: "portal.tsx" }[section] ?? "communication.tsx"}`
    : "packages/ui/src/accounting.tsx",
}));
screens.push(
  {
    id: "27-direktor-bron-tafsiloti",
    role: "director",
    section: "booking-detail",
    title: "Bron tafsiloti va joylashtirish",
    width: 1440,
    height: 1000,
    proposed: "yangi/27-direktor-bron-tafsiloti.png",
    source: "packages/ui/src/operations.tsx",
  },
  {
    id: "28-direktor-profil-tahriri",
    role: "director",
    section: "profile-edit",
    title: "Profilni bosqichlar bilan tahrirlash",
    width: 1440,
    height: 1000,
    proposed: "yangi/28-direktor-profil-tahriri.png",
    source: "packages/ui/src/wizard.tsx",
  },
  {
    id: "29-superadmin-tungi",
    role: "admin",
    section: "dashboard",
    title: "Superadmin: tungi ko‘rinish",
    theme: "dark",
    width: 1440,
    height: 1000,
    proposed: "yangi/29-superadmin-tungi.png",
    source: "packages/ui/src/governance.tsx",
  },
  {
    id: "30-telefon-kirish",
    role: "director",
    section: "login",
    title: "Telefon: kirish",
    width: 390,
    height: 844,
    proposed: "yangi/30-telefon-kirish.png",
    source: "packages/ui/src/portal.tsx",
  },
  {
    id: "31-telefon-bosh-sahifa",
    role: "director",
    section: "dashboard",
    title: "Telefon: direktor bosh sahifasi",
    width: 390,
    height: 844,
    proposed: "yangi/31-telefon-bosh-sahifa.png",
    source: "packages/ui/src/governance.tsx",
  },
  {
    id: "32-telefon-bronlar",
    role: "director",
    section: "bookings",
    title: "Telefon: bron kartalari",
    width: 390,
    height: 844,
    proposed: "yangi/32-telefon-bronlar.png",
    source: "packages/ui/src/operations.tsx",
  },
);
for (const screen of screens) screen.implemented = `joriy/${screen.id}.png`;
const data = {
  report,
  sanatoriums: sanatoriums.map((s) => ({
    name: s.name,
    region: s.revision.data.region,
    status: s.status,
    featured: s.featuredOnHome,
    revision: s.revision.status,
    ready: s.paymentReady,
  })),
  bookings: bookings.map((b) => ({
    reference: b.reference,
    name: b.guest.name,
    phone: b.guest.phone,
    source: b.source,
    status: b.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    amount: b.amount,
  })),
  staff: staffRows.map((s) => ({
    name: s.user.name,
    role: s.role,
    status: s.status,
  })),
  ads: ads.map((a) => ({
    title: a.title,
    text: a.data.text,
    status: a.status,
    publication: a.publication_status,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    placement: a.placement,
    sanatorium: a.sanatoriumId === sanatoriums[0].id ? "Chimyon" : "Zomin",
  })),
  articles,
  invoices,
  notifications,
  rooms: inventory.rooms.map((r) => r.code),
};
fs.writeFileSync(
  path.join(web, "screens.js"),
  "window.WEB_SCREENS = " +
    JSON.stringify(screens, null, 2) +
    ";\nwindow.WEB_SAMPLE = " +
    JSON.stringify(data, null, 2) +
    ";\n",
);
fs.writeFileSync(
  path.join(web, "manifest.json"),
  JSON.stringify(
    {
      project: "Sihhat uz",
      version: 2,
      date: "2026-10-10",
      current:
        "Current React components, intercepted synthetic data, no live login or mutation.",
      proposed:
        "Standalone HTML/CSS design reference samples, implemented in the real React panels.",
      implemented:
        "Updated React panels with intercepted synthetic masked data; original baseline images retained for comparison.",
      screens,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    screens: screens.length,
    comparisons: cases.length,
    icons: names.length,
    assetsPrepared: true,
  }),
);
