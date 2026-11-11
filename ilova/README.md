# Sihhat uz — Android ilovasi

Joriy reliz versiya: **0.2.3 (build 6)**, 2026-11-11.

### 📱 Yuklab olish

- **Sayt orqali (har doim eng so‘nggi versiya):** [sihhat.uz/api/download/apk](https://www.sihhat.uz/api/download/apk)
- **GitHub Releases (rasmiy APK relizlari):** [releases/latest](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/latest)
- **SHA-256 nazorat summasi:** [SHA256SUMS.txt](SHA256SUMS.txt)

Lokal reliz nusxalari (`.gitignore`da, Gitga kiritilmaydi):
- `.local/releases/sihhat-uz-release.apk` (`63,799,955` bayt, ~60.8 MB)
- `ilova/Songgi UI/yangi versiya.apk`

### 🚀 0.2.3 (build 6) yangilanishlari

1. **Telegram Messenger uslubidagi chat (`Yordam va xabarlar`):** `Ochiq` / `Yopilgan` jildlari, qidiruv maydoni, gradient avatarlar, naqshli fon, sana ajratgichlari (`Bugun`/`Kecha`), qo‘sh tasdiq belgilari va kattalashuvchi rasm ko‘rish.
2. **Xabarlarni tahrirlash va o‘chirish (audit saqlash bilan):** Foydalanuvchi o‘z xabarini Telegram menyusi orqali tahrirlashi (`tahrirlangan`) va o‘z chatidan o‘chirishi mumkin; foydalanuvchi o‘chirgan xabar **Superadmin** panelida audit uchun saqlanadi va faqat Superadmin uni bazadan butunlay o‘chirishi mumkin.
3. **Onlayn API va to‘lov:** Ilova `https://sihhat-api.onrender.com` bilan ishlaydi (`demo_otp: false`).
4. **Avtomatik reliz (`GitHub Actions`):** `.github/workflows/android-release.yml` har `apps/mobile/**` pushida APKni imzolab **GitHub Releases**ga chiqaradi, `sihhat.uz/api/download/apk` esa avtomatik eng so‘nggi relizni tarqatadi.

### 🛠 Faylni tekshirish

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .local/releases/sihhat-uz.apk
```

Natija `ilova/SHA256SUMS.txt`dagi qiymat bilan bir xil bo‘lishi kerak:
`60e70fce23e696a257168bbdf4a10e5f28e16d7ad2032b3f235aea9cf4ef99e7`
