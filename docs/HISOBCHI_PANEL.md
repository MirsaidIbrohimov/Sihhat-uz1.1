# Sanatoriya hisobchi paneli

Hisobchi hamkorlar saytining odatiy login/parol sahifasidan kiradi. Faol
`ACCOUNTANT` a’zoligi uchun menyuda faqat **Hisobotlar** ochiladi. Boshqa
sanatoriyalar ma’lumoti, mijoz tafsilotlari va xususiy profil hujjatlari
hisobchiga berilmaydi.

## Hisob ochish

1. Direktor **Jamoa va ruxsatlar → Xodim taklif qilish → Lavozim: Hisobchi**
   orqali ism, login va telefonni kiritadi.
2. Taklif superadmin tasdig‘ini kutadi. Faollashmaguncha login rad etiladi.
   Superadmin o‘zi yaratgan hisob mavjud tartib bo‘yicha darhol faol bo‘ladi.
3. Superadmin **Jamoa va ruxsatlar**da taklifni tasdiqlaydi.
4. Hisobchi birinchi kirishda vaqtinchalik parolini almashtiradi. Panelning
   4 soatlik faolsizlik qoidasi unga ham tegishli.

Lokal tasdiqlashda «Sahifani yangilab qayta urinib ko‘ring» xabari bo‘lsa,
API origin ruxsatlarini tekshiring: `localhost` va `127.0.0.1`ning 3000/3001
portlari `CORS_ORIGINS`ga kiritiladi. Sozlash va API qayta ochish tartibi
[RUNBOOK.md](RUNBOOK.md)da. 2026-10-08 shu xato qayta tasdiqlanib tuzatildi;
kutilayotgan hisobchi **Faol** holatga o‘tdi. Noto‘g‘ri yoki yo‘q CSRF tokeni
va ruxsatsiz manzil bilan tasdiqlash hanuz rad etiladi.

## Davr va hisobot

- Bugun; bugunni qo‘shgan holda oxirgi **7, 30, 90 kun**.
- Tanlangan kalendar oy yoki boshlanish/tugash sanasi, 1–366 kun.
- Oldingi davr bilan taqqoslash: oy uchun oldingi kalendar oy, qolgan
  davrlar uchun shu uzunlikdagi avvalgi davr.
- Onlayn tushum, yakunlangan refund, sof onlayn tushum, tasdiqlangan naqd
  va terminal qaydlari, tasdiqlanmagan qaydlar, bank tasdiqlagan o‘tkazmalar.
- Davr oxiridagi sanatoriya/refund majburiyati, bankka yuborilayotgan va
  undiriladigan qoldiq; bron holatlari, xona/mehmon-tun va bandlik.
- **CSV yuklash (Excel)**: UTF-8 BOM, sanatoriya, davr, vaqt mintaqasi,
  yaratilgan vaqt, o‘zbekcha ko‘rsatkichlar va birlik. Summalar CSVda so‘m,
  API JSONda esa avvalgidek butun tiyin satri. CSV formulalari zararsizlantiriladi.
- **Chop etish / PDF**: brauzer chop etish oynasidan printer yoki PDFga
  saqlash tanlanadi. `.xlsx` yoki serverda alohida PDF generatori yo‘q.

Ekrandagi ikkala chegara sana ham davrga kiradi. API `to` — keyingi kunning
Toshkent vaqtidagi 00:00 chegarasi, davrga kirmaydi. To‘lov `paidAt`, refund
`completedAt`, o‘tkazma `paidAt` bo‘yicha; bronlar yashash sanasi bo‘yicha.
Qoldiqlar davr oxirigacha yig‘ilgan ledger holati, davr tushumi emas.

Joyida to‘lovlarda tasdiqlash vaqti uchun alohida maydon yo‘q: hisobot
**qaydning yaratilgan sanasi va joriy tasdiqlash holati** bo‘yicha olinadi.
`CORRECTED` eski qaydlar tasdiqlangan summaga kirmaydi; ularning o‘rnidagi
yangi qayd o‘z sanasi bilan hisoblanadi. Bu tarixiy oy yopilishi/snapshoti
emas. Bank yoki provayderning tashqi reestrini almashtirmaydi.

## Vakolat chegarasi

Faqat `reports.operational.read`, `reports.financial.read`, `reports.export`.
Direktor yoki superadmin bu uch imkoniyatni kamaytirishi mumkin, hisobchiga
bron, anketa, to‘lov, xodim yoki profilni boshqarish vakolatini bera olmaydi.
Rolning qat’iy chegarasi `effective()` va tenant scope bilan tekshiriladi.
Faqat hisobchi a’zoligiga ega xodim uchun API guard ham faqat hisobot,
sanatoriya nomlari, o‘z sessiyasi va parolini boshqarish endpointlarini ochadi.
Menyu yashirilishi backend tekshiruvining o‘rnini bosmaydi.

Eksport `report.exported` auditiga foydalanuvchi, sanatoriya, davr va CSV
formati bilan yoziladi. Ruxsat bekor qilinishi amaldagi sessiyaga darhol
ta’sir qiladi; hisob bloklansa sessiyalar bekor qilinadi. Hisobot JSON/CSV
`private, no-store` bilan qaytadi. Moliyaviy yig‘indilar bitta PostgreSQL
`RepeatableRead` o‘qish tranzaksiyasida olinadi.

## Tekshirish

- `npm test`: rol, tasdiq/parol, tenant chegarasi, to‘g‘ridan-to‘g‘ri
  API taqiqlari, CSV/audit, Toshkent vaqt chegarasi, tasdiqlanmagan/tuzatilgan
  to‘lovlar va ruxsatni bekor qilish.
- `npm run test:report-periods`: yil/oy chegarasi, kabisa fevrali va
  foydalanuvchi tanlagan oxirgi kunning kirishi.
- `npm run test:web:fixture`, keyin `SIHHAT_WEB_ACCESS_FILE`ni
  `.local/browser-test-access.json`ga o‘rnatib `npm run test:web`:
  hisobchi menyusi, 7/30/90 kun/oy/sana, taqqoslash, CSV, mobil va chop
  etish ko‘rinishi. Fixture faqat `sihhat_test`da va local providerlar bilan.

11-migratsiya `Membership` rol constraintiga `ACCOUNTANT`ni qo‘shadi:
API yangilanishidan oldin `npm run db:migrate`ni bajaring. Hisob va parollar,
brauzer dalillari va yuklangan hisobotlar `.local`da; Gitga kiritilmaydi.
