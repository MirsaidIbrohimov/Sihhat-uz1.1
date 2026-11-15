export const USER_TERMS_VERSION = "2026-11-15";

export type UserTermRule = {
  id: string;
  number: string;
  title: string;
  summary: string;
  items: string[];
};

export type UserPolicyKey = "oferta" | "maxfiylik" | "qaytarish" | "ai";

export type UserPolicyDoc = {
  id: UserPolicyKey;
  title: string;
  shortLabel: string;
  subtitle: string;
  sections: UserTermRule[];
};

export const USER_OFERTA_SECTIONS: UserTermRule[] = [
  {
    id: "oferta-general",
    number: "1",
    title: "Umumiy qoidalar va platforma maqomi",
    summary:
      "Ushbu Ommaviy oferta Sihhat.uz mobil ilovasi va veb-sayti orqali sanatoriya va sog‘lomlashtirish markazlari xizmatlarini bron qilish tartibini belgilaydi.",
    items: [
      "Hujjat O‘zbekiston Respublikasining «Elektron tijorat to‘g‘risida»gi, «Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi va «Shaxsga doir ma’lumotlar to‘g‘risida»gi qonunlariga muvofiq ommaviy oferta hisoblanadi.",
      "Sihhat.uz foydalanuvchilarga tasdiqlangan sanatoriyalarni izlash, tariflarni solishtirish, onlayn bron qilish va elektron QR-vaucher olish imkonini beruvchi raqamli platformadir.",
      "Platformada ko‘rsatilgan tariflar hamkor sanatoriyaning rasmiy narxlariga asoslanadi va mijozdan bron uchun yashirin platforma ustamasi olinmaydi.",
      "Bevosita joylashtirish, ovqatlanish va tibbiy muolaja xizmatlari tegishli litsenziyaga ega Hamkor sanatoriya tomonidan ko‘rsatiladi.",
    ],
  },
  {
    id: "oferta-account",
    number: "2",
    title: "Ro‘yxatdan o‘tish, Email OTP va hisob xavfsizligi",
    summary:
      "Shaxsiy kabinetga kirish xavfsiz bir martalik kod orqali amalga oshiriladi va ma’lumotlar aniqligi foydalanuvchi zimmasida bo‘ladi.",
    items: [
      "Mobil ilova va veb-kabinetga kirish elektron pochtaga yuboriladigan bir martalik tasdiqlash kodi (Email OTP) orqali bajariladi; bron rasmiylashtirishda esa mehmon F.I.Sh. va +998 formatdagi aloqa telefoni kiritiladi.",
      "Foydalanuvchi taqdim etgan elektron pochta, telefon raqami, mehmonlar soni va bolalar yosh toifasi haqqoniy bo‘lishi shart.",
      "Kirish kodlari hamda qurilma sessiyasini begona shaxslarga bermaslik lozim; shubhali harakat sezilganda darhol tizimdan chiqish va Yordam xizmatiga xabar berish talab etiladi.",
      "Platformada avtomatlashtirilgan dasturlar bilan ommaviy so‘rov yuborish, narx va ma’lumotlarni yig‘ish (scraping) yoki xizmat ishiga xalaqit berish taqiqlanadi.",
    ],
  },
  {
    id: "oferta-catalog-offline",
    number: "3",
    title: "Katalog, offline kesh va jonli narx ustuvorligi",
    summary:
      "Internet bo‘lmagan paytda avval yuklangan ma’lumotlar ko‘rinishi mumkin, biroq bron paytida serverdagi jonli holat ustuvor hisoblanadi.",
    items: [
      "Ilova avval yuklangan sanatoriyalar katalogi va tasdiqlangan vaucherlarni internet yo‘q paytda ham (offline rejimda) ko‘rish uchun qurilma xotirasida vaqtincha saqlaydi.",
      "Offline rejimda ko‘rsatilgan narx va bo‘sh o‘rinlar ma’lumot olish uchun xizmat qiladi; yakuniy kvota va narx bron yaratish (HOLD) paytida serverdan real vaqtda tasdiqlanadi.",
      "Biror sanatoriya profili tekshiruv yoki abonent sababli katalogdan vaqtincha yashirilgan bo‘lsa ham, ilgari to‘lab tasdiqlangan bronlar bo‘yicha xizmat majburiyati o‘z kuchida qoladi.",
    ],
  },
  {
    id: "oferta-hold",
    number: "4",
    title: "Bron qilish tartibi va 5 daqiqalik HOLD qoidasi",
    summary:
      "Bronni tasdiqlashdan oldin qaytarish shartlari qabul qilinadi va xona to‘lov uchun cheklangan vaqtga band qilinadi.",
    items: [
      "Foydalanuvchi sanatoriya, kirish/chiqish sanalari, mehmonlar tarkibi hamda tarif rejasini tanlab, «Bekor qilish va pulni qaytarish shartlari»ga rozilik bildirgach bron yaratiladi.",
      "Bron yaratilganda tanlangan xona kvotasi 5 daqiqa (HOLD) band qilinadi; foydalanuvchi yangi bron boshlasa, shu hisobdagi avvalgi to‘lanmagan holdlar avtomatik bekor qilinadi.",
      "5 daqiqa ichida to‘lov yakunlanmasa hold muddati tugab bekor bo‘ladi va bo‘shagan o‘rin umumiy katalogga qaytadi; muddati o‘tgan to‘lanmagan yozuvlar mijoz ro‘yxatidan yashiriladi.",
    ],
  },
  {
    id: "oferta-payments",
    number: "5",
    title: "Onlayn to‘lovlar va TezCheck hisob-kitoblari",
    summary:
      "Onlayn to‘lovlar milliy valyuta — so‘mda himoyalangan to‘lov sahifasi orqali amalga oshiriladi.",
    items: [
      "To‘lovlar TezCheck havolasi orqali Click, Payme, Uzcard va Humo tizimlarida amalga oshiriladi.",
      "Bank kartasi raqami, amal qilish muddati, CVV va SMS tasdiqlash kodlari Sihhat.uz serverlarida saqlanmaydi.",
      "Sanatoriyaning to‘g‘ridan-to‘g‘ri hisob-kitob (direct merchant) ulanishi yakunlanmagan obyektlarda onlayn to‘lov vaqtincha yopiq bo‘lishi mumkin.",
      "Texnik nosozlik tufayli mablag‘ ikki marta yechilsa yoki to‘lov holati kechiksa, tizimda qayta tekshirish va to‘lov istisnosi mexanizmi qo‘llaniladi.",
    ],
  },
  {
    id: "oferta-checkin",
    number: "6",
    title: "QR-vaucher, joylashish (Check-in), hujjatlar va No-show",
    summary:
      "To‘lovdan keyin taqdim etilgan QR-vaucher asosida mehmon sanatoriyaga qabul qilinadi.",
    items: [
      "To‘lov tasdiqlangach ilovada noyob bron raqami va QR-kodli vaucher shakllanadi; uni offline holatda ham resepsionga ko‘rsatish mumkin.",
      "Joylashishda (standart kirish vaqti kirish kunining soat 14:00 UTC+5 dan) mehmon shaxsini tasdiqlovchi hujjat (pasport/ID-karta, bolalar uchun guvohnoma) hamda sanatoriya talab qilgan tibbiy ma’lumotnomani taqdim etishi shart.",
      "Resepsion mehmonni joylashtirgach (CHECKED_IN) xizmat boshlangan hisoblanadi; kelish kunida ogohlantirishsiz kelmaslik (NO_SHOW) sabab bilan qayd etiladi va qaytarish masalasi tanlangan tarif qoidalariga ko‘ra hal qilinadi.",
    ],
  },
  {
    id: "oferta-conduct",
    number: "7",
    title: "Foydalanuvchi majburiyatlari va taqiqlangan harakatlar",
    summary:
      "Platforma va sanatoriya tartibiga hurmat bilan munosabatda bo‘lish barcha foydalanuvchilar uchun majburiydir.",
    items: [
      "Sanatoriyaning ichki tartib-qoidalari, tibbiy ko‘rsatmalar, sanitariya hamda xavfsizlik talablariga rioya qilish mehmon zimmasidadir.",
      "Soxta bronlar orqali xonalarni ataylab band qilish, haqoratli xabar/sharh joylash yoki boshqa shaxslar nomidan noqonuniy harakat qilish hisobni cheklashga olib kelishi mumkin.",
      "Elektron vaucherni uchinchi shaxslarga tijorat maqsadida qayta sotish taqiqlanadi.",
    ],
  },
  {
    id: "oferta-disputes",
    number: "8",
    title: "Fors-major, javobgarlik chegarasi va murojaatlar",
    summary:
      "Nizolar shaffof dalillar asosida, avvalo o‘zaro kelishuv yo‘li bilan hal qilinadi.",
    items: [
      "Elektr tarmog‘i, internet, banklararo to‘lov tizimlari uzilishi, tabiiy ofat va davlat organlari cheklovlari kabi fors-major holatlarda tomonlar kechikish uchun qonunchilik doirasida javobgarlikdan ozod qilinadi.",
      "Murojaat va shikoyatlar +998 88 295 20 28 telefoni, ilovadagi Yordam xizmati, @sihhat_support_bot yoki Toshkent shahri, Shayxontohur tumani, Navoiy ko‘chasi 11A manzili orqali qabul qilinadi.",
      "Muzokara yo‘li bilan hal bo‘lmagan nizolar O‘zbekiston Respublikasi qonunchiligiga muvofiq sud tartibida ko‘rib chiqiladi.",
    ],
  },
];

