# Web UI ko‘rib chiqilishi

2026-10-10 · Superadmin, direktor/resepsion va hisobchi · v2

[Rasmlarni taqqoslash](index.html) · [Interaktiv namuna](preview.html?screen=03-superadmin-bosh-sahifa)

Hozirgi web panellarning umumiy yashil uslubi va Lucide ikonkalari bor.
Asosiy yaxshilash nuqtalari — matn iyerarxiyasi, uzun menyu, jadval amallari
va ko‘rsatkichlarning birinchi ekranda joylashuvi. Yangi maketlar shu
muammolarni mavjud funksiyalar asosida qayta joylashtiradi.

## Topilmalar va maketdagi o‘zgarishlar

| Ekran                        | Hozirgi UI                                                                               | Yangi dizayn namunasi                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 03, 25 — Bosh sahifa         | Katta izoh banneri kartalarni pastga suradi; AI blokidagi bo‘sh joy sahifani uzaytiradi. | KPIlar sarlavha ostida; metodologiya ixcham izohda; chart va qoldiqlar bir qatorda, AI sarfi kichik kartada.         |
| Barcha ichki sahifalar       | Superadmin menyusidagi 22 bo‘lim pastga scroll talab qiladi.                             | To‘rtta ochiladigan guruh; joriy bo‘lim guruhi ochiq; rol va tanlangan sanatoriya alohida ko‘rsatilgan.              |
| 04, 08, 26 — Jadval amallari | Bir qatorda ko‘p kichik matnli amallar, shu jumladan to‘xtatish/arxivlash.               | Asosiy amal ochiq; qo‘shimcha amallar alohida menyu/oynada; tasdiq kutilayotgan xodim ko‘zga tashlanadi.             |
| 04 — Mashhur                 | Tick bor, izoh uzun sahifa subtitleida.                                                  | 19 px checkbox; tushunarli “Bosh sahifada” yorlig‘i; reklama/ro‘yxat qoidasi alohida ixcham blokda.                  |
| 06, 32 — Bronlar             | Desktop jadvalidagi ko‘p ustun kichik ekranda scroll bo‘ladi.                            | Desktopda jadval, telefonda kartalar; bron raqami, mehmon, davr, summa va holat o‘qiladigan tartibda.                |
| 07 — Inventar                | 14 kunlik taqvim ishlaydi; kamerali “B/K/T” maydonlari zich.                             | Kattaroq xona qatori, yumaloq holat kataklari, rangga qo‘shimcha B/K/T va legenda; taqvim o‘z ichida scroll bo‘ladi. |
| 09–12, 24 — Moliya           | Hisobot matni/kichik jadval sarlavhalari, ko‘p tushuntirishlar bir xil og‘irlikda.       | Tabular raqamlar, alohida tushum/qoldiq kartalari, statusga matn, xavfli qarorlarda alohida tugma.                   |
| 13 — Reklama                 | Kampaniyalar umumiy jadvalda; ilovadagi ko‘rinish yonida yo‘q.                           | Holat va muddat ko‘rinadigan kartalar; HOME joylashuvi uchun telefon previewi.                                       |
| 14–18, 21, 22 — Aloqa        | Xabar, vazifa, sharh va anketa ko‘pincha bir xil jadval qolipida.                        | Har biri o‘z vazifasiga mos karta/suhbat ko‘rinishida; vaqt, holat va asosiy amal ajratilgan.                        |
| 01, 02 — Kirish              | Asl logo va ikki bosqichli kirish mavjud; katta tekis fon.                               | Brend illyustratsiyasi, aniq login/parol/MFA tartibi, parolni ko‘rsatish tugmasi; telefonda ixcham forma.            |
| Shriftlar                    | CSS tashqi Google Fonts importiga tayangan.                                              | Namunada Manrope va DM Sans lokal; internet bo‘lmasa ham bir xil ko‘rinish.                                          |
| 29–32 — Holatlar             | Amaldagi rasmlar desktopdagi mavjud kunduzgi UI.                                         | Qo‘shimcha tungi dashboard va 390 px login/dashboard/bron namunalari.                                                |

