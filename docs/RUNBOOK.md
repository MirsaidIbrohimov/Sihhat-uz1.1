# Sihhat uz — ishga tushirish va xizmat ko‘rsatish

Buyruqlar loyiha ildizidan bajariladi. Tekshiruvlarning haqiqiy natijasi [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)da, talablar [arxitektura](SIHHAT_UZ_ARXITEKTURA.md)da.

## 1. Lokal muhit

Node.js 24.15+, npm, PostgreSQL 18; Android uchun Flutter va Android SDK kerak. `npm ci` lockfiledagi dependencylarni o‘rnatadi.

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:generate
npm run db:seed
```

`db:local` `.local/postgres` klasterini `127.0.0.1:55432`da ishga tushiradi va `sihhat`, `sihhat_test` bazalarini yaratadi. Bu loopback demo klasteri; production konfiguratsiyasi alohida boshqariladi. `apps/api/.env` mavjud bo‘lsa, qayta yozilmaydi. `AUTH_SECRET` va `MFA_ENCRYPTION_KEY` tasodifiy yaratiladi. Ular logga chiqarilmaydi.

PostgreSQL boshqa joyda bo‘lsa:

```powershell
$env:SIHHAT_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run db:local
```

Lokal seed ikki sanatoriya, direktor, faol/pending resepsion, xonalar, tariflar va demo e’lonlarni yaratadi. `.local/dev-access.json`dagi parollar va MFA secretni faqat lokal namoyishda ishlating. Seed mavjud demo ma’lumotlarni o‘chirmaydi.

API va worker alohida jarayon:

```powershell
npm run dev:api
```

```powershell
npm run dev:worker
```

Web terminallari: `npm run dev:admin` va `npm run dev:partner`. API tayyorligini `http://127.0.0.1:4000/health/ready` orqali tekshiring; `/health/live` faqat jarayon tirikligini ko‘rsatadi. `/docs` — Swagger, `/openapi.json` — ishlayotgan server shartnomasi.

`SIHHAT_API_URL` saytlarning backend manzilini belgilaydi; standart qiymati `http://127.0.0.1:4000`. Brauzer APIga saytning `/api` yo‘li orqali ulanadi.

## 2. Build va migratsiyalar

```powershell
npm run build:api
npm run build:web
npm run check
```

Tayyor buildlar:

```powershell
npm run start -w @sihhat/api
npm run start:worker -w @sihhat/api
npm run start -w @sihhat/superadmin-web
npm run start -w @sihhat/partner-web
```

Har buyruq alohida terminalda ishlaydi. API — 4000, superadmin — 3000, hamkorlar — 3001.

`npm run db:migrate` `apps/api/prisma/migrations`dagi ketma-ket migratsiyalarni qo‘llaydi. Mavjud migration fayllarini o‘zgartirish o‘rniga yangi migratsiya qo‘shing. Xona allocationidagi PostgreSQL exclusion cheklovi parallel bronlarning to‘qnashishini oldini oladi; uni oddiy Prisma schema almashtirishi bilan olib tashlamang.

Production yangilanishi oldidan DB zaxirasini oling, migratsiyalarni stagingda tekshiring, migratsiyani bir jarayonda qo‘llang, so‘ng API va workerning yangi buildlarini ishga tushiring. `/health/ready`, login va oddiy quote so‘rovini tekshiring. Migration xatosida uni avtomatik «bajarildi» deb belgilamang; sababni aniqlab, oldinga tuzatuvchi migratsiya yoki tekshirilgan tiklash rejasi bilan ishlang.

## 3. Qabul tekshiruvlari

```powershell
npm run test
npm run db:migrations:verify -w @sihhat/api
npm run openapi
npm run test:web
```

`TEST_DATABASE_URL`ning baza nomi aynan `sihhat_test` bo‘lishi shart. Backend testlari shu bazadagi jadvallarni tozalaydi; ilovaning `sihhat` bazasini ishlatmaydi. Testlar PostgreSQLdagi haqiqiy transactionlar, ruxsatlar, bron, ledger, refund/payout va worker oqimlarini tekshiradi.

`db:migrations:verify` faqat lokal, non-production PostgreSQLda yangi `sihhat_migration_check_*` bazasini yaratadi. U migratsiya tarixi, xona exclusion cheklovi va ledger triggerlarini tekshiradi; mavjud ilova bazalarini o‘zgartirmaydi. Yaratilgan baza tekshiruv dalili sifatida saqlanadi.

OpenAPI eksporti `docs/openapi.json`ga yoziladi. Auth, request body, query/path parametrlari va JSON/CSV/media javoblarini implementatsiya bilan birga tekshiring. HTTP moliyaviy buyruqlarida `Idempotency-Key`; staff cookie sessiyalarida `X-CSRF-Token` talab qilinadi. Android Bearer token ishlatadi. Pul qiymatlari tiyin birligidagi string sifatida beriladi.

