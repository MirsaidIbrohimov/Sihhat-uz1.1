# Sihhat uz

Sanatoriyalar uchun bron platformasi: NestJS/PostgreSQL backend, superadmin sayti, direktor/resepsion sayti, xodimlar Telegram boti va Flutter Android ilovasi.

Kanonik repozitoriya: [MirsaidIbrohimov/Sihhat-uz1.1](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1). Yangilangan: **2026-10-04**. Keyingi kod o‘zgarishlari ham shu repozitoriyaga joylanadi; README va tekshiruv natijalari o‘zgarishlarga mos yangilanadi.

## Joriy holat

| Qism | Bajarilgan |
| --- | --- |
| Backend | MFA/OTP, rollar va sanatoriya ruxsatlari, katalog, inventar, narx hisobi, ko‘p xonali bron, Payme/Tezcheck, ledger, refund/payout, abonent/reklama, xabarlar va hisobotlar; 8 migratsiya |
| Superadmin | Sanatoriyalar, jamoa/ruxsatlar, moliya va operatsion sahifalar; yangilik va tavsiya yaratish, tahrirlash, e’lon qilish va arxivga olish |
| Hamkorlar sayti | Direktor/resepsion ruxsatlari, xona va tariflar, kalendar, qo‘lda bron, check-in/out va tegishli operatsion sahifalar |
| Telegram bot | Admin/direktor/resepsion menyulari, sayt orqali tasdiqlangan hisob, bron/qidiruv/check-in-out, xonalar, hisobot, vazifa va murojaatlar; bildirishnoma, kunlik ma’lumot va abonent eslatmalari |
| Android | Telefon/SMS tasdig‘idan keyin ochiladigan asosiy sahifalar, lokal demo SMS; Sihhat uz logosi va kunduzgi/tungi rejim. Wellness UI, qidiruv/filtr, bron/to‘lov amallari, katalog, saqlanganlar, AI, profil va tiklanadigan sessiya |
| Gemini | Haqiqiy ulanish, rozilik, raqam/email niqobi, katalog/FAQ, limit va token sarfi; admin uchun davr/model bo‘yicha sarf va sozlangan narxga asoslangan taxminiy USD hisobot |
| Tezcheck | Berilgan kalit bilan rasmiy API, kassa, usullar, tranzaksiyalar va balans o‘qildi. Backend checkout/polling/signed webhook tayyor; haqiqiy kassa draft, to‘lov qabul qilmaydi |
| Eskiz | SMS API autentifikatsiyasi va standart test SMSi tekshirildi; foydalanuvchi yetib kelganini tasdiqladi. Haqiqiy OTP uchun hisob va matn hali tayyor emas |

Backendni production uchun 100% tayyor deb hisoblashga hali asos yo‘q. Haqiqiy HTTPS API, Tezcheck kassasini faollashtirish va haqiqiy merchant to‘lovi/webhook, Eskiz hisobini test rejimidan chiqarish va OTP matnini tasdiqlatish, push, staging Redis/S3 hamda real sanatoriya/bank piloti qolgan. Payme bevosita ulanishi tanlansa uning rasmiy rekvizitlari va qabul sinovi kerak. Batafsil dalillar va cheklovlar [amalga oshirish holati](docs/IMPLEMENTATION_STATUS.md)da.

Backend **62/62**, brauzer **11/11**, mobil **30/30 unit/widget** sinovi o‘tdi. API, ikkala web buildi, TypeScript, Flutter analyzer va 8 migratsiyaning toza bazadagi tekshiruvi o‘tdi. Backend, mobil va oxirgi umumiy brauzer natijalari 4-oktabrga tegishli; migratsiya va avvalgi qabul dalillari [holat hujjati](docs/IMPLEMENTATION_STATUS.md)da alohida sanalar bilan saqlangan. Lokal provider javoblari rasmiy merchant qabulining o‘rnini bosmaydi.

