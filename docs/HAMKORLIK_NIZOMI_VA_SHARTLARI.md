# Sihhat.uz — Hamkorlik nizomi va shartlari (Sanatoriyalar uchun)

- **Amaldagi tahrir sanasi:** `2026-11-15`
- **Qo‘llanilish sohasi:** `Sihhat.uz` platformasiga ulangan yoki ulanish uchun ariza topshirgan barcha sanatoriyalar, profilaktoriyalar va sog‘lomlashtirish markazlari, shuningdek ularning **Direktor**, **Resepsion** va **Hisobchi** xodimlari uchun majburiy nizom.
- **Sinxron veb-manbalar:**
  - Hamkor shartlari moduli: [`packages/ui/src/partner-terms.tsx`](../packages/ui/src/partner-terms.tsx) (`Hamkor paneli -> Sozlamalar -> Hamkor shartlari`, 4 bosqichli anketa ustasi va asosiy sayt modali)
  - Moliyaviy va texnik hujjatlar: [`docs/MERCHANT_CONNECTIONS.md`](./MERCHANT_CONNECTIONS.md), [`docs/TEZCHECK.md`](./TEZCHECK.md), [`docs/HISOBCHI_PANEL.md`](./HISOBCHI_PANEL.md), [`docs/RUNBOOK.md`](./RUNBOOK.md)

---

## Mundarija

