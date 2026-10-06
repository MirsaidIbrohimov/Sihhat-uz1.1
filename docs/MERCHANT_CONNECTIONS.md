# Sanatoriyaning o‘z merchant hisobini tayyorlash

2026-10-05 foydalanuvchi har sanatoriyaning faol merchant/kassasi hali
yo‘qligini tasdiqladi va ulash sozlamalarini tayyorlashni so‘radi. Quyidagi
shakl ulanish ma’lumotlarini saqlaydi; haqiqiy to‘lovni yoqmaydi.

## Kabinetdagi tartib

1. Direktor yoki superadmin **Sanatoriya profili → Bank rekvizitlari**da
   sanatoriyaning yuridik nomi, STIR, hisob raqami va MFOni kiritadi.
   Platforma superadmini ularni qo‘lda tasdiqlaydi.
2. **Sanatoriyaning o‘z to‘lov hisobi** kartasida yuridik nom va STIRni,
   mavjud bo‘lsa shu sanatoriyaning tasdiqlangan bank rekvizitini tanlang.
3. Sanatoriyaning o‘z nomida ochilgan Tezcheck merchant IDsi va kassa
   kodini kiriting. Hali ochilmagan bo‘lsa maydonlar bo‘sh qolishi mumkin.
   API kaliti uchun maydon yo‘q; maxfiy kalitni shakl yoki chatga yozmang.
4. **Saqlash**dan keyin ma’lumot yetishmasa `WAITING_MERCHANT`, merchant,
   kassa va tasdiqlangan bank bo‘lsa `WAITING_VERIFICATION` saqlanadi.
   Har ikkala holatda `payments_enabled=false`.

Nom/STIR bank rekvizitiga mos kelishi va bank shu sanatoriyaga tegishli
bo‘lishi tekshiriladi. So‘rov tenant ruxsati va versiya bilan himoyalangan.
Bazadagi `MerchantSetup` faqat ulash metadata sini saqlaydi; maxfiy API kaliti
hamda pul o‘tkazma vakolati saqlanmaydi.

## Server va faol ulanish

`BOOKING_SETTLEMENT_MODE=direct` standart. Faol, tekshirilgan alohida
merchant ulanishi hozir mavjud emas: yangi real bron checkouti
`MERCHANT_NOT_READY` bilan to‘xtaydi. Umumiy platforma Tezcheck kassasi
yangi sanatoriya bronining o‘z kassasi sifatida ishlatilmaydi. Lokal
`PAYMENT_MODE=local` faqat pul o‘tkazmaydigan simulator.

Faollashtirishdan oldin sanatoriya nomidagi faol tashkilot/kassa, serverda
xavfsiz secret saqlash, provider `/me`dagi tashkilot egasi, bank/STIR va
cash desk mosligi tekshirilishi kerak. Alohida merchant bo‘yicha checkout,
webhook/polling, to‘lov va direct settlement hisobi hamda provider qabul
sinovi keyingi ulash ishidir. Hozir shaklni to‘ldirish bu integratsiyani
avtomatik yoqmaydi; transfer amalga oshirildi deb belgilanmaydi.

[Tezcheck Savdogar API](https://tezcheck.uz/api-docs)ga ko‘ra token
tashkilotga tegishli; `X-Cash-Desk-Code` shu tashkilot ichidagi kassani
tanlaydi. Boshqa sanatoriya kassasining kodini umumiy platforma tokeni
bilan qo‘yish alohida merchant hisobiga yo‘naltirishni ta’minlamaydi.

`legacy_platform` faqat development/testdagi oldingi platforma oqimini
tekshirish uchun saqlangan va production konfiguratsiyasida rad etiladi.
Oldingi ochilgan hisoblarning status/cancellation/ledger tarixlari va
platformaning abonent invoice to‘lovi mavjud adapterda saqlanadi.
Reklama esa admin tasdiqlagach bepul e’lon qilinadi.

## API

- `GET /partner/sanatoriums/:id/merchant-setup` — metadata va tayyorlik xabari.
- `PATCH /partner/sanatoriums/:id/merchant-setup` — `version`, `legal_name`,
  `stir`, ixtiyoriy `bank_revision_id`, `merchant_id`, `cash_desk_code`.
- Ruxsat: tegishli sanatoriyadagi `bank.request` yoki superadmin.
- `api_key` kabi noma’lum maydonlar qabul qilinmaydi.

To‘qqizinchi migratsiya `202610050001_merchant_setup`. Kalitlar, bank/media
zaxiralari va APKlar Gitga kiritilmaydi. Boshqa provider cheklovlari
[TEZCHECK.md](TEZCHECK.md)da.
