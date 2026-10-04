# Sihhat uz — amalga oshirish holati

Yangilangan: 2026-10-04. Asos: ISHLAB_CHIQISH_REJASI.md va SIHHAT_UZ_ARXITEKTURA.md.

| Bosqich | Holat | Dalil |
| --- | --- | --- |
| B0 — poydevor | Lokal tekshiruv o‘tdi | NestJS, PostgreSQL 18.6, sakkizta migratsiya, health API; migratsiyalar lokal, test va toza scratch bazada qo‘llandi |
| B1 — hisoblar va ruxsatlar | Lokal tekshiruv o‘tdi | MFA, OTP, tenant, bloklash va CSRF testlari; telefon almashtirish qo‘shildi |
| B2–B8 — backend domenlari | Asosiy lokal oqimlar amalga oshirildi va tekshirildi | Anketa, moderatsiya, xona/narx/bron, Payme va Tezcheck adapterlari, ledger, refund/payout, billing va aloqa APIlari |
| B9 — katalog, hisobot va AI | Katalog/hisobot, FAQ, Gemini va AI sarfi hisoboti mavjud | Haqiqiy Gemini javobi tekshirildi; rozilik, shaxsiy ma’lumot niqobi, kunlik limit, token/model/davr bo‘yicha sarf, sozlangan narxlar bilan USD taxmini va fallback bor |
| B10 — backend qabul | Lokal qabul to‘plami o‘tdi; tashqi tekshiruv cheklovlari quyida | PostgreSQLda 56/56 test; OpenAPI va runbook yangilandi; clean migration va avvalgi backup dalillari quyida |
| F1/F2 — saytlar | APIga ulangan sahifalar, AI sarfi/Tezcheck holati, Telegram ulash va brauzer sinovlari o‘tdi | Ikkala Next.js buildi, TypeScript; oxirgi umumiy brauzer runida 9/9 ssenariy o‘tdi |
| Telegram — xodimlar boti | Kod, lokal worker va rasmiy API ulanishi tayyor | Admin/direktor/resepsion menyusi, xavfsiz ulash, ruxsat tekshiruvi, vazifa/murojaat wizardlari va outbox bildirishnomalari; haqiqiy xodim ulashi hali bajarilmagan |
| F3 — Android | Telefon/SMS tasdig‘idan keyin ochiladigan sahifalar, lokal demo SMS, logo va kunduzgi/tungi rejim, wellness UI va debug preview tayyor | Flutter analyze; 27/27 test; Samsung preview dalillari quyida. Avvalgi bron/tiklanish va release imzo dalillari ham saqlangan; HTTPS API hali belgilanmagan |
| R1 — real pilot | Gemini, Eskiz va Tezcheck rekvizitlari olindi; pilot to‘liq emas | Gemini ulandi, Eskiz standart SMSi yetib keldi, Tezcheck o‘qish endpointlari HTTP 200. Kassa draft; haqiqiy OTP, HTTPS, merchant to‘lovi/webhook, push va real sanatoriya piloti qolgan |

## 2026-10-04 Kompyuter va telefon uchun ishga tushirish

- API, domen worker, superadmin va direktor saytlarining buildlari bilan
  lokal xizmatlar fon rejimida ochildi. `npm run local:start`, `local:status`
  va `local:stop` qo‘shildi; to‘xtatish → qayta ochish → tayyorlik holati
  tekshirildi. Yakunda to‘rtta xizmat ishlayotgan holatda qoldirildi.
- Developmentdagi loyiha bazasida alohida egasi superadmin hisobi yaratildi.
  Tasodifiy parol va MFA faqat `.local` kirish fayllarida; mavjud demo hisoblar
  saqlandi. Provision buyrug‘i qayta bajarilganda kirish JSONining SHA-256
  o‘zgarmadi. Account yaratish faqat `127.0.0.1:55432/sihhat`da ruxsat etilgan.
- Lokal brauzerda API readiness, offline HTMLdagi MFA kodining backend TOTP
  bilan mosligi, yangi superadmin va mavjud direktorning login, serverdan
  ma’lumot olinadigan sahifa navigatsiyasi va logout oqimlari o‘tdi.
  Bu alohida lokal handoff sinovi; oldingi 9/9 umumiy web runining qayta
  bajarilishi yoki production qabul natijasi emas.
- `npm run build:api`, `npm run build:web`, `npm run check` o‘tdi.
  `npm run check:secrets` o‘tdi, manba kodida maxfiy qiymat mosligi yo‘q.
  `db:migrate` sakkizta migratsiyani ko‘rdi, qo‘llanmagan migratsiya yo‘q.
  Backend 56/56 va mobile 27/27 sonlari yuqoridagi avvalgi runlarga tegishli;
  ushbu ishga tushirishda ularning to‘liq to‘plami qayta bajarilmadi.
