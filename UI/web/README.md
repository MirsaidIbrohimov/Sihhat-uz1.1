# Sihhat uz — web UI

2026-10-10 · v2 · **Yangi UI amaldagi React panellariga joriy etilgan**

[Galereyani ochish](index.html) · [Interaktiv namuna](preview.html?screen=03-superadmin-bosh-sahifa) · [UI tekshiruvi](REVIEW.md)

Bu papkada **32 ta dizayn PNGsi**, **26 ta dastlabki panel PNGsi** va
**32 ta yangilangan React panel PNGsi** bor. `yangi/` maket, `hozirgi/`
dastlabki ko‘rinish, `joriy/` yangi haqiqiy UI. Bir xil raqam va nom bilan
juftlangan fayllarni solishtirish mumkin.
Galereyada rol/qidiruv filtri, yonma-yon taqqoslash, 1:1 kattalashtirish,
oldingi/keyingi ekran, Esc va PNG yuklash ishlaydi. Galereya va HTML/CSS
namunalari fayldan, internetsiz ochiladi; tashqi shrift yoki CDN talab qilmaydi.

Amaldagi ekranlar mavjud React komponentlaridan olindi. Brauzerdagi **barcha
API so‘rovlari ushlab qolinib**, namunaviy javoblar bilan almashtirildi.
Haqiqiy login, parol, MFA, mijoz ma’lumotlari yoki bank rekvizitlari
rasmlarga qo‘shilmadi. Ishlayotgan APIga kirish va o‘zgartirish so‘rovi yuborilmadi.
Bo‘limlar mavjud backend/rol funksiyalariga tayangan; bu rasmlar real provider
qabuli yoki production tekshiruvi hisoblanmaydi.

Yangi maketlar HTML/CSS va lokal Lucide SVGlar bilan chizilib, headless
Chromiumdan PNGga chiqarildi. Rasm generatsiyasi modelidan foydalanilmadi.
Asl Sihhat uz logosi, mavjud Manrope/DM Sans shriftlari va ilovaning
`welcome-retreat.png` illyustratsiyasi ishlatilgan. Login/profil fonidagi
illyustratsiya real sanatoriya surati emas. Litsenziyalar `assets/`da.

## Ekranlar

| №   | Panel / ekran                    | Yangi dizayn                                  | Hozirgi UI                                      |
| --- | -------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| 01  | Superadmin — kirish va MFA       | [PNG](yangi/01-superadmin-kirish.png)         | [PNG](hozirgi/01-superadmin-kirish.png)         |
| 02  | Direktor — kirish                | [PNG](yangi/02-direktor-kirish.png)           | [PNG](hozirgi/02-direktor-kirish.png)           |
| 03  | Superadmin — ko‘rsatkichlar      | [PNG](yangi/03-superadmin-bosh-sahifa.png)    | [PNG](hozirgi/03-superadmin-bosh-sahifa.png)    |
| 04  | Sanatoriyalar va Mashhur tick    | [PNG](yangi/04-superadmin-sanatoriyalar.png)  | [PNG](hozirgi/04-superadmin-sanatoriyalar.png)  |
| 05  | Sanatoriya profili               | [PNG](yangi/05-direktor-profil.png)           | [PNG](hozirgi/05-direktor-profil.png)           |
| 06  | Bronlar                          | [PNG](yangi/06-direktor-bronlar.png)          | [PNG](hozirgi/06-direktor-bronlar.png)          |
| 07  | Xonalar / bandlik taqvimi        | [PNG](yangi/07-direktor-xonalar.png)          | [PNG](hozirgi/07-direktor-xonalar.png)          |
| 08  | Direktor — jamoa va ruxsatlar    | [PNG](yangi/08-direktor-jamoa.png)            | [PNG](hozirgi/08-direktor-jamoa.png)            |
| 09  | Onlayn to‘lovlar                 | [PNG](yangi/09-superadmin-tolovlar.png)       | [PNG](hozirgi/09-superadmin-tolovlar.png)       |
| 10  | Sanatoriyaga o‘tkazmalar         | [PNG](yangi/10-superadmin-otkazmalar.png)     | [PNG](hozirgi/10-superadmin-otkazmalar.png)     |
| 11  | Pulni qaytarish                  | [PNG](yangi/11-superadmin-qaytarish.png)      | [PNG](hozirgi/11-superadmin-qaytarish.png)      |
| 12  | Abonent va hisoblar              | [PNG](yangi/12-superadmin-abonent.png)        | [PNG](hozirgi/12-superadmin-abonent.png)        |
| 13  | Reklama / ilovadagi preview      | [PNG](yangi/13-superadmin-reklama.png)        | [PNG](hozirgi/13-superadmin-reklama.png)        |
| 14  | Yangilik va tavsiyalar           | [PNG](yangi/14-superadmin-maqolalar.png)      | [PNG](hozirgi/14-superadmin-maqolalar.png)      |
| 15  | Xabarlar                         | [PNG](yangi/15-direktor-xabarlar.png)         | [PNG](hozirgi/15-direktor-xabarlar.png)         |
| 16  | Jamoa vazifalari                 | [PNG](yangi/16-direktor-vazifalar.png)        | [PNG](hozirgi/16-direktor-vazifalar.png)        |
| 17  | Yordam / suhbat namunasi         | [PNG](yangi/17-direktor-yordam.png)           | [PNG](hozirgi/17-direktor-yordam.png)           |
| 18  | Mehmonlar sharhlari              | [PNG](yangi/18-direktor-sharhlar.png)         | [PNG](hozirgi/18-direktor-sharhlar.png)         |
| 19  | Amallar tarixi                   | [PNG](yangi/19-superadmin-audit.png)          | [PNG](hozirgi/19-superadmin-audit.png)          |
| 20  | To‘lovlarni solishtirish         | [PNG](yangi/20-superadmin-solishtirish.png)   | [PNG](hozirgi/20-superadmin-solishtirish.png)   |
| 21  | Bildirishnomalar                 | [PNG](yangi/21-direktor-bildirishnomalar.png) | [PNG](hozirgi/21-direktor-bildirishnomalar.png) |
| 22  | Anketalar                        | [PNG](yangi/22-direktor-anketalar.png)        | [PNG](hozirgi/22-direktor-anketalar.png)        |
| 23  | Telegram — bot o‘chiq holati     | [PNG](yangi/23-direktor-telegram.png)         | [PNG](hozirgi/23-direktor-telegram.png)         |
| 24  | Hisobchi hisobotlari             | [PNG](yangi/24-hisobchi-hisobotlar.png)       | [PNG](hozirgi/24-hisobchi-hisobotlar.png)       |
| 25  | Direktor — bosh sahifa           | [PNG](yangi/25-direktor-bosh-sahifa.png)      | [PNG](hozirgi/25-direktor-bosh-sahifa.png)      |
| 26  | Superadmin — xodim tasdig‘i      | [PNG](yangi/26-superadmin-jamoa.png)          | [PNG](hozirgi/26-superadmin-jamoa.png)          |
| 27  | Bron tafsiloti / joylashtirish   | [PNG](yangi/27-direktor-bron-tafsiloti.png)   | —                                               |
| 28  | Profilni tahrirlash              | [PNG](yangi/28-direktor-profil-tahriri.png)   | —                                               |
| 29  | Superadmin — tungi ko‘rinish     | [PNG](yangi/29-superadmin-tungi.png)          | —                                               |
| 30  | Telefon — kirish                 | [PNG](yangi/30-telefon-kirish.png)            | —                                               |
| 31  | Telefon — direktor bosh sahifasi | [PNG](yangi/31-telefon-bosh-sahifa.png)       | —                                               |
| 32  | Telefon — bron kartalari         | [PNG](yangi/32-telefon-bronlar.png)           | —                                               |

