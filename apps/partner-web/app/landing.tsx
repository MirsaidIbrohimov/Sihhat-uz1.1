"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  MapPin,
  Moon,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Utensils,
  Wifi,
  Waves,
  X,
  Activity,
  Tv,
  Car,
} from "lucide-react";
import "./landing.css";

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
  map_url?: string;
  check_in_time?: string;
  check_out_time?: string;
  required_documents?: string;
  medical_requirements?: string;
  child_rules?: string;
  rating?: number | null;
  tag?: string;
}

const FALLBACK_SANATORIUMS: SanatoriumCardData[] = [
  {
    id: "4a84ecf9-0f07-47dc-819d-dfb2f82ab6e3",
    name: "Zomin Sanatoriyasi",
    region: "Jizzax (Zomin)",
    address: "Zomin tumani, Zomin milliy tabiat bog'i",
    tag: "Tog' havosi & Ignabargli o'rmon",
    meals: "3 mahal parhez va milliy taomlar",
    description: "Dengiz sathidan 2000 metr balandlikda, toza tog' va ignabargli archazorlar bag'rida joylashgan eng yirik iqlimiy kurort. Toza tog' havosi va zamonaviy fizioterapiya majmuasi.",
    directions: "Nafas a'zolari (bronxial astma, surunkali bronxit), asab tizimi, tayanch-harakat a'zolari va umumiy immunitetni tiklash.",
    services: ["Fizioterapiya", "Massaj", "Tuzli g'or (Speleoterapiya)", "Inflyatsiya", "Balchiq bilan davolash"],
    amenities: ["Wi-Fi", "Yopiq basseyn", "Sauna & Jakuzi", "Tennis korti", "Avtoturargoh", "Lift", "Xonada televizor"],
    from_amount: "450 000",
    price_label: "Kunlik davolanish va 3 mahal ovqat bilan",
    map_url: "https://www.google.com/maps/place/Zomin+sanatoriysi/@39.6342404,68.4998058,434m/data=!3m1!1e3",
    check_in_time: "08:00",
    check_out_time: "20:00",
    required_documents: "Pasport, sanatoriya-kurort kartasi (mavjud bo'lsa)",
    child_rules: "4 yoshdan katta bolalar qabul qilinadi",
    rating: 4.9,
    photo_ids: [
      "7a5f9fe3-561b-456c-8692-5e96e725f582",
      "11a0694a-c729-41a8-a8a8-6e3af8a04199",
      "1699854a-34f9-4cf4-a735-c2ff759b006f",
      "717a4be2-f1cd-4442-93c0-ff5c345ec3a2",
    ],
  },
  {
    id: "chortoq-sanatoriyasi-ref",
    name: "Chortoq Sanatoriyasi",
    region: "Namangan (Chortoq)",
    address: "Namangan viloyati, Chortoq tumani",
    tag: "Shifobaxsh mineral suvlar",
    meals: "3 mahal shifobaxsh parhez taomlar",
    description: "O'zbekistondagi eng mashhur yod-bromli va mineral suvli balneologik shifo maskani. Chortoq suvi oshqozon-ichak va moddalar almashinuvini yaxshilashda tengsizdir.",
    directions: "Oshqozon-ichak xastaliklari (gastrit, kolit, yara), jigar va o't pufagi, moddalar almashinuvi, qandli diabet va bo'g'im kasalliklari.",
    services: ["Mineral vannalar", "Ichimlik mineral suvi", "Loyiha balchiqlari", "Dush-massaj", "Parafinoterapiya"],
    amenities: ["Wi-Fi", "Yashil bog'", "Kutubxona", "Oshxona", "Fitobar", "Avtoturargoh"],
    from_amount: "420 000",
    price_label: "Davolash kursi, mineral suv va yashash bilan",
    map_url: "https://maps.google.com/?q=Chortoq+sanatoriyasi",
    check_in_time: "08:00",
    check_out_time: "18:00",
    required_documents: "Pasport, tibbiy yo'llanma yoki sanatoriya kartasi",
    child_rules: "Har qanday yoshdagi bolalar uchun ruxsat etiladi",
    rating: 4.8,
  },
  {
    id: "chimyon-sanatoriyasi-ref",
    name: "Chimyon Sanatoriyasi",
    region: "Farg'ona",
    address: "Farg'ona viloyati, Oltiariq tumani, Chimyon qishlog'i",
    tag: "Serovodorod va shifobaxsh balchiq",
    meals: "3 mahal parhez stol taomlari",
    description: "Markaziy Osiyodagi eng yirik serovodorodli shifobaxsh buloqlar va mineral balchiq kurorti. Qon aylanish va bo'g'im kasalliklarini davolashda yuqori samarali.",
    directions: "Yurak-qon tomir tizimi, tayanch-harakat a'zolari (artrit, artroz, osteoxondroz), teri kasalliklari, ginekologiya va urologiya.",
    services: ["Serovodorod vannalari", "Balchiq bilan davolash", "Elektroterapiya", "Fizioterapiya", "Gidromassaj"],
    amenities: ["Wi-Fi", "Kinoteatr", "Basseyn", "Choyxona", "Yashil xiyobon", "Avtoturargoh"],
    from_amount: "390 000",
    price_label: "Barcha serovodorod vannalari va davolash bilan",
    map_url: "https://maps.google.com/?q=Chimyon+sanatoriyasi+Fargona",
    check_in_time: "09:00",
    check_out_time: "19:00",
    required_documents: "Pasport va sanatoriya-kurort kartasi",
    child_rules: "3 yoshdan bolalar qabul qilinadi",
    rating: 4.7,
  },
  {
    id: "oqtosh-sanatoriyasi-ref",
    name: "Oqtosh Sanatoriyasi",
    region: "Toshkent viloyati",
    address: "Bo'stonliq tumani, Oqtosh qishlog'i",
    tag: "Tog' daryosi & O'pka reabilitatsiyasi",
    meals: "3 mahal vitaminlarga boy parhez taomlar",
    description: "Dengiz sathidan 1100 metr balandlikda, Oqtoshsoy va Oqsoqotasoy daryolari oralig'ida joylashgan. Ignabargli va keng bargli o'rmonlar toza tog' havosi bilan ta'minlaydi.",
    directions: "Nafas olish a'zolarining no-sil kasalliklari, o'pka reabilitatsiyasi, allergik kasalliklar, asab tizimi toliqishi.",
    services: ["Galoterapiya (Tuz xonasi)", "Ingalyatsiya", "Klimatoterapiya", "Fitobar", "Terapevtik massaj"],
    amenities: ["Wi-Fi", "Yozgi basseyn", "Bilyard zali", "Tog' sayr yo'lakchalari", "Bolalar maydonchasi"],
    from_amount: "480 000",
    price_label: "To'liq davolash va sog'lomlashtirish kursi bilan",
    map_url: "https://maps.google.com/?q=Oqtosh+sanatoriyasi",
    check_in_time: "08:00",
    check_out_time: "17:00",
    required_documents: "Shaxsni tasdiqlovchi hujjat",
    child_rules: "Bolalar uchun maxsus chegirmalar mavjud",
    rating: 4.8,
  },
  {
    id: "boston-sanatoriyasi-ref",
    name: "Bo'ston Sanatoriyasi",
    region: "Toshkent viloyati",
    address: "Qibray tumani, Bo'zsuv kanali bo'yida",
    tag: "Kardiologiya va zamonaviy reabilitatsiya",
    meals: "3 mahal maxsus parhez ovqatlar",
    description: "Toshkent shahriga yaqin, Bo'zsuv kanali sohilidagi go'zal maskan. Eng so'nggi rusumdagi kardiologik diagnostika va davolash apparatlari bilan jihozlangan.",
    directions: "Yurak-qon tomir tizimi xastaliklari (yurak ishemiyasi, gipertoniya, infarktdan keyingi tiklanish), asab tizimi, endokrinologiya.",
    services: ["EKG va kardiomonitoring", "Lazeroterapiya", "Gidroterapiya", "Magnitoterapiya", "Suv osti massaji"],
    amenities: ["Wi-Fi", "Yopiq va ochiq basseyn", "Fitnes zali", "Sauna", "Konferents-zal", "Xonada konditsioner"],
    from_amount: "520 000",
    price_label: "Kardiologik nazorat va muolajalar bilan",
    map_url: "https://maps.google.com/?q=Boston+sanatoriyasi+Qibray",
    check_in_time: "08:00",
    check_out_time: "18:00",
    required_documents: "Pasport, EKG va umumiy qon tahlillari",
    child_rules: "Faqat kattalar uchun",
    rating: 4.9,
  },
];