- Oddiy `lib/main.dart` debug APK qayta yig‘ilib, USBdagi Samsung SM-A165Fga
  o‘rnatildi. API manzili `http://127.0.0.1:4000`, demo OTP paneli yoqilgan;
  USB reverse qayta sozlandi va Android package mavjudligi tekshirildi.
  APKda provider, backend, signing hamda lokal hisoblarni qamrab olgan
  **45 ta maxfiy qiymat bayt namunasi** tekshirildi; moslik yo‘q.
- Natijalar `.local/local-handoff-check.json`, `.local/local-lifecycle-check.json`
  va `.local/releases/android-preview.json`da; kirish fayllari va APK Gitdan
  chiqarilgani tekshirildi. Manba/artefakt skanerlari endi yangi egasi va
  demo hisoblarning parol/MFA qiymatlarini ham tekshiradi.
- Muhit shu kompyuter va USB telefon uchun. Haqiqiy OTP, faol Tezcheck
  kassasi va ommaviy HTTPS deploymentidagi avvalgi cheklovlar saqlanadi.

## 2026-10-04 Login orqali kirish va lokal demo SMS

- Sessiya bo‘lmaganda ilova to‘g‘ridan-to‘g‘ri telefon/SMS loginiga kiradi.
  Asosiy navigatsiya va katalog SMS tasdiqlanguncha yaratilmaydi.
  Saqlangan sessiya kirishda tekshiriladi va kerak bo‘lsa refresh qilinadi;
  bekor qilingan sessiya login oynasiga qaytaradi. Logout yoki sessiya
  bekor qilinishi ochiq ichki route stackini ham yopadi.
- Backend `DEMO_OTP_ENABLED=false` bilan boshlanadi. Opt-in faqat
  development/test va `SMS_ADAPTER=local`da; boshqa adapter yoki productionda
  konfiguratsiya rad etiladi. Demo so‘rovi tasodifiy 6 raqamli kodni
  `demo_code` maydonida beradi. Oddiy OTP hash/challenge, TTL, cooldown,
  urinish limiti va bir martalik ishlatish amal qiladi; hisob faqat to‘g‘ri
  tasdiqdan so‘ng yaratiladi. Haqiqiy SMS yuborilmaydi.
- Flutter demo kodni debug va opt-in flag bilan ko‘rsatadi. **Demo koddan
  foydalanish** maydonni to‘ldiradi, **Tasdiqlash** oddiy API tekshiruvini
  bajaradi. `mobile:preview` flagni qo‘shadi; release panelni ko‘rsatmaydi.
  Lokal API flag bilan qayta ochildi. `.env.example` defaulti `false`;
  haqiqiy lokal sozlama, hisoblar va OTP fayllari Gitga kiritilmaydi.
- `npm run build:api` va `npm test` o‘tdi: PostgreSQLda **56/56 pass**.
  Demo kodning opt-in ishlashi, xato/eskirgan/qayta ishlatilgan kodni rad etish,
  hisobni tasdiqdan keyin yaratish va production/real adapter cheklovi tekshirildi.
  `npm run mobile:check`: format va analyzer xatosiz, **27/27 pass**.
  Yangi 3 test birinchi login, xato/to‘g‘ri kod, logout/back/ichki sahifalarni
  yopish, saqlangan sessiya va oddiy buildda demo panelini yashirishni qamradi.
  Katalog/theme/recovery va mavjud booking integratsiya ssenariylari login
  boshlanishiga moslashtirildi; bron/to‘lov qurilma sinovi qayta bajarilmadi.
- Oddiy `lib/main.dart` arm64 debug APK Samsung SM-A165Fga o‘rnatildi.
  Qurilmada avval telefon logini, keyin autentifikatsiyalangan bosh sahifa
  kuzatildi. APK yig‘ilgandan keyingi lokal ilova bazasida **1 OTP so‘rovi,
  1 tasdiq, 1 yangi mijoz va 1 MOBILE sessiya** qayd etildi. Telefon faol
  ishlatilgani uchun avtomatik login/OS restart ssenariysi yakunlangan deb
  belgilanmadi; sessiya/refresh/logout unit-widget testlarda tekshirildi.
  Dalil `.local/branding/login-gate/server-review.json` va
  `.local/branding/login-gate/installed.png`da; raqam/kod/token logga yozilmadi.
- `npm run check:secrets` o‘tdi; APKdagi **24 maxfiy qiymat bayt namunasi**
  bilan moslik **0**. SHA-256:
  `1898749754dd5aa7f14207cf22113cc77aaf7dbeddd25144bee6484bbbe4f6ac`.
  APK `.local/releases/sihhat-uz-preview.apk`da, API lokal
  `http://127.0.0.1:4000`; USB reverse talab qilinadi. Bu demo SMS va debug
  tekshiruvi. APK, hisoblar, `.env`, OTP va qurilma dalillari Gitga
  kiritilmaydi; o‘zgarishlar lokal commitda saqlanadi, **GitHubga yuborilmaydi**.