Desktop viewporti **1440 × 1000**, telefon viewporti **390 × 844**.
PNGlar `fullPage` bilan olingan; uzun sahifalarning rasm balandligi kattaroq.
[manifest.json](manifest.json) ekranlar, rollar, manba fayllari va juft rasmlarni
saqlaydi. [00-web-ui-galereya.png](00-web-ui-galereya.png) galereyaning umumiy ko‘rinishi.

## Qayta chiqarish

Buyruqlar loyiha ildizidan bajariladi. O‘rnatilgan Node dependencylar va
Playwright Chromium talab qilinadi; yangi kutubxona qo‘shilmagan.

```powershell
# Faqat dizaynlar, galereya va rasmlar tekshiruvi:
node UI/web/tools/render.cjs

# Hozirgi ikkala panelni ham qayta suratga olish:
npm run local:start -- -Only superadmin,director
node UI/web/tools/render.cjs --all

# Internet o‘chiq, file: protokolida galereya/namuna:
node UI/web/tools/offline-check.cjs

# Yangilangan React UI: 32 ekran, so‘ng 52 qo‘shimcha rang/o‘lcham holati:
node UI/web/tools/implemented.cjs
node UI/web/tools/implemented.cjs --audit
```

`--all` uchun 3000/3001 portlarda amaldagi buildlar ishlashi kerak. Ular
eskirgan bo‘lsa, loyiha runbookidagi web build/qayta ishga tushirish tartibidan
foydalaning. API mocklari faqat shu alohida headless brauzerda ishlaydi;
odatdagi panel, API yoki telefon sozlamalarini o‘zgartirmaydi.

`prepare.cjs` lokal shrift/ikonka/rasm assetlari va manifestni tayyorlaydi.
`current.cjs` komponentlarni namunaviy API javoblari bilan suratga oladi;
`hozirgi/`dagi dastlabki rasmlarni saqlash uchun odatda uni qayta bajarmang.
`implemented.cjs` yangi React UI suratlarini alohida `joriy/`ga yozadi.
`render.cjs` yangi ekranlarni chiqaradi, PNGlarni to‘liq dekodlaydi va
galereya/namunadagi muhim amallarni tekshiradi. Natijalar private
`.local/web-ui-current-validation.json` va `.local/web-ui-validation.json`ga yoziladi.

Interaktiv namunada menyu, forma oynalari, bron holati filtri, Mashhur tick,
xona/tarif tablari, kunduzgi/tungi tugma va telefon menyusi ishlaydi.
Saqlash/to‘lov/jo‘natish tugmalari serverga ma’lumot yubormaydi.

## Tekshiruv — 2026-10-10

- **58/58 PNG** to‘liq dekodlandi; 26 ta amaldagi ekran va 32 ta yangi namuna.
- Suratga olishda JS xato, yo‘qolgan asset va sahifa gorizontal overflowi **0**.
- Galereya 1440×1000 va 390×844da tekshirildi: rol/qidiruv, taqqoslash,
  rasm oynasi, 1:1 zoom, oldingi/keyingi va Esc ishladi.
- Namunada Mashhur tick, profil/tahrir navigatsiyasi, bron holati filtri,
  forma oynasi, inventar tablari, rang rejimi va telefon menyusi tekshirildi.
- `offline-check.cjs`: galereya va namuna **file:** orqali, internet o‘chiq
  holatda ochildi; lokal shrift/rasmlar yuklandi, juft taqqoslash ishladi.
- `npm run check:secrets`: **385** manba fayli, **21** private qiymat, moslik **0**.
  `git diff --check` o‘tdi. Bu artefakt tekshiruvi; live provider/RBAC qabuli emas.
