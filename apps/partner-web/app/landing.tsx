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
  ChevronLeft,
  CheckCircle2,
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
  room_types?: Array<{
    id: string;
    name: string;
    maxGuests: number;
  }>;
  rate_plans?: Array<{
    id: string;
    name: string;
    baseAmount: string;
    minNights?: number;
    policy?: {
      name: string;
    };
  }>;
}

const FALLBACK_SANATORIUMS: SanatoriumCardData[] = [
  {
    id: "4a84ecf9-0f07-47dc-819d-dfb2f82ab6e3",
    name: "Zomin Sanatoriyasi",
    region: "Jizzax (Zomin)",
    address: "Zomin tumani, Zomin milliy tabiat bog'i",
    tag: "🏔️ 2000m Tog' havosi",
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
    tag: "💧 Shifobaxsh Yod-Brom",
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
    tag: "♨️ Mineral Balchiqlar",
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
    tag: "🌲 O'pka Reabilitatsiyasi",
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
    tag: "❤️ Kardiologiya Maskani",
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
  const [sanatoriums, setSanatoriums] = useState<SanatoriumCardData[]>(FALLBACK_SANATORIUMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("Barchasi");
  const [selectedService, setSelectedService] = useState("Barchasi");
  const [activeModal, setActiveModal] = useState<
    null | "oferta" | "maxfiylik" | "qaytarish" | "download" | { type: "details"; item: SanatoriumCardData }
  >(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Direct API integration: load real data from Sihhat API
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
              tag: item.services?.[0] ? `✨ ${item.services[0]}` : "Tavsiya etiladi",
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

            // Merge with fallbacks
            setSanatoriums((prev) => {
              const apiNames = new Set(apiItems.map((a) => a.name.toLowerCase()));
              const filteredFallbacks = FALLBACK_SANATORIUMS.filter(
                (f) => !apiNames.has(f.name.toLowerCase())
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

  // When a sanatorium is selected, fetch its full detailed record (room_types, rate_plans) from API
  const openSanatoriumDetails = async (item: SanatoriumCardData) => {
    setGalleryIndex(0);
    setActiveModal({ type: "details", item });

    if (item.id && !item.id.includes("ref")) {
      try {
        const detailRes = await fetch(`/api/catalog/sanatoriums/${item.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setActiveModal({
            type: "details",
            item: {
              ...item,
              room_types: detailData.room_types,
              rate_plans: detailData.rate_plans,
              photo_ids: detailData.photo_ids && detailData.photo_ids.length > 0 ? detailData.photo_ids : item.photo_ids,
              description: detailData.description || item.description,
              directions: detailData.directions || item.directions,
              map_url: detailData.map_url || item.map_url,
            },
          });
        }
      } catch (e) {
        // Use existing item
      }
    }
  };

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
      {/* 1. Header with Official Logo */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <a href="/" className="landing-brand">
            <img
              src="/branding/sihhat-logo.jpg"
              alt="Sihhat.uz Rasmiy Logosi"
              className="brand-logo-img"
            />
            <div className="brand-name">
              Sihhat<span>.uz</span>
            </div>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#sanatoriylar">Sanatoriylar</a></li>
            <li><a href="#yonalishlar">Davolash sohalari</a></li>
            <li><a href="#afzalliklar">Nega biz?</a></li>
            <li><a href="#ilova">Mobil ilova</a></li>
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("oferta")}
              >
                Oferta
              </button>
            </li>
          </ul>

          <div className="landing-nav-actions">
            <a href="/hamkorlar" className="partner-portal-btn">
              <Building2 size={16} />
              <span>Hamkorlar</span>
            </a>
            <a href="#ilova" className="apk-header-btn">
              <Download size={15} />
              <span>APK Yuklab olish</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>O‘zbekiston Sanatoriylarini Onlayn Bron Qilish Milliy Portali</span>
          </div>

          <h1 className="hero-title">
            Salomatlik va dam olish maskanlarini <span className="highlight">rasmiy kassa narxlarida</span> toping
          </h1>

          <p className="hero-subtitle">
            Toza tog‘ havosi, shifobaxsh mineral suvlar va litsenziyalangan shifokorlar nazorati. Ortiqcha to‘lovsiz va navbatsiz — to‘g‘ridan-to‘g‘ri bron qiling.
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
                  <Search size={13} />
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
                  <MapPin size={13} />
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
                  <Stethoscope size={13} />
                  <span>Davolash yo'nalishi</span>
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
              <div className="trust-icon-circle"><Check size={14} /></div>
              <span>100% Rasmiy Kassa Narxlari</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon-circle"><ShieldCheck size={14} /></div>
              <span>Sog'liqni Saqlash Litsenziyasi Tekshirilgan</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon-circle"><Smartphone size={14} /></div>
              <span>QR-Kodli Elektron Vaucher</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Sanatoriums Section */}
      <section id="sanatoriylar" className="sanatoriums-section">
        <div className="section-header">
          <span className="section-tag">Eng sara maskanlar</span>
          <h2 className="section-title">O'zbekistonning mashhur sanatoriylari</h2>
          <p className="section-description">
            To'g'ridan-to'g'ri API tizimimizga ulangan sanatoriylarning shart-sharoitlari, narxlari va mavjud xonalari.
          </p>
        </div>

        {filteredSanatoriums.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#0b1329", borderRadius: 20, border: "1px solid #1e293b" }}>
            <Info size={40} color="#10b981" style={{ marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem", color: "#fff" }}>
              Qidiruv bo'yicha sanatoriyalar topilmadi
            </h3>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
              Filtrlarni o'zgartirib qayta urinib ko'ring yoki barcha sanatoriyalarni ko'ring.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSelectedRegion("Barchasi"); setSelectedService("Barchasi"); }}
              className="partner-portal-btn"
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
                      <MapPin size={14} color="#10b981" />
                      <span>{s.region}</span>
                      {s.rating && (
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, color: "#f59e0b", fontWeight: 700 }}>
                          <Star size={13} fill="#f59e0b" />
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
                        onClick={() => openSanatoriumDetails(s)}
                        className="btn-view-details"
                      >
                        <span>Batafsil ma'lumot</span>
                        <ChevronRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveModal("download")}
                        className="apk-header-btn"
                        style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}
                        title="Ilovada bron qilish"
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

      {/* 4. Medical Directions Section */}
      <section id="yonalishlar" className="medical-section">
        <div className="medical-container">
          <div className="section-header">
            <span className="section-tag">Shifobaxsh yo'nalishlar</span>
            <h2 className="section-title">Qaysi sohalar bo'yicha davolanish mumkin?</h2>
            <p className="section-description">
              O'zbekiston sanatoriylari o'ziga xos tabiiy iqlim omillari, shifobaxsh balchiqlar va zamonaviy tibbiy muolajalar bilan jihozlangan.
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

      {/* 5. Why Choose Us Section */}
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
            <p className="why-card-desc">Hech qanday yashirin vositachilik to'lovlarisiz, to'g'ridan-to'g'ri sanatoriya kassasi bilan bir xil narxda.</p>
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

      {/* 6. App Download Banner (with QR and direct link) */}
      <section id="ilova" className="app-download-section">
        <div className="app-container">
          <div>
            <div className="app-badge">
              <Download size={14} />
              <span>Sihhat.uz Rasmiy Mobil Ilovasi</span>
            </div>

            <h2 className="app-title">
              Barcha sanatoriylar doimo cho'ntagingizda!
            </h2>

            <p className="app-desc">
              Rasmiy Android ilovamizni yuklab oling va O'zbekistonning istalgan sanatoriysiga navbatsiz, qulay tarzda bron qiling.
            </p>

            <ul className="app-features-list">
              <li>
                <CheckCircle2 size={18} color="#34d399" />
                <span>Tezkor Demo SMS orqali kirish (kod: 123456)</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#34d399" />
                <span>Bo'sh xonalar va kunlik narxlarni onlayn tekshirish</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#34d399" />
                <span>QR-kodli elektron vaucher va buyurtmalar tarixi</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#34d399" />
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
                <ExternalLink size={16} />
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
            <div className="qr-hint">Telefon kamerangizni qarating</div>
            <div className="qr-subhint">Kamerani QR-kodga yo'naltirib, APK faylni to'g'ridan-to'g'ri yuklab oling</div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <img
                src="/branding/sihhat-logo.jpg"
                alt="Sihhat.uz Logo"
                style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
              />
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>Sihhat.uz</span>
            </div>
            <p className="footer-brand-desc">
              O'zbekiston Respublikasi bo'ylab sanatoriya va sog'lomlashtirish maskanlarini qulay bron qilish yagona milliy platformasi.
            </p>
            <div style={{ fontSize: "0.82rem", color: "#34d399" }}>
              API versiyasi: 0.1.0 · Demo APK: 0.1.1
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
                <a href={apkUrl} download style={{ color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
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

      {/* Sanatorium Details Modal with Live Room Types & Rate Plans from API */}
      {activeModal && typeof activeModal === "object" && activeModal.type === "details" && (
        <div className="legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="legal-modal-card" style={{ maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div>
                <h3 className="legal-modal-title">{activeModal.item.name}</h3>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <MapPin size={14} color="#10b981" />
                  <span>{activeModal.item.region} — {activeModal.item.address}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="legal-modal-body">
              {/* Photo Showcase */}
              {activeModal.item.photo_ids && activeModal.item.photo_ids.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ width: "100%", height: 320, borderRadius: 16, overflow: "hidden", background: "#020617", marginBottom: 10 }}>
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
                            border: idx === galleryIndex ? "2px solid #10b981" : "2px solid #1e293b",
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

              {/* Live Room Types from API */}
              {activeModal.item.room_types && activeModal.item.room_types.length > 0 && (
                <div>
                  <h4>Mavjud xona turlari</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, margin: "10px 0" }}>
                    {activeModal.item.room_types.map((rt) => (
                      <div key={rt.id} style={{ padding: "10px 14px", borderRadius: 12, background: "#111e38", border: "1px solid #1e293b" }}>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{rt.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Maksimal: {rt.maxGuests} nafar mehmon</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
                <div>
                  <h4>Davolash xizmatlari</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
                    {activeModal.item.services.map((srv, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{srv}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Qulayliklar va sharoitlar</h4>
                  <ul style={{ paddingLeft: 18, margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
                    {activeModal.item.amenities.map((am, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{am}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ background: "#030712", padding: "1rem", borderRadius: 14, marginTop: "1.5rem", border: "1px solid #1e293b" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.88rem" }}>
                  <div>
                    <strong style={{ color: "#fff" }}>Kunlik narx:</strong> {activeModal.item.from_amount} so'mdan
                  </div>
                  <div>
                    <strong style={{ color: "#fff" }}>Ovqatlanish:</strong> {activeModal.item.meals}
                  </div>
                  <div>
                    <strong style={{ color: "#fff" }}>Kirish / Chiqish:</strong> {activeModal.item.check_in_time} / {activeModal.item.check_out_time}
                  </div>
                  <div>
                    <strong style={{ color: "#fff" }}>Kerakli hujjatlar:</strong> {activeModal.item.required_documents}
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
                onClick={() => setActiveModal("download")}
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body" style={{ textAlign: "center" }}>
              <div style={{ width: 170, height: 170, margin: "0 auto 1.5rem", background: "#fff", padding: 12, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                <img src="/branding/app-qr.svg" alt="QR Kod" style={{ width: "100%", height: "100%" }} />
              </div>

              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#fff" }}>Kamerangizni QR-kodga qarating</h4>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Telefoningiz orqali rasmiy demo versiyadagi APK faylni to'g'ridan-to'g'ri o'rnating.
              </p>

              <div style={{ background: "#030712", padding: "1rem", borderRadius: 14, textAlign: "left", fontSize: "0.88rem", marginBottom: "1.5rem", border: "1px solid #1e293b" }}>
                <div style={{ fontWeight: 700, color: "#10b981", marginBottom: 4 }}>🔑 Demo kirish ma'lumotlari:</div>
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p><em>So'nggi yangilanish: 2026-yil oktyabr</em></p>

              <h4>1. Umumiy qoidalar</h4>
              <p>
                Ushbu Ommaviy Oferta «Sihhat.uz» axborot platformasi orqali O'zbekiston Respublikasi hududidagi sanatoriylar, dam olish maskanlari va sog'lomlashtirish majmualari xizmatlarini bron qilish tartibi va shartlarini belgilaydi.
              </p>

              <h4>2. Xizmat predmeti</h4>
              <p>
                Platformadagi narxlar Sanatoriyaning rasmiy kassa narxlariga teng bo'lib, qo'shimcha yashirin to'lovlar undirilmaydi.
              </p>

              <h4>3. Bron qilish va tasdiqlash tartibi</h4>
              <p>
                Foydalanuvchi kerakli sanatoriya, xona turi, kelish va ketish sanalarini tanlab, o'zining shaxsiy ma'lumotlarini kiritadi va elektron vaucher (QR-kodli bron tasdig'i) oladi.
              </p>

              <h4>4. To'lov va hisob-kitoblar</h4>
              <p>
                To'lovlar Sanatoriya qoidalariga muvofiq onlayn yoki yetib kelganda qabulxona kassasida amalga oshiriladi.
              </p>

              <h4>5. Tomonlarning javobgarligi</h4>
              <p>
                Sanatoriya o'z navbatida tasdiqlangan bron bo'yicha mijozga xonani o'z vaqtida taqdim etishga to'liq javobgardir.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <p>
                Ushbu Maxfiylik siyosati O'zbekiston Respublikasining 2019-yil 2-iyuldagi «Shaxsga doir ma'lumotlar to'g'risida»gi O'RQ-547-son Qonuni talablariga muvofiq ishlab chiqilgan.
              </p>

              <h4>1. Yig'iladigan ma'lumotlar</h4>
              <p>
                Telefon raqami (avtorizatsiya uchun), F.I.Sh., tanlangan sanatoriya va tashrif sanalari.
              </p>

              <h4>2. Ma'lumotlardan foydalanish maqsadi</h4>
              <p>
                Shaxsiy ma'lumotlar faqat Sanatoriyada xonani bron qilish va mijoz bilan bog'lanish maqsadida qo'llaniladi.
              </p>

              <h4>3. Ma'lumotlar xavfsizligi</h4>
              <p>
                Ilg'or shifrlash (HTTPS, TLS, tokenlashtirish) vositalari bilan himoyalangan.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>
            <div className="legal-modal-body">
              <h4>1. 72 soatlik bepul bekor qilish</h4>
              <p>
                Kelish sanasidan kamida 72 soat oldin bekor qilinganda, to'langan mablag' mijozga <strong>100% to'liq hajmda</strong> jarimalarsiz qaytariladi.
              </p>

              <h4>2. 24–48 soat qolganda bekor qilish</h4>
              <p>
                Kelish vaqtiga 24-48 soat qolganda bekor qilinsa, Sanatoriya qoidalariga muvofiq qaytariladi.
              </p>

              <h4>3. Qaytarish muddati</h4>
              <p>
                Pul mablag'lari mijoz to'lov qilgan bank kartasiga 1 dan 5 ish kunigacha bo'lgan muddatda qaytariladi.
              </p>
            </div>
            <div className="legal-modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="partner-portal-btn"
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