## 2026-10-04 Ochilish logosi va ikki rejimli tugma

- `Apk xatolari`dagi screenshot Android ochilish logosi va uning pastki
  yozuvi dumaloq chegarada kesilganini ko‘rsatdi. Android 12+ uchun
  alohida `sihhat_splash.png` tayyorlandi: 288dp shaffof maydonda 128dp
  to‘liq logo. Kunduzgi/tungi native launch temalarida shu asset ishlatiladi.
  Besh ekran zichligidagi haqiqiy PNGlarda dumaloq chegaradan tashqariga
  chiqadigan ko‘rinadigan piksel **0**; dalil
  `.local/branding/splash-fix/geometry.json`da.
- Faqat **kunduzgi va tungi** rejim qoldi. Bosh sahifa/loginidagi
  oy/quyosh tugmasi va profildagi tugma har bosilganda rejimni almashtiradi.
  Boshlang‘ich rejim kunduzgi; eski `system` yoki buzilgan qiymat ham
  kunduzgiga o‘tadi. Secure storage tanlovni qayta ochishda va logoutda saqlaydi.
- `npm run mobile:check -- --format`: analyzer xatosiz, **24/24 pass**.
  To‘rtta appearance testi yangilandi: takroriy bitta bosishda almashish,
  telefon brightnessidan mustaqil ishlash, profil/login va kichik ekran,
  tanlovning tiklanishi hamda xotira xatosidan tiklanish tekshirildi.
- `npm run mobile:preview -- RF8Y1091K8D` o‘tdi, Samsung SM-A165F
  (Android 16)ga yangilangan oddiy `lib/main.dart` APK o‘rnatildi.
  Native ochilish ekranida butun logo va yozuv ko‘rindi:
  `.local/branding/splash-fix/startup-1.png`. Haqiqiy tugma bir bosishda
  tungi → kunduzgi → tungi rejimni almashtirdi (`day.png`, `night.png`).
  OS force-stopdan keyin yangi jarayon **14769 → 15181**da tungi tanlov
  tiklandi; `.local/branding/splash-fix/device-review.json` va
  `night-after-restart.png` dalillari saqlangan.
- Source secrets tekshiruvi o‘tdi; APKdagi **24 maxfiy qiymat bayt namunasi**
  bilan moslik **0**. Yangi preview SHA-256:
  `a953ea0ba90d3fbccdecb6812b1caa569766f2e3cc7eabb5a4b14cbaff98ed8a`.
  APK `.local/releases/sihhat-uz-preview.apk`da; debug API
  `http://127.0.0.1:4000`, lokal server va USB reverse bilan ishlaydi.
  README va runbook yangilandi. Foydalanuvchi ko‘rsatmasiga binoan
  o‘zgarishlar lokal commitda saqlanadi, **GitHubga yuborilmaydi**.

## 2026-10-04 Logo va tungi rejim — dastlabki versiya

- Foydalanuvchi bergan asl logo `assets/branding/sihhat-logo.jpg`da.
  `npm run brand:assets` tasvirning to‘liq ko‘rinishini saqlab, Flutter,
  ikkala web public asset/favikon va Android launcher/splash o‘lchamlarini
  tayyorlaydi. Superadmin hamda direktor/resepsion saytlarida login va
  menyuda shu logo ishlatiladi; mobil loginning gorizontal chiqib ketishi
  tuzatildi.
- Android bosh sahifa/loginidagi **Ko‘rinish rejimi** va profil sozlamasi:
  kunduzgi, tungi va telefon sozlamasiga mos. Tanlov secure storageda
  saqlanadi, logoutda o‘chmaydi. Kartalar, matnlar, filtr, login, bron,
  payment, support va AI umumiy palette bilan moslashadi; QR oq fonda.
- `npm run check` va ikkala Next.js buildi o‘tdi. Haqiqiy lokal API bilan
  brauzerda **3 rol** — superadmin, direktor, resepsion — login, menyu
  logosi, favikon va **360px** kirish sahifasi tekshirildi. Screenshotlar
  va dalil `.local/branding/web-review.json`da. Bu avvalgi **9/9** umumiy
  brauzer runining o‘rniga qayd qilinmagan; backend **54/54** dalili ham
  3-oktabrga tegishli va bu bosqichda qayta ishga tushirilmagan.
- Flutter analyzer xatosiz, **24/24 unit/widget pass**. Yangi 4 test:
  tanlovni qayta yaratishda/logoutdan keyin tiklash va ochiq profilni
  saqlash; telefon brightnessini kuzatish va explicit kunduzgi override;
  kichik ekran/katta matn hamda yangi login routeida rejim almashishi;
  buzilgan qiymat, o‘qish/yozish xatosidan tiklanish.
