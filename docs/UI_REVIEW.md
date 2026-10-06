# UI va boshqaruv panellari auditi

Sana: 2026-10-05. Android namuna: `Apk xatolari/Сиҳҳат уз_ Здоровье под контролем.png`.
Logotip: loyihaning `assets/branding/sihhat-logo.jpg` fayli.

## Android

To‘q yashil sarlavha, qidiruv, manzarali banner, to‘rtta tezkor karta,
gorizontal sanatoriyalar va beshta pastki navigatsiya namuna asosida qurildi.
Banner dekorativ AI manzarasi; haqiqiy sanatoriya kartalari API profil
rasmlari, narxi va mavjud reytingini ishlatadi. Klinika, dori va tahlil
xizmatlari backendda mavjud bo‘lmagani uchun tugmalar katalog, filtrlar,
bronlar, AI va yordam xizmatiga yo‘naltirildi.

HOME reklamasi faqat faol ro‘yxat bilan chiqadi. Bo‘sh, yuklanayotgan yoki
xato javobda reklama kartasi, sarlavhasi va paddingi ham yo‘q. Widget
tekshiruvi reklama yo‘qolganida keyingi bo‘limning koordinatasi avvalgi
holatiga qaytishini tekshiradi. Yangilanish: 30 soniya, pull-to-refresh va
ilovaga qaytish. POPUP alohida, yopiladigan dialog.

320 px ekran va katta shrift tekshirildi; tezkor kartalar kerak bo‘lsa
ikki ustunga o‘tadi. Uzoq banner yozuvlari qatorga sig‘adi.

## Panellardagi amallar va qulaylik

Quyidagi baholar kod va brauzer oqimlari auditi asosidagi muhandislik
bahosi. Haqiqiy xodimlar bilan vaqt o‘lchangan usability tadqiqoti emas.
Testlar `.local/browser-test-access.json`dagi alohida hisoblar va
`sihhat_test` bazasida ishlaydi; haqiqiy SMS, Telegram, AI va payment
providerlari yoqilmaydi.

| Bo‘lim | Tekshiruv qamrovi | Qulaylik bahosi |
| --- | --- | --- |
| Kirish va sessiya | Rolga mos kirish/chiqish, MFA, parol oynasi, 2/4 soatlik faolsizlik, harakat bilan yangilanish va refresh orqali chetlab o‘tishni rad etish | Oddiy; superadmin telefon autentifikatoridan kod oladi |
| Menyu va yuqori panel | Har rolning barcha ko‘rinadigan bo‘limlari, bildirishnoma, parol, chiqish, telefon menyusi | Oddiy; 390 px da menyu yopiladi |
| Umumiy ko‘rinish | Sana mezonlari, davr, CSV eksporti, AI sarfi va moliya ruxsatlari | O‘rtacha; davrning oxirgi sanasi hisobga kirmaydi |
| Sanatoriyalar va profil | Yaratish, profil bo‘limlari, draft saqlash, kerakli maydonlar xatosi, rasmlar/hujjatlar, bank oynalari, sozlash/to‘xtatish oynalari | Ko‘p ma’lumot kerak; bosqichli profil va aniq xatolar yordam beradi |
| Jamoa va ruxsatlar | Taklif oynasi, sanatoriya filtri, ruxsatni bekor qilish/qaytarish, parolni tiklash oynasi | O‘rtacha; resepsion moliyaga kira olmaydi |
| Xonalar va tariflar | Besh tab, xona turi/xona/tarif yaratish, tarif tahriri, kunlik narx, chegirma, ta’mir blokini ochish, bo‘sh kalendar sanasi | O‘rtacha; bolalar yoshi/narxi alohida boshqaruvlarda, JSON talab qilinmaydi |
| Bronlar | Ko‘p xonali bron, bolalar yoshi, narx va shartlar, check-in/out, tarif yo‘q yoki yuklanish xatosida sabab va qayta urinish | O‘rtacha; tariflar tayyor bo‘lmaganda bron tugmasi yopiq |
| To‘lovlar | To‘lov jadvali, Tezcheck holati, ulanish xatosidan qayta urinish | Oddiy; draft kassa tayyor deb ko‘rsatilmaydi |
| Pulni qaytarish | Rad etish oynasi, qaror sababi, ma’qullash, jarayonga olish | O‘rtacha; provider tasdig‘i alohida talab qilinadi |
| Sanatoriyaga o‘tkazma | Tayyorlash/bekor qilish oynalari, ma’qullash, bank raqami, dalil yuklash, tekshirish checkboxi va dalilni ochish | Mas’uliyatli; bankni inson tekshirishi zarur |
| Abonent va hisoblar | Tarif/biriktirish/refund sharti oynalari, invoice checkout, lokal tasdiq, yangi hisob oynasi | O‘rtacha; lokal tasdiq haqiqiy pul emas |
| Reklama | Profil rasmi yoki fayl, joy, havola, chegirma, sana, ma’qullash, to‘xtatish va public ro‘yxat | O‘rtacha; admin tasdig‘idan keyin chiqadi |
| To‘lovlarni solishtirish | CSV/bank dalili import oynasi; backend mos kelmagan natijani alohida saqlaydi | Murakkabroq; bank/provayder reestri kerak |
| Xabarlar | E’lon oynasi va qabul qildim amali | Oddiy; xabar faqat tanlangan oluvchiga ko‘rinadi |
| Vazifalar | Vazifa oynasi, xodim filtri, qabul qilish, natija bilan yakunlash | Oddiy; bosqichlar ketma-ket |
| Anketalar | Savollar soni, tanlangan sanatoriyalar, matn/ha-yo‘q/son, javob saqlanishi, savol va saqlangan javobni ko‘rish, admin natija soni | Oddiyroq; `false` javobi ham “Yo‘q” bo‘lib ko‘rinadi |
| Sharhlar | Javob yozish, sabab bilan yashirish va qayta ko‘rsatish | Oddiy |
| Yordam xizmati | Murojaat yaratish, ochish, javob, yopish va ro‘yxatga qaytish | Oddiy |
| Bildirishnomalar | Yuqori tugma, jadval va o‘qilgan deb belgilash | Oddiy |
| Telegram | Ulash, holat, egani tasdiqlash checkboxi, uzish, xatodan qayta urinish | O‘rtacha; brauzerda Telegram holati simulyatsiya qilingan |
| Yangilik va tavsiyalar | Draft, tahrir, e’lon, arxiv va public feed | Oddiy |
| Amallar tarixi | Rolga mos bo‘lim, sana/soat va amallar jadvali | O‘qish uchun oddiy |

