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

export const PARTNER_TERMS_VERSION = "2026-11-15";

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
    title: "Umumiy qoidalar, maqom va 0% komissiya tamoyili",
    summary:
      "Sihhat.uz platformasiga ulangan har bir sanatoriya, profilaktoriya va sog‘lomlashtirish markazi mazkur Hamkor nizomi asosida faoliyat yuritadi.",
    items: [
      "Hamkorlik sanatoriya anketasi to‘liq to‘ldirilgach, majburiy yuridik hujjatlar hamda tibbiy litsenziya yuklanib, platforma administratori tomonidan tasdiqlanganidan (APPROVED) so‘ng kuchga kiradi.",
      "Sihhat.uz orqali kelgan bronlar uchun platforma komissiyasi 0% ni tashkil etadi; hamkorlik ochiq abonent to‘lovi rejasi asosida yuritiladi, tasdiqlangan reklama bannerlari esa bepul joylashtiriladi.",
      "Hamkor o‘z muassasasi nomidan harakat qiluvchi Direktor, Resepsion va Hisobchi xodimlarining barcha harakatlari, bron majburiyatlari hamda kiritilgan ma’lumotlarning haqqoniyligi uchun to‘liq javobgardir.",
      "Hamkor shartlarining yangilangan tahriri portalda e’lon qilinadi va e’lon qilingan sanadan boshlab joriy hamkorlik faoliyatiga nisbatan tatbiq etiladi.",
    ],
    section: "profile",
    permission: "sanatorium.profile.edit",
    actionLabel: "Sanatoriya profiliga o‘tish",
  },
  {
    id: "profile-accuracy",
    number: "2",
    title: "Sanatoriya anketasi, litsenziya, suratlar va moderatsiya",
    summary:
      "Katalog va mobil ilovada ko‘rsatiladigan barcha ma’lumotlar amaldagi qonunchilik va haqiqiy holatga to‘liq mos bo‘lishi shart.",
    items: [
      "Yuridik nom, 9 xonali STIR, haqiqiy manzil, xarita joylashuvi, +998 formatdagi aloqa telefoni, kirish/chiqish soatlari hamda amaldagi tibbiy faoliyat litsenziyasi hujjatlari to‘g‘ri kiritiladi.",
      "Katalogda e’lon qilish uchun kamida 4 tadan 30 tagacha haqiqiy va sifatli surat (har biri 8 MB gacha) yuklanadi; uchinchi shaxslarga tegishli, chalg‘ituvchi yoki begona muassasa rasmlarini joylash taqiqlanadi.",
      "Shaxsiy yuridik ma’lumotlar (yuridik nom, STIR, yuklangan hujjatlar va ichki aloqa telefoni) ommaviy katalogda yopiq saqlanadi; mijozning telefon raqami hamkorga faqat bron rasmiylashtirilgandan keyin ko‘rinadi.",
      "Profil DRAFT -> SUBMITTED -> APPROVED yoki CHANGES_REQUESTED bosqichlaridan o‘tadi; muhim o‘zgartirishlar kiritilganda ham moderatsiyadan o‘tishi va tuzatish so‘rovi o‘z vaqtida bajarilishi talab etiladi.",
    ],
    section: "profile",
    permission: "sanatorium.profile.edit",
    actionLabel: "Hujjat va profilni tekshirish",
  },
  {
    id: "inventory-bookings",
    number: "3",
    title: "Xonalar fondi, kvota, overbooking taqiqi va bron intizomi",
    summary:
      "Tizimda ochiq ko‘rsatilgan har bir o‘rin, tarif narxi va tasdiqlangan bron hamkor tomonidan kafolatlanadi.",
    items: [
      "Xona toifalari, umumiy o‘rinlar soni, mavjud kunlik kvota, bolalar yosh toifalari va tarif rejalari doimiy yangilab turiladi; Sihhat.uz foydalanuvchilari uchun narxni joyidagiga nisbatan sun’iy oshirish taqiqlanadi.",
      "Telefon (PHONE), joyidan murojaat (WALK_IN) yoki hamkor tomonidan qabul qilingan (PARTNER_MANUAL) barcha bronlar ikki marta sotilishining (overbooking) oldini olish uchun darhol «Qo‘lda bron» orqali kiritilishi shart.",
      "Mijoz ilovada bronni boshlaganda xona 5 daqiqaga (HOLD) band qilinadi; belgilangan 5 daqiqa ichida to‘lov amalga oshmasa hold bekor bo‘lib, kvota avtomatik bo‘shaydi.",
      "Mehmon kelganida QR-vaucher yoki bron kodi tekshirilib CHECKED_IN, ketganida CHECKED_OUT belgilanadi; zaruriyat bo‘lganda xona ko‘chirish qayd etiladi, kelmagan mehmon (NO_SHOW) holati uchun esa majburiy asosli izoh kiritiladi.",
    ],
    section: "bookings",
    permission: "bookings.read",
    actionLabel: "Bronlar bo‘limini ochish",
  },
  {
    id: "payments-merchants",
    number: "4",
    title: "Onlayn to‘lovlar, bank rekvizitlari, Merchant ulanishi va Payoutlar",
    summary:
      "Moliyaviy tushumlar faqat moderatsiyadan o‘tgan bank hisob raqami, alohida merchant ulanishi va ikki bosqichli nazorat orqali yuritiladi.",
    items: [
      "Onlayn to‘lovlar uchun 20 xonali bank hisob raqami, 5 xonali MFO, 9 xonali STIR va bank nomi tasdiqlanishi shart; rekvizit o‘zgarganda alohida tasdiqlash so‘rovi yuboriladi.",
      "To‘g‘ridan-to‘g‘ri hisob-kitob (direct) rejimida sanatoriyaning tasdiqlangan bank rekvizitlari va alohida merchant ulanishi tayyor bo‘lmaguncha onlayn to‘lov qabul qilinmaydi; maxfiy API kalitlar profil formasida saqlanmaydi.",
      "Sanatoriyaga o‘tkazmalar (Payout) bron xizmati yakunlangach (CHECKED_OUT) tasdiqlangan hisob raqamiga bank to‘lov dalili bilan o‘tkaziladi; to‘lovda REVIEW yoki nizo aniqlansa o‘tkazma tekshiruv yakunigacha muzlatiladi.",
      "Joyida naqd (CASH) yoki terminal (TERMINAL) orqali qabul qilingan to‘lovlar yakka xodim tomonidan tasdiqlanmaydi — ikkinchi vakolatli xodim tasdig‘i talab qilinadi; xato yozuvlar o‘chirilmasdan CORRECTED audit maqomi bilan tuzatiladi.",
    ],
    section: "payments",
    permission: "payments.read",
    actionLabel: "To‘lovlar bo‘limiga o‘tish",
  },
  {
    id: "refunds-disputes",
    number: "5",
    title: "Bekor qilish, pulni qaytarish (Refund) va to‘lov nizolari",
    summary:
      "Tarif shartlarida belgilangan qaytarish qoidalari mehmon va hamkor uchun teng kuchga ega hamda qat’iy ijro etiladi.",
    items: [
      "Har bir tarifda FULL_BEFORE_CUTOFF (kirish kunining 14:00 UTC+5 soatigacha belgilangan cutoff soati oldin bepul qaytarish) yoki NON_REFUNDABLE (qaytarilmaydigan) siyosat aniq ko‘rsatiladi.",
      "Cutoff muddati ichida berilgan haqli refund so‘rovlari o‘z vaqtida ko‘rib chiqilishi lozim; avtomatik qaytarish mavjud bo‘lmagan provayderlarda (masalan, TezCheck) tasdiqlangan qaytarishlar merchant kabineti orqali bajarilib tizimda tasdiqlanadi.",
      "NON_REFUNDABLE tariflarda oddiy bekor qilishga qaytarish qo‘llanilmaydi, biroq ikki marta yechish (PAYMENT_EXCEPTION) yoki sanatoriya aybi bilan xizmat ko‘rsatilmagan hollarda pul to‘liq qaytariladi.",
      "To‘lov va xizmat sifati bo‘yicha nizolar platforma administratsiyasi ishtirokida bron tarixi, to‘lov cheki hamda audit yozuvlari asosida hal qilinadi.",
    ],
    section: "payouts",
    permission: "payouts.read",
    actionLabel: "O‘tkazma va hisob-kitoblarni ko‘rish",
  },
  {
    id: "billing-ads",
    number: "6",
    title: "Abonent to‘lovi rejimi va bepul reklama joylashtirish",
    summary:
      "Sanatoriya katalogda faol ko‘rinishi uchun abonent to‘lovini o‘z vaqtida amalga oshiradi va reklama moderatsiyasi qoidalariga rioya qiladi.",
    items: [
      "Abonent xizmatlari TRIAL (sinov), ACTIVE (faol), PAST_DUE (imtiyozli muddat) va SUSPENDED bosqichlarida boshqariladi; hisob-fakturalar ko‘rsatilgan muddatda qoplanishi shart.",
      "Imtiyozli muddat tugaganidan keyin qarzdorlik qoplanmasa hisob SUSPENDED holatiga o‘tadi: sanatoriya katalogdan yashiriladi va yangi onlayn bronlar to‘xtatiladi, biroq avval tasdiqlangan bronlar bo‘yicha majburiyat saqlanadi.",
      "Bosh sahifa (HOME) va qalqib chiquvchi (POPUP) reklama bannerlari hamkorlar uchun bepul (0 so‘m) taqdim etiladi, ammo faqat Superadmin moderatsiyasidan (APPROVED) keyin efirga chiqadi.",
      "Reklamada haqiqatga to‘g‘ri kelmaydigan chegirma, tasdiqlanmagan tibbiy va’da yoki raqobatchilarga nisbatan nohalol taqqoslashlar joylashtirish taqiqlanadi.",
    ],
    section: "billing",
    permission: "invoices.read",
    actionLabel: "Abonent va hisoblarni ochish",
  },
  {
    id: "staff-security",
    number: "7",
    title: "Xodimlar, RBAC rollar, Hisobchi ajratmasi va xavfsizlik",
    summary:
      "Har bir xodim faqat o‘z vakolati doirasida shaxsiy hisob bilan ishlaydi va kirish xavfsizligiga javob beradi.",
    items: [
      "Hamkor jamoasi uch aniq rolga bo‘linadi: Direktor (to‘liq boshqaruv), Resepsion (bron, xona, check-in/out, joyida to‘lov qabul qilish) va Hisobchi (faqat operatsion/moliyaviy hisobotlar va eksport — mehmon yoki bronlarni tahrirlash huquqisiz).",
      "Bir hisobdan bir necha kishi foydalanishi va parolni boshqa shaxsga berish qat’iyan taqiqlanadi; berilgan dastlabki parol birinchi kirishdayoq yangilanishi majburiy.",
      "Veb-portalda 4 soat harakatsizlikdan so‘ng sessiya avtomatik yakunlanadi; 1 soat ichida 5 va undan ko‘p noto‘g‘ri parol kiritilishi xavfsizlik nazoratiga tushib, kirish vaqtincha cheklanishi mumkin.",
      "Xodim ishdan bo‘shaganda Direktor darhol «Jamoa va ruxsatlar» bo‘limidan uning kirishini to‘xtatishi shart; parol unutilganda tiklash hamda yuklab olinadigan CSV hisobotlarni maxfiy saqlash talab etiladi.",
    ],
    section: "staff",
    permission: "staff.invite",
    actionLabel: "Jamoa va ruxsatlarni boshqarish",
  },
  {
    id: "privacy-reviews-chat",
    number: "8",
    title: "Mehmon ma’lumotlari maxfiyligi, sharhlar va Support chat auditi",
    summary:
      "Mehmonlarning shaxsiy hamda tibbiy ma’lumotlarini asrash, halol sharhlar muhiti va shaffof yozishma intizomi majburiydir.",
    items: [
      "Mehmonlarning F.I.Sh., +998 telefoni, elektron pochtasi, bolalar yoshi, tashrif tarixi va sog‘liqqa oid ma’lumotlari «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonunga muvofiq faqat bron va davolash xizmati uchun ishlatiladi hamda uchinchi shaxslarga uzatilmaydi.",
      "Platformada sharh faqat haqiqiy yakunlangan tashrif (CHECKED_OUT) dan keyin yoziladi; hamkor sharhlarga odob va dalil bilan javob beradi, soxta sharh uyushtirish yoki mehmonga bosim o‘tkazish taqiqlanadi.",
      "«Yordam va xabarlar» chatidan xodim yoki foydalanuvchi o‘chirgan xabarlar suhbat oynasidan ko‘rinmasa ham, nizolarni hal etish uchun Superadmin audit jurnalida saqlanadi.",
      "Barcha muhim moliyaviy va boshqaruv amallari (AuditLog) tizimda o‘zgartirilmas tarix sifatida qayd etib boriladi.",
    ],
    section: "reviews",
    permission: "reviews.reply",
    actionLabel: "Sharhlar bo‘limini ochish",
  },
  {
    id: "telegram-sanctions-law",
    number: "9",
    title: "Telegram bot aloqasi, sanksiyalar, fors-major va nizolar",
    summary:
      "Tezkor xabardorlik, halol raqobat va qoidabuzarlik uchun mutanosib javobgarlik tizim barqarorligini ta’minlaydi.",
    items: [
      "Direktor va resepsion xodimlari bron, to‘lov va shoshilinch murojaatlarni o‘tkazib yubormaslik uchun @sihhat_admins_bot bildirishnomalarini ulashi va muntazam kuzatishi shart.",
      "Muntazam overbooking, asossiz bron rad etish, yolg‘on hujjat/surat yuklash, mijoz ma’lumotini tarqatish yoki abonent qarzini yopmaslik holatlarida Sihhat.uz ogohlantirish berish, obyektni to‘xtatish (PAUSED/SUSPENDED) yoki hamkorlikni bekor qilish (ARCHIVED) huquqiga ega.",
      "Tabiiy ofatlar, davlat organlari cheklovlari, banklararo yoki aloqa tizimidagi favqulodda uzilishlar (fors-major) vaqtida tomonlar zudlik bilan qo‘llab-quvvatlash xizmatiga xabar beradi va bronni ko‘chirish/qaytarish bo‘yicha kelishadi.",
      "Kelib chiqqan nizolar avvalo platforma moderatsiyasi orqali muzokara yo‘li bilan, kelishuvga erishilmasa O‘zbekiston Respublikasi qonunchiligi va Toshkent shahri vakolatli sudlari tartibida hal qilinadi.",
    ],
    section: "telegram",
    actionLabel: "Telegram botni sozlash",
  },
];

export function PartnerTerms({
  onNavigate,
  allowed,
  canAccessSection,
}: {
  onNavigate?: (section: string) => void;
  allowed?: (permission: string) => boolean;
  canAccessSection?: (section: string, permission?: string) => boolean;
}) {
  const canOpen = (targetSection?: string, permission?: string) => {
    if (!onNavigate || !targetSection) return false;
    if (canAccessSection) return canAccessSection(targetSection, permission);
    return !permission || (allowed ? allowed(permission) : true);
  };
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
            tasdiqlanganda) va hamkor panelidan foydalanish jarayonida quyidagi{" "}
            {PARTNER_TERMS_SECTIONS.length} bo‘limdagi barcha qoidalar majburiy
            hisoblanadi.
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
          const canOpenSection = canOpen(rule.section, rule.permission);
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

      {canOpen("support") && (
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
              onClick={() => onNavigate?.("support")}
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