- Yangi arm64 **debug preview** Samsung SM-A165Fga ma’lumotlar saqlangan
  holda o‘rnatildi. Build skripti force-stop va qayta ochishni bajardi;
  haqiqiy ekranda logo va tungi ko‘rinish ochildi. Screenshot
  `.local/branding/android-initial.png`, build dalili
  `.local/releases/android-preview.json`da. Telefon boshqa ilovaga
  o‘tgani uchun shu buildda rejimlarni qo‘lda almashtirish va undan keyingi
  OS force-stop persistence testi yakunlangan deb belgilanmagan; tanlov
  persistencei unit/widget testlarda tekshirildi.
- APKda **24 maxfiy qiymat bayt namunasi**, moslik **0**; source secrets
  tekshiruvida ham moslik topilmadi. Preview SHA-256:
  `4781043e858d98336ec443b8ae2995dc3ce5d55186630cdbe667c05ab79bfe1d`.
  APK `.local/releases/sihhat-uz-preview.apk`da, API
  `http://127.0.0.1:4000`; lokal server va USB reverse talab qilinadi.
  Yangi signed HTTPS release yoki haqiqiy merchant sinovi bajarilmadi.
- Foydalanuvchining ushbu topshirig‘iga ko‘ra o‘zgarishlar **GitHubga
  yuborilmadi**. APK, screenshot va `.local` dalillari manba commitiga
  kiritilmaydi.

## 2026-10-01 tekshiruv dalillari

| Tekshiruv | Natija |
| --- | --- |
| `npm run build:api` | O‘tdi |
| `npm run check` — barcha npm workspacelar | O‘tdi |
| `npm test` — haqiqiy PostgreSQL, faqat `sihhat_test` | 26/26 pass, 0 fail |
| `npm run openapi` | 131 operation, 27 named schema; `docs/openapi.json` yangilandi |
| `npm run test:contract -w @sihhat/api` — oxirgi OpenAPI parametr tuzatishi | 1/1 pass; URL parametrlarining mavjudligi va header deduplikatsiyasi |
| `npm run db:migrations:verify -w @sihhat/api` | Toza scratch DBda 5 migratsiya, exclusion va 4 ledger guard |
| `npm run backup:verify` | Alohida restore DBda 51 jadval, schema va satr sonlari mos |
| `npm run build:web` | Superadmin va partner buildlari o‘tdi |
| `npm run test:web` | 5/5 pass; `.local/playwright-report/index.html` |
| `flutter analyze --no-pub` | Muammo topilmadi |
| `flutter test --no-pub` | 10/10 pass |
| Android qurilma integration testi | 1/1 pass: OTP → ikki xonali quote/hold → secure storage tiklash → lokal payment → `CONFIRMED` |
| Yangilangan server smoke | `/health/ready` — HTTP 200; saqlangan va ishlayotgan OpenAPI to‘liq mos |
| Oddiy Android build va o‘rnatish | `lib/main.dart` debug APK buildi o‘tdi; Samsungga qayta o‘rnatish — Success |

1-oktabrdagi Android tiklash sinovi qurilmada API va ilova widget daraxtini qayta yaratadi, token/pending bronni haqiqiy secure storagedan oladi. O‘sha sinov OS force-stopni qamramagan; 2-oktabrdagi OS sinovi quyida. Telefonni to‘liq qayta yuklash hali tekshirilmagan. SMS va to‘lov local adapter/simulator orqali tekshirildi; rasmiy SMS va Payme sandbox sinovi emas.

Oddiy APK: [app-debug.apk](../apps/mobile/build/app/outputs/flutter-apk/app-debug.apk). API manzili `http://127.0.0.1:4000`; USB orqali `adb reverse tcp:4000 tcp:4000` va lokal API talab qilinadi. Bu signed release emas. Test bridge to‘xtatildi. Superadmin `http://localhost:3000`, partner `http://localhost:3001`, API va database worker lokal ko‘rib chiqish uchun ishga tushirildi.

Migration dalili: `sihhat_migration_check_1790874575939_ff5a5a96`. DB backup: `.local/backups/sihhat-2026-10-01T17-04-25-508Z.dump`; bu arxiv media fayllarini qamramaydi. Ishga tushirish, migration, worker, zaxira va provider setup buyruqlari [README](../README.md) va [runbook](RUNBOOK.md)da.

## 2026-10-02 Android tekshiruv dalillari

