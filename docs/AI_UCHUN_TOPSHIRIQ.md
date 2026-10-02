# Dasturlovchi AI uchun Sihhat uz topshirig‘i

Quyidagi topshiriqni AIga bering; yoniga arxitektura va ishlab chiqish rejasini ham taqdim eting. Faqat ushbu qisqa fayl barcha domen qoidalarining o‘rnini bosmaydi.

---

Sen Sihhat uz loyihasini amalga oshiruvchi dasturlovchisan. Vazifang — talablarni o‘qib, avval backendni, keyin superadmin saytini, direktor/resepsion saytini va Android APKni yaratish.

Avval quyidagi hujjatlarni to‘liq o‘qi:

1. `docs/SIHHAT_UZ_ARXITEKTURA.md`
2. `docs/ISHLAB_CHIQISH_REJASI.md`
3. Mavjud bo‘lsa `docs/IMPLEMENTATION_STATUS.md` va repodagi mahalliy ko‘rsatmalar.

Foydalanuvchi tasdiqlagan asoslar:

- Daromad reklama va abonent to‘lovi; har bir brondan platforma komissiyasi 0.
- Mijozning bron puli avval Sihhat uz hisobiga, keyin sanatoriya hisobiga.
- Birinchi versiyada butun xona; bir sanatoriyadan bir yoki bir nechta xona bron qilinadi.
- Mijoz Android APKda SMS bilan kiradi.
- Direktor va resepsion bitta sayt/bitta login bilan, vakolatga mos imkoniyatlarda ishlaydi.
- Superadmin alohida saytdan boshqaradi.
- Sanatoriyani/directorni superadmin yaratadi; e’lonni anketa tekshiruvdan so‘ng tasdiqlaydi.
- Direktor taklif qilgan resepsion superadmin tasdig‘idan keyin faollashadi.

Texnik boshlang‘ich taklif: NestJS/TypeScript + PostgreSQL/Prisma, Redis/BullMQ, S3-mos storage; saytlar Next.js; APK Flutter. Foydalanuvchi boshqa texnologiyani aniq tanlamagan bo‘lsa shu taklif bilan ishlashni boshlagin. Versiyalarni rasmiy manbalardan tekshir, mos versiyalarni lockfileda saqla.

Ish tartibi:

1. Mavjud ishni tekshir, foydalanuvchi fayllarini saqla. Hujjatlar yo‘q bo‘lsa ularni bor deb taxmin qilma.
2. Qisqa bajarish ketma-ketligini tuz va B0dan real kod yozishni boshlagin. Faqat yangi reja yozib to‘xtama.
3. Backend B0–B10ni ketma-ket bajar. MVPda belgilangan modullarni o‘zboshimchalik bilan olib tashlama.
4. `docs/IMPLEMENTATION_STATUS.md`da bajarilgan bosqichlar, real test natijalari va ochiq bog‘liqliklarni yurit.
5. Backend lokal qabul mezonlari va OpenAPI shartnomasi tayyor bo‘lgach F1, F2, F3ga o‘t.
6. Tashqi credential bo‘lmasa test adapterlari bilan mustaqil ishni davom ettir; haqiqiy sandbox/production tekshiruvini alohida «bajarilmagan» deb belgilagin.
7. Oxirida ishga tushirish/migration/test/build yo‘riqnomasi va yaratilgan artefaktlarni topshir.

Majburiy domen qoidalari:

- Tenant chegarasi API, report, export, private fayl va xabarlarda backend orqali tekshiriladi.
- Permission delegatsiyasi direktor vakolatidan oshmaydi; pending resepsion operatsion APIga kira olmaydi.
- Sanatoriyaning public versioni faqat superadmin tasdig‘i bilan o‘zgaradi. Inventar va kelajak narxi operatsion permission bilan boshqariladi.
- Xona turlari, real xonalar va tariflar alohida; turli tariflar bir xil real xona inventaridan foydalanadi.
- Bron butun davrda bitta mos real xonani talab qiladi. Barcha xonalar transaction ichida ajratiladi.
- PostgreSQL exclusion constrainti real xona va sana kesishishini to‘sadi. Prisma qo‘llamagan cheklovni SQL migrationda yarat.
- Manual bron ham ayni inventardan foydalanadi.
- Pul integer tiyin; API katta summani string orqali beradi; narx faqat backendda hisoblanadi.
- Quote/hold/bron narx va policy snapshotiga ega. Tasdiqlangan bronni keyingi narx o‘zgarishi o‘zgartirmaydi.
- Oddiy hold muddati provayder transaction timeouti bilan aralashtirilmaydi. Payme Created holatida uning amaldagi bronni saqlash protokoliga rioya qil.
- Payment callback authentication, summa, provider ID, duplicate/out-of-order voqea va expiry bilan race tekshiriladi.
- Mijoz redirect/deep linki paid holatni yaratmaydi; haqiqiy backend/provayder tasdig‘i kerak.
- To‘lov, bron tasdiqlanishi, ledger va outbox atomik yoziladi.
- Onlayn to‘lovni xodim qo‘lda tahrirlay olmaydi. Joyida pul alohida offline yozuv va verify bilan.
- Bron GMVsi platforma daromadi emas. Sanatoriya majburiyati va reklama/abonent xizmat daromadi alohida.
- Ledger balanced, source event unique va o‘zgarmas; tuzatish reversal orqali.
- Refund va payout bir xil mablag‘ni parallel ajratib yubormaydi. Bank dalilisiz payout «paid» emas.
- MVP to‘liq refundni qo‘llaydi; provayder qo‘llamagan avtomatik/qisman refundni ishlaydi deb ko‘rsatma.
- Xabar yuborish transaction outbox va idempotent worker bilan.
- AI faqat ommaga tasdiqlangan katalog/FAQ hamda real qidiruv natijasini oladi; moliyaviy amallarni bajarmaydi.

Kod sifati va qabul:

- Controllerlarda biznes mantiq to‘planmasin; service/repository va module chegaralari bo‘lsin.
- Sirlar kodga yozilmasin; `.env.example` faqat nomlar va xavfsiz namunalardan iborat bo‘lsin.
- OpenAPI endpoint, DTO, permission, error va misollarni qamrasin.
- Ruxsat, inventar concurrency, payment idempotency va moliyaviy oqimlar real PostgreSQLda meaningful sinovlardan o‘tsin.
- Frontendlar haqiqiy APIga ulansin; demo ma’lumotlarni production funksiyasi sifatida topshirma.
- Android APK olinmagan bo‘lsa «APK tayyor» dema; haqiqiy build artefaktini ko‘rsat.
- O‘zing mustaqil yecha oladigan odatiy texnik tanlov uchun ishni to‘xtatma. Biznes yoki tashqi xizmat qarori yetishmasa uni aniq ajratib, bog‘liq bo‘lmagan ishni davom ettir.
- Foydalanuvchi ruxsatisiz productionga deploy yoki haqiqiy pul operatsiyasi boshlama; mahalliy ishlab chiqish va testlarni to‘liq bajar.

Birinchi amaling: hujjatlar va mavjud papkani tekshir, status faylini yarat, B0 va B1ni amalga oshirishni boshla.

---
