# Sihhat uz: ishlab chiqish va qabul rejasi

Bu reja [talablar va arxitektura](SIHHAT_UZ_ARXITEKTURA.md) bilan birga ishlatiladi. Talablar to‘qnashsa foydalanuvchining keyingi aniq qarori ustun; tegishli hujjatlar birga yangilanadi.

## 1. Ish tartibi

```text
Backend B0–B10
    -> backend qabul mezonlari
    -> superadmin sayti F1
    -> direktor/resepsion sayti F2
    -> Android APK F3
    -> birgalikdagi sinov va pilot R1
```

Backend tayyor bo‘lguncha mahsulot frontend kodi yozilmaydi. OpenAPI/Swagger orqali API sinash va UX ekranlarini hujjatlashtirish mumkin. Har bosqich real ishlaydigan kod, migration, kerakli sinov va qisqa runbook bilan tugaydi.

Texnologiyalar arxitektura hujjatidagi taklif bo‘yicha; agar foydalanuvchi boshqasini tanlasa avval qaror yoziladi. Dependencylar o‘zaro mos, qo‘llab-quvvatlanadigan versiyalarda va lockfile bilan.

## 2. Backend bosqichlari

### B0. Poydevor va shartnoma

Natija:

- Mavjud papka/fayllarni tekshirish, NestJS backendni boshlash; hali web/mobile dasturi yo‘q.
- PostgreSQL, Redis va S3-mos local storage uchun Docker Compose.
- API va worker entrypointlari, config validatsiya, request ID, log va health/readiness.
- Env namunalari; production/test/local credentiallar alohida.
- OpenAPI boshlang‘ich sxemasi, xato formati va pagination.
- DB migration tartibi, seed, test DB va CI skriptlari.
- `docs/IMPLEMENTATION_STATUS.md`: bosqich, bajarilgan ish, sinovlar, ochiq tashqi bog‘liqliklar.

Qabul: yangi checkout/papkadan READMEdagi buyruqlar bilan DB va API ishga tushadi; missing env tushunarli xato beradi; sirlar repoga yozilmaydi.

### B1. Hisoblar, a’zolik va ruxsatlar

Natija:

- Staff login, vaqtinchalik parol, birinchi parol almashtirish, refresh/logout.
- Mijoz OTP request/verify; local/test SMS adapter va real adapter chegarasi.
- Superadmin MFA, birinchi superadminni xavfsiz bootstrap qilish.
- Rol shablonlari, sanatoriya a’zoligi, aniq grant/deny va delegatsiya chegarasi.
- Direktor tayinlash/almashtirish, resepsion taklifi, pending/approve/reject/block.
- Profil, login/parol o‘zgarishi va audit.

Qabul: pending resepsion operatsion APIga kira olmaydi; direktor superadmin permissionini bera olmaydi; sanatoriya A xodimi B ma’lumotini read/write/export orqali ololmaydi; bloklangan sessiya ishlamaydi; OTP qayta qo‘llanmaydi.

### B2. Sanatoriya, anketa va moderatsiya

Natija:

- Sanatoriya yaratish, onboarding drafti, majburiy maydonlar va hujjatlar.
- E’lon revisionlari, submit/approve/request-changes va public revision.
- Media upload, public/private rasm va hujjat kirish qoidalari.
- Hudud/qulaylik/xizmat kataloglari.
- Pause/archive/reopen; mavjud bronlarni saqlash.
- Direktor va resepsion uchun onboarding cheklovi.

Qabul: tasdiqsiz e’lon katalogda chiqmaydi; tekshiruvdagi tahrir oldingi public versionni o‘zgartirmaydi; eskirgan version approve bo‘lib ketmaydi; boshqa sanatoriya private hujjati olinmaydi.

### B3. Xona, tarif va narx hisoblash

Natija:

- Xona turi va real xonalar; sig‘im/yosh qoidalari.
- Tarif, kunlik narx, ovqat/paket va minimum stay.
- Xona/tun va kishi/tun hisoblash; to‘liq xona allocationi.
- Oddiy chegirma: foiz yoki aniq summa, amal davri va chegaralar; boshlang‘ich taklif — bir bron uchun bitta kampaniya, qo‘shish qoidasi explicit.
- Sotuv yopilishi va ta’mir bloklari.
- Quote DTOsi, price/policy snapshoti, muddati va body/version tekshiruvi.