| Tekshiruv | Natija |
| --- | --- |
| Flutter analyzer | Muammo topilmadi |
| Android unit/widget testlar | 13/13 pass; cold startda eskirgan tokenni yangilash, pending/tasdiqlangan bronni tiklash va bekor qilingan sessiyani tozalash qo‘shildi |
| `npm run mobile:test:recovery -- RF8Y1091K8D` | O‘tdi; Samsung SM-A165F, Android 16; uch bosqich bitta APKning uch alohida Android jarayonida |
| Birinchi OS force-stop | PID `17948` to‘xtadi; yangi PID `18343`; sessiya va ikki xonali `PAYMENT_PENDING` bron haqiqiy secure storagedan tiklandi |
| Android payment return | `sihhat://payment-return?status=success` Android orqali ochildi; server `PENDING` holatini tasdiqlangan deb ko‘rsatmadi |
| Lokal provider tasdig‘i | `CONFIRMED` / `SUCCEEDED`; pending marker tozalandi |
| Ikkinchi OS force-stop | PID `18343` to‘xtadi; yangi PID `18598`; sessiya tiklandi, tasdiqlangan bron ro‘yxatdan ochildi |
| Oddiy debug APK | `lib/main.dart`, qurilmaning arm64 ABIiga mos build; qayta o‘rnatildi va ochildi; test bridge to‘xtatildi |
| `npm run mobile:release -- https://api.sihhat.invalid` | O‘tdi; `0.1.0+1`, 55 533 960 bayt, RSA 3072 pilot kaliti bilan imzolandi |
| Release imzo va manifest | `apksigner verify` o‘tdi, APK Signature Scheme v2; debug va ochiq HTTP o‘chirilgan |
| Imzolash kalitini takroriy tayyorlash | Mavjud kalit/konfiguratsiya o‘zgartirilmadi |
| HTTP manzil bilan release skripti | Kutilganidek rad etildi |

OS dalili: [android-recovery.json](../.local/android-recovery.json).
Release APK: [sihhat-uz-release.apk](../.local/releases/sihhat-uz-release.apk).
Imzo/manifest dalili: [android-release.json](../.local/releases/android-release.json)
va [apksigner-verify.txt](../.local/releases/apksigner-verify.txt).

APK SHA-256: `6aa07846167a8b23cc17cf95be74a6b29c6af911903e79018f35010a057f2f84`.
Sertifikat SHA-256: `1ab7f1679b96328284fce2154378b56fb1b8fcd7736991d6f7578de282f57998`.

Release APK haqiqiy HTTPS API manzili berilmagani uchun vaqtinchalik
`https://api.sihhat.invalid` bilan yig‘ildi; bu namuna serverga ulanmaydi.
Haqiqiy manzil berilganda ayni signing kaliti bilan qayta build qilish kerak.
Qurilma sinovi lokal HTTP APIga ulangan debug APKda bajarildi; release APKning
haqiqiy HTTPS server, SMS va Payme bilan oqimi hali tekshirilmagan. Telefonni
to‘liq qayta yuklash sinovi ham qolgan. Kalit/parollar `.local/android-signing`
va `apps/mobile/android/key.properties`da saqlanadi, hisobotga yozilmaydi.

Releasega o‘tishda Flutter plagin registrantining eski `integration_test`
yozuvi Java kompilyatsiyasini buzishi tuzatildi: build skriptlari native
plagin ro‘yxatini yangilaydi, generated Java qo‘lda tahrirlanmaydi. Kalit,
SDK/kesh, imzo va qayta sinash buyruqlari [mobile README](../apps/mobile/README.md)da.

## Ushbu bosqichda tuzatilganlar

- Qo‘lda bron faqat tariflar yuklanib, faol tarif mavjud bo‘lganda ochiladi. Yuklash xatosida qayta urinish, faol tarif yo‘qligida tushunarli izoh bor.
- Web bron testi sekin inventar javobini tekshiradi; takroriy ishga tushirishda eski demo bronlarni o‘chirmasdan bo‘sh sana oralig‘ini tanlaydi.
- Androidda ekran yopilgandan keyingi quote/checkout javoblari `setState` xatosi keltirmaydi; narx hisoblanayotganda bolalar yoshini o‘zgartirish yopildi.
- Session refresh yangi tokenlar bilan foydalanuvchi profilini qaytaradi. WEB/MOBILE javoblari va eski refresh tokenni qayta ishlatish rad etilishi sinovdan o‘tdi.
- OpenAPI auth, query va URL parameterlari, bron/to‘lov/sessiya javoblari, CSV/media turlari va OpenAPI 3.0 chegaralari implementatsiya bilan moslashtirildi. Source eksporti va compiled server metadata farqlari bartaraf qilindi; takroriy headerlar olib tashlandi. Ayrim ikkinchi darajali response sxemalari hali generic object.

## 2026-10-02 Gemini, Eskiz va bosh sahifa

