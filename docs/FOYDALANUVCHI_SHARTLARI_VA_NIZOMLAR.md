# Sihhat.uz — Foydalanuvchi shartlari (Ommaviy oferta) va asosiy nizomlar

- **Amaldagi tahrir sanasi:** `2026-11-15`
- **Qo‘llanilish sohasi:** `Sihhat.uz` veb-sayti (`https://sihhat.uz`) va Android mobil ilovasi (`sihhat_mobile`) orqali ro‘yxatdan o‘tgan hamda foydalanadigan barcha jismoniy shaxslar (foydalanuvchilar / mehmonlar) uchun majburiy hujjat.
- **Sinxron ilova va veb-manbalar:**
  - Veb-sayt: [`packages/ui/src/user-terms.tsx`](../packages/ui/src/user-terms.tsx) va [`packages/ui/src/landing.tsx`](../packages/ui/src/landing.tsx)
  - Mobil ilova: [`apps/mobile/lib/screens/legal.dart`](../apps/mobile/lib/screens/legal.dart) (`Shartlar va nizomlar` ekrani)

---

## Mundarija

1. [1-bob. Umumiy qoidalar, atamalar va huquqiy maqom](#1-bob-umumiy-qoidalar-atamalar-va-huquqiy-maqom)
2. [2-bob. Ro‘yxatdan o‘tish, Email OTP va hisob xavfsizligi](#2-bob-royxatdan-otish-email-otp-va-hisob-xavfsizligi)
3. [3-bob. Katalog, qidiruv, offline kesh va jonli narx ustuvorligi](#3-bob-katalog-qidiruv-offline-kesh-va-jonli-narx-ustuvorligi)
4. [4-bob. Bron qilish tartibi va 5 daqiqalik HOLD qoidasi](#4-bob-bron-qilish-tartibi-va-5-daqiqalik-hold-qoidasi)
5. [5-bob. Onlayn to‘lovlar va TezCheck hisob-kitob tartibi](#5-bob-onlayn-tolovlar-va-tezcheck-hisob-kitob-tartibi)
6. [6-bob. QR-vaucher, Check-in, Check-out, hujjatlar va No-show](#6-bob-qr-vaucher-check-in-check-out-hujjatlar-va-no-show)
7. [7-bob. Bekor qilish va pulni qaytarish (Refund) nizomi](#7-bob-bekor-qilish-va-pulni-qaytarish-refund-nizomi)
8. [8-bob. Maxfiylik va shaxsga doir ma’lumotlarni himoyalash siyosati](#8-bob-maxfiylik-va-shaxsga-doir-malumotlarni-himoyalash-siyosati)
9. [9-bob. AI yordamchi nizomi va xavfsizlik cheklovlari](#9-bob-ai-yordamchi-nizomi-va-xavfsizlik-cheklovlari)
10. [10-bob. Tekshirilgan sharhlar (Verified Reviews) nizomi](#10-bob-tekshirilgan-sharhlar-verified-reviews-nizomi)
11. [11-bob. Yordam xizmati chati, bildirishnomalar va audit saqlanishi](#11-bob-yordam-xizmati-chati-bildirishnomalar-va-audit-saqlanishi)
12. [12-bob. Taqiqlangan harakatlar, fors-major va nizolarni hal qilish](#12-bob-taqiqlangan-harakatlar-fors-major-va-nizolarni-hal-qilish)

---

## 1-bob. Umumiy qoidalar, atamalar va huquqiy maqom

1. **Huquqiy asos:** Ushbu hujjat O‘zbekiston Respublikasining «Elektron tijorat to‘g‘risida»gi, «Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi hamda «Shaxsga doir ma’lumotlar to‘g‘risida»gi qonunlariga muvofiq rasmiy ommaviy oferta hisoblanadi.
2. **Asosiy atamalar:**
   - **Platforma (`Sihhat.uz`)** — O‘zbekiston Respublikasi hududidagi sanatoriya, profilaktoriya va sog‘lomlashtirish maskanlarini izlash, taqqoslash, bron qilish, onlayn to‘lovni tashkil etish hamda qo‘llab-quvvatlash aloqasini ta’minlovchi raqamli tizim.
   - **Foydalanuvchi (Mehmon)** — veb-sayt yoki mobil ilova orqali ma’lumot izlayotgan yoxud o‘zi va oila a’zolari uchun sanatoriya o‘rnini bron qilayotgan jismoniy shaxs.
   - **Hamkor (Sanatoriya)** — belgilangan litsenziya va yuridik hujjatlar asosida platformada tasdiqlangan (`APPROVED`) hamda bevosita yashash, ovqatlanish va tibbiy-sog‘lomlashtirish xizmatini ko‘rsatuvchi muassasa.
   - **Narx taklifi (`Quote`)** — tanlangan sanalar, xona toifasi, tarif rejasi va mehmonlar tarkibi asosida server tomonidan hisoblangan cheklangan muddatli narx va qaytarish shartlari to‘plami.
   - **Vaqtinchalik band (`HOLD`)** — to‘lovni yakunlash uchun foydalanuvchiga ajratiladigan 5 daqiqalik kafolatli o‘rin bandligi.
3. **Platforma roli va narx shaffofligi:**
   - Sihhat.uz foydalanuvchilardan bron uchun yashirin ustama komissiya olmaydi; katalogdagi tariflar hamkor sanatoriya kiritgan rasmiy tariflarga asoslanadi.
   - Bevosita joylashtirish, ovqatlanish va davolash-sog‘lomlashtirish xizmatlarining sifati hamda tibbiy xavfsizligi uchun bevosita xizmat ko‘rsatuvchi Hamkor sanatoriya mas’uldir.
4. **Ofertani qabul qilish:** Foydalanuvchi ilova yoki saytga kirishi, Email OTP orqali avtorizatsiyadan o‘tishi, AI yordamchidan foydalanishi yoki bron rasmiylashtirish chog‘ida «Shartlarni o‘qidim va qabul qilaman» belgisini tasdiqlashi bilan ushbu hujjat shartlarini to‘liq qabul qilgan hisoblanadi.

---

## 2-bob. Ro‘yxatdan o‘tish, Email OTP va hisob xavfsizligi

1. **Kirish usuli (Email OTP):**
   - Mijoz mobil ilova va foydalanuvchi kabinetiga elektron pochtaga yuboriladigan **6 xonali bir martalik tasdiqlash kodi (Email OTP)** orqali kiradi.
   - Kod kelishi pochta serveri yuklanishiga qarab 1–2 daqiqa olishi mumkin; foydalanuvchi spam/chiqindi jildini ham tekshirishi va kerak bo‘lsa timer tugagach qayta kod so‘rashi mumkin.
   - Sinov (demo) muhitida faqat ruxsat etilgan sinov testlari uchun namoyish etiladigan demo kod haqiqiy ishlab chiqarish hisoblari uchun qo‘llanilmaydi.
2. **Bron aloqa telefoni (`+998`) va profil ma’lumotlari:**
   - Hisob ichida foydalanuvchi o‘z **ism-familiyasi**, **`+998` formatdagi telefon raqami** va ixtiyoriy **profil surati (avatar)**ni saqlaydi.
   - Profil surati (avatar) hajmi **15 MB** dan oshmasligi va amaldagi tasvir formatida bo‘lishi talab etiladi.
   - Telefon raqamini o‘zgartirish xavfsizlik nuqtai nazaridan **eski va yangi telefon raqamiga yuboriladigan alohida OTP tasdiqlash** (ikkala raqam tasdig‘i) orqali bajariladi.
3. **Sessiya va hisob xavfsizligi:**
   - Mobil ilovada kirish tokenlari qurilmaning himoyalangan xotirasida (`flutter_secure_storage`) saqlanadi; kirish va yangilash tokenlari cheklangan muddat bilan himoyalanadi.
   - Bir martalik kodlar va hisobga kirish sessiyasi shaxsiy hisoblanadi — ularni begona shaxslarga bermaslik lozim.
   - Shubhali kirish yoki begona qurilma gumoni tug‘ilganda foydalanuvchi darhol profildan «Hisobdan chiqish»ni bosishi va Yordam xizmatiga xabar berishi shart.
   - Brute-force va spamdan himoya qilish maqsadida kirish/OTP so‘rovlariga tezlik cheklovi (`RateLimit`) qo‘llaniladi; me’yordan ortiq urinishlar vaqtincha bloklanadi (`429 RATE_LIMITED`).

---

## 3-bob. Katalog, qidiruv, offline kesh va jonli narx ustuvorligi

1. **Katalogdagi obyektlar tarkibi:** Har bir sanatoriyaning ommaviy sahifasida tasdiqlangan nomi, hududi, manzili/xarita havolasi, tavsifi, yo‘nalish ko‘rsatmasi, haqiqiy suratlari (4–30 ta), tibbiy/xizmat turlari, qulayliklari, xona toifalari hamda tarif rejalari (shu jumladan bolalar yosh siyosati va qaytarish shartlari) ko‘rsatiladi.
2. **Offline kesh va ma’lumot dolzarbligi:**
   - Mobil ilova internet aloqasi bo‘lmagan paytda ham foydalanuvchi ilgari yuklangan sanatoriyalar katalogi va o‘zining tasdiqlangan bron/QR-vaucherlarini ko‘ra olishi uchun ma’lumotlarni lokal keshda saqlaydi.
   - **Jonli narx va kvota ustuvorligi:** Offline keshdagi narx yoki bo‘sh o‘rinlar faqat ma’lumot olish uchun xizmat qiladi. Bron yaratish paytida serverdagi real vaqtdagi bo‘sh o‘rinlar (`availableRooms`) va joriy narx versiyasi (`pricingVersion`) tekshiriladi; keshdagi narx o‘zgargan bo‘lsa tizim yangi narx taklifi (`Quote`) olishni so‘raydi (`PRICE_CHANGED`).
3. **Sanatoriya vaqtincha yashirilgan holatlar:**
   - Agar biror sanatoriya profili hujjat yangilanishi, moderatsiya yoki abonent muddati tugashi (`SUSPENDED`) sababli vaqtincha katalogdan yashirilgan bo‘lsa, yangi onlayn bronlar to‘xtatiladi.
   - Biroq bungacha to‘lab tasdiqlangan bronlar bo‘yicha mehmonni qabul qilish yoki kelishuv asosida mablag‘ni qaytarish kafolati saqlanadi.

---

## 4-bob. Bron qilish tartibi va 5 daqiqalik HOLD qoidasi

1. **Bronni rasmiylashtirish bosqichlari:**
   - Foydalanuvchi kirish va chiqish sanalarini, xonalar sonini, kattalar va bolalar sonini hamda **bolalar yoshini** aniq kiritadi.
   - Serverdan joriy narx taklifi (`Quote`) olinadi; taklif amal qilish muddati va `pricingVersion` qayd etiladi.
   - Foydalanuvchi haqiqiy **mehmon F.I.Sh.** (2–120 belgi) va **`+998XXXXXXXXX` telefon raqami**ni kiritadi.
   - Foydalanuvchi tarifga biriktirilgan «Bekor qilish va pulni qaytarish shartlari» bilan tanishib, barcha siyosat versiyalarini qabul qiladi (`accepted_policy_versions`).
2. **5 daqiqalik HOLD mexanizmi:**
   - Bron yaratilishi bilan (`HOLD`) tanlangan xona foydalanuvchi uchun ko‘pi bilan **5 daqiqaga** band qilinadi.
   - Agar bir foydalanuvchi to‘lovni yakunlamasdan shu hisobdan yangi bron (`HOLD`) yaratsa, uning avvalgi to‘lanmagan `HOLD` yoki `PAYMENT_PENDING` bronlari avtomatik bekor qilinib (`CANCELLED`), oldingi xona kvotasi zudlik bilan bo‘shatiladi.
   - 5 daqiqa ichida onlayn to‘lov amalga oshirilmasa, hold muddati tugab bron avtomatik yopiladi (`EXPIRED`) va xona boshqa mijozlar uchun qayta ochiladi.
3. **Mijoz bronlar ro‘yxati tartibi:**
   - To‘lanmagan va muddati 5 daqiqadan oshib ketgan yoki to‘lanmay bekor bo‘lgan bronlar foydalanuvchi ro‘yxatidan avtomatik yashiriladi (shunday bo‘lsa-da, moliyaviy/texnik audit tarixi hamda amalga oshgan to‘lovlar tarixi saqlanadi).
   - Muvaffaqiyatli to‘langan (`CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`) yoki qaytarilgan (`REFUNDED`) bronlar foydalanuvchi kabinetida doimiy saqlanadi.

---

## 5-bob. Onlayn to‘lovlar va TezCheck hisob-kitob tartibi

1. **Valyuta va to‘lov vositalari:**
   - Barcha onlayn to‘lovlar O‘zbekiston Respublikasi milliy valyutasi — **so‘mda (UZS)** rasmiylashtiriladi.
   - To‘lovlar **TezCheck** to‘lov havolasi (`tezcheck.uz/pay/...`) orqali **Click, Payme, Uzcard va Humo** tizimlarida amalga oshiriladi.
2. **Karta xavfsizligi:**
   - Foydalanuvchining bank kartasi raqami, amal qilish muddati, CVV va bir martalik SMS kodlari Sihhat.uz ilovasi yoki backend bazasida saqlanmaydi; to‘lov rasmiy himoyalangan to‘lov shlyuzida bajariladi.
3. **To‘g‘ridan-to‘g‘ri merchant ulanishi (`BOOKING_SETTLEMENT_MODE=direct`):**
   - To‘g‘ridan-to‘g‘ri hisob-kitob rejimida sanatoriyaning tasdiqlangan bank rekvizitlari va faol merchant ulanishi to‘liq tayyor bo‘lmaguncha onlayn to‘lov tugmasi himoya maqsadida yopiq turadi (`MERCHANT_NOT_READY`).
4. **To‘lovni tasdiqlash va kechikish / ikki marta yechish (`PAYMENT_EXCEPTION`):**
   - Onlayn to‘lov tasdiqlangach (`SUCCEEDED`), bron avtomatik `CONFIRMED` holatiga o‘tadi va elektron vaucher faollashadi.
   - Agar bank/provayderdan javob kechiksa, fon tekshiruvi (polling: kutilayotgan to‘lovlarda har 1 daqiqa) holatni aniqlashtiradi.
   - Agar hold muddati tugaganidan keyin yoki bir bron uchun ikki marta mablag‘ yechilgan bo‘lsa, tizim buni **`PAYMENT_EXCEPTION`** (to‘lov istisnosi) deb belgilaydi — bunday mablag‘ foydalanuvchidan o‘zlashtirilmaydi va qaytarish tartibiga o‘tkaziladi.

---

## 6-bob. QR-vaucher, Check-in, Check-out, hujjatlar va No-show

1. **Elektron QR-vaucher:**
   - To‘langan har bir bron uchun noyob 5 xonali bron kodi (`BR-12345` formatda) va **QR-kodli elektron vaucher** beriladi.
   - Vaucher mobil ilovada internet bo‘lmaganda ham (offline kesh orqali) ko‘rsatilishi mumkin.
2. **Kirish va chiqish vaqtlari hamda majburiy hujjatlar:**
   - Standart sanatoriya kirish vaqti sifatida kirish kunining mahalliy soat **14:00 (Asia/Tashkent, UTC+5)** mo‘ljal qilib olinadi (har bir sanatoriyaning profilida aniq kirish/chiqish soatlari ham ko‘rsatiladi).
   - Sanatoriyaga kelishda mehmon quyidagi hujjatlarni taqdim etishi shart:
     - shaxsini tasdiqlovchi hujjat (**pasport** yoki **ID-karta**);
     - bolalar bilan kelganda — bolalarning **tug‘ilganlik haqidagi guvohnomasi**;
     - sanatoriya profili va amaldagi tartibda talab qilingan **tibbiy ma’lumotnoma / sanatoriya-kurort kartasi** (agar tegishli muolajalar uchun zarur bo‘lsa).
3. **Joylashish (`CHECKED_IN`), xona ko‘chirish va ketish (`CHECKED_OUT`):**
   - Resepsion vaucherni tasdiqlab mehmonni joylashtirganda bron `CHECKED_IN` maqomiga o‘tadi.
   - Texnik yoki xizmat zaruriyati bilan xonani shu toifadagi boshqa tayyor xonaga ko‘chirish mehmon bilan kelishilgan holda va sababi tizimda qayd etilib bajariladi.
   - Davolanish/dam olish muddati yakunlanganda `CHECKED_OUT` belgilanadi va mijoz uchun sanatoriyaga sharh qoldirish imkoniyati ochiladi.
4. **Kelmaslik (`NO_SHOW`) va muddatidan oldin ketish:**
   - Agar mehmon belgilangan kirish kunida ogohlantirmasdan kelmasa va cutoff muddati o‘tgan bo‘lsa, sanatoriya sababini majburiy ko‘rsatib `NO_SHOW` holatini rasmiylashtiradi; mablag‘ masalasi bron paytida tanlangan tarif shartiga ko‘ra hal etiladi.
   - Sanatoriyaga kirib bo‘lgandan keyin muddatidan oldin ketish holatida foydalanilgan kunlar va haqiqiy xarajatlar sanatoriyaning ichki tartib-qoidalariga asosan hisob-kitob qilinadi.

---

## 7-bob. Bekor qilish va pulni qaytarish (Refund) nizomi

1. **Tarif siyosati turlari:**
   - **`FULL_BEFORE_CUTOFF` (Cutoff muddatigacha to‘liq qaytarish):** Kirish kunining **14:00 (UTC+5)** soatidan tarifda ko‘rsatilgan `cutoff_hours` (masalan, 24, 48 yoki 72 soat) oldin bekor qilish so‘rovi berilsa, to‘langan mablag‘ 100% qaytarishga yaroqli bo‘ladi.
   - **`NON_REFUNDABLE` (Qaytarilmaydigan tarif):** Mijoz tashabbusi bilan oddiy bekor qilinganda to‘lov qaytarilmaydi (`POLICY_DENIED`).
2. **Qaytarish qoidasi bo‘yicha 5 asosiy holat:**
   - **Holat A — To‘lanmagan hold bron:** 5 daqiqalik muddatda to‘lov qilinmasa hold avtomatik bekor bo‘ladi yoki foydalanuvchi to‘lov yakunlanishidan avval brondan voz kechadi (`cancelUnpaid`) — karta hisobidan pul yechilmaydi.
   - **Holat B — Cutoff muddati ichida bekor qilish:** `FULL_BEFORE_CUTOFF` tarifida foydalanuvchi «Bronlar» bo‘limi yoki Yordam xizmati orqali sabab ko‘rsatib refund so‘rovi yuboradi (`refundRequest`). Cutoff o‘tmagan bo‘lsa so‘rov tasdiqlanadi.
   - **Holat C — Cutoff o‘tgandan keyin yoki `NON_REFUNDABLE` tarif:** Standart foydalanuvchi so‘rovi tizim qoidasi bilan cheklanadi (`POLICY_DENIED`). Biroq favqulodda hujjatli sabablar yoki hamkor bilan o‘zaro kelishuv mavjud bo‘lsa, masala Yordam xizmati orqali platforma administratori ko‘rib chiqishiga (`force`) taqdim etilishi mumkin.
   - **Holat D — Texnik xato, ikki marta yechish (`PAYMENT_EXCEPTION`) yoki sanatoriya aybi:** Sanatoriya tasdiqlangan o‘rinni taqdim eta olmasa, profilida jiddiy nomuvofiqlik bo‘lsa yoxud to‘lov ikki marta yechilgan bo‘lsa, tarif turidan qat’i nazar mablag‘ **100% qaytariladi**.
   - **Holat E — `PAYOUT_RESERVED` holati:** Agar sanatoriya uchun o‘tkazma (payout) jarayoni boshlanib qolgan bo‘lsa, qaytarish platforma administratsiyasi tomonidan avval o‘tkazma rezervini hal qilish yo‘li bilan ta’minlanadi.
3. **Qaytarish muddati va bajarish mexanizmi:**
   - Qaytarish so‘rovi ma’qullangach (`APPROVED`), to‘lov provayderi (TezCheck / merchant kabineti) va bank orqali odatda **1–5 ish kuni** ichida mijoz kartasiga qaytariladi (yakuniy kirim muddati mijoz bankining ichki reglamentiga bog‘liq bo‘lishi mumkin).
   - Avtomatik qaytarish qo‘llab-quvvatlanmagan hollarda (masalan, TezCheck v1 rejimida) qaytarish tasdiqlangan merchant kabineti yoki bank orqali amalga oshirilib, provayder/bank tasdig‘i tizimga biriktiriladi.

---

## 8-bob. Maxfiylik va shaxsga doir ma’lumotlarni himoyalash siyosati

1. **Huquqiy asos:** O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuni talablari asosida barcha shaxsiy ma’lumotlar HTTPS/TLS shifrlash kanallari orqali uzatiladi va ruxsatsiz kirishdan himoyalanadi.
2. **Yig‘iladigan ma’lumotlar toifalari:**
   - **Hisob ma’lumotlari:** elektron pochta manzili (Email OTP kirish), ism-familiya, `+998` telefon raqami, avatar surati (15 MB gacha).
   - **Bron va tashrif ma’lumotlari:** sanatoriya, kirish/chiqish sanalari, mehmon F.I.Sh., telefon raqami, kattalar/bolalar soni va yoshi, to‘lov/vaucher identifikatorlari.
   - **Aloqa va xavfsizlik:** Yordam chatidagi xabarlar hamda ilova fayllari (surat/PDF), sharhlar, bildirishnomalar, brauzer/qurilma sessiya yorlig‘i, IP va kirish xavfsizligi jurnallari, onlayn faollik belgisi.
3. **Nega ma’lumotlar qayta ishlanadi va kimlarga ochiladi:**
   - Bron rasmiylashtirilmaguncha foydalanuvchi va sanatoriya o‘rtasidagi bevosita ichki kontaktlar yopiq saqlanadi; bron yaratilgach mehmonni joylashtirish uchun zarur ism, `+998` telefon va sana tafsilotlari tegishli Hamkor sanatoriyaga uzatiladi.
   - Onlayn to‘lov uchun faqat hisob-faktura identifikatori va summa TezCheck shlyuziga yuboriladi; karta rekvizitlari Sihhat.uz da saqlanmaydi.
   - AI yordamchidan foydalanilganda matndagi telefon raqamlari, elektron pochta va texnik kalitlar tashqi AI provayderiga uzatishdan avval avtomatik niqoblanadi (`redactMessage`).
   - Shaxsiy ma’lumotlar reklama brokerlariga yoki begona uchinchi shaxslarga sotilmaydi.
4. **Saqlash muddati va lokal xotira:**
   - Mobil ilova tokenlarni `flutter_secure_storage` da, mavzu (kun/tun), AI rozilik belgisini (`ai_consent`) va oxirgi offline vaucher/katalog keshini qurilmaning lokal xotirasida saqlaydi.
   - Moliyaviy, to‘lov va buxgalteriya hujjatlari qonunchilikda belgilangan saqlash muddati davomida arxivlanadi.
5. **Foydalanuvchi huquqlari:**
   - Profil sozlamalaridan ism-familiya, avatar va telefon raqamini yangilash;
   - AI maslahatchi roziligini rad etish;
   - Shaxsiy ma’lumotlarni o‘chirish yoki hisobni yopish yuzasidan Yordam xizmatiga yoxud `+998 88 295 20 28` raqamiga murojaat qilish (yakunlanmagan faol bron yoki ochiq moliyaviy nizo mavjud bo‘lsa, hisob-kitob yakunlangach bajariladi).

---

## 9-bob. AI yordamchi nizomi va xavfsizlik cheklovlari

1. **Rozilik (`ai_consent`):** Mobil ilovada AI maslahatchi chatini ochishdan oldin foydalanuvchi ogohlantirish matni bilan tanishib, ongli rozilik beradi; roziliksiz xabarlar tashqi AI provayderiga yuborilmaydi.
2. **Tibbiy cheklov (Shifokor emas):**
   - Sihhat.uz AI yordamchisi tibbiy ma’lumot beruvchi shifokor emas.
   - AI tashxis qo‘ymaydi, dori vositalari yoki muolaja dozasini tavsiya etmaydi va shoshilinch tibbiy yordam o‘rnini bosmaydi.
   - Surunkali kasallik, allergiya, homiladorlik yoki o‘tkir og‘riq holatlarida sanatoriyaga borishdan avval mutaxassis shifokor bilan maslahatlashish shart.
3. **Moliyaviy va bron operatsiyalarini bajarmaslik:**
   - AI tizimi foydalanuvchi nomidan bron yaratmaydi, to‘lov yechmaydi, bekor qilmaydi va pul qaytarmaydi (`can_execute_financial_actions: false`).
4. **Texnik limitlar va PII niqoblash:**
   - Bitta xabar uzunligi ko‘pi bilan **1000 belgi**, suhbat konteksti mobil/API da oxirgi **12 ta xabar** bilan cheklanadi.
   - Barqaror xizmat uchun bir foydalanuvchiga **soatiga 30 tagacha so‘rov limiti** va tizim darajasidagi kunlik AI provayder kvotasi amal qiladi; kunlik kvota tugaganda tizim katalog qidiruviga yo‘naltiradi.
   - Suhbat matnidagi telefon raqamlari, email va maxfiy kalitlar provayderga uzatishdan oldin avtomatik niqoblanadi (`redactMessage`), biroq foydalanuvchining o‘zi ham AI chatiga pasport seriyasi, JSHSHIR yoki karta raqamlarini yozmasligi talab etiladi.

---

## 10-bob. Tekshirilgan sharhlar (Verified Reviews) nizomi

1. **Faqat haqiqiy tashrifdan keyin:** Soxta reytinglarni oldini olish maqsadida sharh qoldirish huquqi faqat `CHECKED_OUT` maqomiga o‘tgan haqiqiy bronga ega foydalanuvchilargagina beriladi.
2. **Shakl va hajm talablari:** Sharh 1 dan 5 gacha yulduzli baho va **3 tadan 3000 tagacha belgi**li izohdan iborat bo‘ladi.
3. **Taqiqlangan kontent:** Haqoratli, kamsituvchi, tuhmat mazmunidagi, reklama spami, telefon/karta/shaxsiy ma’lumotlarni oshkor qiluvchi yoki haqiqiy xizmatga aloqasi bo‘lmagan sharhlar moderatsiya tomonidan o‘chiriladi.

---

## 11-bob. Yordam xizmati chati, bildirishnomalar va audit saqlanishi

1. **Murojaat yuborish:** Foydalanuvchi mobil ilovadagi «Yordam xizmati» orqali Sihhat.uz ma’muriyati bilan to‘g‘ridan-to‘g‘ri muloqot qilishi, surat va hujjatlar ilova qilishi mumkin.
2. **Xabarni tahrirlash, o‘chirish va Superadmin auditi:**
   - Foydalanuvchi suhbat ichida o‘z xabarini tahrirlashi yoki o‘chirishi mumkin.
   - **Muhim ogohlantirish:** Foydalanuvchi xabarni o‘chirganida u suhbat oynasidan hamda hamkor ko‘rinishidan yashiriladi, biroq moliyaviy nizolar, xavfsizlik hodisalari va shikoyatlarni xolis tekshirish uchun platformaning **Superadmin audit tarixida** (`deletedForUser`) saqlanib qoladi.
3. **Qo‘shimcha aloqa:** Bildirishnomalar bo‘limidan bron holatlari kuzatiladi; shuningdek `@sihhat_support_bot` Telegram yordam kanali ishlaydi.

---

## 12-bob. Taqiqlangan harakatlar, fors-major va nizolarni hal qilish

1. **Taqiqlangan harakatlar:**
   - Xona kvotasini sun’iy band qilish maqsadida ketma-ket soxta HOLD bronlar yaratish;
   - Tizimga avtomatlashtirilgan skript/bot hujumlari uyushtirish yoki katalog ma’lumotlarini ruxsatsiz yig‘ish (scraping);
   - Boshqa shaxsning elektron pochtasi, telefoni yoki hujjatlaridan ruxsatsiz foydalanish;
   - QR-vaucherni uchinchi shaxslarga tijorat maqsadida qayta sotish.
   - Bunday hollarda platforma hisobni cheklash yoki bloklash huquqiga ega.
2. **Fors-major:** Tabiiy ofatlar, favqulodda holat, davlat organlari cheklovlari, banklararo to‘lov tizimlari, uyali aloqa yoki elektr tarmoqlaridagi keng ko‘lamli uzilishlar oqibatidagi kechikishlar uchun tomonlar qonunchilik doirasida javobgarlikdan ozod etiladi va vaziyat barqarorlashgach bronni ko‘chirish yoki qaytarish bo‘yicha kelishadi.
3. **Rasmiy aloqa rekvizitlari va nizolarni hal etish:**
   - **Aloqa telefoni:** `+998 88 295 20 28`
   - **Telegram qo‘llab-quvvatlash boti:** `@sihhat_support_bot`
   - **Manzil:** Toshkent shahri, Shayxontohur tumani, Navoiy ko‘chasi 11A
   - Barcha nizolar avvalo ilovadagi Yordam xizmati va platforma moderatsiyasi orqali muzokara yo‘li bilan ko‘rib chiqiladi; kelishuvga erishilmagan taqdirda nizo O‘zbekiston Respublikasi qonunchiligiga muvofiq sud tartibida hal qilinadi.
