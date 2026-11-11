"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Heart,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Moon,
  Phone,
  RefreshCw,
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
  medical_requirements?: string;
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

const FALLBACK_SANATORIUMS: SanatoriumCardData[] = [
  {
    id: "4a84ecf9-0f07-47dc-819d-dfb2f82ab6e3",
    name: "Zomin Sog'lomlik Maskani",
    region: "Jizzax viloyati, Zomin tumani",
    address: "Zomin milliy tabiat bog'i, Duoba qishlog'i",
    category: "Davolash maskanlari",
    tag: "🏔️ 2000m Tog' havosi",
    meals: "3 mahal parhez va milliy taomlar",
    description:
      "Dengiz sathidan 2000 metr balandlikda, toza tog' va ignabargli archazorlar bag'rida joylashgan eng yirik iqlimiy kurort. Toza tog' havosi va zamonaviy fizioterapiya majmuasi.",
    directions:
      "Nafas a'zolari (bronxial astma, surunkali bronxit), asab tizimi, tayanch-harakat a'zolari va umumiy immunitetni tiklash.",
    services: [
      "Fizioterapiya",
      "Massaj",
      "Tuzli g'or (Speleoterapiya)",
      "Ingalyatsiya",
      "Balchiq bilan davolash",
    ],
    amenities: [
      "Wi-Fi",
      "Yopiq basseyn",
      "Sauna & Jakuzi",
      "Tennis korti",
      "Avtoturargoh",
      "Lift",
    ],
    from_amount: "5 000",
    price_label: "Hamyonbop 'Arzon' tarifi (5 000 so'm) va to'liq davolash bilan",
    map_url:
      "https://www.google.com/maps/place/Zomin+sanatoriysi/@39.6342404,68.4998058,434m/data=!3m1!1e3",
    check_in_time: "08:00",
    check_out_time: "20:00",
    required_documents: "Pasport, sanatoriya-kurort kartasi (mavjud bo'lsa)",
    child_rules: "Barcha yoshdagi bolalar qabul qilinadi",
    rating: 4.9,
    photos: ["/branding/wellness-retreat.png"],
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

const CATEGORIES = [
  {
    id: "davolash",
    title: "Davolash maskanlari",
    icon: Bed,
    image: "/branding/wellness-retreat.png",
  },
  {
    id: "bolalar",
    title: "Bolalar salomatligi",
    icon: Baby,
    image: "/branding/welcome-retreat.png",
  },
  {
    id: "reabilitatsiya",
    title: "Reabilitatsiya",
    icon: Activity,
    image: "/branding/wellness-retreat.png",
  },
  {
    id: "wellness",
    title: "Dam olish va wellness",
    icon: Sparkles,
    image: "/branding/welcome-retreat.png",
  },
];

const AI_QUICK_CHIPS = [
  { label: "🏔️ Zomin · Tog' havosi", query: "Zomin" },
  { label: "💧 Mineral suvlar", query: "mineral" },
  { label: "🦴 Bel va bo'g'im", query: "bel" },
  { label: "🌬️ Nafas yo'llari", query: "nafas" },
];

const APK_RELEASE_URL =
  "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/tree/main/ilova";

function safeFallbackImage(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "1";
  img.src = "/branding/welcome-retreat.png";
}

/** Lazy-loaded photo with APK shimmer backdrop until decoded */
function ShimmeryImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!loaded && (
        <div
          className="l-shimmer-box"
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.35s ease, transform 0.45s ease",
        }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          safeFallbackImage(e);
          setLoaded(true);
        }}
      />
    </div>
  );
}

function resolvePrimaryPhoto(item: SanatoriumCardData): string {
  if (item.photos && item.photos.length > 0) return item.photos[0];
  if (item.photo_ids && item.photo_ids.length > 0) {
    return `/api/media/${item.photo_ids[0]}`;
  }
  return "/branding/wellness-retreat.png";
}