## Tuzatilgan muammolar

- Androidning eski bosh sahifa bloklari olib tashlandi; ishlatilmaydigan
  `HomeHighlights` kodi va READMEning eskirgan UI izohlari tozalandi.
- Katta shriftdagi banner badge/CTA overflowi tuzatildi.
- Reklama joyi bo‘sh/xato/yuklanish holatida ham butunlay olib tashlanadi;
  eskirgan parallel javob yangi ro‘yxatni qayta yozmaydi.
- `2026 M10 05` ko‘rinishidagi sana `05.10.2026`ga almashtirildi;
  muddat va reklama davri Asia/Tashkent vaqtida soati bilan ko‘rsatiladi.
- Bo‘sh kalendar sanasi bugunga qaytadi, sahifa yiqilmaydi.
- Bir nechta boshqaruvli forma maydoni bitta HTML label ichiga o‘ralmaydi;
  “Bola qo‘shish” va ro‘yxat tugmalarining accessibility nomlari to‘g‘ri.
- Vazifa oluvchilari tanlangan sanatoriyaning faol xodimlari bilan cheklangan.
- Anketada savollar, saqlangan javob va admin javoblar soni ko‘rinadi.
- Bank o‘tkazmasini ma’qullash tugmasining noto‘g‘ri “Bepul joylash” nomi
  “Ma’qullash”ga tuzatildi.
- Sessiya tekshiruvi va access-token yangilanishi faolsizlik muddatini
  uzaytirmaydi. JavaScript o‘chirilganda ham server idle sessiyani rad etadi.
- Production bootstrap MFA siri/URI logga chiqarilmaydi; maxfiy enrollment
  fayliga yoziladi, mavjud faylning ustiga yozilmaydi.
- Secret scanner Gitda kuzatiladigan, ammo lokalda o‘chirilgan faylda
  to‘xtab qolmaydi; mavjud yuboriladigan fayllarni tekshiradi.

## Dalillar va chegaralar

API, Flutter va brauzerning yakuniy sonlari [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)da.
Brauzer menyu/tugma inventari va telefon o‘lchamidagi rasmlar `.local/ui-review`da;
Playwright hisobot va trace `.local/playwright-report` va `.local/playwright-results`da.
APK `.local/releases/sihhat-uz-preview.apk`; build/APK, maxfiy hisoblar va
lokal tekshiruv dalillari Gitga kiritilmaydi.

Bu tekshiruvlar production deploymenti, rasmiy merchant qabul sinovi,
haqiqiy bank o‘tkazmasi, har bir brauzer/qurilma yoki real xodimning
usability tadqiqotini tasdiqlamaydi. Tugmalar rol va holatga qarab ko‘rinadi;
CSV importi, parolni tiklash va ayrim xavfli sozlash amallari brauzerda
ochish/yopishgacha, ularning server qoidalari API testlarida tekshirilgan.