Web testlari uchun API va lokal seed tayyor bo‘lishi kerak. Playwright oldindan build qilingan saytlarni ishga tushiradi. Hisobot: `.local/playwright-report/index.html`. Skrinshotlar: `.local/screenshots`; xato trace va natijalar: `.local/playwright-results`.

Android unit/widget va haqiqiy qurilmadagi OTP → bron → to‘lov → sessiyani tiklash sinovi [mobile README](../apps/mobile/README.md)da. Test bridge faqat lokal demo muhit uchun, `127.0.0.1:4001`da ishlaydi. Testdan keyin oddiy APKni `lib/main.dart` entrypointi bilan qayta build qiling: integratsion sinov APKsi foydalanuvchiga beriladigan ilova emas.

`npm run mobile:check` analyzer va unit/widget testlarni bajaradi.
`npm run mobile:test:recovery -- <serial>` test bridgeni o‘zi ishga tushiradi,
bir APKni ikki marta Android `force-stop` orqali yopib, secure storage va
serverdagi to‘lov holatini uch yangi jarayonda tekshiradi. Skript oddiy debug
APKni oxirida avtomatik qayta o‘rnatadi; natija `.local/android-recovery.json`da.

Release uchun `npm run mobile:signing:init`, keyin
`npm run mobile:release -- https://sizning-api-manzilingiz.uz` ishlatiladi.
Mavjud kalit ustidan yozilmaydi. Kalit va parolli `key.properties` fayllari
`.local/android-signing`da; ularning maxfiy zaxirasini alohida saqlang.
APK `.local/releases/sihhat-uz-release.apk`ga, imzo/manifest dalili va SHA-256
`.local/releases/android-release.json`ga yoziladi. Haqiqiy server berilmaganda
`https://api.sihhat.invalid` faqat release build uchun vaqtinchalik namuna
bo‘ladi; bunday APK serverga ulanmaydi. Lokal HTTP API uchun debug APK kerak.

## 4. Worker va kuzatuv

Lokal worker `WORKER_MODE=database` bilan DB outboxini qayta ishlaydi. Productionda `WORKER_MODE=redis` va `REDIS_URL` kerak. Worker API bilan bir xil DB va adapter konfiguratsiyasini ishlatishi shart.

Worker hold muddatlarini, provider timeoutlarini, billingni va bildirishnomalarni boshqaradi. Commit qilingan outbox voqealari DBda saqlanadi; qayta ishga tushishda tugallanmagan voqealar qayta olinadi. Push adapteri xatolarida delivery `PENDING` holatida qoladi.

Kuzatiladigan belgilar: API readiness, worker jarayoni, `OutboxEvent`dagi `processedAt` bo‘sh voqealar yoshi va `lastError`, `NotificationDelivery`dagi uzoq kutilayotgan deliverylar, payment exceptionlar hamda reconciliation tafovutlari. API loglari request ID, yo‘l, HTTP holati va vaqtni beradi; token/parol yoki provayder kalitlarini loglamang.

Worker xatosida avval DB, Redis va HTTP adapter ulanishlarini tekshiring, keyin worker jarayonini qayta ishga tushiring. Moliyaviy holatlarni bazada qo‘lda almashtirish o‘rniga API oqimi va provider/bank tasdig‘idan foydalaning.

## 5. Zaxira va tiklash

```powershell
npm run backup:verify
```

Bu lokal skript `sihhat`dan `pg_dump -Fc` oladi, `.local/backups`ga arxiv va SHA256 yozadi, alohida `sihhat_restore_test` bazasiga tiklaydi. U faqat tiklash sinovi bazasini yangilaydi. Har public jadvalning satr soni va schema solishtiriladi.

DB arxivi rasmlar/hujjatlar fayllarini qamramaydi. Lokal `.local/uploads`, production S3 obyektlari va sirlar uchun alohida zaxira/tiklash tartibi kerak. Production backupni shu lokal skriptga tayangan holda bajarildi deb hisoblamang: alohida host, retention, media nusxasi va tiklash mashqi tekshirilishi kerak.

## 6. Tashqi xizmatlar va pilot