- `npm test`: 32/32 pass; `npm run check`, API va ikkala web buildi o‘tdi.
- `npm run mobile:check -- --format`: analyzer muammosiz, 17/17 test. Public bosh sahifa sekin login tekshiruvini kutmaydi; oflayn kesh, host chegarasi, hudud filtri va yangilikni o‘qish tekshirildi.
- Yangi Playwright testi: 1/1 pass. Superadmin maqolani qoralama → e’lon → arxivga o‘tkazganda public feed va maqola API mos yangilanadi. Avvalgi 5 test dalillari yuqorida.
- Gemini native adapteri haqiqiy so‘rovda `connected`, `fallback=false`, 1 katalog kartasi va 2 FAQ qaytardi. Kalit HTTPS headerda; mijozning roziligi, raqam/email niqobi, faqat public katalog, qat’iy JSON, limit va token sarfi bor. Model moliyaviy amalni bajarmaydi. Narxlar backend hisobidan olinadi.
- Eskiz SMS API login/paroli kabinetning SMS shlyuzidan olinib, maxfiy faylga saqlandi. Autentifikatsiya HTTP 200. Standart test SMSi HTTP 200 `waiting` bilan qabul qilindi va foydalanuvchi yetib kelganini tasdiqladi.
- Eskiz kabineti test rejimida; API hisob holati `active`, `contract_account=false`, OTP shablonlari bo‘sh. Haqiqiy kirish matni bilan sinov HTTP 400, API orqali matn ro‘yxati so‘rovi `User not found` qaytardi. Kabinet shakli orqali urinish ham saqlangan/tasdiqlangan matn sifatida tekshirilmadi. OTP tayyor deb belgilanmagan: `ESKIZ_OTP_APPROVED=false`, development SMS adapteri lokal.
- `npm run mobile:preview -- RF8Y1091K8D`: yangi oddiy debug APK yig‘ildi, Samsungga ma’lumotlar saqlangan holda o‘rnatildi; ilova jarayoni ochildi. API `http://127.0.0.1:4000`, USB reverse talab qilinadi.
- APK ichida 15 maxfiy qiymatning qidiruv namunasi tekshirildi, moslik topilmadi. Preview SHA-256: `c7e74377bae53ec0e2ec843120bf0a3d368b88c2cdd7f161ae3098b035eb9d4d`.

Preview: [sihhat-uz-preview.apk](../.local/releases/sihhat-uz-preview.apk).
Build dalili: [android-preview.json](../.local/releases/android-preview.json).
SMS yetib kelish dalili: [eskiz-standard-sms-test.json](../.local/eskiz-standard-sms-test.json).
Maxfiy provider fayli Windowsda faqat foydalanuvchi va SYSTEM uchun ochilgan; Git/buildga kiritilmaydi.

Kanonik kod repozitoriyasi: https://github.com/MirsaidIbrohimov/Sihhat-uz1.1.
Bugungi foydalanuvchi ko‘rsatmasi: funksional ishni yakunlash, README va kodlarni shu repozitoriyaga joylash; keyingi kod o‘zgarishlari ham shu yerga yuboriladi.

## 2026-10-03 Telegram bot tekshiruvlari

- `npm test`: **44/44 pass**, 0 fail; shundan 12 tasi Telegram oqimlari.
  CSRF, link egasi tasdig‘i, bir martalik token, expiry/revoked session,
  pending staff va guruh chatini rad etish, boshqa sanatoriya chegarasi,
  darhol bekor qilingan ruxsatlar, menyular va callback uzunligi tekshirildi.
  Qidiruv/cancel/sozlamalar, task va support wizard, check-in/out versiyasi,
  webhook secret, encrypted inbox/dedup, retry/opt-out va scheduling bor.
- `npm run check`, API va ikkala Next.js buildi o‘tdi.
- Playwright umumiy runida 7 ssenariy o‘tdi; yangi ulash testining aniq
  matn locatorida xato tuzatilib, alohida run **1/1 pass** bo‘ldi. Jami 8
  ssenariy: 6 mavjud real lokal API oqimi va 2 yangi Telegram UI testi.
  Telegram claim holati brauzerda mock; haqiqiy Telegramga testdan xabar
  yuborilmagan. Saytda ism/IDni tekshirish, checkboxsiz tasdiqlay olmaslik,
  uzishni tasdiqlash, admin/resepsion uchun server xatosidan qayta urinish bor.
- `db:migrations:verify`: toza
  `sihhat_migration_check_1791042965652_61cc32ac` bazasida **7 migratsiya**,
  inventory exclusion va **4 ledger guard** saqlandi.
- `npm run openapi` orqali `/telegram/account`, `/telegram/link`,
  `/telegram/link/:id/confirm`, `/telegram/disconnect` va secret header bilan
  `/telegram/webhook` shartnomalari eksport qilindi.
- Rasmiy `getMe` va `getWebhookInfo`: `@sihhat_admins_bot` ulandi,
  mavjud webhook yo‘q. `telegram:configure` o‘zbekcha commands, tavsif va
  commands menu sozladi. Lokal polling worker ishga tushdi; API readiness
  HTTP 200. Xodimning Telegramdan hisobni ulashi va production/HTTPS
  webhook qabul sinovi bajarilgan deb belgilanmagan.
