# Sihhat uz

Sanatoriyalar uchun bron platformasi: NestJS/PostgreSQL backend, superadmin sayti, direktor/resepsion sayti va Flutter Android ilovasi.

Kanonik repozitoriya: [MirsaidIbrohimov/Sihhat-uz1.1](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1). Yangilangan: **2026-10-02**. Keyingi kod o‘zgarishlari ham shu repozitoriyaga joylanadi; README va tekshiruv natijalari o‘zgarishlarga mos yangilanadi.

## Joriy holat

| Qism | Bajarilgan |
| --- | --- |
| Backend | MFA/OTP, rollar va sanatoriya ruxsatlari, katalog, inventar, narx hisobi, ko‘p xonali bron, to‘lov holati, ledger, refund/payout, abonent/reklama, xabarlar va hisobotlar; 6 migratsiya |
| Superadmin | Sanatoriyalar, jamoa/ruxsatlar, moliya va operatsion sahifalar; yangilik va tavsiya yaratish, tahrirlash, e’lon qilish va arxivga olish |
| Hamkorlar sayti | Direktor/resepsion ruxsatlari, xona va tariflar, kalendar, qo‘lda bron, check-in/out va tegishli operatsion sahifalar |
| Android | Kirishda loginni kutmaydigan bosh sahifa, sanatoriyalar, boshlang‘ich tariflar, hudud filtri, yangiliklar, tavsiyalar va bron yo‘riqnomasi; katalog, saqlanganlar, bron/to‘lov, profil va tiklanadigan sessiya |
| Gemini | Server orqali haqiqiy ulanish tekshirildi; mijoz roziligi, shaxsiy raqam/emailni niqoblash, katalog/FAQ bilan cheklangan javob, kunlik limit va token sarfi yozuvlari |
| Eskiz | SMS API autentifikatsiyasi va standart test SMSi tekshirildi; foydalanuvchi yetib kelganini tasdiqladi. Haqiqiy OTP uchun hisob va matn hali tayyor emas |

Backendni production uchun 100% tayyor deb hisoblashga hali asos yo‘q. Haqiqiy HTTPS API, Eskiz hisobini test rejimidan chiqarish va OTP matnini tasdiqlatish, rasmiy Payme sandboxi, push, staging Redis/S3 hamda real sanatoriya/bank piloti qolgan. Batafsil dalillar va cheklovlar [amalga oshirish holati](docs/IMPLEMENTATION_STATUS.md)da.

Oxirgi tekshiruvlar: **32/32 backend**, **17/17 Android unit/widget**, Flutter analyzer va TypeScript tekshiruvi o‘tdi. Ikkala Next.js buildi tayyor. Yangi Playwright testi adminning qoralama → e’lon → arxiv oqimi bilan Android public feed mosligini tekshirdi; avvalgi 5 brauzer testi dalillari holat hujjatida saqlangan.

Yangilangan APK USB orqali Samsung SM-A165F qurilmasiga o‘rnatildi. APK ichida 15 ta maxfiy ma’lumot bayt ko‘rinishi tekshirildi, moslik topilmadi. Bu lokal APIga ulanadigan **debug preview**; imzolangan oldingi release namunasi vaqtinchalik `https://api.sihhat.invalid` manziliga ega. Haqiqiy HTTPS manzili belgilangach release qayta yig‘iladi. APKlar va qurilma dalillari repozitoriyaga kiritilmaydi.

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

## Gemini va Eskiz sozlamalari

API kalitlari faqat backendga beriladi. Lokal maxfiy fayl `.local/secrets/providers.env`; boshqa muhitda `SIHHAT_SECRETS_FILE` yoki server environment ishlatiladi. `.env.example` fayllarida faqat bo‘sh maydonlar va namunalar bor. Kalit/parollar, signing fayllari, demo hisoblar, bazalar, media, keshlar va APKlar Gitdan chiqarilgan.

Gemini uchun backendda `AI_ADAPTER=gemini`, `GEMINI_API_KEY` va `GEMINI_MODEL` sozlanadi. Hozirgi model `gemini-3.1-flash-lite`; default kunlik limit 100 so‘rov, javob chegarasi 768 token. Model tasdiqlangan katalog va FAQ identifikatorlarini tanlaydi; bron yoki moliyaviy amalni bajarmaydi. Kalit APK yoki web mijoziga yuborilmaydi.

Eskiz uchun asosiy kabinet parolidan farq qiladigan SMS API login/paroli yoki token talab qilinadi. Adapter `SMS_ADAPTER=eskiz`; kirish kodi matni `ESKIZ_OTP_TEMPLATE` bilan beriladi. Hisob haqiqiy yuborishga tayyor bo‘lib, aynan shu matn tasdiqlangandan keyingina `ESKIZ_OTP_APPROVED=true` qilinadi. Hozir bu qiymat `false`; development muhiti lokal OTP adapteridan foydalanadi. Standart test SMSi yetib kelishi haqiqiy kirish kodi ruxsatini tasdiqlamaydi. Batafsil sozlash [runbook](docs/RUNBOOK.md)da.

## Lokal ishga tushirish

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
