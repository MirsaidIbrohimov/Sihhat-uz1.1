# Loyiha bilan ishlash

Kanonik GitHub repozitoriyasi: https://github.com/MirsaidIbrohimov/Sihhat-uz1.1.

Foydalanuvchi loyiha kodlarini shu repozitoriyaga joylab borishni so‘ragan. Keyingi yakunlangan loyiha o‘zgarishlarida README va zarur holat/ishga tushirish hujjatlarini yangilang, o‘zgarishga mos tekshiruvni bajaring, manba kodini commit qilib shu origin repozitoriyasiga push qiling. Mavjud tarixni saqlang; force push ishlatmang.

Maxfiy kalitlar, parollar, `.env`, `.local`, signing kalitlari va `key.properties`, demo hisoblar, database/media zaxiralari, node_modules, SDK/keshlar va build/APK fayllarini Gitga kiritmang. `.env.example` faqat bo‘sh qiymat yoki namunalarni saqlaydi. Pushdan oldin yuboriladigan fayllarni tekshiring va `npm run check:secrets`ni bajaring; haqiqiy qiymatlar hech qachon logga chiqarilmaydi.

Amaldagi tekshiruv va cheklovlar docs/IMPLEMENTATION_STATUS.md va docs/RUNBOOK.md da. Lokal simulator/test natijasini rasmiy provider yoki production qabul natijasi deb belgilamang. APKdagi API manzili build rejimiga mos bo‘lsin; release haqiqiy HTTPS va signing konfiguratsiyasini talab qiladi.