- Token va webhook secret faqat ignored `.local/secrets/providers.env`da;
  ACL loyiha egasi va SYSTEM uchun. `check:secrets` bot token formatini ham
  tekshiradi; maxfiy qiymatlarni chiqarmaydi. Gitga yuboriladigan manbalar
  tekshiruvda maxfiy qiymatsiz chiqdi. Android kodi/APK bu bosqichda
  o‘zgartirilmadi va qayta build qilinmadi.

Telegram uchun doimiy server, telefon orqali kabinetga kiradigan haqiqiy
HTTPS URLlar va foydalanuvchining saytdagi shaxs tasdig‘i kerak. Kompyuter
o‘chsa lokal worker ham to‘xtaydi. Polling bir replika bilan ishlaydi.
Telegram senddan keyingi crashda xabar takrorlanishi mumkin; ichki bron
versiyasi va task/support idempotency yozuvlari takroriy amalni cheklaydi.
Tugmalar va ishga tushirish [Telegram yo‘riqnomasi](TELEGRAM_BOT.md)da.

## 2026-10-03 Tezcheck, AI sarfi va yangi Android UI

- Berilgan Tezcheck kaliti bilan `/me`, `/cash-desks`, `/payment-methods`,
  `/transactions`, `/balance` va `/stats` **HTTP 200**. Bitta UZS kassa:
  `state=draft`, `accepts_payments=false`; Click, Payme va Uzcard/Humo
  usullari ko‘rindi, tranzaksiya ro‘yxati bo‘sh. Haqiqiy to‘lov, refund yoki
  bank o‘tkazmasi bajarilmadi. Dalil `.local/tezcheck-connectivity.json`da;
  qayta tekshirish `npm run tezcheck:check` bilan.
- `PAYMENT_MODE=tezcheck` lokal serverda yoqildi. Checkout, provider
  idempotency, shifrlangan havola, DB lease/polling va xom tana webhook
  imzosi amalga oshirildi. Faol bo‘lmagan kassa va tarmoq xatosi bronning
  boshlang‘ich rezervini to‘lovga aylantirmaydi. Noma’lum natija inventarni
  bo‘shatmaydi; faqat provider tasdiqlagan cancellation rezervni yopadi.
  Test-provider ledger yaratmaydi. Refund/dispute/chargeback yoki summa/fee
  nomuvofiqligi `REVIEW` va payout yaratish/tasdiqlash blokiga olib keladi.
  Tezcheck hujjatida refund endpointi yo‘q; avtomatik refund bajarilmaydi.
- `npm test`: **54/54 pass**, 0 fail. 9 ta Tezcheck ssenariyi:
  draft/tarmoq xatosi, yo‘qolgan javob/idempotency, kech haqiqiy to‘lov,
  test-provider, noto‘g‘ri summa, webhook imzosi/rotation/dedup,
  ishonchsiz URL, net bank reestri/refund bloklari va invoice ruxsatlari.
  Yangi AI sarfi testi admin ruxsati, Tashkent davri, bo‘sh narxlar,
  o‘lchanmagan tokenlar va failed so‘rov xarajatini tekshirdi.
- AI sarfi admin paneli va `GET /superadmin/ai/usage`da model/natija/davr
  bo‘yicha ko‘rinadi. Narxlar bo‘sh bo‘lsa USD xarajati `null`; sozlangan
  joriy narxlar bilan taxmin hisoblanadi. Bu provider invoicei yoki ledger
  xarajati emas. Hisobotda chat matni va mijoz identifikatorlari yo‘q.
- Toza `sihhat_migration_check_1791050921110_e58a1c7e` bazasida
  **8 migratsiya**, inventory exclusion va **4 ledger guard** tekshirildi.
- `npm run build:api`, `npm run check` va ikkala Next.js buildi o‘tdi.
  `npm run openapi`: **145 operation, 35 named schema**; yangi webhook,
  payment refresh, Tezcheck overview va AI usage shartnomalari eksport qilindi.
  Checkout javobidagi nullable `expires_at` lokal/Payme javoblarida ham bor;
  ayrim boshqa ikkinchi darajali javoblar hali generic object.
- Brauzerning oxirgi umumiy runi **9/9 pass**. Admin panelidagi haqiqiy
  AI usage/Tezcheck read API, direktor bron/check-in/out, resepsion ruxsati,
  maqola feedi va Telegram ulash tekshirildi. Tezcheck tarmoq xatosidan qayta
  urinish/draft holati hamda Telegram claim javoblari brauzerda mock;
  test merchant to‘lovi yoki haqiqiy Telegram xabari yuborilmadi.
  Admin loginlari har safar yangi TOTP vaqt qadamini ishlatadi; replay himoyasi
  saqlangan. Hisobot `.local/playwright-report/index.html`da.
