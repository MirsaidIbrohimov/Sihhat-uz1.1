# Sihhat.uz Android ilovasi

Flutter mijoz ilovasi: sanatoriya katalogi va tafsilotlari, SMS-kod bilan kirish,
saqlanganlar, bir nechta xonani bron qilish, to‘lov holati, bron QR-kodi,
qaytarish so‘rovi, sharhlar, profil va bildirishnomalar. Tokenlar hamda
tugallanmagan bron identifikatori qurilmaning xavfsiz saqlash xizmatida saqlanadi.
To‘lov natijasi backend tasdig‘idan olinadi.

Shu kompyuterga USB orqali ulangan telefon uchun tayyor APK:
`.local/releases/sihhat-uz-preview.apk`. Loyiha ildizida `npm run local:start`
API, saytlar va USB reverse ulanishini ochadi; `npm run local:status` holatni
ko‘rsatadi. Kompyuter yoki telefon qayta ulanganida `local:start`ni yana bajaring.
Bu debug APK lokal API va demo SMS bilan ishlaydi; kompyuter yoqilgan va
USB debugging faol bo‘lishi kerak. Release uchun haqiqiy HTTPS API zarur.

2026-10-04: foydalanuvchi bergan Sihhat uz logosi bosh sahifa, kirish,
launcher va ochilish ekraniga qo‘shildi. Android 12+ splashdagi logoning
pastki yozuvi kesilishi atrofidagi shaffof bo‘sh joy bilan tuzatildi.
Bosh sahifa/loginidagi **oy/quyosh tugmasi** hamda **Profil → Ilova
ko‘rinishi**dagi tugma har bosishda kunduzgi va tungi rejimni almashtiradi.
Faqat ikki rejim mavjud; boshlang‘ich rejim kunduzgi. Eski `system` qiymati
kunduzgi rejimga o‘tadi. Tanlov
xavfsiz lokal xotirada saqlanadi, qayta ochilganda tiklanadi va logoutda
o‘chmaydi. Matn, kartalar, filtrlar, login, bron, to‘lov va AI ranglari
rejimga moslashadi; QR oq fonda qoladi.

Ilova birinchi ochilganda va faol sessiya bo‘lmaganda avval telefon orqali
kirish oynasi chiqadi. SMS tasdiqlanguncha katalog va asosiy navigatsiya
ochilmaydi. Tasdiqlash yangi mijoz hisobini yaratadi yoki mavjud hisobga
kiradi; qayta ochilganda saqlangan sessiya tekshiriladi. Hisobdan chiqish
yoki bekor qilingan sessiya login oynasiga qaytaradi.

Demo sinov: backendning lokal `apps/api/.env` faylida
`NODE_ENV=development`, `SMS_ADAPTER=local`, `DEMO_OTP_ENABLED=true`.
Repo ildizidagi `npm run mobile:preview -- <serial>` Flutterga
`--dart-define=DEMO_OTP_ENABLED=true` beradi. **Kod yuborish**dan so‘ng
demo SMS kodi ekranda chiqadi. **Demo koddan foydalanish** uni maydonga
qo‘yadi; **Tasdiqlash** orqali kiriladi. Haqiqiy SMS yuborilmaydi.
Kod oddiy server OTP tekshiruvidan o‘tadi; universal yoki doimiy kod yo‘q.
Backend demo opt-in faqat lokal development/test SMS adapteriga ruxsat
beradi; Flutter panelni faqat debug va demo flagda ko‘rsatadi.
Flutter analyzer xatosiz, **27/27 unit/widget test** o‘tdi.

Asl logo `assets/branding/sihhat-logo.jpg`da (repo ildizi), Flutter varianti
`apps/mobile/assets/branding`da. Web/Android variantlarini asl tasvirni
o‘zgartirmasdan o‘lchash uchun repo ildizida `npm run brand:assets`.

2026-10-03 UI yangilanishi: umumiy wellness mavzusi, kattaroq sanatoriya
kartalari, qulay qidiruv va filtrlar, sanatoriya/bron/to‘lov sahifalaridagi
doim ko‘rinadigan amallar. SMS oynasida raqamni tuzatish mumkin. 320px ekran,
1.3x shrift va klaviatura bilan filtr tekshirildi; analyzer va 20/20 test o‘tdi.
Tog‘ manzarasi kodda chizilgan dekorativ tasvir, real sanatoriya fotosi emas.
Haqiqiy sanatoriya rasmlari backenddan olinadi.

Dizayn yo‘nalishlari: [Wellness Booking App](https://dribbble.com/shots/27227441-Wellness-Booking-App-Calm-Seamless-Experience-UI)
va [Luma Retreats](https://dribbble.com/shots/27159696-Luma-Retreats-An-Immersive-Mobile-Booking-Interface).
Interfeys Flutter komponentlari bilan amalga oshirilgan; namunalar rasmi yoki kodi ko‘chirilmagan.
Tezcheck havolasi tashqi HTTPS sahifada ochiladi; kalit APKda bo‘lmaydi.

Yangi arm64 debug preview Samsung SM-A165Fga o‘rnatildi: avval telefon
logini, keyin autentifikatsiyalangan bosh sahifa kuzatildi. Lokal bazada
yangi OTP tasdig‘i, mijoz va mobil sessiya qayd etildi. Telefon faol
ishlatilgani uchun avtomatik login/OS restart ssenariysi bu buildda
yakunlangan deb belgilanmadi; sessiya/logout unit-widgetlarda tekshirildi. APK ichida
24 ta maxfiy qiymat bayt namunasi tekshirildi, moslik topilmadi. Build va
qurilma dalillari `.local/releases/android-preview.json` hamda
`.local/branding/login-gate/server-review.json`da. Debug API lokal HTTP/USB bilan;
bu haqiqiy merchant payment return yoki signed HTTPS release sinovi emas.
Gradle 8 GB Windows xotirasiga mos 2 GB heap va 2 worker bilan yig‘ildi.

Kirish va saqlangan sessiya tekshiruvidan so‘ng bosh sahifada sanatoriyalar soni, hududlar,
boshlang‘ich tariflar, yangiliklar, foydali tavsiyalar va bron yo‘riqnomasi
ko‘rinadi. Yangilik va tavsiyalar superadmin panelidan boshqariladi. Oxirgi
public ma’lumotlar hostga bog‘langan xavfsiz keshda 7 kungacha saqlanadi;
oflayn holat belgilanadi, narx va mavjudlik bron hisobida qayta tekshiriladi.
Gemini yordamchisi serverdan ishlaydi; tashqi xizmatga savol yuborish uchun
mijozning roziligi olinadi. API kalitlari ilovaga kiritilmaydi.

2026-10-02: analyzer va 17 ta unit/widget testi o‘tdi. Bosh sahifa, sekin
session tekshiruvi, oflayn kesh, hudud filtri va login qilmasdan yangilik
o‘qish tekshirildi. Yangi debug preview Samsungga o‘rnatildi; APKda haqiqiy
server kalitlari/parollari topilmadi.

Lokal API ishlab turganda, loyiha ildizida:

```powershell
npm run mobile:preview -- <android-serial>
```

Natija `.local/releases/sihhat-uz-preview.apk`; serial berilsa skript USB
port reverse, o‘rnatish va ochishni bajaradi. API `http://127.0.0.1:4000`;
bu debug build. Release tartibi quyida.

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
