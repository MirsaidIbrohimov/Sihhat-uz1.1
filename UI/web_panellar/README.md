# Sihhat.uz — Superadmin va Hamkorlar Web Panellari Yangi Dizayn Taklifi (Aurora Emerald Command V3)

**Holati:** Tasdiqlash uchun tayyorlangan dizayn maketlari (`UI/web_panellar`). Amaldagi React/Next.js panellar kodi (`packages/ui`, `apps/superadmin-web`, `apps/partner-web`) foydalanuvchi tasdiqlamaguncha o‘zgartirilmagan.

- **Vizual galereyani ochish:** [index.html](index.html)
- **Interaktiv studiyani ochish:** [studio.html](studio.html?board=02-superadmin-bosh-sahifa-kunduzgi)

---

## Hozirgi holatdan ilhomlangan asosiy dizayn yangiliklari

1. **Aurora Emerald Glass V3 qatlamlari (Kunduzgi Crystal & Tungi Neon Aurora):**
   - Kunduzgi rejimda ko‘zni charchatmaydigan yumshoq yalpiz-fil suyagi fon (`#F1F8F5`), 88–96% shaffof shisha kartalar, chuqur zumrad yon menyu (`#052E27 → #021411`).
   - Tungi rejimda chuqur zumrad-obsidian fon (`#021714`), neon-feruza nurli hoshiyalar (`#3EE6BF` / `#8FF5DC`) va yuqori kontrastli shisha panellar.
2. **Aqlli Yon Menyu (Smart Sidebar) va Jonli Hisoblagichlar:**
   - Bo‘lim guruhlarida (`Ish jarayoni`, `Moliya`, `Aloqa va Nazorat`) jonli status badgelari (`2 tasdiq`, `9 kutish`, `4 yangi`, `LIVE`), pastki qismda esa `0% bron komissiyasi` hamda 9 bo‘limli Hamkorlik nizomi kartasi.
3. **Command Topbar + Global Qidiruv (`Ctrl + K`):**
   - Sanatoriya tezkor almashtirgichi, bron raqami / mijoz `#ID` / pasport / telefon bo‘yicha tezkor qidiruv satri, tizim integratsiyalari salomatlik indikatori (`API · Tezcheck · Telegram Bot · APK v0.2.8`) va foydalanuvchining 6-xonali `#ID` raqami ko‘rinib turadigan profil kapsulasi.
4. **Bento KPI Kartalar + SVG Sparkline Trendlar:**
   - Har bir ko‘rsatkich kartasida o‘sish dinamikasi (`▲ +18.4%`), mini-sparkline grafik va taqqoslash izohi.
5. **Yonma-yon ochiladigan Inspector Drawer / Modal arxitekturasi:**
   - Jadvaldan chiqib ketmasdan o‘ng tomonda **Foydalanuvchini boshqarish (`#482915`)**, **Xodim va 24 ta ruxsat matritsasi**, **Shaxmatka Xona Pasporti**, **Ommaviy e’lon berish** yoki **«🖨️ E-mehmon anketasi»** jonli ko‘rinadi.

---

## Tayyorlangan 16 ta dizayn rasmlari ro‘yxati