- Flutter analyzer muammosiz, **20/20 unit/widget pass**. Kichik ekran
  (320 px, katta matn), filtr klaviaturasi/invalid narxi va uzun sanatoriya
  sahifasidagi doim ko‘rinadigan bron tugmasi ham tekshirildi.
- Original Flutter wellness dizayni: forest/mint ranglar, katta kartalar,
  qidiruvga olib boradigan bosh blok, bounded filtr, narxli action dock va
  5 bo‘limli navigatsiya. Dekorativ tog‘ rasmi CustomPainter; haqiqiy
  sanatoriya fotosi sifatida ishlatilmaydi. UI manbalari mobile READMEda.
- `npm run mobile:preview -- RF8Y1091K8D`: yangilangan arm64 debug APK
  Samsung SM-A165Fga ma’lumotlar saqlangan holda o‘rnatildi. Force-stop
  `28840 → 29873` yangi jarayonida bosh sahifa va API katalogi ochildi;
  screenshot `.local/mobile-design/home.png`, dalil `device-check.json`da.
  Bu yangi buildda haqiqiy provider to‘lovi, payment return yoki telefonni
  to‘liq qayta yuklash sinovi bajarildi degani emas.
- APKda **24 maxfiy qiymat bayt namunasi**, moslik **0**.
  Preview SHA-256:
  `4091509eb26ebee315c5bbb5d4d20f2f2d86561ed26630f0ca3b5ca77cd2979f`.
  APK: [sihhat-uz-preview.apk](../.local/releases/sihhat-uz-preview.apk).
  Debug API `http://127.0.0.1:4000`; USB reverse va lokal API talab qiladi.
  8 GB xotirali Windows uchun Gradle heap 2 GB, workers 2 qilib sozlandi;
  oldingi vaqt chegarasi xatosidan keyingi build muvaffaqiyatli o‘tdi.

Tezcheck kassasini faollashtirish, haqiqiy HTTPS endpoint va provider bergan
webhook siri qolgan. Kalit serverdagi ignored, ACL bilan cheklangan faylda;
APK, brauzer, source yoki Gitga berilmagan. Integratsiya shartnomasi va
qo‘lda solishtirish tartibi [Tezcheck yo‘riqnomasi](TEZCHECK.md)da.

## Muhit

- Node.js 24.15.0, npm 11.12.1 mavjud.
- PostgreSQL 18, Android SDK va JDK mavjud; `sihhat`, `sihhat_test` va alohida restore/evidence bazalari ishlatildi.
- Docker PATHda yo‘q; lokal muhit PostgreSQL + fayl storage + DB worker orqali ishlaydi. Docker Compose Redis/S3 varianti hali ishga tushirilmagan.
- Flutter 3.47.5 / Dart 3.13.4 `.local/tools/flutter`da. Windowsdagi native hook uchun mavjud bo‘shliqsiz SDK yo‘li mobile yo‘riqnomasida ko‘rsatilgan.
- Mavjud uchta reja hujjati va rootdagi `codex` dependency saqlangan.

## Ochiq tashqi shartlar

Gemini, Eskiz va Tezcheck hisoblari berildi, yuqoridagi ulanishlar tekshirildi. Tezcheck kassasi draft; faollashtirish, HTTPS va webhook siri kerak. Eskiz hisobini haqiqiy yuborishga tayyorlash va OTP matnini tasdiqlatish qolgan. Real sanatoriya, bank rekvizitlari, push va staging infratuzilmasi hali kerak; Payme bevosita adapteri tanlansa rasmiy merchant rekvizitlari ham talab qilinadi. Production deploy va haqiqiy pul amallari bajarilmagan. Tariflar va refund/payout qoidalari pilot uchun tasdiqlanishi kerak.

## Qolgan ishlar

1. Tezcheck kassasini faollashtirish va haqiqiy merchant to‘lovi/HTTPS webhookni tekshirish; Android release APKni haqiqiy HTTPS API bilan qayta yig‘ish, provider payment return va telefonni to‘liq qayta yuklashdan tiklanishni tekshirish.
2. Eskiz hisobini test rejimidan chiqarish va OTP matnini tasdiqlatish; shundan keyin haqiqiy kirish kodi sinovi. OTPdan tashqari SMS bildirishnoma adapteri ham qolgan.
3. Ayrim ikkinchi darajali OpenAPI javoblarini aniqlashtirish; Redis/S3, tanlangan to‘lov provayderi va push muhitlarini stagingda tekshirish. AI token/model/davr va sozlangan narxli USD hisoboti amalga oshirildi; haqiqiy provider invoiceini solishtirish pilotda qolgan.
4. Real sanatoriya bilan inventar, bank payout/refund va backup/media tiklash pilotini bajarish.