export const USER_PRIVACY_SECTIONS: UserTermRule[] = [
  {
    id: "privacy-legal",
    number: "1",
    title: "Huquqiy asos va ma’lumotlarni himoyalash tamoyili",
    summary:
      "Shaxsga doir ma’lumotlar O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuni asosida qayta ishlanadi.",
    items: [
      "Foydalanuvchi ma’lumotlari ilova, veb-portal va server o‘rtasida HTTPS/TLS shifrlash orqali uzatiladi.",
      "Ma’lumotlar faqat hisobga kirish, sanatoriyada bronni rasmiylashtirish, to‘lov cheki hamda vaucher berish, qo‘llab-quvvatlash aloqasi va qonuniy hisobdorlik uchun ishlatiladi.",
    ],
  },
  {
    id: "privacy-collected",
    number: "2",
    title: "Qaysi ma’lumotlar yig‘iladi",
    summary:
      "Tizim faqat xizmat ko‘rsatish uchun zarur bo‘lgan eng minimal hajmdagi ma’lumotlarni saqlaydi.",
    items: [
      "Hisob ma’lumotlari: elektron pochta (OTP kirish uchun), ism-familiya, +998 formatdagi telefon raqami va ixtiyoriy profil surati (15 MB gacha).",
      "Bron ma’lumotlari: tanlangan sanatoriya, kirish/chiqish sanalari, mehmon F.I.Sh., kattalar va bolalar soni/yoshi, to‘lov va vaucher identifikatorlari.",
      "Aloqa va xavfsizlik: Yordam chatidagi xabarlar hamda ilova fayllar, sharhlar, bildirishnomalar, onlayn faollik hamda kirish xavfsizligi jurnallari.",
    ],
  },
  {
    id: "privacy-sharing",
    number: "3",
    title: "Uchinchi shaxslarga taqdim etish va maskalash",
    summary:
      "Ma’lumotlaringiz reklama agentliklariga sotilmaydi va faqat xizmat zanjiridagi zarur ishtirokchilarga ochiladi.",
    items: [
      "Bron yakunlangunga qadar foydalanuvchi va sanatoriya o‘rtasidagi aloqa ma’lumotlari yopiq saqlanadi; bron rasmiylashtirilgach mehmonni qabul qilish uchun zarur F.I.Sh., telefon va sana tafsilotlari tegishli sanatoriyaga beriladi.",
      "Onlayn to‘lov paytida hisob raqami va summa TezCheck to‘lov shlyuziga uzatiladi; bank kartasi rekvizitlari Sihhat.uz da saqlanmaydi.",
      "AI yordamchi ishlatilganda xabarlardagi telefon raqami, email va maxfiy kalitlar modelga yuborishdan oldin avtomatik niqoblanadi.",
    ],
  },
  {
    id: "privacy-retention",
    number: "4",
    title: "Saqlash muddati, xabarlarni o‘chirish va audit",
    summary:
      "Foydalanuvchi o‘z yozishmalarini tahrirlashi mumkin, moliyaviy va nizoli holatlar bo‘yicha audit yozuvlari esa himoyalanadi.",
    items: [
      "Yordam chatida foydalanuvchi o‘chirgan xabar o‘z oynasi va hamkor oynasidan darhol yashiriladi, biroq nizolarni xolis ko‘rib chiqish uchun platformaning Superadmin audit jurnalida saqlanishi mumkin.",
      "Bronlar, to‘lov cheklari va refund hujjatlari buxgalteriya hamda qonunchilikda belgilangan muddat davomida saqlanadi.",
    ],
  },
  {
    id: "privacy-local",
    number: "5",
    title: "Lokal xotira, kesh va qurilma ruxsatlari",
    summary:
      "Qurilmadagi xotira kirish sessiyasi va offline vaucherni tezkor ko‘rsatish uchungina ishlatiladi.",
    items: [
      "Mobil ilova kirish tokenlarini xavfsiz saqlash (secure storage), mavzu (kun/tun) va oxirgi vaucher/katalog keshini ko‘rsatish uchun lokal xotiradan foydalanadi.",
      "Foydalanuvchi galereya, bildirishnoma yoki fayl ruxsatlarini qurilma sozlamalaridan istalgan payt o‘chirib qo‘yishi mumkin.",
    ],
  },
  {
    id: "privacy-rights",
    number: "6",
    title: "Foydalanuvchi huquqlari va ma’lumotlarni o‘chirish",
    summary:
      "Siz o‘z shaxsiy ma’lumotlaringizni boshqarish va o‘zgartirish huquqiga egasiz.",
    items: [
      "Profil bo‘limidan ism-sharif, +998 telefon raqami va avatar rasmini istalgan vaqtda yangilash mumkin.",
      "Hisobni butunlay o‘chirish yoki ma’lumotlar nusxasini olish uchun Yordam xizmati yoxud +998 88 295 20 28 raqami orqali murojaat qilinadi (faol bron yoki ochiq to‘lov nizosi bo‘lsa avval hisob-kitob yakunlanadi).",
    ],
  },
];

