# Sihhat uz

Sanatoriyalar uchun bron platformasi: NestJS/PostgreSQL backend, superadmin sayti, direktor/resepsion/hisobchi sayti, xodimlar Telegram boti va Flutter Android ilovasi.

Kanonik repozitoriya: [MirsaidIbrohimov/Sihhat-uz1.1](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1). Yangilangan: **2026-10-10**. O‘zgarishlar lokal saqlanadi; GitHubga foydalanuvchining aniq topshirig‘i bilan yuklanadi.

[Kerakli dasturlar va kutubxonalar](#kerakli-dasturlar-va-kutubxonalar),
[ishga tushirish tartibi](#lokal-ishga-tushirish) va [tayyor APK](#tayyor-apk)
quyida berilgan.

## Web panellar yangi UI

2026-10-10: [UI/web galereyasi](UI/web/index.html)da **32 ta yangi dizayn**
va **26 ta amaldagi panel rasmi** tayyorlandi. Superadmin, direktor va
hisobchi sahifalari, tungi ko‘rinish va telefon namunalari bor. Galereya
internetsiz ishlaydi: rol/qidiruv filtri, yonma-yon taqqoslash va 1:1 zoom.
[Interaktiv namuna](UI/web/preview.html?screen=03-superadmin-bosh-sahifa),
[rasmlar ro‘yxati](UI/web/README.md) va [UI tekshiruvi](UI/web/REVIEW.md)
shu papkada. Ma’lumotlar namunaviy; haqiqiy hisob/rekvizitlar ishlatilmagan.
Yangi uslub amaldagi superadmin, direktor/resepsion va hisobchi React
panellariga joriy etildi: to‘rtta ochiladigan menyu guruhi, lokal Manrope/DM
Sans shriftlari va Lucide ikonkalar, kunduzgi/tungi ko‘rinish, ixcham
ko‘rsatkichlar, qo‘shimcha amallar menyusi, telefon uchun bron kartalari.
Xabar, vazifa, anketa, sharh, maqola va bildirishnomalar alohida kartalarda;
yordam suhbati va reklamaning ilovadagi previewi o‘z joyida ko‘rinadi.
Rang rejimi sahifa qayta ochilganda saqlanadi. Kirishda parolni ko‘rsatish,
MFA va telefon uchun ixcham forma bor.

`UI/web/joriy`da yangi haqiqiy React sahifalari namunaviy ma’lumotlar bilan
suratga olinadi; `hozirgi` dastlabki ko‘rinishni, `yangi` dizayn maketlarini
saqlaydi. Panellarni ishga tushirish va tekshirish tartibi
[runbook](docs/RUNBOOK.md#web-panellar-yangi-ui), natijalar
[holat hujjati](docs/IMPLEMENTATION_STATUS.md)da.

## Android yangi UI

2026-10-10: [UI galereyasi](UI/index.html)da **10 ta PNG rasm, 30 ta ekran
holati** tayyorlandi: katalog/filtr, sanatoriya/xona/tarif/galereya, bron
va to‘lov, QR/sharh, AI, profil, yordam, bildirishnoma/yangilik va SMS
orqali kirish. Har rasm uchta ekran ko‘rinishini beradi; galereya
internetsiz ochiladi, kattalashtirish va guruh filtrlari bor.
[Rasmlar ro‘yxati](UI/README.md), [dizayn tavsiyalari](UI/DESIGN_GUIDE.md)
va [to‘liq promptlar](UI/prompts.json) shu papkada.

Maketlar uslubi Androidning ichki sahifalariga Flutter widgetlari bilan
joriy etildi: katalog va filtrlar, sanatoriya/tarif/galereya, sana va bron,
to‘lov/QR/sharh, AI, profil, yordam, bildirishnoma/yangilik va SMS kirish.
Umumiy kartalar, Manrope/DM Sans shriftlari, Lucide outline ikonkalar va
kunduzgi/tungi ko‘rinish qo‘llanadi. Katalogda narx oralig‘i va bir nechta
sharoit bo‘yicha filtrlar internetsiz ham ishlaydi. Bosh sahifaning mavjud
ranglari va joylashuvi saqlangan; barcha menyularda yangi navigatsiya
ikonkalaridan foydalaniladi. Login oynasida Sihhat uz logosi va doimiy
`+998` prefiksi bor. Undan keyingi raqam aynan 9 xonali bo‘lishi kerak;
xato maydon tagida chiqadi. Faol HOME reklama mashhur sanatoriyalar
joyini egallaydi, reklama bo‘lmasa superadmin tick bilan tanlagan
sanatoriyalar ko‘rinadi. Joriy APK va USB orqali ishlatish tartibi
[APK bo‘limi](#tayyor-apk)da; tekshiruv dalillari
[holat hujjati](docs/IMPLEMENTATION_STATUS.md)da.

## Joriy holat

| Qism | Bajarilgan |
| --- | --- |
| Backend | MFA/OTP, rollar va sanatoriya ruxsatlari, 2/4 soatlik panel faolsizligi, katalog, inventar, narx hisobi, ko‘p xonali bron, Payme/Tezcheck, ledger, refund/payout, bepul tasdiqlangan reklama, xabarlar va hisobotlar; 12 migratsiya |
| Superadmin | Sanatoriyalar jadvalidagi Mashhur tick tanlovi, jamoa/ruxsatlar, moliya va operatsion sahifalar; yangilik va tavsiya yaratish, tahrirlash, e’lon qilish va arxivga olish |
| Hamkorlar sayti | Direktor/resepsion ruxsatlari, xona va tariflar, kalendar, qo‘lda bron, check-in/out; hisobchiga faqat o‘z sanatoriyasining kunlik/7/30/90 kun/oy hisobotlari, CSV va chop etish |
| Telegram bot | Admin/direktor/resepsion menyulari, sayt orqali tasdiqlangan hisob, bron/qidiruv/check-in-out, xonalar, hisobot, vazifa va murojaatlar; bildirishnoma, kunlik ma’lumot va abonent eslatmalari |
| Android | Yangi UI va telefon/SMS kirish, +998 ortidan 9 raqam va inline xato, yagona ikonkalar, reklama/tanlangan sanatoriyalar joyi, kunduzgi/tungi rejim, offline katalog/bron/QR; 61/61 mobil test |
| Gemini | Haqiqiy ulanish, rozilik, raqam/email niqobi, katalog/FAQ, limit va token sarfi; admin uchun davr/model bo‘yicha sarf va sozlangan narxga asoslangan taxminiy USD hisobot |
| Tezcheck | 2026-10-08 rasmiy signed o‘qish tekshiruvida kassa `active`, `accepts_payments=true`; usullar va balans API ishlaydi. Haqiqiy checkout/webhook hamda har sanatoriyaning direct merchant qabuli hali bajarilmagan |
| Eskiz | SMS API autentifikatsiyasi va standart test SMSi tekshirildi; foydalanuvchi yetib kelganini tasdiqladi. Haqiqiy OTP uchun hisob va matn hali tayyor emas |

Backendni production uchun 100% tayyor deb hisoblashga hali asos yo‘q. Haqiqiy HTTPS API, haqiqiy merchant to‘lovi/webhook va sanatoriyaning direct ulanishi, Eskiz OTP matnini tasdiqlatish, push, staging Redis/S3 hamda real sanatoriya/bank piloti qolgan. Tezcheck kassasi 2026-10-08 o‘qish tekshiruvida faol; bu haqiqiy pul to‘lovi qabuli emas. Payme bevosita ulanishi tanlansa uning rasmiy rekvizitlari va qabul sinovi kerak. Batafsil dalillar va cheklovlar [amalga oshirish holati](docs/IMPLEMENTATION_STATUS.md)da.

## Railway

Railway uchun [`.railway/railway.ts`](.railway/railway.ts) tayyorlandi:
API, domen worker, Telegram, superadmin va hamkorlar paneli; PostgreSQL,
Redis, S3 bucket va private MFA volume. Panellar Railway `PORT`ini oladi,
IPv4/IPv6 ishlaydi; API migratsiyasi faqat pre-deploy bosqichida bajariladi.
`npm run railway:check` lokal konfiguratsiyani, `npm run deploy:check`
production talablarini tekshiradi. Sirlar uchun namuna
[`.railway/.env.example`](.railway/.env.example)da.

Bu cloud deployment dalili emas: haqiqiy Railway environment, HTTPS
domenlar, tasdiqlangan SMS/merchant va Redis/S3 qabul sinovi kerak.
To‘liq joylash tartibi [RAILWAY.md](docs/RAILWAY.md)da. O‘zgarishlar lokal
saqlanadi; GitHubga avtomatik push qilinmaydi.

2026-10-08 yakuniy tekshiruv: backend **99/99**, mobil **56/56**, Flutter
analyzer, TypeScript, API va ikkala panel buildi o‘tdi. Barcha **11 migratsiya**
yangi lokal bazada, inventar exclusion va 4 ledger guard bilan tekshirildi.
Railway `PORT`ini taqlid qilgan ikki panel IPv4/IPv6, `/api` proksisi va
katalogda **200** qaytardi; uch xodim rolida login/cookie/CSRF/logout o‘tdi.
`npm audit`: **0** zaiflik. APKda **57** maxfiy qiymat bayt namunasi, moslik **0**.
Samsungga joriy oddiy `lib/main.dart` debug APK o‘rnatilib ochildi.
Bu lokal dalillar; cloud deployment va haqiqiy provider to‘lovi sinalmagan.

2026-10-06 backend **82/82**, mobil **55/55 unit/widget**, TypeScript, API va ikkala web buildi, Flutter analyzer o‘tdi. Alohida brauzer sinovida 4 suratni yuklash, galereya, tartiblash va olib tashlash ishladi (**1/1**). Yangilangan OpenAPI haqiqiy javoblar bilan tekshirildi. Barcha **10 migratsiya**ning oldingi toza lokal baza dalili va umumiy brauzer to‘plamining avvalgi **11/11** natijasi [holat hujjati](docs/IMPLEMENTATION_STATUS.md)da saqlanadi. Lokal provider javoblari rasmiy merchant qabulining o‘rnini bosmaydi.

Yangilangan bosh sahifa, AI suhbat va bron tasdig‘i yozuvli APK USB orqali Samsung SM-A165F qurilmasiga o‘rnatildi. Avvalgi login sinovida telefon/SMS tasdig‘idan keyin asosiy sahifa ochildi va lokal bazada yangi OTP tasdig‘i, mijoz hamda mobil sessiya qayd etildi. Oxirgi APK ichida 57 ta maxfiy qiymat bayt namunasi tekshirildi, moslik topilmadi. Bu lokal APIga ulanadigan **debug preview**; imzolangan oldingi release namunasi vaqtinchalik `https://api.sihhat.invalid` manziliga ega. Haqiqiy HTTPS manzili belgilangach release qayta yig‘iladi. APKlar va qurilma dalillari repozitoriyaga kiritilmaydi.

## Hisobchi paneli

Direktor hisobchini lavozim bilan taklif qiladi, superadmin tasdiqlaydi.
Hisobchi faqat o‘z sanatoriyasining hisobotini ko‘radi/yuklaydi; bron,
anketa va profilni o‘zgartirish serverda ham taqiqlanadi. Bugun, 7/30/90
kun, tanlangan oy/sana, oldingi davr bilan taqqoslash, onlayn va joyida
to‘lovlar, refund hamda hisob-kitob qoldiqlari bor. CSV Excelda ochiladi;
PDF brauzerning chop etish oynasidan saqlanadi. Davr va summalar ma’nosi,
vakolatlar va tekshiruv tartibi: [HISOBCHI_PANEL.md](docs/HISOBCHI_PANEL.md).

2026-10-08 lokal hisobchini tasdiqlashdagi `CSRF_INVALID`/403 tuzatildi:
API manzil ruxsatlarida ikkala panelning `localhost` va `127.0.0.1`
variantlari bor. Hisobchi taklifi API orqali tasdiqlandi; noto‘g‘ri yoki
yo‘q CSRF tokeni va ruxsatsiz origin rad etilishi saqlanadi. Backend
alohida `sihhat_test` bazasida **88/88**, xato/skipped **0**.
Sozlash tartibi [runbook](docs/RUNBOOK.md)da.

## AI suhbat va bron tasdig‘i

Yordamchi javob va keyingi savolni Gemini orqali tabiiy yozadi; tayyor
salomlashuv yoki majburiy savollar ketma-ketligi yo‘q. Rozilik berilganda
niqoblangan xabar va oxirgi 12 suhbat xabari modelga yuboriladi. Server
taqiqlangan mavzular ro‘yxati va katalog/FAQ/joriy narx hisobini beradi;
model tanlagan katalog IDlari tekshiriladi. AI bron yoki moliyaviy amal
bajarmaydi. 2026-10-05 haqiqiy Gemini ulanishi yangi javob formati bilan tekshirildi.

Bron serverda **CONFIRMED** bo‘lgach **Broningiz tasdiqlandi! Yaxshi dam
oling! Safaringiz yoqimli va xotirjam o‘tsin** yozuvi chiqadi.

2026-10-08 rasmiy signed o‘qish so‘rovlari kassa **active**,
**accepts_payments=true**, Click/Payme/Uzcard/Humo va balans endpointini
tasdiqladi. Tranzaksiya namunasi **0**; bu haqiqiy checkout yoki to‘lov
qabuli emas. Har sanatoriyaning direct merchant ulanishi hamon alohida.

Oldingi 2026-10-04 qayta tekshiruvda Tezcheck API autentifikatsiyasi ishladi;
kassa **draft**, **accepts_payments=false** bo‘lgan va faollashtirish talab
qilingan. Joriy holat yuqoridagi 2026-10-08 tekshiruvida yangilandi.
Sozlash va dalillar [TEZCHECK.md](docs/TEZCHECK.md)da.

Yangi bronlarda `BOOKING_SETTLEMENT_MODE=direct` standart. Har sanatoriyaning
o‘z merchant/kassa ma’lumotlarini kiritish shakli tayyor; faol, tekshirilgan
ulanish hali yo‘q. Haqiqiy checkout `MERCHANT_NOT_READY` bilan to‘xtaydi.
Shaklni saqlash to‘lovni yoqmaydi. Ulanish tartibi
[MERCHANT_CONNECTIONS.md](docs/MERCHANT_CONNECTIONS.md)da.

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

Anketani yuborishda sanatoriyalar tick bilan tanlanadi; faqat tanlangan
sanatoriyalarning faol xodimlariga boradi. Javob berilgan anketa qayta
ochilganda **Javob berilgan** deb ko‘rsatiladi. Direktor profilga Google Maps
yoki Yandex Maps havolasini kiritadi; koordinata yozish talab qilinmaydi.

Android bosh sahifa `Apk xatolari`dagi Sihhat uz namunasiga mos: to‘q yashil
sarlavha/qidiruv, manzarali banner, tezkor kartalar, serverdan olinadigan
sanatoriyalar va beshta pastki navigatsiya tugmasi. O‘z logomiz ishlatiladi.
Katalog, filtr, bron, AI va yordam tugmalari mavjud sahifalarga ulangan.
HOME reklama server faol reklama qaytarganda mashhur sanatoriyalar joyida
chiqadi. Reklama yo‘q, so‘rov kutilmoqda yoki xato bo‘lsa shu joyda
superadmin **Sanatoriyalar → Mashhur** ustunida tick bilan tanlagan
sanatoriyalar ko‘rinadi. Yangi va avvalgi profillar avtomatik tanlanmaydi;
faqat faol va e’lon qilingan tanlangan profillar ko‘rsatiladi.
Banner dekorativ AI manzara; sanatoriya kartalari haqiqiy profil rasmlarini oladi.
Reklama admin tasdiqlagach bepul chiqadi; eski to‘lanmagan reklama hisobi
moliyaviy holati tekshirilgach bekor qilinadi. Bosh sahifa reklamalari har
30 soniyada, ilovaga qaytganda va pastga tortilganda yangilanadi.

Bron sanalar/xonalar va mehmon/tasdiqlash bosqichlariga ajratildi;
sanatoriya telefoni bron oldidan ko‘rsatilmaydi. To‘lovsiz bron yaratilganidan
5 daqiqa o‘tgach yoki **To‘lovni bekor qilish** bosilgach mijoz tarixidan
olinadi; to‘langan bron va xodim/moliya yozuvlari saqlanadi.
Yordam xabari superadminning Telegram botiga javob tugmasi bilan boradi;
botda tasdiqlangan javob ilovadagi suhbatda chiqadi.
Foydalanish tartibi [runbook](docs/RUNBOOK.md)da.

## Androidda internetsiz katalog va tarif tanlash

Ilova sanatoriyalarni kodga yozib qo‘ymaydi: serverdagi barcha katalog
sahifalarini, to‘liq profillar, xona turlari va tariflarni telefonga yuklaydi.
Yuklangan ma’lumot va rasmlar internet bo‘lmaganda ham ochiladi; saqlangan
katalogning muddati tugab yo‘qolmaydi. Ilova ochilganda, unga qaytilganda,
Android internet qaytganini bildirganda va faol holatda har daqiqada yangilaydi.
Yangi e’lonlar yuklanadi, serverdan chiqarilganlari muvaffaqiyatli yangilanishda
ro‘yxatdan olinadi. Birinchi yuklash va telefon/SMS orqali dastlabki kirish
uchun aloqa kerak.

Sanatoriya profilida tariflar xona turi bo‘yicha ko‘rsatiladi. **Shu tarifni
tanlash** sana/xona shaklini tanlangan tarif bilan ochadi; qidirish, tarif va
sana tanlash internetni talab qilmaydi. **To‘lovga o‘tish** joriy narx va bo‘sh
joyni serverda tekshiradi, keyin ism/telefon va amaldagi shartlar tasdiqlanadi.
Bolalar va qo‘shimcha xona sozlamalari yopiq bo‘limlarda. Shaxsiy profilning
ismi va telefoni ham saqlanadi va internetsiz darhol ochiladi; hisobdan
chiqilganda shaxsiy ma’lumot o‘chadi. AI oynasida Gemini yozuvi va doimiy
checkbox yo‘q; tashqi AI uchun rozilik birinchi xabardan oldin alohida olinadi.
Foydalanish va tekshirish tartibi [runbook](docs/RUNBOOK.md)da.

## Internetsiz bronlar, suratlar va yordam

**Bronlar** ro‘yxati, har bir bronning mehmon/xona tafsilotlari va
tasdiqlangan bron QR kodi telefonda hisob va API manziliga bog‘langan holda
saqlanadi. Oldin ochilmagan bron tafsilotlari ham internet bilan oldindan
yuklanadi; internet uzilganda saqlangan nusxa ochiladi. Barcha sahifalar
olinmaguncha eski tarix saqlanadi. Hisobdan chiqish yoki boshqa hisobga
o‘tish shaxsiy bronlar nusxasini tozalaydi. To‘lovsiz bronning 5 daqiqalik
muddati internet bo‘lmasa ham amal qiladi.

2026-10-07 lokal tekshiruvda Samsung SM-A165Fdagi ikkita Android
force-stopdan keyin sessiya va bron tiklandi. Oxirgi ochilishda ilovaning
barcha API so‘rovlari rad etilib, saqlangan bron tafsilotlari, QR, katalog
va to‘rtta surat ochildi. Sinov to‘lovi lokal simulator orqali bajarildi.
Telefondagi avvalgi hisob va sozlamalar sinovdan keyin qayta tiklandi.

**Azimshifo** lokal sinov sanatoriyasi superadmin panelida yaratildi;
direktor anketani, rasmlar/hujjatni, xona va tarifni qo‘shib tekshiruvga
yubordi. Superadmin sanatoriya va direktor taklif qilgan resepshinni
tasdiqladi. Profil tasdiqdan oldin katalogda yo‘q, tasdiqdan keyin katalog,
direktor va resepshin panellarida bor. Ma’lumotlar sinov uchun, haqiqiy
sanatoriya rekvizitlari emas. Login/parollar faqat lokal
`.local/AZIMSHIFO_KIRISH.txt` va `.local/SUPERADMIN_KIRISH.html`da.
Qayta tekshiruv: backend **82/82**, Flutter analyzer xatosiz va **56/56**;
ikkala web panel buildi o‘tdi.

Faol va tasdiqlangan sanatoriya abonenti bo‘lmasa ham katalogda ko‘rinadi;
onlayn bron imkoniyati alohida tekshiriladi. Shu sabab lokal bazadagi
**Mirsaid** sanatoriyasi yana ko‘rinadi. Qoralama yoki arxivdagi profil
ommaga chiqarilmaydi.

Sanatoriya profiliga bir tanlashda 4 ta yoki undan ko‘p surat yuklash,
30 tagacha saqlash, tartibini o‘zgartirish va olib tashlash mumkin.
Android va panelda suratlar bitta galereyada chap/o‘ng tugmalari bilan
almashadi; Androidda barmoq bilan surish ham ishlaydi. **Chimyon** va
**Zomin** lokal profillariga rasmiy saytlardan 4 tadan surat joylandi.
Manbalar va qayta import qilish: [SANATORIUM_PHOTOS.md](docs/SANATORIUM_PHOTOS.md).

Yordam suhbatida javob har 5 soniyada va sahifaga qaytganda yangilanadi.
Superadmin botidagi **✍️ Javob yozish** → matn → **Yuborish** oqimi shu
mijozning ilovadagi murojaatiga javob saqlaydi. Sozlash:
[TELEGRAM_BOT.md](docs/TELEGRAM_BOT.md).

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
| `apk` | Joriy debug APKning lokal nusxasi; bu papka Gitga va Railwayga yuborilmaydi |

## Gemini, Eskiz va Tezcheck sozlamalari

API kalitlari faqat backendga beriladi. Lokal maxfiy fayl `.local/secrets/providers.env`; boshqa muhitda `SIHHAT_SECRETS_FILE` yoki server environment ishlatiladi. `.env.example` fayllarida faqat bo‘sh maydonlar va namunalar bor. Kalit/parollar, signing fayllari, demo hisoblar, bazalar, media, keshlar va APKlar Gitdan chiqarilgan.

Tezcheck uchun [integratsiya va xavfsiz tekshirish](docs/TEZCHECK.md): `npm run tezcheck:check`. Har sanatoriyaning o‘z nomidagi merchant ulanishi uchun [sozlamalar](docs/MERCHANT_CONNECTIONS.md) tayyor. `BOOKING_SETTLEMENT_MODE=direct` yangi bronni umumiy platforma kassasiga yubormaydi; faol shaxsiy merchant ulanishi hali yo‘q, checkout `MERCHANT_NOT_READY` qaytaradi. Haqiqiy o‘tkazma yoqilmagan. Provider cancellation refund emas; avtomatik refund API hujjatda yo‘qligi sabab u bajarilmaydi.

AI sarfi admin hisobotida va `GET /superadmin/ai/usage?from=...&to=...`da ko‘rinadi. `AI_INPUT_USD_PER_MILLION`/`AI_OUTPUT_USD_PER_MILLION` bo‘sh bo‘lsa xarajat o‘ylab topilmaydi. Sozlangan qiymatlar joriy Gemini modeliga qo‘llanadigan taxmin; haqiqiy invoice va ledger xarajati alohida.

Gemini uchun backendda `AI_ADAPTER=gemini`, `GEMINI_API_KEY` va `GEMINI_MODEL` sozlanadi. Hozirgi model `gemini-3.1-flash-lite`; default kunlik limit 100 so‘rov, javob chegarasi 768 token. Model tasdiqlangan katalog va FAQ identifikatorlarini tanlaydi; bron yoki moliyaviy amalni bajarmaydi. Kalit APK yoki web mijoziga yuborilmaydi.

Eskiz uchun asosiy kabinet parolidan farq qiladigan SMS API login/paroli yoki token talab qilinadi. Adapter `SMS_ADAPTER=eskiz`; kirish kodi matni `ESKIZ_OTP_TEMPLATE` bilan beriladi. Hisob haqiqiy yuborishga tayyor bo‘lib, aynan shu matn tasdiqlangandan keyingina `ESKIZ_OTP_APPROVED=true` qilinadi. Hozir bu qiymat `false`; development muhiti lokal OTP adapteridan foydalanadi. Standart test SMSi yetib kelishi haqiqiy kirish kodi ruxsatini tasdiqlamaydi. Batafsil sozlash [runbook](docs/RUNBOOK.md)da.

## Telegram bot

Bot: [@sihhat_admins_bot](https://t.me/sihhat_admins_bot). Xodim saytda **Telegram bot → Telegramga ulash**ni bosadi, botda **Start** qiladi va saytga qaytib Telegram hisobini tasdiqlaydi. Direktor/resepsion roli saytdagi mavjud tayinlovdan olinadi; botdagi tanlov orqali huquq berilmaydi.

Server tokeni `.local/secrets/providers.env`da, Gitga kiritilmaydi. `npm run telegram:check` ulanishni tekshiradi, `npm run telegram:configure` o‘zbekcha buyruqlarni sozlaydi, `npm run dev:telegram` bot workerini alohida ishga tushiradi. Windowsda tayyor build va `TELEGRAM_MODE=polling` yoki `webhook` bilan `npm run local:start` API, domen worker va botni birga ochadi. Kompyuter o‘chsa lokal bot to‘xtaydi; doimiy server va telefon uchun HTTPS kabinet manzillari hali kerak. Tugmalar, ruxsatlar va sozlash: [Telegram yo‘riqnomasi](docs/TELEGRAM_BOT.md).

## Kerakli dasturlar va kutubxonalar

Quyidagi versiyalar ushbu loyihada tekshirilgan muhit va mavjud manifestlarga
asoslanadi. JavaScript paketlarining aniq versiyalari `package-lock.json`da,
Flutter paketlariniki `apps/mobile/pubspec.lock`da saqlanadi.

| Dastur yoki xizmat | Qachon kerak |
| --- | --- |
| Node.js **24.15.0 yoki yangi** va npm (tekshirilgan: **11.12.1**) | API, worker, Telegram bot va ikkala web panelni qurish/ishga tushirish |
| PostgreSQL **18** (tekshirilgan: **18.6**) | Baza; `bin` papkasida `pg_ctl`, `pg_isready`, `psql`, `pg_dump`, `pg_restore` bo‘lishi kerak |
| Windows PowerShell | `local:start`, `local:status`, `local:stop` skriptlari |
| Flutter **3.47.5**, Dart **3.13.4** | Mobil paketlar, sinov va APK qurish; Dart talabi `pubspec.yaml`da `^3.13.4` |
| Android SDK | APK uchun Platform **36**, Build-Tools, Platform-Tools (`adb`) va NDK **28.2.13676358**; bu qiymatlar joriy Flutter SDKdan olinadi |
| JDK / Android Studio JBR | Android Gradle buildi; bu kompyuterda **Java 25.0.3** ishlatilgan. Gradle **9.3.1** wrapper orqali olinadi |
| Python 3 | APK ichidagi maxfiy ma’lumotlarni tekshirish; skript uchun alohida `pip` kutubxonasi kerak emas |
| Playwright Chromium | Faqat web brauzer sinovlari uchun: `npx playwright install chromium` |
| Redis va private S3 storage | Railway/production worker va media uchun; lokal muhitda DB worker va fayl storage ishlatiladi |

### API, saytlar va vositalar

Bu paketlarning barchasi loyiha ildizidagi **`npm ci`** orqali birga
o‘rnatiladi. Har bir papkada alohida `npm install` bajarish shart emas;
`@sihhat/ui` va `@sihhat/api-client` ham npm workspaces orqali ulanadi.
Jadvaldagi versiyalar manifestlarda ko‘rsatilgan asosiy versiyalardir.

| Vazifa | Kutubxonalar |
| --- | --- |
| API va Swagger | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger` **11.x**; `reflect-metadata` **0.2.x**, `rxjs` **7.8.x** |
| PostgreSQL va migratsiyalar | `@prisma/client`, `@prisma/adapter-pg`, `prisma` **7.x**; `pg` **8.x** |
| Konfiguratsiya va HTTP himoyasi | `dotenv` **17.x**, `zod` **4.x**, `helmet` **8.x**, `cookie-parser` **1.4.x** |
| Redis va navbatlar | `bullmq` **5.x**, `ioredis` **5.x** |
| Media va rasmlar | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` **3.x**; `sharp` **0.35.5** |
| Ikkala web panel va umumiy UI | `next` **16.x**, `react` va `react-dom` **19.2.x**, `lucide-react` **0.468.x** |
| TypeScript va tur ta’riflari | `typescript` **5.9.x**, `tsx` **4.x**; `@types/node` **24.x**, `@types/react`/`@types/react-dom` **19.2.x**, `@types/express` **5.x**, `@types/pg` **8.x**, `@types/cookie-parser` **1.4.x** |
| Tekshiruv va format | `@playwright/test` **1.56.x**, `prettier` **3.6.x** |
| Railway konfiguratsiyasi | `railway` SDK **3.13.1**; joylash tartibi [RAILWAY.md](docs/RAILWAY.md)da |

### Flutter Android kutubxonalari

| Kutubxona | `pubspec.yaml` talabi va vazifasi |
| --- | --- |
| `flutter`, `flutter_localizations` | Flutter SDK; interfeys va til sozlamalari |
| `cupertino_icons` | `^1.0.8`; ikonkalar |
| `http` | `^1.5.0`; API so‘rovlari |
| `flutter_secure_storage` | `^10.0.0`; qurilmada sessiya va saqlangan ma’lumotlar |
| `url_launcher` | `^6.3.2`; tashqi havolalarni ochish |
| `qr_flutter` | `^4.1.0`; bron QR kodi |
| `path_provider` | `^2.1.6`; lokal kesh/fayl papkalari |
| `flutter_test`, `integration_test` | Flutter SDK; unit/widget va qurilma sinovlari |
| `flutter_lints` | `^6.0.0`; kod tekshiruvi |

Paketlarni olish va Android muhitini tekshirish uchun Flutter `PATH`da
bo‘lsin; loyiha ildizidan:

```powershell
flutter doctor
flutter doctor --android-licenses
Push-Location apps/mobile
flutter pub get
Pop-Location
```

Loyihadagi mobil skriptlar `.local/tools/flutter` va
`apps/mobile/android/local.properties`dagi SDK yo‘lidan foydalanadi.
SDK boshqa joyda bo‘lsa, `SIHHAT_FLUTTER_BIN`ni `flutter.bat`ga,
`ANDROID_HOME`ni Android SDKga va `JAVA_HOME`ni JDKga yo‘naltiring.
`SIHHAT_PG_BIN` PostgreSQLning `bin` yo‘lini belgilaydi.
Batafsil misollar [mobil README](apps/mobile/README.md) va
[runbook](docs/RUNBOOK.md)da.

## Tayyor APK

Joriy fayl: **[apk/sihhat-uz-preview.apk](apk/sihhat-uz-preview.apk)**.
2026-10-10 yangi UI bilan yig‘ilgan Android **ARM64 debug** nusxa;
Samsung SM-A165Fga ma’lumotlarini saqlagan holda o‘rnatildi. API manzili
`http://127.0.0.1:4000`, lokal demo SMS oynasi yoqilgan.
Flutter analyzer xatosiz, **61/61** mobil test o‘tdi; APKda **57** maxfiy
qiymat bayt namunasi tekshirildi, moslik **0**. `apk` va `.local/releases`
nusxalarining SHA256 qiymati bir xil.
Telefon USB debugging bilan ushbu kompyuterga ulangan, API ishlayotgan
bo‘lishi kerak. `npm run local:start` USB reverse ulanishini sozlaydi.
Internet orqali mustaqil ishlaydigan release uchun haqiqiy HTTPS API
va signing konfiguratsiyasi bilan qayta build kerak.

Build skripti asl faylni `.local/releases/sihhat-uz-preview.apk`ga yozadi.
Keyingi builddan so‘ng `apk` papkasidagi nusxani yangilash:

```powershell
npm run mobile:preview -- <android-serial>
New-Item -ItemType Directory -Path apk -Force | Out-Null
Copy-Item -LiteralPath .local/releases/sihhat-uz-preview.apk -Destination apk/sihhat-uz-preview.apk
python scripts/check-apk-secrets.py apk/sihhat-uz-preview.apk
```

`apk/` va `*.apk` Gitdan chiqarilgan; `apk/` Railway uploadidan ham
chiqarilgan. APK GitHubga yuklanmaydi.

## Lokal ishga tushirish

Windowsda tayyorlangan API, domen worker, sozlangan Telegram bot, ikkala sayt va USBdagi Android ulanishini
bitta buyruq bilan ochish mumkin:

```powershell
npm run local:start
npm run local:status
```

Kod yoki migratsiyalar yangilanganda `local:start`dan avval `npm run db:local`,
`npm run db:migrate`, `npm run build:api` va `npm run build:web`ni bajaring.
PostgreSQL uzilgan ishidan tiklanayotgan bo‘lsa, `db:local` ulanishlar
tayyorligini 10 daqiqagacha kutadi; holat `.local/postgres.log`da.

Superadmin — http://localhost:3000, direktor/resepsion — http://localhost:3001.
Xizmatlar fon rejimida ishlaydi. Kompyuter qayta ochilganda `local:start`ni
yana bajaring; to‘xtatish — `npm run local:stop`. Bu buyruq bazani to‘xtatmaydi
va ma’lumotlarni o‘chirmaydi. Jarayon dalillari va loglar `.local/runtime`da.
`local:status` bot holatini ham ko‘rsatadi. Telegram o‘chirilgan konfiguratsiyada
bot `disabled` deb chiqadi; qolgan xizmatlar ochiladi. Bot yoqilganida startup
rasmiy Telegram autentifikatsiyasi va tanlangan rejim tekshiruvi tugashini kutadi.

2026-10-07 qayta ishga tushirishda barcha beshta xizmat `running` bo‘ldi;
11 migratsiya lokal bazaga qo‘llandi. API readiness va ikkala panel **HTTP 200**,
superadmin, direktor va resepshn kirishi/rol/ma’lumot/chiqishi tekshirildi.
Telegramning rasmiy API ulanishi, joriy polling va domen worker faolligi
tasdiqlandi. Joriy debug APK Samsungga o‘rnatilib ochildi, USB API ulanishi
tayyor. Bu lokal tekshiruvlar; batafsil dalil [holat hujjati](docs/IMPLEMENTATION_STATUS.md)da.

`npm run superadmin:local` faqat development va `127.0.0.1:55432/sihhat`
bazasida alohida egasi hisobini yaratadi; mavjud demo hisoblarni saqlaydi.
Login, parol va MFA uchun **`.local/SUPERADMIN_KIRISH.html`**ni Chrome/Edge
brauzerida oching. Unda joriy 6 raqamli kod ko‘rinadi; `.txt` nusxa ham bor.
Qayta bajarish parolni almashtirmaydi. Ushbu fayllar maxfiy va Gitga kirmaydi.
Production uchun runbookdagi `bootstrap` tartibi alohida qo‘llanadi.

Telefon uchun `apk/sihhat-uz-preview.apk` lokal **debug** APK;
build skriptining asl nusxasi `.local/releases/sihhat-uz-preview.apk`da.
USB debugging va shu kompyuterga USB ulanishi kerak; `local:start` ulangan
qurilmalarda `adb reverse tcp:4000 tcp:4000`ni qayta sozlaydi. APKni qurish
va o‘rnatish — `npm run mobile:preview -- <serial>`. Telefonni qayta ulagan
bo‘lsangiz, `local:start`ni yana bajaring. SMS kodi lokal demo panelidan olinadi.

Yangi kompyuterda yuqoridagi dasturlarni o‘rnatgach, loyiha ildizida
quyidagi tartibni bajaring. Bu buyruqlar lokal bazani tayyorlaydi,
API va ikkala panelni quradi, so‘ng xizmatlarni ochadi:

```powershell
npm ci
npm run db:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build:api
npm run build:web
npm run local:start
npm run local:status
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

- Sihhat uz sanatoriyalarning abonent to‘lovidan daromad oladi; reklama admin tasdiqlagach bepul chiqadi.
- Yangi bronlarda sanatoriyaning o‘z merchant hisobiga to‘lash talabi qo‘llanadi; haqiqiy ulanish va direct settlement qabul sinovi hali bajarilmagan. Oldingi platforma to‘lovlari tarixi saqlanadi.
- Birinchi versiyada butun xona bron qilinadi. Bir sanatoriyadan bir yoki bir nechta xona olish mumkin.
- Mijoz uchun Android APK; direktor va resepsion uchun bitta sayt va bitta kirish sahifasi; superadmin uchun alohida sayt.
- Sanatoriyani superadmin qo‘shadi. Anketa superadmin tasdiqlaganidan keyin e’lon ko‘rinadi.
- Direktor qo‘shgan resepsion superadmin tasdig‘idan keyin ishlaydi.
- Dasturlash backenddan boshlanadi.

Hujjatlardagi «taklif» va «ishga tushirishdan oldin belgilanadi» yozuvlari hali foydalanuvchi tasdiqlamagan yoki tashqi hamkor bilan kelishilishi kerak bo‘lgan qarorlarni bildiradi. Ularni tasdiqlangan talablar bilan aralashtirmang.

Hujjat tili: o‘zbekcha. Tadqiqot sanasi: 2026-09-30.