Yangilangan bosh sahifa, AI suhbat va bron tasdig‘i yozuvli APK USB orqali Samsung SM-A165F qurilmasiga o‘rnatildi. Avvalgi login sinovida telefon/SMS tasdig‘idan keyin asosiy sahifa ochildi va lokal bazada yangi OTP tasdig‘i, mijoz hamda mobil sessiya qayd etildi. Oxirgi APK ichida 45 ta maxfiy qiymat bayt namunasi tekshirildi, moslik topilmadi. Bu lokal APIga ulanadigan **debug preview**; imzolangan oldingi release namunasi vaqtinchalik `https://api.sihhat.invalid` manziliga ega. Haqiqiy HTTPS manzili belgilangach release qayta yig‘iladi. APKlar va qurilma dalillari repozitoriyaga kiritilmaydi.

## AI suhbat va bron tasdig‘i

Yordamchi **Salom**ga **Salom!**, **Assalomu alaykum**ga **Va alaykum assalom!**
deb javob beradi. Keyin hudud, kunlik byudjet, safar va kerakli sharoitlarni
birma-bir so‘raydi; oxirgi suhbatdagi javoblarni hisobga oladi. **Variantlar
ko‘rsating** deyilsa mavjud tanlovlar bo‘yicha katalogga o‘tadi. Salomlashuv,
aniqlashtiruvchi savollar va minnatdorchilik javobi Gemini chaqirmaydi.

Bron serverda **CONFIRMED** bo‘lgach **Broningiz tasdiqlandi! Yaxshi dam
oling! Safaringiz yoqimli va xotirjam o‘tsin** yozuvi chiqadi.

2026-10-04 qayta tekshiruvda Tezcheck API autentifikatsiyasi ishladi;
kassa **draft**, **accepts_payments=false**. Kassani Tezcheck kabinetida
faollashtirish kerak. Sozlash va dalillar [TEZCHECK.md](docs/TEZCHECK.md)da.

## Anketa, ruxsatlar va bosh sahifa

Sanatoriya anketasida sharoit va xizmatlar belgilash ro‘yxati bilan kiritiladi;
oldin yozilgan sharoitlar ham saqlanadi. Qoralama chala ma’lumotni saqlashi
mumkin, lekin tekshiruvga yuborishdan oldin majburiy maydonlar, rasmlar,
hujjatlar, faol xona va tarif talab qilinadi. Xabarda qaysi ma’lumot
yetishmayotgani yoziladi. Oxirgi **Saqlash va rasmlarga o‘tish** tugmasi
saqlash muvaffaqiyatli tugagach rasmlar va hujjatlarni ochadi.

Xodimlar tanlangan sanatoriya bo‘yicha filtrlanadi. Har bir ruxsatni
alohida tugma bilan yoqish/o‘chirish mumkin; direktor uchun admin taqiqlari
saqlanadi. Bank rekvizitlarini **platforma superadmini** qo‘lda tekshiradi:
**Sanatoriyalar → Profilni ko‘rish → Bank rekvizitlari → Tasdiqlash**.

Android bosh sahifa sarlavhasi **Sihhat uz**. Qidiruv, hududlar va sanatoriyalar
oldinga chiqarildi; katta banner, takroriy statistika va bron qo‘llanmasi
olib tashlandi. Solishtirish belgilari tegishli tugma bilan ochiladi;
bitta reklama, dastlabki ikkita yangilik va yig‘iladigan tavsiyalar ko‘rsatiladi.
Manbalar va foydalanish tartibi [runbook](docs/RUNBOOK.md)da.

## Logo va ilova ko‘rinishi

Berilgan logo `assets/branding/sihhat-logo.jpg`da saqlanadi. Uning to‘liq
ko‘rinishi Android ilovasi, launcher/splash va superadmin/direktor/resepsion
saytlarining kirish sahifasi, menyusi va brauzer ikonkasida ishlatiladi.
Mos o‘lchamlarni qayta tayyorlash: `npm run brand:assets`.
Android 12+ ochilish rasmi logoning yozuvi ham to‘liq ko‘rinishi uchun
atrofida shaffof bo‘sh joy bilan alohida tayyorlanadi.