| № | Rasm fayli | Portal / Rol | Tavsif |
| --- | --- | --- | --- |
| 00 | [00-umumiy-dizayn-konsepsiyasi.png](00-umumiy-dizayn-konsepsiyasi.png) | Umumiy vitrina | Superadmin va Hamkorlar saytlari yangi dizayn tizimi, rang tokenlari va yangiliklar |
| 01 | [01-superadmin-kirish-va-mfa.png](01-superadmin-kirish-va-mfa.png) | Superadmin | Split-ekran kirish, zumrad illyustratsiya, parol ko‘rsatish va 6 raqamli MFA (2FA) kodi |
| 02 | [02-superadmin-bosh-sahifa-kunduzgi.png](02-superadmin-bosh-sahifa-kunduzgi.png) | Superadmin (Kunduzgi) | Bento KPI + sparkline, Bronlar va top sanatoriyalar grafigi, Ledger qoldiqlari, Gemini AI va APK v0.2.8 |
| 03 | [03-superadmin-bosh-sahifa-tungi.png](03-superadmin-bosh-sahifa-tungi.png) | Superadmin (Tungi) | Tungi Neon Aurora uslubidagi Superadmin boshqaruv markazi |
| 04 | [04-superadmin-sanatoriyalar-va-mashhur.png](04-superadmin-sanatoriyalar-va-mashhur.png) | Superadmin | Sanatoriyalar jadvali, `⭐ Bosh sahifada (Mashhur)` tanlovi, profil moderatsiyasi va bank rekviziti tasdig‘i |
| 05 | [05-superadmin-ilova-foydalanuvchilari-modal.png](05-superadmin-ilova-foydalanuvchilari-modal.png) | Superadmin | Ilova mijozlari (`#482915`), onlayn indikator va `CustomerManageModal` (rasm, login/email jonli tekshiruv, sessiyalar) |
| 06 | [06-superadmin-jamoa-va-ruxsatlar.png](06-superadmin-jamoa-va-ruxsatlar.png) | Superadmin | Hamkorlar jamoasi, yangi xodim taklifini tasdiqlash, parol tiklash so‘rovlari va 24 ta ruxsat matritsasi |
| 07 | [07-superadmin-moliya-tezcheck-va-reklama.png](07-superadmin-moliya-tezcheck-va-reklama.png) | Superadmin | Tezcheck kassa holati, onlayn to‘lovlar, bank o‘tkazmalari va mobil ilovadagi HOME reklama previewi |
| 08 | [08-superadmin-aloqa-yordam-chat-va-elon.png](08-superadmin-aloqa-yordam-chat-va-elon.png) | Superadmin (Tungi) | Telegram-uslubidagi 2 ustunli Yordam chati, tahrir/o‘chirish auditi va 3 yo‘nalishli Ommaviy e’lon oynasi |
| 09 | [09-hamkorlar-kirish-va-shartlar.png](09-hamkorlar-kirish-va-shartlar.png) | Hamkorlar | Direktor/Resepshn/Hisobchi kirish sahifasi, «Parolni unutdingizmi?» oynasi va 9 bo‘limli Hamkor shartlari |
| 10 | [10-hamkorlar-direktor-bosh-sahifa-va-bugun.png](10-hamkorlar-direktor-bosh-sahifa-va-bugun.png) | Direktor & Resepshn | Zomin sanatoriyasi operatsion markazi, bugun kelish/ketish (1-klik Check-in) va kunlik muolaja tartibi |
| 11 | [11-hamkorlar-shaxmatka-bandlik-kalendari.png](11-hamkorlar-shaxmatka-bandlik-kalendari.png) | Direktor & Resepshn | Interaktiv Bandlik Kalendari (Shaxmatka Pro V3): butun xona va Erkaklar/Ayollar koyka-o‘rinlari (`3/4 band`) + Xona Pasporti |
| 12 | [12-hamkorlar-bronlar-crm-va-profsoyuz.png](12-hamkorlar-bronlar-crm-va-profsoyuz.png) | Direktor & Resepshn | 3-tabli CRM: Barcha bronlar, Kutish ro‘yxati / 6+ oy qayta chaqirish va Kasaba uyushmalari (Profsoyuz) kvotasi |
| 13 | [13-hamkorlar-bron-tafsiloti-va-emehmon.png](13-hamkorlar-bron-tafsiloti-va-emehmon.png) | Direktor & Resepshn | Bron tafsiloti, Pasport/JShShIR, Koyka-o‘rin va 1 tugmada chop etiladigan rasmiy «🖨️ E-mehmon anketasi» |
| 14 | [14-hamkorlar-sanatoriya-profili-va-ustaxona.png](14-hamkorlar-sanatoriya-profili-va-ustaxona.png) | Direktor | 4-bosqichli profil ustaxonasi, «Qaysi dardga davo?» ixtisosligi, yo‘llanma narxi tarkibi va 30 ta surat galereyasi |
| 15 | [15-hamkorlar-hisobchi-va-mobil-tungi.png](15-hamkorlar-hisobchi-va-mobil-tungi.png) | Hisobchi & Mobil | Hisobchi paneli (Tungi rejim, davr solishtirish, XLSX/PDF eksport) + Smartfonda Resepshn tezkor ko‘rinishi |

---

## Rasmlarni qayta generatsiya qilish

```powershell
node UI/web_panellar/render-boards.cjs
```
