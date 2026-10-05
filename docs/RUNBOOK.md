# Sihhat uz — ishga tushirish va xizmat ko‘rsatish

Buyruqlar loyiha ildizidan bajariladi. Tekshiruvlarning haqiqiy natijasi [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)da, talablar [arxitektura](SIHHAT_UZ_ARXITEKTURA.md)da.

## Logo va Android ko‘rinishi

Asl logo `assets/branding/sihhat-logo.jpg`da. `npm run brand:assets` uning
to‘liq tasviridan Flutter asseti, ikkala saytning public logosi/favikonlari
va Android launcher/splash rasmlarini qayta tayyorlaydi. So‘ng
`npm run build:web`, `npm run mobile:check` va zarur bo‘lsa
`npm run mobile:preview -- <serial>` bajariladi. Launcher yoki splash
o‘zgarsa APKni qayta o‘rnatish kerak.

Android 12+ uchun `sihhat_splash.png` alohida eksport qilinadi: 288dp
shaffof canvasda markaziy 128dp logo 192dp dumaloq chegaraga to‘liq sig‘adi.
O‘lchamlar barcha besh ekran zichligi uchun moslashtiriladi.
[Android splash talablari](https://developer.android.com/develop/ui/views/launch/splash-screen).

Android bosh sahifa/loginidagi **oy/quyosh tugmasi** va
**Profil → Ilova ko‘rinishi**dagi tugma har bosishda kunduzgi va tungi
rejimni almashtiradi; menyu ochilmaydi. Faqat ikki rejim bor.
Boshlang‘ich rejim kunduzgi. Tanlov `sihhat_appearance`
kaliti bilan qurilmaning xavfsiz xotirasida saqlanadi. Logout tanlovni
o‘chirmaydi. Eski `system`, buzilgan/bo‘sh qiymat yoki o‘qish xatosi bo‘lsa
kunduzgi rejim ishlatiladi; yozish xatosida oldingi tanlov qoladi va qayta
urinish taklif qilinadi. API, OTP va to‘lov holati bu tanlovdan mustaqil.

## Android login va lokal demo kodi

Ilova asosiy sahifalarni SMS orqali tasdiqlangan hisobdan so‘ng ochadi.
Saqlangan sessiya ochilishda tekshiriladi; 401 javobida refresh bajariladi,
bekor qilingan sessiya tozalanib login ko‘rsatiladi. Logout ochiq ichki
sahifalarni ham yopadi. Saqlangan sessiya bilan tarmoq uzilganida kesh va
aloqa xatosi ko‘rsatiladi; birinchi kirish server bilan tasdiqlanishi kerak.

Lokal `apps/api/.env`da (Gitga kiritilmaydi):

```dotenv
NODE_ENV=development
SMS_ADAPTER=local
DEMO_OTP_ENABLED=true
```

API jarayonini shu konfiguratsiya bilan qayta oching. So‘ng
`npm run mobile:preview -- <serial>` debug APKni qurilmaga o‘rnatadi;
USB reverse va lokal API ishlashi kerak. Raqam → **Kod yuborish** →
**Demo koddan foydalanish** → **Tasdiqlash**. Lokal adapter haqiqiy SMS
yubormaydi. Kod yangi so‘rovda yaratiladi va challenge bilan bog‘lanadi;
TTL, cooldown, urinish limiti va bir martalik ishlatish saqlanadi.

`DEMO_OTP_ENABLED` odatiy holatda `false`; API javobida `demo_code` faqat
opt-in lokal development/test rejimida qaytariladi. Production yoki
`http`/`eskiz` adapterida uni yoqish konfiguratsiya xatosi beradi.
Flutter paneli debug va `--dart-define=DEMO_OTP_ENABLED=true` bilan ochiladi;
release buildda panel yo‘q. Haqiqiy SMSga o‘tganda backend flagini `false`
qiling, tasdiqlangan SMS adapterini yoqing va APKni qayta tayyorlang.

## Sanatoriya anketasi va tekshiruv

Direktor **Sanatoriya profili → Tahrirlash**ni ochadi. Superadmin shu
sanatoriyani **Sanatoriyalar → Profilni ko‘rish** orqali ochadi.

1. Asosiy maydonlarni kiriting; tavsif kamida 30 belgi, STIR 9 raqam,
   telefon `+998` va 9 raqam bo‘lishi kerak. Xatolar tegishli maydon ostida
   yoziladi. Progress faqat to‘g‘ri to‘ldirilgan majburiy maydonlarni sanaydi.
2. Sharoitlar va xizmatlarda mavjudlarini belgilang; belgilanmagan variant
   mavjud emas deb ko‘rsatiladi. Hech biri oldindan avtomatik belgilanmaydi.
   Oldingi maxsus yozuvlar ham tanlovda qoladi. Narx va cheklovlarni tavsifga
   yozing; belgi xizmat tarifga kiritilganini anglatmaydi.
3. Xizmat shartlarini qabul qilib, **Saqlash va rasmlarga o‘tish**ni bosing.
   Saqlash xatosida sahifa o‘zgarmaydi va kiritilgan qiymatlar saqlanadi.
   Muvaffaqiyatli saqlashdan keyin **Rasmlar va hujjatlar** ochiladi.
4. Kamida bitta ommaviy rasm, bitta xususiy hujjat, faol xona va boshlang‘ich
   tarif qo‘shing. **Tekshiruvga yuborish → Yuborish**da yetishmagan yoki
   noto‘g‘ri maydonlar o‘zbekcha nomlari bilan ro‘yxat qilinadi. Profilni
   superadmin tasdiqlagandan keyin katalogda nashr qilinadi.

Tanlov ro‘yxati 2026-10-04 kuni rasmiy sahifalarda ko‘rsatilgan sharoitlar
asosida tayyorlandi: [Chinobod](https://www.chinabod.uz/public/index.php/about),
[Humson Buloq — kompleks](https://www.humsonbuloq.uz/o-nas),
[Humson Buloq — dam olish](https://humsonbuloq.uz/dosug),
[Zomin — Uzbekistan Travel](https://uzbekistan.travel/en/o/zaamin-sanatorium/).
Basseynlar, sauna, sport maydonlari, bolalar maydonchasi, xona jihozlari,
massaj va diagnostika kabi variantlar tanlash uchun beriladi; har bir
sanatoriya o‘zida haqiqatan mavjudlarini belgilaydi.

## Jamoa filtri, ruxsatlar va bank rekvizitlari

Yuqoridagi **Sanatoriyani tanlash** filtri **Jamoa va ruxsatlar**dagi
jadval va uning sahifa hisobiga qo‘llanadi. API `GET /partner/staff` va
`GET /superadmin/staff` uchun `sanatorium_id` UUID query parametrini qabul
qiladi. Direktor boshqa sanatoriya xodimlarini ko‘ra olmaydi.

**Ruxsatlar** oynasida har bir vakolatni yoqing/o‘chiring va **Saqlash**ni
bosing. Direktor vakolatidan tashqaridagi yoki superadmin taqiqlagan
tugmalar o‘zgartirilmaydi. Taqiq serverda ham tekshiriladi.

Bank rekvizitlarini bank yoki avtomatik tizim emas, **platforma superadmini**
tekshiradi. Superadmin **Sanatoriyalar → Profilni ko‘rish → Bank rekvizitlari**da
yuridik nom, hisob raqami, MFO va STIRni tekshiradi, keyin **Tasdiqlash**ni
bosadi. Direktor uchun holat **Superadmin tasdig‘i kutilmoqda** deb yoziladi.
Rekvizit tasdig‘i haqiqiy bank o‘tkazmasi yoki PSP kassasi faolligini
tasdiqlamaydi; ularning dalili alohida talab qilinadi.

## Android bosh sahifasi

Sarlavha **Sihhat uz**. Asosiy oqim: qidiruv/filtr → hudud → sanatoriya.
Katta kirish banneri, takroriy statistikalar, bitta sahifada ortiqcha
pagination va bron bo‘yicha takroriy qo‘llanma olib tashlangan. **Solishtirish**
tugmasi tanlash belgilarini ochadi, **Bekor qilish** tanlovni tozalaydi.
Bir vaqtda uchta sanatoriyani solishtirish mumkin. Faqat bitta reklama
ko‘rsatiladi; dastlabki ikkita yangilikdan keyingi materiallar va foydali
tavsiyalar yig‘iladigan bo‘limlarda qoladi.

## AI suhbat va bron tilagi

**Sihhat yordamchisi**da `Salom` → hudud → kunlik byudjet → safar →
sharoitlar ketma-ketligini yozing. Masalan: `Toshkent`, `500 ming`,
`10-oktabr`, `Basseyn`. Yordamchi ma’lum javobni qayta so‘ramaydi;
`Variantlar ko‘rsating` qolgan savollarni kutmay mavjud tanlovdan qidiradi.
`Assalomu alaykum` uchun alik, `Rahmat` uchun minnatdorchilik javobi bor.

Salom va aniqlashtirish serverdagi lokal mantiq bilan ishlaydi.
**Suhbatdagi tanlov ma’lumotlarimni Gemini xizmatiga yuborishga roziman**
belgilansa, variant tanlashda ajratilgan tanlovlar va joriy savol niqoblanib
providerga beriladi. Ilova oxirgi 12 xabarni yuboradi; API tanlov uchun
faqat user xabarlarini ishlatadi. Yangi doimiy suhbat jadvali yaratilmagan.
API xabarlaridan moliyaviy amal bajarilmaydi, narxni model yaratmaydi.

Bron serverda `CONFIRMED` bo‘lgach yaxshi tilak kartasi ko‘rsatiladi.
To‘lov natijasini **Holatni yangilash** orqali ham olish mumkin; to‘lovdan
qaytishning o‘zi bron tasdig‘i hisoblanmaydi.

Tezcheck checkouti ochilmasa `npm run tezcheck:check`ni bajaring va
[Tezcheck yo‘riqnomasi](TEZCHECK.md)dagi kassa tayyorligini tekshiring.
2026-10-04 qayta tekshiruvda kassa `draft`, `accepts_payments=false` edi.

## 1. Lokal muhit

### Windowsda tayyor muhitni ochish

Dependencylar, migratsiyalar va API/web buildlari tayyor bo‘lgach:

```powershell
npm run superadmin:local
npm run local:start
npm run local:status
```

`superadmin:local` faqat development, `127.0.0.1:55432/sihhat` bazasiga ruxsat
beradi. Kuchli tasodifiy parol va MFA kaliti yaratiladi; bazada parol hash,
MFA esa shifrlangan holda saqlanadi. Mavjud hisoblar va sanatoriyalar
o‘zgartirilmaydi. Sirlar konsolga chiqarilmaydi; `.local/superadmin-access.json`,
`.local/SUPERADMIN_KIRISH.html` va `.local/SUPERADMIN_KIRISH.txt` Gitdan chiqarilgan.
HTMLdagi joriy MFA kodi Chrome/Edgeda lokal hisoblanadi va tashqi so‘rov yo‘q.
Kalitni authenticatorga qo‘lda ulash ham mumkin: TOTP, 6 raqam, 30 soniya.
Kod bir martalik; ishlatilgan bo‘lsa keyingi kodni kuting.

Qayta yaratish buyrug‘i mavjud parolni almashtirmaydi va MFA hisoblagichini
tozalamaydi. Foydalanuvchi saytdan parolni o‘zgartirgan bo‘lsa, eski lokal
fayl avtomatik tiklash vositasi emas; skript mos kelmagan ma’lumotni rad etadi.
Ushbu tartib production bootstrap o‘rniga ishlatilmaydi.

`local:start` PostgreSQL, API, domen worker, sozlangan Telegram bot, superadmin va direktor/resepshn saytlarini
fon rejimida ochadi. Buildlar va HTTP readiness tekshiriladi; mavjud boshqariladigan
jarayonlar takroran yaratilmaydi. PID bilan birga yaratilish vaqti, workspace va
buyruq yo‘li tekshiriladi. Boshqa jarayon xizmat qilayotgan port avtomatik bo‘shatilmaydi.
Markerlar va loglar `.local/runtime`da. `local:status` xizmat holatini ko‘rsatadi.
Telegram rejimi backendning ayni environment va maxfiy fayl konfiguratsiyasidan
olinadi; qiymatlar konsolga chiqarilmaydi. `TELEGRAM_MODE=disabled` bo‘lsa bot
ochilmaydi va holatda `disabled` yoziladi. `polling` yoki `webhook` bo‘lsa
compiled worker boshqariladigan jarayon sifatida ochiladi; startup Telegram
autentifikatsiyasi va rejim tekshiruvidan keyingi tayyorlik yozuvini kutadi.
`telegram:check` tashqi ulanishni alohida tekshiradi. Lokal polling uchun
ikkinchi `dev:telegram` jarayonini bir vaqtda ochmang.

```powershell
npm run local:stop
```

`local:stop` botni ham qo‘shib, faqat markerlar bilan tasdiqlangan shu loyiha jarayonlarini
to‘xtatadi; baza ishlashda qoladi, ma’lumotlar o‘chirilmaydi. Bazani to‘xtatish
uchun `npm run db:stop`. Kompyuter qayta ochilganda xizmatlar o‘z-o‘zidan
ochilmaydi — loyiha ildizida `npm run local:start`ni bajaring.

USB debugging yoqilgan Android qurilma ulangan bo‘lsa, `local:start`
API uchun USB reverse ulanishini tiklaydi. Preview APK `http://127.0.0.1:4000`
manziliga shu reverse orqali ulanadi; kompyuter ishlashi va USB ulanishi kerak.
Ushbu rejim LAN yoki ommaviy internet deploymenti emas.

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

### Telegram xodimlar boti

Token lokal `.local/secrets/providers.env`da yoki deployment secret
muhitida saqlanadi. `TELEGRAM_MODE=polling` uchun ayni botga bitta worker:

```powershell
npm run telegram:check
npm run telegram:configure
npm run dev:telegram
```

Compiled jarayon: `npm run start:telegram -w @sihhat/api`. API va domen
worker ham ishlashi kerak. Telegram worker xabarlarni yuboradi, domen
worker hold expiry, provider timeout va billingni bajaradi. Local PID lock
ikkinchi polling jarayonini rad etadi; productionda bitta replika belgilang.
Mavjud webhook pollingda avtomatik o‘chirilmaydi. 401/409da worker to‘xtaydi;
tarmoq/429da qayta urinish kechiktiriladi. Token yangilanganda workerni
qayta ishga tushiring. Kompyuter o‘chsa lokal bot ham to‘xtaydi.

Xodim hisobini saytdagi **Telegram bot** bo‘limida bir martalik havola
orqali bog‘laydi va botda Start bosgandan so‘ng saytda ism/IDni tasdiqlaydi.
Huquqlar bot chatidan berilmaydi; har amal joriy ruxsat bilan tekshiriladi.
`TELEGRAM_ADMIN_URL` va `TELEGRAM_PARTNER_URL` haqiqiy HTTPS manzil bo‘lsa,
sayt tugmalari telefonda ham ochiladi. Hozirgi localhost kabinetlari
kompyuter uchun; ommaviy deployment hali bajarilmagan.

Webhook rejimi va secret header, bildirishnomalar, navbat/saqlash tartibi,
rollar va tugmalar [TELEGRAM_BOT.md](TELEGRAM_BOT.md)da. `telegram:check`
natijasi provider ulanishini tekshiradi; fake Telegram klienti ishlatilgan
backend/browser testlari haqiqiy xodimning end-to-end qabul dalili emas.

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
| Telegram | `TELEGRAM_MODE`, server tokeni, HTTPS kabinet URLlari; webhookda secret header | Rasmiy getMe/getWebhookInfo va commands sozlash tekshirildi; xodimning haqiqiy hisob ulashi alohida yakunlanadi |

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

`NODE_ENV=production` real SMS, tanlangan Payme/Tezcheck merchant rekvizitlari, S3, Redis va HTTPS originlarni talab qiladi; lokal payment-confirm endpointi yopiladi. Tezcheck kassasi ham haqiqiy to‘lov qabul qilishga tayyor bo‘lishi kerak. Production superadminini demo seed orqali yaratmang. `BOOTSTRAP_LOGIN` va `BOOTSTRAP_PASSWORD`ni secret muhitida berib, `npm run bootstrap -w @sihhat/api`dan foydalaning; bir martalik MFA ulash URI maxfiy saqlanadi.

`infra/docker/compose.yaml` PostgreSQL/Redis/MinIO uchun local muqobil muhit. Unda test DB va S3 bucketni alohida tayyorlash, `.env`ning DB URL/portlarini moslash kerak; ishlatilmagan Compose muhiti tekshirilgan deb belgilanmaydi.

Real pilot uchun sanatoriya xona inventari, SMS/merchant rekvizitlari, refund/payout qoidalari va tariflar kerak. Pilot oqimi: e’lon tasdiqlash → quote/hold → provider to‘lovi → kelish/ketish → bank tasdig‘i bilan payout; muqobil oqim cancellation/refund. Release APK signing va payment return ham haqiqiy qurilmada tekshiriladi.

## Tezcheck va yangilangan Android UI — 2026-10-03

Tezcheck tartibi va haqiqiy tekshiruv cheklovlari [TEZCHECK.md](TEZCHECK.md)da.
Serverda `PAYMENT_MODE=tezcheck`, maxfiy `TEZCHECK_API_KEY` va kassa kodi
sozlanadi; `npm run tezcheck:check` faqat xavfsiz o‘qish so‘rovlarini yuboradi.
Hozir kassa `draft`, `accepts_payments=false`: shu holatni yashirib to‘lovni
tasdiqlash mumkin emas. API kaliti APK yoki web environmentga kiritilmaydi.
Cashdesk faollashgach checkout va haqiqiy payment return sinovi alohida bajariladi.

Webhook uchun haqiqiy HTTPS `/payments/tezcheck` manzili kabinetda ro‘yxatdan
o‘tkaziladi va kabinet bergan siri `TEZCHECK_WEBHOOK_SECRET`ga saqlanadi.
Poller webhook bo‘lmasa ham holatlarni oladi. `REVIEW` hisoblar, bekor qilish
409 javoblari, 23 soatga yetgan noma’lum creation va pending inventar admin
tomonidan kuzatiladi. Noma’lum natijada inventarni qo‘lda bo‘shatmang;
provider va buyurtma referenceini solishtiring. Paid hisobni cancel qilish
refund emas; Tezcheck refund endpointi berilmagan. Refund/dispute/chargeback
holatlari avtomatik muvaffaqiyatga aylantirilmaydi va payout tasdig‘ini to‘xtatadi.
Bank reestrida `provider=TEZCHECK` va provayder tasdiqlagan komissiya beriladi.

AI sarfi `GET /superadmin/ai/usage?from=YYYY-MM-DD&to=YYYY-MM-DD` va admin
hisobotida: Asia/Tashkent, oxirgi sana davrga kirmaydi. So‘rovlar, model,
natija va olingan tokenlar qaytariladi. `AI_INPUT_USD_PER_MILLION` va
`AI_OUTPUT_USD_PER_MILLION` bo‘sh bo‘lsa xarajat null; berilsa joriy Gemini
modeli uchun taxminiy USD. Bu provider invoicei yoki ledger xarajati emas.

Mobil UI uchun `npm run mobile:check`, so‘ng `npm run mobile:preview -- <serial>`.
Yangi preview lokal HTTP API/USB reverse bilan ishlaydi. `python scripts/check-apk-secrets.py`
va `npm run check:secrets` maxfiy ma’lumotlarni tekshiradi. APK, screenshot,
imzo va `.local` dalillari Gitga kiritilmaydi. Production APKni haqiqiy HTTPS
va signing konfiguratsiyasi bilan qayta yig‘ish tartibi mobile READMEda.