Android bosh sahifa va loginidagi **oy/quyosh tugmasi** har bosilganda
kunduzgi va tungi rejimni almashtiradi. **Profil → Ilova ko‘rinishi**da ham
shu amal uchun tugma bor. Faqat ikki rejim mavjud; boshlang‘ich rejim kunduzgi.
Ko‘rinish tanlovi qayta ochilganda va hisobdan chiqishda saqlanadi.
Rejimni login oynasida ham almashtirish mumkin.
QR fonining o‘qilishi uchun u ikkala rejimda ham oq saqlanadi.

## Androidga kirish va demo SMS

Sessiyasi yo‘q foydalanuvchiga avval telefon orqali kirish oynasi ochiladi.
SMS kodi to‘g‘ri tasdiqlangach yangi mijoz hisobi yaratiladi yoki mavjud
hisobga kiriladi va asosiy sahifalar ochiladi. Saqlangan sessiya tekshiriladi;
faol sessiya bilan qayta SMS so‘ralmaydi. Hisobdan chiqish yoki sessiya bekor
qilinishi login oynasiga qaytaradi va ochiq ichki sahifalarni yopadi.

Lokal sinov uchun `apps/api/.env`da `NODE_ENV=development`,
`SMS_ADAPTER=local`, `DEMO_OTP_ENABLED=true` belgilanadi va API qayta ochiladi.
`npm run mobile:preview -- <serial>` demo kod ko‘rinadigan debug APKni tayyorlaydi.
Raqamni kiriting → **Kod yuborish** → ekrandagi **Demo koddan foydalanish** →
**Tasdiqlash**. Telefoningizga haqiqiy SMS yuborilmaydi. Kod har so‘rovda
yaratiladi; muddati, urinishlar va qayta yuborish cheklovlari amal qiladi.
Oddiy konfiguratsiyada demo kod berilmaydi, release ilovada ko‘rsatilmaydi;
production yoki haqiqiy SMS adapterida demo konfiguratsiyasi rad etiladi.

## Kod tuzilishi

| Papka | Vazifasi |
| --- | --- |
| `apps/api` | NestJS API, Prisma modeli/migratsiyalar va backend sinovlari |
| `apps/superadmin-web` | Superadmin Next.js sayti |
| `apps/partner-web` | Direktor/resepsion Next.js sayti |
| `apps/mobile` | Flutter Android ilovasi va mobil sinovlar |
| `packages/ui` | Saytlarning umumiy sahifa va komponentlari |
| `packages/api-client-ts` | Web API mijozi |
| `scripts`, `test/web` | Lokal muhit, APK/build/tiklanish vositalari va Playwright sinovlari |
| `docs`, `infra` | Arxitektura, holat, OpenAPI, runbook va Docker muhiti |

## Gemini, Eskiz va Tezcheck sozlamalari

API kalitlari faqat backendga beriladi. Lokal maxfiy fayl `.local/secrets/providers.env`; boshqa muhitda `SIHHAT_SECRETS_FILE` yoki server environment ishlatiladi. `.env.example` fayllarida faqat bo‘sh maydonlar va namunalar bor. Kalit/parollar, signing fayllari, demo hisoblar, bazalar, media, keshlar va APKlar Gitdan chiqarilgan.

Tezcheck uchun [integratsiya va xavfsiz tekshirish](docs/TEZCHECK.md): `npm run tezcheck:check`. `PAYMENT_MODE=tezcheck` serverda yoqiladi; kalit va kassa kodi maxfiy faylda saqlanadi. Faol bo‘lmagan kassa `PAYMENT_NOT_READY` qaytaradi. Provider cancellation refund emas; avtomatik refund API hujjatda yo‘qligi sabab u bajarilmaydi.

AI sarfi admin hisobotida va `GET /superadmin/ai/usage?from=...&to=...`da ko‘rinadi. `AI_INPUT_USD_PER_MILLION`/`AI_OUTPUT_USD_PER_MILLION` bo‘sh bo‘lsa xarajat o‘ylab topilmaydi. Sozlangan qiymatlar joriy Gemini modeliga qo‘llanadigan taxmin; haqiqiy invoice va ledger xarajati alohida.

