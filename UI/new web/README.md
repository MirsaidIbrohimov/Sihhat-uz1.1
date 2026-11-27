# Sihhat.uz — Superadmin Yangi Dizayn Taklifi («Serenity Pro V4»)

**Holati:** Tasdiqlash uchun tayyorlangan Superadmin dizayn maketlari (`UI/new web`). Amaldagi React/Next.js kodlari (`packages/ui`, `apps/superadmin-web`) foydalanuvchi tasdiqlamaguncha o‘zgartirilmagan.

- **Qulay oflayn galereyani ochish:** [index.html](index.html) (filtrlar, 1:1 zoom, klaviatura `←`/`→`)

## Nima uchun «Serenity Pro V4» ko‘rishlik uchun ancha qulay?

1. **Ko‘zni charchatmaydigan sokin palitra:** Og‘ir qora-yashil yon panel va yorqin neon soyalar o‘rniga kunduzgi rejimda sokin **Alabaster (`#F4F6F4`) + toza oq kartalar (`#FFFFFF`) + chuqur botanik zumrad (`#0D7A5F`)**, tungi rejimda esa neon nursiz **Slate Charcoal (`#0D1211` / `#151E1C`)** ishlatildi.
2. **Siqilmagan menyu va sokin topbar:** Yon menyudagi barcha 21 ta Superadmin bo‘limi bitta qatorga sig‘adi (hech bir matn yoki hisoblagich ikki qatorga bo‘linib ketmaydi); topbar ixcham va shovqinsiz.
3. **Barcha yangi modullar (2026-11-24) 100% qamrab olingan:**
   - **Hamkor arizalari** (`/partner-registrations`) — tasdiqlash / rad etish va 1-klikda katalogga chiqarish;
   - **Yordam va jonli chat** (`/support`) — markaziy mijoz suhbatlari va **«Xodimga biriktirish»** paneli;
   - **E’lonlar va xabarlar markazi** (`/messages`) — Users / Hamkorlar yetkazilish foizi, API `verify-delivery`, 4 ta shablon va jonli preview;
   - **Amallar tarixi va Kirish-chiqish jurnali** (`/audit`) — barcha hisoblarning qurilma, kanal va IP nazorati.

## Tayyorlangan 12 ta Superadmin dizayn suratlari

| № | Fayl | Tavsif |
| --- | --- | --- |
| 00 | `00-superadmin-dizayn-tizimi.png` | Rang palitrasi (Kunduzgi + Tungi), tipografiya va UI komponentlar to‘plami |
| 01 | `01-superadmin-kirish.png` | Tog‘ sanatoriyasi manzarali kirish sahifasi, HTTPS/CSRF va brute-force himoya |
| 02 | `02-superadmin-bosh-sahifa-kunduzgi.png` | Asosiy Dashboard (Kunduzgi) — KPI, GMV, Bandlik, Ledger, Gemini AI, FCM/APK |
| 03 | `03-superadmin-bosh-sahifa-tungi.png` | Asosiy Dashboard (Tungi — ko‘zga qulay Slate Charcoal rejim) |
| 04 | `04-superadmin-sanatoriyalar-va-mashhur.png` | Sanatoriyalar jadvali, «Mashhur» switchi, Profil moderatsiyasi va Bank rekviziti |
| 05 | `05-superadmin-hamkor-arizalari.png` | Hamkor arizalari va 1-klikda direktor hisobi + katalogga chiqarish |
| 06 | `06-superadmin-bronlar-va-bugungi-ishlar.png` | Bronlar CRM (3 tab), Profsoyuz kvotasi va 🖨️ E-mehmon anketasi |
| 07 | `07-superadmin-jamoa-va-ilova-foydalanuvchilari.png` | Jamoa, Ilova mijozlari (`#ID`), `StaffManageModal` va 25 ta vakolat matritsasi |
| 08 | `08-superadmin-moliya-va-reklama.png` | Tezcheck kassa, sanatoriyaga o‘tkazmalar, refund va HOME reklama previewi |
| 09 | `09-superadmin-yordam-jonli-chat-biriktirish.png` | Markaziy jonli chat, Telegram bot sinxronizatsiyasi va «Xodimga biriktirish» |
| 10 | `10-superadmin-elonlar-va-xabarlar-markazi.png` | E’lonlar markazi, Users/Hamkorlar yetkazilish nazorati, shablonlar va Preview |
| 11 | `11-superadmin-amallar-tarixi-va-xavfsizlik.png` | Kirish-chiqish (Qurilma & IP), tizim auditi, Telegram bot va mobil responsive ko‘rinish |