1. [1-bob. Umumiy qoidalar, maqom va 0% komissiya tamoyili](#1-bob-umumiy-qoidalar-maqom-va-0-komissiya-tamoyili)
2. [2-bob. Onboarding, anketa, litsenziya, suratlar va moderatsiya](#2-bob-onboarding-anketa-litsenziya-suratlar-va-moderatsiya)
3. [3-bob. Xonalar fondi, kvota, tariflar va narx pariteti](#3-bob-xonalar-fondi-kvota-tariflar-va-narx-pariteti)
4. [4-bob. Bron intizomi, qo‘lda bronlar, Check-in, Xona ko‘chirish va No-show](#4-bob-bron-intizomi-qolda-bronlar-check-in-xona-kochirish-va-no-show)
5. [5-bob. Bank rekvizitlari, Merchant ulanishi va Direct Settlement](#5-bob-bank-rekvizitlari-merchant-ulanishi-va-direct-settlement)
6. [6-bob. Joyida naqd (`CASH`) va terminal (`TERMINAL`) to‘lovlar auditi](#6-bob-joyida-naqd-cash-va-terminal-terminal-tolovlar-auditi)
7. [7-bob. Payoutlar (Sanatoriyaga o‘tkazma), TezCheck `REVIEW` va Refund intizomi](#7-bob-payoutlar-sanatoriyaga-otkazma-tezcheck-review-va-refund-intizomi)
8. [8-bob. Abonent to‘lovi (`SubscriptionPlans`) va bepul reklama joylashtirish](#8-bob-abonent-tolovi-subscriptionplans-va-bepul-reklama-joylashtirish)
9. [9-bob. Jamoa, RBAC rollari (Direktor, Resepsion, Hisobchi) va xavfsizlik](#9-bob-jamoa-rbac-rollari-direktor-resepsion-hisobchi-va-xavfsizlik)
10. [10-bob. Telegram bot, mehmon maxfiyligi, sharhlar va Support chat auditi](#10-bob-telegram-bot-mehmon-maxfiyligi-sharhlar-va-support-chat-auditi)
11. [11-bob. Qoidabuzarlik uchun sanksiyalar (`PAUSED`, `SUSPENDED`, `ARCHIVED`)](#11-bob-qoidabuzarlik-uchun-sanksiyalar-paused-suspended-archived)
12. [12-bob. Fors-major, yakuniy qoidalar va nizolarni hal qilish](#12-bob-fors-major-yakuniy-qoidalar-va-nizolarni-hal-qilish)

---

## 1-bob. Umumiy qoidalar, maqom va 0% komissiya tamoyili

1. **Hamkorlikning vujudga kelishi:** Hamkorlik 4 bosqichli sanatoriya anketasi to‘liq to‘ldirilib, «Hamkor shartlari» tasdiqlangach (`terms_accepted: true`), majburiy yuridik va tibbiy hujjatlar yuklanib, Sihhat.uz Superadmin administratori tomonidan `APPROVED` maqomi berilganidan so‘ng kuchga kiradi.
2. **0% bron komissiyasi va monetizatsiya modeli:**
   - Sihhat.uz orqali kelgan bronlardan **0% platforma komissiyasi** olinadi.
   - Platforma xizmatlaridan foydalanish ochiq **abonent to‘lovi rejasi (`SubscriptionPlan`)** asosida amalga oshiriladi.
   - Bosh sahifa (`HOME`) va qalqib chiquvchi (`POPUP`) reklama joylashtirish so‘rovlari faol hamkorlar uchun **bepul (`amount: 0`)** taqdim etiladi (Superadmin moderatsiyasi sharti bilan).
3. **Xodimlar harakati uchun javobgarlik:** Hamkor tashkilot o‘z sanatoriyasi nomidan tizimda ishlaydigan barcha **Direktor**, **Resepsion** va **Hisobchi** foydalanuvchilarining amallari, kiritilgan narx/kvota xatolari, qo‘lda bronlar hamda moliyaviy tasdiqlar uchun to‘liq yuridik va moddiy javobgar hisoblanadi.
4. **Shartlarni yangilash:** Ushbu nizomning yangilangan tahriri `PARTNER_TERMS_VERSION` sanasi bilan Hamkor portalida va veb-saytda e’lon qilinadi va e’lon qilingan sanadan boshlab barcha amaldagi hamkorlik munosabatlariga tatbiq etiladi.

---

## 2-bob. Onboarding, anketa, litsenziya, suratlar va moderatsiya

1. **Majburiy yuridik va operatsion rekvizitlar:**
   - Tashkilotning haqiqiy yuridik nomi (`legal_name`);
   - 9 xonali soliq to‘lovchi identifikatsiya raqami (**STIR**);
   - Aniq geografik hudud, haqiqiy pochta manzili, xarita havolasi/koordinatalar va borish yo‘riqnomasi (`directions`);
   - `+998XXXXXXXXX` formatidagi haqiqiy aloqa telefoni (`contact_phone`);
   - Kirish va chiqish vaqtlari (`check_in_time`, `check_out_time`);
   - Tibbiy ixtisoslik, xizmatlar ro‘yxati, qulayliklar va amaldagi **tibbiy faoliyat litsenziyasi / davlat ro‘yxatidan o‘tganlik hujjatlari** (`PRIVATE` ko‘rinishda yuklanadi).
2. **Suratlar standarti:**
   - Katalogda chop etish uchun kamida **4 tadan 30 tagacha** sifatli, haqiqiy surat yuklanishi talab etiladi (bitta fayl hajmi **8 MB** gacha).
   - Boshqa sanatoriya yoki internetdan olingan begona suratlar, chalg‘ituvchi kollajlar hamda suv belgili reklama bannerlarini xona/hudud surati sifatida joylash taqiqlanadi.
3. **Ommaviy va yopiq ma’lumotlarni ajratish:**
   - Sanatoriyaning ichki yuridik ma’lumotlari (`legal_name`, `stir`, `document_ids`, `terms_accepted`, `contact_phone`) ommaviy katalog API va mijoz ilovasidan yashiriladi (`publicProfile()`).
   - Mijozning telefon raqami hamkorga bron yaratilishidan oldin ochilmaydi.
4. **Moderatsiya bosqichlari:**
   - Profil **`DRAFT`** (qoralama) -> **`SUBMITTED`** (tekshiruvda) -> **`APPROVED`** (katalogda faol) yoki **`CHANGES_REQUESTED`** (tuzatish talab etiladi) holatlaridan o‘tadi.
   - Tasdiqlangan profilga muhim o‘zgarish kiritilganda u qayta moderatsiyaga yuborilishi mumkin; tuzatish so‘rovi kelganda ko‘rsatilgan sabab qisqa muddatda bartaraf etilishi shart.

---

## 3-bob. Xonalar fondi, kvota, tariflar va narx pariteti

1. **Xona toifalari va jismoniy xonalar:** Hamkor har bir xona toifasi (sig‘im, kattalar/bolalar o‘rni), unga biriktirilgan faol jismoniy xonalar va kunlik mavjud kvotani haqiqiy holatga mos holda yuritadi.
2. **Tarif rejalari (`RatePlan`) va qaytarish qoidalari:**
   - Har bir tarif rejasida narx, ovqatlanish/muolaja tarkibi, bolalar yosh siyosati hamda qaytarish turi (**`FULL_BEFORE_CUTOFF`** + `cutoff_hours` yoki **`NON_REFUNDABLE`**) aniq belgilanadi.
   - Narx va qoidalar o‘zgarganda `pricingVersion` oshadi: bungacha yaratilgan bronlar o‘z snapshotidagi narx va qaytarish shartini saqlab qoladi.
3. **Narx pariteti majburiyati:** Sihhat.uz foydalanuvchisi uchun sanatoriya kassa narxiga nisbatan sun’iy oshirilgan narx qo‘yish yoki kelgan mijozdan elektron vaucherda ko‘rsatilgandan ortiq yashirin to‘lov talab qilish taqiqlanadi (agar mijoz qo‘shimcha muolaja yoki alohida qo‘shimcha xizmatni o‘zi tanlamagan bo‘lsa).

---

## 4-bob. Bron intizomi, qo‘lda bronlar, Check-in, Xona ko‘chirish va No-show

1. **Overbooking (ikki marta sotish) taqiqi:**
   - Sanatoriyaga telefon (`PHONE`), to‘g‘ridan-to‘g‘ri tashrif (`WALK_IN`) yoki hamkorning ichki kanali (`PARTNER_MANUAL`) orqali kelgan har bir bron ikki marta sotilishining oldini olish uchun darhol tizimdagi **«Qo‘lda bron»** funksiyasi orqali kafolatlangan (`guaranteed: true`, holati `CONFIRMED`) bron sifatida kiritilishi shart.
   - Tizimda mavjud o‘rin bor ko‘rsatilgan va mijoz to‘lagan tasdiqlangan bronni joy yo‘qligi bahonasida rad etish qat’iy intizomiy buzilish hisoblanadi.
2. **Mijozning 5 daqiqalik `HOLD` mexanizmi:**
   - Mobil/veb mijoz bron boshlaganda xona **5 daqiqaga** band bo‘ladi (`HOLD`).
   - 5 daqiqa ichida to‘lov tushmasa tizim holdni avtomatik bekor qilib xonani bo‘shatadi. Hamkor to‘lovsiz `HOLD` bosqichidagi bronni tasdiqlangan bron deb hisoblamasligi kerak (`HOLD` holatida vaucher berilmaydi).
3. **Joylashish (`CHECKED_IN`) va ketish (`CHECKED_OUT`):**
   - Mehmon kelganida uning QR-vaucheri/bron raqami va hujjatlari tekshiriladi, bron `CONFIRMED` -> **`CHECKED_IN`** ga o‘tkaziladi.
   - Mehmon ketayotganda **`CHECKED_OUT`** belgilanadi (bu sanatoriya o‘tkazmasi/payout va mijoz sharhi uchun asosiy shartlardan biridir).
4. **Xonani ko‘chirish (`move`):**
   - `CONFIRMED` yoki `CHECKED_IN` holatidagi bronni faqat **o‘sha xona toifasidagi** bo‘sh va faol boshqa xonaga, majburiy asosli sabab (`reason`) ko‘rsatgan holda ko‘chirish mumkin.
5. **Kelmaslik (`NO_SHOW`):**
   - `CONFIRMED` bron bo‘yicha mehmon kelmaganida faqat majburiy sabab (`reason`) kiritib `NO_SHOW` holatiga o‘tkaziladi; bu holatda faol xona bandligi bo‘shatiladi (`active: false`).

---

## 5-bob. Bank rekvizitlari, Merchant ulanishi va Direct Settlement

1. **Tasdiqlangan bank rekvizitlari:**
   - Moliya bo‘limi ishlashi uchun sanatoriyaning **20 xonali hisob raqami**, **5 xonali MFO**, **9 xonali STIR**, **bank nomi** va **yuridik nomi** kiritiladi va Superadmin tomonidan tasdiqlanadi (`BankRevision: APPROVED`).
   - Bank rekvizitlari o‘zgarganda eski tasdiq o‘zboshimchalik bilan o‘zgartirilmaydi — alohida yangilash so‘rovi (`bankRequest`) yuboriladi va moderatsiyadan keyin kuchga kiradi.
2. **To‘g‘ridan-to‘g‘ri hisob-kitob (`BOOKING_SETTLEMENT_MODE=direct`) va `MerchantSetup`:**
   - Har bir sanatoriya bank rekvizitlaridan alohida ravishda to‘lov tizimiga ulanish qaydi (`MerchantSetup`: `NOT_CONNECTED`, `WAITING_MERCHANT`, `WAITING_VERIFICATION`, `ACTIVE`, `SUSPENDED`) ga ega bo‘ladi.
   - Bank rekvizitlari hamda merchant ulanishi to‘liq faol (`payments_enabled: true`) bo‘lmaguncha mijoz ilovasida onlayn to‘lov xavfsizlik nuqtai nazaridan cheklanadi (`MERCHANT_NOT_READY`).
   - **Qat’iy xavfsizlik qoidasi:** To‘lov provayderlarining maxfiy API kalitlari yoki parollari sanatoriya profil formasiga yoki oddiy metadata maydonlariga hech qachon kiritilmaydi va saqlanmaydi.

---

## 6-bob. Joyida naqd (`CASH`) va terminal (`TERMINAL`) to‘lovlar auditi

1. **Qayerda qo‘llaniladi:** Joyida naqd (`CASH`) yoki bank terminali (`TERMINAL`) orqali to‘lov qayd etish **faqat qo‘lda yaratilgan bronlar** (`PHONE`, `WALK_IN`, `PARTNER_MANUAL` — ya’ni `APP` dan tashqari bronlar) uchun `CONFIRMED`, `CHECKED_IN` yoki `CHECKED_OUT` holatida qo‘llaniladi.
2. **Summa chegarasi:** Bir bronga biriktiriladigan barcha tasdiqlangan offline to‘lovlar yig‘indisi bronning umumiy summasidan (`booking.amount`) oshmasligi shart (`AMOUNT_EXCEEDS_DUE`).
3. **Ikki kishilik nazorat (Four-Eyes Principle):**
   - To‘lovni tizimga kiritgan xodim (`recordedBy`) o‘sha to‘lovni yakka o‘zi tasdiqlay olmaydi (`SECOND_REVIEW_REQUIRED`, `403`).
   - Har bir naqd/terminal to‘lovi vakolatli **ikkinchi xodim** (`verifiedBy`) tomonidan tekshirilib tasdiqlanishi (`VERIFIED`) shart.
4. **Xato yozuvni o‘chirish taqiqi (`CORRECTED` auditi):**
   - Noto‘g‘ri summa yoki usulda tasdiqlangan offline to‘lov tizimdan o‘chirilmaydi; buning o‘rniga yangi to‘lov yozuvida `correction_of` bog‘lamasi ko‘rsatiladi va avvalgi yozuv **`CORRECTED`** audit maqomiga o‘tkaziladi.

---

## 7-bob. Payoutlar (Sanatoriyaga o‘tkazma), TezCheck `REVIEW` va Refund intizomi

1. **Payout (O‘tkazma) shakllantirish mezonlari:**
   - Bron faqat quyidagi barcha shartlar bajarilgandagina sanatoriyaga o‘tkazma ro‘yxatiga kiritilishi mumkin:
     1. bron **`CHECKED_OUT`** maqomida bo‘lsa;
     2. onlayn to‘lov **`SUCCEEDED`** bo‘lsa;
     3. tasdiqlangan bank rekvizitlari (`BankRevision: APPROVED`) mavjud bo‘lsa;
     4. bronda ochiq refund so‘rovi (rad etilmagan `RefundRequest`) bo‘lmasa;
     5. to‘lovda TezCheck **`REVIEW`** bayrog‘i bo‘lmasa (`PAYMENT_RECONCILIATION_REQUIRED`).
2. **Payout tasdiqlash va bank dalili:**
   - Payout `DRAFT` -> `APPROVED` -> `PAID` (yoki `FAILED`/`CANCELLED`) bosqichlaridan o‘tadi.
   - To‘lov o‘tkazilganini yakuniy tasdiqlash (`payoutVerify`) uchun haqiqiy bank referent raqami (`bank_reference`) va `PRIVATE` ko‘rinishdagi **bank to‘lov dalili fayli** (`evidence_asset_id`) majburiy yuklanadi.
3. **TezCheck `REVIEW` cheklovi:** To‘lov callbacki yoki solishtirish vaqtida summada/holatda nomuvofiqlik chiqib hisob `REVIEW` holatiga tushsa, solishtirish tugamaguncha payout shakllantirilmaydi va tasdiqlanmaydi.
4. **Refund intizomi:**
   - Tarifda belgilangan cutoff muddati ichidagi qaytarish so‘rovlariga hamkor to‘sqinlik qilmasligi lozim.
   - TezCheck Merchant API v1 kabi avtomatik refund mavjud bo‘lmagan provayderlarda platforma administratsiyasi ma’qullagan (`APPROVED`) qaytarishlar tasdiqlangan merchant kabineti orqali zudlik bilan boshlanishi va provayder tasdig‘i asosida yakunlanishi shart.
   - `NON_REFUNDABLE` tariflarda ham ikki marta yechish (`PAYMENT_EXCEPTION`) yoki sanatoriya aybi bilan joy berilmasligi holatida mablag‘ mijozga to‘liq qaytariladi.

---

## 8-bob. Abonent to‘lovi (`SubscriptionPlans`) va bepul reklama joylashtirish

1. **Abonent rejalari va to‘lov intizomi:**
   - Platforma bilan hamkorlik faol abonent rejasi asosida yuritiladi va obuna quyidagi holatlarda boshqariladi: **`TRIAL`** (sinov davri), **`ACTIVE`** (faol), **`PAST_DUE`** (muddat o‘tgan imtiyozli davr — `graceDays`) va **`SUSPENDED`** (to‘xtatilgan).
   - Hisob-fakturalar (`Invoice`) belgilangan to‘lov muddatida «Abonent va hisoblar» bo‘limi orqali qoplanishi lozim.
   - Imtiyozli muddat tugagandan keyin hisob qoplanmasa obuna avtomatik **`SUSPENDED`** holatiga o‘tadi: sanatoriya ommaviy katalogdan yashiriladi va yangi onlayn bronlar to‘xtatiladi, biroq ilgari to‘langan va tasdiqlangan mijoz bronlari bo‘yicha xizmat majburiyati to‘liq saqlanadi.
2. **Bepul reklama (`HOME` va `POPUP`) joylashtirish qoidalari:**
   - Sanatoriyalar veb-portal va mobil ilova uchun asosiy sahifa banneri (`HOME`) hamda qalqib chiquvchi reklama (`POPUP`) so‘rovlarini **bepul (`amount: 0`)** yuborishlari mumkin.
   - Barcha reklama so‘rovlari faqat Superadmin moderatsiyasidan (`PENDING` -> `APPROVED`) o‘tgach belgilangan sanalarda nashr qilinadi (`ad.free_published`).
   - Reklamada haqiqatga to‘g‘ri kelmaydigan soxta chegirma, tasdiqlanmagan tibbiy davolash kafolati, qonunchilik bilan taqiqlangan reklama obyektlari yoki raqobatchi sanatoriyalarni kamsitish qat’iyan man etiladi.

---

## 9-bob. Jamoa, RBAC rollari (Direktor, Resepsion, Hisobchi) va xavfsizlik

1. **Uchta rol va vakolat chegaralari:**
   - **Direktor:** Sanatoriya profili, hujjatlar, bank/merchant sozlamalari, xonalar va narxlar, xodimlarni taklif qilish/bloklash, bronlar, to‘lovlar, hisob-kitoblar, reklama, Telegram bot va hisobotlarni boshqarish.
   - **Resepsion:** Kunlik kelish/ketishlar ro‘yxati, xona fondi va bronlarni ko‘rish, qo‘lda bron kiritish, Check-in/Check-out/No-show belgilash, joyida to‘lov qabul qilish/tasdiqlash (vakolatiga ko‘ra), sharhlarga javob berish va support aloqasi.
   - **Hisobchi:** Qat’iy izolyatsiyalangan moliyaviy-hisob rolidir. Hisobchi veb-portalda faqat dashboard/hisobotlar (`Umumiy ko‘rinish`), `Mening hisobim`, `Hamkor shartlari` va `Foydalanish yo‘riqnomasi` sahifalarini ko‘radi; barcha moliyaviy sanalar `Asia/Tashkent (UTC+5)` da hisoblanadi, CSV eksportlari formula-inyeksiyadan himoyalangan holda yuklanadi va Hisobchi bemor bronlarini o‘zgartira olmaydi.
2. **Parol va shaxsiy login intizomi:**
   - Parol kamida 8 belgi (max 128) bo‘lib, **katta harf (`A-Z`), kichik harf (`a-z`) va raqam (`0-9`)**ni o‘z ichiga olishi majburiy.
   - Har bir xodim o‘z shaxsiy loginida ishlaydi; bitta loginni bir necha kishiga berish taqiqlanadi.
   - Xodimga yaratilgan dastlabki parol birinchi kirishdayoq almashtirilishi shart (`forcePasswordChange`).
   - Xodim ishdan bo‘shaganda Direktor darhol «Jamoa va ruxsatlar» bo‘limidan uning kirishini to‘xtatishi majburiy.
3. **Sessiya, idle timeout va brute-force nazorati:**
   - Veb-portalda xodim sessiyasi **4 soat harakatsizlikdan so‘ng** avtomatik yakunlanadi (`SESSION_IDLE_EXPIRED`) (Superadmin uchun 2 soat).
   - 60 daqiqa ichida **5 va undan ortiq marta** noto‘g‘ri parol kiritilganda Superadminlarga xavfsizlik ogohlantirishi yuboriladi va kirish urinishlari cheklanadi (`RATE_LIMITED`).
   - Parol unutilganda hamkor login/telefon ma’lumoti bilan «Parolni unutdingizmi?» (`forgot-password`) so‘rovi yuboriladi va xavfsiz tekshiruvdan so‘ng tiklanadi.

---

## 10-bob. Telegram bot, mehmon maxfiyligi, sharhlar va Support chat auditi

1. **Telegram bot (`@sihhat_admins_bot`):** Direktor va resepsion xodimlari muhim bron, to‘lov, parol tiklash va yordam xabarlarini o‘z vaqtida olish uchun `@sihhat_admins_bot` bilan bog‘lanishni sozlashlari shart.
2. **Mehmon ma’lumotlarini sir saqlash:**
   - Mehmonning F.I.Sh., `+998` telefoni, elektron pochtasi, bolalari ma’lumotlari va tibbiy/tashrif tafsilotlari «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonunga muvofiq faqat bron va davolash xizmati uchun ishlatiladi.
   - Mehmon ma’lumotlarini tashqi reklama bazalariga sotish, messenjer guruhlariga tarqatish yoki uchinchi shaxslarga berish qat’iyan taqiqlanadi.
3. **Sharhlar bilan ishlash odobi:**
   - Sharh faqat yakunlangan tashrif (`CHECKED_OUT`) dan keyin yoziladi.
   - Hamkor tanqidiy sharhlarga ham professional odob va haqiqiy faktlar bilan javob qaytarishi lozim; mehmonga bosim o‘tkazish, qo‘rqitish yoki soxta ijobiy sharh yozdirish taqiqlanadi.
4. **Support chat va `AuditLog` saqlanishi:**
   - Hamkor portalidagi «Yordam va xabarlar» chatida xodim yoki mijoz o‘chirgan xabarlar suhbat oynasidan ko‘rinmasa ham, nizolarni hal qilish maqsadida **Superadmin audit jurnalida** saqlanadi.
   - Narx o‘zgartirish, xona ko‘chirish, to‘lov qabul qilish/tasdiqlash va xodim huquqlarini o‘zgartirish kabi barcha muhim harakatlar o‘chirilmaydigan `AuditLog` jurnalida yozib boriladi (xodimning onlayn holati 180 soniyalik faollik oynasida kuzatiladi).

---

## 11-bob. Qoidabuzarlik uchun sanksiyalar (`PAUSED`, `SUSPENDED`, `ARCHIVED`)

Mazkur Hamkorlik nizomi buzilgan taqdirda Sihhat.uz qoidabuzarlikning og‘irligiga mutanosib tarzda quyidagi choralarni qo‘llash huquqiga ega:
1. **Rasmiy ogohlantirish va tuzatish muddati (`CHANGES_REQUESTED`):** Suratlar, hujjatlar, tarif yoki aloqa intizomidagi tuzatilishi mumkin bo‘lgan kamchiliklar uchun.
2. **Vaqtincha to‘xtatish (`PAUSED` / `SUSPENDED`):**
   - Muntazam overbooking va tasdiqlangan brondan bosh tortish;
   - Abonent qarzdorligini imtiyozli muddat (`graceDays`) ichida yopmaslik;
   - Ikki kishilik tasdiqsiz naqd to‘lov yuritish yoki bank/refund majburiyatini bajarishdan bosh tortish;
   - Soxta sharh uyushtirish yoki mijozga qo‘pol/nohalol munosabatda bo‘lish holatlarida.
3. **Hamkorlikni bekor qilish (`ARCHIVED`):** Qalbaki tibbiy litsenziya/STIR/yuridik hujjat taqdim etilganda, mehmonlarning shaxsiy yoki tibbiy ma’lumotlari qasddan tarqatilganda yoxud qo‘pol qoidabuzarliklar takrorlanganda.
4. **Muhim shart:** Sanatoriya faoliyati platformada to‘xtatilgan yoki arxivlangan taqdirda ham, bungacha qabul qilingan va to‘langan mijoz bronlari bo‘yicha joylashtirish yoki mablag‘ni to‘liq qaytarish majburiyati hamkor zimmasida qoladi.

---

## 12-bob. Fors-major, yakuniy qoidalar va nizolarni hal qilish

1. **Fors-major:** Tabiiy ofatlar, yong‘in, epidemiologik yoki davlat organlari cheklovlari, banklararo to‘lov tizimlari, internet yoki elektr energiyasidagi favqulodda uzilishlar sababli majburiyatni vaqtincha bajara olmaslik holatida hamkor darhol Yordam chatiga xabar berishi shart; tomonlar mehmonlar manfaatini ustun qo‘ygan holda bronni ko‘chirish yoki mablag‘ni qaytarish tartibini kelishadi.
2. **Platforma ma’muriyati rekvizitlari:**
   - **Qo‘llab-quvvatlash telefoni:** `+998 88 295 20 28`
   - **Hamkor/Admin Telegram boti:** `@sihhat_admins_bot` · **Mijozlar boti:** `@sihhat_support_bot`
   - **Manzil:** Toshkent shahri, Shayxontohur tumani, Navoiy ko‘chasi 11A
3. **Nizolarni hal etish:** Barcha kelishmovchiliklar avvalo platforma administratsiyasi ishtirokida bron snapshotlari, bank dalillari, chat tarixi va `AuditLog` asosida muzokara yo‘li bilan hal qilinadi; kelishuvga erishilmasa, nizo O‘zbekiston Respublikasi qonunchiligi va Toshkent shahri vakolatli sudlari tartibida ko‘rib chiqiladi.