Qabul: bir xil kirish bir xil hisob beradi; bolalar yosh chegarasi, ko‘p xona, turli kun narxi va chegirma to‘g‘ri hisoblanadi; client narx yuborib summani kamaytira olmaydi; pul hisobida float yo‘q.

### B4. Bron va inventar transactionlari

Natija:

- Quote asosida hold, barcha xonalarga atomik allocation.
- PostgreSQL exclusion constrainti SQL migrationda.
- Butun davr uchun real xona mavjudligi; xona ko‘chirishning transactioni.
- Bron holatlari va event tarixi.
- Idempotency va bounded concurrency retries.
- Dastlabki hold expiry, provider transaction uchun alohida himoyalangan muddat.
- Manual bron, source turlari, kelish/ketish va no-show.

Qabul: oxirgi xona uchun 20 parallel urinishda faqat bitta hold; ko‘p xonali bron qisman saqlanmaydi; yonma-yon kunlar mumkin; ta’mir va manual bron online bron bilan to‘qnashmaydi; har kungi umumiy son bir xil real xona yo‘qligini yashirmaydi.

### B5. To‘lov va ledger

Natija:

- Bron, abonent va reklama uchun alohida payment orderlari.
- Payment adapter interface va tekshirilgan capabilitylar.
- Birinchi provayder protokoli, checkout va barcha majburiy metodlar.
- Doimiy provider transaction/event saqlash, callback auth va summa nazorati.
- Provider Created holatidagi xona bandligi; protokolga mos expiry/cancellation.
- Successful payment + booking + journal + outbox transactioni.
- Ikki tomonlama subledger va unique source event.
- Provayder/bank reestrini import qilish hamda tafovut navbati.

Qabul: takroriy callback bitta posting; noto‘g‘ri summa/auth reject; qaytish URLi to‘lov tasdiqlamaydi; parallel timeout va success ikki zid natija bermaydi; jurnal debit/creditlari teng; reklama/abonent va bron mablag‘i alohida.

Tashqi credential bo‘lmasa providerga o‘xshash protokol chaqiriqlari local fixture orqali sinov qilinadi. Natija «local protocol tests passed» deb belgilanadi; rasmiy sandbox sinovi haqiqiy credential bilan alohida qayd qilinadi.

### B6. Refund, offline to‘lov va payout

Natija:

- Tasdiqlangan shablonlardan policy; bron bilan policy versionini saqlash.
- To‘liq refund request/approve/reject/process/provider-confirmed result.
- Refund payout mablag‘ini rezervlaydi; qayta request duplikat bo‘lmaydi.
- Joyida to‘lov qaydi, alohida verify va correction tarixi; platforma PSP oqimiga qo‘shilmaydi.
- Payout batch/item, eligible bronlar, rezerv, approve va bank dalilini verify qilish.
- Payout failure reversal, payoutdan keyingi refund uchun receivable/rezerv oqimi.
- Direktor uchun settlement statement.

Qabul: bir bron summasi ikkita payoutda ajratilmaydi; refund va payout parallel kelganda qoldiq ortiqcha sarflanmaydi; verify qilinmagan bank o‘tkazmasi `PAID` emas; resepsion PSP holatini tahrirlay olmaydi; refund muvaffaqiyati haqiqiy provider tasdiqiga bog‘langan.

### B7. Abonent va reklama

Natija:

- Tariflar, xizmat davri, invoice va invoice itemlari.
- Trial/active/past-due/suspended oqimlari, imtiyozli muddat konfiguratsiyasi.
- Reklama so‘rovi, tasdiq, kampaniya davri va ko‘rsatiladigan joy.
- Reklama/abonent order to‘lovi hamda davriy xizmat daromadi postinglari.
- Ko‘rsatish/click voqealari, oddiy deduplikatsiya va hisobot.
- Pullik joyda reklama belgisini chiqarish uchun API maydoni.

Qabul: tugagan reklama ko‘rinmaydi; hidden sanatoriya reklama bilan qaytib chiqmaydi; abonent to‘lanmasa mavjud bron va refund/support jarayonlari saqlanadi; billing ikki marta qilinmaydi.

### B8. Xabar, vazifa, anketa, sharh va support

