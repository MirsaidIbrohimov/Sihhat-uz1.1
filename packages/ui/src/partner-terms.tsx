"use client";
import { useEffect } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck,
  MessageSquare,
  Printer,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

export const PARTNER_TERMS_VERSION = "2026-11-14";

export type PartnerTermRule = {
  id: string;
  number: string;
  title: string;
  summary: string;
  items: string[];
  section?: string;
  permission?: string;
  actionLabel?: string;
};

export const PARTNER_TERMS_SECTIONS: PartnerTermRule[] = [
  {
    id: "general",
    number: "1",
    title: "Umumiy qoidalar va hamkorlik maqomi",
    summary:
      "Sihhat.uz platformasiga ulangan har bir sanatoriya, profilaktoriya va sog‘lomlashtirish markazi mazkur Hamkor shartlari asosida faoliyat yuritadi.",
    items: [
      "Hamkorlik sanatoriya anketasi to‘ldirilgach, majburiy litsenziya va yuridik hujjatlar yuklanib, platforma administratori tomonidan tasdiqlanganidan so‘ng kuchga kiradi.",
      "Sihhat.uz orqali kelgan bronlar uchun platforma komissiyasi 0% ni tashkil etadi; hamkorlik ochiq abonent to‘lovi va ixtiyoriy reklama xizmatlari asosida amalga oshiriladi.",
      "Hamkor o‘z sanatoriyasi nomidan harakat qiluvchi Direktor, Resepsion va Hisobchi xodimlarining barcha amallari uchun to‘liq javobgar hisoblanadi.",
    ],
    section: "profile",
    permission: "sanatorium.profile.edit",
    actionLabel: "Sanatoriya profiliga o‘tish",
  },
  {
    id: "profile-accuracy",
    number: "2",
    title: "Ma’lumotlar haqqoniyligi va hujjatlar talabi",
    summary:
      "Mobil ilova va katalogda ko‘rsatiladigan barcha ma’lumotlar haqiqiy holatga to‘liq mos bo‘lishi shart.",
    items: [
      "Yuridik nom, STIR, haqiqiy manzil, xarita joylashuvi, aloqa telefoni, kirish/chiqish vaqtlari hamda tibbiy faoliyat litsenziyasi amaldagi qonunchilikka muvofiq kiritiladi.",
      "Xonalar, ovqatlanish, muolajalar va hudud suratlari haqiqiy hamda sifatli bo‘lishi kerak; chalg‘ituvchi yoki uchinchi shaxslarga tegishli rasmlar joylash taqiqlanadi.",
      "Profilga kiritilgan muhim o‘zgarishlar moderatsiyadan o‘tganidan keyin nashr qilinadi; tuzatish so‘rovi yuborilganda kamchiliklar o‘z vaqtida bartaraf etiladi.",
    ],
    section: "profile",
    permission: "sanatorium.profile.edit",
    actionLabel: "Hujjat va profilni tekshirish",
  },
  {
    id: "inventory-bookings",
    number: "3",
    title: "Xonalar fondi, narxlar va bron intizomi",
    summary:
      "Bron qilingan har bir o‘rin va tasdiqlangan tarif hamkor tomonidan kafolatlanadi.",
    items: [
      "Xona toifalari, umumiy o‘rinlar soni, mavjud kvota va tarif rejalari doimiy ravishda yangilab turiladi; Sihhat.uz foydalanuvchisi uchun narx sun’iy oshirilmaydi.",
      "Telefon yoki joyidan qabul qilingan bronlar ikki marta sotilishining (overbooking) oldini olish uchun darhol «Qo‘lda bron» orqali tizimga kiritilishi shart.",
      "Mehmon belgilangan kunda kelganida xona tayyor holda taqdim etiladi, joylashtirish (Check-in) va ketish (Check-out) holatlari o‘z vaqtida belgilanadi.",
    ],
    section: "bookings",
    permission: "bookings.read",
    actionLabel: "Bronlar bo‘limini ochish",
  },
  {
    id: "finance-refunds",
    number: "4",
    title: "To‘lovlar, qaytarish (Refund) va abonent intizomi",
    summary:
      "Moliyaviy hisob-kitoblar hamkorning tasdiqlangan bank rekvizitlari va ochiq qaytarish qoidalari asosida yuritiladi.",
    items: [
      "Onlayn to‘lovlar (Payme, Click, Uzcard, Humo va TezCheck) sanatoriyaning moderatsiyadan o‘tgan bank hisob raqamiga to‘g‘ridan-to‘g‘ri yo‘naltiriladi; kassa yoki bank rekvizitlari o‘zgarsa darhol yangilanishi shart.",
      "Sanatoriya tomonidan belgilangan «Refund shartlari» mehmon bron qilayotganda ko‘rinadi va hamkor ularga qat’iy rioya etishi, qaytarish so‘rovlarini asossiz kechiktirmasligi kerak.",
      "Platforma abonent to‘lovi muddati tugashidan avval «Hisob-kitoblar» bo‘limi orqali o‘z vaqtida to‘lanishi lozim; to‘lov kechiksa ilovada ko‘rinish va yangi onlayn bronlar vaqtincha to‘xtatilishi mumkin.",
    ],
    section: "refunds",
    permission: "refunds.read",
    actionLabel: "Refund shartlarini ko‘rish",
  },
  {
    id: "staff-security",
    number: "5",
    title: "Xodimlar boshqaruvi va axborot xavfsizligi",
    summary:
      "Har bir xodim shaxsiy login bilan ishlaydi va mehmonlarning shaxsiy ma’lumotlarini sir saqlaydi.",
    items: [
      "Bir hisobdan bir nechta kishi foydalanishi hamda login-parollarni begona shaxslarga berish taqiqlanadi; dastlabki parol birinchi kirishdayoq almashtirilishi shart.",
      "Xodim ishdan bo‘shaganda yoki lavozimi o‘zgarganda Direktor darhol «Jamoa» bo‘limidan uning kirishini cheklashi yoki faoliyatini to‘xtatishi shart.",
      "Mehmonlarning F.I.Sh., telefon raqami, shaxsiy hujjatlari va sog‘liqqa oid ma’lumotlaridan faqat sanatoriya xizmatini ko‘rsatish maqsadida foydalaniladi va uchinchi shaxslarga uzatilmaydi.",
    ],
    section: "staff",
    permission: "staff.invite",
    actionLabel: "Jamoa va ruxsatlarni boshqarish",
  },
  {
    id: "communication-compliance",
    number: "6",
    title: "Aloqa, Telegram bot va qoidabuzarlik oqibatlari",
    summary:
      "Tezkor aloqa va halol xizmat platforma ishonchining asosiy mezonidir.",
    items: [
      "Direktor va resepsion xodimlari muhim bron hamda murojaatlarni o‘tkazib yubormaslik uchun «Telegram bot» (`@sihhat_admins_bot`) bildirishnomalarini ulashi va «Yordam va xabarlar» bo‘limini muntazam kuzatishi tavsiya etiladi.",
      "Mijozlarning sharhlari va shikoyatlariga xushmuomalalik bilan javob beriladi; haqoratli munosabat, soxta sharh yozdirish yoki brondan asossiz bosh tortish qat’iyan taqiqlanadi.",
      "Mazkur Hamkor shartlari muntazam yoki qo‘pol ravishda buzilgan taqdirda Sihhat.uz ma’muriyati ogohlantirish berish, sanatoriyani vaqtincha muzlatish (SUSPENDED) yoki hamkorlikni bekor qilish huquqiga ega.",
    ],
    section: "telegram",
    actionLabel: "Telegram botni sozlash",
  },
];

