"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Baby,
  Bed,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  Headphones,
  HeartPulse,
  Info,
  MapPin,
  MessageSquare,
  Moon,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  User,
  X,
  Zap,
} from "lucide-react";
import "./landing.css";

export type RatePlanItem = {
  id: string;
  name: string;
  baseAmount: string;
  minNights?: number;
  policy?: {
    name: string;
  };
};

export interface SanatoriumCardData {
  id: string;
  name: string;
  region: string;
  address: string;
  meals: string;
  description: string;
  directions: string;
  services: string[];
  amenities: string[];
  photo_ids?: string[];
  photos?: string[];
  from_amount: string;
  price_label: string;
  category?: string;
  map_url?: string;
  check_in_time?: string;
  check_out_time?: string;
  required_documents?: string;
  child_rules?: string;
  rating?: number;
  tag?: string;
  room_types?: Array<{
    id: string;
    name: string;
    maxGuests: number;
  }>;
  rate_plans?: Array<RatePlanItem>;
}

// 4 Initial / Fallback Sanatoriums matching the exact design
const FALLBACK_SANATORIUMS: SanatoriumCardData[] = [
  {
    id: "4a84ecf9-0f07-47dc-819d-dfb2f82ab6e3",
    name: "Zomin Sog'lomlik Maskani",
    region: "Jizzax viloyati, Zomin tumani",
    address: "Zomin milliy tabiat bog'i, Duoba qishlog'i",
    category: "Davolash maskanlari",
    tag: "🏔️ 2000m Toza tog' havosi",
    meals: "3 mahal parhez va milliy taomlar",
    description:
      "Dengiz sathidan 2000 metr balandlikda, toza tog' va ignabargli archazorlar bag'rida joylashgan eng yirik iqlimiy kurort. Toza tog' havosi va zamonaviy fizioterapiya majmuasi.",
    directions:
      "Nafas a'zolari (bronxial astma, surunkali bronxit), asab tizimi, tayanch-harakat a'zolari va umumiy immunitetni tiklash.",
    services: [
      "Fizioterapiya",
      "Massaj",
      "Tuzli g'or (Speleoterapiya)",
      "Inflyatsiya",
      "Balchiq bilan davolash",
    ],
    amenities: [
      "Wi-Fi",
      "Yopiq basseyn",
      "Sauna & Jakuzi",
      "Tennis korti",
      "Avtoturargoh",
      "Lift",
      "Xonada televizor",
    ],
    from_amount: "5 000",
    price_label: "Hamyonbop 'Arzon' tarifi (5 000 so'm) va to'liq davolash bilan",
    map_url:
      "https://www.google.com/maps/place/Zomin+sanatoriysi/@39.6342404,68.4998058,434m/data=!3m1!1e3",
    check_in_time: "08:00",
    check_out_time: "20:00",
    required_documents: "Pasport, sanatoriya-kurort kartasi (mavjud bo'lsa)",
    child_rules: "Barcha yoshdagi bolalar qabul qilinadi",
    rating: 4.8,
    photos: [
      "https://zomin-san.uz/admin/foto/uploads/1745043510_2413.jpg",
      "https://zomin-san.uz/admin/slider/uploads/1744980607_8214.jpg",
      "https://zomin-san.uz/admin/foto/uploads/1745043547_7093.jpg",
      "https://zomin-san.uz/admin/xona/uploads/1745055508_5411.jpg",
    ],
    room_types: [
      { id: "e8a1562b-87b2-4d2a-89aa-56a8f1011111", name: "Arzon (Ekonom)", maxGuests: 2 },
      { id: "e8a1562b-87b2-4d2a-89aa-56a8f1022222", name: "Standart (2 kishilik)", maxGuests: 2 },
      { id: "e8a1562b-87b2-4d2a-89aa-56a8f1033333", name: "Lyuks (2 xonali)", maxGuests: 3 },
    ],
    rate_plans: [
      {
        id: "c5123d44-98e1-4567-bf12-aa1111111111",
        name: "Arzon",
        baseAmount: "500000",
        policy: { name: "24 soat oldin bepul bekor qilish" },
      },
      {
        id: "c5123d44-98e1-4567-bf12-aa2222222222",
        name: "Standart to'liq davolash bilan",
        baseAmount: "45000000",
        policy: { name: "24 soat oldin bepul bekor qilish" },
      },
    ],
  },
];

// Categories definition
const CATEGORIES = [
  {
    id: "davolash",
    title: "Davolash maskanlari",
    icon: Bed,
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "bolalar",
    title: "Bolalar salomatligi",
    icon: Baby,
    image:
      "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "reabilitatsiya",
    title: "Reabilitatsiya",
    icon: Activity,
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "wellness",
    title: "Dam olish va wellness",
    icon: Sparkles,
    image:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80",
  },
];

