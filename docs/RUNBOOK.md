# Sihhat uz — ishga tushirish va xizmat ko‘rsatish

Buyruqlar loyiha ildizidan bajariladi. Tekshiruvlarning haqiqiy natijasi [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)da, talablar [arxitektura](SIHHAT_UZ_ARXITEKTURA.md)da.

## Web panellar yangi UI

Amaldagi ikkala Next.js panel umumiy `packages/ui/src` dizaynini ishlatadi.
Superadmin, direktor/resepsion va hisobchi uchun menyu ruxsatga qarab chiqadi.
**Ish jarayoni / Moliya / Aloqa / Sozlamalar** guruhini bosing, keyin
kerakli sahifani tanlang; joriy sahifa guruhi avtomatik ochiladi.
Jadvalda asosiy amal yonidagi **…** qo‘shimcha amallarni ochadi; Esc yoki
tashqariga bosish yopadi. Telefon menyusi ham Esc/tashqariga bosish bilan
yopiladi, klaviatura fokusi menyuda qoladi. Yuqoridagi oy/quyosh tugmasi
rang rejimini almashtiradi va brauzerda saqlaydi.

Lokal shrift va illyustratsiya fayllari ikkala panelning `public` papkasida.
Assetlar qayta kerak bo‘lsa `npm run web:assets`, keyin:

```powershell
npm run check
npm run build:web
npm run local:stop -- -Only superadmin,director
npm run local:start -- -Only superadmin,director
```

Panel manzillari `http://localhost:3000` va `http://localhost:3001`.
API kerak; odatdagi lokal xizmatlarni loyiha ishga tushirish tartibi bilan
oching. UI API, MFA, CSRF, faolsizlik, RBAC va versiya tekshiruvlarini ishlatadi.

32 ta haqiqiy React ekranini maskalangan namunaviy javoblar bilan
suratga olish: `node UI/web/tools/implemented.cjs`.
26 bo‘limni desktop tungi va telefon kunduzgi ko‘rinishda, qo‘shimcha amal,
parol ko‘rsatish, rangni saqlash va drawer bilan tekshirish:
`node UI/web/tools/implemented.cjs --audit`.
Private hisobotlar `.local/web-ui-*-validation.json`ga yoziladi;
rasmlar `UI/web/joriy`da. Bu sinovlar haqiqiy provider qabuli emas.
API bilan oqimlar uchun mavjud ajratilgan `sihhat_test` fixture tartibini
qo‘llang; oddiy lokal hisoblar bilan mutatsiya auditini bajarmang.

## Web UI rasmlarini ko‘rish va chiqarish

`UI/web/index.html`ni brauzerda oching. Galereya va `preview.html` server va
internetsiz ishlaydi; lokal shriftlar/ikonka/rasm assetlari `assets/`da.
**Yangi dizayn / Hozirgi UI / Taqqoslash**, panel roli, qidiruv va 1:1 zoom
bor. Ekran raqami bilan tuzatish bildirish mumkin: **04 — Mashhur tanlovi**,
**13 — reklama**, **24 — hisobchi**. Ro‘yxat va topilmalar
[UI/web/README](../UI/web/README.md) hamda [REVIEW](../UI/web/REVIEW.md)da.

Rasmlarni qayta chiqarish: `node UI/web/tools/render.cjs`. Amaldagi
panel rasmlarini ham yangilash: 3000/3001 portlarda ikkala joriy build
ishlayotganida `node UI/web/tools/render.cjs --all`. Shu headless brauzer
barcha API so‘rovlarini namunaviy javobga almashtiradi; live hisobga kirmaydi
va bazaga o‘zgartirish yubormaydi. API yoki telefonni uzish kerak emas.
Hisobotlar private `.local/web-ui*-validation.json`da. PNGlar `fullPage`;
viewport desktopda 1440×1000, telefonda 390×844.

Bu yangi web dizaynlar ko‘rib chiqish namunalari. Ishlayotgan panellarning
React komponentlari hali almashtirilmagan.

## Android UI konseptlarini ko‘rish

`UI/index.html`ni fayl menejeridan brauzerda oching. Server, internet,
build yoki yangi dependency kerak emas. Rasm ustiga bosish
kattalashtiradi; **1:1**, oldingi/keyingi tugmalar va klaviaturadagi
chap/o‘ng o‘qlar ishlaydi. **Esc** oynani yopadi. PNGlarning o‘zini ham
`UI` papkasidan ochish mumkin.

