# Hostra'ga joylash

Amaldagi hosting tanlovi — [Hostra](https://hostrauz.shop/dashboard).

Asosiy jonli panel manzillari (2026-10-14):
[superadmin](https://sihhat.uz/superadmin) va
[hamkorlar](https://sihhat.uz/hamkorlar). API base `https://sihhat.uz/api`.

2026-10-15: **`https://sihhat.uz/demo-api`** Android demo uchun alohida
ishga tushirildi. Versiya **0.1.1+2**,
[APK va kirish tartibi](../ilova/README.md). Demo kod ekranda chiqadi;
production `/api`da demo kirish yoqilmagan.

Demo uchun private PostgreSQL **16.15** klasteri
`/home/terminal/.sihhat/demo-postgres/data`da, TCP o‘chirilgan va socket
shu private papka ichida. Asosiy account database bilan ulashilmaydi.
Database `sihhat_demo`, API loopback `4100`, media `demo-media`; haqiqiy
provider kalitlari yo‘q. `sihhat-demo-db` va `sihhat-demo-api` PM2 orqali
qayta ochiladi. Runtime va ulanish rekvizitlari private `secrets`da;
ular public root yoki Gitga kiritilmaydi.

Release `20261015T075745Z-demo-e8e336c7aeee` yangi web buildlari bilan
faol; oldingi release saqlangan. Ichki staging/jonli yo‘llarda **17**,
tashqi HTTPS demo login/izolyatsiyada **16** tekshiruv o‘tdi. Asosiy API,
domen worker va Telegram PIDlari saqlandi. PM2 holati saqlangan.
Demo bazada 14 migratsiya va bitta aniq demo sanatoriya bor; haqiqiy
bron/to‘lov yoki SMS provider qabul natijasi hisoblanmaydi.

## Paket va kirish

`npm run hostra:package` joriy ishchi source fayllaridan tekshirilgan arxiv
tayyorlaydi. Oldin `check:secrets` bajariladi; faqat API, ikkala web panel,
umumiy paketlar, root npm fayllari va web start skripti olinadi. `.env`,
`.local`, Git tarixi, SDK/kesh, database/media zaxiralari, APK va lokal
buildlar arxivga kiritilmaydi. Fayllar ro'yxati arxiv yaratilgandan keyin
qayta tekshiriladi. Paket, SHA-256 va manifest `.local/hostra/releases`da;
eng oxirgi manifest `.local/hostra/latest-package.json`da saqlanadi.

Hostra panelida loyiha → **SSH** bo'limidan kirish tokeni olinadi.
Token uchun private fayl: `.local/secrets/hostra.env`, kalit nomi
`HOSTRA_SSH_TOKEN`. Uni Gitga yoki public web papkalariga kiritmang.
Private SSH helper pinned host keyni tekshiradi; ulanish tokeni va secret
stdin qiymatlarini konsolga chiqarmaydi. Kirishning yo'qligi deploy
bajarilganini anglatmaydi.

## Production talablari

- Node.js kamida **24.15.0**. `npm ci`, Prisma generation va buildlar
  hostingning o'z Linux muhitida bajariladi; Windowsdagi `node_modules`
  yoki build arxivi ko'chirilmaydi.
- `NODE_ENV=production`, `DEPLOYMENT_PLATFORM=hostra`; server uchun yangi
  `AUTH_SECRET` va `MFA_ENCRYPTION_KEY`. Lokal demo database va hisoblar
  ko'chirilmaydi. Birinchi superadmin production bootstrap bilan yaratiladi.
- Hostra PostgreSQL private socket varianti: `DATABASE_URL`dagi `host`
  aynan `/run/postgresql`, login va parol mavjud, database nomi account
  prefiksidan boshlanadi. Oddiy localhost TCP yoki boshqa socket yo'li
  productionda rad etiladi. Tashqi PostgreSQL ham qo'llanadi.
- Redis private socket uchun `WORKER_MODE=redis`,
  `REDIS_SOCKET_PATH=/run/redis/redis.sock`. Bu istisno faqat aniq Hostra
  platformasi bilan ishlaydi. Tashqi Redis/rediss ham qo'llanadi.
- Media uchun private S3 yoki aniq Hostra persistent disk yo'li ishlatiladi:
  `STORAGE_ADAPTER=local`, `STORAGE_PATH=/home/terminal/.sihhat/media`.
  Hostra tekshiruvida `/home/terminal` alohida yoziladigan XFS mount ekanligi
  aniqlandi. Media ildizi public site papkasidan tashqarida, 0700 rejimida;
  fayllar 0600 bilan yoziladi. Boshqa local yo'llar productionda rad etiladi.
  Database va media uchun alohida zaxira/tiklash tartibi kerak.
- Ikkala panelning buildida `SIHHAT_API_URL` tegishli API manziliga
  o'rnatiladi. Ommaviy kirish HTTPS; CORS va Telegram panel manzillari
  haqiqiy HTTPS originlariga mos bo'lishi kerak.
- Eskiz OTP matni tasdiqlanmagan bo'lsa, `SMS_ADAPTER=disabled` mobil OTP
  va telefon almashtirishni 503 bilan to'xtatadi. Demo kodlari productionda
  ochilmaydi. Xodimlarning parol/MFA orqali kirishi bundan alohida.
- Tezcheck/direct merchant rekvizitlari serverda saqlanadi. Haqiqiy pul
  operatsiyasi yoki provider qabul sinovi oddiy deploy tekshiruvi emas.

## Ishga tushirish va tekshirish

Serverdagi eski xizmatlar va database holati avval o'qib tekshiriladi.
Yangi source alohida release papkasiga yuklanadi; mavjud release, kalitlar,
database va media o'chirilmaydi. Mavjud production database bo'lsa,
migratsiyadan avval private zaxira va tiklash tartibi tekshiriladi.

Build va ishga tushirish buyruqlari:

```text
npm ci
npm run build:api
npm run build:web
npm run deploy:check
npm run db:migrate
npm run start:api
npm run start:worker
npm run start:admin
npm run start:partner
```

API/worker bir xil database va provider konfiguratsiyasini ishlatadi.
Telegram yoqilsa, polling faqat bitta serverda/bitta replikada ishlashi
kerak; lokal polling worker bilan parallel ishga tushirmang. Portlar,
hosting proksisi va avto-restart accountning haqiqiy holatiga qarab sozlanadi.

Tugallangan deploy dalili: ommaviy HTTPS orqali `/health/ready`, ikkala
login sahifasi, panel `/api` proksisi va katalog so'rovlari muvaffaqiyatli;
server jarayonlari ishlaydi. Admin login/MFA/cookie/CSRF ham tekshiriladi.
Private dalil `.local/hostra`da, maskalangan natija esa
[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)da saqlanadi.

## Asosiy domen va alohida panel yo'llari

`apps/partner-web` asosiy domenda `/superadmin` uchun admin rejimini,
`/hamkorlar` uchun hamkor rejimini ochadi. Har panelning menyu, brand,
query va ichki havolalari o'z prefiksini saqlaydi. Avvalgi alohida domenlar
root panel manzillari sifatida ham ishlaydi. Login sahifasi ochilishi
ma'lumot yoki amal uchun vakolat bermaydi: API global auth guard va
`@Roles('SUPERADMIN')` orqali har bir superadmin amalini serverda tekshiradi.
Hamkorlar uchun faol STAFF membershipi va tegishli tenant ruxsati kerak.

Superadmin parol va bir martalik telefon Authenticator kodi bilan kiradi.
Secure/HttpOnly cookie server sessiyasiga bog'langan; rol browser headeri
yoki URLdan olinmaydi. Cookie orqali o'zgartirishlarda haqiqiy CSRF token
va ruxsat etilgan Origin kerak. CORSga faqat `https://sihhat.uz` origini
qo'shiladi; panel yo'li Origin tarkibiga kirmaydi. `.local/hostra`dagi
kirish fayli shu yangi havolalarni ishlatadi, public hostingga yuborilmaydi.

2026-10-14 web release `20261014T101310Z-panel-paths-d11af516e1a8`:

- API auth/controller sourcelari lokal test qilingan 16 fayl bilan
  SHA-256 bo'yicha solishtirildi. Alohida release ichki `127.0.0.1:3101`da
  to'rtta panel/deep link, API readiness va soxta/anonim sessiya bilan
  tekshirildi; keyin current pointer atomik almashtirildi.
- Next'ni child process sifatida boshlaydigan web wrapperlar uchun PM2da
  aniq `exec_mode: 'fork'` ishlatiladi. `instances: 1`ning o'zi cluster
  rejimini yoqishi mumkin ([PM2 hujjati](https://pm2.keymetrics.io/docs/usage/cluster-mode/)).
  Mavjud cluster registration faqat tegishli web nomi bo'yicha olinib,
  port bo'shagandan keyin yangi cwd/script bilan qayta yaratiladi.
- Current pointer, runtime va to'liq PM2 snapshoti private zaxiralanadi.
  Readiness xatosida eski pointer/runtimega qaytish qo'llanadi; birinchi
  cluster urinishida shu qaytish muvaffaqiyatli o'tdi. Fork konfiguratsiyasi
  bilan keyingi faollashtirish yakunlandi. Domen/Telegram workerlari
  qayta boshlanmadi; API faqat yangi aniq CORS origini uchun reload qilindi.
- Ommaviy HTTPSda panel va ichki havolalar/readiness **200**; Chromiumda
  haqiqiy MFA login, admin roli/API, prefiks bilan reload, Secure/HttpOnly
  cookie, MFA'siz va takror kod bilan kirishni rad etish, noto'g'ri CSRF yoki
  begona Originni rad etish hamda logoutdan keyingi **401** tekshirildi.
  Hamkor paneli admin sessiyasi bilan dashboard ochmaydi.
- Lokal backend **111/111**, brauzer **8/8**, yo'l testlari **2/2** o'tdi.
  Direktor/mijoz sessiyasining barcha superadmin amallarida **403** olishi
  lokal test bazasida tekshirildi; productionda demo hisoblar yaratilmadi.
  Private dalillar: `panel-runtime-before.json`,
  `panel-paths-first-activation.json`, `panel-paths-activation.json`,
  `panel-paths-live.json`. Ular provider yoki real pul qabul sinovi emas.

Qayta tekshirish: `npm run check`, `npm run test:portal-routes`, `npm test`
va `npm run test:web -- test/web/panel-paths.spec.ts`; backend faqat
`sihhat_test`dan foydalanadi. Productionga yangi source ko'chirishdan oldin
`npm run check:secrets`ni bajaring. Shifrlangan sirlar, credentiallar va
PM2/runtime zaxiralari logga yoki Gitga chiqarilmaydi.

## 2026-10-13 jonli deploy

- [Admin](https://sihhat-admin-mirsaid2028.wwwz.uz),
  [hamkorlar](https://sihhat-mirsaid2028.wwwz.uz).
  API base: `https://sihhat-mirsaid2028.wwwz.uz/api`.
- Release: `20261013T143417Z-9763a12e208f`, **182 fayl**, **2 994 397 bayt**.
  Serverda arxiv SHA-256 tekshirildi:
  `385121cd8393740deabb9827d6294ba8c14e11031a6237afad4d283f4ff266f1`.
- Node **24.15.0**, `npm ci`, API va ikkala panel buildi, production
  preflight, **14 migratsiya** va production superadmin bootstrap o'tdi.
  Migratsiya oldidan bo'sh database private dumpi saqlandi. Demo seed
  va lokal database/media ko'chirilmadi.
- API ichki **4000**, hamkorlar **3001**, admin **3002** portida.
  Panellar `/api`ni ichki APIga proksi qiladi. Hosting HTTPS orqali chiqadi.
- Beshta PM2 xizmati: `sihhat-prod-api`, `sihhat-prod-worker`,
  `sihhat-prod-admin`, `sihhat-prod-partner`, `sihhat-prod-telegram`.
  PM2 state saqlandi, dump va loglar private rejimda.
- Telegram uchun dastlabki **192M** limit past bo'ldi; toza qayta
  registration bilan **384M** va **40000 ms** graceful stop qo'llandi.
  Yangilangan jarayonda kamida **97 soniya**, restart **0**, yangi stderr
  xabari **0**. `getMe`/`getWebhookInfo` 200, faol webhook yo'q.
- HTTPS orqali ikkala sahifa, `/api/health/ready` va katalog **200**.
  Admin login/MFA **201**, `me` **200**; Secure/HttpOnly cookie tekshirildi.
  CSRF tokensiz logout **403**, token bilan **201**, chiqishdan keyin `me`
  **401**. SMS OTP **503 / SMS_DISABLED**, SMS yuborilmadi.
- Lokal konfiguratsiya testlari **9/9**, TypeScript va barcha buildlar
  o'tdi. Oxirgi secret scan **445 fayl**, moslik **0**. GitHubga push yo'q.

Kirish va MFA ulash sahifasi `.local/hostra/HOSTRA_KIRISH.html`da;
rekvizitlarni public sahifaga yuklamang. Private dalillar shu papkada:
`server-build-status.json`, `server-activation-status.json`,
`runtime-checks.json`, `live-checks.json`, `bot-provider-checks.json`.

## Superadmin MFA kodi

`HOSTRA_KIRISH.html`ni Chrome yoki Edge'da oching. **Kirish uchun 6 raqamli
MFA kodi** asosiy sahifada ko'rinadi; **MFA kodini nusxalash** tugmasi faqat
shu raqamlarni oladi. Kod har 30 soniyada yangilanadi va bir marta ishlatiladi.
Telefon ilovasini ulash uchun harfli kalit alohida yopiq bo'limda turadi;
uni panelning MFA maydoniga kiritmang. Telefon va kompyuter vaqti avtomatik
bo'lsin. Hostra hisobi uchun shu fayldagi kalitni ulang.

Lokal private `owner-access.json`dan kirish sahifasini qayta yaratish:

```powershell
npm run hostra:access
```

Buyruq mavjud login/parol/MFA kalitidan foydalanadi; serverga yoki databasega
yozmaydi. Template va generator source fayllarida haqiqiy sirlar bo'lmaydi.
Yaratilgan HTML `.local/hostra`da qoladi va public hostingga yuborilmaydi.

2026-10-13 serverdagi shifrlangan MFA va parol private kirish fayliga mosligi
tekshirildi. Chrome'da kodning ko'rinishi, nusxalash/fallback, oltita vaqt
qadamidagi backend bilan mosligi va tashqi so'rov **0** tekshirildi.
Shu HTML yaratgan kod bilan haqiqiy HTTPS login **201**, `me` **200**,
takror kod **401 / MFA_INVALID**, logout **201**. Private dalillar:
`mfa-diagnostics.json`, `mfa-verification.json`.

Bu jonli hosting dalili. Eskiz OTP tasdig'i, haqiqiy merchant to'lovi/webhook,
real sanatoriya piloti, push, mustaqil zaxira/tiklash mashqi va Androidning
haqiqiy HTTPS API bilan signed release yig'ilishi alohida qoladi.