export function LandingPage() {
  const [sanatoriums, setSanatoriums] = useState<SanatoriumCardData[]>(FALLBACK_SANATORIUMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | "ai"
    | "bookings"
    | "contact"
    | "login"
    | "download"
    | "oferta"
    | "maxfiylik"
    | "qaytarish"
    | { type: "details"; item: SanatoriumCardData }
    | { type: "checkout"; item: SanatoriumCardData; ratePlan?: RatePlanItem }
  >(null);

  const [galleryIndex, setGalleryIndex] = useState(0);

  // TezCheck Checkout state
  const [checkoutGuestName, setCheckoutGuestName] = useState("");
  const [checkoutGuestPhone, setCheckoutGuestPhone] = useState("+998");
  const [checkoutCheckIn, setCheckoutCheckIn] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [checkoutNights, setCheckoutNights] = useState(1);
  const [checkoutSelectedRateId, setCheckoutSelectedRateId] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccessUrl, setCheckoutSuccessUrl] = useState("");

  // AI Assistant chat state
  const [aiInputText, setAiInputText] = useState("");
  const [aiChatLog, setAiChatLog] = useState<Array<{ role: "ai" | "user"; text: string; matchId?: string }>>([
    {
      role: "ai",
      text: "Assalomu alaykum! Men Sihhat.uz AI yordamchisiman. Sizga qanday davolanish yoki dam olish maskani kerak? Masalan: bel og'rig'i, nafas yo'llari, bolalar salomatligi yoki Zomin sanatoriyasi haqida so'rang.",
    },
  ]);
  const [aiThinking, setAiThinking] = useState(false);

  // Bookings tracker state
  const [bookingLookupQuery, setBookingLookupQuery] = useState("");
  const [bookingLookupResult, setBookingLookupResult] = useState<any>(null);
  const [bookingLookupLoading, setBookingLookupLoading] = useState(false);
  const [bookingLookupError, setBookingLookupError] = useState("");

  // Theme toggle
  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  // Load real catalog data from Backend API
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch("/api/catalog/sanatoriums");
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data) && body.data.length > 0) {
            const apiItems: SanatoriumCardData[] = body.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              region: item.region || "O'zbekiston",
              address: item.address || "",
              meals: item.meals || "3 mahal parhez taomlar",
              description: item.description || "Shifobaxsh tabiiy iqlim va fizioterapiya.",
              directions: item.directions || "Umumiy sog'lomlashtirish va immunitet.",
              services: item.services || ["Fizioterapiya", "Massaj"],
              amenities: item.amenities || ["Wi-Fi", "Avtoturargoh"],
              photo_ids: item.photo_ids || [],
              photos: item.photos || [],
              from_amount: item.from_amount ? (Number(item.from_amount) / 100).toLocaleString("ru-RU") : "5 000",
              price_label: item.price_label || "Boshlang'ich tarif",
              map_url: item.map_url || "",
              check_in_time: item.check_in_time || "08:00",
              check_out_time: item.check_out_time || "18:00",
              required_documents: item.required_documents || "Pasport va sanatoriya kartasi",
              rating: typeof item.rating === "object" && item.rating !== null
                ? (Number(item.rating.average) || 4.8)
                : (Number(item.rating) || 4.8),
              category: item.category || "Davolash maskanlari",
              tag: item.tag || "Tavsiya etiladi",
              room_types: item.room_types || [],
              rate_plans: item.rate_plans || [],
            }));

            // Only display real sanatoriums from database/API
            if (apiItems.length > 0) {
              setSanatoriums(apiItems);
            }
          }
        }
      } catch (e) {
        console.warn("Catalog fetch fallback to local data:", e);
      }
    }
    fetchCatalog();
  }, []);

  // Filter sanatoriums by Category & Search query
  const filteredSanatoriums = useMemo(() => {
    return sanatoriums.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.directions.toLowerCase().includes(q) ||
        item.services.some((s) => s.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === "Barchasi" ||
        item.category === selectedCategory ||
        item.directions.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        item.services.some((s) => s.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchQuery && matchCategory;
    });
  }, [sanatoriums, searchQuery, selectedCategory]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const el = document.getElementById("muassasalar");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  function openCheckout(item: SanatoriumCardData, ratePlan?: RatePlanItem) {
    setActiveModal({ type: "checkout", item, ratePlan });
    setCheckoutError("");
    setCheckoutSuccessUrl("");
    if (ratePlan) {
      setCheckoutSelectedRateId(ratePlan.id);
    } else if (item.rate_plans && item.rate_plans.length > 0) {
      setCheckoutSelectedRateId(item.rate_plans[0].id);
    } else {
      setCheckoutSelectedRateId("");
    }
  }

  function openDetails(item: SanatoriumCardData) {
    setGalleryIndex(0);
    setActiveModal({ type: "details", item });
  }

  // Handle AI Assistant sending
  async function handleSendAiMessage(customPrompt?: string) {
    const text = (customPrompt || aiInputText).trim();
    if (!text) return;

    const newLog = [...aiChatLog, { role: "user" as const, text }];
    setAiChatLog(newLog);
    setAiInputText("");
    setAiThinking(true);

    try {
      // Find matching sanatorium from local or API
      const lower = text.toLowerCase();
      let matchedItem = sanatoriums.find(
        (s) =>
          lower.includes("zomin") ||
          lower.includes("arzon") ||
          lower.includes("5 ming") ||
          lower.includes("5000")
      );
      if (!matchedItem && (lower.includes("bel") || lower.includes("churra") || lower.includes("grija") || lower.includes("bo'g'im"))) {
        matchedItem = sanatoriums.find((s) => s.directions.toLowerCase().includes("bel") || s.name.toLowerCase().includes("hayot")) || sanatoriums[0];
      }
      if (!matchedItem && (lower.includes("mineral") || lower.includes("oshqozon") || lower.includes("chortoq"))) {
        matchedItem = sanatoriums.find((s) => s.directions.toLowerCase().includes("oshqozon") || s.name.toLowerCase().includes("to'maris")) || sanatoriums[3];
      }
      if (!matchedItem) {
        matchedItem = sanatoriums[0];
      }

      await new Promise((r) => setTimeout(r, 600));

      const aiReply =
        lower.includes("zomin") || lower.includes("arzon")
          ? `Siz uchun ajoyib taklif: Zomin Sanatoriyasi dengiz sathidan 2000 metr balandlikda joylashgan bo'lib, nafas yo'llari va toza tog' havosi bilan mashhur. Hozirda ushbu sanatoriyada "Arzon" tarifi bo'yicha maxsus narx — kuniga atigi 5 000 so'm qilib belgilangan! To'lovni to'g'ridan-to'g'ri TezCheck orqali xavfsiz amalga oshirishingiz mumkin.`
          : `Sizning shikoyatingiz va talabingiz bo'yicha biz "${matchedItem.name}"ni tavsiya qilamiz. Bu maskanda malakali shifokorlar, zamonaviy ${matchedItem.services.slice(0, 3).join(", ")} muolajalari mavjud. Boshlang'ich narxi: ${matchedItem.from_amount} so'm/kun.`;

      setAiChatLog([
        ...newLog,
        {
          role: "ai",
          text: aiReply,
          matchId: matchedItem.id,
        },
      ]);
    } catch {
      setAiChatLog([
        ...newLog,
        {
          role: "ai",
          text: "Zomin Sanatoriyasida 5 000 so'mlik 'Arzon' tarifi mavjud. Uni quyidagi tugma orqali ko'rishingiz mumkin.",
          matchId: sanatoriums[0]?.id,
        },
      ]);
    } finally {
      setAiThinking(false);
    }
  }

  // Handle Bookings lookup
  async function handleLookupBooking(e: React.FormEvent) {
    e.preventDefault();
    const query = bookingLookupQuery.trim();
    if (!query) return;

    setBookingLookupLoading(true);
    setBookingLookupError("");
    setBookingLookupResult(null);

    try {
      // Lookup booking via API
      const res = await fetch(`/api/customer/bookings`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        const found = list.find(
          (b: any) =>
            b.reference?.toLowerCase() === query.toLowerCase() ||
            b.guest?.phone?.includes(query.replace(/[\s()-]/g, ""))
        );
        if (found) {
          setBookingLookupResult(found);
          return;
        }
      }
      // Demo lookup fallback
      if (query.toUpperCase().startsWith("SH-") || query.length >= 7) {
        setBookingLookupResult({
          reference: query.toUpperCase().startsWith("SH-") ? query.toUpperCase() : "SH-8F92A1",
          sanatorium_name: "Zomin Sog'lomlik Maskani",
          status: "PAYMENT_PENDING",
          amount: 500000,
          checkIn: "2026-11-05",
          checkOut: "2026-11-06",
          guest: { full_name: "Mehmon", phone: query },
        });
      } else {
        setBookingLookupError("Ushbu ma'lumotlar bo'yicha bron topilmadi.");
      }
    } catch {
      setBookingLookupError("Bronni tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setBookingLookupLoading(false);
    }
  }

  return (
    <div className="landing-page">
      {/* ========================================================
          1. HEADER / NAVBAR
          ======================================================== */}
      <header className="landing-header">
        <div className="landing-nav-container">
          {/* Logo */}
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img
              src="/branding/sihhat-logo.png"
              alt="Sihhat uz logosi"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                objectFit: "contain",
                boxShadow: "0 2px 8px rgba(0, 89, 68, 0.2)",
                flexShrink: 0,
              }}
            />
            <div className="brand-text-wrap">
              <span className="brand-title">SIHHAT UZ</span>
              <span className="brand-tagline">Sog'lomlik sari</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="landing-nav-links">
            <button
              type="button"
              className={`nav-item-btn ${selectedCategory === "Barchasi" ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory("Barchasi");
                setSearchQuery("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Bosh sahifa
            </button>

            {/* Muassasalar Dropdown */}
            <div className="nav-dropdown-wrap">
              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
              >
                <span>Muassasalar</span>
                <ChevronDown size={14} />
              </button>
              {navDropdownOpen && (
                <div className="nav-dropdown-menu">
                  <button
                    type="button"
                    className="nav-dropdown-item"
                    onClick={() => {
                      setSelectedCategory("Barchasi");
                      setNavDropdownOpen(false);
                      document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span>Barcha muassasalar</span>
                    <Check size={14} />
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="nav-dropdown-item"
                      onClick={() => {
                        setSelectedCategory(cat.title);
                        setNavDropdownOpen(false);
                        document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span>{cat.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="nav-item-btn"
              onClick={() => setActiveModal("ai")}
            >
              <Sparkles size={16} style={{ color: "#10b981" }} />
              <span>AI yordamchi</span>
            </button>

            <button
              type="button"
              className="nav-item-btn"
              onClick={() => {
                document.getElementById("qanday-ishlaydi")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Biz haqimizda
            </button>

            <button
              type="button"
              className="nav-item-btn"
              onClick={() => setActiveModal("contact")}
            >
              Aloqa
            </button>
          </nav>

          {/* Nav Actions */}
          <div className="landing-nav-actions">
            <a
              href="tel:+998882952028"
              className="nav-phone-link"
              title="Qo'ng'iroq qilish: +998 88 295 20 28"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#005944",
                background: "rgba(0, 89, 68, 0.08)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Phone size={15} />
              <span>+998 88 295 20 28</span>
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Mavzuni o'zgartirish"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("login")}
              className="btn-nav-login"
            >
              <User size={16} />
              <span>Kirish</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBookingLookupResult(null);
                setBookingLookupError("");
                setActiveModal("bookings");
              }}
              className="btn-nav-bookings"
            >
              <Calendar size={16} />
              <span>Bronlarim</span>
            </button>

            <a
              href="/api/download/apk"
              download="sihhat-uz.apk"
              className="btn-nav-download"
              title="Android ilovasini yuklab olish"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #005944 0%, #008f6b 100%)",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(0,89,68,0.25)",
              }}
            >
              <Smartphone size={16} />
              <span>APK yuklab olish</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. HERO SECTION
          ======================================================== */}
      <section className="hero-section">
        <div className="hero-grid">
          {/* Left Column */}
          <div className="hero-left">
            <div className="hero-badge-pill">
              <Sparkles size={14} />
              <span>SIHHAT UZ — Zamonaviy sog'lomlashtirish platformasi</span>
            </div>

            <h1 className="hero-title">
              Sog'lig'ingiz uchun
              <span className="hero-title-accent">eng to'g'ri tanlovni toping</span>
            </h1>

            <p className="hero-subtitle">
              AI yordamida ehtiyojingizga mos sog'lomlashtirish maskanini toping va bron qiling.
            </p>

            {/* AI Search Card */}
            <form className="hero-search-card" onSubmit={handleSearchSubmit}>
              <div className="search-ai-chip">AI</div>
              <div className="search-inputs-wrap">
                <span className="search-prompt-label">Qanday davolanish yoki dam olishni xohlaysiz?</span>
                <input
                  type="text"
                  className="search-text-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Masalan: bel og'rig'i uchun fizioterapiya kerak..."
                />
              </div>
              <button type="submit" className="btn-hero-search">
                <Search size={16} />
                <span>Topish →</span>
              </button>
            </form>

            {/* Trust Badges */}
            <div className="hero-trust-row">
              <div className="hero-trust-badge">
                <CheckCircle2 size={18} className="trust-icon-green" />
                <span>Ishonchli xizmat</span>
              </div>
              <div className="hero-trust-badge">
                <Zap size={18} className="trust-icon-green" />
                <span>Tez bron</span>
              </div>
              <div className="hero-trust-badge">
                <Headphones size={18} className="trust-icon-green" />
                <span>24/7 qo'llab-quvvatlash</span>
              </div>
            </div>

            {/* Quick APK Download Action */}
            <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <a
                href="/api/download/apk"
                download="sihhat-uz.apk"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 20px",
                  borderRadius: 12,
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(135deg, #005944 0%, #008f6b 100%)",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(0, 89, 68, 0.25)",
                }}
              >
                <Smartphone size={18} />
                <span>Sihhat uz ilovasini yuklab olish (.APK)</span>
              </a>
              <a
                href="tel:+998882952028"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                <Phone size={15} style={{ color: "#005944" }} />
                <span>Aloqa: <strong style={{ color: "#005944" }}>+998 88 295 20 28</strong></span>
              </a>
            </div>
          </div>

          {/* Right Column: Hero Resort Visual */}
          <div className="hero-right">
            <div className="hero-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                alt="Sihhat uz Zamonaviy Sanatoriyalar"
                className="hero-resort-img"
              />
              <div className="hero-floating-pill" onClick={() => setActiveModal("ai")}>
                <Sparkles size={16} style={{ color: "#10b981" }} />
                <span>AI yordamida mos joyni toping</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. CATEGORIES SECTION (Turlar bo'yicha tanlang)
          ======================================================== */}
      <section className="section-container">
        <div className="section-head-bar">
          <h2 className="section-headline">Turlar bo'yicha tanlang</h2>
          <button
            type="button"
            className="btn-see-all-pill"
            onClick={() => {
              setSelectedCategory("Barchasi");
              document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>Barchasi →</span>
          </button>
        </div>

        <div className="categories-grid">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.title;
            return (
              <div
                key={cat.id}
                className="category-card"
                style={isSelected ? { outline: "3px solid #005944" } : {}}
                onClick={() => {
                  setSelectedCategory(cat.title);
                  document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <img src={cat.image} alt={cat.title} className="category-card-bg" />
                <div className="category-card-overlay">
                  <div className="category-label-group">
                    <Icon size={18} />
                    <span>{cat.title}</span>
                  </div>
                  <div className="category-circle-arrow">
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          4. POPULAR SANATORIUMS (Mashhur muassasalar)
          ======================================================== */}
      <section id="muassasalar" className="section-container">
        <div className="section-head-bar">
          <div>
            <h2 className="section-headline">Mashhur muassasalar</h2>
            {selectedCategory !== "Barchasi" && (
              <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: 700 }}>
                Filtr: {selectedCategory} (
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#005944", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  onClick={() => setSelectedCategory("Barchasi")}
                >
                  tozalash
                </button>
                )
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-see-all-pill"
            onClick={() => {
              setSelectedCategory("Barchasi");
              setSearchQuery("");
            }}
          >
            <span>Barchasini ko'rish →</span>
          </button>
        </div>

        {filteredSanatoriums.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--surface)", borderRadius: 20 }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
              Tanlangan so'rov bo'yicha muassasa topilmadi.
            </p>
            <button
              type="button"
              className="btn-card-detail"
              style={{ marginTop: 12 }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("Barchasi");
              }}
            >
              Barcha muassasalarni ko'rish
            </button>
          </div>
        ) : (
          <div className="sanatoriums-grid">
            {filteredSanatoriums.map((item) => {
              const photo =
                (item.photos && item.photos.length > 0)
                  ? item.photos[0]
                  : (item.photo_ids && item.photo_ids.length > 0)
                  ? `/api/media/${item.photo_ids[0]}`
                  : "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80";

              return (
                <div key={item.id} className="sanatorium-card">
                  <div className="card-media-box" onClick={() => openDetails(item)} style={{ cursor: "pointer" }}>
                    <img src={photo} alt={item.name} className="card-thumb-img" />
                    <div className="card-rating-pill">
                      <Star size={14} className="rating-star-icon" />
                      <span>{typeof item.rating === "number" ? item.rating.toFixed(1) : (typeof item.rating === "object" && item.rating ? Number((item.rating as any).average || 4.8).toFixed(1) : "4.8")}</span>
                    </div>
                  </div>

                  <div className="card-body-box">
                    <h3 className="card-title-text" onClick={() => openDetails(item)} style={{ cursor: "pointer" }}>
                      {item.name}
                    </h3>

                    <div className="card-location-row">
                      <MapPin size={13} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span>{item.region}</span>
                    </div>

                    <div className="card-tags-row">
                      {item.services.slice(0, 2).map((srv, idx) => (
                        <span key={idx} className="card-feature-tag">
                          <MapPin size={11} style={{ color: "#0d9488" }} />
                          <span>{srv}</span>
                        </span>
                      ))}
                    </div>

                    <div className="card-footer-row">
                      <div className="card-price-display">
                        <span className="card-price-num">{item.from_amount} so'm/kun</span>
                      </div>

                      <button
                        type="button"
                        className="btn-card-detail"
                        onClick={() => openDetails(item)}
                      >
                        <span>Batafsil →</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================
          5. HOW IT WORKS BANNER (SIHHAT UZ qanday ishlaydi?)
          ======================================================== */}
      <section id="qanday-ishlaydi" className="section-container" style={{ paddingTop: "1rem" }}>
        <div className="how-it-works-banner">
          {/* Left Title */}
          <div className="how-banner-left">
            <h2 className="how-banner-title">
              SIHHAT UZ<br />qanday ishlaydi?
            </h2>
            <p className="how-banner-desc">
              Atigi 3 qadamda o'z sog'lig'ingiz uchun eng yaxshi joyni toping!
            </p>
          </div>

          {/* 3 Steps */}
          <div className="how-steps-track">
            <div className="how-step-node">
              <div className="how-step-badge">1</div>
              <div className="how-step-title">Qidirish</div>
              <div className="how-step-text">Ehtiyojingizni yozing va mos joylarni toping</div>
            </div>

            <div className="how-step-arrow">&gt;</div>

            <div className="how-step-node">
              <div className="how-step-badge">2</div>
              <div className="how-step-title">Bron qilish</div>
              <div className="how-step-text">Qulay sanani tanlab, bron qiling</div>
            </div>

            <div className="how-step-arrow">&gt;</div>

            <div className="how-step-node">
              <div className="how-step-badge">3</div>
              <div className="how-step-title">Dam oling</div>
              <div className="how-step-text">Sog'lig'ingiz uchun xotirjam bo'ling</div>
            </div>
          </div>

          {/* Right Brand Badge */}
          <div className="how-banner-right">
            <div className="how-brand-badge">
              <div
                className="how-brand-logo-circle"
                style={{
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff",
                  padding: 4,
                }}
              >
                <img
                  src="/branding/sihhat-logo.png"
                  alt="Sihhat uz"
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
                />
              </div>
              <span className="how-brand-name">SIHHAT UZ</span>
            </div>
            <span className="how-brand-slogan">Sog'lom hayot — baxt kaliti!</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          5.5 APP DOWNLOAD SECTION
          ======================================================== */}
      <section id="ilovani-yuklash" className="section-container" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #003d2f 0%, #005944 50%, #047857 100%)",
            borderRadius: 24,
            padding: "2.5rem 2rem",
            color: "#fff",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
            boxShadow: "0 12px 32px rgba(0, 89, 68, 0.25)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Left info */}
          <div style={{ flex: "1 1 480px", maxWidth: 640 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.15)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "1rem",
                backdropFilter: "blur(4px)",
              }}
            >
              <Smartphone size={16} />
              <span>Sihhat uz rasmiy Android ilovasi</span>
            </div>

            <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 0.75rem 0", lineHeight: 1.25 }}>
              Sog'lomlashtirish maskanlari endi cho'ntagingizda!
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", lineHeight: 1.5, opacity: 0.9 }}>
              Ilovani o'rnating va O'zbekistonning barcha sanatoriylari, xonalar, narxlar hamda qulay sanalarni telefoningizda ko'ring. Bir klik orqali bron qiling va TezCheck orqali xavfsiz to'lovni amalga oshiring.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              <a
                href="/api/download/apk"
                download="sihhat-uz.apk"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fff",
                  color: "#005944",
                  fontWeight: 700,
                  fontSize: "1rem",
                  padding: "12px 24px",
                  borderRadius: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                }}
              >
                <Download size={20} />
                <span>APK Yuklab Olish (59.6 MB)</span>
              </a>

              <a
                href="tel:+998882952028"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  padding: "12px 18px",
                  borderRadius: 14,
                  textDecoration: "none",
                  backdropFilter: "blur(4px)",
                }}
              >
                <Phone size={18} />
                <span>+998 88 295 20 28</span>
              </a>
            </div>
          </div>

          {/* Right visual: App Icon + Features */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "1.25rem 1.75rem",
              borderRadius: 20,
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <img
              src="/branding/sihhat-logo.png"
              alt="Sihhat uz APK"
              style={{
                width: 96,
                height: 96,
                borderRadius: 20,
                objectFit: "cover",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>Sihhat.uz Mobile</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>Versiya 0.1.1 (Android)</span>
              <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>✓ Tezkor va qulay bron</span>
              <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>✓ TezCheck to'lov integratsiyasi</span>
              <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>✓ 24/7 call-markaz</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Legal and Info */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "2.5rem 1.25rem 3rem" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <img
                src="/branding/sihhat-logo.png"
                alt="Sihhat uz"
                style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }}
              />
              <strong style={{ fontSize: "1.1rem", color: "var(--text-main)" }}>SIHHAT UZ</strong>
            </div>
            <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              © 2026 Sihhat.uz · O'zbekiston milliy sog'lomlashtirish va sanatoriylar platformasi.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <Phone size={14} style={{ color: "#005944" }} />
              <span>Call-markaz (24/7):</span>
              <a href="tel:+998882952028" style={{ fontWeight: 700, color: "#005944", textDecoration: "none" }}>
                +998 88 295 20 28
              </a>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <button
              type="button"
              onClick={() => setActiveModal("oferta")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}
            >
              Ommaviy oferta
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("maxfiylik")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}
            >
              Maxfiylik siyosati
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("qaytarish")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}
            >
              Qaytarish shartlari
            </button>
            <a
              href="/api/download/apk"
              download="sihhat-uz.apk"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#005944",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Smartphone size={14} />
              <span>Android APK</span>
            </a>
            <button
              type="button"
              onClick={() => setActiveModal("contact")}
              style={{ background: "none", border: "none", color: "#005944", fontWeight: 700, cursor: "pointer" }}
            >
              Yordam va aloqa
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================
          6. MODALS
          ======================================================== */}

      {/* 6.1 SANATORIUM DETAILS MODAL */}
      {activeModal && typeof activeModal === "object" && activeModal.type === "details" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 740 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div>
                <h3 className="legal-modal-title">{activeModal.item.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {activeModal.item.region} · {activeModal.item.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body">
              {/* Photo Carousel */}
              {(() => {
                const photos =
                  activeModal.item.photos && activeModal.item.photos.length > 0
                    ? activeModal.item.photos
                    : activeModal.item.photo_ids && activeModal.item.photo_ids.length > 0
                    ? activeModal.item.photo_ids.map((id) => `/api/media/${id}`)
                    : ["https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"];

                return (
                  <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 16, overflow: "hidden", marginBottom: "1.25rem", background: "#000" }}>
                    <img
                      src={photos[galleryIndex % photos.length]}
                      alt={activeModal.item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex((i) => (i - 1 + photos.length) % photos.length)}
                          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex((i) => (i + 1) % photos.length)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <ChevronRight size={20} />
                        </button>
                        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700 }}>
                          {(galleryIndex % photos.length) + 1} / {photos.length}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>Ta'rif va sharoitlar</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: 0 }}>
                {activeModal.item.description}
              </p>

              <h4 style={{ margin: "1rem 0 6px", fontSize: "1.05rem" }}>Davolash yo'nalishlari</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: 0 }}>
                {activeModal.item.directions}
              </p>

              {/* Rate Plans & Pricing */}
              {activeModal.item.rate_plans && activeModal.item.rate_plans.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Tariflar va narxlar</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                    {activeModal.item.rate_plans.map((rp) => (
                      <div
                        key={rp.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          background: "var(--surface-soft)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong style={{ color: "#005944", fontSize: "0.98rem", display: "block" }}>
                            {rp.name}
                          </strong>
                          <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-main)" }}>
                            {(Number(rp.baseAmount) / 100).toLocaleString("ru-RU")} so'm / kun
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCheckout(activeModal.item, rp)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 9999,
                            background: "#005944",
                            color: "#fff",
                            border: "none",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          To'lash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services & Amenities */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Tibbiy xizmatlar</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {activeModal.item.services.map((srv, i) => (
                      <li key={i}>{srv}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Qulayliklar</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {activeModal.item.amenities.map((am, i) => (
                      <li key={i}>{am}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {activeModal.item.map_url && (
                <div style={{ marginTop: "1.25rem" }}>
                  <a
                    href={activeModal.item.map_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "#005944", textDecoration: "none", fontWeight: 700, fontSize: "0.88rem" }}
                  >
                    <MapPin size={16} />
                    <span>Google Maps'da xaritada ko'rish</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => openCheckout(activeModal.item)}
                className="btn-card-detail"
                style={{ padding: "0.75rem 1.6rem", fontSize: "0.95rem" }}
              >
                <CreditCard size={18} />
                <span>TezCheck orqali to'lash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.2 TEZCHECK ONLINE CHECKOUT MODAL */}
      {activeModal && typeof activeModal === "object" && activeModal.type === "checkout" && (
        <div className="legal-modal-backdrop" onClick={() => !checkoutLoading && setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div>
                <h3 className="legal-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={22} style={{ color: "#10b981" }} />
                  <span>TezCheck orqali to'lov</span>
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {activeModal.item.name} · {activeModal.item.region}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !checkoutLoading && setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body">
              {checkoutSuccessUrl ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--primary-light)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                    <Check size={36} />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem" }}>TezCheck sahifasi ochildi!</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                    To'lov xavfsiz rasmiy TezCheck tizimida amalga oshiriladi (Click, Payme, Uzcard / Humo).
                  </p>
                  <a
                    href={checkoutSuccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-card-detail"
                    style={{ display: "inline-flex", gap: 8, padding: "0.8rem 1.6rem", textDecoration: "none" }}
                  >
                    <span>To'lov sahifasiga qaytadan o'tish</span>
                    <ExternalLink size={18} />
                  </a>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCheckoutError("");
                    setCheckoutLoading(true);
                    try {
                      const res = await fetch("/api/payments/quick-checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          sanatorium_id: activeModal.item.id,
                          rate_plan_id: checkoutSelectedRateId || undefined,
                          guest_name: checkoutGuestName.trim(),
                          guest_phone: checkoutGuestPhone.trim().replace(/[\s()-]/g, ""),
                          check_in: checkoutCheckIn,
                          nights: Number(checkoutNights) || 1,
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        throw new Error(json.message || "To'lov hisobini yaratishda xatolik yuz berdi");
                      }
                      setCheckoutSuccessUrl(json.checkout_url);
                      window.open(json.checkout_url, "_blank");
                    } catch (err: any) {
                      setCheckoutError(err.message || "Xatolik yuz berdi");
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                  {/* Rate plan picker */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                      Tanlangan tarif
                    </label>
                    <select
                      value={checkoutSelectedRateId}
                      onChange={(e) => setCheckoutSelectedRateId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-main)",
                        fontSize: "0.95rem",
                      }}
                    >
                      {activeModal.item.rate_plans && activeModal.item.rate_plans.length > 0 ? (
                        activeModal.item.rate_plans.map((rp) => (
                          <option key={rp.id} value={rp.id}>
                            {rp.name} — {(Number(rp.baseAmount) / 100).toLocaleString("ru-RU")} so'm / kun
                          </option>
                        ))
                      ) : (
                        <option value="">Asosiy tarif — {activeModal.item.from_amount} so'm / kun</option>
                      )}
                    </select>
                  </div>

                  {/* Name and Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                        Ism va familiya *
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutGuestName}
                        onChange={(e) => setCheckoutGuestName(e.target.value)}
                        placeholder="Masalan, Mirsaid Ibrohimov"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                        Telefon raqam *
                      </label>
                      <input
                        type="tel"
                        required
                        value={checkoutGuestPhone}
                        onChange={(e) => setCheckoutGuestPhone(e.target.value)}
                        placeholder="+998901234567"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                        Kelish sanasi *
                      </label>
                      <input
                        type="date"
                        required
                        value={checkoutCheckIn}
                        onChange={(e) => setCheckoutCheckIn(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                        Kunlar soni
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={checkoutNights}
                        onChange={(e) => setCheckoutNights(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Safety note */}
                  <div
                    style={{
                      background: "var(--primary-light)",
                      border: "1px solid var(--primary-border)",
                      borderRadius: 12,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <ShieldCheck size={20} style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                      <strong style={{ color: "#005944", display: "block", marginBottom: 2 }}>
                        Plastik karta raqami talab qilinmaydi
                      </strong>
                      Tugmani bosganingizda to'lov to'g'ridan-to'g'ri rasmiy <strong>TezCheck</strong> sahifasida (Click, Payme, Uzcard / Humo) xavfsiz amalga oshiriladi.
                    </div>
                  </div>

                  {checkoutError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.85rem" }}>
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="btn-card-detail"
                    style={{
                      padding: "0.9rem 1.4rem",
                      fontSize: "1rem",
                      justifyContent: "center",
                      cursor: checkoutLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {checkoutLoading ? (
                      <span>TezCheck sahifasi ochilmoqda…</span>
                    ) : (
                      <>
                        <span>TezCheck orqali to'lash</span>
                        <ExternalLink size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6.3 AI YORDAMCHI CHAT MODAL */}
      {activeModal === "ai" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 620, height: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="legal-modal-title" style={{ fontSize: "1.1rem" }}>Sihhat AI Yordamchi</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Siz uchun eng to'g'ri sanatoriyani tanlab beradi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {aiChatLog.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    background: msg.role === "user" ? "#005944" : "var(--surface-soft)",
                    color: msg.role === "user" ? "#ffffff" : "var(--text-main)",
                    borderRadius: 16,
                    padding: "10px 14px",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  {msg.matchId && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = sanatoriums.find((s) => s.id === msg.matchId);
                        if (target) {
                          setActiveModal({ type: "details", item: target });
                        }
                      }}
                      style={{
                        marginTop: 8,
                        padding: "6px 12px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>Sanatoriyani ko'rish va bron qilish</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ))}
              {aiThinking && (
                <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                  AI eng maqbul sanatoriyalarni tahlil qilmoqda…
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div style={{ padding: "0 1.25rem 0.5rem", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Zomin sanatoriyasi (5 000 so'm arzon tarif)")}
                style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 9999, padding: "4px 10px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}
              >
                🏔️ Zomin (5 000 so'm)
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Bel va umurtqa og'rig'i uchun qayer yaxshi?")}
                style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 9999, padding: "4px 10px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}
              >
                🦴 Bel va bo'g'im
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Bolalar salomatligi uchun mos sanatoriya")}
                style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 9999, padding: "4px 10px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}
              >
                👶 Bolalar salomatligi
              </button>
            </div>

            {/* Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiMessage();
              }}
              style={{ padding: "0.75rem 1.25rem 1.25rem", display: "flex", gap: 8, borderTop: "1px solid var(--border-subtle)" }}
            >
              <input
                type="text"
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Savolingizni yozing (masalan, bel og'rig'iga nima yaxshi?)..."
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: 9999,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-main)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#005944",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6.4 BRONLARIM TRACKER MODAL */}
      {activeModal === "bookings" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={20} style={{ color: "#005944" }} />
                <span>Bronlarimni tekshirish</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body">
              <form onSubmit={handleLookupBooking} style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  required
                  value={bookingLookupQuery}
                  onChange={(e) => setBookingLookupQuery(e.target.value)}
                  placeholder="Bron raqami (SH-...) yoki telefon (+998)"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                  }}
                />
                <button type="submit" disabled={bookingLookupLoading} className="btn-card-detail" style={{ borderRadius: 12 }}>
                  {bookingLookupLoading ? "Qidirilmoqda…" : "Qidirish"}
                </button>
              </form>

              {bookingLookupError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {bookingLookupError}
                </div>
              )}

              {bookingLookupResult && (
                <div style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>
                      {bookingLookupResult.sanatorium_name || "Sanatoriya"}
                    </strong>
                    <span style={{ padding: "4px 10px", borderRadius: 9999, fontSize: "0.75rem", fontWeight: 800, background: bookingLookupResult.status === "CONFIRMED" ? "#ecfdf5" : "#fffbeb", color: bookingLookupResult.status === "CONFIRMED" ? "#059669" : "#d97706" }}>
                      {bookingLookupResult.status === "CONFIRMED" ? "Tasdiqlangan" : "To'lov kutilmoqda"}
                    </span>
                  </div>

                  <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Bron raqami: <strong>{bookingLookupResult.reference}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Sanalar: {bookingLookupResult.checkIn?.slice(0, 10)} — {bookingLookupResult.checkOut?.slice(0, 10)}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Summa: <strong>{(Number(bookingLookupResult.amount) / 100).toLocaleString("ru-RU")} so'm</strong>
                  </p>

                  {bookingLookupResult.status === "PAYMENT_PENDING" && (
                    <button
                      type="button"
                      className="btn-card-detail"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        const target = sanatoriums[0];
                        openCheckout(target);
                      }}
                    >
                      <CreditCard size={16} />
                      <span>TezCheck orqali to'lash</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6.5 ALOQA MODAL */}
      {activeModal === "contact" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Bog'lanish va qo'llab-quvvatlash</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-light)", color: "#005944", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Yagona call-markaz (24/7):</div>
                  <a
                    href="tel:+998882952028"
                    style={{ fontSize: "1.05rem", fontWeight: 700, color: "#005944", textDecoration: "none" }}
                  >
                    +998 88 295 20 28
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--teal-light)", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Telegram operator:</div>
                  <strong style={{ fontSize: "1.05rem" }}>@sihhat_support_bot</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-light)", color: "#005944", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bosh ofis:</div>
                  <span style={{ fontSize: "0.9rem" }}>Toshkent shahri, Shayxontohur tumani, Navoiy ko'chasi 11A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6.6 KIRISH MODAL */}
      {activeModal === "login" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Tizimga kirish</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Qaysi panelga kirishni xohlaysiz?
              </p>
              <a
                href="/superadmin"
                className="btn-card-detail"
                style={{ padding: "0.85rem 1.25rem", textDecoration: "none", justifyContent: "center", fontSize: "0.95rem" }}
              >
                <span>Superadmin paneli (Platforma)</span>
                <ArrowRight size={16} />
              </a>
              <a
                href="/hamkorlar"
                style={{
                  padding: "0.85rem 1.25rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  borderRadius: 9999,
                  border: "1px solid var(--border)",
                  color: "var(--text-main)",
                  background: "var(--surface-soft)",
                }}
              >
                <span>Hamkorlar paneli (Direktor & Resepshn)</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6.7 OFERTA MODAL */}
      {activeModal === "oferta" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Ommaviy Oferta</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>Sihhat.uz orqali sanatoriylarni bron qilish bo'yicha ommaviy kelishuv shartlari.</p>
              <p>Mijoz va Sanatoriya o'rtasidagi munosabatlar O'zbekiston Respublikasi qonunchiligi asosida tartibga solinadi.</p>
            </div>
          </div>
        </div>
      )}

      {/* 6.8 MAXFIYLIK MODAL */}
      {activeModal === "maxfiylik" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Maxfiylik Siyosati</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>Foydalanuvchilarning shaxsiy ma'lumotlari xavfsiz saqlanadi va uchinchi shaxslarga berilmaydi.</p>
            </div>
          </div>
        </div>
      )}

      {/* 6.9 QAYTARISH MODAL */}
      {activeModal === "qaytarish" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Pulni qaytarish shartlari</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>Bron bekor qilinganda mablag' belgilangan muddat ichida to'liq qaytariladi.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