| Xizmat | Konfiguratsiya | Alohida qabul dalili |
| --- | --- | --- |
| Eskiz SMS | `SMS_ADAPTER=eskiz`, API email/password yoki token, sender/template, `ESKIZ_OTP_APPROVED` | Standart test SMSi yetib keldi; haqiqiy OTP uchun hisob faollashishi va matn tasdig‘i zarur |
| Payme | `PAYMENT_MODE=payme`, merchant ID/key, checkout URL | Rasmiy sandboxda create/perform/cancel/check va takroriy callback |
| S3 | `STORAGE_ADAPTER=s3`, endpoint/region/bucket, access/secret key | Private fayl ruxsati, signed URL va media tiklash |
| Redis | `WORKER_MODE=redis`, `REDIS_URL` | Worker restart/retry va delivery saqlanishi |
| Push | `PUSH_ADAPTER=http`, URL/token | Haqiqiy qurilmaga yuborish va xatodan qayta urinish |
| Gemini AI | `AI_ADAPTER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Haqiqiy javob, public katalog/FAQ, rozilik, niqoblash, limit va fallback tekshirildi |

SMS/push HTTP adapterlari muqobil umumiy integratsiya chegaralari. AI katalog fallbacki Gemini ishlamasa, rozilik bo‘lmasa yoki limit tugasa mavjud. Rasmiy provider testlari va haqiqiy pul amallari lokal simulator natijasidan alohida qayd qilinadi.

### Maxfiy sozlamalar

Lokal provider ma’lumotlari `.local/secrets/providers.env`da. API workspace
shu faylni avtomatik o‘qiydi; boshqa joy uchun `SIHHAT_SECRETS_FILE`ni aniq
yo‘l bilan belgilang. Server environment qiymatlari fayldan ustun. Testlar
haqiqiy provider sirlarini yuklamaydi va pullik SMS/AI so‘rovi yubormaydi.
Kalit/parollar, kabinet ma’lumotlari va signing kalitlari Gitga kiritilmaydi.

Gemini: `AI_ADAPTER=gemini`, kalit va model. Default
`AI_DAILY_REQUEST_LIMIT=100`, `AI_MAX_OUTPUT_TOKENS=768`. Model faqat public
katalog va FAQ identifikatorlarini tanlaydi; token hisoblari `AiUsage`da,
promptlar esa saqlanmaydi. `share_with_provider=true` roziligisiz tashqi AI
so‘rovi yuborilmaydi; tibbiy savol va provider xatosi fallback qaytaradi.

Eskiz: SMS shlyuz API paroli asosiy kabinet parolidan farq qiladi.
`ESKIZ_EMAIL`/`ESKIZ_PASSWORD` yoki `ESKIZ_TOKEN`, `ESKIZ_SENDER=4546` va
`ESKIZ_OTP_TEMPLATE`ni sozlang. Matnda `{code}` bo‘lishi shart. Kabinetga
moderatsiya uchun asl matnni namunaviy olti raqamli kod bilan kiriting;
loyiha nomi va kirish maqsadi ko‘rsatiladi. Hisob haqiqiy yuborishga tayyor
va aynan shu matn tasdiqlanganidan keyin `SMS_ADAPTER=eskiz`,
`ESKIZ_OTP_APPROVED=true` qo‘yiladi. Tayyor bo‘lmaganda Eskiz adapteri
`SMS_NOT_READY` qaytaradi; standart test SMSini OTP o‘rnida yubormaydi.
Production lokal SMS adapterini va tasdiqlanmagan Eskiz sozlamasini rad etadi.

2026-10-02: Gemini va Eskiz autentifikatsiyasi ishlaydi, standart Eskiz SMSi
yetib keldi. Eskiz OTP shabloni tasdiqlanmagan; development adapteri lokal.

### Bosh sahifa maqolalari

Superadminning `Yangilik va tavsiyalar` sahifasi `NEWS`/`TIP` maqolalarini
qoralama, e’lon va arxiv holatlarida boshqaradi. `/catalog/home` va
`/catalog/news/:id` faqat e’lon qilingan ma’lumotlarni qaytaradi. Android
public feedni login tugashidan oldin ko‘rsatadi; kesh 7 kun va API hostiga
bog‘langan. Saqlangan narx/mavjudlik yakuniy bron hisobi sifatida ishlatilmaydi.

`NODE_ENV=production` real SMS, Payme merchant, S3, Redis va HTTPS originlarni talab qiladi; lokal payment-confirm endpointi yopiladi. Production superadminini demo seed orqali yaratmang. `BOOTSTRAP_LOGIN` va `BOOTSTRAP_PASSWORD`ni secret muhitida berib, `npm run bootstrap -w @sihhat/api`dan foydalaning; bir martalik MFA ulash URI maxfiy saqlanadi.

`infra/docker/compose.yaml` PostgreSQL/Redis/MinIO uchun local muqobil muhit. Unda test DB va S3 bucketni alohida tayyorlash, `.env`ning DB URL/portlarini moslash kerak; ishlatilmagan Compose muhiti tekshirilgan deb belgilanmaydi.

Real pilot uchun sanatoriya xona inventari, SMS/merchant rekvizitlari, refund/payout qoidalari va tariflar kerak. Pilot oqimi: e’lon tasdiqlash → quote/hold → provider to‘lovi → kelish/ketish → bank tasdig‘i bilan payout; muqobil oqim cancellation/refund. Release APK signing va payment return ham haqiqiy qurilmada tekshiriladi.
