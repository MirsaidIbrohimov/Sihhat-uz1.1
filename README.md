# Sihhat.uz

**O‘zbekiston sanatoriylarini onlayn tanlash, taqqoslash va rasmiy narxlarda bron qilish platformasi** — NestJS/PostgreSQL backend, `sihhat.uz` B2C portali, Superadmin boshqaruv paneli, Hamkorlar (Direktor / Resepsion / Hisobchi) CRM paneli, xodimlar Telegram boti hamda Flutter Android ilovasi (`v0.2.10+13`) + iOS PWA.

- **Kanonik repozitoriya:** [MirsaidIbrohimov/Sihhat-uz1.1](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1)
- **Oxirgi yangilanish:** **2026-11-28**
- **Asosiy manzillar:** [sihhat.uz](https://sihhat.uz) · [Superadmin](https://sihhat.uz/superadmin) · [Hamkorlar paneli](https://sihhat.uz/hamkorlar) · API: `https://sihhat.uz/api`
- **Git tartibi:** Barcha o‘zgarishlar lokal saqlanadi; GitHubga faqat foydalanuvchining aniq topshirig‘i bilan yuklanadi.

**Mundarija:**
[Eng so‘nggi yangilanishlar](#eng-songgi-yangilanishlar-2026-11-21--2026-11-28) ·
[Joriy holat](#joriy-holat) ·
[Dizayn galereyalari](#dizayn-galereyalari-va-prototiplar) ·
[Kod tuzilishi](#kod-tuzilishi) ·
[Android ilova va iOS PWA](#android-ilova-va-ios-pwa) ·
[Tashqi xizmatlar](#tashqi-integratsiyalar-va-maxfiylik) ·
[Kerakli dasturlar](#kerakli-dasturlar-va-kutubxonalar) ·
[Lokal ishga tushirish](#lokal-ishga-tushirish) ·
[Tekshirish](#tekshirish) ·
[Hujjatlar](#hujjatlar-va-asosiy-qarorlar)

---

## Eng so‘nggi yangilanishlar (2026-11-21 — 2026-11-28)

### 2026-11-28 — Sanatoriyani 2 usulda tasdiqlab o‘chirish, bronlardagi namunalarni tozalash va yuqori sozlamalar tugmasi
- **Sanatoriyani xavfsiz o‘chirish (`Sanatoriyalar` bo‘limi):** Superadmin panelidagi `Sanatoriyalar` ro‘yxati va profil ko‘rinishiga **«O‘chirish»** tugmasi hamda `DeleteSanatoriumModal` oynasi qo‘shildi (`POST /superadmin/sanatoriums/:id/delete-code`, `POST /superadmin/sanatoriums/:id/delete`, `DELETE /superadmin/sanatoriums/:id`). O‘chirish faqat Superadmin **joriy paroli** yoki **admin emailiga yuboriladigan 6 xonali tasdiqlash kodi** orqali bajariladi va barcha bog‘langan yozuvlar FK-xavfsiz tartibda tozalanib, `sanatorium.deleted` auditi muhrlanadi.
- **Bronlar bo‘limidagi namuna yozuvlarni olib tashlash (`packages/ui/src/operations.tsx`):** `Bronlar va Mijozlar CRM` ichidagi kutish ro‘yxati (`lead-sample-1`, `lead-sample-2`) va kasaba uyushmalari kvotasi (`corp-sample-1`) namuna qatorlari hamda brauzer `localStorage`dagi eski kesh qoldiqlari tozalandi.
- **Yuqori paneldagi Sozlamalar (`⚙️`) tugmasi (`packages/ui/src/portal.tsx`):** `/superadmin` va `/hamkorlar` yuqori panelidagi sozlamalar tugmasi bosilganda bevosita **«Mening hisobim»** (`account`) bo‘limiga o‘tadi.

### 2026-11-28 — Web panellar va `sihhat.uz` uchun yangi fotorealistik suratlar (defolt rasmlarni almashtirish)
Barcha web panellardagi eski vektor/takrorlanuvchi defolt rasmlar (`welcome-retreat.png` va takroriy `wellness-retreat.png`) 8 ta alohida optimallashtirilgan fotorealistik suratga almashtirildi (`assets/branding/web/`, `scripts/web-assets.mjs`):
- **`sihhat.uz` yo‘nalish kartochkalari (`packages/ui/src/landing.tsx`):** «Davolash maskanlari» (`category-davolash.jpg`), «Bolalar salomatligi» (`category-bolalar.jpg`), «Reabilitatsiya» (`category-reabilitatsiya.jpg`) va «Dam olish va wellness» (`category-wellness.jpg`) uchun 4 ta mustaqil surat, hero vitrina uchun `hero-retreat.jpg` hamda rasmsiz/xatoli kartalar uchun aqlli `sanatorium-default-cover.jpg` zaxira muqovasi.
- **`/superadmin` va `/hamkorlar` kirish hamda profil muqovalari (`portal.tsx`, `governance.tsx`, `portal-enhancements.css`):** Superadmin kirish sahifasi (`login-admin-retreat.jpg`), Hamkorlar kirish sahifasi (`login-partner-retreat.jpg`), sanatoriya profilining standart muqovasi (`sanatorium-default-cover.jpg`) hamda `.login-art-frame` to‘liq kenglikda to‘ldirish tuzatishi.
- **`npm run web:assets`:** ikkala web ilova (`apps/superadmin-web/public/branding`, `apps/partner-web/public/branding`) uchun barcha 8 ta suratni hamda eski nomli fallback fayllarning fotorealistik versiyalarini sinxronlaydi (mobil ilova assetlariga tegilmaydi).

### 2026-11-28 — Sayt, web panellar va mobil ilova tezligini oshirish hamda suratlar optimizatsiyasi
- **Suratlarni `sharp` orqali tezkor WebP/thumbnail (`?w=`) ko‘rinishida uzatish va kesh:** `GET /media/:id?w=640|1280` avtomatik WebP siqish (`@sihhat/api` production `dependencies` tarkibidagi `sharp`, `16 MB` RAM LRU + disk sidecar keshi, 1-so‘rovli SQL JOIN, `ETag` `304 Not Modified` va ommaviy thumbnail’lar uchun `immutable` `Cache-Control`), statik brend rasmlarni kichraytirish (`favicon.png`: `588 KB → 3.6 KB`, `sihhat-logo.png`: `588 KB → 26.5 KB`, muqova JPGlar: `90–150 KB`) hamda `CatalogService.publicRows()` parallel so‘rovlari.
- **`sihhat.uz`, `/superadmin` va `/hamkorlar` ichidagi qotishlarni bartaraf etish:** sun’iy `920 ms` splash kutishi olib tashlandi; bosh sahifa SSR/ISR (`revalidate: 30`) katalog preload va `DynamicPortal` kod ajratishga o‘tkazildi; har pikselda butun sahifani qayta chizgan `scrollProgress` state o‘rniga GPU `scaleX` ref + `requestAnimationFrame`, `useDeferredValue`, `loading="lazy" decoding="async"`, `content-visibility: auto` ulandi; og‘ir `filter: blur(84px)` va ko‘p qavatli `backdrop-filter` hamda `pointermove` tinglovchilari tozalandi.
- **Mobil ilovada ustuvor muqova yuklash (`apps/mobile`):** `CatalogCache` avval faqat kartochkalar muqovasini (`?w=640`) tezkor tortadi, `CatalogPhotos` sinxron xotira keshi va `gaplessPlayback` skrolldagi miltillashlarni yo‘qotadi.

### 2026-11-28 — Qisqa va takrorlanmas `BR-XXXXX` (5 xonali) bron ID tizimi hamda `BR-` tezkor qidiruvi
- **5 xonali tasodifiy va takrorlanmas `BR-XXXXX` bron raqamlari:** eski uzun `SH-...` kodlari o‘rniga barcha bronlar (`BookingService.allocate`, `TezcheckService.quickCheckout`, Next.js `quick-checkout`) kriptografik tasodifiy, ketma-ket bo‘lmagan 5 xonali `BR-12345` formatida yaratiladi. Har bir berilgan kod `BookingReference` jadvalida doimiy muhrlanadi — 1-bronda tushgan ID hech qachon qaytib takrorlanmaydi (`202611280001_booking_br_reference` migratsiyasi + `ensureBookingReferencesMigrated()`).
- **Web panellar va saytda oldindan `BR-` yozilgan qidiruv:** `/superadmin` va `/hamkorlar` yuqori panelida (`topbar-br-search`), `Ctrl + K` oynasida, `Bronlar`, `Bugungi ishlar`, `To‘lovlar` bo‘limlarida hamda `sihhat.uz` «Bronni tekshirish» oynasida `BR-` prefiksi oldindan tayyor yozilgan — foydalanuvchi uning yoniga faqat 5 xonali raqamni yozib bronni darhol topadi va ochadi (Telegram botda ham `BR-12345` yoki `12345` qabul qilinadi).

### 2026-11-27 — T6 (Tungi Aurora Multi-Color) dizayni va `sihhat.uz` yangi qulayliklari
Barcha web ilovalar — **`sihhat.uz`**, **`/superadmin`** va **`/hamkorlar`** — to‘liq **T6 (Tungi Aurora Multi-Color: Indigo + Sky + Mint)** rang tizimiga o‘tkazildi ([rang maketlari](UI/new%20web/tungi_ranglar/index.html)):
- **Eski zumrad-yashil ranglar butunlay olib tashlandi** (`styles.css`, `portal-enhancements.css`, `landing.css`, `landing.tsx`, `manifest.json` va panel TSX fayllari).
- **Standart tungi rejim (100% oq yuzalarsiz):** `#0a0f1f` Midnight Indigo fon, `#0e152a` yon menyu, `#141d38` shisha kartalar, `#1c284a` ichki bloklar, `#6366f1 → #0ea5e9` asosiy tugmalar, `#4f46e5 → #0284c7 → #059669` asosiy KPI kartasi, 5 rangli bar-chart va ko‘p rangli KPI sparkline grafiklari. Kunduzgi tugma bosilganda unga mos yorqin **Y6 Aurora** kunduzgi palitrasi (`#f6f8fc` / `#4f46e5`) ishlaydi.
- **`sihhat.uz` bosh sahifasidagi yangi qulayliklar (`packages/ui/src/landing.tsx`, `landing.css`):**
  1. **Sanatoriyalarni yonma-yon taqqoslash (3 tagacha):** har bir kartada taqqoslash (`⚖️`) tugmasi, pastki suzuvchi taqqoslash paneli va «Eng hamyonbop» / «Top reyting» belgilari bilan solishtirish jadvali.
  2. **Kunlik byudjet filtri, aqlli saralash va jonli hisoblagich:** `≤ 300 ming`, `300 – 600 ming`, `600 ming+`, narx/reyting/alifbo saralash va `Topildi: N ta` ko‘rsatkichi.
  3. **Jonli yo‘llanma narx kalkulyatori:** tafsilot va TezCheck oynalarida `3 / 7 / 10 / 12 / 14 kun` tezkor tugmalari, mehmon soni (`1–3`), avtomatik chiqish sanasi va jami summa hisob-kitobi (tanlangan parametrlar TezCheck oynasiga uzatiladi).
  4. **Yaqinda ko‘rilganlar va 1-klik havola ulashish:** oxirgi ko‘rilgan 4 ta sanatoriya qatori (`localStorage`) hamda `?sanatorium=<id>` deep-link ulashish + toast xabarnoma.
  5. **Tezkor qidiruv (`/` va `Ctrl+K`), 6 savolli FAQ akkordeon va yuqoriga qaytish (`↑`) tugmasi.**

### 2026-11-27 — Amallar tarixi, kirilgan qurilmalar ta’rifi va `#ID` tezkor profil qidiruvi
- **Yuqori tezkor qidiruvda (`Ctrl + K`) `#ID` orqali profil ochish:** `GET /auth/quick-lookup?q=#<ID>` endpointi va `QuickAccountProfileModal` orqali 6 xonali `#ID` yozilganda mos ilova mijozi (`CUSTOMER`) yoki hamkor xodimi (`STAFF`) profili hamda uning faol qurilmalari darhol ochiladi.
- **Kirilgan qurilmalar to‘liq ta’rifi (`request-meta.ts`, `auth-history.tsx`):** `describeDeviceMeta()` + `X-Device-Label` + `Sec-CH-UA*` orqali har bir sessiyada qurilma turi (`Kompyuter`/`Smartfon`/`Planshet`), OS, brauzer/ilova va IP manzili ko‘rsatiladi; eski sessiyalar `backfillAuthEventsFromSessions()` va `hydrateSessionMeta()` orqali avtomatik boyitiladi.
- **Kengaytirilgan Amallar tarixi (`/superadmin/audit`, `/partner/audit`):** sun’iy 11 amallik cheklov olib tashlandi; qidiruv (`q`), sanatoriya filtri, `actor_public_id` va to‘liq o‘zbekcha tafsilotlar qo‘shildi.

### 2026-11-23–24 — Hamkor mustaqil ro‘yxatdan o‘tishi, kirish/chiqish nazorati va markazlashtirilgan yordam
- **Hamkorlar uchun «Yangi hisob ochish» (`PartnerRegistration`):** `/hamkorlar` kirish sahifasida sanatoriya anketasi + majburiy `username` va `email` bandligini bazadan jonli tekshirish (`GET /auth/partner-register/availability`); Superadmin `/partner-registrations` bo‘limidan tasdiqlaganda `DIRECTOR` hisobi ochiladi, sanatoriya katalogga chiqadi va emailga xabarnoma ketadi.
- **Barcha hisoblar kirish/chiqish tarixi (`AuthEvent`):** `LOGIN`, `LOGOUT`, `SESSION_REVOKED`, `SESSION_EXPIRED` hodisalari qurilma va IP bilan saqlanadi (`/auth/login-history`, `/superadmin/auth-events`, `/partner/auth-events`).
- **Markazlashtirilgan mijoz yordami:** mobil ilovadan yuborilgan barcha murojaatlar doimo Superadminga tushadi (`POST /support/tickets`); Superadmin o‘zi javob beradi yoki `PATCH /support/tickets/:id/assign` orqali aniq sanatoriya xodimiga biriktiradi.

### 2026-11-22 — Firebase FCM Push (`v0.2.10+13`), E’lonlar markazi va mobil menyu tuzatishi
- **Firebase Cloud Messaging (FCM HTTP v1):** `DevicePushToken` jadvali, `FcmService` (RS256 JWT + OAuth2), Android `SihhatFirebaseMessagingService`, `BootCompletedReceiver`, Android 13+ `POST_NOTIFICATIONS`, `sihhat_notifications` kanali va deep-link yo‘naltiruvi (`v0.2.10+13`).
- **Qayta yozilgan «E’lonlar va xabarlar» markazi (`AnnouncementsAndMessagesCenter`):** auditoriya tanlovi (Users / Hamkorlar / sanatoriya / lavozim), 4 ta tayyor shablon, jonli Preview, 0 ms `IN_APP` yetkazilish, «Kimga bordi» hisoboti va `POST /messages/:id/verify-delivery`.
- **Mobil yon menyu (`<= 760px`) tuzatishi:** `.sidebar` (`z-index: 50`) > `.mobile-scrim.open` (`z-index: 40`) qatlam tartibi va mustaqil `/support` hamda `/messages` sahifalari.

### 2026-11-21 — Sanatoriya CRM va B2C qulayliklari
- **«Qaysi dardga davo?»** davolash yo‘nalishlari filtri (nafas, bel/bo‘g‘im, yurak, asab, oshqozon, buyrak), **Butun xona vs 1 kishilik joy (sherikli/koyka-o‘rin)** tanlovi, **«Yo‘llanma narxi ichiga nimalar kiradi?»**, **«Bo‘sh joy chiqsa xabar berish»** kutish ro‘yxati, **Sanatoriyadagi kunlik tartib va muolaja kundaligi**, hamkorlar uchun **Bandlik kalendari (Shaxmatka)**, **Kasaba uyushmalari (Profsoyuz) kvotasi** hamda 1 tugmada **«🖨️ E-mehmon anketasi»** chop etish.

---

## Joriy holat

| Qism | Amaldagi imkoniyatlar va holat |
| --- | --- |
| **Backend** (`apps/api`) | NestJS 11 + Prisma 7 + PostgreSQL 18 (**22 migratsiya**, inventar `exclusion` cheklovi va **4 ta ledger triggeri**). RBAC va sanatoriya izolyatsiyasi, tasodifiy va takrorlanmas 5 xonali `BR-XXXXX` bron IDlari (`BookingReference`), 6 xonali unikal `#ID` (`User.publicId`), `#ID` va `BR-` tezkor qidiruvi (`GET /auth/quick-lookup`), hamkor mustaqil ro‘yxatdan o‘tishi (`PartnerRegistration`), `AuthEvent` + `Session` qurilma/IP tarixi va backfill, to‘liq Amallar tarixi, markazlashtirilgan yordam va xodimga biriktirish, FCM HTTP v1 push (`DevicePushToken`), `Outbox` (Email + Telegram + In-App + FCM), 5+ xato parol ogohlantirishi, GitHub Releases versiya nazorati va Swagger/OpenAPI (`docs/openapi.json`). |
| **`sihhat.uz` (B2C)** (`packages/ui`) | **T6 Tungi Aurora** (standart) + mos **Y6 kunduzgi** rejim. Jonli API katalogi, «Qaysi dardga davo?» filtri, hudud/byudjet/saralash filtrlari, 3 tagacha sanatoriyani yonma-yon taqqoslash, jonli yo‘llanma narx kalkulyatori, yaqinda ko‘rilganlar, 1-klik havola ulashish (`?sanatorium=...`), `/` va `Ctrl+K` qidiruv, AI maslahatchi oynasi, bron tekshiruvi + muolaja kundaligi, TezCheck quick-checkout, FAQ akkordeon, iOS PWA o‘rnatish yo‘riqnomasi va huquqiy nizomlar. |
| **Superadmin** (`apps/superadmin-web`, `/superadmin`) | **T6 Tungi Aurora** (standart) + Y6 kunduzgi rejim. `Ctrl+K` tezkor qidiruv (bo‘limlar + `#ID` orqali User/Hamkor profili), Hamkor arizalari (`/partner-registrations`), Sanatoriyalar va Mashhur tick tanlovi, Amallar tarixi (`/audit`) va Kirish/chiqish tarixi (`/auth-events`), markaziy Yordam va jonli chat (xodimga biriktirish bilan), E’lonlar va xabarlar markazi, Ilova foydalanuvchilari va Jamoa boshqaruvi, moliya/reklama/hisobotlar va AI sarf nazorati. |
| **Hamkorlar** (`apps/partner-web`, `/hamkorlar`) | **T6 Tungi Aurora** (standart) + Y6 kunduzgi rejim. Direktor, Resepsion va Hisobchi rollari. Kirishda «Yangi hisob ochish» va «Parolni unutdingizmi?», Bandlik kalendari (Shaxmatka), 3 tabli Bronlar va Mijozlar CRM (bronlar, kutish ro‘yxati, kasaba uyushmalari kvotasi), 1-klik E-mehmon anketasi, Superadmin biriktirgan mijoz yordam suhbatlari, Jamoa kirish tarixi, 9 bo‘limli Hamkor shartlari va [Hisobchi paneli](docs/HISOBCHI_PANEL.md). |
| **Android & iOS PWA** (`apps/mobile`) | Flutter Android **`0.2.10+13`**: Email OTP / telefon tasdiqlash, markaziy Yordam bo‘limi, FCM fon/ekran-o‘chiq push bildirishnomalari, «Qaysi dardga davo?» filtrlari, joylashish turi, kunlik tartib, kunduzgi/tungi rejim, internetsiz katalog/bron/QR kesh, 4 tabli Shartlar va nizomlar, avtomatik yangilanish xabarnomasi hamda iOS Safari PWA. |
| **Telegram Bot** | [@sihhat_admins_bot](https://t.me/sihhat_admins_bot): sayt orqali tasdiqlangan hisob, yangi hamkor arizasi / biriktirilgan murojaat / parol tiklash / 5+ xato urinish / to‘lov va moderatsiya ogohlantirishlari, bron/qidiruv/check-in-out va hisobotlar ([yo‘riqnoma](docs/TELEGRAM_BOT.md)). |
| **Gemini AI** | Haqiqiy ulanish (`gemini-3.1-flash-lite`), rozilik, telefon/email niqobi, katalog/FAQ chegarasi, kunlik limit (100 so‘rov) va Superadmin token/taxminiy USD hisoboti. |
| **Tezcheck / Direct Merchant** | 2026-10-08 rasmiy signed o‘qish tekshiruvida kassa `active`, `accepts_payments=true` tasdiqlangan. **Cheklov:** bu haqiqiy pul to‘lovi qabuli emas; har sanatoriyaning shaxsiy direct merchant ulanishi (`BOOKING_SETTLEMENT_MODE=direct`) va haqiqiy checkout/webhook piloti hali alohida qabuldan o‘tmagan ([TEZCHECK.md](docs/TEZCHECK.md), [MERCHANT_CONNECTIONS.md](docs/MERCHANT_CONNECTIONS.md)). |
| **Eskiz SMS** | SMS API autentifikatsiyasi va standart test SMSi tekshirilgan. **Cheklov:** haqiqiy OTP shabloni tasdiqlanmaguncha `ESKIZ_OTP_APPROVED=false` / `SMS_ADAPTER=disabled` holatda qoladi. |

> **Tekshiruv va cheklovlar:** Lokal build, unit va brauzer tekshiruvlari rasmiy production yoki to‘lov/SMS provayder qabulining o‘rnini bosmaydi. Barcha batafsil dalillar va cheklovlar [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) hamda [docs/RUNBOOK.md](docs/RUNBOOK.md) hujjatlarida saqlanadi.

---

## Dizayn galereyalari va prototiplar

Barcha galereyalar internetsiz (lokal brauzerda) ishlaydi va faqat namunaviy ma’lumotlardan foydalanadi:

| Galereya | Mazmuni |
| --- | --- |
| [UI/new apk](UI/new%20apk/index.html) | **2026-11-28 (Yangi APK UI — T5 & T6):** Android ilova uchun **T5 Zumrad & Aqua (+Y3)** va **T6 Tungi Aurora (+Y6)** palitralarida 18 tadan ekran (1-klikda T5↔T6 solishtirish, [T5 posteri](UI/new%20apk/T5/00-apk-barcha-ekranlar-t5.png) · [T6 posteri](UI/new%20apk/00-apk-barcha-ekranlar-t6.png)) |
| [UI/Logo](UI/Logo/index.html) | **2026-11-28 (Yangi T6 Aurora logo konsepsiyalari):** Eski logo ramzlari va yangi T6/Y6 rang palitrasi asosida 6 ta vektor (`.svg`) + Retina (`1024×1024` `.png`) logo varianti hamda [taqqoslash jadvali](UI/Logo/00-barcha-logolar-taqqoslash.png) |
| [UI/new web](UI/new%20web/index.html) | **2026-11-27 (Joriy T6 manbasi):** Superadmin uchun 12 ta Retina ekran maketi (`00`–`11`), kunduzgi ranglar ([ranglar](UI/new%20web/ranglar/index.html)), yorqin ranglar ([yorqin_ranglar](UI/new%20web/yorqin_ranglar/index.html)) va oq rangsiz tungi ranglar ([tungi_ranglar](UI/new%20web/tungi_ranglar/index.html) — tanlangan **T6**) |
| [UI/web_panellar](UI/web_panellar/index.html) | 2026-11-22: Superadmin va Hamkorlar uchun 16 ta V3 ekran maketi va [interaktiv studiya](UI/web_panellar/studio.html) |
| [UI/web](UI/web/index.html) | 2026-10-10: 32 ta web dizayn maketi va 26 ta amaldagi panel skrinshoti |
| [UI/motion-lab](UI/motion-lab/index.html) | 2026-11-06: Android ilova uchun Sokin premium / Aurora / Fresh motion prototiplari |
| [UI](UI/index.html) | 2026-10-10: Android ilova uchun 10 ta PNG (30 ta ekran holati) |

---

## Kod tuzilishi

| Papka | Vazifasi |
| --- | --- |
| `apps/api` | NestJS API, Prisma sxemasi/migratsiyalar (22 ta), worker, Telegram bot va backend testlari |
| `apps/superadmin-web` | `sihhat.uz` B2C sahifasi, `/superadmin` va `/hamkorlar` marshrutlarini uzatuvchi Next.js 16 sayti |
| `apps/partner-web` | Hamkorlar (Direktor / Resepsion / Hisobchi) mustaqil Next.js 16 sayti |
| `apps/mobile` | Flutter Android ilovasi (`0.2.10+13`), native FCM push servisi va mobil testlar |
| `packages/ui` | Barcha web panellar va `sihhat.uz` bosh sahifasining umumiy React komponentlari hamda T6 CSS tizimi |
| `packages/api-client-ts` | Web API mijozi (`X-Device-Label`, CSRF, cookie boshqaruvi) |
| `scripts`, `test` | Lokal muhit, Hostra qadoqlash, APK build/tekshiruv, unit va Playwright testlari |
| `docs`, `infra` | Arxitektura, holat hujjati, OpenAPI (`openapi.json`), runbook, Hostra qo‘llanmasi va Docker |
| `UI` | Oflayn HTML/PNG dizayn galereyalari va rang studiyalari |
| `apk`, `.local` | Lokal APKlar, maxfiy kalitlar, runtime loglar va bazalar (**Gitga kiritilmaydi**) |

---

## Android ilova va iOS PWA

- **Joriy mobil kod versiyasi:** `0.2.10+13` (`apps/mobile/pubspec.yaml`, Firebase FCM HTTP v1 push yoqilgan, universal `armeabi-v7a` + `arm64-v8a` + `x86_64`, `v1+v2+v3` imzo).
- **Sayt orqali yuklab olish:** [sihhat.uz/api/download/apk](https://www.sihhat.uz/api/download/apk)
- **GitHub Releases:** [releases/latest](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/latest)
- **SHA-256 va reliz tafsilotlari:** [ilova/README.md](ilova/README.md) va [ilova/SHA256SUMS.txt](ilova/SHA256SUMS.txt)
- **iOS (iPhone / iPad) PWA:** Safari’da `https://www.sihhat.uz` → **Ulashish (Share)** → **«Asosiy ekranga qo‘shish» (Add to Home Screen)**.
- **Xavfsizlik:** APK fayllari, `key.properties`, `google-services.json` va signing kalitlari Gitga kiritilmaydi. Har qanday release APK haqiqiy HTTPS API manzili va signing konfiguratsiyasi bilan yig‘iladi (`npm run mobile:release`) hamda `python scripts/check-apk-secrets.py <apk>` orqali tekshiriladi.

---

## Tashqi integratsiyalar va maxfiylik

- Barcha maxfiy kalitlar faqat backend muhitidan (`.local/secrets/providers.env`, `SIHHAT_SECRETS_FILE` yoki server environment) olinadi; frontend va APKga hech qachon uzatilmaydi.
- `.env.example` fayllarida faqat bo‘sh yoki namuna qiymatlar saqlanadi. `.env`, `.local/`, `key.properties`, `apk/`, `node_modules/` Gitdan chiqarilgan.
- **Hosting:** Production hosting tafsilotlari (Hostra PM2, PostgreSQL/Redis private socketlar, HTTPS/MFA/cookie/CSRF hamda `npm run hostra:package`) [docs/HOSTRA.md](docs/HOSTRA.md) hujjatida keltirilgan.
- **Alohida qo‘llanmalar:** [Tezcheck](docs/TEZCHECK.md) · [Direct Merchant](docs/MERCHANT_CONNECTIONS.md) · [Telegram Bot](docs/TELEGRAM_BOT.md) · [Hisobchi paneli](docs/HISOBCHI_PANEL.md) · [Sanatoriya rasmlari](docs/SANATORIUM_PHOTOS.md).

---

## Kerakli dasturlar va kutubxonalar

| Dastur yoki xizmat | Versiya / Qachon kerak |
| --- | --- |
| Node.js va npm | **Node >= 24.15.0**, npm **11.x** — API, worker, Telegram bot va ikkala Next.js panel |
| PostgreSQL | **18.x** (`pg_ctl`, `pg_isready`, `psql`, `pg_dump`, `pg_restore`) |
| Flutter & Dart | **Flutter 3.47.5+**, **Dart ^3.13.4** — Android ilova, test va APK build |
| Android SDK & JDK | Platform **36**, NDK **28.2.13676358**, Gradle **9.3.1** wrapper, JDK / Android Studio JBR |
| Python 3 | `scripts/check-apk-secrets.py` orqali APK maxfiylik tekshiruvi |
| Playwright Chromium | Web brauzer testlari uchun (`npx playwright install chromium`) |
| Redis va private S3 | Production worker va media uchun (lokalda DB worker va lokal fayl storage ishlaydi) |

Asosiy stek: **NestJS 11**, **Prisma 7**, **PostgreSQL 18**, **Zod 4**, **BullMQ 5**, **Next.js 16**, **React 19.2**, **TypeScript 5.9**, **Lucide React**, **Sharp**, **Playwright 1.56** (hammasi ildizda `npm ci` orqali o‘rnatiladi).

---

## Lokal ishga tushirish

Yangi kompyuterda muhitni sozlash va barcha xizmatlarni ochish:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build:api
npm run build:web
```

Alohida terminallarda ishga tushirish (development rejimi):

```powershell
npm run dev:api
npm run dev:worker
npm run dev:admin
npm run dev:partner
```

| Xizmat | Lokal manzil |
| --- | --- |
| API tayyorlik holati | `http://127.0.0.1:4000/health/ready` |
| Swagger (OpenAPI) | `http://127.0.0.1:4000/docs` |
| `sihhat.uz` va Superadmin | `http://localhost:3000` (`/`, `/superadmin`, `/hamkorlar`) |
| Hamkorlar (mustaqil) | `http://localhost:3001` |

> Flutter muhitini tekshirish va mobil buyruqlar: [apps/mobile/README.md](apps/mobile/README.md) va [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

## Tekshirish

```powershell
npm run check
npm run test:portal-routes
npm run test:report-periods
npm run build:web
npm run build:api
npm run test
npm run db:migrations:verify -w @sihhat/api
npm run openapi
npm run test:web
npm run backup:verify
npm run check:secrets
```

- **2026-11-27 lokal web/UI tekshiruvi natijasi:** TypeScript typecheck (`@sihhat/ui`, `@sihhat/superadmin-web`, `@sihhat/partner-web`) **0 xato**, `test:portal-routes` (**2/2 pass**), `test:report-periods` (**3/3 pass**), `npm run build:web` (**pass**), headless Chromium jonli tekshiruvi (`/`, `/superadmin`, `/hamkorlar` — **0 sahifa xatosi**, standart T6 tungi rejim + barcha yangi qulayliklar tasdiqlangan), `npm run check:secrets` (**0 moslik**).
- Backend integratsiya testlari alohida `sihhat_test` bazasida ishlaydi; pushdan oldin doimo `npm run check:secrets` bajariladi.

---

## Hujjatlar va asosiy qarorlar

1. [Talablar va arxitektura](docs/SIHHAT_UZ_ARXITEKTURA.md) — rollar, moderatsiya, inventar, bron, to‘lov, hisob-kitob va API qoidalari.
2. [Ishlab chiqish rejasi](docs/ISHLAB_CHIQISH_REJASI.md) — bosqichlar va qabul mezonlari.
3. [Amalga oshirish holati](docs/IMPLEMENTATION_STATUS.md) — barcha sanalar bo‘yicha bajarilgan ishlar, dalillar va ochiq cheklovlar.
4. [Runbook](docs/RUNBOOK.md) — ishga tushirish, migratsiya, zaxira/tiklash va provayderlarni sozlash.
5. [Foydalanuvchi shartlari va nizomlar](docs/FOYDALANUVCHI_SHARTLARI_VA_NIZOMLAR.md) — Ommaviy oferta, Maxfiylik, Qaytarish va AI qoidalari.
6. [Hamkorlik nizomi va shartlari](docs/HAMKORLIK_NIZOMI_VA_SHARTLARI.md) — 0% bron komissiyasi, abonent to‘lovi, moderatsiya, kvota, RBAC va xavfsizlik nizomi.
7. [AI uchun topshiriq](docs/AI_UCHUN_TOPSHIRIQ.md) — loyihaga kirishish uchun boshlang‘ich ko‘rsatma.

**Asosiy biznes qarorlar:**
- Platforma daromadi sanatoriyalarning abonent to‘lovidan shakllanadi; bron komissiyasi **0%**; reklama admin tasdig‘idan so‘ng chiqadi.
- Sanatoriya profili va xodim tayinlovlari Superadmin moderatsiyasidan so‘ng faollashadi.
- Yangi bronlarda sanatoriyaning o‘z merchant hisobiga direct settlement talabi qo‘llanadi (haqiqiy merchant qabul sinovi alohida bajariladi).
- Hujjat tili: o‘zbekcha.