const MEDICAL_DIRECTIONS = [
  {
    icon: HeartPulse,
    title: "Yurak-qon tomir tizimi",
    description: "Gipertoniya, stenokardiya, yurak ishemik xastaliklari va infarktdan keyingi xavfsiz reabilitatsiya muolajalari.",
  },
  {
    icon: Activity,
    title: "Asab tizimi va stress",
    description: "Surunkali charchoq, uyqusizlik, nevroz, depressiya va insultdan keyingi tiklanish dasturlari.",
  },
  {
    icon: Stethoscope,
    title: "Tayanch-harakat a'zolari",
    description: "Artrit, artroz, umurtqa churrasi (grija), osteoxondroz va bo'g'im og'riqlarini shifobaxsh balchiqlar bilan davolash.",
  },
  {
    icon: Utensils,
    title: "Oshqozon-ichak a'zolari",
    description: "Shifobaxsh tabiiy mineral suvlar bilan gastrit, oshqozon yarasi, jigar va o't pufagi kasalliklarini sog'lomlashtirish.",
  },
  {
    icon: Waves,
    title: "Nafas olish a'zolari",
    description: "Zomin va Oqtosh tog' havosi, ignabargli o'rmonlar, bronxial astma, allergiyalar va bronxitdan to'liq forig' bo'lish.",
  },
  {
    icon: Sparkles,
    title: "Speleoterapiya va Balchiq",
    description: "Tabiiy tuz g'orlari va shifobaxsh mineral balchiqlar vositasida immunitetni mustahkamlash hamda tanani tozalash.",
  },
];

