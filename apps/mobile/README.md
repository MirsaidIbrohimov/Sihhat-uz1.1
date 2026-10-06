# Sihhat uz Android ilovasi

Flutter mijoz ilovasi: SMS orqali kirish, sanatoriya qidirish va filtrlar,
tafsilotlar, bir nechta xonali bron, to‘lov holati, QR, qaytarish so‘rovi,
profil, bildirishnomalar, yordam xizmati va serverdan ishlaydigan AI.

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

Ilova sessiyasiz telefon/SMS kirishidan boshlanadi. Tasdiqqacha katalog va
asosiy navigatsiya ochilmaydi. Tokenlar hamda tugallanmagan bron identifikatori
xavfsiz saqlanadi; sessiya qayta tekshiriladi. Chiqish ichki sahifalarni yopadi.
To‘lov holati backend tasdig‘idan olinadi; qaytish havolasi to‘lovni tasdiqlamaydi.
Kunduzgi/tungi ko‘rinish oy/quyosh tugmasi yoki Profil orqali almashtiriladi;
tanlov ilova qayta ochilganda va logoutdan keyin saqlanadi.

USB telefon uchun lokal debug APK: `.local/releases/sihhat-uz-preview.apk`.
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
3. Ikkinchi force-stop va yangi jarayonda sessiya tiklanadi. Tasdiqlangan bron
   ro‘yxatdan ochiladi, tugallanmagan to‘lov avtomatik qayta ochilmaydi.

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