export const USER_REFUND_SECTIONS: UserTermRule[] = [
  {
    id: "refund-cutoff",
    number: "1",
    title: "Tarif siyosati va cutoff muddatini hisoblash",
    summary:
      "Har bir tarif rejasida qaytarish qoidasi bron qilishdan avval ochiq ko‘rsatiladi.",
    items: [
      "Platformada ikkita asosiy siyosat qo‘llaniladi: cutoff muddatigacha to‘liq qaytarish (FULL_BEFORE_CUTOFF) yoki qaytarilmaydigan tarif (NON_REFUNDABLE).",
      "Cutoff muddati kirish kunining mahalliy soat 14:00 (Toshkent vaqti, UTC+5) dan tarifda belgilangan soatlar (masalan, 24–72 soat) ayirib hisoblanadi.",
    ],
  },
  {
    id: "refund-unpaid",
    number: "2",
    title: "To‘lanmagan bron (HOLD) va bekor qilish",
    summary:
      "To‘lov amalga oshirilmagan brondan jarimasiz voz kechish mumkin.",
    items: [
      "To‘lov qilinmagan bron 5 daqiqalik hold muddati tugashi bilan avtomatik bekor bo‘ladi va mablag‘ yechilmaydi.",
      "To‘lov yakunlanishidan oldin foydalanuvchi bronni ilova orqali bevosita bekor qilishi mumkin.",
    ],
  },
  {
    id: "refund-paid",
    number: "3",
    title: "To‘langan bronda pulni qaytarish tartibi",
    summary:
      "Cutoff muddatigacha berilgan so‘rovlar bo‘yicha mablag‘ to‘liq qaytarilishga yo‘naltiriladi.",
    items: [
      "To‘langan brondan bosh tortish uchun «Bronlar» bo‘limidan yoki Yordam xizmati orqali sababi ko‘rsatilgan qaytarish so‘rovi yuboriladi.",
      "FULL_BEFORE_CUTOFF tarifida so‘rov cutoff muddatidan oldin berilgan bo‘lsa, to‘langan summa to‘liq qaytariladi.",
    ],
  },
  {
    id: "refund-exceptions",
    number: "4",
    title: "Qaytarilmaydigan tariflar va favqulodda istisnolar",
    summary:
      "NON_REFUNDABLE tarifda oddiy bekor qilishga qaytarish qo‘llanilmaydi, biroq texnik va hamkor aybi hollari bundan mustasno.",
    items: [
      "Qaytarilmaydigan tarifda cutoff muddatidan keyin yoki mijoz tashabbusi bilan bekor qilinganda to‘lov qaytarilmaydi.",
      "Ikki marta mablag‘ yechilishi (PAYMENT_EXCEPTION), to‘lov tizimi xatosi yoki sanatoriya aybi bilan xizmat ko‘rsatilmagan holatlarda mablag‘ 100% qaytariladi.",
    ],
  },
  {
    id: "refund-timeline",
    number: "5",
    title: "Qaytarish muddati va bajarish mexanizmi",
    summary:
      "Tasdiqlangan qaytarish bank va to‘lov provayderi reglamentiga ko‘ra amalga oshiriladi.",
    items: [
      "Qaytarish so‘rovi tasdiqlangach, mablag‘ to‘lov tizimi va bank orqali odatda 1–5 ish kuni ichida foydalanuvchi kartasiga tushiriladi.",
      "Avtomatik qaytarish mavjud bo‘lmagan provayderlarda (masalan, TezCheck v1) qaytarish hamkor merchant kabineti/bank o‘tkazmasi orqali bajarilib dalili tizimga biriktiriladi.",
    ],
  },
  {
    id: "refund-early-leave",
    number: "6",
    title: "Sanatoriyaga kirgandan keyingi o‘zgarish va nizolar",
    summary:
      "Check-in dan keyingi muddatidan oldin ketish sanatoriya tartibi asosida ko‘rib chiqiladi.",
    items: [
      "Mehmon joylashtirilgandan (CHECKED_IN) keyin muddatidan oldin ketmoqchi bo‘lsa, qayta hisob-kitob sanatoriyaning ichki tartibi va foydalanilgan kunlar asosida amalga oshiriladi.",
      "Qaytarish bo‘yicha kelishmovchilik yuzaga kelsa, bron raqami va to‘lov cheki bilan Yordam xizmatiga murojaat qilish lozim.",
    ],
  },
];