export function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sanatoriums, setSanatoriums] = useState<SanatoriumCardData[]>(FALLBACK_SANATORIUMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("Barchasi");
  const [selectedService, setSelectedService] = useState("Barchasi");
  const [activeModal, setActiveModal] = useState<
    null | "oferta" | "maxfiylik" | "qaytarish" | "download" | { type: "details"; item: SanatoriumCardData }
  >(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Initialize theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sihhat-web-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sihhat-web-theme", next);
    } catch {}
  };

  // Fetch real catalog from API
  useEffect(() => {
    async function loadCatalog() {
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
              tag: item.services?.[0] || "Tavsiya etiladi",
              meals: item.meals || "3 mahal ovqatlanish",
              description: item.description || "",
              directions: item.directions || "",
              services: item.services || [],
              amenities: item.amenities || [],
              photo_ids: item.photo_ids || [],
              from_amount: item.from_amount ? (Number(item.from_amount) / 100).toLocaleString("ru-RU") : "450 000",
              price_label: item.price_label || "Boshlang'ich tarif",
              map_url: item.map_url,
              check_in_time: item.check_in_time || "08:00",
              check_out_time: item.check_out_time || "20:00",
              required_documents: item.required_documents || "Pasport va sanatoriya kartasi",
              child_rules: item.child_rules || "Bolalar uchun ruxsat etiladi",
              rating: item.rating || 4.9,
            }));

            // Merge API items with fallbacks ensuring no duplicate IDs
            setSanatoriums((prev) => {
              const apiIds = new Set(apiItems.map((a) => a.name.toLowerCase()));
              const filteredFallbacks = FALLBACK_SANATORIUMS.filter(
                (f) => !apiIds.has(f.name.toLowerCase())
              );
              return [...apiItems, ...filteredFallbacks];
            });
          }
        }
      } catch (e) {
        // Fallback remains active
      }
    }
    loadCatalog();
  }, []);

  // Filter sanatoriums
  const filteredSanatoriums = useMemo(() => {
    return sanatoriums.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.directions.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion =
        selectedRegion === "Barchasi" ||
        s.region.toLowerCase().includes(selectedRegion.toLowerCase());

      const matchesService =
        selectedService === "Barchasi" ||
        s.services.some((srv) => srv.toLowerCase().includes(selectedService.toLowerCase())) ||
        s.directions.toLowerCase().includes(selectedService.toLowerCase());

      return matchesSearch && matchesRegion && matchesService;
    });
  }, [sanatoriums, searchQuery, selectedRegion, selectedService]);

  const apkUrl = "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/raw/main/ilova/Sihhat-uz-demo-0.1.1.apk";

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <a href="/" className="landing-brand">
            <div className="brand-icon-wrap">
              <HeartPulse size={24} />
            </div>
            <span className="brand-name">Sihhat.uz</span>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#sanatoriylar">Sanatoriylar</a></li>
            <li><a href="#yonalishlar">Davolash sohalari</a></li>
            <li><a href="#afzalliklar">Afzalliklar</a></li>
            <li><a href="#ilova">Ilovani yuklab olish</a></li>
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("oferta")}
                style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}
              >
                Oferta
              </button>
            </li>
          </ul>

          <div className="landing-nav-actions">
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-button"
              title="Mavzuni almashtirish"
              style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--card-bg)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <a href="/hamkorlar" className="partner-portal-btn">
              <Building2 size={16} />
              <span>Hamkorlar kirishi</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>O'zbekistondagi №1 Sanatoriylar Milliy Portali</span>
          </div>

          <h1 className="hero-title">
            Salomatligingiz va xotirjam hordig'ingiz uchun <span className="highlight">eng sara sanatoriylar</span>
          </h1>

          <p className="hero-subtitle">
            O'zbekistonning barcha so'lim maskanlaridagi shifoxona va sanatoriylarini to'g'ridan-to'g'ri, rasmiy kassa narxlarida, ustamasiz onlayn tanlang va bron qiling.
          </p>

          {/* Interactive Search Card */}
          <div className="hero-search-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const el = document.getElementById("sanatoriylar");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="search-form-grid"
            >
              <div className="search-field-group">
                <label className="search-field-label">
                  <Search size={14} />
                  <span>Sanatoriya nomi</span>
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Zomin, Chortoq, Chimyon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="search-field-group">
                <label className="search-field-label">
                  <MapPin size={14} />
                  <span>Hudud / Viloyat</span>
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="search-select"
                >
                  <option value="Barchasi">Barcha hududlar</option>
                  <option value="Jizzax">Jizzax (Zomin tog'lari)</option>
                  <option value="Toshkent">Toshkent viloyati</option>
                  <option value="Namangan">Namangan (Chortoq)</option>
                  <option value="Farg'ona">Farg'ona (Chimyon)</option>
                  <option value="Qashqadaryo">Qashqadaryo</option>
                  <option value="Surxondaryo">Surxondaryo</option>
                </select>
              </div>

              <div className="search-field-group">
                <label className="search-field-label">
                  <Stethoscope size={14} />
                  <span>Davolash sohasi</span>
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="search-select"
                >
                  <option value="Barchasi">Barcha kasalliklar</option>
                  <option value="Nafas">Nafas yo'llari & O'pka</option>
                  <option value="Kardiologiya">Yurak-qon tomir</option>
                  <option value="Oshqozon">Oshqozon-ichak & Jigar</option>
                  <option value="Asab">Asab tizimi & Nevroz</option>
                  <option value="Tayanch">Bo'g'im & Umurtqa</option>
                  <option value="Speleo">Tuzli g'or (Speleoterapiya)</option>
                </select>
              </div>

              <button type="submit" className="search-submit-btn">
                <Search size={18} />
                <span>Qidirish</span>
              </button>
            </form>
          </div>

          {/* Trust Badges */}
          <div className="hero-trust-row">
            <div className="trust-item">
              <div className="trust-icon-circle"><Check size={16} /></div>
              <span>100% Rasmiy sanatoriya narxlari</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon-circle"><ShieldCheck size={16} /></div>
              <span>Litsenziyalangan shifokorlar va tekshirilgan maskanlar</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon-circle"><Smartphone size={16} /></div>
              <span>Mobil ilovada qulay boshqaruv va QR-vaucher</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sanatoriums Catalog Section */}
      <section id="sanatoriylar" className="sanatoriums-section">
        <div className="section-header">
          <span className="section-tag">Eng sara maskanlar</span>
          <h2 className="section-title">O'zbekistonning mashhur sanatoriylari</h2>
          <p className="section-description">
            Tabiiy iqlim, shifobaxsh mineral buloqlar va zamonaviy tibbiy muolajalar bilan sog'lig'ingizni tiklang.
          </p>
        </div>

        {filteredSanatoriums.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "var(--card-bg)", borderRadius: 20 }}>
            <Info size={40} color="#087d66" style={{ marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              Qidiruv bo'yicha sanatoriyalar topilmadi
            </h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Filtrlarni o'zgartirib qayta urinib ko'ring yoki barcha sanatoriyalarni ko'ring.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSelectedRegion("Barchasi"); setSelectedService("Barchasi"); }}
              className="partner-portal-btn"
              style={{ cursor: "pointer" }}
            >
              Barcha sanatoriyalarni ko'rsatish
            </button>
          </div>
        ) : (
          <div className="sanatorium-cards-grid">
            {filteredSanatoriums.map((s) => {
              const photoUrl = s.photo_ids?.[0]
                ? `/api/media/${s.photo_ids[0]}`
                : "/branding/welcome-retreat.png";

              return (
                <div key={s.id} className="sanatorium-card">
                  <div className="card-image-wrap">
                    <img
                      src={photoUrl}
                      alt={s.name}
                      className="card-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/branding/welcome-retreat.png";
                      }}
                    />
                    <div className="card-tag-badge">
                      {s.tag || s.region}
                    </div>
                    <div className="card-price-overlay">
                      {s.from_amount} so'mdan
                    </div>
                  </div>

                  <div className="card-content-body">
                    <div className="card-location-row">
                      <MapPin size={14} color="#087d66" />
                      <span>{s.region}</span>
                      {s.rating && (
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                          <Star size={14} fill="#d97706" />
                          <span>{s.rating}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="card-title">{s.name}</h3>

                    <p className="card-desc-snippet">{s.description}</p>

                    <div className="card-amenities-tags">
                      {s.services.slice(0, 3).map((srv, idx) => (
                        <span key={idx} className="amenity-pill">{srv}</span>
                      ))}
                      {s.amenities.slice(0, 2).map((am, idx) => (
                        <span key={idx} className="amenity-pill">{am}</span>
                      ))}
                    </div>

                    <div className="card-action-footer">
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryIndex(0);
                          setActiveModal({ type: "details", item: s });
                        }}
                        className="btn-view-details"
                      >
                        <span>Batafsil ma'lumot</span>
                        <ChevronRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveModal("download")}
                        className="partner-portal-btn"
                        style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}
                        title="Ilova orqali bron qilish"
                      >
                        <Smartphone size={16} />
                        <span>Bron qilish</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Medical Directions Section */}
      <section id="yonalishlar" className="medical-section">
        <div className="medical-container">
          <div className="section-header">
            <span className="section-tag">Shifobaxsh yo'nalishlar</span>
            <h2 className="section-title">Qaysi sohalar bo'yicha davolanish mumkin?</h2>
            <p className="section-description">
              O'zbekiston sanatoriylari o'ziga xos tabiiy omillar, shifobaxsh balchiqlar va zamonaviy tibbiy uskunalar bilan jihozlangan.
            </p>
          </div>

          <div className="medical-grid">
            {MEDICAL_DIRECTIONS.map((dir, idx) => {
              const Icon = dir.icon;
              return (
                <div key={idx} className="medical-card">
                  <div className="medical-card-icon">
                    <Icon size={26} />
                  </div>
                  <h3 className="medical-card-title">{dir.title}</h3>
                  <p className="medical-card-desc">{dir.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="afzalliklar" className="why-section">
        <div className="section-header">
          <span className="section-tag">Nega aynan Sihhat.uz?</span>
          <h2 className="section-title">Biz bilan dam olish qulay va ishonchli</h2>
          <p className="section-description">
            Biz sanatoriya bron qilish jarayonini har bir yurtdoshimiz uchun oson, shaffof va qulay qildik.
          </p>
        </div>

        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-box"><ShieldCheck size={28} /></div>
            <h3 className="why-card-title">Kafolatlangan kassa narxlari</h3>
            <p className="why-card-desc">Hech qanday yashirin komissiyalarsiz, to'g'ridan-to'g'ri sanatoriya kassasi bilan bir xil narxda.</p>
          </div>

          <div className="why-card">
            <div className="why-icon-box"><Check size={28} /></div>
            <h3 className="why-card-title">Haqiqiy sharoit va fotolar</h3>
            <p className="why-card-desc">Sanatoriyalarning haqiqiy suratlari, davolash profili va xona sharoitlari to'liq tekshirilgan.</p>
          </div>

          <div className="why-card">
            <div className="why-icon-box"><Smartphone size={28} /></div>
            <h3 className="why-card-title">Tezkor Mobil Ilova</h3>
            <p className="why-card-desc">Uydan chiqmasdan, telefoningizda bir necha daqiqada kerakli sanatoriyani tanlang va bron qiling.</p>
          </div>

          <div className="why-card">
            <div className="why-icon-box"><Phone size={28} /></div>
            <h3 className="why-card-title">Doimiy qo'llab-quvvatlash</h3>
            <p className="why-card-desc">Sanatoriya tanlash, hujjatlar va borish yo'llari bo'yicha mutaxassislarimiz yordam beradi.</p>
          </div>
        </div>
      </section>

      {/* App Download Banner */}
      <section id="ilova" className="app-download-section">
        <div className="app-container">
          <div>
            <div className="app-badge">
              <Download size={15} />
              <span>Sihhat.uz Mobil Ilovasi</span>
            </div>

            <h2 className="app-title">
              Barcha sanatoriylar doimo cho'ntagingizda!
            </h2>

            <p className="app-desc">
              Rasmiy Android ilovamizni yuklab oling va O'zbekistonning istalgan sanatoriysiga navbatsiz, qulay tarzda bron qiling.
            </p>

            <ul className="app-features-list">
              <li>
                <Check size={18} color="#9ef0d5" />
                <span>Tezkor SMS orqali kirish (kod: 123456)</span>
              </li>
              <li>
                <Check size={18} color="#9ef0d5" />
                <span>Bo'sh xonalar va kunlik narxlarni onlayn tekshirish</span>
              </li>
              <li>
                <Check size={18} color="#9ef0d5" />
                <span>QR-kodli elektron vaucher va buyurtmalar tarixi</span>
              </li>
              <li>
                <Check size={18} color="#9ef0d5" />
                <span>Offline rejimda ham sanatoriylar ma'lumotlarini ko'rish</span>
              </li>
            </ul>

            <div className="app-actions-wrap">
              <a href={apkUrl} className="btn-download-apk" download>
                <Download size={20} />
                <span>Android APK yuklab olish (59.6 MB)</span>
              </a>

              <a
                href="https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/tree/main/ilova"
                target="_blank"
                rel="noreferrer"
                className="btn-download-gh"
              >
                <ExternalLink size={17} />
                <span>GitHub orqali</span>
              </a>
            </div>
          </div>

          <div className="qr-code-box">
            <div className="qr-white-frame">
              <img
                src="/branding/app-qr.svg"
                alt="Sihhat.uz ilovasini yuklab olish QR-kodi"
                className="qr-img"
              />
            </div>
            <div className="qr-hint">Telefon kamerangizni tuting</div>
            <div className="qr-subhint">Kamerani QR-kodga yo'naltirib, APK faylni to'g'ridan-to'g'ri yuklab oling</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="brand-icon-wrap" style={{ width: 34, height: 34 }}>
                <HeartPulse size={20} />
              </div>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>Sihhat.uz</span>
            </div>
            <p className="footer-brand-desc">
              O'zbekiston Respublikasi bo'ylab sanatoriya va sog'lomlashtirish maskanlarini qulay bron qilish yagona milliy platformasi.
            </p>
            <div style={{ fontSize: "0.85rem", color: "#9ef0d5" }}>
              Demo sinov versiyasi: 0.1.1
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">Bo'limlar</h4>
            <ul className="footer-links-list">
              <li><a href="#sanatoriylar">Sanatoriylar katalogi</a></li>
              <li><a href="#yonalishlar">Davolash yo'nalishlari</a></li>
              <li><a href="#afzalliklar">Nega Sihhat.uz?</a></li>
              <li><a href="#ilova">Ilovani yuklab olish</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Hujjatlar</h4>
            <ul className="footer-links-list">
              <li><button type="button" onClick={() => setActiveModal("oferta")}>Ommaviy oferta</button></li>
              <li><button type="button" onClick={() => setActiveModal("maxfiylik")}>Maxfiylik siyosati</button></li>
              <li><button type="button" onClick={() => setActiveModal("qaytarish")}>Pulni qaytarish tartibi</button></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Hamkorlik & Boshqaruv</h4>
            <ul className="footer-links-list">
              <li><a href="/hamkorlar">Sanatoriyalar kabineti</a></li>
              <li><a href="/superadmin">Superadmin boshqaruvi</a></li>
              <li style={{ marginTop: 8 }}>
                <a href={apkUrl} download style={{ color: "#9ef0d5", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Download size={14} />
                  <span>APK yuklab olish</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div>
            © 2026 Sihhat.uz. Barcha huquqlar himoyalangan.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span>O'zbekiston, Toshkent</span>
            <span>Texnik qo'llab-quvvatlash: 24/7</span>
          </div>
        </div>
      </footer>

      {/* Sanatorium Details Modal */}
      {activeModal && typeof activeModal === "object" && activeModal.type === "details" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div>
                <h3 className="legal-modal-title">{activeModal.item.name}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <MapPin size={14} color="#087d66" />
                  <span>{activeModal.item.region} — {activeModal.item.address}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body">
              {/* Photo Showcase */}
              {activeModal.item.photo_ids && activeModal.item.photo_ids.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ width: "100%", height: 320, borderRadius: 16, overflow: "hidden", background: "#052620", marginBottom: 10 }}>
                    <img
                      src={`/api/media/${activeModal.item.photo_ids[galleryIndex] || activeModal.item.photo_ids[0]}`}
                      alt={activeModal.item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/branding/welcome-retreat.png";
                      }}
                    />
                  </div>
                  {activeModal.item.photo_ids.length > 1 && (
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                      {activeModal.item.photo_ids.map((pid, idx) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => setGalleryIndex(idx)}
                          style={{
                            width: 70,
                            height: 50,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: idx === galleryIndex ? "2px solid #087d66" : "2px solid transparent",
                            padding: 0,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={`/api/media/${pid}`}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <h4>Sanatoriya haqida</h4>
              <p>{activeModal.item.description}</p>

              <h4>Tibbiy ko'rsatmalar va davolash yo'nalishlari</h4>
              <p>{activeModal.item.directions}</p>

              <div className="details-modal-grid" style={{ marginTop: "1rem" }}>
                <div>
                  <h4>Davolash xizmatlari</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {activeModal.item.services.map((srv, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{srv}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Qulayliklar va sharoitlar</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {activeModal.item.amenities.map((am, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{am}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: 14, marginTop: "1.5rem", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.88rem" }}>
                  <div>
                    <strong>Kunlik narx:</strong> {activeModal.item.from_amount} so'mdan
                  </div>
                  <div>
                    <strong>Ovqatlanish:</strong> {activeModal.item.meals}
                  </div>
                  <div>
                    <strong>Kirish / Chiqish:</strong> {activeModal.item.check_in_time} / {activeModal.item.check_out_time}
                  </div>
                  <div>
                    <strong>Kerakli hujjatlar:</strong> {activeModal.item.required_documents}
                  </div>
                </div>
              </div>

              {activeModal.item.map_url && (
                <div style={{ marginTop: "1.5rem" }}>
                  <a
                    href={activeModal.item.map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="partner-portal-btn"
                    style={{ display: "inline-flex", gap: 6, textDecoration: "none" }}
                  >
                    <MapPin size={16} />
                    <span>Xaritada ochish (Google Maps)</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setActiveModal("download");
                }}
                className="btn-download-apk"
                style={{ padding: "0.7rem 1.4rem", fontSize: "0.95rem", cursor: "pointer" }}
              >
                <Smartphone size={18} />
                <span>Ilovada xonani bron qilish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Download Modal */}
      {activeModal === "download" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Sihhat.uz Ilovasini yuklab oling</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body" style={{ textAlign: "center" }}>
              <div style={{ width: 180, height: 180, margin: "0 auto 1.5rem", background: "#fff", padding: 12, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                <img src="/branding/app-qr.svg" alt="QR Kod" style={{ width: "100%", height: "100%" }} />
              </div>

              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>Kamerangizni QR-kodga yo'naltiring</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Telefoningiz orqali rasmiy demo versiyadagi APK faylni to'g'ridan-to'g'ri o'rnating.
              </p>

              <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: 14, textAlign: "left", fontSize: "0.88rem", marginBottom: "1.5rem", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, color: "#087d66", marginBottom: 4 }}>🔑 Demo kirish ma'lumotlari:</div>
                <div>Telefon raqami: <code>+998901234567</code> (yoki istalgan raqam)</div>
                <div>Demo SMS OTP kod: <code>123456</code></div>
              </div>

              <a
                href={apkUrl}
                download
                className="btn-download-apk"
                style={{ width: "100%", justifyContent: "center", display: "flex" }}
              >
                <Download size={18} />
                <span>To'g'ridan-to'g'ri APK yuklab olish (59.6 MB)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Ommaviy Oferta Modal */}
      {activeModal === "oferta" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Ommaviy Oferta (Foydalanuvchi Shartnomasi)</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p><em>So'nggi yangilanish: 2026-yil oktyabr</em></p>

              <h4>1. Umumiy qoidalar</h4>
              <p>
                Ushbu Ommaviy Oferta (keyingi o'rinlarda — «Shartnoma») «Sihhat.uz» axborot platformasi (keyingi o'rinlarda — «Platforma» yoki «Ijrochi») orqali O'zbekiston Respublikasi hududidagi sanatoriylar, dam olish maskanlari va sog'lomlashtirish majmualari (keyingi o'rinlarda — «Sanatoriya») xizmatlarini bron qilish tartibi va shartlarini belgilaydi.
              </p>

              <h4>2. Xizmat predmeti</h4>
              <p>
                Ijrochi Foydalanuvchiga Platforma orqali Sanatoriyalarning shart-sharoitlari, davolash profili, mavjud xonalari va rasmiy narxlari to'g'risida to'liq va haqqoniy ma'lumot olish hamda ularni onlayn bron qilish imkoniyatini taqdim etadi. Platformadagi narxlar Sanatoriyaning rasmiy kassa narxlariga teng bo'lib, qo'shimcha yashirin to'lovlar undirilmaydi.
              </p>

              <h4>3. Bron qilish va tasdiqlash tartibi</h4>
              <p>
                Foydalanuvchi kerakli sanatoriya, xona turi, kelish va ketish sanalarini tanlab, o'zining shaxsiy ma'lumotlarini (F.I.Sh., telefon raqami) kiritadi. Bron muvaffaqiyatli rasmiylashtirilgach, Foydalanuvchiga elektron vaucher (QR-kodli bron tasdig'i) taqdim etiladi.
              </p>

              <h4>4. To'lov va hisob-kitoblar</h4>
              <p>
                To'lovlar Sanatoriya qoidalariga muvofiq onlayn to'lov tizimlari orqali yoki Sanatoriyaga yetib kelganda qabulxona kassasida naqd/plastik karta orqali amalga oshiriladi. Har bir to'lov bo'yicha belgilangan tartibda elektron fiskal chek shakllantiriladi.
              </p>

              <h4>5. Tomonlarning javobgarligi</h4>
              <p>
                Platforma Sanatoriya tomonidan ko'rsatiladigan tibbiy va maishiy xizmatlarning sifati, shifokorlar xulosasi hamda mijozning sub'ektiv kutuvlariga bevosita javobgar emas. Sanatoriya o'z navbatida tasdiqlangan bron bo'yicha mijozga xonani o'z vaqtida taqdim etishga to'liq javobgardir.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
                style={{ cursor: "pointer" }}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maxfiylik Siyosati Modal */}
      {activeModal === "maxfiylik" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Maxfiylik Siyosati (Privacy Policy)</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>
                Ushbu Maxfiylik siyosati O'zbekiston Respublikasining 2019-yil 2-iyuldagi «Shaxsga doir ma'lumotlar to'g'risida»gi O'RQ-547-son Qonuni talablariga muvofiq ishlab chiqilgan bo'lib, Foydalanuvchilarning shaxsiy ma'lumotlarini to'plash, qayta ishlash va himoya qilish tartibini belgilaydi.
              </p>

              <h4>1. Yig'iladigan ma'lumotlar</h4>
              <p>
                Platformadan foydalanish jarayonida quyidagi ma'lumotlar qayta ishlanadi:
              </p>
              <ul>
                <li>Telefon raqami (avtorizatsiya va tasdiqlash uchun);</li>
                <li>Foydalanuvchining ismi va familiyasi;</li>
                <li>Tanlangan sanatoriya, xona va tashrif sanalari;</li>
                <li>Qurilma modeli va ilovadan foydalanish parametrlari.</li>
              </ul>

              <h4>2. Ma'lumotlardan foydalanish maqsadi</h4>
              <p>
                Shaxsiy ma'lumotlar faqat Sanatoriyada xonani bron qilish, mijoz bilan bog'lanish, buyurtma holati haqida SMS/xabarnoma yuborish hamda xizmat sifatini oshirish maqsadida qo'llaniladi.
              </p>

              <h4>3. Ma'lumotlar xavfsizligi</h4>
              <p>
                Sihhat.uz ma'lumotlar xavfsizligini ta'minlash uchun ilg'or shifrlash (HTTPS, TLS, tokenlashtirish) va himoyalangan server infratuzilmasidan foydalanadi. Foydalanuvchining shaxsiy ma'lumotlari qonun hujjatlarida nazarda tutilgan hollardan tashqari uchinchi shaxslarga berilmaydi.
              </p>

              <h4>4. Hisob va ma'lumotlarni o'chirish huquqi</h4>
              <p>
                Foydalanuvchi istalgan vaqtda o'z profilini o'chirish yoki shaxsiy ma'lumotlarini bazadan chiqarishni talab qilish huquqiga ega. Buning uchun mobil ilovadagi tegishli tugma yoki qo'llab-quvvatlash xizmatiga murojaat qilish kifoya.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
                style={{ cursor: "pointer" }}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulni Qaytarish Qoidalari Modal */}
      {activeModal === "qaytarish" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h3 className="legal-modal-title">Pulni Qaytarish va Bronni Bekor Qilish Qoidalari</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>
                Har bir sanatoriya o'zining xona sig'imi va mavsumiga qarab belgilangan qaytarish siyosatiga (Refund Policy) ega. Platformada standart quyidagi qaytarish muddatlari amal qiladi:
              </p>

              <h4>1. 72 soatlik bepul bekor qilish</h4>
              <p>
                Sanatoriyaga kelish sanasidan kamida 72 soat (3 kun) oldin bron bekor qilingan taqdirda, to'langan mablag' mijozga <strong>100% to'liq hajmda</strong> jarimalarsiz qaytariladi.
              </p>

              <h4>2. 24–48 soat qolganda bekor qilish</h4>
              <p>
                Kelish vaqtiga 24 soatdan 48 soatgacha vaqt qolganda bron bekor qilinsa, Sanatoriya qoidalariga ko'ra 1 kunlik yashash xarajati yoki bank komissiyasi ushlab qolinishi mumkin.
              </p>

              <h4>3. 24 soatdan kam vaqt qolganda yoki kelinmaganda (No-Show)</h4>
              <p>
                Mijoz ogohlantirmasdan sanatoriyaga kelmagan yoki 24 soatdan kam vaqt qolganda bekor qilgan taqdirda, band qilingan xona bo'sh turgani uchun birinchi kunlik to'lov qaytarilmasligi mumkin.
              </p>

              <h4>4. Mablag'ni qaytarish muddati</h4>
              <p>
                Tasdiqlangan qaytarish arizalari bo'yicha pul mablag'lari mijoz to'lov qilgan bank kartasiga 1 dan 5 ish kunigacha bo'lgan muddatda qaytarib o'tkaziladi.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
                style={{ cursor: "pointer" }}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
