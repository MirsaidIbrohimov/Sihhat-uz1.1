# Sihhat uz Android ilovasi

Flutter mijoz ilovasi: SMS orqali kirish, sanatoriya qidirish va filtrlar,
tafsilotlar, bir nechta xonali bron, to‘lov holati, QR, qaytarish so‘rovi,
profil, bildirishnomalar, yordam xizmati va serverdan ishlaydigan AI.

2026-10-15: **0.1.1 (build 2)** imzolangan demo APK
[`ilova` papkasida](../../ilova/README.md) va
[GitHub Releases](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/tag/v0.1.1-demo)da.
`https://sihhat.uz/demo-api`ga internet orqali ulanadi; USB kerak emas.
Sinov raqami → **Kod yuborish** → **Demo koddan foydalanish** → **Tasdiqlash**.
SMS yuborilmaydi. Kod bir martalik, muddati va urinish cheklovi saqlanadi.
Demo mijozlari, katalog va sinov to‘lovlari alohida bazada ishlaydi.
Joriy analyzer xatosiz va **62/62** unit/widget test o‘tdi.

2026-10-10: [UI maketlari](../../UI/index.html) uslubi ichki sahifalar va
telefon/SMS kirishga joriy etildi. `concept_ui.dart` umumiy mavzu, sahifa,
karta, pastki amal tugmasi va bitta tahrirlanadigan maydonga asoslangan
olti xonali OTP ko‘rinishini beradi. Manrope/DM Sans shriftlari va Lucide
vektor ikonkalar ilovaga lokal qo‘shilgan; litsenziyalari `assets/licenses`da.
Katalog/filtr, sanatoriya/tarif/surat/shartlar, sana/bron/to‘lov/QR/sharh,
AI, profil/telefon, yordam va bildirishnoma/yangiliklar yangilandi.
Katalogning narx oralig‘i va barcha tanlangan sharoitlar bo‘yicha filtri
saqlangan to‘liq ro‘yxatda sahifalashdan oldin ishlaydi. Kunduzgi va tungi
rejim mavjud. Bosh sahifa va boshqa menyular bir xil Lucide navigatsiya
ikonkalaridan foydalanadi. Login bezagi o‘rnida asl Sihhat uz logosi bor;
doimiy `+998` ortidan aynan 9 raqam talab qilinadi, xato maydon tagida.
HOME reklama mashhur sanatoriyalar joyida turadi. Reklama bo‘lmasa
superadmin tick bilan tanlagan faol/e’lon qilingan profillar ko‘rinadi;
tasodifiy katalog yoki eski avtomatik home keshidan ro‘yxat to‘ldirilmaydi.
APKni yig‘ish/o‘rnatish va lokal API talablari
[README](../../README.md#tayyor-apk)da, yakuniy tekshiruvlar
[holat hujjati](../../docs/IMPLEMENTATION_STATUS.md)da.

Joriy tekshiruv: Flutter analyzer xatosiz, **61/61** unit/widget test
o‘tdi. Telefon uzunligi, +998 bilan paste, reklama/tanlov almashishi,
offline tanlov va bosh sahifaga qaytganda yangi ikonkalar sinalgan.
2026-10-10 oddiy `lib/main.dart` ARM64 debug APK Samsung SM-A165Fga
ilova ma’lumotlarini saqlagan holda o‘rnatildi; `apk/sihhat-uz-preview.apk`
shu build bilan yangilandi. APKda 57 maxfiy qiymat bayt namunasi, moslik 0.
Bu `http://127.0.0.1:4000` lokal API va USB reverse orqali ishlaydigan preview.

2026-10-05 interfeys `Apk xatolari/Сиҳҳат уз_ Здоровье под контролем.png`
namunasiga moslashtirildi: to‘q yashil sarlavha va qidiruv, manzarali banner,
to‘rtta tezkor karta, gorizontal sanatoriyalar, tezkor xizmatlar va beshta
pastki navigatsiya tugmasi. Kichik ekran yoki katta shriftda tezkor kartalar
ikki ustunga joylashadi. Tugmalar mavjud katalog, filtr, bron, AI va yordam
sahifalariga ulangan. Klinika, dori qidirish yoki tahlil natijalari xizmatlari
bu versiyada mavjud emas; ularning ishlamaydigan tugmalari qo‘shilmagan.

O‘z logomiz `assets/branding/sihhat-logo.jpg`da; Flutter nusxasi
`apps/mobile/assets/branding`da. Web/launcher/splash variantlari
`npm run brand:assets` bilan tayyorlanadi. Bannerning
`assets/illustrations/wellness-retreat.png` tasviri AI yordamida yaratilgan
dekorativ manzara. Katalog kartalarida haqiqiy backend ma’lumotlari va profil
rasmlari ishlatiladi; rasm yoki reyting bo‘lmasa soxta rasm/reyting qo‘yilmaydi.

HOME reklama server faol reklama qaytargandagina chiqadi. Ro‘yxat bo‘sh,
so‘rov kutilayotgan yoki xato bo‘lsa reklama sarlavhasi, kartasi, spinneri
va ajratilgan bo‘sh joy yo‘q. Reklama public keshga yozilmaydi.
Ro‘yxat har 30 soniyada, ilovaga qaytilganda va pastga tortilganda yangilanadi.
POPUP faqat kirishda alohida ochiladi, yopish mumkin; reklama bo‘lmasa
dialog chiqmaydi. To‘xtatilgan/muddati tugagan reklamani API qaytarmaydi.

2026-10-06: barcha katalog sahifalari, oldin ochilmagan sanatoriya profillari,
xona turlari va tariflar serverdan yuklanib saqlanadi. Qidirish va filtrlar
saqlangan katalogda ham ishlaydi. Profil rasmlari `path_provider` orqali
ilovaning doimiy fayl papkasida saqlanadi; katalog va rasmlar API hostiga
bog‘langan. Muddati tugashi sabab ma’lumot yo‘qolmaydi. Ilova ochilishi,
resume, Android internet ulanishi qaytishi va faol holatda har daqiqa
sinxronlashni boshlaydi; bir vaqtda takroriy sinxronlash yaratilmaydi.
Serverdan barcha sahifalar kelmaguncha avvalgi ro‘yxat almashtirilmaydi.
Yangi sanatoriyalar yuklanadi, e’londan olinganlari muvaffaqiyatli
sinxronlashdan keyin ro‘yxatdan yo‘qoladi. Dastlabki yuklash internet talab qiladi.

**Bronlar**ning barcha sahifalari, oldin ochilmagan bron tafsilotlari va
tasdiqlangan bronning QR kodi ham telefonda xavfsiz saqlanadi. Hisob va
API hosti alohida tekshiriladi; logout yoki boshqa hisobga o‘tish shaxsiy
nusxani tozalaydi. Aloqa yo‘q bo‘lsa tarix va tafsilotlar saqlangan holatda
ochiladi. To‘lovsiz bronlar 5 daqiqadan keyin, **To‘lovni bekor qilish**
serverda tasdiqlangach darhol tarix va nusxadan olinadi. To‘langan/refund
qilingan bronlar saqlanadi. Offline holat yangi to‘lov tasdig‘ini yaratmaydi.

2026-10-07 Samsung SM-A165Fda ikkita OS force-stop bilan tekshirildi:
sessiya va ikki xonali bron tiklandi; yakuniy bosqich barcha API so‘rovlarini
rad etgan offline mijoz bilan bron, QR, katalog va to‘rtta suratni ochdi.
To‘lov lokal simulator; telefonning Wi-Fi/mobil interneti o‘chirilmagan.
Avvalgi telefon hisobi va sozlamalar private nusxadan qayta tiklandi.
Rasmlar yangilanganda `setState` callbacki `Future` qaytarmaydigan qilindi;
shu holat alohida widget testida tekshirildi. Analyzer xatosiz, **56/56** test.

Sanatoriya rasmlari bitta galereyada chap/o‘ng tugmalari yoki surish bilan
almashadi. Hamkorlar paneli bir tanlashda 4+ surat, jami 30 tagacha qabul
qiladi. Lokal Chimyon va Zomin profillaridagi 4 tadan rasm manbalari
[suratlar hujjati](../../docs/SANATORIUM_PHOTOS.md)da.

Yordam xabari superadmin botiga boradi; botda tasdiqlangan javob shu
mijoz suhbatida ko‘rinadi. Ochiq suhbat 5 soniyada va resume paytida
yangilanadi, vaqtinchalik aloqa xatosida ekrandagi suhbat saqlanadi.

Tariflar sanatoriya profilida xona turi bo‘yicha chiqadi. **Shu tarifni
tanlash** bron shakliga shu tarifni beradi. Sana, xona, tarif va mehmonlar
internetsiz tanlanadi. Bolalar va qo‘shimcha xonalar yig‘ilgan bo‘limlarda;
**To‘lovga o‘tish**dan keyingina server joriy narx/mavjudlikni hisoblaydi.
Tasdiqlash amaldagi server quote va policy IDlarini ishlatadi; saqlangan
tarifdan hold yoki to‘lov tasdig‘i yaratilmaydi. To‘lov ekranida takroriy narx
olib tashlandi, mehmon/xona tafsilotlari **Bron ma’lumotlari**ga yig‘ildi.

Profil nomi va telefoni login, `/auth/me`, profil tahriri va telefon
tasdig‘idan keyin xavfsiz saqlanadi. Saqlangan hisob bilan ilova tarmoq
javobini kutmasdan ochiladi; sessiya serverda background tekshiriladi.
Logout yoki server rad etgan sessiya shaxsiy nusxani tozalaydi.
AI oynasida Gemini texnik yozuvi va doimiy rozilik checkboxi yo‘q;
birinchi xabar oldidan tashqi AIga rozilik alohida dialogda olinadi.
Rozilikdan voz kechilganda xabar yuborilmaydi; logout rozilikni ham tozalaydi.

Ilova sessiyasiz telefon/SMS kirishidan boshlanadi. Tasdiqqacha katalog va
asosiy navigatsiya ochilmaydi. Tokenlar hamda tugallanmagan bron identifikatori
xavfsiz saqlanadi; sessiya qayta tekshiriladi. Chiqish ichki sahifalarni yopadi.
To‘lov holati backend tasdig‘idan olinadi; qaytish havolasi to‘lovni tasdiqlamaydi.
Kunduzgi/tungi ko‘rinish oy/quyosh tugmasi yoki Profil orqali almashtiriladi;
tanlov ilova qayta ochilganda va logoutdan keyin saqlanadi.

USB telefon uchun lokal debug APKning nusxasi loyiha ildizidagi
[`apk/sihhat-uz-preview.apk`](../../apk/sihhat-uz-preview.apk)da.
Build skripti asl faylni `.local/releases/sihhat-uz-preview.apk`ga yozadi;
keyingi builddan so‘ng nusxani yangilash tartibi [asosiy README](../../README.md#tayyor-apk)da.
Loyiha ildizida `npm run local:start` API, saytlar va USB reverse ulanishini,
`npm run local:status` ularning holatini boshqaradi.
`npm run mobile:preview -- <android-serial>` yangi APKni yig‘adi, o‘rnatadi
va ochadi. API `http://127.0.0.1:4000`; kompyuter va USB ulanishi kerak.

Lokal demo SMS uchun backendda `NODE_ENV=development`,
`SMS_ADAPTER=local`, `DEMO_OTP_ENABLED=true`. Preview debug flagni beradi.
Telefon → **Kod yuborish** → **Demo koddan foydalanish** → **Tasdiqlash**.
Kod har safar yaratiladi, TTL va urinish cheklovlari bor; haqiqiy SMS yuborilmaydi.
Release demo kodni ko‘rsatmaydi, haqiqiy HTTPS va signing konfiguratsiyasini talab qiladi.

Tekshiruvlar va qolgan cheklovlar [amalga oshirish holati](../../docs/IMPLEMENTATION_STATUS.md),
[UI auditi](../../docs/UI_REVIEW.md) va [runbook](../../docs/RUNBOOK.md)da.
APK, hisoblar, sirlar, test rasmlari va qurilma dalillari Gitga kiritilmaydi.

## Ishga tushirish

Flutter SDK, Android SDK va JDK kerak. Repozitoriydagi Flutter SDK
`.local/tools/flutter`da, paket keshi `.local/pub-cache`da va Gradle keshi
`.local/gradle`da saqlanadi. Buyruqlarni `apps/mobile` papkasida bajaring:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

`10.0.2.2` Android emulyatoridan kompyuterdagi backendga murojaat qiladi.
USB bilan ulangan haqiqiy qurilmada `adb reverse tcp:4000 tcp:4000`ni bajaring
va `API_BASE_URL=http://127.0.0.1:4000`ni kiriting. Qurilmani `flutter devices`
orqali tanlang; kerak bo‘lsa `-d <serial>` qo‘shing. Backend ishga tushgan
bo‘lishi kerak.

Release build uchun `API_BASE_URL` HTTPS manzili bo‘lishi shart. Debug buildgina
mahalliy HTTP va sinov to‘lov tugmasidan foydalanadi. Release imzolash uchun
alohida signing konfiguratsiyasi talab qilinadi; u quyida tayyorlanadi.

## Imzolangan release APK

Demo uchun loyiha ildizida `npm run mobile:demo` ishlatiladi. Bu buyruq
`DEMO_OTP_ENABLED=true` va alohida HTTPS `/demo-api` manzili bilan
`ilova/Sihhat-uz-demo-0.1.1.apk`ni yaratadi. Versiya/build raqami
`pubspec.yaml`dan olinadi, APK manifesti bilan solishtiriladi; imzo,
debug/HTTP cheklovi va SHA-256 dalili
`.local/releases/android-demo-release.json`da. Oddiy production release
demo kodni ko‘rsatmaydi. Kod chiqarish uchun build flagi bilan birga server
javobidagi haqiqiy demo challenge ham kerak; kod ilovaga qotirib yozilmagan.

Loyiha ildizida:

```powershell
npm run mobile:signing:init
npm run mobile:release -- https://sizning-api-manzilingiz.uz
```

`mobile:signing:init` yangi RSA 3072 pilot kalitini
`.local/android-signing/sihhat-pilot.jks`da yaratadi. Parolli konfiguratsiya
shu papkadagi `key.properties` va `apps/mobile/android/key.properties`da
saqlanadi. Mavjud konfiguratsiya yoki kalit ustidan yozilmaydi; maxfiy
fayllar `.gitignore` orqali chiqarib tashlangan. Kalit va konfiguratsiyaning
maxfiy zaxirasini saqlang: keyingi APK yangilanishlari ayni kalitni talab qiladi.
Kalit yoki parollar konsolga chiqarilmaydi.

Avvalgi release kaliti bo‘lsa, `android/key.properties.example` asosida
`android/key.properties`ni sozlang. Gradle release build oldidan kalit mavjudligi
va aniq HTTPS `API_BASE_URL` berilganini tekshiradi; debug imzosiga o‘tmaydi.

Natija: `.local/releases/sihhat-uz-release.apk`. Asl nusxa
`apps/mobile/build/app/outputs/flutter-apk/app-release.apk`da ham saqlanadi.
Skript `apksigner verify --verbose --print-certs` bilan imzoni va Android
manifestida debug/ochiq HTTP o‘chirilganini tekshiradi. APK SHA-256,
sertifikat SHA-256 va buildning API manzili
`.local/releases/android-release.json`ga yoziladi. Bu tekshiruv HTTPS
serverning ishlayotganini tasdiqlamaydi.

Build skriptlari Flutter orqali native plagin ro‘yxatini har build rejimiga
mos yangilaydi. Debug/integratsion sinovdan releasega o‘tishda `--no-pub`
eski `integration_test` registrantini qoldirishi mumkin; build skriptlarida
shu flag ishlatilmaydi. Generated registrant qo‘lda tahrirlanmaydi.

Haqiqiy HTTPS API manzili berilmagan lokal bosqichda release namunasi
`https://api.sihhat.invalid` bilan yaratiladi. `.invalid` ataylab ishlamaydigan
sinov manzili; ushbu APK serverga ulanmaydi. Haqiqiy manzil belgilanganida
yuqoridagi buildni o‘sha manzil bilan qayta bajaring. Telefonda lokal HTTP
API uchun oddiy debug APK ishlatiladi.

Build va imzolash tartibi [Flutter qo‘llanmasi](https://docs.flutter.dev/deployment/android)
va [Android imzo tekshiruvi](https://developer.android.com/tools/apksigner)ga mos.

## Tekshirish

```powershell
flutter analyze --no-pub
flutter test --no-pub
```

Unit va widget testlari pul aniqligi, takroriy so‘rov kaliti, token yangilash,
sessiya bekor qilinishi, tugallanmagan to‘lov tiklanishi va SMS-kod ekranini
tekshiradi. Bron hisobi yoki to‘lov javobi kechikib kelganda sahifadan chiqish
ham tekshiriladi; tugallanmagan bron keyingi kirishda tiklanadi.

SDK va kesh yo‘llarini avtomatik oladigan loyiha ildizidagi tekshiruv:

```powershell
npm run mobile:check
```

## Android OS force-stop sinovi

API `127.0.0.1:4000`da, `SMS_ADAPTER=local`, `PAYMENT_MODE=local` va demo
`sihhat` bazasi bilan ishlashi, telefon USB orqali ulangan bo‘lishi kerak.
`4001` port bo‘sh bo‘lsin; skript test bridgeni o‘zi ishga tushirib, oxirida
to‘xtatadi.

```powershell
npm run mobile:test:recovery -- <android-serial>
```

Skript bir test APKni o‘rnatib, bir-biridan alohida uch Android jarayonida
quyidagilarni tekshiradi:

1. OTP sessiyasi va ikki xonali `PAYMENT_PENDING` bron haqiqiy Android secure
   storagega yoziladi. Mavjud bronlarni o‘chirmasdan bo‘sh sanalar tanlanadi.
2. `adb shell am force-stop` jarayonni to‘xtatgani PID bilan tekshiriladi.
   Android `sihhat://payment-return?status=success` havolasidan yangi jarayon
   ochadi. Sessiya va bron saqlangan ma’lumotdan tiklanadi; to‘lov hali serverda
   `PENDING` bo‘lsa, havola uni tasdiqlangan deb ko‘rsatmaydi. Lokal provayder
   to‘lovni tasdiqlagach, ilova `CONFIRMED` holatini ko‘rsatib, pending markerini
   tozalaydi.
3. Ikkinchi force-stop va yangi jarayonda APIga barcha so‘rovlar rad etiladi.
   Saqlangan sessiya bilan tasdiqlangan bron ro‘yxat/QR va oldindan yuklangan
   sanatoriya profilining 4 ta surat fayli ochiladi. Galereya keyingi suratga
   almashadi; tugallanmagan to‘lov avtomatik qayta ochilmaydi.

Dalil: `.local/android-recovery.json`; unda jarayon PIDlari va natijalar bor,
token/OTP yozilmaydi. Testdan keyin `lib/main.dart` bilan oddiy debug APK
qayta yig‘ilib, sessiya saqlangan holda telefonga o‘rnatiladi. Test yangi demo
foydalanuvchi va bron yaratadi. Bu rasmiy Payme sandboxi yoki real pul amali
emas. Telefonni to‘liq qayta yuklash ushbu sinovga kirmaydi.

Android integratsion test backend bilan SMS-kod orqali kirish, ikki xonali
bron hisobi, xonalarni band qilish, ilova qayta yaratilganda xavfsiz saqlashdan
tiklanish hamda mahalliy provayder tasdiqlagan to‘lovni tekshiradi. Haqiqiy SMS
va Payme integratsiyasini tekshirmaydi. Backendning demo bazasida test bron
yaratiladi.

Repozitoriy ildizida, backend `127.0.0.1:4000`da ishlab turganda:

```powershell
# Birinchi terminal: SMS_ADAPTER=local va PAYMENT_MODE=local muhiti kerak.
node scripts/mobile-test-bridge.mjs

# Ikkinchi terminal: flutter devices ko‘rsatgan Android serialini kiriting.
node scripts/test-mobile-device.mjs <serial>
```

Bridge faqat `127.0.0.1:4001`da ishlaydi; test kaliti va SMS-kodi konsolga
chiqarilmaydi. `.local/dev-access.json` demo ma’lumotlari talab qilinadi.
Ikkala port qurilmaga `adb reverse` bilan skript tomonidan uzatiladi.

Windowsda SDK yo‘lida bo‘shliq bo‘lsa, Dart native hook jarayoni xato berishi
mumkin. Qurilma sinov skripti `android/local.properties`dagi Flutter SDK yo‘lini
avtomatik oladi. Zarur bo‘lsa `SIHHAT_FLUTTER_BIN`ni Flutter SDKning mavjud, bo‘shliqsiz qisqa yo‘liga
yo‘naltiring; `PUB_CACHE` va `GRADLE_USER_HOME` orqali keshlarni ham belgilang.
Masalan, ushbu ish joyining qisqa yo‘li tasdiqlangan bo‘lsa:

```powershell
$env:SIHHAT_FLUTTER_BIN = 'C:\Loyiha\SIF028~1\.local\tools\flutter\bin\flutter.bat'
$env:PUB_CACHE = 'C:\Loyiha\SIF028~1\.local\pub-cache'
$env:GRADLE_USER_HOME = 'C:\Loyiha\SIF028~1\.local\gradle'
```

## Debug APK

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

Natija: `build/app/outputs/flutter-apk/app-debug.apk`. Integratsion test ham
shu faylni test kirish nuqtasi bilan qayta yaratadi; oddiy foydalanish uchun
yuqoridagi build buyrug‘ini yana bajaring. Debug APK signed release emas.