Gemini uchun backendda `AI_ADAPTER=gemini`, `GEMINI_API_KEY` va `GEMINI_MODEL` sozlanadi. Hozirgi model `gemini-3.1-flash-lite`; default kunlik limit 100 so‘rov, javob chegarasi 768 token. Model tasdiqlangan katalog va FAQ identifikatorlarini tanlaydi; bron yoki moliyaviy amalni bajarmaydi. Kalit APK yoki web mijoziga yuborilmaydi.

Eskiz uchun asosiy kabinet parolidan farq qiladigan SMS API login/paroli yoki token talab qilinadi. Adapter `SMS_ADAPTER=eskiz`; kirish kodi matni `ESKIZ_OTP_TEMPLATE` bilan beriladi. Hisob haqiqiy yuborishga tayyor bo‘lib, aynan shu matn tasdiqlangandan keyingina `ESKIZ_OTP_APPROVED=true` qilinadi. Hozir bu qiymat `false`; development muhiti lokal OTP adapteridan foydalanadi. Standart test SMSi yetib kelishi haqiqiy kirish kodi ruxsatini tasdiqlamaydi. Batafsil sozlash [runbook](docs/RUNBOOK.md)da.

## Telegram bot

Bot: [@sihhat_admins_bot](https://t.me/sihhat_admins_bot). Xodim saytda **Telegram bot → Telegramga ulash**ni bosadi, botda **Start** qiladi va saytga qaytib Telegram hisobini tasdiqlaydi. Direktor/resepsion roli saytdagi mavjud tayinlovdan olinadi; botdagi tanlov orqali huquq berilmaydi.

Server tokeni `.local/secrets/providers.env`da, Gitga kiritilmaydi. `npm run telegram:check` ulanishni tekshiradi, `npm run telegram:configure` o‘zbekcha buyruqlarni sozlaydi, `npm run dev:telegram` bot workerini ishga tushiradi. API va domen worker ham alohida ishlashi kerak. Kompyuter o‘chsa lokal bot to‘xtaydi; doimiy server va telefon uchun HTTPS kabinet manzillari hali kerak. Tugmalar, ruxsatlar va sozlash: [Telegram yo‘riqnomasi](docs/TELEGRAM_BOT.md).

## Lokal ishga tushirish

Windowsda tayyorlangan API, worker, ikkala sayt va USBdagi Android ulanishini
bitta buyruq bilan ochish mumkin:

```powershell
npm run local:start
npm run local:status
```

Superadmin — http://localhost:3000, direktor/resepsion — http://localhost:3001.
Xizmatlar fon rejimida ishlaydi. Kompyuter qayta ochilganda `local:start`ni
yana bajaring; to‘xtatish — `npm run local:stop`. Bu buyruq bazani to‘xtatmaydi
va ma’lumotlarni o‘chirmaydi. Jarayon dalillari va loglar `.local/runtime`da.

`npm run superadmin:local` faqat development va `127.0.0.1:55432/sihhat`
bazasida alohida egasi hisobini yaratadi; mavjud demo hisoblarni saqlaydi.
Login, parol va MFA uchun **`.local/SUPERADMIN_KIRISH.html`**ni Chrome/Edge
brauzerida oching. Unda joriy 6 raqamli kod ko‘rinadi; `.txt` nusxa ham bor.
Qayta bajarish parolni almashtirmaydi. Ushbu fayllar maxfiy va Gitga kirmaydi.
Production uchun runbookdagi `bootstrap` tartibi alohida qo‘llanadi.

Telefon uchun `.local/releases/sihhat-uz-preview.apk` lokal **debug** APK.
USB debugging va shu kompyuterga USB ulanishi kerak; `local:start` ulangan
qurilmalarda `adb reverse tcp:4000 tcp:4000`ni qayta sozlaydi. APKni qurish
va o‘rnatish — `npm run mobile:preview -- <serial>`. Telefonni qayta ulagan
bo‘lsangiz, `local:start`ni yana bajaring. SMS kodi lokal demo panelidan olinadi.

Node.js 24.15 yoki undan yangi, npm va PostgreSQL 18 kerak. Buyruqlar loyiha ildizida bajariladi:

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:generate
npm run db:seed
npm run build:api
```

`db:local` faqat shu loyiha uchun `127.0.0.1:55432`dagi PostgreSQLni va `apps/api/.env`ni tayyorlaydi. Windowsda PostgreSQL odatiy joyga o‘rnatilmagan bo‘lsa, `SIHHAT_PG_BIN`ni belgilang. Seed faqat lokal `sihhat` bazasida ishlaydi; demo kirish ma’lumotlari `.local/dev-access.json`da saqlanadi.

Alohida terminallarda:

```powershell
npm run dev:api
npm run dev:worker
npm run dev:admin
npm run dev:partner
```

| Xizmat | Manzil |
| --- | --- |
| API va baza tayyorligi | http://127.0.0.1:4000/health/ready |
| Swagger | http://127.0.0.1:4000/docs |
| Superadmin | http://localhost:3000 |
| Direktor/resepsion | http://localhost:3001 |

## Tekshirish

```powershell
npm run build:web
npm run check
npm run test
npm run db:migrations:verify -w @sihhat/api
npm run openapi
npm run test:web
npm run backup:verify
npm run check:secrets
```

Backend testlari faqat `sihhat_test` bazasini ishlatadi va har ssenariyda uning ma’lumotlarini tozalaydi. Migration tekshiruvi yangi `sihhat_migration_check_*` bazasini yaratib, barcha migratsiyalarni boshidan qo‘llaydi; bu baza dalil sifatida saqlanadi. Web testlari lokal demo API va seedni talab qiladi; ikkala saytni Playwright o‘zi ishga tushiradi. Backup tekshiruvi `sihhat`ni o‘qib, alohida `sihhat_restore_test` bazasiga tiklaydi. Android buyruqlari [ilova yo‘riqnomasi](apps/mobile/README.md)da.

Migratsiya, worker, zaxira, tiklash va tashqi xizmatlarni ulash bo‘yicha [runbook](docs/RUNBOOK.md) mavjud. Lokal to‘lov tasdiqlash haqiqiy pul o‘tkazmasi emas; rasmiy SMS/Payme sinovlari va real pilot holat hujjatida alohida qayd qilinadi.

## Talablar va qarorlar

Hujjatlarni quyidagi tartibda o‘qing:

1. [Talablar va arxitektura](docs/SIHHAT_UZ_ARXITEKTURA.md) — rollar, sanatoriyani e’lon qilish, xona, bron, to‘lov, hisob-kitob, ma’lumotlar va API qoidalari.
2. [Ishlab chiqish rejasi](docs/ISHLAB_CHIQISH_REJASI.md) — avval backend, so‘ng superadmin sayti, hamkorlar sayti va Android ilovasi; har bosqichning qabul mezonlari.
3. [AI uchun topshiriq](docs/AI_UCHUN_TOPSHIRIQ.md) — boshqa dasturlovchi AIga beriladigan boshlang‘ich ko‘rsatma.

Foydalanuvchi tasdiqlagan asosiy qarorlar:

- Sihhat uz pullik reklama va sanatoriyalarning abonent to‘lovidan daromad oladi.
- Mijozning bron puli avval Sihhat uz hisobiga tushadi, keyin sanatoriyaga o‘tkaziladi.
- Birinchi versiyada butun xona bron qilinadi. Bir sanatoriyadan bir yoki bir nechta xona olish mumkin.
- Mijoz uchun Android APK; direktor va resepsion uchun bitta sayt va bitta kirish sahifasi; superadmin uchun alohida sayt.
- Sanatoriyani superadmin qo‘shadi. Anketa superadmin tasdiqlaganidan keyin e’lon ko‘rinadi.
- Direktor qo‘shgan resepsion superadmin tasdig‘idan keyin ishlaydi.
- Dasturlash backenddan boshlanadi.

Hujjatlardagi «taklif» va «ishga tushirishdan oldin belgilanadi» yozuvlari hali foydalanuvchi tasdiqlamagan yoki tashqi hamkor bilan kelishilishi kerak bo‘lgan qarorlarni bildiradi. Ularni tasdiqlangan talablar bilan aralashtirmang.

Hujjat tili: o‘zbekcha. Tadqiqot sanasi: 2026-09-30.