export function PartnerTerms({
  onNavigate,
  allowed,
}: {
  onNavigate?: (section: string) => void;
  allowed?: (permission: string) => boolean;
}) {
  return (
    <div className="partner-terms-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SIHHAT.UZ HAMKORLIK QOIDALARI</p>
          <h1>Hamkor shartlari</h1>
          <p className="muted">
            Direktor, resepsion va hisobchi uchun yagona ish tartibi, moliyaviy
            intizom va xavfsizlik qoidalari.
          </p>
        </div>
        {typeof window !== "undefined" && (
          <div className="toolbar">
            <button
              type="button"
              className="button secondary"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Chop etish
            </button>
          </div>
        )}
      </div>

      <section className="partner-terms-hero" aria-label="Asosiy tamoyillar">
        <div className="partner-terms-hero-main">
          <div className="partner-terms-pill-row">
            <span className="role-pill">
              <FileCheck size={14} /> Tahrir: {PARTNER_TERMS_VERSION}
            </span>
            <span className="role-pill">
              <BadgeCheck size={14} /> Bron komissiyasi: 0%
            </span>
            <span className="role-pill">
              <Users size={14} /> Direktor · Resepsion · Hisobchi
            </span>
          </div>
          <h2>Ochiq hamkorlik va mas’uliyatli xizmat standarti</h2>
          <p className="muted">
            Sanatoriya anketasi tekshiruvga yuborilganda («Hamkor shartlari»
            tasdiqlanganda) va hamkor panelidan foydalanish jarayonida quyidagi
            6 bo‘limdagi barcha qoidalar majburiy hisoblanadi.
          </p>
        </div>
        <div className="partner-terms-quick">
          <div>
            <Building2 size={18} />
            <div>
              <strong>Profil va litsenziya</strong>
              <span className="muted">Haqiqiy suratlar va amaldagi hujjatlar</span>
            </div>
          </div>
          <div>
            <BookOpen size={18} />
            <div>
              <strong>Aniq xona kvotasi</strong>
              <span className="muted">Overbookingsiz bron va check-in nazorati</span>
            </div>
          </div>
          <div>
            <CreditCard size={18} />
            <div>
              <strong>To‘g‘ridan-to‘g‘ri tushum</strong>
              <span className="muted">Sanatoriyaning tasdiqlangan hisob raqamiga</span>
            </div>
          </div>
          <div>
            <ShieldCheck size={18} />
            <div>
              <strong>Ma’lumot xavfsizligi</strong>
              <span className="muted">Shaxsiy login va mehmon ma’lumoti himoyasi</span>
            </div>
          </div>
        </div>
      </section>

      <div className="partner-terms-grid">
        {PARTNER_TERMS_SECTIONS.map((rule) => {
          const canOpenSection =
            Boolean(onNavigate && rule.section) &&
            (!rule.permission || (allowed ? allowed(rule.permission) : true));
          return (
            <article className="card partner-term-card" key={rule.id}>
              <div className="card-head">
                <div className="partner-term-title">
                  <span className="partner-term-index">{rule.number}</span>
                  <div>
                    <h2>{rule.title}</h2>
                  </div>
                </div>
              </div>
              <div className="card-body partner-term-body">
                <p className="partner-term-summary">{rule.summary}</p>
                <ul className="partner-term-list">
                  {rule.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {canOpenSection && rule.section && rule.actionLabel && (
                  <div className="partner-term-foot">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => onNavigate?.(rule.section!)}
                    >
                      {rule.actionLabel} <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {onNavigate && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body partner-terms-support">
            <div>
              <strong>Hamkorlik shartlari bo‘yicha savolingiz bormi?</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Shartnoma, hujjatlar, to‘lovlar yoki texnik masalalar yuzasidan
                platforma ma’muriyatiga bevosita murojaat qilishingiz mumkin.
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              onClick={() => onNavigate("support")}
            >
              <MessageSquare size={16} /> Yordam xizmatiga yozish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PartnerTermsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal partner-terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-terms-dialog-title"
      >
        <div className="modal-heading">
          <div>
            <h2 id="partner-terms-dialog-title">Sihhat.uz · Hamkor shartlari</h2>
            <p className="muted">
              Amaldagi tahrir: {PARTNER_TERMS_VERSION} · Barcha sanatoriya
              xodimlari va rahbarlari uchun majburiy qoidalar
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Yopish"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="partner-terms-modal-scroll">
          {PARTNER_TERMS_SECTIONS.map((rule) => (
            <section className="partner-terms-modal-section" key={rule.id}>
              <h3>
                {rule.number}. {rule.title}
              </h3>
              <p className="muted">{rule.summary}</p>
              <ul className="partner-term-list">
                {rule.items.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="modal-footer">
          <button type="button" className="button primary" onClick={onClose}>
            Tanishdim, yopish
          </button>
        </div>
      </section>
    </div>
  );
}
