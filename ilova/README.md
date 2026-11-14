# Sihhat uz — Android ilovasi

Joriy reliz versiya: **0.2.5 (build 8)**, 2026-11-14.

### 📱 Yuklab olish

- **Sayt orqali (har doim eng so‘nggi versiya):** [sihhat.uz/api/download/apk](https://www.sihhat.uz/api/download/apk)
- **GitHub Releases (rasmiy APK relizlari):** [releases/latest](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/latest)
- **SHA-256 nazorat summasi:** [SHA256SUMS.txt](SHA256SUMS.txt)

Lokal reliz nusxalari (`.gitignore`da, Gitga kiritilmaydi):
- `.local/releases/sihhat-uz-release.apk` (`63,898,347` bayt, ~60.9 MB)
- `ilova/Songgi UI/yangi versiya.apk`

### 🚀 0.2.5 (build 8) yangilanishlari

1. **Profil rasmi yuklashdagi `VALIDATION_ERROR` tuzatildi:** `PATCH /auth/profile` va mobil `ProfileScreen` rasm yuklashda `name` maydonini birga uzatadi; masofaviy backend eski versiyada bo‘lganda ham rasm qurilma keshida saqlanadi va qayta nom/ma’lumot tekshiruvi xatosi («Kiritilgan ma’lumotni tekshiring») chiqmaydi.
2. **Backend va Sanatoriya rasmlari barqarorligi:** `AuthService.onModuleInit` bazada `User.avatarUrl` ustuni mavjudligini kafolatlaydi; `PATCH /auth/profile` va `POST /partner/media` `image/jpg`/`x-png`, `GIF` va `avatar_url` kabi farqlarni moslab qabul qiladi.
3. **Veb va APK sinxron reliz:** Veb-portallardagi profil va sanatoriya rasmlari yuklashda brauzerda optimallashtiriladi; `landing.tsx` va `apps/mobile/pubspec.yaml` **`0.2.5+8`** ga yangilandi.

### 🛠 Faylni tekshirish

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .local/releases/sihhat-uz.apk
```

Natija `ilova/SHA256SUMS.txt`dagi qiymat bilan bir xil bo‘lishi kerak:
`84574cfb28e69c46167b08b56b56c4aefd237629319f52267852e938f2e13d85`