export const USER_AI_SUPPORT_SECTIONS: UserTermRule[] = [
  {
    id: "ai-consent",
    number: "1",
    title: "AI yordamchi maqomi va rozilik",
    summary:
      "Sihhat.uz AI maslahatchisi sanatoriya tanlash va yo‘nalishlar bo‘yicha tezkor ma’lumot berishga mo‘ljallangan.",
    items: [
      "Mobil ilovada AI chatini ishlatishdan oldin foydalanuvchi ogohlantirish bilan tanishib, rozilik beradi.",
      "AI javoblari katalog ma’lumotlari va umumiy axborotga tayangan tavsiyaviy xarakterga ega.",
    ],
  },
  {
    id: "ai-no-medical",
    number: "2",
    title: "Tibbiy tashxis va davolashni almashtirmaslik",
    summary:
      "AI yordamchi shifokor emas hamda tibbiy xulosa bermaydi.",
    items: [
      "AI kasallikka tashxis qo‘ymaydi, dori-darmon yoki muolaja dozasini belgilamaydi va shoshilinch tibbiy yordam o‘rnini bosmaydi.",
      "Surunkali kasallik, homiladorlik, allergiya yoki keskin holatlarda sanatoriyaga borishdan oldin shifokor ko‘rigidan o‘tish majburiydir.",
    ],
  },
  {
    id: "ai-limits",
    number: "3",
    title: "Moliyaviy cheklov, limitlar va ma’lumotni niqoblash",
    summary:
      "AI yordamchi foydalanuvchi nomidan hech qanday pul yoki bron operatsiyasini bajarmaydi.",
    items: [
      "AI mustaqil ravishda bron yaratmaydi, to‘lov yechmaydi va pul qaytarmaydi.",
      "Barqaror ishlash uchun bir foydalanuvchiga soatiga 30 tagacha so‘rov limiti va umumiy kunlik AI provayder kvotasi amal qiladi; mobil ilovada suhbat kontekstida oxirgi 12 ta xabar ishlatiladi.",
      "Xabarlardagi telefon raqamlari, elektron pochta va texnik kalitlar tashqi AI xizmatiga yuborishdan avval avtomatik niqoblanadi; chatga pasport yoki karta ma’lumotlarini yozmaslik tavsiya etiladi.",
    ],
  },
  {
    id: "reviews-verified",
    number: "4",
    title: "Tekshirilgan tashrif sharhlari (Verified Reviews)",
    summary:
      "Platformada faqat haqiqiy borib kelgan mehmonlarning baholari qabul qilinadi.",
    items: [
      "Sharh va 1–5 yulduzli baho faqat yakunlangan bron (CHECKED_OUT) dan keyin, 3 tadan 3000 tagacha belgi hajmida qoldiriladi.",
      "Haqorat, reklama spami, shaxsiy ma’lumotlarni oshkor qilish yoki soxta baholar moderatsiya tomonidan o‘chiriladi.",
    ],
  },
  {
    id: "support-chat-rules",
    number: "5",
    title: "Yordam xizmati chati va aloqa odobi",
    summary:
      "Muammoli holatlarni tezkor hal qilish uchun rasmiy chat kanali faoliyat yuritadi.",
    items: [
      "Foydalanuvchi Yordam xizmati orqali platforma ma’muriyati yoki sanatoriya bilan yozishishi, rasm/hujjat biriktirishi hamda o‘z xabarini tahrirlashi yoki o‘chirishi mumkin.",
      "Murojaatlarda hurmat va odob me’yorlariga rioya qilinadi; nizoli holatlarni tekshirish uchun chatdagi xabarlar audit tarixi Superadmin tomonidan himoyalangan tarzda saqlanadi.",
    ],
  },
];

