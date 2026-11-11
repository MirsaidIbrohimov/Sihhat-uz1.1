# Sihhat uz — Android ilovasi

Joriy reliz versiya: **0.2.4 (build 7)**, 2026-11-11.

### 📱 Yuklab olish

- **Sayt orqali (har doim eng so‘nggi versiya):** [sihhat.uz/api/download/apk](https://www.sihhat.uz/api/download/apk)
- **GitHub Releases (rasmiy APK relizlari):** [releases/latest](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/latest)
- **SHA-256 nazorat summasi:** [SHA256SUMS.txt](SHA256SUMS.txt)

Lokal reliz nusxalari (`.gitignore`da, Gitga kiritilmaydi):
- `.local/releases/sihhat-uz-release.apk` (`63,898,343` bayt, ~60.9 MB)
- `ilova/Songgi UI/yangi versiya.apk`

### 🚀 0.2.4 (build 7) yangilanishlari

1. **Profil rasmi (15 MB gacha):** Ilova foydalanuvchilari profillariga galereyadan (15 MB gacha tekshiruv va xotiraga mos optimizatsiya bilan) yoki HTTPS havoladan profil rasmini qo‘yishi va o‘chirishi mumkin.
2. **Jonli onlayn holat va chat avatarlari:** Ilova faol ishlayotganda `/auth/heartbeat` yuboriladi; Telegram uslubidagi suhbatda Superadmin/suhbatdosh rasmlari hamda onlayn yashil nuqta ko‘rinadi.
3. **Telegram Messenger uslubidagi chat (`Yordam va xabarlar`):** `Ochiq` / `Yopilgan` jildlari, xabarni tahrirlash (`tahrirlangan`), o‘z chatidan o‘chirish (Superadminda audit saqlanadi), `+` rasm biriktirish va kattalashtirish.
4. **Onlayn API va avtomatik reliz (`GitHub Actions`):** Ilova `https://sihhat-api.onrender.com` bilan ishlaydi (`demo_otp: false`). `.github/workflows/android-release.yml` har `apps/mobile/**` pushida APKni imzolab **GitHub Releases**ga chiqaradi, `sihhat.uz/api/download/apk` esa eng so‘nggi relizni uzatadi.

### 🛠 Faylni tekshirish

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .local/releases/sihhat-uz.apk
```

Natija `ilova/SHA256SUMS.txt`dagi qiymat bilan bir xil bo‘lishi kerak:
`90b175ab0767cf9ebd807c510e15f766d8d33716d43aab7c2ccfd4cfc796afa8`