Natija:

- Recipient-scope xabar/ogohlantirishlar, broadcast snapshot.
- Task assignment, due date va receipt holatlari.
- Versiyalangan qo‘shimcha anketa va javoblar.
- Outbox dispatcher, push/SMS/in-app adapterlar, delivery retry/failure ko‘rinishi.
- Yakunlangan yashash uchun sharh, direktor javobi, moderatsiya sababi.
- Support ticket va refund/booking bilan bog‘lanish.

Qabul: direktor boshqa sanatoriyaga broadcast qilolmaydi; recipient bo‘lmagan xodim fayl/xabarni ko‘rmaydi; worker qayta ishga tushganda event yo‘qolmaydi; faqat o‘z yakunlangan bronidan sharh; notification xatosi bronni rollback qilmaydi.

### B9. Qidiruv, hisobot va AI

Natija:

- Filtrlangan katalog, sort, favorite va solishtirish uchun ma’lumot.
- Operatsion/financial/platform reportlari; sanatoriya scope va eksport.
- Bron, to‘lov, xizmat sanalari bo‘yicha farqli filterlar; occupancy formulasi.
- AI adapter, public katalog/FAQ retrieval va read-only search/quote vositalari.
- AI limit/cost monitoring va oddiy qidiruv fallbacki.

Qabul: A direktori B hisoboti yoki platforma daromadini ololmaydi; GMV platforma daromadi deb chiqmaydi; ta’mir xonalari bandlik denominatoriga kirmaydi; AI maxfiy ma’lumot olmaydi va narx/bo‘sh joyni uydirmaydi; AI xatosi oddiy bronni to‘xtatmaydi.

### B10. Backendni yakuniy qabul qilish

Natija:

- OpenAPI to‘liq, barcha endpointlarda auth/permission/scoping.
- Migrationlar toza DBda va ketma-ket upgrade orqali tekshirilgan; exclusion cheklovi saqlanadi.
- Seed: superadmin, ikki sanatoriya, ikki direktor, faol/pending resepsionlar, xonalar/tariflar va test mijozlar. Productionda demo parollar bilan bootstrap yo‘q.
- Real PostgreSQLdagi meaningful integratsion sinovlar; controllerlarning faqat happy-path mocklari yetarli emas.
- API smoke ssenariysi: yaratish → approve → quote/hold → payment → check-in/out → payout; cancellation/refund muqobil oqimi.
- Backup/restore, logging va worker qayta ishga tushishi bo‘yicha runbook.
- Backendni ishga tushirish, sinash, migration va provider setup uchun buyruqlar READMEga.

Frontendga o‘tish sharti: local backend oqimlari va quyidagi muhim sinovlar o‘tgan, OpenAPI mijoz yozish uchun barqaror, bajarilmagan tashqi tekshiruvlar aniq qayd qilingan. Real SMS/payment/AI credential bo‘lmasa bu ishlab chiqishni to‘xtatmaydi, lekin productionga chiqish uchun tashqi tekshiruvlar yopilishi shart.

## 3. Muhim backend sinovlari

| Sinov | Kutiladigan natija |
| --- | --- |
| Cross-tenant read/write/file/export | Boshqa sanatoriya ma’lumoti olinmaydi |
| Direktor privilege escalation | Delegatsiya chegarasi buzilmaydi |
| Pending/blocked xodim | Operatsion API ishlamaydi |
| Bir martalik OTP | Ikkinchi verify yoki limitdan ortiq urinish rad |
| Oxirgi xona uchun parallel so‘rov | Ko‘pi bilan 1 faol allocation |
| Bir bronda 2 xona, bittasi band | Hech qaysi xona qisman ajratilmaydi |
| Har tunda boshqa xona bo‘sh | Uzluksiz xona yo‘q deb qaytadi |
| Ketish/kelish bir sana | `[a,b)` va `[b,c)` bronlari mos |
| Manual bron va online hold parallel | Bir allocation manbai ziddiyatni hal qiladi |
| To‘lov Created va oddiy hold expiry | Provider qoidasiga mos bandlik saqlanadi |
| Provider callback qayta yuborildi | Bitta to‘lov, bron va journal |
| Timeout/cancel/success tartibi almashdi | Noqonuniy state transition yo‘q |
| Narx o‘zgardi | Yangi quote qabul qilinadi; oldingi bron o‘zgarmaydi |
| Child rules/chegirma chegarasi | Serverdagi integer hisob to‘g‘ri |
| Refund va payout parallel | Ortiqcha mablag‘ ajratilmaydi |
| Offline to‘lov | PSP tushumi va platforma payablega qo‘shilmaydi |
| Payout tekshiruvsiz | Bankka ketdi deb ko‘rsatilmaydi |
| Ledger qayta posting | Unique source va balanced journal |
| Worker crash/retry | Commit qilingan event yo‘qolmaydi, posting duplikat emas |
| Hidden/unapproved katalog | Oddiy qidiruv, reklama va AI orqali chiqmaydi |
| Ikki operator eski draftni save/approve qildi | Version conflict, yangi ma’lumot yo‘qolmaydi |
| Policy o‘zgardi | Avvalgi bron snapshoti amal qiladi |
| Hisobot oy chegarasida | Xona-tun va pul/xizmat sanalari to‘g‘ri ajratiladi |