export const USER_TERMS_DOCS: UserPolicyDoc[] = [
  {
    id: "oferta",
    title: "Ommaviy oferta (Foydalanuvchi shartnomasi)",
    shortLabel: "Ommaviy oferta",
    subtitle:
      "Ro‘yxatdan o‘tish, bron, 5 daqiqalik HOLD, TezCheck to‘lovi, QR-vaucher va check-in tartibi.",
    sections: USER_OFERTA_SECTIONS,
  },
  {
    id: "maxfiylik",
    title: "Maxfiylik siyosati",
    shortLabel: "Maxfiylik siyosati",
    subtitle:
      "Shaxsga doir ma’lumotlarni yig‘ish, shifrlash, uchinchi shaxslarga berish va o‘chirish huquqlari.",
    sections: USER_PRIVACY_SECTIONS,
  },
  {
    id: "qaytarish",
    title: "Bekor qilish va pulni qaytarish shartlari",
    shortLabel: "Qaytarish shartlari",
    subtitle:
      "FULL_BEFORE_CUTOFF, NON_REFUNDABLE, 14:00 UTC+5 cutoff hisobi va 1–5 ish kunida refund tartibi.",
    sections: USER_REFUND_SECTIONS,
  },
  {
    id: "ai",
    title: "AI yordamchi, sharhlar va Yordam xizmati nizomi",
    shortLabel: "AI va Chat nizomi",
    subtitle:
      "AI cheklovlari, so‘rov limitlari, haqiqiy tashrif sharhlari va Yordam chati auditi.",
    sections: USER_AI_SUPPORT_SECTIONS,
  },
];

export function getUserPolicyDoc(key: UserPolicyKey): UserPolicyDoc {
  return (
    USER_TERMS_DOCS.find((doc) => doc.id === key) ?? USER_TERMS_DOCS[0]!
  );
}