/** APK-inspired blinking robot SVG matching RobotFace in apps/mobile/lib/neon.dart */
function RobotFaceSvg({ size = 46 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sihhatRobotGrad" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8ff5dc" />
          <stop offset="50%" stopColor="#3ee6bf" />
          <stop offset="100%" stopColor="#16b38f" />
        </linearGradient>
      </defs>
      {/* Headphone arc & ear cups */}
      <path
        d="M20 58 C20 26, 100 26, 100 58"
        stroke="url(#sihhatRobotGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="10" y="48" width="16" height="32" rx="7" fill="url(#sihhatRobotGrad)" />
      <rect x="94" y="48" width="16" height="32" rx="7" fill="url(#sihhatRobotGrad)" />
      {/* Robot head */}
      <rect x="24" y="34" width="72" height="62" rx="20" fill="url(#sihhatRobotGrad)" />
      {/* Dark visor */}
      <rect x="33" y="46" width="54" height="38" rx="13" fill="#021a17" />
      {/* Blinking eyes */}
      <rect className="l-robot-eye" x="44" y="55" width="8" height="12" rx="4" fill="#3ee6bf" />
      <rect className="l-robot-eye" x="68" y="55" width="8" height="12" rx="4" fill="#3ee6bf" />
      {/* Smile */}
      <path
        d="M52 73 Q60 79 68 73"
        stroke="#3ee6bf"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Flowing neon wave ribbons adapted from NeonWaves in apps/mobile/lib/neon.dart */
function NeonWavesSvg() {
  return (
    <svg
      className="l-waves-svg"
      viewBox="0 0 1200 420"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="l-wave-path"
        d="M-60 130 Q 240 40, 560 130 T 1260 120"
        fill="none"
        stroke="#3ee6bf"
        strokeWidth="2.5"
        strokeOpacity="0.55"
      />
      <path
        className="l-wave-path-2"
        d="M-60 175 Q 300 265, 640 165 T 1260 190"
        fill="none"
        stroke="#8ff5dc"
        strokeWidth="1.6"
        strokeOpacity="0.32"
      />
      <path
        className="l-wave-path"
        d="M-60 320 Q 340 230, 680 325 T 1260 300"
        fill="none"
        stroke="#3ee6bf"
        strokeWidth="3"
        strokeOpacity="0.48"
      />
    </svg>
  );
}

/** Subtle diagonal aurora light streaks inspired by LightStreaks in apps/mobile/lib/neon.dart */
function LightStreaksSvg() {
  return (
    <svg
      className="l-light-streaks"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sihhatStreak" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3ee6bf" stopOpacity="0" />
          <stop offset="50%" stopColor="#3ee6bf" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#3ee6bf" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="620" y1="-20" x2="1500" y2="210" stroke="url(#sihhatStreak)" strokeWidth="2" />
      <line x1="940" y1="-10" x2="1490" y2="120" stroke="url(#sihhatStreak)" strokeWidth="1.4" />
      <line x1="-60" y1="620" x2="540" y2="920" stroke="url(#sihhatStreak)" strokeWidth="1.6" />
    </svg>
  );
}

function TypingDots() {
  return (
    <span className="l-typing-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/** APK Shimmer glass skeleton card grid while catalog is loading */
function SanatoriumSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="l-sanatoriums-grid" aria-busy="true" aria-label="Sanatoriyalar yuklanmoqda">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="l-skeleton-card">
          <div className="l-shimmer-box l-skeleton-media" />
          <div className="l-shimmer-box l-skeleton-bar" style={{ width: "68%" }} />
          <div className="l-shimmer-box l-skeleton-bar" style={{ width: "44%", height: 12 }} />
          <div className="l-skeleton-pills">
            <div className="l-shimmer-box l-skeleton-pill" style={{ width: 68 }} />
            <div className="l-shimmer-box l-skeleton-pill" style={{ width: 88 }} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 8,
            }}
          >
            <div className="l-shimmer-box l-skeleton-bar" style={{ width: "42%", height: 18 }} />
            <div className="l-shimmer-box" style={{ width: 96, height: 34, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function mapCatalogItem(item: any): SanatoriumCardData {
  return {
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
    from_amount: item.from_amount
      ? (Number(item.from_amount) / 100).toLocaleString("ru-RU")
      : "450 000",
    price_label: item.price_label || "Boshlang'ich tarif",
    map_url: item.map_url || "",
    check_in_time: item.check_in_time || "08:00",
    check_out_time: item.check_out_time || "18:00",
    required_documents: item.required_documents || "Pasport va sanatoriya kartasi",
    rating:
      typeof item.rating === "object" && item.rating !== null
        ? Number(item.rating.average) || 4.8
        : Number(item.rating) || 4.8,
    category: item.category || "Davolash maskanlari",
    tag: item.tag || item.services?.[0] || "Tavsiya etiladi",
    room_types: item.room_types || [],
    rate_plans: item.rate_plans || [],
  };
}

export function LandingPage() {
  const [sanatoriums, setSanatoriums] = useState<SanatoriumCardData[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Dark-first theme matching APK AppearanceController (only explicit day mode switches to light)
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Initial branded APK splash overlay & top scroll progress
  const [splashPhase, setSplashPhase] = useState<"visible" | "leaving" | "hidden">("visible");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeScrollSection, setActiveScrollSection] = useState<
    "home" | "catalog" | "how" | "app"
  >("home");
  const scrollTargetLockRef = useRef<{
    section: "home" | "catalog" | "how" | "app";
    until: number;
  } | null>(null);

  // Filters & Favorites (persisted locally like APK Favorites)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [selectedRegion, setSelectedRegion] = useState("Barchasi");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

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
  const [aiChatLog, setAiChatLog] = useState<
    Array<{ role: "ai" | "user"; text: string; matchId?: string }>
  >([
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

  // Published ads (HOME & POPUP)
  const [ads, setAds] = useState<any[]>([]);
  const [activePopupAd, setActivePopupAd] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const dismissSplash = useCallback(() => {
    setSplashPhase((prev) => (prev === "visible" ? "leaving" : prev));
  }, []);

  // Hydrate theme preference, local favorites, splash timing & scroll bar
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sihhat-landing-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
      const savedFavs = localStorage.getItem("sihhat-landing-favorites");
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) setFavorites(new Set(parsed.map(String)));
      }
    } catch {
      // Ignore storage access failures in strict privacy environments
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduced) {
      setSplashPhase("hidden");
    } else {
      const leaveTimer = window.setTimeout(() => setSplashPhase("leaving"), 520);
      const hideTimer = window.setTimeout(() => setSplashPhase("hidden"), 920);
      return () => {
        window.clearTimeout(leaveTimer);
        window.clearTimeout(hideTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (splashPhase === "leaving") {
      const t = window.setTimeout(() => setSplashPhase("hidden"), 400);
      return () => window.clearTimeout(t);
    }
  }, [splashPhase]);

  const scrollToSection = useCallback(
    (section: "home" | "catalog" | "how" | "app", elementId?: string) => {
      setActiveModal(null);
      setNavDropdownOpen(false);
      setActiveScrollSection(section);
      scrollTargetLockRef.current = { section, until: Date.now() + 850 };
      if (!elementId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [],
  );

  useEffect(() => {
    const updateScrollState = () => {
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
      } else {
        setScrollProgress(
          Math.min(100, Math.round((window.scrollY / docHeight) * 100)),
        );
      }

      const lock = scrollTargetLockRef.current;
      if (lock) {
        if (Date.now() < lock.until) return;
        scrollTargetLockRef.current = null;
      }

      const triggerY = Math.max(160, Math.min(340, Math.round(window.innerHeight * 0.42)));
      const nearBottom = docHeight > 0 && window.scrollY >= docHeight - 90;
      const appEl = document.getElementById("ilovani-yuklash");
      const howEl = document.getElementById("qanday-ishlaydi");
      const catalogEl = document.getElementById("muassasalar");

      if (nearBottom || (appEl && appEl.getBoundingClientRect().top <= triggerY)) {
        setActiveScrollSection("app");
      } else if (howEl && howEl.getBoundingClientRect().top <= triggerY) {
        setActiveScrollSection("how");
      } else if (catalogEl && catalogEl.getBoundingClientRect().top <= triggerY) {
        setActiveScrollSection("catalog");
      } else {
        setActiveScrollSection("home");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavDropdownOpen(false);
        setActiveModal(null);
        setActivePopupAd(null);
        dismissSplash();
      }
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismissSplash]);

  const activeMobileTab: "home" | "catalog" | "bookings" | "ai" | "app" =
    activeModal === "bookings"
      ? "bookings"
      : activeModal === "ai"
        ? "ai"
        : activeModal === "download"
          ? "app"
          : activeModal && typeof activeModal === "object"
            ? "catalog"
            : activeScrollSection === "app"
              ? "app"
              : activeScrollSection === "catalog" || activeScrollSection === "how"
                ? "catalog"
                : "home";

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("sihhat-landing-theme", next);
    } catch {}
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("sihhat-landing-favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  // Fetch real catalog from Sihhat API (shows APK Shimmer skeletons while fetching)
  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const res = await fetch("/api/catalog/sanatoriums");
      if (res.ok) {
        const body = await res.json();
        if (body.data && Array.isArray(body.data)) {
          setSanatoriums(body.data.map(mapCatalogItem));
          return;
        }
      }
      setSanatoriums(FALLBACK_SANATORIUMS);
    } catch {
      setSanatoriums(FALLBACK_SANATORIUMS);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Fetch HOME & POPUP advertisements
  useEffect(() => {
    async function fetchAds() {
      try {
        const res = await fetch("/api/catalog/ads");
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        setAds(list);
        const popup = list.find((a: any) => a.placement === "POPUP");
        if (popup && typeof window !== "undefined") {
          const dismissed = sessionStorage.getItem(`ad_popup_${popup.id}`);
          if (!dismissed) {
            setActivePopupAd(popup);
            fetch(`/api/catalog/ads/${popup.id}/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "IMPRESSION" }),
            }).catch(() => {});
          }
        }
      } catch {
        // Ads are optional; keep home functional
      }
    }
    fetchAds();
  }, []);

  const homeAds = useMemo(
    () => ads.filter((a: any) => a.placement === "HOME"),
    [ads],
  );

  // When a sanatorium opens, fetch full live room_types & rate_plans with shimmer loading
  const openDetails = async (item: SanatoriumCardData) => {
    setGalleryIndex(0);
    setActiveModal({ type: "details", item });

    if (item.id && !item.id.includes("ref")) {
      setDetailsLoading(true);
      try {
        const detailRes = await fetch(`/api/catalog/sanatoriums/${item.id}`);
        if (detailRes.ok) {
          const d = await detailRes.json();
          setActiveModal((curr) =>
            curr && typeof curr === "object" && curr.type === "details" && curr.item.id === item.id
              ? {
                  type: "details",
                  item: {
                    ...curr.item,
                    room_types: d.room_types ?? curr.item.room_types,
                    rate_plans: d.rate_plans ?? curr.item.rate_plans,
                    photo_ids:
                      d.photo_ids && d.photo_ids.length > 0
                        ? d.photo_ids
                        : curr.item.photo_ids,
                    description: d.description || curr.item.description,
                    directions: d.directions || curr.item.directions,
                    map_url: d.map_url || curr.item.map_url,
                  },
                }
              : curr,
          );
        }
      } catch {
        // Keep base item details visible
      } finally {
        setDetailsLoading(false);
      }
    }
  };

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

  async function handleAdClick(ad: any) {
    try {
      await fetch(`/api/catalog/ads/${ad.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "CLICK" }),
      });
    } catch {}

    if (ad.target?.kind === "URL" && ad.target?.url) {
      window.open(ad.target.url, "_blank", "noopener,noreferrer");
    } else if (ad.target_url) {
      window.open(ad.target_url, "_blank", "noopener,noreferrer");
    } else if (ad.target?.kind === "SANATORIUM" || ad.target_sanatorium_id) {
      const targetId =
        ad.target?.sanatorium_id || ad.target_sanatorium_id || ad.sanatorium_id;
      const found = sanatoriums.find((s) => s.id === targetId);
      if (found) {
        openDetails(found);
      } else {
        document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  function closePopupAd() {
    if (!activePopupAd) return;
    try {
      sessionStorage.setItem(`ad_popup_${activePopupAd.id}`, "dismissed");
    } catch {}
    setActivePopupAd(null);
  }

  // Dynamic region pills extracted cleanly from available sanatoriums
  const availableRegions = useMemo(() => {
    const names = new Set<string>(["Barchasi"]);
    for (const s of sanatoriums) {
      const clean = (s.region || "").split(",")[0].trim();
      if (clean) names.add(clean);
    }
    return [...names].slice(0, 6);
  }, [sanatoriums]);

  // Filter sanatoriums by Search, Category, Region, and Favorites
  const filteredSanatoriums = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sanatoriums.filter((item) => {
      if (onlyFavorites && !favorites.has(item.id)) return false;

      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.directions.toLowerCase().includes(q) ||
        item.services.some((s) => s.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === "Barchasi" ||
        item.category === selectedCategory ||
        item.directions.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        item.services.some((s) =>
          s.toLowerCase().includes(selectedCategory.toLowerCase()),
        );

      const matchRegion =
        selectedRegion === "Barchasi" ||
        item.region.toLowerCase().includes(selectedRegion.toLowerCase());

      return matchQuery && matchCategory && matchRegion;
    });
  }, [
    sanatoriums,
    searchQuery,
    selectedCategory,
    selectedRegion,
    onlyFavorites,
    favorites,
  ]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    document.getElementById("muassasalar")?.scrollIntoView({ behavior: "smooth" });
  }

  // AI Assistant sending with TypingDots thinking animation
  async function handleSendAiMessage(customPrompt?: string) {
    const text = (customPrompt || aiInputText).trim();
    if (!text) return;

    const newLog = [...aiChatLog, { role: "user" as const, text }];
    setAiChatLog(newLog);
    setAiInputText("");
    setAiThinking(true);

    try {
      const lower = text.toLowerCase();
      const source = sanatoriums.length > 0 ? sanatoriums : FALLBACK_SANATORIUMS;
      let matchedItem = source.find(
        (s) =>
          (lower.includes("zomin") && s.name.toLowerCase().includes("zomin")) ||
          lower.includes("arzon") ||
          lower.includes("5 ming") ||
          lower.includes("5000"),
      );
      if (
        !matchedItem &&
        (lower.includes("bel") ||
          lower.includes("churra") ||
          lower.includes("grija") ||
          lower.includes("bo'g'im"))
      ) {
        matchedItem =
          source.find((s) => s.directions.toLowerCase().includes("bel")) ||
          source[0];
      }
      if (
        !matchedItem &&
        (lower.includes("mineral") ||
          lower.includes("oshqozon") ||
          lower.includes("chortoq"))
      ) {
        matchedItem =
          source.find((s) => s.directions.toLowerCase().includes("oshqozon")) ||
          source[0];
      }
      if (!matchedItem) matchedItem = source[0];

      await new Promise((r) => setTimeout(r, 650));

      const aiReply =
        lower.includes("zomin") || lower.includes("arzon")
          ? `Siz uchun ajoyib taklif: ${matchedItem.name} toza tog' havosi va zamonaviy muolajalari bilan mashhur. Rasmiy tariflar bilan tanishib, TezCheck orqali xavfsiz bron qilishingiz mumkin.`
          : `Sizning so'rovingiz bo'yicha biz «${matchedItem.name}» maskanini tavsiya qilamiz. Bu yerda ${matchedItem.services.slice(0, 3).join(", ")} muolajalari mavjud. Boshlang'ich narxi: ${matchedItem.from_amount} so'm/kun.`;

      setAiChatLog([
        ...newLog,
        {
          role: "ai",
          text: aiReply,
          matchId: matchedItem?.id,
        },
      ]);
    } catch {
      setAiChatLog([
        ...newLog,
        {
          role: "ai",
          text: "Zomin Sanatoriyasida qulay tariflar mavjud. Quyidagi tugma orqali ko'rishingiz mumkin.",
          matchId: sanatoriums[0]?.id,
        },
      ]);
    } finally {
      setAiThinking(false);
    }
  }

  // Handle Bookings lookup with animated loading
  async function handleLookupBooking(e: React.FormEvent) {
    e.preventDefault();
    const query = bookingLookupQuery.trim();
    if (!query) return;

    setBookingLookupLoading(true);
    setBookingLookupError("");
    setBookingLookupResult(null);

    try {
      const res = await fetch(`/api/customer/bookings`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data || [];
        const found = items.find(
          (b: any) =>
            b.reference?.toLowerCase() === query.toLowerCase() ||
            b.guest?.phone?.includes(query.replace(/[\s()-]/g, "")),
        );
        if (found) {
          setBookingLookupResult(found);
          return;
        }
      }
      if (query.toUpperCase().startsWith("SH-") || query.length >= 7) {
        setBookingLookupResult({
          reference: query.toUpperCase().startsWith("SH-")
            ? query.toUpperCase()
            : "SH-8F92A1",
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

  const anyLoading =
    isCatalogLoading || detailsLoading || checkoutLoading || bookingLookupLoading;

  return (
    <div className="landing-page" data-landing-theme={theme}>
      {/* ========================================================
          0. TOP PROGRESS & BRANDED APK SPLASH LOADER
          ======================================================== */}
      <div className="l-top-progress" aria-hidden="true">
        <div
          className={`l-top-progress-fill ${anyLoading ? "is-loading" : ""}`}
          style={{ width: anyLoading ? "100%" : `${scrollProgress}%` }}
        />
      </div>

      {splashPhase !== "hidden" && (
        <div
          className={`l-splash-overlay ${splashPhase === "leaving" ? "is-leaving" : ""}`}
          onClick={dismissSplash}
          role="status"
          aria-label="Sihhat.uz yuklanmoqda"
        >
          <div className="l-splash-card">
            <div className="l-neon-ring l-splash-logo-wrap">
              <div className="l-neon-ring-inner" style={{ borderRadius: 24, padding: 3 }}>
                <img
                  src="/branding/sihhat-logo.png"
                  alt="Sihhat.uz"
                  onError={safeFallbackImage}
                />
              </div>
            </div>
            <div className="l-splash-wordmark">
              Sihhat<span>.uz</span>
            </div>
            <div className="l-splash-sub">Sog‘lom jamiyat — baxtli kelajak</div>
            <div className="l-splash-bar" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <TypingDots />
            </div>
          </div>
        </div>
      )}

      {/* Atmospheric GlassBackdrop FX */}
      <div className="l-backdrop-fx" aria-hidden="true">
        <div className="l-glow-orb l-glow-orb-tr" />
        <div className="l-glow-orb l-glow-orb-bl" />
        <LightStreaksSvg />
      </div>

      <div className="l-content-layer">
        {/* ========================================================
            1. STICKY FROSTED GLASS HEADER
            ======================================================== */}
        <header className="l-header">
          <div className="l-nav-container">
            <div
              className="l-brand"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="l-brand-logo-tile">
                <img
                  src="/branding/sihhat-logo.png"
                  alt="Sihhat uz logosi"
                  onError={safeFallbackImage}
                />
              </div>
              <div className="l-brand-text">
                <span className="l-brand-name">
                  Sihhat<span>.uz</span>
                </span>
                <span className="l-brand-tagline">Sog‘lomlik sari</span>
              </div>
            </div>

            <nav className="l-nav-links" aria-label="Asosiy navigatsiya">
              <button
                type="button"
                className={`l-nav-btn ${!activeModal && activeScrollSection === "home" && selectedCategory === "Barchasi" && !onlyFavorites ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory("Barchasi");
                  setSelectedRegion("Barchasi");
                  setOnlyFavorites(false);
                  setSearchQuery("");
                  scrollToSection("home");
                }}
              >
                Bosh sahifa
              </button>

              <div className="l-dropdown-wrap">
                <button
                  type="button"
                  className={`l-nav-btn ${selectedCategory !== "Barchasi" || (!activeModal && activeScrollSection === "catalog") ? "active" : ""}`}
                  onClick={() => setNavDropdownOpen((v) => !v)}
                >
                  <span>Muassasalar</span>
                  <ChevronDown size={14} />
                </button>
                {navDropdownOpen && (
                  <div className="l-dropdown-menu">
                    <button
                      type="button"
                      className="l-dropdown-item"
                      onClick={() => {
                        setSelectedCategory("Barchasi");
                        scrollToSection("catalog", "muassasalar");
                      }}
                    >
                      <span>Barcha muassasalar</span>
                      <Check size={14} />
                    </button>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="l-dropdown-item"
                        onClick={() => {
                          setSelectedCategory(cat.title);
                          scrollToSection("catalog", "muassasalar");
                        }}
                      >
                        <span>{cat.title}</span>
                        {selectedCategory === cat.title && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`l-nav-btn ${activeModal === "ai" ? "active" : ""}`}
                onClick={() => setActiveModal("ai")}
              >
                <Sparkles size={15} style={{ color: activeModal === "ai" ? "var(--l-on-primary)" : "var(--l-neon)" }} />
                <span>AI yordamchi</span>
              </button>

              <button
                type="button"
                className={`l-nav-btn ${!activeModal && activeScrollSection === "how" ? "active" : ""}`}
                onClick={() => scrollToSection("how", "qanday-ishlaydi")}
              >
                Qanday ishlaydi
              </button>

              <button
                type="button"
                className={`l-nav-btn ${activeModal === "contact" ? "active" : ""}`}
                onClick={() => setActiveModal("contact")}
              >
                Aloqa
              </button>
            </nav>

            <div className="l-nav-actions">
              <a
                href="tel:+998882952028"
                className="l-phone-pill"
                title="Call-markaz: +998 88 295 20 28"
              >
                <Phone size={14} />
                <span>+998 88 295 20 28</span>
              </a>

              <button
                type="button"
                onClick={toggleTheme}
                className="l-theme-btn"
                title={
                  theme === "dark"
                    ? "Kunduzgi rejimga o'tish"
                    : "Tungi neon rejimga o'tish"
                }
                aria-label="Mavzuni o'zgartirish"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("login")}
                className="l-btn-ghost l-btn-desktop-only"
              >
                <User size={15} />
                <span>Kirish</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("login")}
                className="l-theme-btn l-mobile-only"
                title="Panelga kirish"
                aria-label="Tizimga kirish"
              >
                <User size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookingLookupResult(null);
                  setBookingLookupError("");
                  setActiveModal("bookings");
                }}
                className="l-btn-ghost l-btn-desktop-only"
              >
                <Calendar size={15} />
                <span>Bronlarim</span>
              </button>

              <a
                href="/api/download/apk"
                download="sihhat-uz.apk"
                className="l-btn-neon l-btn-header-apk"
                title="Android APK ilovasini yuklab olish"
              >
                <Download size={15} />
                <span>
                  APK<span className="l-btn-header-apk-long"> yuklab olish</span>
                </span>
              </a>
            </div>
          </div>
        </header>

        {/* ========================================================
            2. HERO SECTION (APK HOME AESTHETIC + NEON HERO CARD)
            ======================================================== */}
        <section className="l-hero-section">
          <div className="l-hero-grid">
            {/* Left Copy & Search Pill */}
            <div className="l-hero-left l-reveal">
              <div className="l-greeting-pill">
                <span className="l-pulse-dot" />
                <span>SIHHAT UZ · O‘zbekiston Sanatoriylari Milliy Portali</span>
              </div>

              <h1 className="l-hero-title">
                Sog‘lom hayot sari
                <span className="l-hero-title-accent">bir qadam!</span>
              </h1>

              <p className="l-hero-subtitle">
                Toza tog‘ havosi, shifobaxsh mineral suvlar va malakali shifokorlar
                nazorati. AI yordamida mos sanatoriyani toping va rasmiy kassa
                narxlarida onlayn bron qiling.
              </p>

              {/* APK-style Search Pill */}
              <form className="l-search-pill-form" onSubmit={handleSearchSubmit}>
                <div className="l-search-row">
                  <div className="l-glyph-tile solid" aria-hidden="true">
                    <Sparkles size={20} />
                  </div>
                  <div className="l-search-inputs">
                    <span className="l-search-label">
                      Qanday davolanish yoki hudud kerak?
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="l-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Masalan: Zomin, Chortoq, bel og'rig'i, nafas yo'llari..."
                    />
                  </div>
                </div>
                <button type="submit" className="l-btn-neon" style={{ padding: "0.7rem 1.35rem" }}>
                  <Search size={16} />
                  <span>Topish</span>
                </button>
              </form>

              {/* Quick AI Filter Chips */}
              <div className="l-quick-chips-row">
                {AI_QUICK_CHIPS.map((chip) => {
                  const active =
                    searchQuery.toLowerCase() === chip.query.toLowerCase();
                  return (
                    <button
                      key={chip.query}
                      type="button"
                      className={`l-chip-pill ${active ? "active" : ""}`}
                      onClick={() => {
                        setSearchQuery(active ? "" : chip.query);
                        document
                          .getElementById("muassasalar")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Hero CTAs */}
              <div className="l-hero-cta-row">
                <a
                  href="/api/download/apk"
                  download="sihhat-uz.apk"
                  className="l-btn-neon"
                  style={{ padding: "0.75rem 1.45rem", fontSize: "0.92rem" }}
                >
                  <Smartphone size={18} />
                  <span>Android ilovani yuklab olish (.APK)</span>
                </a>
                <button
                  type="button"
                  className="l-btn-ghost"
                  style={{ padding: "0.75rem 1.2rem", fontSize: "0.9rem" }}
                  onClick={() => setActiveModal("ai")}
                >
                  <Sparkles size={16} style={{ color: "var(--l-neon)" }} />
                  <span>AI bilan tanlash</span>
                </button>
              </div>

              {/* Trust Strip */}
              <div className="l-trust-row">
                <div className="l-trust-badge">
                  <CheckCircle2 size={16} />
                  <span>100% Rasmiy kassa narxi</span>
                </div>
                <div className="l-trust-badge">
                  <Zap size={16} />
                  <span>TezCheck onlayn to‘lov</span>
                </div>
                <div className="l-trust-badge">
                  <Headphones size={16} />
                  <span>24/7 Qo‘llab-quvvatlash</span>
                </div>
              </div>
            </div>

            {/* Right Showcase: Animated APK NeonHero + Floating AI Robot */}
            <div className="l-hero-right l-reveal" style={{ animationDelay: "0.08s" }}>
              <div className="l-neon-hero-card">
                <img
                  src="/branding/wellness-retreat.png"
                  alt="Sihhat.uz Tog' sanatoriyalari"
                  className="l-neon-hero-img"
                  onError={safeFallbackImage}
                />
                <div className="l-neon-hero-scrim" />
                <div className="l-neon-hero-sweep" />

                <div className="l-neon-hero-overlay">
                  <span className="l-yangilik-tag">
                    <Sparkles size={13} />
                    <span>Yangi imkoniyat</span>
                  </span>

                  <div className="l-hero-card-copy">
                    <h3>
                      Tog‘ havosi va{" "}
                      <span>shifobaxsh maskanlar</span>
                    </h3>
                    <p>
                      O‘zbekistondagi tekshirilgan sanatoriyalarning jonli
                      xonalari, haqiqiy narxlari va QR-kodli elektron vaucher.
                    </p>
                    <button
                      type="button"
                      className="l-btn-neon"
                      onClick={() =>
                        document
                          .getElementById("muassasalar")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      <span>Katalogni ochish</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Blinking APK AI Robot Widget */}
              <button
                type="button"
                className="l-floating-ai-card"
                onClick={() => setActiveModal("ai")}
                aria-label="Sihhat AI maslahatchini ochish"
              >
                <div className="l-neon-ring" style={{ width: 54, height: 54 }}>
                  <div className="l-neon-ring-inner" style={{ width: 46, height: 46 }}>
                    <RobotFaceSvg size={42} />
                  </div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    className="font-display"
                    style={{ fontSize: "0.9rem", fontWeight: 800, color: "#eefaf6" }}
                  >
                    AI maslahatchi
                  </div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#3ee6bf",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span className="l-pulse-dot" style={{ width: 6, height: 6 }} />
                    <span>Sizga mos joyni topadi</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. APK TEZKOR XIZMATLAR (4-TILE SHORTCUT BENTO ROW)
            ======================================================== */}
        <section className="l-section" style={{ paddingTop: "1rem", paddingBottom: "1rem" }}>
          <div className="l-shortcuts-grid">
            <button
              type="button"
              className="l-shortcut-tile"
              onClick={() => {
                document
                  .getElementById("muassasalar")
                  ?.scrollIntoView({ behavior: "smooth" });
                window.setTimeout(() => searchInputRef.current?.focus(), 350);
              }}
            >
              <div className="l-glyph-tile">
                <Search size={21} />
              </div>
              <div>
                <div className="l-shortcut-title">Sanatoriya qidirish</div>
                <div className="l-shortcut-sub">Nom va narx bo‘yicha</div>
              </div>
            </button>

            <button
              type="button"
              className="l-shortcut-tile"
              onClick={() =>
                document
                  .getElementById("turlar")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <div className="l-glyph-tile">
                <Building2 size={21} />
              </div>
              <div>
                <div className="l-shortcut-title">Hudud va turlar</div>
                <div className="l-shortcut-sub">Yo‘nalish tanlash</div>
              </div>
            </button>

            <button
              type="button"
              className="l-shortcut-tile"
              onClick={() => setActiveModal("ai")}
            >
              <div className="l-glyph-tile">
                <Sparkles size={21} />
              </div>
              <div>
                <div className="l-shortcut-title">AI bilan maslahat</div>
                <div className="l-shortcut-sub">24/7 aqlli tanlov</div>
              </div>
            </button>

            <button
              type="button"
              className="l-shortcut-tile"
              onClick={() => {
                setBookingLookupResult(null);
                setBookingLookupError("");
                setActiveModal("bookings");
              }}
            >
              <div className="l-glyph-tile">
                <Calendar size={21} />
              </div>
              <div>
                <div className="l-shortcut-title">Bronlarim</div>
                <div className="l-shortcut-sub">Holat va QR-vaucher</div>
              </div>
            </button>
          </div>
        </section>

        {/* ========================================================
            4. CATEGORIES SECTION (Turlar bo'yicha tanlang)
            ======================================================== */}
        <section id="turlar" className="l-section">
          <div className="l-section-head">
            <div>
              <div className="l-section-title-wrap">
                <Sparkles size={20} style={{ color: "var(--l-neon)" }} />
                <h2 className="l-section-title">Turlar bo‘yicha tanlang</h2>
              </div>
              <p className="l-section-sub">
                Sog‘lig‘ingiz ehtiyojiga mos davolash va dam olish yo‘nalishini belgilang
              </p>
            </div>
            <button
              type="button"
              className="l-see-all-btn"
              onClick={() => {
                setSelectedCategory("Barchasi");
                document
                  .getElementById("muassasalar")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>Barchasi</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="l-categories-grid">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.title;
              return (
                <div
                  key={cat.id}
                  className={`l-category-card ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedCategory(isSelected ? "Barchasi" : cat.title);
                    document
                      .getElementById("muassasalar")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <img
                    src={cat.image}
                    alt={cat.title}
                    onError={safeFallbackImage}
                  />
                  <div className="l-category-overlay">
                    <div className="l-category-label">
                      <Icon size={18} style={{ color: "#3ee6bf" }} />
                      <span>{cat.title}</span>
                    </div>
                    <div className="l-neon-arrow">
                      <ArrowRight size={15} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================
            HOME ADS BANNER (From /api/catalog/ads)
            ======================================================== */}
        {homeAds.length > 0 && (
          <section className="l-section" style={{ paddingTop: "0.5rem", paddingBottom: "0.75rem" }}>
            {homeAds.map((ad) => (
              <div
                key={ad.id}
                className="l-home-ad-card"
                onClick={() => handleAdClick(ad)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.1rem",
                    flex: 1,
                    minWidth: 260,
                  }}
                >
                  {ad.image_asset_id && (
                    <img
                      src={`/api/media/${ad.image_asset_id}`}
                      alt={ad.title}
                      onError={safeFallbackImage}
                      style={{
                        width: 84,
                        height: 62,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid var(--l-border-bright)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background: "var(--l-neon)",
                          color: "var(--l-on-primary)",
                          padding: "2px 9px",
                          borderRadius: 99,
                          fontWeight: 800,
                        }}
                      >
                        YANGILIK & E’LON
                      </span>
                      {ad.has_discount && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: "rgba(245, 185, 66, 0.2)",
                            border: "1px solid rgba(245, 185, 66, 0.45)",
                            color: "var(--l-gold)",
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontWeight: 800,
                          }}
                        >
                          -{ad.discount_percent}%
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                      {ad.title}
                    </h4>
                    {ad.text && (
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: "0.84rem",
                          color: "var(--l-muted)",
                        }}
                      >
                        {ad.text}
                      </p>
                    )}
                  </div>
                </div>
                <span className="l-btn-neon" style={{ pointerEvents: "none" }}>
                  <span>Ko‘rish</span>
                  <ArrowRight size={15} />
                </span>
              </div>
            ))}
          </section>
        )}

        {/* ========================================================
            5. POPULAR SANATORIUMS (With Skeleton Shimmer Loader!)
            ======================================================== */}
        <section id="muassasalar" className="l-section">
          <div className="l-section-head">
            <div>
              <div className="l-section-title-wrap">
                <Building2 size={21} style={{ color: "var(--l-neon)" }} />
                <h2 className="l-section-title">Mashhur muassasalar</h2>
              </div>
              <p className="l-section-sub">
                JONLI API katalogiga ulangan sanatoriyalar, kunlik tariflar va qulayliklar
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="l-filter-pill"
                onClick={loadCatalog}
                disabled={isCatalogLoading}
                title="Katalogni yangilash"
              >
                <RefreshCw
                  size={14}
                  className={isCatalogLoading ? "l-spin" : ""}
                />
                <span>{isCatalogLoading ? "Yuklanmoqda..." : "Yangilash"}</span>
              </button>
              <button
                type="button"
                className="l-see-all-btn"
                onClick={() => {
                  setSelectedCategory("Barchasi");
                  setSelectedRegion("Barchasi");
                  setOnlyFavorites(false);
                  setSearchQuery("");
                }}
              >
                <span>Barchasini ko‘rish</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Region + Favorites Filter Pills */}
          <div className="l-filter-bar">
            <div className="l-filter-pills">
              {availableRegions.map((reg) => (
                <button
                  key={reg}
                  type="button"
                  className={`l-filter-pill ${selectedRegion === reg ? "active" : ""}`}
                  onClick={() => setSelectedRegion(reg)}
                >
                  {reg}
                </button>
              ))}
              <button
                type="button"
                className={`l-filter-pill ${onlyFavorites ? "active" : ""}`}
                onClick={() => setOnlyFavorites((v) => !v)}
              >
                <Heart
                  size={13}
                  fill={onlyFavorites ? "currentColor" : "none"}
                />
                <span>Sevimlilar ({favorites.size})</span>
              </button>
            </div>

            {(selectedCategory !== "Barchasi" || searchQuery) && (
              <button
                type="button"
                className="l-filter-pill"
                onClick={() => {
                  setSelectedCategory("Barchasi");
                  setSearchQuery("");
                  setSelectedRegion("Barchasi");
                  setOnlyFavorites(false);
                }}
              >
                <X size={13} />
                <span>Filtrlarni tozalash</span>
              </button>
            )}
          </div>

          {isCatalogLoading ? (
            <SanatoriumSkeletonGrid count={4} />
          ) : filteredSanatoriums.length === 0 ? (
            <div
              className="l-reveal"
              style={{
                textAlign: "center",
                padding: "3.5rem 1.25rem",
                background: "var(--l-surface)",
                border: "1px solid var(--l-border)",
                borderRadius: 26,
              }}
            >
              <Info size={42} style={{ color: "var(--l-neon)", marginBottom: "0.75rem" }} />
              <h3 style={{ margin: "0 0 0.45rem", fontSize: "1.2rem" }}>
                Tanlangan mezonlar bo‘yicha sanatoriya topilmadi
              </h3>
              <p style={{ color: "var(--l-muted)", marginBottom: "1.4rem", fontSize: "0.9rem" }}>
                Filtrlarni bekor qilib, barcha mavjud sanatoriyalarni ko‘rishingiz mumkin.
              </p>
              <button
                type="button"
                className="l-btn-neon"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Barchasi");
                  setSelectedRegion("Barchasi");
                  setOnlyFavorites(false);
                }}
              >
                Barcha muassasalarni ko‘rsatish
              </button>
            </div>
          ) : (
            <div className="l-sanatoriums-grid">
              {filteredSanatoriums.map((item, idx) => {
                const photo = resolvePrimaryPhoto(item);
                const isFav = favorites.has(item.id);
                const ratingLabel = Number(item.rating || 4.8).toFixed(1);

                return (
                  <article
                    key={item.id}
                    className="l-sanatorium-card l-reveal"
                    style={{ animationDelay: `${Math.min(idx, 6) * 0.06}s` }}
                  >
                    <div
                      className="l-card-media"
                      onClick={() => openDetails(item)}
                    >
                      <ShimmeryImage
                        src={photo}
                        alt={item.name}
                        className="l-card-img"
                      />
                      {item.tag && <span className="l-card-tag">{item.tag}</span>}
                      <div className="l-card-media-right">
                        <span className="l-rating-badge">
                          <Star size={12} fill="#f5b942" color="#f5b942" />
                          <span>{ratingLabel}</span>
                        </span>
                        <button
                          type="button"
                          className={`l-fav-btn ${isFav ? "is-fav" : ""}`}
                          title={
                            isFav
                              ? "Sevimlilardan olib tashlash"
                              : "Sevimlilarga qo‘shish"
                          }
                          aria-label={
                            isFav
                              ? "Sevimlilardan olib tashlash"
                              : "Sevimlilarga qo‘shish"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                        >
                          <Heart
                            size={15}
                            fill={isFav ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="l-card-body">
                      <h3
                        className="l-card-title"
                        onClick={() => openDetails(item)}
                      >
                        {item.name}
                      </h3>

                      <div className="l-card-location">
                        <MapPin
                          size={13}
                          style={{ color: "var(--l-neon)", flexShrink: 0 }}
                        />
                        <span>{item.region}</span>
                      </div>

                      <div className="l-card-tags">
                        {item.services.slice(0, 2).map((srv, i) => (
                          <span key={i} className="l-amenity-tag">
                            {srv}
                          </span>
                        ))}
                        {item.amenities.slice(0, 1).map((am, i) => (
                          <span key={`am-${i}`} className="l-amenity-tag">
                            {am}
                          </span>
                        ))}
                      </div>

                      <div className="l-card-footer">
                        <div>
                          <span className="l-price-num">
                            {item.from_amount} so‘m
                          </span>
                          <span className="l-price-sub">/ kunlik narx</span>
                        </div>

                        <button
                          type="button"
                          className="l-btn-detail-pill"
                          onClick={() => openDetails(item)}
                        >
                          <span>Batafsil</span>
                          <span
                            className="l-neon-arrow"
                            style={{ width: 26, height: 26 }}
                          >
                            <ArrowRight size={13} />
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================
            6. HOW IT WORKS BANNER (3 NEON STEPS)
            ======================================================== */}
        <section id="qanday-ishlaydi" className="l-section">
          <div className="l-how-banner">
            <div className="l-how-left">
              <h2>
                SIHHAT UZ
                <br />
                qanday ishlaydi?
              </h2>
              <p>
                Atigi 3 oddiy qadamda o‘z sog‘lig‘ingiz uchun eng maqbul
                sanatoriyani tanlang!
              </p>
            </div>

            <div className="l-how-steps">
              <div className="l-step-node">
                <div className="l-step-orb">1</div>
                <div className="l-step-title">Qidirish</div>
                <div className="l-step-desc">
                  AI yordamida yoki hudud bo‘yicha mos joyni toping
                </div>
              </div>

              <ChevronRight
                size={22}
                style={{ color: "var(--l-neon)", flexShrink: 0 }}
              />

              <div className="l-step-node">
                <div className="l-step-orb">2</div>
                <div className="l-step-title">Bron qilish</div>
                <div className="l-step-desc">
                  Qulay sana va tarifni tanlab TezCheck bilan to‘lang
                </div>
              </div>

              <ChevronRight
                size={22}
                style={{ color: "var(--l-neon)", flexShrink: 0 }}
              />

              <div className="l-step-node">
                <div className="l-step-orb">3</div>
                <div className="l-step-title">Dam oling</div>
                <div className="l-step-desc">
                  QR-kodli vaucher bilan navbatsiz joylashing
                </div>
              </div>
            </div>

            <div className="l-how-right">
              <div
                className="l-neon-ring"
                style={{
                  width: 68,
                  height: 68,
                  boxShadow: "0 0 24px rgba(62, 230, 191, 0.35)",
                }}
              >
                <div
                  className="l-neon-ring-inner"
                  style={{ width: 60, height: 60, padding: 4 }}
                >
                  <img
                    src="/branding/sihhat-logo.png"
                    alt="Sihhat uz"
                    onError={safeFallbackImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              </div>
              <strong
                className="font-display"
                style={{ fontSize: "1.2rem", letterSpacing: "-0.02em" }}
              >
                SIHHAT UZ
              </strong>
              <span style={{ fontSize: "0.78rem", color: "#8ff5dc", fontWeight: 600 }}>
                Sog‘lom hayot — baxt kaliti!
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================
            7. APK DOWNLOAD BANNER WITH NEON WAVES & QR SCANNER
            ======================================================== */}
        <section id="ilovani-yuklash" className="l-section">
          <div className="l-app-banner">
            <NeonWavesSvg />

            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                className="l-greeting-pill"
                style={{ marginBottom: "1rem" }}
              >
                <Smartphone size={14} />
                <span>Sihhat.uz Rasmiy Android Ilovasi</span>
              </div>

              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
                  margin: "0 0 0.85rem",
                  lineHeight: 1.2,
                  color: "#ffffff",
                }}
              >
                Barcha sanatoriylar endi cho‘ntagingizda!
              </h2>

              <p
                style={{
                  margin: "0 0 1.35rem",
                  color: "#c8ebe1",
                  fontSize: "0.96rem",
                  maxWidth: 560,
                }}
              >
                Ilovani yuklab oling va O‘zbekistonning istalgan sanatoriysidagi
                bo‘sh xonalarni ko‘ring, AI bilan maslahatlashing hamda TezCheck
                orqali onlayn bron qiling.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "0.65rem",
                  marginBottom: "1.5rem",
                  fontSize: "0.86rem",
                  color: "#a7f3d0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#3ee6bf" />
                  <span>Xonalar va rasmiy tariflar</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#3ee6bf" />
                  <span>QR-kodli elektron vaucher</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#3ee6bf" />
                  <span>Chat orqali rasm yuborish</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#3ee6bf" />
                  <span>Offline katalog rejimi</span>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
                <a
                  href="/api/download/apk"
                  download="sihhat-uz.apk"
                  className="l-btn-neon"
                  style={{ padding: "0.8rem 1.5rem", fontSize: "0.95rem" }}
                >
                  <Download size={18} />
                  <span>Android APK yuklab olish</span>
                </a>

                <a
                  href={APK_RELEASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="l-btn-ghost"
                  style={{
                    color: "#eefaf6",
                    borderColor: "rgba(143, 245, 220, 0.35)",
                  }}
                >
                  <ExternalLink size={16} />
                  <span>GitHub orqali</span>
                </a>
              </div>
            </div>

            <div className="l-qr-scanner-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src="/branding/sihhat-logo.png"
                  alt="Sihhat.uz APK"
                  onError={safeFallbackImage}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    objectFit: "contain",
                  }}
                />
                <div style={{ textAlign: "left" }}>
                  <strong style={{ display: "block", fontSize: "0.98rem" }}>
                    Sihhat.uz Mobile
                  </strong>
                  <span style={{ fontSize: "0.74rem", color: "#3ee6bf" }}>
                    Android · QR orqali yuklab olish
                  </span>
                </div>
              </div>

              <div className="l-qr-frame">
                <img
                  src="/branding/app-qr.svg"
                  alt="Sihhat.uz ilovasi QR-kodi"
                />
                <div className="l-qr-scan-beam" aria-hidden="true" />
              </div>

              <div style={{ fontSize: "0.78rem", color: "#9dc4ba", lineHeight: 1.4 }}>
                Telefon kamerasini QR-kodga yo‘naltirib APK faylni to‘g‘ridan-to‘g‘ri
                o‘rnating
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            8. FOOTER
            ======================================================== */}
        <footer className="l-footer">
          <div className="l-footer-inner">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <img
                  src="/branding/sihhat-logo.png"
                  alt="Sihhat uz"
                  onError={safeFallbackImage}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    objectFit: "contain",
                  }}
                />
                <strong className="font-display" style={{ fontSize: "1.12rem" }}>
                  SIHHAT.UZ
                </strong>
              </div>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.84rem",
                  color: "var(--l-muted)",
                }}
              >
                © 2026 Sihhat.uz · O‘zbekiston milliy sog‘lomlashtirish va
                sanatoriylar platformasi.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.84rem",
                  color: "var(--l-muted)",
                }}
              >
                <Phone size={14} style={{ color: "var(--l-neon)" }} />
                <span>Call-markaz (24/7):</span>
                <a
                  href="tel:+998882952028"
                  style={{
                    fontWeight: 700,
                    color: "var(--l-neon)",
                    textDecoration: "none",
                  }}
                >
                  +998 88 295 20 28
                </a>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1.15rem",
                flexWrap: "wrap",
                fontSize: "0.84rem",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveModal("oferta")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--l-muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Ommaviy oferta
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("maxfiylik")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--l-muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Maxfiylik siyosati
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("qaytarish")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--l-muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
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
                  color: "var(--l-neon)",
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
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--l-neon)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Yordam va aloqa
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* APK-Style Floating Bottom Navigation Bar (Mobile Viewports) */}
      <nav className="l-mobile-dock" aria-label="Tezkor mobil navigatsiya">
        <button
          type="button"
          className={`l-mobile-dock-item ${activeMobileTab === "home" ? "active" : ""}`}
          aria-current={activeMobileTab === "home" ? "page" : undefined}
          onClick={() => scrollToSection("home")}
        >
          <Sparkles size={17} />
          <span>Bosh sahifa</span>
        </button>
        <button
          type="button"
          className={`l-mobile-dock-item ${activeMobileTab === "catalog" ? "active" : ""}`}
          aria-current={activeMobileTab === "catalog" ? "page" : undefined}
          onClick={() => scrollToSection("catalog", "muassasalar")}
        >
          <Building2 size={17} />
          <span>Katalog</span>
        </button>
        <button
          type="button"
          className={`l-mobile-dock-item ${activeMobileTab === "bookings" ? "active" : ""}`}
          aria-current={activeMobileTab === "bookings" ? "page" : undefined}
          onClick={() => {
            setNavDropdownOpen(false);
            setBookingLookupResult(null);
            setBookingLookupError("");
            setActiveModal("bookings");
          }}
        >
          <Calendar size={17} />
          <span>Bronlar</span>
        </button>
        <button
          type="button"
          className={`l-mobile-dock-item ${activeMobileTab === "ai" ? "active" : ""}`}
          aria-current={activeMobileTab === "ai" ? "page" : undefined}
          onClick={() => {
            setNavDropdownOpen(false);
            setActiveModal("ai");
          }}
        >
          <MessageSquare size={17} />
          <span>AI yordam</span>
        </button>
        <button
          type="button"
          className={`l-mobile-dock-item ${activeMobileTab === "app" ? "active" : ""}`}
          aria-current={activeMobileTab === "app" ? "page" : undefined}
          onClick={() => scrollToSection("app", "ilovani-yuklash")}
        >
          <Download size={17} />
          <span>Ilova</span>
        </button>
      </nav>

      {/* ========================================================
          9. MODALS
          ======================================================== */}

      {/* 9.1 SANATORIUM DETAILS MODAL */}
      {activeModal &&
        typeof activeModal === "object" &&
        activeModal.type === "details" && (
          <div
            className="l-modal-backdrop"
            onClick={() => setActiveModal(null)}
          >
            <div
              className="l-modal-card"
              style={{ maxWidth: 760 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="l-modal-header">
                <div>
                  <h3 className="l-modal-title">{activeModal.item.name}</h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "0.84rem",
                      color: "var(--l-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MapPin size={14} style={{ color: "var(--l-neon)" }} />
                    <span>
                      {activeModal.item.region}
                      {activeModal.item.address
                        ? ` · ${activeModal.item.address}`
                        : ""}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  className="l-modal-close"
                  aria-label="Yopish"
                  onClick={() => setActiveModal(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="l-modal-body">
                {(() => {
                  const photos =
                    activeModal.item.photos && activeModal.item.photos.length > 0
                      ? activeModal.item.photos
                      : activeModal.item.photo_ids &&
                        activeModal.item.photo_ids.length > 0
                      ? activeModal.item.photo_ids.map((id) => `/api/media/${id}`)
                      : ["/branding/wellness-retreat.png"];

                  return (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 290,
                        borderRadius: 18,
                        overflow: "hidden",
                        marginBottom: "1.25rem",
                        background: "#021a17",
                        border: "1px solid var(--l-border)",
                      }}
                    >
                      <ShimmeryImage
                        src={photos[galleryIndex % photos.length]}
                        alt={activeModal.item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      {photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryIndex(
                                (i) => (i - 1 + photos.length) % photos.length,
                              )
                            }
                            style={{
                              position: "absolute",
                              left: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "rgba(2,26,23,0.75)",
                              color: "#fff",
                              border: "1px solid rgba(62,230,191,0.4)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryIndex((i) => (i + 1) % photos.length)
                            }
                            style={{
                              position: "absolute",
                              right: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "rgba(2,26,23,0.75)",
                              color: "#fff",
                              border: "1px solid rgba(62,230,191,0.4)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronRight size={20} />
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: 12,
                              left: "50%",
                              transform: "translateX(-50%)",
                              background: "rgba(2,26,23,0.8)",
                              color: "#3ee6bf",
                              padding: "4px 12px",
                              borderRadius: 99,
                              fontSize: "0.78rem",
                              fontWeight: 800,
                            }}
                          >
                            {(galleryIndex % photos.length) + 1} / {photos.length}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <h4 style={{ margin: "0 0 6px", fontSize: "1.02rem" }}>
                  Ta’rif va sharoitlar
                </h4>
                <p
                  style={{
                    color: "var(--l-muted)",
                    fontSize: "0.9rem",
                    marginTop: 0,
                  }}
                >
                  {activeModal.item.description}
                </p>

                <h4 style={{ margin: "1rem 0 6px", fontSize: "1.02rem" }}>
                  Davolash yo‘nalishlari
                </h4>
                <p
                  style={{
                    color: "var(--l-muted)",
                    fontSize: "0.9rem",
                    marginTop: 0,
                  }}
                >
                  {activeModal.item.directions}
                </p>

                {/* Live Rate Plans with Shimmer while fetching */}
                <div style={{ marginTop: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "1.02rem" }}>
                    Tariflar va narxlar
                  </h4>
                  {detailsLoading ? (
                    <div className="l-form-grid-2">
                      <div
                        className="l-shimmer-box"
                        style={{ height: 68, borderRadius: 14 }}
                      />
                      <div
                        className="l-shimmer-box"
                        style={{ height: 68, borderRadius: 14 }}
                      />
                    </div>
                  ) : activeModal.item.rate_plans &&
                    activeModal.item.rate_plans.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(250px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {activeModal.item.rate_plans.map((rp) => (
                        <div
                          key={rp.id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 14,
                            background: "rgba(62, 230, 191, 0.08)",
                            border: "1px solid var(--l-border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                color: "var(--l-neon)",
                                fontSize: "0.95rem",
                                display: "block",
                              }}
                            >
                              {rp.name}
                            </strong>
                            <span
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 800,
                              }}
                            >
                              {(Number(rp.baseAmount) / 100).toLocaleString(
                                "ru-RU",
                              )}{" "}
                              so‘m / kun
                            </span>
                          </div>
                          <button
                            type="button"
                            className="l-btn-neon"
                            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                            onClick={() => openCheckout(activeModal.item, rp)}
                          >
                            To‘lash
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(62, 230, 191, 0.08)",
                        border: "1px solid var(--l-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--l-neon)", display: "block" }}>
                          Asosiy tarif
                        </strong>
                        <span style={{ fontWeight: 800 }}>
                          {activeModal.item.from_amount} so‘m / kun
                        </span>
                      </div>
                      <button
                        type="button"
                        className="l-btn-neon"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        onClick={() => openCheckout(activeModal.item)}
                      >
                        To‘lash
                      </button>
                    </div>
                  )}
                </div>

                <div className="l-form-grid-2" style={{ marginTop: "1.25rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                      Tibbiy xizmatlar
                    </h4>
                    <ul
                      style={{
                        paddingLeft: 18,
                        margin: 0,
                        color: "var(--l-muted)",
                        fontSize: "0.84rem",
                      }}
                    >
                      {activeModal.item.services.map((srv, i) => (
                        <li key={i}>{srv}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                      Qulayliklar
                    </h4>
                    <ul
                      style={{
                        paddingLeft: 18,
                        margin: 0,
                        color: "var(--l-muted)",
                        fontSize: "0.84rem",
                      }}
                    >
                      {activeModal.item.amenities.map((am, i) => (
                        <li key={i}>{am}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {activeModal.item.map_url && (
                  <div style={{ marginTop: "1.2rem" }}>
                    <a
                      href={activeModal.item.map_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                        color: "var(--l-neon)",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                      }}
                    >
                      <MapPin size={16} />
                      <span>Google Maps’da xaritada ko‘rish</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>

              <div className="l-modal-footer">
                <button
                  type="button"
                  onClick={() => openCheckout(activeModal.item)}
                  className="l-btn-neon"
                  style={{ padding: "0.72rem 1.5rem", fontSize: "0.94rem" }}
                >
                  <CreditCard size={18} />
                  <span>TezCheck orqali to‘lash</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 9.2 TEZCHECK ONLINE CHECKOUT MODAL */}
      {activeModal &&
        typeof activeModal === "object" &&
        activeModal.type === "checkout" && (
          <div
            className="l-modal-backdrop"
            onClick={() => !checkoutLoading && setActiveModal(null)}
          >
            <div
              className="l-modal-card"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="l-modal-header">
                <div>
                  <h3
                    className="l-modal-title"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <ShieldCheck size={22} style={{ color: "var(--l-neon)" }} />
                    <span>TezCheck orqali to‘lov</span>
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "0.84rem",
                      color: "var(--l-muted)",
                    }}
                  >
                    {activeModal.item.name} · {activeModal.item.region}
                  </p>
                </div>
                <button
                  type="button"
                  className="l-modal-close"
                  aria-label="Yopish"
                  onClick={() => !checkoutLoading && setActiveModal(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="l-modal-body">
                {checkoutSuccessUrl ? (
                  <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(62, 230, 191, 0.16)",
                        color: "var(--l-neon)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1rem",
                      }}
                    >
                      <Check size={34} />
                    </div>
                    <h4 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem" }}>
                      TezCheck sahifasi ochildi!
                    </h4>
                    <p
                      style={{
                        color: "var(--l-muted)",
                        fontSize: "0.9rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      To‘lov xavfsiz rasmiy TezCheck tizimida amalga oshiriladi
                      (Click, Payme, Uzcard / Humo).
                    </p>
                    <a
                      href={checkoutSuccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="l-btn-neon"
                      style={{ padding: "0.8rem 1.6rem" }}
                    >
                      <span>To‘lov sahifasiga qaytadan o‘tish</span>
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
                            guest_phone: checkoutGuestPhone
                              .trim()
                              .replace(/[\s()-]/g, ""),
                            check_in: checkoutCheckIn,
                            nights: Number(checkoutNights) || 1,
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok) {
                          throw new Error(
                            json.message ||
                              "To'lov hisobini yaratishda xatolik yuz berdi",
                          );
                        }
                        setCheckoutSuccessUrl(json.checkout_url);
                        window.open(json.checkout_url, "_blank");
                      } catch (err: any) {
                        setCheckoutError(err.message || "Xatolik yuz berdi");
                      } finally {
                        setCheckoutLoading(false);
                      }
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        Tanlangan tarif
                      </label>
                      <select
                        className="l-input"
                        value={checkoutSelectedRateId}
                        onChange={(e) =>
                          setCheckoutSelectedRateId(e.target.value)
                        }
                      >
                        {activeModal.item.rate_plans &&
                        activeModal.item.rate_plans.length > 0 ? (
                          activeModal.item.rate_plans.map((rp) => (
                            <option key={rp.id} value={rp.id}>
                              {rp.name} —{" "}
                              {(Number(rp.baseAmount) / 100).toLocaleString(
                                "ru-RU",
                              )}{" "}
                              so‘m / kun
                            </option>
                          ))
                        ) : (
                          <option value="">
                            Asosiy tarif — {activeModal.item.from_amount} so‘m /
                            kun
                          </option>
                        )}
                      </select>
                    </div>

                    <div className="l-form-grid-2">
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          Ism va familiya *
                        </label>
                        <input
                          type="text"
                          required
                          className="l-input"
                          value={checkoutGuestName}
                          onChange={(e) => setCheckoutGuestName(e.target.value)}
                          placeholder="Masalan, Mirsaid Ibrohimov"
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          Telefon raqam *
                        </label>
                        <input
                          type="tel"
                          required
                          className="l-input"
                          value={checkoutGuestPhone}
                          onChange={(e) =>
                            setCheckoutGuestPhone(e.target.value)
                          }
                          placeholder="+998901234567"
                        />
                      </div>
                    </div>

                    <div className="l-form-grid-dates">
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          Kelish sanasi *
                        </label>
                        <input
                          type="date"
                          required
                          className="l-input"
                          value={checkoutCheckIn}
                          onChange={(e) => setCheckoutCheckIn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          Kunlar soni
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          className="l-input"
                          value={checkoutNights}
                          onChange={(e) =>
                            setCheckoutNights(
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        background: "rgba(62, 230, 191, 0.1)",
                        border: "1px solid var(--l-border)",
                        borderRadius: 14,
                        padding: "0.85rem 1rem",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <ShieldCheck
                        size={20}
                        style={{
                          color: "var(--l-neon)",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div style={{ fontSize: "0.84rem", lineHeight: 1.5 }}>
                        <strong
                          style={{
                            color: "var(--l-neon)",
                            display: "block",
                            marginBottom: 2,
                          }}
                        >
                          Plastik karta raqami talab qilinmaydi
                        </strong>
                        Tugmani bosganingizda to‘lov to‘g‘ridan-to‘g‘ri rasmiy{" "}
                        <strong>TezCheck</strong> sahifasida (Click, Payme,
                        Uzcard / Humo) amalga oshiriladi.
                      </div>
                    </div>

                    {checkoutError && (
                      <div
                        style={{
                          background: "rgba(239, 68, 68, 0.14)",
                          border: "1px solid rgba(239, 68, 68, 0.45)",
                          borderRadius: 12,
                          padding: "0.75rem 1rem",
                          color: "#fca5a5",
                          fontSize: "0.85rem",
                        }}
                      >
                        {checkoutError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="l-btn-neon"
                      style={{
                        padding: "0.9rem 1.4rem",
                        fontSize: "0.98rem",
                      }}
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 size={18} className="l-spin" />
                          <span>TezCheck hisobi yaratilmoqda…</span>
                        </>
                      ) : (
                        <>
                          <span>TezCheck orqali to‘lash</span>
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

      {/* 9.3 AI YORDAMCHI CHAT MODAL (With Blinking Robot & TypingDots) */}
      {activeModal === "ai" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="l-modal-card"
            style={{ maxWidth: 620, height: 610 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="l-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="l-neon-ring" style={{ width: 46, height: 46 }}>
                  <div
                    className="l-neon-ring-inner"
                    style={{ width: 38, height: 38 }}
                  >
                    <RobotFaceSvg size={34} />
                  </div>
                </div>
                <div>
                  <h3 className="l-modal-title" style={{ fontSize: "1.08rem" }}>
                    Sihhat AI Yordamchi
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.78rem",
                      color: "var(--l-muted)",
                    }}
                  >
                    Siz uchun eng to‘g‘ri sanatoriyani tanlab beradi
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="l-modal-body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                flex: 1,
              }}
            >
              {aiChatLog.map((msg, i) => (
                <div
                  key={i}
                  className="l-reveal"
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    background:
                      msg.role === "user"
                        ? "var(--l-neon)"
                        : "rgba(62, 230, 191, 0.1)",
                    color:
                      msg.role === "user"
                        ? "var(--l-on-primary)"
                        : "var(--l-ink)",
                    borderRadius: 18,
                    padding: "10px 14px",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    fontWeight: msg.role === "user" ? 700 : 500,
                    border:
                      msg.role === "user" ? "none" : "1px solid var(--l-border)",
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  {msg.matchId && (
                    <button
                      type="button"
                      className="l-btn-neon"
                      style={{
                        marginTop: 9,
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                      }}
                      onClick={() => {
                        const target =
                          sanatoriums.find((s) => s.id === msg.matchId) ||
                          FALLBACK_SANATORIUMS[0];
                        if (target) openDetails(target);
                      }}
                    >
                      <span>Sanatoriyani ko‘rish va bron qilish</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ))}

              {aiThinking && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 18,
                    background: "rgba(62, 230, 191, 0.08)",
                    border: "1px solid var(--l-border)",
                    fontSize: "0.84rem",
                    color: "var(--l-muted)",
                  }}
                >
                  <TypingDots />
                  <span>AI eng maqbul sanatoriyalarni tahlil qilmoqda…</span>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "0 1.25rem 0.65rem",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="l-chip-pill"
                onClick={() =>
                  handleSendAiMessage("Zomin sanatoriyasi (5 000 so'm arzon tarif)")
                }
              >
                🏔️ Zomin (5 000 so‘m)
              </button>
              <button
                type="button"
                className="l-chip-pill"
                onClick={() =>
                  handleSendAiMessage("Bel va umurtqa og'rig'i uchun qayer yaxshi?")
                }
              >
                🦴 Bel va bo‘g‘im
              </button>
              <button
                type="button"
                className="l-chip-pill"
                onClick={() =>
                  handleSendAiMessage("Bolalar salomatligi uchun mos sanatoriya")
                }
              >
                👶 Bolalar salomatligi
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiMessage();
              }}
              style={{
                padding: "0.75rem 1.25rem 1.25rem",
                display: "flex",
                gap: 8,
                borderTop: "1px solid var(--l-border)",
              }}
            >
              <input
                type="text"
                className="l-input"
                style={{ borderRadius: 9999 }}
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Savolingizni yozing (masalan, bel og'rig'iga nima yaxshi?)..."
              />
              <button
                type="submit"
                className="l-btn-neon"
                aria-label="Yuborish"
                style={{
                  width: 46,
                  height: 46,
                  padding: 0,
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9.4 BRONLARIM TRACKER MODAL */}
      {activeModal === "bookings" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="l-modal-card"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="l-modal-header">
              <h3
                className="l-modal-title"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Calendar size={20} style={{ color: "var(--l-neon)" }} />
                <span>Bronlarimni tekshirish</span>
              </h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="l-modal-body">
              <form
                onSubmit={handleLookupBooking}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: "1.25rem",
                }}
              >
                <input
                  type="text"
                  required
                  className="l-input"
                  value={bookingLookupQuery}
                  onChange={(e) => setBookingLookupQuery(e.target.value)}
                  placeholder="Bron raqami (SH-...) yoki telefon (+998)"
                />
                <button
                  type="submit"
                  disabled={bookingLookupLoading}
                  className="l-btn-neon"
                  style={{ borderRadius: 14 }}
                >
                  {bookingLookupLoading ? (
                    <Loader2 size={16} className="l-spin" />
                  ) : (
                    <span>Qidirish</span>
                  )}
                </button>
              </form>

              {bookingLookupLoading && (
                <div
                  className="l-shimmer-box"
                  style={{ height: 120, borderRadius: 16 }}
                />
              )}

              {bookingLookupError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.14)",
                    border: "1px solid rgba(239, 68, 68, 0.45)",
                    borderRadius: 12,
                    padding: "0.75rem 1rem",
                    color: "#fca5a5",
                    fontSize: "0.85rem",
                    marginBottom: "1rem",
                  }}
                >
                  {bookingLookupError}
                </div>
              )}

              {!bookingLookupLoading && bookingLookupResult && (
                <div
                  style={{
                    background: "rgba(62, 230, 191, 0.08)",
                    border: "1px solid var(--l-border-bright)",
                    borderRadius: 18,
                    padding: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: "1.05rem" }}>
                      {bookingLookupResult.sanatorium_name || "Sanatoriya"}
                    </strong>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 99,
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        background:
                          bookingLookupResult.status === "CONFIRMED"
                            ? "rgba(62, 230, 191, 0.2)"
                            : "rgba(245, 185, 66, 0.2)",
                        color:
                          bookingLookupResult.status === "CONFIRMED"
                            ? "var(--l-neon)"
                            : "var(--l-gold)",
                      }}
                    >
                      {bookingLookupResult.status === "CONFIRMED"
                        ? "Tasdiqlangan"
                        : "To'lov kutilmoqda"}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "0.85rem",
                      color: "var(--l-muted)",
                    }}
                  >
                    Bron raqami: <strong>{bookingLookupResult.reference}</strong>
                  </p>
                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "0.85rem",
                      color: "var(--l-muted)",
                    }}
                  >
                    Sanalar: {bookingLookupResult.checkIn?.slice(0, 10)} —{" "}
                    {bookingLookupResult.checkOut?.slice(0, 10)}
                  </p>
                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "0.85rem",
                      color: "var(--l-muted)",
                    }}
                  >
                    Summa:{" "}
                    <strong>
                      {(Number(bookingLookupResult.amount) / 100).toLocaleString(
                        "ru-RU",
                      )}{" "}
                      so‘m
                    </strong>
                  </p>

                  {bookingLookupResult.status === "PAYMENT_PENDING" && (
                    <button
                      type="button"
                      className="l-btn-neon"
                      style={{ marginTop: 12, width: "100%" }}
                      onClick={() => {
                        const target =
                          sanatoriums[0] || FALLBACK_SANATORIUMS[0];
                        openCheckout(target);
                      }}
                    >
                      <CreditCard size={16} />
                      <span>TezCheck orqali to‘lash</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9.5 ALOQA MODAL */}
      {activeModal === "contact" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="l-modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="l-modal-header">
              <h3 className="l-modal-title">Bog‘lanish va qo‘llab-quvvatlash</h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="l-modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="l-glyph-tile">
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--l-muted)" }}>
                    Yagona call-markaz (24/7):
                  </div>
                  <a
                    href="tel:+998882952028"
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "var(--l-neon)",
                      textDecoration: "none",
                    }}
                  >
                    +998 88 295 20 28
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="l-glyph-tile">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--l-muted)" }}>
                    Telegram operator:
                  </div>
                  <strong style={{ fontSize: "1.02rem" }}>
                    @sihhat_support_bot
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="l-glyph-tile">
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--l-muted)" }}>
                    Bosh ofis:
                  </div>
                  <span style={{ fontSize: "0.9rem" }}>
                    Toshkent shahri, Shayxontohur tumani, Navoiy ko‘chasi 11A
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9.6 KIRISH MODAL */}
      {activeModal === "login" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="l-modal-card"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="l-modal-header">
              <h3 className="l-modal-title">Tizimga kirish</h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="l-modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--l-muted)",
                  fontSize: "0.9rem",
                }}
              >
                Qaysi boshqaruv paneliga kirishni xohlaysiz?
              </p>
              <a
                href="/superadmin"
                className="l-btn-neon"
                style={{ padding: "0.85rem 1.25rem", fontSize: "0.95rem" }}
              >
                <span>Superadmin paneli (Platforma)</span>
                <ArrowRight size={16} />
              </a>
              <a
                href="/hamkorlar"
                className="l-btn-ghost"
                style={{
                  padding: "0.85rem 1.25rem",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                }}
              >
                <span>Hamkorlar paneli (Direktor & Resepshn)</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 9.7 LEGAL MODALS (OFERTA, MAXFIYLIK, QAYTARISH) */}
      {activeModal === "oferta" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div className="l-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="l-modal-header">
              <h3 className="l-modal-title">
                Ommaviy Oferta (Foydalanuvchi Shartnomasi)
              </h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="l-modal-body">
              <p>
                <em>So‘nggi yangilanish: 2026-yil noyabr</em>
              </p>
              <h4>1. Umumiy qoidalar</h4>
              <p>
                Ushbu Ommaviy Oferta «Sihhat.uz» axborot platformasi orqali
                O‘zbekiston Respublikasi hududidagi sanatoriylar, dam olish
                maskanlari va sog‘lomlashtirish majmualari xizmatlarini bron
                qilish tartibini belgilaydi.
              </p>
              <h4>2. Xizmat predmeti</h4>
              <p>
                Platformadagi narxlar Sanatoriyaning rasmiy kassa narxlariga
                teng bo‘lib, qo‘shimcha yashirin to‘lovlar undirilmaydi.
              </p>
              <h4>3. Bron qilish va elektron vaucher</h4>
              <p>
                Foydalanuvchi kerakli sanatoriya, tarif va sanalarni tanlab
                bron rasmiylashtirgach, QR-kodli elektron vaucher taqdim etiladi.
              </p>
              <h4>4. To‘lovlar</h4>
              <p>
                To‘lovlar TezCheck orqali Click, Payme, Uzcard / Humo
                vositasida xavfsiz amalga oshiriladi.
              </p>
            </div>
            <div className="l-modal-footer">
              <button
                type="button"
                className="l-btn-neon"
                onClick={() => setActiveModal(null)}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "maxfiylik" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div className="l-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="l-modal-header">
              <h3 className="l-modal-title">Maxfiylik Siyosati</h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="l-modal-body">
              <p>
                O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar
                to‘g‘risida»gi Qonuniga muvofiq foydalanuvchi ma’lumotlari
                HTTPS/TLS shifrlash orqali himoyalanadi va uchinchi shaxslarga
                berilmaydi.
              </p>
              <h4>1. Ma’lumotlardan foydalanish</h4>
              <p>
                Telefon raqami, ism va tashrif sanalari faqat sanatoriyada
                xonani bron qilish va mijozga xizmat ko‘rsatish uchun ishlatiladi.
              </p>
              <h4>2. Hisobni o‘chirish huquqi</h4>
              <p>
                Foydalanuvchi istalgan vaqtda mobil ilova ichidan o‘z hisobini va
                shaxsiy ma’lumotlarini o‘chirishi mumkin.
              </p>
            </div>
            <div className="l-modal-footer">
              <button
                type="button"
                className="l-btn-neon"
                onClick={() => setActiveModal(null)}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "qaytarish" && (
        <div
          className="l-modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div className="l-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="l-modal-header">
              <h3 className="l-modal-title">Pulni qaytarish shartlari</h3>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="l-modal-body">
              <h4>1. Bepul bekor qilish</h4>
              <p>
                Sanatoriyaga kelish sanasidan 24–72 soat oldin (tanlangan tarif
                qoidasiga ko‘ra) bron bekor qilinsa, to‘langan mablag‘ 1–5 ish
                kuni ichida to‘liq qaytariladi.
              </p>
            </div>
            <div className="l-modal-footer">
              <button
                type="button"
                className="l-btn-neon"
                onClick={() => setActiveModal(null)}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9.8 POPUP AD MODAL (From /api/catalog/ads) */}
      {activePopupAd && (
        <div
          className="l-modal-backdrop"
          onClick={closePopupAd}
          style={{ zIndex: 10000 }}
        >
          <div
            className="l-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--l-neon)",
                }}
              >
                Maxsus taklif
              </span>
              <button
                type="button"
                className="l-modal-close"
                aria-label="Yopish"
                onClick={closePopupAd}
              >
                <X size={18} />
              </button>
            </div>

            {activePopupAd.image_asset_id && (
              <div
                style={{
                  width: "100%",
                  maxHeight: 220,
                  overflow: "hidden",
                  borderRadius: 16,
                  marginBottom: "1rem",
                  border: "1px solid var(--l-border)",
                }}
              >
                <img
                  src={`/api/media/${activePopupAd.image_asset_id}`}
                  alt={activePopupAd.title}
                  onError={safeFallbackImage}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
              {activePopupAd.title}
            </h3>

            {activePopupAd.text && (
              <p
                style={{
                  color: "var(--l-muted)",
                  fontSize: "0.94rem",
                  lineHeight: 1.5,
                  margin: "0 0 1rem",
                }}
              >
                {activePopupAd.text}
              </p>
            )}

            {activePopupAd.has_discount && (
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(62, 230, 191, 0.16)",
                  color: "var(--l-neon)",
                  padding: "0.35rem 0.85rem",
                  borderRadius: 99,
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  marginBottom: "1rem",
                }}
              >
                Chegirma: {activePopupAd.discount_percent}%{" "}
                {activePopupAd.discount_text
                  ? `· ${activePopupAd.discount_text}`
                  : ""}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem" }}>
              <button
                type="button"
                className="l-btn-neon"
                style={{ flex: 1, padding: "0.75rem 1rem" }}
                onClick={() => {
                  handleAdClick(activePopupAd);
                  closePopupAd();
                }}
              >
                Batafsil ko‘rish
              </button>
              <button
                type="button"
                className="l-btn-ghost"
                onClick={closePopupAd}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
