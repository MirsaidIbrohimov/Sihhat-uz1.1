# Sihhat uz — amalga oshirish holati

Yangilangan: 2026-10-14. Asos: ISHLAB_CHIQISH_REJASI.md va SIHHAT_UZ_ARXITEKTURA.md.

| Bosqich | Holat | Dalil |
| --- | --- | --- |
| B0 — poydevor | Lokal tekshiruv o‘tdi | NestJS, PostgreSQL 18.6, lokal bazaga 12 migratsiya; 2026-10-10 toza scratch bazada ham barcha 12 migratsiya, exclusion va 4 ledger guard tekshirildi |
| B1 — hisoblar va ruxsatlar | Lokal tekshiruv o‘tdi | MFA, OTP, tenant, bloklash, CSRF va telefon almashtirish; superadmin 2 soat, direktor/resepsion 4 soat faolsiz bo‘lsa server sessiyani rad etadi |
| B2–B8 — backend domenlari | Asosiy lokal oqimlar amalga oshirildi va tekshirildi | Anketa, moderatsiya, xona/narx/bron, Payme va Tezcheck adapterlari, ledger, refund/payout, billing va aloqa APIlari |
| B9 — katalog, hisobot va AI | Katalog/hisobot, FAQ, Gemini va AI sarfi hisoboti mavjud | Haqiqiy Gemini javobi tekshirildi; rozilik, shaxsiy ma’lumot niqobi, kunlik limit, token/model/davr bo‘yicha sarf, sozlangan narxlar bilan USD taxmini va fallback bor |
| B10 — backend qabul | Lokal qabul to‘plami o‘tdi; tashqi tekshiruv cheklovlari quyida | 2026-10-14 PostgreSQLda 111/111 test, skipped/xato 0; sihhat_testda 14 migratsiya qo'llangan; oldingi scratch, OpenAPI va backup dalillari quyida |
| F1/F2 — saytlar | APIga ulangan sahifalar va 4+ surat galereyasi | Ikkala Next.js buildi, TypeScript; yangi surat yuklash/tartiblash brauzer testi 1/1, avvalgi umumiy to‘plam 11/11 |
| Telegram — xodimlar boti | Kod, lokal worker va rasmiy API ulanishi tayyor | Egasi superadminining hisobi bog‘langan; mijoz yordam xabari va bot javobi bir suhbatga tushishi lokal backend testida tekshirildi |
| F3 — Android | Yangi UI/SMS kirish, 9 raqamli maydon/inline xato, yagona ikonkalar, reklama/admin tanlovi, offline katalog/profil/rasm va bron/QR, debug preview | 2026-10-10 Flutter analyze xatosiz; 61/61 unit/widget test. Oldingi Samsung tekshiruvida ikki force-stop va API so‘rovlari bloklangan offline bron/QR tekshirildi; Hostra HTTPS API tayyor, mavjud debug APK lokal APIga bog‘langan |
| R1 — real pilot | Gemini, Eskiz va Tezcheck rekvizitlari olindi; pilot to‘liq emas | Gemini ulandi, Eskiz standart SMSi yetib keldi; 2026-10-08 Tezcheck signed o‘qishida kassa active/accepts_payments=true. Hostra HTTPS va panel MFA kirishi tekshirildi; haqiqiy OTP, direct merchant to‘lovi/webhook, push va real sanatoriya piloti qolgan |

## 2026-10-14 alohida panel yo'llari va kirish himoyasi