Rasm raqami va ekran harfi bilan fikr bildiriladi: masalan, **03B** yoki
**07C**. [UI/README](../UI/README.md)da ro‘yxat,
[dizayn tavsiyalari](../UI/DESIGN_GUIDE.md)da rang/o‘lcham/ikonka tamoyillari,
[prompts.json](../UI/prompts.json)da asl promptlar bor.
2026-10-10 v1 maketlar uslubi ichki sahifalar va telefon/SMS kirishga
Flutter widgetlari bilan joriy etildi. Katalog, filtr, sanatoriya/tarif,
galereya, bron/to‘lov/QR, AI, profil, yordam va xabarlar yangilandi.
Tailwind CSS Androidga bevosita ulanmaydi; rang, oraliq va komponent
tamoyillari `apps/mobile/lib/concept_ui.dart`da berilgan. Shriftlar va
Lucide ikonkalar ilovaga lokal qo‘shilgan. Mobil tekshiruv:
`npm run mobile:check`; joriy APKni qayta yig‘ish/o‘rnatish va `apk`
papkasidagi nusxani yangilash [README](../README.md#tayyor-apk)da.

## Railway

Railway konfiguratsiyasi `.railway/railway.ts`da. Lokal sozlama tekshiruvi:
`npm run railway:check`; builddan keyingi production preflight:
`npm run deploy:check`. Lokal adapterlar bilan preflight xato qaytarishi
kutiladi. API + worker + Telegram + ikkala panel, database/Redis, S3,
HTTPS domenlar, shared sirlar va birinchi admin yaratish tartibi
[RAILWAY.md](RAILWAY.md)da. Lokal ishga tushirishni cloud deployment
yoki provider qabuli deb hisoblamang.

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

Yangi hamkor uchun superadmin **Sanatoriyalar → Yangi sanatoriya**da
profil yaratadi, shu sanatoriyani tanlab **Jamoa va ruxsatlar → Direktor
tayinlash**da direktor hisobini ochadi. Vaqtinchalik parol bir marta
ko‘rsatiladi; direktor ilk kirishda uni almashtiradi. Direktorning
**Xodim taklif qilish**idan yaratilgan resepshin superadmin **Jamoa va
ruxsatlar → Tasdiqlash**da ma’qullaguncha faol bo‘lmaydi. Boshqa panelda
yangi taklif yaratilgan bo‘lsa, superadmin jamoa sahifasini yangilab ochadi.
Tasdiqlangan resepshin ham ilk kirishda parolni almashtiradi.

2026-10-07 lokal **Azimshifo** sinovi shu oqim bilan bajarildi. Login va
parollar `.local/AZIMSHIFO_KIRISH.txt`da; superadmin MFA bilan kirishi
`.local/SUPERADMIN_KIRISH.html`da. Profil, manzil, STIR, rasmlar/hujjat
va tariflar namuna; ularni haqiqiy sanatoriya ma’lumoti sifatida ishlatmang.
Profil qoralama/tekshiruvda katalogga kirmaydi; superadmin tasdig‘idan
keyin faol profil katalogda chiqadi. Online bronning abonent/to‘lov
tayyorligi alohida tekshiriladi.

Direktor **Sanatoriya profili → Tahrirlash**ni ochadi. Superadmin shu
sanatoriyani **Sanatoriyalar → Profilni ko‘rish** orqali ochadi.

1. Asosiy maydonlarni kiriting; tavsif kamida 30 belgi, STIR 9 raqam,
   telefon `+998` va 9 raqam bo‘lishi kerak. Xatolar tegishli maydon ostida
   yoziladi. Progress faqat to‘g‘ri to‘ldirilgan majburiy maydonlarni sanaydi.
2. Sharoitlar va xizmatlarda mavjudlarini belgilang; belgilanmagan variant
   mavjud emas deb ko‘rsatiladi. Hech biri oldindan avtomatik belgilanmaydi.
   Oldingi maxsus yozuvlar ham tanlovda qoladi. Narx va cheklovlarni tavsifga
   yozing; belgi xizmat tarifga kiritilganini anglatmaydi.
   Joylashuv uchun Google Maps yoki Yandex Mapsdagi **Ulashish** havolasini
   **Xarita havolasi**ga qo‘ying. Kenglik/uzunlik kiritish talab qilinmaydi;
   qisqa yoki joy nomiga berilgan havola ham saqlanadi. Faqat ruxsat etilgan
   HTTPS xarita domenlari qabul qilinadi; server qisqa havolani ochib chiqmaydi.
3. Xizmat shartlarini qabul qilib, **Saqlash va rasmlarga o‘tish**ni bosing.
   Saqlash xatosida sahifa o‘zgarmaydi va kiritilgan qiymatlar saqlanadi.
   Muvaffaqiyatli saqlashdan keyin **Rasmlar va hujjatlar** ochiladi.
4. **Rasm yuklash**da bir vaqtning o‘zida 4 ta yoki undan ko‘p surat tanlash
   mumkin: jami 30 tagacha, har biri 8 MBgacha, JPEG/PNG/WebP.
   Suratlar bitta galereyada chap/o‘ng tugmalari bilan almashadi.
   **Oldinroqqa / Keyinroqqa** tartibni saqlaydi; birinchi surat katalog
   muqovasi. **Suratni olib tashlash** uni qoralamadan oladi. Tasdiqlangan
   profil yangi tahrir tasdiqlanmaguncha avvalgi rasmlar bilan qoladi.
   Kamida bitta ommaviy rasm, bitta xususiy hujjat, faol xona va boshlang‘ich
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

Sarlavha **Sihhat uz**. Interfeys `Apk xatolari`dagi namuna asosida to‘q
yashil sarlavha, qidiruv, manzarali banner, tezkor tugmalar, gorizontal
sanatoriya kartalari va pastki navigatsiyaga ega. Logo o‘zimizniki.
Qidiruv matni **Sanatoriyalar** bo‘limiga uzatiladi; hudud/sharoit/narx
filtri va sahifalash ishlaydi. Kichik ekran yoki katta shrift uchun tezkor
kartalar ikki ustunga o‘tadi. Banner dekorativ AI tasvir, sanatoriya
kartalari esa API profil rasmlari va mavjud reytingni ko‘rsatadi.

**HOME** reklama server ro‘yxati bo‘sh bo‘lmagandagina ko‘rinadi. Reklama
yo‘q, so‘rov kutilmoqda yoki xato bo‘lsa sarlavha, placeholder, spinner va
unga tegishli padding yaratilmaydi. Reklama keshda saqlanmaydi; public
yangilik va katalog keshi boshqa hostdan olinmaydi. **POPUP** alohida
kirish dialogi; bo‘sh ro‘yxatda chiqmaydi va yopish tugmasi mavjud.

**Reklamalar → Tasdiqlash → Reklamani bepul joylash**: tasdiqlangan,
faol sanatoriyaga tegishli reklama belgilangan boshlanish/tugash oralig‘ida
chiqadi. Invoice to‘lovi talab qilinmaydi. Eski **Bepul joylash kutilmoqda**
reklamasini shu tugma bilan qayta tasdiqlang: to‘lanmagan invoice `VOID`
bo‘ladi; haqiqiy to‘langan invoice va ledger saqlanadi. To‘lov holati noaniq
bo‘lsa avval moliyaviy solishtirish talab qilinadi. Muddati o‘tgan reklama
ko‘rsatilmaydi. APK har 30 soniyada, ilovaga qaytganda va pastga tortganda
reklamani yangilaydi.

**Anketalar → Anketa yaratish**da sanatoriyalarni tick bilan belgilang;
kamida bittasi kerak. Faqat belgilangan sanatoriyalarning faol xodimlari
qabul qiladi. Javob saqlangach **Javob berilgan** yozuvi chiqadi; bir xil
javobni qayta yuborish qo‘shimcha yozuv yaratmaydi.
**Savollarni ko‘rish** savol turi/majburiyligini ochadi; **Javobimni ko‘rish**
saqlangan javobni ko‘rsatadi. Superadmin jadvalda javoblar/qabul qiluvchilar
sonini ko‘radi. Sanalar `05.10.2026` shaklida, vazifa/reklama vaqtlari
Toshkent vaqtida soat va daqiqa bilan ko‘rsatiladi. Kalendar sanasi
tozalansa bugungi sanaga qaytadi.

Bron: sanatoriya profilida xona turi va **Shu tarifni tanlash** →
sana/xona/mehmon soni → **To‘lovga o‘tish** → ism/telefon/shartlar →
**Bronni tasdiqlash**. Bola yoshi alohida tanlanadi; sanatoriya telefoni
oldindan ko‘rsatilmaydi. To‘lovsiz bron yaratilganidan **5 daqiqa** o‘tgach
mijoz tarixidan olinadi. **To‘lovni bekor qilish** serverda tasdiqlangach
darhol ro‘yxat va telefondagi nusxadan olinadi. Standart `HOLD_MINUTES=5`,
`TEZCHECK_HOLD_MINUTES=5`; dastlabki hold eski kattaroq sozlamada ham
5 daqiqadan oshmaydi. Bazadagi moliya, xodim tarixi va to‘langan yoki
refund qilingan bronlar saqlanadi.
`HOLD` va `PAYMENT_PENDING`ni bekor qilishda providerning to‘lovsiz holati
tasdiqlanadi. To‘langan bron refund oqimidan foydalanadi; noaniq provider
holatida rezerv saqlanadi.

### Androidda internet bo‘lmaganda

Dastlabki kirish va yuklashdan keyin katalog, qidirish/filtrlar, sanatoriya
profili, yuklangan rasmlar, xona turlari va tariflar telefonda saqlanadi.
Shaxsiy profil ismi/telefoni ham saqlanadi; qayta ochishda server javobi
kutilmaydi. Serverdagi sessiya background tekshiriladi; logout yoki server
tasdiqlagan bekor qilish shaxsiy nusxani o‘chiradi. Ommaviy katalog qoladi.
Ma’lumotlar APK ichiga qattiq yozilmagan va yetti kundan keyin yo‘qolmaydi.

Ilova ochilganda/resumeda, Android internetga qayta ulanganda va faol
holatda har daqiqada barcha katalog sahifalari tekshiriladi. Yangi
sanatoriyalar, to‘liq profil/tariflar va rasmlar oldin ochilmasa ham yuklanadi.
To‘liq ro‘yxat kelmaganda eski nusxa saqlanadi. Muvaffaqiyatli yangilanish
yangi e’lonlarni qo‘shadi va e’londan olinganlarni ro‘yxatdan chiqaradi.
Ilova butunlay yopiq bo‘lsa yuklash keyingi ochilishda davom etadi.

**Bronlar** ham barcha sahifalari bilan hisob va API hostiga bog‘lab
xavfsiz xotirada saqlanadi. Xona/mehmon tafsilotlari, narx, sana, serverdan
oxirgi olingan holat va tasdiqlangan bronning QR kodi internet uzilganda
ochiladi; saqlangan nusxa ekanligi ko‘rsatiladi. Ochilmagan bron tafsilotlari
ham oldindan olinadi. Tugallanmagan sahifalash eski tarixni o‘chirmaydi.
Logout/boshqa hisob shaxsiy nusxani tozalaydi; kech kelgan eski javob uni
qayta yaratmaydi. To‘lovsiz bron 5 daqiqada offline nusxadan ham olinadi.
Yangi bron, to‘lov, bekor qilish va yangi holatni tasdiqlash aloqa talab qiladi.

Faol, nashr qilingan sanatoriyaning abonent muddati katalog ko‘rinishini
yashirmaydi. Abonent/tarif/merchant talablari **onlayn bron** uchun alohida
tekshiriladi. Shuning uchun lokal **Mirsaid** profili ko‘rinadi, lekin
to‘lov sozlamasi tayyor bo‘lmasa onlayn bron ochilmaydi. Chimyon va Zomin
4 tadan haqiqiy surat bilan nashr qilingan; manbalar/import tartibi
[SANATORIUM_PHOTOS.md](SANATORIUM_PHOTOS.md)da. Galereyada chap/o‘ng yoki
surish bilan surat almashtiriladi, rasmlar telefonga ham yuklanadi.

Tarif profilida xona turi bo‘yicha tanlanadi. **Sana va xona** sahifasi
internetsiz ishlaydi; **Bolalar bilan kelaman** va **Qo‘shimcha xona**
kerak bo‘lganda ochiladi. **To‘lovga o‘tish** serverda joriy narx va bo‘sh
joyni hisoblaydi. Internet bo‘lmasa tanlovlar shu sahifada qoladi va aloqa
so‘raladi. Yakuniy shartlar server quoteidan olinadi; offline narx
yakuniy hisob yoki tasdiqlangan bron deb ko‘rsatilmaydi.

Qo‘lda tekshirish: internet bilan ilovaga kiring va yuklash tugashini kuting;
internet/API ulanishini uzing, ilovani qayta oching → katalog/qidirish →
sanatoriya/tarif → sana/xona va **Profil**ni ko‘ring. **To‘lovga o‘tish**da
aloqa so‘ralishi kerak. Ulanishni tiklang va yangi/yangilangan e’lon hamda
tarif avtomatik kelishini tekshiring. APK debug/local ekanini dalilda yozing.

Bron uchun internet bilan tarix yuklanishini kuting, tasdiqlangan bronni
oching; aloqa uzilgan holda ilovani yopib qayta oching → **Bronlar** →
tafsilotlar va QRni tekshiring. To‘lovsiz bronni 5 daqiqa kutib hamda
alohida bronning **To‘lovni bekor qilish** tugmasi bilan tekshiring.
Haqiqiy Android process restart sinovi:

```powershell
npm run mobile:test:recovery -- <android-serial>
```

Sinov faqat lokal demo OTP va lokal to‘lov rejimida ishlaydi. Ikki marta
Android force-stop, payment-return, lokal provider tasdig‘i va oxirgi
ochilishda barcha API so‘rovlarini rad etadigan mijoz bilan bron/QR hamda
4 ta saqlangan surat tekshiriladi. Dalil `.local/android-recovery.json`da;
oxirida odatiy debug ilova qayta o‘rnatiladi. Bu rasmiy to‘lov qabuli emas.

Yordam xabari yuborilayotganda tugma va matn maydoni bloklanadi. Bir xil
so‘rovlar bir tarmoq so‘rovi va idempotency kalitidan foydalanadi; server ham
takroriy ticket/javob yaratmaydi. Tarmoq xatosida matn saqlanadi va qayta
urinish mumkin. Sun’iy kutish qo‘shilmagan; umumiy tarmoq muddati 25 soniya.

Mijozning yangi yordam xabari bog‘langan superadmin Telegramiga oxirgi
matn va **✍️ Javob yozish** tugmasi bilan yuboriladi. Superadmin botda matn
yozib, **Yuborish**ni tasdiqlaydi. Shu javob mijoz suhbatida saqlanadi va
ochiq Android suhbatida 5 soniyalik yangilanishda ko‘rinadi. Superadmin
barcha murojaatlarni, jumladan sanatoriyaga biriktirilmaganlarini ham
**Aloqa → Murojaatlar**da ko‘radi. Worker/bot ishga tushgan bo‘lishi kerak.

## AI suhbat va bron tilagi

**Sihhat yordamchisi** javobni va keyingi savolni Gemini orqali o‘zi yozadi.
Tayyor dialog ketma-ketligi yo‘q. Birinchi xabarda alohida AI rozilik
dialogi ochiladi; **Davom etish** tanlansa rozilik shu login uchun saqlanadi,
**Keyinroq** tanlansa xabar yuborilmaydi. Chatda Gemini yozuvi va doimiy
checkbox ko‘rsatilmaydi. Rozilik olinsa joriy xabar va oxirgi
12 user/assistant xabari niqoblanib yuboriladi. Tarix qurilma ekranining
xotirasida; yangi doimiy suhbat jadvali yo‘q. Roziliksiz provider chaqirilmaydi.
Provider ishlamasa ulanish xatosi va katalogdan qidirish taklifi beriladi.

`apps/api/src/ai/provider.ts`dagi `prohibitedTopics` maxfiy ma’lumot,
tibbiy tashxis/dori/doza, jinoyat/zo‘ravonlik, nafrat/pornografiya,
aloqasiz targ‘ibot/qimor/reklama, o‘ylab topilgan katalog/narx, moliyaviy
amal va cheklovni chetlab o‘tishni taqiqlaydi. Narx faqat serverning joriy
quote natijasidan olinadi; katalog IDlari serverda tekshiriladi.

Bron serverda `CONFIRMED` bo‘lgach yaxshi tilak kartasi ko‘rsatiladi.
To‘lov natijasini **Holatni yangilash** orqali ham olish mumkin; to‘lovdan
qaytishning o‘zi bron tasdig‘i hisoblanmaydi.

Tezcheck checkouti ochilmasa `npm run tezcheck:check`ni bajaring va
[Tezcheck yo‘riqnomasi](TEZCHECK.md)dagi kassa tayyorligini tekshiring.
Yangi bronlarda `BOOKING_SETTLEMENT_MODE=direct` standart: sanatoriyaning
o‘z merchant ulanishi hali tayyor bo‘lmaganda `MERCHANT_NOT_READY` chiqadi.
Sozlash tartibi [MERCHANT_CONNECTIONS.md](MERCHANT_CONNECTIONS.md)da.
2026-10-04 qayta tekshiruvda kassa `draft`, `accepts_payments=false` edi.

## 1. Lokal muhit

### Windowsda tayyor muhitni ochish

Dependencylar, migratsiyalar va API/web buildlari tayyor bo‘lgach:

Kod yangilanganda avval bazani tayyorlab, yangi migratsiya va buildlarni qo‘llang:

```powershell
npm run db:local
npm run db:migrate
npm run build:api
npm run build:web
```

So‘ng xizmatlarni oching:

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

### Lokal panelda «Sahifani yangilab qayta urinib ko‘ring» xabari

`localhost` va `127.0.0.1` brauzer uchun turli originlar. Hisobchini yoki
boshqa taklifni tasdiqlashda `CSRF_INVALID`/403 chiqsa, `apps/api/.env`dagi
`CORS_ORIGINS` ikkala panelning har ikkala lokal manzilini qamrashi kerak:

```dotenv
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
```

`.env.example` shu qiymat bilan yangilangan; mavjud `.env` avtomatik
qayta yozilmaydi. Qiymatni o‘zgartirgach APIni qayta oching:

```powershell
npm run local:stop -- -Only api
npm run local:start -- -Only api
```

CSRF tokeni, sessiya, superadmin roli va taklif versiyasi tekshirilishi
saqlanadi. Noto‘g‘ri/yo‘q token yoki boshqa port rad etiladi. Productionda
`CORS_ORIGINS` uchun haqiqiy HTTPS panel manzillari belgilanadi.

### Panel faolsizligi va telefondagi autentifikator

Superadmin 2 soat, direktor va resepsion 4 soat davomida foydalanuvchi
harakati bo‘lmasa hisobdan chiqadi. Sichqoncha, klaviatura, touch va scroll
faollik hisoblanadi. Panelning 45 soniyalik sessiya tekshiruvi, background
API so‘rovi va access-token yangilanishi vaqtni uzaytirmaydi. Harakat serverga
15 soniyadan ko‘p bo‘lmagan chastotada yuboriladi; server oxirgi qayd etilgan
harakatdan hisoblaydi. Yopilgan/uyqudagi brauzer qaytishda sessiyani tekshiradi.
Server `/auth/me`, himoyalangan amallar, `/auth/activity` va `/auth/refresh`da
faolsiz sessiyani rad etadi. Mobil mijoz uchun bu panel qoidasi qo‘llanmaydi.

30 soniya kirilgan sessiyaning muddati emas: autentifikator kodining
yangilanish davri. Kodni Google Authenticator yoki Microsoft Authenticator
telefon ilovasidan olasiz. Lokal `.local/SUPERADMIN_KIRISH.html` faqat yordamchi;
unda parol/kalit bor, uni internetga joylamang. Production uchun alohida
hisob bootstrap qilinadi; server bergan MFA kalitini telefon ilovasida
“hisob qo‘shish → sozlash kalitini kiritish” orqali bir marta ulang
(TOTP, 6 raqam, 30 soniya). Keyingi kodlar telefonda internet bo‘lmasa ham
yaratiladi. Server va telefon vaqti to‘g‘ri bo‘lishi kerak. QR/kalitni
boshqalarga bermang; uni olgan odam yangi kodlarni ham yaratishi mumkin.
Kod/parolni faqat o‘z saytingizga kiriting; autentifikator phishingni
to‘liq bartaraf qilmaydi.

Production bootstrap MFA siri/URI konsolga chiqarilmaydi. Standart private
fayl `.local/bootstrap-mfa.json`; `BOOTSTRAP_MFA_FILE` bilan serverdagi boshqa
private manzil tanlash mumkin. Fayl mavjud bo‘lsa ustiga yozish rad etiladi.
Unixda yangi fayl mode `0600`, yangi katalog `0700`; server operatori Windowsda tegishli
ACLni ta’minlaydi. Faylni public/static/media papkaga yo‘naltirmang.
Telefonga ulangach faylni himoyalangan offline zaxiraga saqlang; Git, build
artefakti, brauzer bundle yoki umumiy server logiga qo‘shmang. Bu fayl va
lokal kod sahifasi deploy qilinadigan saytning bir qismi emas.

### Hisobchi paneli

Hamkorlar saytida direktor **Jamoa va ruxsatlar → Xodim taklif qilish →
Lavozim: Hisobchi**ni tanlaydi. Superadmin tasdiqlagach xodim birinchi
kirishda parolini almashtiradi. Hisobchi faqat o‘z sanatoriyasining
hisobotini ko‘rishi/yuklashi mumkin. Bron, anketa, profil, to‘lov va xodim
boshqaruvi API orqali ham rad etiladi. Panel faolsizligi 4 soat.

Davrlar, CSV/PDF, hisoblash mezonlari va cheklovlar:
[HISOBCHI_PANEL.md](HISOBCHI_PANEL.md). 11-migratsiya yangi rolni qo‘shadi;
API qayta ishga tushishidan oldin `npm run db:migrate` kerak.
`npm run test:report-periods` kabisa va chegara sanalarini tekshiradi.

### Alohida brauzer auditi

`npm test` test bazasiga migratsiyalarni qo‘llaydi. Port 4000 bo‘sh bo‘lganida
`npm run test:web:fixture` alohida API ochadi va **faqat `sihhat_test`**
bazasini tozalab test hisoblari/bronlarini yaratadi. Production/lokal `sihhat`
bazasi o‘zgarmaydi; haqiqiy providerlar disabled yoki local adapterga o‘tadi.
Jarayonni tayyorlik yozuvigacha ochiq qoldiring. Boshqa terminalda:

Fixture ko‘p marta yangi login qiladigan UI to‘plami uchun faqat o‘zining
to‘rtta synthetic login va loopback IP urinish hisoblagichlarini davriy
tozalaydi. Production login limitlari o‘zgarmaydi; TOTP replay himoyasi
fixtureda ham saqlanadi. Bu brauzer to‘plami rate-limit stress sinovi emas.

```powershell
$env:SIHHAT_WEB_ACCESS_FILE = '.local/browser-test-access.json'
npm run test:web
```

Yakunlash: `npm run test:web:fixture -- --stop`; so‘ng oddiy lokal API
qayta ochilishi mumkin. MFA TOTP har login uchun yangi bo‘lishi kerak;
sinovlar oxirgi stepni `.local/runtime/web-test-mfa-step.json`da saqlaydi.
Brauzer auditi [UI_REVIEW.md](UI_REVIEW.md)da, maxfiy test hisoblari va
trace/reportlar `.local`da qoladi.

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

Kerakli dasturlar, API/web/Flutter kutubxonalari va to‘liq birinchi startup
buyruqlari [README](../README.md#kerakli-dasturlar-va-kutubxonalar)da.
Node.js 24.15+, npm, PostgreSQL 18; Android uchun Flutter, Android SDK va
JDK kerak. `npm ci` lockfiledagi barcha npm workspaces paketlarini o‘rnatadi.
Flutter paketlari `apps/mobile`da `flutter pub get` bilan olinadi.

Joriy lokal Android ARM64 debug nusxa
[`apk/sihhat-uz-preview.apk`](../apk/sihhat-uz-preview.apk)da.
Asl build `.local/releases`da saqlanadi; nusxani yangilash va tekshirish
[READMEning APK bo‘limi](../README.md#tayyor-apk)da. `apk/` Git va
Railway uploadidan chiqarilgan. Ushbu APKga lokal API va USB reverse kerak;
release uchun haqiqiy HTTPS manzili va signing bilan qayta build qilinadi.

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:generate
npm run db:seed
```

`db:local` `.local/postgres` klasterini `127.0.0.1:55432`da ishga tushiradi va `sihhat`, `sihhat_test` bazalarini yaratadi. Bu loopback demo klasteri; production konfiguratsiyasi alohida boshqariladi. `apps/api/.env` mavjud bo‘lsa, qayta yozilmaydi. `AUTH_SECRET` va `MFA_ENCRYPTION_KEY` tasodifiy yaratiladi. Ular logga chiqarilmaydi.

Uzilgan ishidan tiklanayotgan PostgreSQL jarayoni mavjud bo‘lsa, `db:local`
uning ulanishga tayyorligini `pg_isready` orqali 10 daqiqagacha kutadi.
Bazalar faqat shu tekshiruv o‘tgach o‘qiladi/yaratiladi. Kutish muddati
tugasa xato qaytaradi; tiklanayotgan server ishlashda qoladi. Tiklanish
va tayyorlik yozuvlari `.local/postgres.log`da.

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

### Bosh sahifadagi reklama va mashhur sanatoriyalar

Superadmin **Sanatoriyalar** sahifasining **Mashhur** ustunidagi tickni
yoqing yoki o‘chiring. Tanlov alohida saqlash tugmasisiz serverda
saqlanadi va sahifa qayta ochilganda tiklanadi. Yangi va mavjud profillar
migratsiyadan keyin avtomatik tanlanmaydi. Faqat `ACTIVE` va tasdiqlangan
public revisionga ega tanlangan sanatoriyalar ilovaga chiqadi.

`PATCH /superadmin/sanatoriums/:id/featured` `{version, featured}` oladi;
faqat `sanatoriums.manage` ruxsatli superadmin o‘zgartiradi. Eski version
xatosida sahifani yangilang. Har tanlov auditga yoziladi. `/catalog/home`
tanlangan profillarni katalogning birinchi 100 ta natijasidan mustaqil oladi.

Androidda faol `HOME` reklama mashhur sanatoriyalar joyini egallaydi;
ikkalasi bir paytda ko‘rsatilmaydi. Reklama tugasa, bo‘lmasa yoki reklama
so‘rovi xato qaytarsa shu joyga tanlangan sanatoriyalar qaytadi. Reklamalar
har 30 soniyada, resume va pull-to-refreshda yangilanadi. Eski avtomatik
home kesh o‘rniga `public_home_v2` ishlatiladi; offline katalogda ham
faqat `featured_on_home=true` bo‘lgan profillar fallback sifatida olinadi.

Schema yangilanishi: `npm run db:migrate` (12-migratsiya),
`npm run build:api`, `npm run build:web`. Lokal API/panellar ishlayotgan
bo‘lsa mos xizmatlarni `npm run local:stop -- -Only api,superadmin,director`
va `npm run local:start -- -Only api,superadmin,director` bilan qayta oching.
Mobil nusxani `npm run mobile:preview -- <serial>` orqali qayta yig‘ib
o‘rnating va READMEdagi tartib bilan `apk` nusxasini yangilang.

Login telefon maydonida `+998` doimiy prefiks; undan keyin 9 raqam
bo‘lishi shart. 8 yoki 10 raqam SMS so‘rovini yubormaydi va xato maydon
tagida chiqadi. `+998` bilan formatlangan to‘liq raqamni paste qilish ham
ishlaydi. Login oynasida `SihhatLogo` orqali asl logo ko‘rsatiladi.

### Bosh sahifa maqolalari

Superadminning `Yangilik va tavsiyalar` sahifasi `NEWS`/`TIP` maqolalarini
qoralama, e’lon va arxiv holatlarida boshqaradi. `/catalog/home` va
`/catalog/news/:id` faqat e’lon qilingan ma’lumotlarni qaytaradi. Android
public feedni saqlangan hisobda server javobini kutmasdan ko‘rsatadi;
kesh muddatsiz va API hostiga
bog‘langan. Saqlangan narx/mavjudlik yakuniy bron hisobi sifatida ishlatilmaydi.

`NODE_ENV=production` real SMS, tanlangan Payme/Tezcheck merchant rekvizitlari, S3, Redis va HTTPS originlarni talab qiladi; lokal payment-confirm endpointi yopiladi. Tezcheck kassasi ham haqiqiy to‘lov qabul qilishga tayyor bo‘lishi kerak. Production superadminini demo seed orqali yaratmang. `BOOTSTRAP_LOGIN` va `BOOTSTRAP_PASSWORD`ni secret muhitida berib, `npm run bootstrap -w @sihhat/api`dan foydalaning; bir martalik MFA kaliti/URI private enrollment fayliga yoziladi, logga chiqarilmaydi. Yuqoridagi “Panel faolsizligi va telefondagi autentifikator” tartibi bilan telefonga ulang.

`infra/docker/compose.yaml` PostgreSQL/Redis/MinIO uchun local muqobil muhit. Unda test DB va S3 bucketni alohida tayyorlash, `.env`ning DB URL/portlarini moslash kerak; ishlatilmagan Compose muhiti tekshirilgan deb belgilanmaydi.

Real pilot uchun sanatoriya xona inventari, SMS/merchant rekvizitlari, refund/payout qoidalari va tariflar kerak. Pilot oqimi: e’lon tasdiqlash → quote/hold → provider to‘lovi → kelish/ketish → bank tasdig‘i bilan payout; muqobil oqim cancellation/refund. Release APK signing va payment return ham haqiqiy qurilmada tekshiriladi.

## Tezcheck va yangilangan Android UI — 2026-10-03

Tezcheck tartibi va haqiqiy tekshiruv cheklovlari [TEZCHECK.md](TEZCHECK.md)da.
Serverda `PAYMENT_MODE=tezcheck`, maxfiy `TEZCHECK_API_KEY` va kassa kodi
sozlanadi; `npm run tezcheck:check` faqat xavfsiz o‘qish so‘rovlarini yuboradi.
2026-10-08 signed o‘qish tekshiruvida kassa `active`,
`accepts_payments=true`, balans endpointi ishladi; tranzaksiya namunasi **0**.
API kaliti APK yoki web environmentga kiritilmaydi. Bu holat haqiqiy checkout,
payment return yoki har sanatoriyaning direct merchant qabuli emas;
ular alohida tekshiriladi. Provider holati qayta o‘qilib amaldagi javobga
ko‘ra ishlanadi; to‘lov tasdig‘i qo‘lda taxmin qilinmaydi.

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