Bu topilmalar manba CSS/komponentlar va 26 ta desktop surat asosida yozilgan.
Hozirgi panellarda bu ish doirasida barcha mobil/ruxsat/provider oqimlari
qayta sinalmagan. Namunadagi tugma va rang o‘zgarishi production funksiyasi
qo‘shilganini anglatmaydi.

## Uslub

| Vazifa                               | Kunduzgi  | Tungi     |
| ------------------------------------ | --------- | --------- |
| Navigatsiya / asosiy identifikatsiya | `#083C33` | `#0A3027` |
| Asosiy amal                          | `#087D66` | `#99DFBF` |
| Faol menyu                           | `#9EF0D5` | `#99DFBF` |
| Sahifa                               | `#F4F8F7` | `#101E19` |
| Karta                                | `#FFFFFF` | `#1A2D24` |
| Matn                                 | `#153B32` | `#E2EFE7` |
| Ikkinchi matn                        | `#647C73` | `#A9C0B1` |

- Sarlavhalar Manrope, oddiy matn DM Sans; jadval matni 13 px, label/status 12 px.
- Desktop sidebar 252 px, sahifa oraliqlari 30 px; telefon 18 px.
- Kartalar 18 px radius, asosiy tugmalar 42–48 px; Lucide stroke 1.8 px.
- Yashil/amber/ko‘k/qizil holatlar matn va ikonka bilan birga beriladi.
- KPIlarda GMV, platforma daromadi va sanatoriyaga qarzdorlik alohida turadi.
- Profil suratlari va reklama previewi kontentga mos joyda; forma maydonlari rasmdan olinmaydi.

## Joriy etish chegarasi

Yangi dizayn `packages/ui/src`dagi amaldagi React panellariga joriy etildi.
Umumiy shell, to‘rtta ochiladigan menyu guruhi, shrift/token, karta, jadval,
forma, rang rejimi va telefon draweriga qo‘shildi. Dashboardda daromad/
qarzdorlik kartasi ajratildi; chart/qoldiq va ixcham AI/CSV kartalari bor.
Hisoblash tartibi ochiladigan izohda, model sarfi jadvali tafsilotlarda.
Xabar, vazifa, anketa, sharh, bildirishnoma va maqola uchun haqiqiy kontent
kartalari qo‘llanadi. Yordam — ikki ustunli suhbat, reklama — kartalar va
telefon previewi. Inventar o‘z ichida scroll, bron jadvali telefonda kartalar.

`hozirgi/` dastlabki rasmlarni, `yangi/` dizayn maketlarini saqlaydi;
`joriy/` yangi React UI suratlari. Ikkinchisining ma’lumotlari ham maskalangan
namunalar. Maketdagi summalar, provider holati va sanatoriya suratlari
ishlayotgan panelga statik ma’lumot sifatida ko‘chirilmagan.

Mavjud MFA, CSRF/session, idle timeout, RBAC, version/audit, to‘lov tasdig‘i,
inventar, Tashkent sana mezoni va qaytarish shartlari saqlanishi kerak.
Hisobchi faqat o‘z sanatoriyasi hisobotlarini ko‘radi. Qarorlar mockdagi
namunaviy summa yoki rasmdagi belgiga asoslanib bajarilmaydi.

Telegram o‘chiq holati va Tezcheck sozlanmagan holati ataylab suratga olindi;
haqiqiy hisob, bot nomi, bank rekviziti va provider holati rasmda berilmadi.
Maqola, sanatoriya nomi va mehmon belgisi namunaviy; parol yoki ishlaydigan
demo hisoblar yaratilmagan. Haqiqiy API bilan brauzer sinovlari alohida
`sihhat_test` bazasida, tashqi providerlar o‘chirilgan fixtureda bajariladi.
Natijalar [holat hujjati](../../docs/IMPLEMENTATION_STATUS.md)da.