- Jonli [superadmin](https://sihhat.uz/superadmin) va
  [hamkorlar](https://sihhat.uz/hamkorlar) alohida login shakllarini ochadi.
  Adminning MFA maydoni majburiy, hamkorlar shaklida u yo'q. Ikkala panel
  va `/bookings` ichki havolalari ommaviy HTTPS orqali **200**; API base
  `https://sihhat.uz/api`, readiness **200**.
- `Portal` navigatsiyasi tanlangan panel prefiksini menyu, brand havolasi,
  query, reload va orqaga yurishda saqlaydi. Lokal brauzer **8/8**, yo'l
  testlari **2/2**, workspace TypeScript tekshiruvi o'tdi. Mock sessiyali
  UI testida boshqa rol bilan sidebar ochilmaydi va panel APIlari so'ralmaydi.
- Lokal PostgreSQLda backend **111/111**, skipped/xato **0**; **14**
  migratsiya qo'llangan. Ro'yxatdan o'tgan barcha superadmin API amallari
  anonim sessiya uchun **401**, faol direktor va mijoz uchun **403** bilan
  rad etildi. Soxta rol headerlari, soxta cookie va WEB/MOBILE tokenini
  boshqa kanalga o'tkazish vakolat bermadi. Serverdagi auth va controller
  source fayllari lokal tekshirilgan **16** fayl bilan SHA-256 bo'yicha mos.
- Jonli Chromiumda haqiqiy superadmin parol/MFA bilan kirdi: `me` va
  superadmin ro'yxati **200**. MFA'siz kirish **401 / MFA_REQUIRED**, avval
  ishlatilgan kod **401 / MFA_INVALID**. Cookie hosti `sihhat.uz`, access va
  refresh Secure/HttpOnly/SameSite=Lax. CSRF yo'q/noto'g'ri yoki begona
  Origin bilan activity **403**, haqiqiy CSRF va asosiy Origin bilan **201**.
  Logout **201**, undan keyin superadmin API **401**. Bu jonli admin/anonim
  tekshiruv; direktor/mijoz haqiqiy production hisoblari yaratilmadi.
- Runtime CORSga faqat aniq `https://sihhat.uz` origini qo'shildi. Release
  `20261014T101310Z-panel-paths-d11af516e1a8` alohida papkada build qilindi,
  ichki `127.0.0.1:3101`da panel/proksi va ruxsatsiz kirish tekshirildi.
  Birinchi cluster reload readinessga yetmadi; eski release va runtimega
  avtomatik qaytish muvaffaqiyatli o'tdi. Next'ni alohida child processda
  boshlaydigan ikkala web wrapper aniq PM2 **fork** rejimiga o'tkazildi;
  port bo'shagandan keyin yangi jarayon ro'yxatdan o'tkazilib, release
  faollashtirildi va PM2 state saqlandi. Beshta xizmat online; domen va
  Telegram worker jarayonlari o'zgarishsiz qoldi.
- Private dalillar `.local/hostra/panel-runtime-before.json`,
  `panel-paths-first-activation.json`, `panel-paths-activation.json` va
  `panel-paths-live.json`da. Lokal kirish fayli yangi panel havolalarini
  ishlatadi; credentiallar public/Gitga kiritilmadi. Database/media,
  merchant, SMS va Android release bu panel o'zgarishida almashtirilmadi.
  [Ishga tushirish tartibi](HOSTRA.md).

## 2026-10-13 Hostra MFA kirish fayli

- Harfli MFA ulash kaliti bilan joriy raqamli kod chalkashmasligi uchun
  private `HOSTRA_KIRISH.html`da **6 raqamli kod** darhol ko'rsatiladi.
  Telefon sozlash kaliti alohida yopiq bo'limda; kod uchun alohida nusxalash
  tugmasi bor. `npm run hostra:access` sir saqlamaydigan templatedan shu
  private HTMLni qayta yaratadi.
- SSH orqali lokal/server kirish fayllari, bazadagi parol va shifrlangan
  MFA mosligi tasdiqlandi. Login, parol va MFA kaliti o'zgartirilmadi.
- Chrome'da kod ko'rinishi, yopiq setup, ikkala copy usuli va oltita vaqt
  qadamida backend bilan moslik **6/6**; tashqi HTTP so'rov **0**.
  Shu fayl yaratgan kod bilan haqiqiy Hostra HTTPS login **201**, `me` **200**,
  takror kod **401 / MFA_INVALID**, logout **201**. Dalillar private
  `.local/hostra/mfa-diagnostics.json` va `mfa-verification.json`da.

## 2026-10-13 Hostra deployini davom ettirish

- Amaldagi hosting **Hostra** ekani private deploy arxivi va SSH ulanish
  helperidan aniqlandi. Railway yozuvlari oldingi platforma tayyorlovidir.
- Hostra PostgreSQL account socketi va Redis socketi aniq platforma bilan
  qabul qilinadi; umumiy production loopback cheklovlari saqlanadi.
  Tasdiqlanmagan SMS uchun `SMS_ADAPTER=disabled` OTP/telefon o'zgartirishni
  database yoki providerga murojaatsiz 503 bilan yopadi. **9/9** konfiguratsiya
  tekshiruvi o'tdi; bu hosting/provider qabuli emas.
- `hostra:package` source uchun sir tekshiruvi, fayllar allowlisti,
  arxiv ro'yxati tekshiruvi va SHA-256 manifestini qo'shadi. APK,
  database/media, `.env`, `.local`, kesh va lokal buildlar yuborilmaydi.
- SSH host key bilan ulanish tasdiqlandi. Release
  `20261013T143417Z-9763a12e208f` private server papkasiga yuklandi,
  arxiv SHA-256 tekshirildi; **182 fayl**, **2 994 397 bayt**.
  Node **24.15.0**, serverdagi `npm ci`, API/ikkala web buildi, production
  preflight, **14 migratsiya**, private backup va production bootstrap o'tdi.
- Media public rootdan tashqaridagi **0700** persistent XFS papkada,
  fayllar **0600**; bu variant faqat aniq Hostra path bilan qabul qilinadi.
  Socket/media/SMS konfiguratsiya testlari **9/9** o'tdi.
- [Admin](https://sihhat-admin-mirsaid2028.wwwz.uz) va
  [hamkorlar](https://sihhat-mirsaid2028.wwwz.uz) HTTPS **200**;
  ikkala `/api/health/ready` va katalog **200**. API base: hamkorlar `/api`.
  Login/MFA **201**, Secure/HttpOnly cookie, `me` **200**, CSRF tokensiz
  logout **403**, haqiqiy CSRF bilan **201**, logoutdan keyin **401**.
- Beshta PM2 xizmat ishlaydi. Telegramning past memory limiti qayta
  registration bilan **384M / 40000 ms**ga tuzatildi; keyingi **97 soniya**da
  restart **0**, yangi error log **0**. Bot autentifikatsiyasi **200**, webhook
  yo'q. Lokal boshqariladigan Telegram worker to'xtagan.
- SMS OTP **503 / SMS_DISABLED**; SMS yoki haqiqiy pul operatsiyasi
  bajarilmadi. Android debug APK alohida lokal sozlamasini saqlaydi.
  Secret scan **445 fayl**, moslik **0**. Rekvizit/MFA va barcha dalillar
  `.local/hostra`da; public papka/Gitga kiritilmadi. GitHubga push yo'q.
  [Hostra runbook](HOSTRA.md).

## 2026-10-10 Web UI — ko‘rib chiqish namunalari

- `UI/web` papkasi: **26 ta amaldagi ekran** va **32 ta yangi dizayn PNGsi**.
  Superadmin, direktor va hisobchi; barcha asosiy bo‘limlar, login/MFA,
  Mashhur tick, reklama previewi, moliya, xabar/vazifa/yordam va hisobotlar.
  Qo‘shimcha bron tafsiloti, profil tahriri, tungi dashboard va 390 px
  login/dashboard/bron holatlari bor.
- [Galereya](../UI/web/index.html)da rol/qidiruv filtrlari, yonma-yon
  taqqoslash, 1:1 zoom, oldingi/keyingi, Esc va PNG yuklash. Interaktiv
  HTML/CSS namuna, lokal shrift/ikonka/logo/illyustratsiya va
  [UI tekshiruvi](../UI/web/REVIEW.md) shu papkada.
- Amaldagi React UI faqat shu headless brauzerda namunaviy API javoblari
  bilan suratga olindi. Live login/MFA, mijoz ma’lumoti, bank rekviziti va
  demo hisoblar ishlatilmadi; APIga o‘zgartirish yuborilmadi. Oddiy API,
  ikkala panel va telefon sozlamalari almashtirilmadi.
- Yangi maketlar **amaldagi React panellariga hali ko‘chirilmagan**.
  Artefakt/galereya tekshiruvi production yoki haqiqiy provider qabuli emas.
  `UI/web/tools/render.cjs --all`: **58/58 PNG** to‘liq dekodlandi;
  amaldagi 26 ekran va yangi 32 ekran suratga olishda JS xato,
  yo‘qolgan rasm va sahifa gorizontal overflowi **0**.
- Galereya 1440×1000 va 390×844da tekshirildi: 32/26 ekran soni, qidiruv,
  rol filtri, juft rasm, 1:1, oldingi/keyingi va Esc ishladi. Namunadagi
  Mashhur tick, profil/tahrir navigatsiyasi, bron holati filtri, forma oynasi,
  inventar tablari, ko‘rinish tugmasi va telefon menyusi ishladi.
  Private dalillar `.local/web-ui*-validation.json`da.
- `offline-check.cjs`: galereya/namuna **file:** protokolida, internet
  o‘chiq holatda ochildi; lokal shrift/rasmlar va juft taqqoslash ishladi.
  `npm run check:secrets`: **385** fayl, **21** private qiymat, moslik **0**;
  `git diff --check` o‘tdi.

## 2026-10-10 Telefon maydoni, logo, reklama va admin tanlovi

- Login maydonida `+998` doimiy prefiks, milliy raqam aynan 9 xonali;
  kam/ortiqcha raqamda SMS so‘rovi yuborilmaydi va maydon tagida xato chiqadi.
  Formatlangan `+998` raqamni paste qilish ishlaydi. Login rasmiga asl
  `SihhatLogo` qo‘yildi.
- Bosh sahifaning navigatsiyasi boshqa menyular bilan bitta Lucide ikonka
  ro‘yxatini ishlatadi. Home qidiruv, banner, shortcut, karta, yangilik va
  reklama ikonkalarida ham yangi vektor uslubi qo‘llanadi.
- HOME reklama mashhur sanatoriyalar joyini egallaydi. Reklama yo‘q,
  kutilmoqda yoki xato bo‘lsa shu joyda tanlangan sanatoriyalar turadi.
  Ikki blok bir paytda ko‘rsatilmaydi; eski avtomatik home kesh invalidatsiya
  qilindi, offline katalogda faqat admin belgilagan profillar fallback bo‘ladi.
- Superadmin **Sanatoriyalar → Mashhur** ustunidagi tick orqali tanlovni
  saqlaydi. `featuredOnHome` dastlab false; faqat faol/public revisionli
  tanlangan profillar chiqadi. Tanlov version bilan himoyalangan, auditga
  yoziladi, customer va direktor o‘zgartira olmaydi. Bosh sahifa ro‘yxati
  katalogning birinchi 100 natijasi va oldingi 6 ta karta bilan cheklanmaydi.
- `npm run mobile:check -- --format`: analyzer xatosiz, **61/61** unit/widget
  test. `npm test`: **100/100**, skipped/xato **0**. Yangi API testi tanlov,
  untick, version conflict, ruxsat, pausadagi profil va 100-natijadan keyingi
  tanlangan profillarni tekshiradi; uning vaqtinchalik profillari tozalanadi.
- `npm run check`, API va ikkala Next.js buildi o‘tdi. OpenAPI yangilandi.
  `npm run db:migrate` lokal va test bazasiga 12-migratsiyani qo‘lladi;
  `db:migrations:verify` toza scratch bazada **12/12** migratsiya, inventar
  exclusion va **4** ledger guardni tekshirdi.
- Izolyatsiyalangan `sihhat_test` bazasida yangi Playwright tekshiruvi
  **1/1** o‘tdi: saqlash xatosida tick rollback va inline xato, tickni yoqish,
  browser reload, home feedga kirish va untickdan keyin yo‘qolish. Oldingi
  barcha browser testlari bu o‘zgarishda qayta bajarilmadi. Fixture yopildi,
  odatdagi lokal API va yangi ikkala panel qayta ishga tushirildi.
- Bosh sahifaning bo‘sh holat matni va telefonda katta chiqqan search ikonka
  o‘lchami yakunlangach analyzer yana xatosiz, mavjud home widget testlari
  qayta **8/8** o‘tdi. Search glyph **24×24 dp** ekanligi va menyuga o‘tib
  bosh sahifaga qaytganda yagona ikonka ro‘yxati saqlanishi tekshirildi;
  umumiy **61/61** tekshiruvi yuqorida.
- Manba siri tekshiruvi: **304** fayl, **21** private qiymat, moslik **0**.
  APK: **57** bayt namunasi, moslik **0**. Bu lokal debug/simulator dalili;
  production yoki rasmiy provider qabuli emas. GitHubga push qilinmadi.
- Yakuniy oddiy `lib/main.dart` ARM64 debug APK: build
  `2026-10-10T05:21:25.581Z`, API `http://127.0.0.1:4000`, demo OTP UI.
  `apk/sihhat-uz-preview.apk` va `.local/releases` nusxalari bir xil,
  SHA256 `0004a6a90a33ced7eeb049db8465cd04c05a9e7c237eacd1fb48cfda95c1817c`.
  Samsung **SM-A165F**ga `adb install -r` bilan o‘rnatildi:
  `lastUpdateTime=2026-10-10 10:22:39`, MainActivity ochildi, jarayon faol,
  USB `tcp:4000` reverse tiklandi. Hisobot `.local/ui-install-20261010`da.
- Yakuniy APK telefonda tungi rejimda ham tekshirildi: Bronlar → Bosh
  sahifa va Sanatoriyalar → Bosh sahifa qaytishlarida yangi navigatsiya
  ikonkalarining bir xil uslubi saqlandi. Home qidiruv ikonkasining o‘lchami
  mos, reklama mashhur sanatoriyalar joyida ko‘rindi; ekran dalillari
  `.local/ui-install-20261010/home-night-updated.png` va
  `catalog-night-updated.png`da.

## 2026-10-10 Dastlabki Android UI — Flutterda joriy etildi

- Qamrov: Android ichki sahifalari va telefon/SMS kirish.
  [UI galereyasi](../UI/index.html) va 10 ta PNGda jami 30 ekran holati
  tayyorlandi. Uslub amaldagi yashil palitraga asoslangan.
- Katalog/filtr, tarif/galereya/kelish ma’lumoti, ikki bosqichli bron,
  to‘lov kutilishi va tasdiq/QR, bronlar/sharh, AI roziligi/suhbat,
  profil/telefon, yordam, bildirishnoma/yangilik va SMS kirish maketlari bor.
  Kunduzgi va tungi ko‘rinish namunalari kiritilgan.
- Built-in ImageGen ishlatildi; to‘liq prompt va reference ma’lumotlari
  [prompts.json](../UI/prompts.json)da. [Dizayn tavsiyalari](../UI/DESIGN_GUIDE.md)
  Flutter/Tailwind farqi va yagona outline ikonka uslubini tushuntiradi.
- Tekshiruv: 10/10 PNG to‘liq dekodlandi, har biri 1536×1024; 30 holat
  manifestga mos. Galereya linklari va JS sintaksisi, 1440×1000 desktop
  hamda 390×844 telefon brauzer ko‘rinishi, filtrlar, preview, navigatsiya,
  1:1 zoom va Esc o‘tdi; gorizontal overflow/pageerror 0.
  `npm run check:secrets`: 292 manba fayli, 21 private qiymat, moslik 0.
  `git diff --check` o‘tdi. Artefakt sinovi Android runtime sinovi emas.
- Uslub katalog/filtr, sanatoriya/tarif/surat/shartlar, sana/bron/to‘lov/QR,
  bronlar/sharh, AI, profil/telefon, yordam, bildirishnoma/yangilik va
  telefon/SMS sahifalariga Flutter widgetlari bilan joriy etildi.
  `concept_ui.dart` umumiy mavzu/sahifa/karta/pastki amal/OTP komponentlarini
  beradi. Manrope/DM Sans shriftlari va Lucide vektor ikonkalar lokal
  assetlardan olinadi; litsenziyalari `apps/mobile/assets/licenses`da.
  Bosh sahifaning avvalgi ko‘rinishi saqlangan.
- Mobil tekshiruv: `npm run mobile:check -- --format` — 39 Dart fayli
  formatlangan, Flutter analyzer xatosiz va **59/59** unit/widget test
  o‘tdi. Yangi sinovlar narx oralig‘i va barcha sharoitlarni to‘liq offline
  katalogda sahifalashdan oldin qo‘llash, OTP paste/raqam filtri va keyingi
  chiqish sanasini talab qiladigan kalendarni tekshiradi. Kichik ekran/
  katta matn, kunduzgi/tungi rejim, sessiya va offline bron/QR regressiyalari
  ham o‘tdi.
- Joriy `npm run check:secrets`: **303** manba fayli, **21** private qiymat,
  moslik **0**. Bu lokal UI dalillari; provider/production qabuli emas.
  Fayllar lokal saqlanadi, GitHubga push bajarilmadi.
- `npm run mobile:preview` oddiy `lib/main.dart`dan Android **ARM64 debug**
  APK yig‘di: API `http://127.0.0.1:4000`, demo OTP UI yoqilgan. APKda
  **57** maxfiy qiymat bayt namunasi tekshirildi, moslik **0**.
  `apk/sihhat-uz-preview.apk` va `.local/releases/sihhat-uz-preview.apk`
  SHA256: `a466dbdff9eeb8abbb622cbe11c8ea4fe8931ebbccd90ec66f21912768c2cd20`.
  Nusxalar bir xil; APK va private dalillar Gitdan chiqarilgan.
- Lokal PostgreSQL tiklanishi yakunlandi, API `/health/ready` **200**.
  Samsung **SM-A165F**ga `adb install -r` orqali ma’lumotlarini saqlab
  o‘rnatildi. Qurilmada `lastUpdateTime=2026-10-10 09:41:14`,
  `uz.sihhat.sihhat_mobile/.MainActivity` ochilishi **Status: ok**,
  jarayon faol va USB `tcp:4000` reverse sozlangan.
  Build/o‘rnatish hisoboti va ekran dalillari `.local/ui-install-20261010`da.
- Qurilmada sessiya saqlanib, qayta SMSsiz bosh sahifa va yangi katalog
  ochildi. Kunduzgi va tungi katalog, rasmlar, shrift/ikonkalar va
  navigatsiya ekran orqali tekshirildi. Kunduzgi root sahifalarida yashil
  fon ustidagi status/navigation belgilari qorayib ketishi tuzatildi;
  yakuniy APKda oq belgilar tasdiqlandi. Tuzatishdan keyin analyzer
  xatosiz, mavjud `appearance_test.dart` + `design_test.dart` **7/7**.
  Telefonning avvalgi tungi rejimi qaytarildi. Yakuniy ekran dalillari
  `home-day-final.png`, `catalog-day-final.png`, `catalog-night-final.png`.

## 2026-10-08 Kutubxonalar va lokal APK papkasi

- [README](../README.md#kerakli-dasturlar-va-kutubxonalar)ga Node/npm,
  PostgreSQL, PowerShell, Flutter/Dart, Android SDK/JDK, tekshiruv vositalari,
  API/web/Flutter kutubxonalari va ularni o‘rnatish buyruqlari yozildi.
  Birinchi startup tartibi ikkala web buildi va `local:start`ni ham qamraydi.
- Joriy oddiy `lib/main.dart` buildning nusxasi
  `apk/sihhat-uz-preview.apk`ga joylandi: **116 600 681 bayt**, Android ARM64
  debug, API `http://127.0.0.1:4000`, lokal demo OTP oynasi. Telefon uchun
  ishlayotgan lokal API va USB reverse talab qilinadi; bu production release emas.
- Nusxa SHA256si build hisobotidagi asl faylga mos:
  `4bd86139a3b9dd4d4c718d9ff843d334de711b7d3e75d0c3db3ccf7e2f9ffef3`.
  Aynan shu nusxa uchun **57** credential bayt namunasi tekshirildi,
  maxfiy ma’lumot mosligi **0**. `npm run check:secrets`: **278** manba
  fayli, **21** private qiymat, moslik **0**.
- `/apk/` `.gitignore` va `.railwayignore`ga kiritildi; `git check-ignore`
  APK chiqarilganini tasdiqladi, `git ls-files -- apk` bo‘sh.
  `git diff --check` va `npm run railway:check` o‘tdi.
  GitHubga push va yangi Railway deployment bajarilmadi.

## 2026-10-08 Railwayga tayyorlash va lokal ishga tushirish

- `.railway/railway.ts`: API, domen worker, Telegram, superadmin va
  hamkorlar paneli; PostgreSQL, Redis, private S3 bucket va MFA volume.
  Root npm workspaces va Node 24.15.0; panellar Railway `PORT`ini oladi,
  IPv4/IPv6 interfeysi, API pre-deployda konfiguratsiya + migratsiya.
  Bitta Telegram replika, overlap 0 va draining 30 soniya. Source upload
  alohida; GitHubga avtomatik push yo‘q. [.railwayignore](../.railwayignore)
  sirlar, keshlar, signing va buildlarni chiqaradi.
- Production konfiguratsiyasi noto‘g‘ri HTTPS originlar, localhost
  PostgreSQL/Redis/S3, tasdiqlanmagan OTP, bo‘sh kassa va tanlangan HTTP
  adapterining yetishmagan URL/tokenini rad etadi. `TRUST_PROXY=private`
  bilan login/OTP limitlari private proksi ortidagi mijoz IPsiga tegishli;
  soxta oldingi public hop olinmaydi. Oddiy lokal standart `none`.
- `npm test`: alohida `sihhat_test`da **99/99**, xato/skipped **0**.
  Shu jumladan production sozlamalari va proksi orqali ikki mijoz IPsi.
  API/ikkala Next.js buildi, barcha workspace TypeScript tekshiruvlari va
  `npm run railway:check` o‘tdi. Oldingi, ishlatilmagan `codex` npm paketi
  olib tashlandi; `npm audit` va runtime auditida **0** zaiflik.
- Toza `sihhat_migration_check_1791473019003_aeef8fd5` lokal bazada
  **11 migratsiya**, xona exclusion va **4 ledger guard** o‘tdi. Oddiy
  `sihhat` ma’lumotlari saqlangan; uning migratsiyalari pending **0**.
- `local:start` beshta xizmatni fon rejimida ochdi. API live/ready,
  katalog, ikkala panel va ularning `/api/health/ready`si **200**.
  Superadmin MFA, Azimshifo direktor va resepshin loginlari **201**,
  uch cookie forward, hisob/katalog **200**, activity **201**;
  yo‘q CSRF va begona origin **403**, logout **201**, revoked sessiya **401**.
  Private dalil `.local/runtime/railway-startup-check.json`da.
- Alohida **3100/3101** `PORT` va `::` sinovida ikki panelning IPv4,
  IPv6, `/api` proksisi va katalogi **200**; noto‘g‘ri port rad etildi.
  Vaqtinchalik jarayonlar yopildi. Bu Railway tarmog‘i bo‘yicha **lokal
  taqlid**, jonli Railway emas. Dalil `.local/runtime/railway-web-smoke.json`da.
- Flutter format o‘zgarishi **0**, analyzer xatosi **0**, **56/56** test.
  Joriy `lib/main.dart` debug APK Samsung SM-A165Fga o‘rnatilib ochildi,
  API `http://127.0.0.1:4000`, USB reverse. APKda **57** maxfiy qiymat
  bayt namunasi, moslik **0**; fayl `.local/releases`da, Gitga kirmaydi.
- Rasmiy Telegram getMe/getWebhookInfo o‘tdi: polling, webhook yo‘q,
  pending **0**. Rasmiy Tezcheck signed o‘qishida kassa **active**,
  **accepts_payments=true**, usullar va balans endpointi ishlaydi,
  tranzaksiya namunasi **0**. Haqiqiy SMS yoki pul to‘lovi yuborilmadi.
- Lokal preflight production uchun tayyor emasligini ko‘rsatadi:
  development/SMS local, DB worker, fayl storage, lokal URLlar;
  Eskiz OTP approved flagi **false**. Haqiqiy Railway environment,
  HTTPS domenlar, shared sirlar, Redis/S3, rasmiy OTP va har sanatoriyaning
  direct merchant checkout/webhook/push/bank qabuli qolgan.
  O‘rnatish tartibi [RAILWAY.md](RAILWAY.md)da. To‘liq Playwright va real
  merchant/payment return qabul sinovi bu ishda qayta bajarilmadi.

## 2026-10-08 Hisobchini tasdiqlashdagi 403

- Lokal API `CORS_ORIGINS` faqat `localhost:3000/3001`ni qamragani uchun
  `127.0.0.1:3000` orqali yuborilgan tasdiqlash `CSRF_INVALID`/403 va
  «Sahifani yangilab qayta urinib ko‘ring» xabari bilan rad etildi.
  Aynan foydalanuvchining kutilayotgan hisobchisida xato qayta tasdiqlandi.
- `.env.example` va private lokal `.env`ga ikkala panelning
  `127.0.0.1` variantlari qo‘shildi; API qayta ochildi. Superadminning
  sayt `/api` proksisi orqali tasdig‘i **201** qaytardi: hisobchi
  `PENDING_APPROVAL`, versiya **1**dan `ACTIVE`, versiya **2**ga o‘tdi.
  Hisob/parol va rol vakolatlari mavjud tartib bo‘yicha saqlanadi.
- Shu oqimda noto‘g‘ri token, yo‘q token va sozlanmagan `3002` porti
  **403** bilan rad etildi. `localhost:3000`dagi haqiqiy token bilan
  faoliyat so‘rovi **201**. CSRF tekshiruvi o‘chirilmagan.
- `npm test`: alohida `sihhat_test` bazasida **88/88**, xato/skipped **0**.
  Hisobchi tasdig‘i, birinchi parol, qat’iy hisobot vakolatlari, tenant
  chegarasi, eksport va bloklash bo‘yicha **6** ssenariy ham o‘tdi.
  Providerlar test adapterlari; bu production yoki merchant qabuli emas.
- Private dalillar `.local/accountant-origin-before.json` va
  `.local/accountant-origin-after.json`da. Lokal `.env` va hisobga oid
  fayllar Gitga kiritilmaydi. Foydalanish tartibi [RUNBOOK.md](RUNBOOK.md)da.

## 2026-10-07 To‘liq lokal qayta ishga tushirish

- PostgreSQL oldingi uzilgan ishidan tiklanib, ulanishlarni qabul qildi.
  `db:local` endi `pg_isready` bilan tayyorlikni 10 daqiqagacha kutadi;
  bazalarni tekshirish shu bosqichdan keyin boshlanadi. Kutish muddati
  tugasa tiklanayotgan server ishlashda qoladi. 11-migratsiya
  `202610070011_accountant_role` lokal `sihhat` bazasiga qo‘llandi.
- API buildi va ikkala Next.js panel buildi o‘tdi. `local:start` API,
  domen worker, Telegram worker, superadmin va hamkorlar panelini fon
  rejimida ochdi; beshta xizmatning barchasi `running`.
- API `/health/live`, `/health/ready`, public katalog va ikkala panel
  **HTTP 200** qaytardi. Saytlarning `/api` proksisi orqali superadmin
  MFA, Azimshifo direktor va resepshin loginlari **201**, joriy hisob/rol
  va sanatoriyalarni o‘qish **200**, logout **201**; bekor qilingan
  sessiyani qayta ishlatish **401**. Maxfiy qiymatlar chiqarilmadi.
- Rasmiy Telegram `getMe`/`getWebhookInfo` tekshiruvi o‘tdi:
  `@sihhat_admins_bot`, polling, webhook yo‘q, pending update **0**.
  Yakuniy tekshiruvda so‘nggi polling **9 soniya**, domen worker heartbeat
  **0 soniya** oldingi edi. Egasi superadmini botga bog‘langan va bloklanmagan.
  Bu ulanish/faollik dalili; xodimning chatdagi barcha amallari qabul sinovi
  alohida tekshiriladi.
- Joriy oddiy `lib/main.dart` **debug** APK Samsung SM-A165Fga o‘rnatilib
  ochildi. API `http://127.0.0.1:4000`, USB reverse va demo OTP UI tayyor.
  APKda **57** maxfiy qiymat bayt namunasi, moslik **0**.
  APK/private kirish fayllari Gitdan chiqarilgan; xizmatlar kompyuter
  va USB ulanishiga bog‘liq. O‘zgarishlar lokal saqlandi.
- Dalillar: `.local/runtime/startup-check-20261007.json` va
  `.local/releases/android-preview.json`. Bu lokal ishga tushirish
  tekshiruvi; real merchant to‘lovi yoki production deployment dalili emas.

## 2026-10-07 Offline bron va Azimshifo panel oqimi

- Bron ro‘yxati, barcha sahifalar, ochilmagan tafsilotlar va tasdiqlangan
  QR xavfsiz telefonda saqlanadi. Hisob/host chegarasi, logoutdan keyingi
  kechikkan javob, uzilgan sync va to‘lovsiz bronning 5 daqiqalik muddati
  qayta tekshirildi. Flutter analyzer xatosiz, **56/56** test; backend
  alohida `sihhat_test` bazasida **82/82**, xato/skipped **0**.
- Samsung SM-A165Fda ikki Android force-stopdan so‘ng yangi jarayonlarda
  sessiya va ikki xonali bron tiklandi. Yakuniy bosqichda barcha API
  so‘rovlari rad etilib, saqlangan bron/QR, katalog va to‘rtta profil rasmi
  ochildi. Wi-Fi/mobil internet o‘chirilmagan; bu haqiqiy qurilmadagi
  boshqariladigan offline transport sinovi. To‘lov lokal simulator,
  rasmiy provider yoki production qabuli emas. Telefonning avvalgi hisobi
  va sozlamalari private nusxadan qayta tiklandi. Dalil:
  `.local/android-recovery.json`.
- Qurilmada katalog rasmlari yangilanganda `setState` callbacki `Future`
  qaytarishi topildi va tuzatildi. Shu holatga widget regressiya testi
  qo‘shildi. Qurilma testi bosh sahifaning eski matni o‘rniga joriy
  `HomeScreen`ni kutadi.
- Lokal `sihhat` bazasida yetishmagan o‘ninchi sessiya migratsiyasi
  qo‘llandi; superadmin loginidagi `P2022`/HTTP 500 bartaraf etildi.
  API buildi va ikkala Next.js panel buildi o‘tdi.
- **Azimshifo** faqat lokal sinov ma’lumotlari bilan panel orqali yaratildi.
  Superadmin direktor tayinladi; direktor profil, 4 surat, private sinov
  hujjati, faol xona va tarif qo‘shib yubordi, resepshin taklif qildi.
  Superadmin resepshin va profilni tasdiqladi. Uchala rolning loginlari,
  xodimlarning birinchi kirishda parol almashtirishi va logoutlari o‘tdi.
  Qoralama/yuborilgan profil katalogda yo‘q, tasdiqlangan profil public
  katalog hamda direktor/resepshin panellarida bor; xususiy rekvizit va
  hujjatlar public javobga chiqmaydi. Bu lokal brauzer oqimi; oldingi
  to‘liq Playwright to‘plami ushbu sanada qayta bajarilmadi.
  Dalil: `.local/azimshifo-panel-check.json`,
  `.local/screenshots/azimshifo/`. Kirish ma’lumotlari faqat `.local`da,
  manba kodiga yoki Gitga kiritilmaydi.
- Oddiy `lib/main.dart` debug preview Samsungga qayta o‘rnatildi;
  API `http://127.0.0.1:4000`, USB reverse, lokal demo OTP flagi.
  SHA-256 `4bd86139a3b9dd4d4c718d9ff843d334de711b7d3e75d0c3db3ccf7e2f9ffef3`.
  APKda yangi hisoblarni ham qamrab olgan **57 maxfiy qiymat bayt namunasi**,
  moslik **0**; `npm run check:secrets`da **21 maxfiy qiymat**, moslik **0**.
  APK va private kirish/nusxa fayllari Gitdan chiqarilgan. Lokal sinov
  to‘lov rejimi tugagach asl `PAYMENT_MODE=tezcheck` qayta tiklandi va API
  shu sozlama bilan ochildi. O‘zgarishlar lokal saqlandi, GitHubga yuborilmadi.

## 2026-10-06 Internetsiz bronlar, 5 daqiqa, bot yordami va galereya

- Mijoz bronlari barcha sahifalari va ochilmagan tafsilotlari bilan xavfsiz
  xotirada saqlanadi. Hisob/API hosti tekshiriladi; offline restartda
  ro‘yxat, xona/mehmon, narx/sana va tasdiqlangan QR ochiladi. Logout va
  hisob almashtirish nusxani tozalaydi; kechikkan javob uni qayta yaratmaydi.
- To‘lovsiz HOLD/PAYMENT_PENDING bronlar yaratilganidan 5 daqiqada,
  CANCELLED/EXPIRED esa darhol mijoz tarixidan olinadi. Shu qoida offline
  nusxaga ham tegishli. Server holdi 5 daqiqagacha; to‘langan/refund qilingan,
  providerda pul olingan yozuvlar va xodim/moliya tarixi saqlanadi.
- Nashr qilingan faol profil abonent bo‘lmasa ham katalogda ko‘rinadi.
  Onlayn quote/bron abonent va to‘lov tayyorligini alohida talab qiladi.
  Lokal **Mirsaid** profili katalogda qayta ko‘rindi; uning ma’lumotlari
  almashtirilmadi. Qoralama/arxivlar ommaviy katalogga kirmaydi.
- Mijoz yordam xabari superadmin botiga matn va bevosita javob tugmasi
  bilan boradi. Botdagi tasdiqlangan javob ayni mijoz suhbatiga saqlanadi.
  Superadmin tanlagan sanatoriya umumiy murojaatlarni yashirmaydi. Android
  suhbatni 5 soniyada va resume paytida yangilaydi; vaqtinchalik xatoda
  ekrandagi suhbat qoladi. Backend testidagi Telegram tashqi transporti fake.
- Panel 4+ suratni bir tanlashda yuklaydi, jami 30 tagacha; bitta galereyada
  chap/o‘ng, sanog‘i, tartiblash va olib tashlash bor. Androidda surish ham
  ishlaydi. Chimyon va Zomin rasmiy saytlaridan 4 tadan surat standart media
  va moderatsiya oqimi bilan lokal profilga nashr qilindi; takroriy import
  qayta yuklamadi. [Surat manbalari](SANATORIUM_PHOTOS.md).
- `npm test`: **82/82**, xato/skipped **0**, alohida `sihhat_test` bazasida.
  `npm run mobile:check -- --format`: format o‘zgarishi **0**, analyzer
  xatosi **0**, **55/55**. TypeScript, API build va yangilangan OpenAPI o‘tdi.
  Sinovlar 101 bron/all-pages, offline tafsilot/QR, hisob/host/logout,
  5 daqiqa chegarasi, to‘rt surat, abonentsiz profil va bot javobini qamradi.
- Ikkala Next.js buildi o‘tdi. Alohida `sihhat_test` browser fixtureda
  anketa/rasmlar ssenariysi **1/1**: bir tanlashda 4 rasm, chap/o‘ng,
  tartibni serverga saqlash va olib tashlash. Dalillar
  `.local/screenshots/anketa-files.png` va `.local/web-test-redacted.log`da.
  Fixture haqiqiy providerlarni o‘chiradi; odatiy lokal bazani o‘zgartirmaydi.
  Bu safar butun brauzer to‘plami qayta bajarilmadi.

## 2026-10-06 Android: internetsiz katalog, profil va tariflar (oldingi tekshiruv)

- Katalog APKga qattiq yozilmagan: barcha server sahifalari yuklanadi va
  API hosti bo‘yicha saqlanadi. Oldin ochilmagan profillar, xona turlari,
  tariflar va public rasmlar ham oldindan olinadi. Rasmlar ilovaning
  doimiy fayl papkasida; katalogning yetti kunlik cheklovi olib tashlandi.
- Ochilish/resume, Android internet qaytishi va faol holatda har daqiqa
  yangilaydi. Bir vaqtda bitta sync, profil/rasm so‘rovlari ham birlashtiriladi.
  Barcha sahifalar olinmasa eski ro‘yxat saqlanadi. Muvaffaqiyatli sync yangi
  e’lonlarni qo‘shadi va chiqarilganlarini o‘chiradi; qidirish/filtr offline.
- Profil ismi va telefoni login, `/auth/me`, ism va telefon tahriridan keyin
  saqlanadi. Saqlangan hisob tarmoqni kutmasdan ochiladi, sessiya background
  tekshiriladi. Logout shaxsiy profil/AI roziligini tozalaydi; logoutdan
  keyin kelgan eski profil javobi shaxsiy nusxani qayta yaratmaydi.
  Ism tahriri dialogining controller hayoti yopilish animatsiyasiga moslandi.
- Sanatoriya profilida tariflar xona turi bo‘yicha guruhlanadi va tanlangan
  tarif bron shakliga o‘tadi. Xona turi tarif ro‘yxatini filtrlaydi. Sana/xona
  tanlash offline, **To‘lovga o‘tish** server quoteini oladi. Bolalar va
  qo‘shimcha xona sozlamalari yig‘ilgan; to‘lovda takroriy narx olib tashlandi,
  mehmon/xona tafsilotlari **Bron ma’lumotlari**ga yig‘ildi. Hold yangi quote
  va serverning amaldagi policy IDlarini talab qiladi.
- Chatdagi Gemini yozuvi va doimiy checkbox olib tashlandi; tashqi AI
  roziligi birinchi xabardan oldin alohida dialogda olinadi. Voz kechilganda
  hech qanday AI so‘rovi yuborilmaydi.
- `npm run mobile:check -- --format`: analyzer xatosi **0**, unit/widget
  **47/47**. Sinovlar 101 ta e’lon va barcha sahifalar, ochilmagan tariflar,
  restart/uzilish/yangilanish, API hosti va rasm fayllari, offline profil
  tahriri, logoutdan keyingi javob, xona turi/tarif/quote va AI roziligini qamradi.
  Test providerlari fake; rasmiy SMS/to‘lov qabuli yoki production deployment
  sifatida belgilanmaydi. Backend/web to‘plamlari bu o‘zgarishda qayta bajarilmadi.
- Yangi debug APK Samsung SM-A165Fga USB orqali o‘rnatildi. Lokal API
  ulanishini uzib, ilovani qayta ochganda saqlangan bosh sahifa va katalog
  telefonda ochildi. Qurilmaning mobil interneti o‘chirilmagan: bu API
  mavjud bo‘lmagan holat tekshiruvi. Qurilmadagi tarif/profil/to‘lov oqimi
  bu safar to‘liq qayta tekshirilmadi; ularning offline dalili yuqoridagi
  unit/widget sinovlaridir. Tekshiruvdan keyin lokal API aloqasi tiklandi.
  APK API manzili `http://127.0.0.1:4000`, build turi debug;
  SHA-256 `95df26d4d928c45364a0fbcbd845ee4309f4f7d8aa5bf221c9eeefe65745707c`.
  APKda 45 ta maxfiy qiymat bayt namunasi tekshirildi, moslik topilmadi;
  manba tekshiruvi ham o‘tdi. APK va qurilma dalillari `.local`da, Gitga kirmaydi.
- Foydalanish va qo‘lda tekshirish: [RUNBOOK.md](RUNBOOK.md),
  [Android README](../apps/mobile/README.md). Ilova yopiq bo‘lsa sync keyingi
  ochilishda; dastlabki telefon/SMS kirishi va katalog yuklash aloqa talab qiladi.

## 2026-10-06 GitHubga tayyorlangan o‘zgarishlar

- Android bosh sahifasi berilgan namunaga moslashtirildi; katalog, bron,
  AI va yordamga ulangan tezkor kartalar, kichik ekran/katta shrift mosligi,
  ikki bosqichli bron va takroriy yordam xabarini cheklash qo‘shildi.
  Bu oldingi tekshiruvda ikki soatdan eski to‘lovsiz bron yashirilgan edi;
  joriy qoida yuqoridagi **5 daqiqa**. Moliyaviy
  va xodim yozuvlari saqlanadi.
- HOME/POPUP reklama joylari, rasm, havola, chegirma va muddat tekshiriladi.
  Reklama admin tasdiqlagach bepul chiqadi. Bo‘sh yoki xato ro‘yxatda
  Android reklama blokiga joy ajratmaydi; ro‘yxat davriy yangilanadi.
- Panellarda sana/soat Toshkent vaqtiga moslashtirildi; anketa savollari,
  saqlangan javoblar va admin natijalari ko‘rinadi. Xodim/vazifa oluvchilari
  sanatoriya bo‘yicha filtrlanadi; xonalar va tariflar shakllari yangilandi.
- Superadminning 2 soat, direktor/resepsionning 4 soat faolsiz sessiyasi
  serverda rad etiladi. Background tekshiruv va token yangilanishi bu
  muddatni uzaytirmaydi. O‘ninchi migratsiya `Session.lastActivityAt`ni qo‘shadi.
  Bootstrap MFA ma’lumoti konsolga chiqarilmaydi, private faylga yoziladi.
- To‘qqizinchi migratsiya sanatoriyaning merchant ulanish metadata sini
  qo‘shadi. Bank/STIR, tenant va versiya tekshiriladi. Shaklni saqlash
  haqiqiy to‘lovni yoqmaydi; direct checkout hali `MERCHANT_NOT_READY`
  bilan to‘xtaydi. Tafsilotlar [MERCHANT_CONNECTIONS.md](MERCHANT_CONNECTIONS.md)da.
- Foydalanish tartibi [RUNBOOK.md](RUNBOOK.md), UI qamrovi va cheklovlar
  [UI_REVIEW.md](UI_REVIEW.md)da. Maxfiy fayllar, lokal hisoblar, baza/media
  zaxiralari, SDK/keshlar va build/APKlar Gitga kiritilmaydi.

GitHubga yuborish oldidan 2026-10-06 qayta tekshiruv:

| Tekshiruv | Natija |
| --- | --- |
| `npm run build:api` | Prisma Client va API TypeScript buildi o‘tdi |
| `npm run build:web` | Superadmin va hamkorlar Next.js buildlari o‘tdi |
| `npm run check` | API, ikkala web, API client va UI TypeScript tekshiruvi o‘tdi |
| `npm test` | Alohida `sihhat_test` bazasida **79/79**, xato/skipped **0** |
| `npm run mobile:check` | Formatda o‘zgarish **0**, analyzer xatosi **0**, **38/38** test |
| `npm run db:migrations:verify -w @sihhat/api` | Toza lokal bazada **10 migratsiya**, xona exclusion cheklovi va **4 ledger guard** tekshirildi |
| `npm run openapi` | `docs/openapi.json` joriy endpoint va sxemalarga mos qayta yaratildi |
| `npm run check:secrets` | Gitga yuboriladigan fayllarda maxfiy qiymat mosligi **0** |

Lokal PostgreSQL qayta ishga tushirilgandan keyin backend va migratsiya
tekshiruvlari bajarildi. Brauzerning avvalgi **11/11** dalili saqlanadi;
Playwright to‘plami va haqiqiy qurilma sinovi bu sanada qayta bajarilmadi.
Bu lokal tekshiruvlar; haqiqiy provider qabul sinovi yoki production
deploymenti bajarilgani deb hisoblanmaydi.

## 2026-10-05 Barcha lokal xizmatlarni ishga tushirish

- `local:start`, `local:status` va `local:stop` Telegram workerini ham
  boshqaradi. Rejim backend konfiguratsiyasidan o‘qiladi; disabled bot
  ochilmaydi. Yoqilgan bot uchun autentifikatsiya va rejim tekshiruvidan
  keyingi tayyorlik yozuvi kutiladi. Mavjud PID/yaratilish vaqti/workspace
  tekshiruvi botga ham qo‘llanadi; maxfiy qiymatlar chiqarilmaydi.
- Lokal PostgreSQL, compiled API, domen worker, Telegram worker va ikkala
  web panel ishga tushirildi. API readiness, superadmin va hamkorlar
  sahifalari **HTTP 200** qaytardi; `local:status` beshta xizmatni `running`
  ko‘rsatdi. Takroriy `local:start`dan keyin barcha beshta PID va jarayon
  yaratilish vaqti o‘zgarmadi.
- Ishlayotgan saytlarning `/api` proksisi orqali superadmin, direktor va
  resepshn kirishi **HTTP 201**, sessiya/tegishli faol rol tekshiruvi va
  sanatoriya yoki bron ma’lumotini o‘qish **HTTP 200** bilan o‘tdi.
  Har hisobdan chiqishdan keyin o‘sha sessiya **HTTP 401** qaytardi.
  Bu HTTP tekshiruvi; oldingi brauzer to‘plami bu sanada qayta bajarilmadi.
- `telegram:check` rasmiy Telegram API orqali **connected=true**, bot
  **@sihhat_admins_bot**, **webhook_configured=false**, oxirgi tekshiruvda
  **pending_updates=0** qaytardi. Polling worker tayyor va ishlashda qoldi.
  Xodimning Telegramdan Start → saytda bog‘lashni tasdiqlash oqimi ushbu
  ishga tushirish tekshiruviga kirmaydi.
- 2026-10-04 yig‘ilgan `.local/releases/sihhat-uz-preview.apk` USBdagi
  Samsung SM-A165Fga `install -r` bilan **Success** qayta o‘rnatildi;
  Android launch **Status: ok**, ilova PIDi va `tcp:4000` USB reverse
  tekshirildi. Qurilma ekranida ilovaning autentifikatsiyalangan bosh
  sahifasi ko‘rindi. Build/API o‘zgarmadi: debug,
  `http://127.0.0.1:4000`, lokal demo OTP. APK ichidagi **45 maxfiy qiymat
  bayt namunasi**, moslik **0**.
- Dalillar `.local/runtime/startup-verification.json`,
  `startup-idempotency.json` va `mobile-running.png`da; loglar ham shu
  lokal papkada. APK, hisoblar, sirlar va qurilma dalillari Gitga kirmaydi.
  Bu lokal ishga tushirish; HTTPS production deploymenti, haqiqiy
  merchant to‘lovi yoki rasmiy provider qabul sinovi bajarilmadi.

## 2026-10-04 AI suhbat, bron tilagi va Tezcheck diagnostikasi

- Salomlashuv va minnatdorchilik lokal javob oladi. Yordamchi hudud,
  kunlik so‘mdagi byudjet, safar va sharoitlarni bittadan so‘raydi; salom
  bilan birga yozilgan talablar ham saqlanadi. Lotin/kirill salomi va
  `500 ming`, `1,5 mln`, `10-oktabr`, `7 kun` kabi shakllar taniladi.
- API `history`da oxirgi 12 ta user/assistant xabarini qabul qiladi;
  har biri ko‘pi bilan 1000 belgi. Tanlov faqat user xabarlaridan olinadi.
  Android xato javoblarini tarixga yubormaydi. Tarix ekranning xotirasida;
  Gemini rozilik bilan ajratilgan tanlovlar va joriy savolni oladi.
  Shaxsiy raqam/email niqobi, tibbiy chegara va qat’iy katalog IDlari saqlandi.
- Katalog variantlari tanlangan hudud, mavjud sharoitlar va boshlang‘ich
  tarif bo‘yicha filtrlanadi. Yakuniy narx va bo‘sh joy bron hisobida olinadi.
  Salom, qo‘shimcha savol va rahmat javoblari provider sarfiga yozilmaydi.
- Androidda `CONFIRMED` bron uchun **Yaxshi dam oling! Safaringiz yoqimli
  va xotirjam o‘tsin** kartasi qo‘shildi. HOLD/PAYMENT_PENDINGdan tasdiqqa
  o‘tish, takroriy refresh va PAYMENT_EXCEPTIONga o‘tish widgetda tekshirildi.
- `npm test`: haqiqiy lokal PostgreSQLning `sihhat_test` bazasida **62/62 pass**.
  `npm run mobile:check -- --format`: analyzer xatosiz, **30/30 unit/widget pass**.
  `npm run check`, `npm run build:api` va `npm run openapi` o‘tdi.
  Brauzerning 11/11 dalili shu kundagi anketa tuzatish runiga tegishli.
- Tezcheck webhookning uchta majburiy sarlavhasi, jumladan imzo, OpenAPIda
  aniq berildi. So‘nggi `npm run test:contract -w @sihhat/api` **1/1 pass**;
  qayta ochilgan compiled API `/openapi.json`i manba eksporti bilan mos.
  `npm run check:secrets` manbada maxfiy qiymat topmadi.
- AI suhbat va bron tilagi qo‘shilgan oddiy `lib/main.dart` arm64 debug APK
  USBdagi Samsung SM-A165Fga o‘rnatildi. API `http://127.0.0.1:4000`,
  lokal demo OTP flagi yoqilgan. **45 maxfiy qiymat bayt namunasi**, moslik **0**.
  SHA-256: `7a9a28ce43f80ffbdbe337701b8756123beffd26af92df49c2d11e1892d21b3c`.
  Artefakt `.local/releases/sihhat-uz-preview.apk`da; Gitga kiritilmaydi.
  Bu lokal debug sinovi, rasmiy provider yoki production qabuli emas.
- `npm run tezcheck:check` 2026-10-04 19:26 (Toshkent)da haqiqiy read APIga
  muvaffaqiyatli ulandi: autentifikatsiya va imzo to‘g‘ri, bitta tanlangan
  UZS kassa, `state=draft`, `accepts_payments=false`; Click, Payme va
  Uzcard/Humo ro‘yxatda, tranzaksiya namunasi 0, balans endpointi ishladi.
  Konfiguratsiya `PAYMENT_MODE=tezcheck`; API/kassa rekvizitlari bor,
  webhook siri sozlanmagan. Hisob/to‘lov yaratilmadi va kassa holati
  o‘zgartirilmadi. Faollashtirish va ommaviy HTTPS webhook alohida qoladi;
  polling webhookdan mustaqil ishlaydi. Tafsilot [TEZCHECK.md](TEZCHECK.md)da.

## 2026-10-04 Anketa, jamoa va Android bosh sahifa tuzatishlari

- `Apk xatolari`dagi oltita screenshot ko‘rib chiqildi. Bank holati uchun
  tekshiruvchi platforma superadmini ekani yozildi; STIR jadvalga qo‘shildi,
  kutilayotgan rekvizit uchun alohida tasdiqlash oynasi bor. Direktor bank
  tasdig‘ini bera olmaydi. Haqiqiy sanatoriya rekviziti avtomatik tasdiqlanmadi.
- Anketada 24 ta sharoit va 16 ta xizmat belgilash ro‘yxatiga aylantirildi.
  Rasmiy Chinobod, Humson Buloq va Uzbekistan Travel manbalari runbookda.
  Tanlovlar bo‘sh boshlanadi; oldin yozilgan maxsus qiymatlar ko‘rinadi.
  Belgilar xizmatning tarifga kirishini anglatmaydi.
- Qoralama tugallanmagan matnlarni saqlaydi; alohida PATCH sharoit, xizmat
  va ovqatlanish qiymatlarini yo‘qotmaydi. Koordinatani tozalash mumkin.
  Tekshiruvga yuborish baribir to‘liq profil, rasm/hujjat, faol xona, tarif
  va xizmat shartlarini talab qiladi; xatolar maydon nomi bilan o‘zbekcha.
- Anketa progressi haqiqiy validatsiyaga asoslanadi. Oxirgi saqlash oxirgi
  tahrirning serverga yozilishini kutib, rasmlar va hujjatlarga o‘tadi;
  xatoda shu sahifa va qiymatlar qoladi. Boshqa tahrir bilan version konflikti
  bo‘lsa, oxirgi server versiyasini ochish tugmasi mavjud.
- Ruxsatlar alohida switchlar bilan boshqariladi; mavjud admin taqiqi,
  direktor vakolat chegarasi va server tekshiruvi saqlandi. Xodimlar filtri
  `sanatorium_id`ni serverga yuboradi, sahifa va umumiy son shu sanatoriya
  bo‘yicha hisoblanadi. OpenAPI yangilandi.
- Android sarlavhasi **Sihhat uz**. Katta banner, takroriy statistikalar va
  bron bo‘yicha qo‘llanma olib tashlandi. Solishtirish tanlovi talab bo‘lganda
  ochiladi, bitta sahifalik pagination ko‘rsatilmaydi. Bitta reklama,
  dastlabki ikki yangilik; qolgan yangilik va tavsiyalar yig‘iladigan bo‘limda.
- `npm test`: PostgreSQLdagi **60/60 pass**. Yangi testlar filtr/pagination
  va tenant chegarasi, to‘liq missing-field ro‘yxati, chala qoralama va
  mavjud qiymatlar saqlanishi, qo‘lda bank tasdig‘ini qamradi.
- `npm run mobile:check -- --format`: format va analyzer xatosiz,
  **28/28 unit/widget pass**. Qidiruv, filtr, login/tiklanish, kichik ekran
  va katta shrift, solishtirish rejimi hamda yig‘iladigan tavsiyalar tekshirildi.
- Yakuniy `npm run check` o‘tdi. Mavjud API va ikkala web buildi bilan
  Playwright brauzer to‘plami **11/11 pass** (3,3 daqiqa): sanatoriya filtri,
  ruxsatlarni o‘chirish/qayta berish, yetishmagan maydonlar, bankning qo‘lda
  tasdig‘i, checkboxlar, saqlash xatosida qiymatlarni saqlash va parallel
  tahrirdan keyin oxirgi qiymatni yozib rasmlarga o‘tish tekshirildi.
  Bron/kalendar, e’lonlar, Tezcheck holati va Telegramdagi avvalgi ssenariylar
  ham o‘tdi. To‘plamda lokal API va ayrim simulyatsiya qilingan xato/bot
  javoblari ishlatiladi; bu rasmiy provider yoki production qabuli emas.
  Hisobot `.local/playwright-report/index.html`, niqoblangan log
  `.local/web-test-redacted.log`da; ular Gitga kiritilmaydi.
- Oddiy `lib/main.dart` arm64 debug APK USBdagi Samsung SM-A165Fga qayta
  o‘rnatildi. API `http://127.0.0.1:4000`, lokal demo OTP flagi yoqilgan.
  **45 maxfiy qiymat bayt namunasi**, moslik **0**. SHA-256:
  `7fa4174fe20e2b922b910bec0837c2831279e93e89cd62d0fad902424e51783b`.
  Artefakt `.local/releases/sihhat-uz-preview.apk`da; APK va dalillar Gitga
  kiritilmaydi. Bu lokal debug natijasi, production/provider qabuli emas.

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
- Mavjud uchta reja hujjati saqlangan; ishlatilmagan root `codex` npm paketi
  2026-10-08 olib tashlandi, Railway SDK lockfilega qo‘shildi.

## Ochiq tashqi shartlar

Gemini, Eskiz va Tezcheck hisoblari berildi, yuqoridagi ulanishlar tekshirildi. 2026-10-13 Hostra HTTPS deployi, PostgreSQL/Redis va private persistent media ishga tushirildi; login/MFA va ommaviy API tekshirildi. 2026-10-08 Tezcheck kassasi active/accepts_payments=true; haqiqiy direct merchant checkout va webhook siri/qabuli kerak. Eskiz OTP matnini tasdiqlatish va haqiqiy kod yuborish sinovi qolgan; SMS OTP yopiq. Real sanatoriya, bank rekvizitlari, push, mustaqil zaxira/tiklash mashqi va Androidning HTTPS signed release sinovi kerak; Payme bevosita adapteri tanlansa rasmiy merchant rekvizitlari ham talab qilinadi. Haqiqiy pul amallari bajarilmagan. Tariflar va refund/payout qoidalari pilot uchun tasdiqlanishi kerak.

## Qolgan ishlar

1. Har sanatoriyaning direct merchant ulanishi va haqiqiy to‘lov/HTTPS webhookni tekshirish; Eskiz OTPni tasdiqlatish va Hostra zaxira/tiklash tartibini tekshirish. Android release APKni `https://sihhat-mirsaid2028.wwwz.uz/api` bilan qayta yig‘ish, provider payment return va telefonni to‘liq qayta yuklashdan tiklanishni tekshirish.
2. Eskiz hisobini test rejimidan chiqarish va OTP matnini tasdiqlatish; shundan keyin haqiqiy kirish kodi sinovi. OTPdan tashqari SMS bildirishnoma adapteri ham qolgan.
3. Ayrim ikkinchi darajali OpenAPI javoblarini aniqlashtirish; Redis/S3, tanlangan to‘lov provayderi va push muhitlarini stagingda tekshirish. AI token/model/davr va sozlangan narxli USD hisoboti amalga oshirildi; haqiqiy provider invoiceini solishtirish pilotda qolgan.
4. Real sanatoriya bilan inventar, bank payout/refund va backup/media tiklash pilotini bajarish.