## 4. Frontend bosqichlari

### F1. Superadmin sayti

Ekranlar:

1. Login, MFA, sessiya/profil.
2. Dashboard: platforma daromadi, GMV va sanatoriyaga majburiyat alohida.
3. Sanatoriyalar: yaratish, director assignment, pause/archive.
4. Moderatsiya: anketa, tahrir taqqoslash, approve/request-changes.
5. Xodimlar: pending resepsion, permissions, block/reset.
6. Bronlar, to‘lovlar, refund va payment exceptionlar.
7. Payout: batch, itemlar, rekvizit, bank dalili va holat.
8. Abonent tariflari/invoicelar, reklama kampaniyalari.
9. Xabarlar, ogohlantirishlar, vazifalar va anketa yuborish.
10. Hisobotlar, provider/bank solishtirish, audit va support.

Talab: real API; loading/empty/error holatlari; jadval filtri/pagination; destructive/business transitionlarda tushunarli natija; bekor qilish sababini olish; optimistik tahrir konflikti ko‘rinishi. Moliyaviy sahifada «tasdiqlash» va «haqiqiy o‘tkazmani tekshirish» ikki alohida amal.

Qabul: UI orqali sanatoriya/direktor yaratish, staff/e’lon approve, to‘lovni ko‘rish, refund/payout boshqarish va audit izini tekshirish mumkin. UI tugmasi yo‘qligi backenddagi permission tekshiruvi o‘rnini bosmaydi.

### F2. Direktor/resepsion sayti

Ikkala rol uchun bitta login. Login natijasidagi role/effective permissionsga qarab menyu ochiladi. To‘g‘ridan-to‘g‘ri URL/API bilan taqiqlangan sahifa ochilmaydi.

Ekranlar:

1. Login, birinchi parol almashtirish, profil.
2. Majburiy sanatoriya anketasi: qadamlar, autosave, progress va qaytarilgan izohlar.
3. Dashboard: bugungi kelish/ketish va rolga mos ko‘rsatkichlar.
4. Sanatoriya e’lon drafti, rasmlar va moderation status.
5. Xona turlari, real xonalar, bandlik kalendari va ta’mir bloklari.
6. Narx kalendari, tarif/paket va chegirmalar — ruxsat bo‘lsa.
7. Bronlar, manual bron, to‘lovni o‘qish va check-in/out.
8. Offline to‘lov qaydi/tasdiqlash — ruxsatlar bo‘yicha.
9. Xodimlar va resepsion taklifi — direktor uchun.
10. Xabar/vazifa/anketa va support.
11. Oylik hisobot, abonent/reklama invoicei, settlement/payout — ruxsatlar bo‘yicha.

Qabul: direktor kerakli permissionni resepsionga beradi va bekor qiladi; natija amalda darhol seziladi; resepsion payment yozuvini tahrirlay olmaydi; manual bron umumiy kalendarda paydo bo‘ladi; yangi xodimdan butun onboarding qaytadan so‘ralmaydi.

### F3. Android APK

Ekranlar:

