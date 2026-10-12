# Sihhat uz — Android UI konseptlari

2026-10-10 · v1 · **Uslub Androidning ichki sahifalariga joriy etildi**

Web panellar uchun alohida [UI/web galereyasi](web/index.html) tayyor:
**32 yangi dizayn** va **26 amaldagi panel rasmi**, yonma-yon taqqoslash,
telefon/tungi ko‘rinish va [interaktiv namuna](web/preview.html) bor.
Web maketlar ishlayotgan panellarga hali ko‘chirilmagan.

[Galereyani ochish](index.html): 10 ta PNG rasm, har birida 3 ta ekran holati.
Rasmni kattalashtirish, 1:1 o‘lchamda ko‘rish va guruhlar bo‘yicha filtrlash mumkin.
Galereya lokal ishlaydi; internet, server va yangi kutubxona talab qilmaydi.

| Raqam | Maket | Ekranlar |
| --- | --- | --- |
| 01 | [Katalog, filtrlar va sanatoriya](01-katalog-va-filtrlar.png) | Sanatoriyalar katalogi; Filtrlar paneli; Sanatoriya tafsiloti |
| 02 | [Xonalar, tariflar va galereya](02-xonalar-tariflar-galereya.png) | Xona va tarif tanlash; Suratlar galereyasi; Kelish shartlari |
| 03 | [Sana, xona va mehmon ma’lumotlari](03-bron-yaratish.png) | Sana tanlash; Xona va mehmon soni; Mehmon va bronni tekshirish |
| 04 | [To‘lov kutilishi, bron tasdig‘i va QR](04-tolov-va-tasdiq.png) | To‘lov uchun bron; To‘lov holatini kutish; Tasdiqlangan bron va QR |
| 05 | [Bronlar ro‘yxati, tafsilot va sharh](05-bronlar-va-sharh.png) | Bronlar ro‘yxati va internetsiz holat; Bron tafsiloti; Yashashni baholash |
| 06 | [AI yordamchi, rozilik va tavsiyalar](06-ai-yordamchi.png) | AI boshlang‘ich holati; Bir martalik AI roziligi; AI suhbat va katalog tavsiyasi |
| 07 | [Profil, ism va telefonni o‘zgartirish](07-profil-va-sozlamalar.png) | Shaxsiy profil va ko‘rinish; Ism-familiyani tahrirlash; Telefonni ikki kod bilan tasdiqlash |
| 08 | [Yordam, yangi murojaat va suhbat](08-yordam-xizmati.png) | Murojaatlar ro‘yxati; Yangi murojaat shakli; Yordam xizmati bilan suhbat |
| 09 | [Bildirishnomalar, yangilik va tungi rejim](09-bildirishnoma-va-yangilik.png) | Bildirishnomalar; Yangilik maqolasi; Bildirishnomalar tungi rejimda |
| 10 | [Telefon orqali kirish va SMS tasdiq](10-telefon-sms-kirish.png) | Telefon bilan kirish; SMS kodini tasdiqlash; Kirish tungi rejimda |

Rasmlar built-in `image_gen` bilan yaratildi. Yakuniy promptlarning to‘liq
matni, uslub uchun reference rasm va mos manba fayllari [prompts.json](prompts.json)da.
[Dizayn tavsiyalari](DESIGN_GUIDE.md) ranglar, oraliqlar, komponentlar va ikonkalarni tushuntiradi.

Tuzatishni rasm/ekran raqami bilan yozish mumkin: masalan, **01A**,
**03B**, **07C**. Maketlar uslubi Flutterning ishlaydigan katalog, bron,
AI, profil, yordam, xabar va telefon/SMS sahifalariga ko‘chirildi.
Android bosh sahifasining ranglari va joylashuvi saqlangan, ikonkalar
umumiy Lucide uslubiga o‘tkazilgan. Login oynasida asl Sihhat uz logosi,
doimiy +998 va 9 raqam tekshiruvi ishlaydi. HOME reklama mashhur
sanatoriyalar joyini egallaydi; reklama bo‘lmasa admin tanlovi qaytadi.
Bu aniqlashtirishlar PNG maketlaridan keyin Flutterda bajarilgan.
APK va tekshiruv
dalillari [loyiha README](../README.md#tayyor-apk) hamda
[holat hujjati](../docs/IMPLEMENTATION_STATUS.md)da.

Ism, narx, sana, sanatoriya suratlari va QR faqat maket uchun namunaviy.
Suratlar real sanatoriya tasdig‘i emas; to‘lov yoki provider qabuli sinalganini bildirmaydi.
Ilovadagi matn, shakl va ikonkalar haqiqiy Flutter komponentlari bilan qurilgan.

## Tekshiruv — 2026-10-10

- Barcha 10 ta PNG to‘liq dekodlandi; har biri **1536 × 1024 px**.
  Jami rasm hajmi **15 456 056 bayt**.
- Manifestdagi 30 ekran holati, reference/manba fayllari va galereya
  havolalari tekshirildi; JavaScript sintaksisi to‘g‘ri.
- Headless brauzerda **1440 × 1000** desktop va **390 × 844** telefon
  o‘lchami tekshirildi: filtrlash, rasm ochish, oldingi/keyingi,
  1:1 zoom va Esc ishladi; gorizontal overflow va pageerror yo‘q.
- `npm run check:secrets`: **292 fayl**, **21 private qiymat**, moslik **0**.
  Bu artefakt/galereya tekshiruvi; Android ilovasining runtime testi emas.
