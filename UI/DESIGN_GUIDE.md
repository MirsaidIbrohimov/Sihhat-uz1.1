# Android UI dizayn tavsiyalari

2026-10-10 · v1 · Flutterda joriy etilgan uslub

Tavsiya: bosh sahifadagi yashil identifikatsiyani ichki sahifalarda ham davom
ettirish. Kontent uchun oq kartalar, tanlovlar uchun yalpiz, asosiy amallar
uchun to‘q yashil/teal ishlatiladi. Fotografiya katalog, xona va galereyada
bo‘ladi; shakl, menyu, tugma va matnlar haqiqiy komponentlardan quriladi.

## Tailwind CSS talabi va Android

Loyihaning Android qismi Flutter/Dartda: `apps/mobile/lib`.
Tailwind CSS HTML/CSS interfeyslar uchun; shu Android ilovasiga bevosita
ulab bo‘lmaydi. Uning rang, oraliq, radius va qayta ishlatiladigan komponent
tamoyillari Flutter mavzusi va widgetlariga ko‘chirilishi mumkin.
[Tailwind theme variables](https://tailwindcss.com/docs/theme) rang, shrift
va boshqa dizayn qiymatlarini umumiy tokenlarda saqlashni hujjatlashtiradi.

Tailwind yoki yangi ikonka paketi o‘rnatilmadi. Galereya mustaqil lokal
HTML fayl; mobil UI Flutterda `concept_ui.dart` orqali joriy etildi.
Manrope/DM Sans shriftlari va Lucide vektor ma’lumotlari ilovaga lokal
qo‘shilgan; litsenziyalar `apps/mobile/assets/licenses`da saqlanadi.

## Ranglar

| Vazifa | Kunduzgi rang | Tungi rang |
| --- | --- | --- |
| Sarlavha / navigatsiya | `#043B33` | `#101D18` |
| Asosiy amal | `#00866C` | `#97D4B9` |
| Sahifa foni | `#F6FAF9` | `#101D18` |
| Karta | `#FFFFFF` | `#1B2C24` |
| Asosiy matn | `#083F38` | `#E3EFE7` |
| Ikkinchi matn | `#657B72` | `#ABC2B3` |
| Yumshoq blok | `#E6F5F0` | `#203E31` |
| Chegara | `#DCECE6` | `#3C5548` |

Bu palitra amaldagi `apps/mobile/lib/design.dart` ranglariga asoslangan.
Kutish holatlari yumshoq amber, tasdiq holatlari yashil bilan beriladi;
holat yonida albatta matn va ikonka ham bo‘ladi.

## O‘lcham va komponentlar

Quyidagi o‘lchamlar taklif qilingan **logical px/dp**; PNGdagi piksel emas.
Maketlar eskiz sifatida shu nisbatlarni ifodalaydi.

| Element | Taklif | Tailwinddagi o‘xshash qiymat | Flutterdagi ifoda |
| --- | --- | --- | --- |
| Sahifa yon oraliqlari | 20 dp | `px-5` | `EdgeInsets.symmetric(horizontal: 20)` |
| Asosiy oraliq | 8 dp; zaruratda 16/24 | `gap-2 / gap-4 / gap-6` | `SizedBox(height: 8/16/24)` |
| Karta radiusi | 20 dp | `rounded-[20px]` | `BorderRadius.circular(20)` |
| Asosiy tugma | kamida 52 dp | `min-h-[52px]` | `minimumSize: Size.fromHeight(52)` |
| Ikonka | 24 dp | `size-6` | `size: 24` |
| Sarlavha | 24–28 dp; qalin | `text-2xl font-bold` | umumiy `TextTheme` |
| Oddiy matn | 14–16 dp; 1.5 qator oralig‘i | `text-base leading-6` | `fontSize: 16, height: 1.5` |

Ko‘p bo‘limli shakllar bitta ulkan kartaga yig‘ilmaydi. Sana, xona, mehmon
va summa kichik mantiqiy bloklarda ko‘rsatiladi. Bir sahifada bitta asosiy
amal ajratiladi; pastdagi tugma `SafeArea` va klaviatura bilan mos ishlaydi.

Takrorlanadigan widgetlar: sahifa sarlavhasi, sanatoriya kartasi,
status belgisi, ikonka/matn qatori, tanlov kartasi, forma maydoni, pastki
amal paneli va besh tugmali navigatsiya. Root ekranlarda umumiy navigatsiya;
ichki ekranlarda orqaga qaytish va kerakli amal bo‘ladi.

## Professional ikonkalar

Tavsiya — bir xil **Lucide uslubidagi outline** ikonka tizimi: 24 dp asos,
1.8–2 dp izchil chiziq, yumaloq uchlar. Emojilar yoki turli to‘plamlarni
aralashtirish o‘rniga, bir xil vektor tizimi ishlatiladi.
[Lucide hujjati](https://lucide.dev/guide/lucide) ikonka o‘lchami, rangi,
chiziq qalinligi va accessibility sozlamalariga havola beradi.

| Vazifa | Ikonka nomi / mazmuni |
| --- | --- |
| Katalog | Building2 |
| Qidiruv / filtr | Search / SlidersHorizontal |
| Hudud / yo‘nalish | MapPin |
| Xona / mehmon | BedDouble / Users |
| Sana / tasdiq | CalendarDays / CircleCheck |
| To‘lov kutilmoqda | Clock |
| AI / suhbat | MessageSquare / Sparkles |
| Profil / telefon | UserRound / Phone |
| Xabar / yordam | Bell / Headphones |
| Raqamni himoyalash | ShieldCheck |
| Kunduzgi / tungi rejim | Sun / Moon |

PNG rasmlaridan ikonka qirqib olinmaydi: Lucide vektor ma’lumotlari
`SihhatIcon` orqali Flutter canvasida chiziladi. Ikonka uchun kamida 44–48 dp bosish
maydoni va ma’noli semantics/tooltip qo‘yiladi. Butun ilovada stroke,
o‘lcham va chevronlar bir xil bo‘ladi.

## Maket va amaldagi funksiyalar

2026-10-10 tuzatish: bosh sahifa va ichki menyular bitta navigatsiya
ikonkalari ro‘yxatini ishlatadi. Login rasmining o‘rniga asl `SihhatLogo`
qo‘yilgan; +998 doimiy, 9 ta milliy raqam tekshiruvi maydon tagida xato
beradi. Faol HOME reklama mashhur sanatoriyalar kartalari joyini egallaydi,
reklama bo‘lmasa superadmin tick bilan belgilagan profillar ko‘rinadi.

Maketlar mavjud katalog, bron, AI roziligi, profil, ikki raqam kodi,
murojaat va yangilik oqimlariga tayangan. Alohida galereya/tarif/kelish
ko‘rinishlari, boshlang‘ich AI savol chiplari va doimiy suhbat composer
yangi joylashuvlar sifatida mavjud API bilan moslashtirilgan.

AI maketidagi vaqt yoki ikki belgi dekorativ: serverda o‘qilganlik holati
bo‘lmasa, shu belgilar joriy etilmaydi. PNGdagi namunaviy QR, telefon
maskasi, narx va suratlar ilovaga haqiqiy ma’lumot sifatida qo‘shilmaydi.
Avvaldan saqlash, haqiqiy QR, onlayn narx/bo‘sh xona tekshiruvi va to‘lov
tasdig‘i mavjud xizmatlardan olinadi.

Katta shrift, kichik ekran, klaviatura, SafeArea, uzoq sanatoriya nomi,
internetsiz nusxa, bo‘sh natija va xato holatlari joriy etish paytida
haqiqiy Flutter ekranlarida tekshiriladi. Hozirgi rasmlar bunday runtime
tekshiruvlarning dalili emas.