1. Telefon va SMS kodi; kod qayta yuborish taymeri, xato/limit holati.
2. Bosh sahifa: qidiruv, hudud, sanatoriyalar va belgilangan reklama.
3. Filtr/sort, saqlanganlar va sanatoriyalarni solishtirish.
4. Sanatoriya: rasmlar, sharoit, xizmatlar, xona/tarif, joylashuv va tekshirilgan sharhlar.
5. Sana/odam/xona tanlash; bolalar yoshi va har xona bo‘yicha taqsimlash.
6. Quote: jami narx, tarkib, tunlar va refund sharti.
7. Hold/to‘lov: haqiqiy muddat, provayderga o‘tish va API orqali holat.
8. Bron tasdig‘i, bron raqami/QR va hujjat.
9. Mening bronlarim: holat, cancellation/refund request, support.
10. AI suhbat: tavsiya kartasi va sanatoriyaga o‘tish.
11. Bildirishnomalar, profil va sharh qoldirish.

QR bronni qidirish uchun opaque identifikator; shaxsiy ma’lumot yoki kirish tokeni QRga joylanmaydi. Faqat vakolatli resepsion backend orqali bronni ochadi.

Talab: o‘zbekcha, tushunarli xatolar, ekran/o‘qish qulayligi, secure token storage, payment deep link/return, uzilgan internetdan tiklanish. Offline katalog cache bo‘lishi mumkin, quote/hold/pay uchun internet talab qilinadi; cache narxi bilan bron tasdiqlanmaydi.

Qabul: haqiqiy APIga ulangan APK test qurilmada to‘liq bron oqimini bajaradi; ilova payment vaqtida yopilib qayta ochilganda backenddagi holat tiklanadi; «muvaffaqiyatli» qaytish URLi yolg‘iz o‘zi paid holat yaratmaydi.

Android SDK/build vositalari bo‘lmasa flutter analyze/test va buildning bajarilmaganligi aniq qayd qilinadi. Olinmagan APK «tayyor» deb aytilmaydi. Release signing kaliti sir sifatida boshqariladi; debug build va signed release artefaktlari farqlanadi.

## 5. Birgalikdagi sinov va pilot

### R1. Pilotga tayyorlash

- Ikki test sanatoriya bilan xodim/direktor ruxsatlari va e’lonni to‘ldirish sinovi.
- Bitta real pilot sanatoriya bilan xona inventarini haqiqatga solishtirish.
- SMS va to‘lovning rasmiy test muhiti; provider acceptance mezonlari.
- Refund hamda bank payout natijalarini tekshirish va hisobotni solishtirish.
- Telefon/manual bronni o‘sha zahoti panelga kiritish bo‘yicha xodim yo‘riqnomasi.
- Backupdan tiklash, monitoring va incident mas’ullari.
- APKda telefon, payment return va notification oqimlari.

Haqiqiy pul bilan ish boshlashdan oldin yopiqlishi kerak:

1. Sihhat uz orqali markazlashgan pul qabul qilish uchun provider/bank bilan kelishilgan model va ishlaydigan merchant rekvizitlari.
2. Sanatoriya bilan refund, provider xarajati, payout va xizmatni bajarish shartlari.
3. Tasdiqlangan tarif/abonent/reklama narxlari, mijozga ko‘rsatiladigan policylar.
4. Chek/hujjat, shaxsiy ma’lumot va hosting masalalarining amaldagi talablarga mosligi.
5. Real sandbox/pilot tekshiruvlari, DB backup/restore va support jarayoni.

Bu bandlar keyinchalik productionga chiqishning tashqi bog‘liqliklari; dastur kodini/test adapterlarini ishlab chiqish uchun foydalanuvchidan qayta-qayta ruxsat so‘rash sababi emas.

## 6. Har bosqichda topshiriladigan dalil

- Nima ishlaydi va qaysi talab bajarildi.
- O‘zgargan asosiy fayllar/migrationlar.
- Bajarilgan tekshiruvlarning real natijasi.
- Ishga tushirish va sinash uchun takrorlanadigan buyruqlar.
- Bajarilmagan tashqi tekshiruvlar/credentiallar ro‘yxati.
- Keyingi bosqichning aniq boshlanish nuqtasi.

Stublar, demo ma’lumotlar, local payment simulator va haqiqiy integratsiya bir xil tayyorlik belgisi bilan ko‘rsatilmaydi. Sinov muvaffaqiyati aytilsa shu sinov haqiqatan bajarilgan bo‘lishi kerak.
