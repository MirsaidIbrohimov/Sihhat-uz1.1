# Chimyon va Zomin profil suratlari

2026-10-06 lokal Chimyon va Zomin profillariga rasmiy sanatoriya saytlaridan
4 tadan haqiqiy surat yuklandi. Asl baytlar media xizmatida saqlanadi;
Android barcha profil suratlarini doimiy papkaga yuklaydi. Rasmlar APKga
qattiq yozilmagan; panelda keyingi tahrir bilan almashtirish mumkin.

| Profil | Rasmiy manba | Suratlar |
| --- | --- | --- |
| Chimyon | [chimyonsanatorium.uz](https://chimyonsanatorium.uz/) | Kirish binosi, basseyn, ichki zal va bino |
| Zomin | [zomin-san.uz](https://zomin-san.uz/) | Tog‘dagi bino, o‘simlikli yo‘lak, ichki zal va xona |

Chimyon fayllari:

- https://admin.chimyonsanatorium.uz/files/photomedias/file-2108135996094675.jpg
- https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966643548505.webp
- https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966768196565.webp
- https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966900371930.webp

Zomin fayllari:

- https://zomin-san.uz/admin/slider/uploads/1744980607_8214.jpg
- https://zomin-san.uz/admin/foto/uploads/1745043510_2413.jpg
- https://zomin-san.uz/admin/foto/uploads/1745043547_7093.jpg
- https://zomin-san.uz/admin/xona/uploads/1745055508_5411.jpg

Lokal qayta import:

```powershell
npm run photos:import
```

Skript faqat development va `127.0.0.1:55432/sihhat` bazasini qabul qiladi.
Lokal demo profillarini topib, standart media → qoralama → yuborish →
superadmin tasdiqlash oqimini ishlatadi. Avvalgi foydalanuvchi rasmlari
saqlanadi; kichik seed placeholderi va oldingi import tanlovi almashtiriladi.
Rasm bo‘lmagan mavjud profil tahriri o‘zgargan bo‘lsa import to‘xtaydi.
Takroriy ishga tushirish allaqachon nashr qilingan rasmlarni qayta yuklamaydi.
Dalil `.local/sanatorium-photo-import.json`da; yuklangan baytlar va lokal
media katalogi Gitga kiritilmaydi. Suratlarning rasmiy manbasi saqlanadi;
bu hujjat ularga qo‘shimcha litsenziya bermaydi.

Hamkorlar panelida **Rasm yuklash** bir vaqtning o‘zida 4+ faylni qabul
qiladi: JPEG/PNG/WebP, har biri 8 MBgacha, jami 30 tagacha. Bitta galereyada
chap/o‘ng tugmalar, surat sanog‘i, tartiblash va olib tashlash mavjud.
Birinchi surat katalog muqovasi. Android galereyasi surishni ham qo‘llaydi.
