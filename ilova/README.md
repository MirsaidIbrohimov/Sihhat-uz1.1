# Sihhat uz — Android va iOS (PWA) ilovasi

Joriy reliz versiya: **0.2.7 (build 10)**, 2026-11-21.

### 📱 Yuklab olish (Android)

- **Sayt orqali (har doim eng so‘nggi versiya):** [sihhat.uz/api/download/apk](https://www.sihhat.uz/api/download/apk)
- **GitHub Releases (rasmiy APK relizlari):** [releases/latest](https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/latest)
- **SHA-256 nazorat summasi:** [SHA256SUMS.txt](SHA256SUMS.txt)

Lokal reliz nusxalari (`.gitignore`da, Gitga kiritilmaydi):
- `.local/releases/sihhat-uz-release.apk` (`32,390,782` bayt, ~30.9 MB)
- `ilova/Songgi UI/yangi versiya.apk`

### 🍏 iOS (iPhone / iPad) — App Store’siz o‘rnatish (PWA)

1. iPhone’da **Safari** brauzerida [https://www.sihhat.uz](https://www.sihhat.uz) saytini oching (yoki bosh sahifadagi **«iOS (iPhone) uchun o‘rnatish»** tugmasini bosing).
2. Pastki paneldagi **Ulashish (Share)** tugmasini bosing.
3. Ro‘yxatdan **«Asosiy ekranga qo‘shish» (Add to Home Screen)** bandini tanlang va **Qo‘shish (Add)** ni bosing.

### 🚀 0.2.7 (build 10) yangilanishlari

1. **Onlayn bron (`quick-checkout` va mobil bron) tuzatildi:**
   - Faol va tasdiqlangan sanatoriyalarda `paymentReady` avtomatik `true` qilinadi (`online_booking_available: true`).
   - `POST /payments/quick-checkout` inventar qulfi (`inventory:<sanatoriumId>`), muddati o‘tgan `HOLD` / `PAYMENT_PENDING` bandliklarini tozalash, mijozning avvalgi to‘lanmagan bronini bekor qilish va `availableRooms()` orqali bo‘sh xona tanlash (yoki barcha xonalar band bo‘lsa yangi xona birligini avto-yaratish) bilan himoyalandi (`room_allocation_no_overlap` `500 INTERNAL_ERROR` xatosi bartaraf etildi).
   - Telefon raqami formati (`90 123 45 67`, `998901234567`, `+998901234567`) veb va mobil ilovada avtomatik `+998XXXXXXXXX` shaklga keltiriladi; mobil ilovada `/customer/quotes` yoki `/customer/bookings/hold` eski server javobida `ONLINE_BOOKING_UNAVAILABLE` / `MERCHANT_NOT_READY` qaytarsa avtomatik `/payments/quick-checkout` zaxira oqimiga o‘tadi.
2. **Barcha Android telefonlarga birdek o‘rnatiladigan Universal APK (`~30.9 MB`):**
   - `armeabi-v7a` (32-bit), `arm64-v8a` (64-bit) va `x86_64` arxitekturalari, `useLegacyPackaging = true` + `android:extractNativeLibs="true"` hamda **`v1 (JAR) + v2 + v3`** imzo sxemalari qo‘llandi.
   - APK hajmi 64.2 MB dan **30.9 MB** (`32,390,782` bayt) gacha ixchamlashtirildi; Android 7.0 dan Android 15/16/17+ gacha bo‘lgan Samsung, Xiaomi/Redmi, Honor, Realme, Oppo, Vivo va Pixel qurilmalarida 16 KB sahifa tekislash yoki `INSTALL_PARSE_FAILED_NO_CERTIFICATES` xatosisiz o‘rnatiladi.
3. **iOS (iPhone) PWA qo‘llab-quvvatlashi:** `manifest.json`, `appleWebApp` (`capable: true`) va bosh sahifada bosqichma-bosqich iPhone o‘rnatish oynasi qo‘shildi.

### 🛠 Faylni tekshirish

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .local/releases/sihhat-uz.apk
```

Natija `ilova/SHA256SUMS.txt`dagi qiymat bilan bir xil bo‘lishi kerak:
`1fdda14ca8e16e1838da0c981ecbad352c167d6b9fb1efb74985a558326aa005`
