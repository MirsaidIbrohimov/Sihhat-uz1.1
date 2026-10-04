# Tezcheck integratsiyasi

Rasmiy shartnoma: [Tezcheck Savdogar API](https://tezcheck.uz/api-docs).
Backend `https://api.tezcheck.uz/api/merchant/v1`ga Bearer kalit va
HMAC-SHA256 imzosi bilan murojaat qiladi. Kalit brauzer, Flutter yoki
Telegram tugmasiga berilmaydi.

## Qayta diagnostika — 2026-10-04

19:26 (Asia/Tashkent)dagi `npm run tezcheck:check` `/me`, `/cash-desks`,
`/payment-methods`, `/transactions` va `/balance`ni muvaffaqiyatli o‘qidi.
API autentifikatsiyasi va imzo ishladi. Bitta tanlangan UZS kassada
`state=draft`, `accepts_payments=false` qaytdi; Click, Payme va Uzcard/Humo
usullari ro‘yxatda, tranzaksiya namunasi 0 edi.

Joriy backend `PAYMENT_MODE=tezcheck`; API kaliti va kassa kodi sozlangan.
Checkoutning hozirgi to‘sig‘i — kassada to‘lov qabul qilish o‘chiq.
[Rasmiy API](https://tezcheck.uz/api-docs)da `accepts_payments` hisob
yaratishga tayyorlikni belgilaydi. Kassani Tezcheck kabinetida faollashtirib,
shu buyruq bilan `accepts_payments=true` qaytishini tekshiring.

Webhook siri hali sozlanmagan; ommaviy HTTPS endpointini kabinetga ulash
quyidagi tartibda bajariladi. Polling mustaqil ishlaydi. Diagnostika hisob
yoki to‘lov yaratmagan, kassa holatini o‘zgartirmagan. Bu haqiqiy merchant
to‘lovi yoki production qabul sinovi emas.

## Haqiqiy ulanish dalili — 2026-10-03

Berilgan kalit bilan `/me`, `/cash-desks`, `/payment-methods`, `/transactions`,
`/balance` va `/stats` HTTP 200 qaytardi. Tashkilotda bitta kassa bor;
uning holati `draft`, `accepts_payments=false`, valyutasi UZS.
Click, Payme va Uzcard/Humo usullari ro‘yxatda bor; tranzaksiya ro‘yxati bo‘sh.
Bu autentifikatsiya va o‘qish ulanishi dalili. Haqiqiy to‘lov, refund yoki
bank o‘tkazmasi bajarilmadi; merchant production qabuli deb hisoblanmaydi.
To‘lov olish uchun Tezcheck kabinetidagi kassani faollashtirish kerak.

Maxfiy rekvizitlar `.local/secrets/providers.env`da, Windows fayl ruxsatlari
joriy foydalanuvchi va SYSTEM bilan cheklangan. Fayl Gitdan chiqarilgan.

```powershell
npm run tezcheck:check
```

Bu buyruq faqat autentifikatsiya, kassa va o‘qish endpointlarini tekshiradi.
Kalit, kassa kodi, to‘lov havolasi va mijoz tranzaksiyalari logga chiqmaydi.

## Sozlash

Backend environment yoki maxfiy faylda `PAYMENT_MODE=tezcheck`,
`TEZCHECK_API_KEY`, `TEZCHECK_CASH_DESK_CODE`, ixtiyoriy
`TEZCHECK_WEBHOOK_SECRET` va `TEZCHECK_HOLD_MINUTES=15` ishlatiladi.
Bitta kassa bo‘lsa avtomatik tanlanadi; bir nechta bo‘lsa kodi kerak.
Productionning haqiqiy SMS, HTTPS, private S3 va Redis talablari ham saqlanadi.
API va domen worker yangilangan build bilan qayta ishga tushiriladi.

Superadminning **Onlayn to‘lovlar** sahifasi kassa tayyorligi va usullarni
ko‘rsatadi. Server kaliti hech qanday panel javobida bo‘lmaydi.
Faol bo‘lmagan kassada checkout `PAYMENT_NOT_READY` qaytaradi; bronning
boshlang‘ich inventar rezervi provider to‘loviga aylantirilmaydi.

## Bron va hisob to‘lovi

- Customer checkout va hamkor invoice checkout Tezcheck havolasini serverda
  yaratadi. Summa tiyin birligida integer; buyurtma UUIDsi `external_reference`.
- Provider uchun `Idempotency-Key` buyurtmaga bog‘langan va qayta urinishda
  o‘zgarmaydi. Javob yo‘qolsa yangi hisob ochmasdan tiklanadi. Provayderning
  24 soatlik xotirasi tugashidan oldin ham 23 soatlik tiklash chegarasi bor;
  undan keyin qo‘lda solishtirish talab qilinadi.
- To‘lov havolasi bazada AES-GCM bilan shifrlanadi. Faqat HTTPS va
  `tezcheck.uz` domenidagi `/pay/` yo‘llari qabul qilinadi.
- Worker kutilayotgan hisoblarni har daqiqada, to‘langan hisoblarni har soatda
  tekshiradi. Har hisob uchun DB lease bor; bir davrda ko‘pi bilan 40 hisob.
- Bron faqat signed status javobidagi `paid`, `livemode`, `environment=live`,
  valyuta, tashqi reference, summa va komissiya/net tengligi tekshirilgach
  tasdiqlanadi. Hisob `expired` bo‘lsa ham haqiqiy to‘lov tan olinadi.
- Test-provider muvaffaqiyati haqiqiy pul hisoblanmaydi: ledger yaratilmaydi,
  bron tasdiqlanmaydi va sinov rezervi bo‘shatiladi.
- Natija noma’lum yoki providerda `processing`/`requires_action` bo‘lsa
  inventar saqlanadi. Faqat provider bekor qilishni tasdiqlagach bo‘shatiladi.
  Kech to‘lovda inventar yo‘qolgan bo‘lsa `PAYMENT_EXCEPTION` va refund so‘rovi
  yaratiladi; boshqa mijozning xonasi olinmaydi.
- Ledger gross sanatoriya qarzdorligi, net `PSP_CLEARING` va
  `PROCESSING_EXPENSE`ni ajratadi. Tezcheck bank reestri komissiyani yana
  xarajatga yozmaydi. CSVda `provider=TEZCHECK` va tasdiqlangan fee kerak.

## Webhook va moliyaviy cheklovlar

Tezcheck kabinetida haqiqiy HTTPS endpoint:
`https://<haqiqiy-api>/payments/tezcheck`. Kabinet bergan imzo siri
`TEZCHECK_WEBHOOK_SECRET`ga saqlanadi. API kaliti webhook siri o‘rnini bosmaydi.
Hozir ochiq HTTPS endpoint va shu provider siri berilmagan, shuning uchun
haqiqiy webhook yetkazilishi tekshirilmagan; polling undan mustaqil ishlaydi.

Xom tana, timestamp, delivery va `v1=` HMAC imzolari tekshiriladi; kalit
almashtirishdagi bir nechta imzo qabul qilinadi. Takroriy hodisa tanadagi
`id` bilan aniqlanadi. Webhook ledgerni bevosita o‘zgartirmaydi; durable
status tekshiruvini uyg‘otadi. Androiddagi `POST /payments/:id/refresh`
buyurtma egasini tekshiradi va tekshiruv davrini tez-tez chaqirish bilan oshirmaydi.

Rasmiy merchant API hujjatida to‘lovni qaytarish endpointi ko‘rsatilmagan.
Shuning uchun Tezcheck checkout `full_refund=false`, `partial_refund=false`,
`automatic_refund=false` qaytaradi. `/bills/:id/cancel` faqat to‘lanmagan
hisobni yopadi; uni refund deb belgilash mumkin emas.
Refund, dispute, chargeback yoki summa/fee nomuvofiqligi `REVIEW` holatiga
olib keladi va admin audit/bildirishnomasiga yoziladi. Tegishli payout yaratish
va tasdiqlash solishtirish hal bo‘lguncha bloklanadi; to‘langan deb qo‘lda
belgilash yoki mavjud ledgerni o‘zgartirish bajarilmaydi.

Avtomatik testlar haqiqiy PostgreSQL va mahalliy provider javoblari bilan
bajariladi. Ular rasmiy merchant to‘lovi yoki production qabulining o‘rnini bosmaydi.
