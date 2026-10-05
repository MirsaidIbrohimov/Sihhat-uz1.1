# Sihhat uz xodimlar Telegram boti

Admin, direktor va resepsion bitta botdan foydalanadi. Menyu xodimning
Sihhat uz hisobidagi faol sanatoriya va joriy ruxsatlariga mos ochiladi.
2026-10-03 kuni rasmiy Telegram API orqali `@sihhat_admins_bot` ulanishi va
o‘zbekcha buyruqlar menyusi sozlanishi tekshirildi.

## Xodimni belgilash va Telegramni ulash

1. Superadmin saytida **Jamoa va ruxsatlar → Direktor tayinlash** orqali
   direktor biriktiriladi. Direktor **Xodim taklif qilish** orqali resepsion
   qo‘shadi; taklif superadmin tasdig‘idan keyin faollashadi.
2. Xodim saytga kiradi va dastlabki parolini almashtiradi. Admin saytga
   mavjud MFA talabi bilan kiradi.
3. **Telegram bot → Telegramga ulash** bir martalik havola yaratadi.
   Xodim havola orqali Telegramni ochadi va **Start**ni bosadi.
4. Saytga qaytib ism, username va Telegram IDni tekshiradi,
   **Bu mening Telegram akkauntim**ni belgilab **Bog‘lashni tasdiqlash**ni bosadi.

Havola odatda 5 daqiqa amal qiladi; yangi havola avvalgisini bekor qiladi.
Havolani ochishning o‘zi ruxsat bermaydi. Bot chatdagi rol tanlovi,
username yoki telefon orqali admin/direktor tayinlamaydi. Bitta Telegram
bitta xodimga bog‘lanadi. Mijoz hisoblari ulanmaydi; guruh va kanal orqali
ma’lumot berilmaydi. Har tugma va bildirishnomada huquqlar qayta tekshiriladi.

## Tugmalar

| Bo‘lim | Amal |
| --- | --- |
| Bugun / Ertaga | Kelish, ketish, band xonalar va bron kartalari |
| Bronlar | Barcha/tasdiqlangan/to‘lov jarayonidagi/muammoli bronlar va sahifalash |
| Bron qidirish | `SH-...` raqami bilan ruxsat etilgan bronni topish |
| Bron kartasi | Sana, mehmon, xonalar va ruxsat bilan to‘lov holati; tasdiqlab check-in/out |
| Bo‘sh xonalar | 1 yoki 7 tun uchun butun davr davomida bo‘sh xonalar; bron vaqtida yana tekshiriladi |
| Hisobot | Bugungi yoki shu oydagi xona/mehmon tunlari va bandlik; moliya alohida ruxsat bilan |
| Vazifalar | Qabul qilish/yakunlash; direktor faol xodim, sarlavha, tavsif va muddatni tanlab vazifa beradi |
| Moliya | To‘lov, refund, payout, abonent va hisob holatlari; yakuniy moliyaviy amallar saytda |
| Aloqa | Xabarni o‘qish, “Tanishdim”, murojaat yaratish va tasdiqlab javob yuborish |
| Boshqaruv | Jamoa; admin tasdiqlash navbati va tizim holati; rol/ruxsat boshqaruvi saytda |
| Sanatoriya | Faol sanatoriyani almashtirish; admin barcha sanatoriyalarni tanlashi mumkin |
| Sozlamalar | Xabar turlari, kunlik hisobot, vaqt, sokin vaqt va hisobni uzish |

Ro‘yxatlar odatda 6 tadan sahifalanadi. **Orqaga** va **Bosh menyu**
tugmalari bor; `/cancel` matn kiritishni bekor qiladi. Vazifa va murojaat
qoralamalari 15 daqiqa amal qiladi. Resepsion menyusi individual ruxsatga
bog‘liq; moliyaviy hisobot, payout va xodim boshqaruvi ruxsat bilan ochiladi.

## Bildirishnomalar

Bron, kelish/ketish, to‘lov natijasi/muammosi, refund, vazifa, xabar va
murojaat javoblari DB outboxidan yuboriladi. Kunlik ma’lumot standart
08:00da, tanlanadigan vaqtlar 07:00–10:00; zona `Asia/Tashkent`.
Abonent tugashidan 3 va 1 kun oldin hamda tugash kuni direktor eslatma oladi.

Sokin vaqt 22:00–07:00. Payment exception va adminning API/worker/SMS
texnik ogohlantirishlari uni chetlab o‘tishi mumkin. Texnik xabarlar
to‘lov xabarlari sozlamasiga bog‘liq. Barcha bildirishnomalarni o‘chirish
bu xabarlarni ham to‘xtatadi.

429/tarmoq xatosida kechiktirib qayta urinish, 403da bloklanganini belgilash
bor. Botni ochib Start bosish blok belgisini tozalaydi. Hisobni uzish
kutilayotgan deliverylarni bekor qiladi. Kiruvchi update IDlari deduplikatsiya
qilinadi, chatdagi amallar tartibi saqlanadi. Telegram tashqi send uchun
idempotency kafolatini bermaydi: senddan keyingi jarayon uzilishida xabar
takrorlanishi mumkin. Bron amallari versiya bilan, vazifa/murojaat yaratish
idempotency kaliti bilan takroriy ichki yozuvlardan himoyalangan.

## Sozlash va ishga tushirish

Token terminal buyruqlari, Git, web kodi yoki APKga yozilmaydi. Lokal
`.local/secrets/providers.env`da `TELEGRAM_BOT_TOKEN` va
`TELEGRAM_MODE=polling` saqlanadi. Fayl Windowsda faqat loyiha egasi va
SYSTEM uchun ochilgan; environment qiymatlari fayldan ustun. Deploymentda
platformaning secret saqlash vositasidan foydalaning. `.env.example` tokeni
bo‘sh. Chatda yuborilgan tokenni BotFather orqali yangilash tavsiya qilinadi;
yangi qiymat maxfiy faylga kiritilib worker qayta ishga tushiriladi.

Loyiha ildizidan:

```powershell
npm run db:migrate
npm run build:api
npm run telegram:check
npm run telegram:configure
npm run dev:telegram
```

API, domen worker va saytlar [RUNBOOK.md](RUNBOOK.md) bo‘yicha alohida
ishlaydi. Compiled bot: `npm run start:telegram -w @sihhat/api`.
Windowsdagi tayyor muhitda `npm run local:start` API, domen worker, saytlar
va yoqilgan botni fon rejimida birga ochadi. `local:status` botning tayyorligini
ham ko‘rsatadi; `local:stop` uni boshqa boshqariladigan xizmatlar bilan to‘xtatadi.
`TELEGRAM_MODE=disabled` bo‘lsa umumiy buyruq botni ochmaydi. Shu buyruq bilan
bot ishlayotganida `dev:telegram` yoki `start:telegram`ni yana ochmang.
`telegram:check` ulanish va webhook holatini tekshiradi;
`telegram:configure` bot tavsifi va commands menyusini yangilaydi.
Token yoki credential-bearing URL chiqarilmaydi.

Pollingda ayni botga **bitta Telegram worker** ishlating. Lokal PID lock
ikkinchi workerni rad etadi; productionda bitta replika belgilanadi.
Mavjud webhook pollingda o‘chirilmaydi; worker boshlanmaydi.
401/409 holatida to‘xtaydi, vaqtinchalik xatolarda kechiktirib urinadi.
Domen worker billing, hold expiry va provider timeoutlarini alohida bajaradi.

Telefon uchun `TELEGRAM_ADMIN_URL` va `TELEGRAM_PARTNER_URL` haqiqiy HTTPS
saytlarga sozlanadi. Hozir `localhost:3000/3001` kompyuterda ochiladi;
lokal manzil tugmasi botda tushunarli izoh ko‘rsatadi. Ommaviy hosting
bu bosqichda bajarilmagan.

Webhook muqobili: `TELEGRAM_MODE=webhook`, tasodifiy 32–256 belgili
`TELEGRAM_WEBHOOK_SECRET` va ommaviy HTTPS API. Telegramning `setWebhook`
sozlamasida `/telegram/webhook` va ayni `secret_token` alohida belgilanadi.
Endpoint `X-Telegram-Bot-Api-Secret-Token`ni tekshiradi va update bazaga
saqlangandan keyin javob beradi. Worker shu navbatni qayta ishlaydi.
Haqiqiy ommaviy webhook qabul sinovi hali bajarilmagan.

## Saqlash va tekshirish

Bog‘lash tokenlari hash bilan, kiruvchi payload AES-GCM bilan saqlanadi.
Tugallangan payload tozalanadi. Eskirgan linklar 1 kun, tugallangan/xato
update yozuvlari 7 kun va scheduling kalitlari 45 kundan keyin tozalanadi.
Test muhiti haqiqiy Telegramga so‘rov yubormaydi.

`npm test` PostgreSQLda ruxsat, CSRF, bir martalik ulash, takroriy
callback/update, wizard, eslatma va retrylarni tekshiradi.
`npm run test:web` Telegram sahifasini mock Telegram holati bilan,
mavjud kabinet amallarini lokal API orqali tekshiradi. Haqiqiy xodim
Telegramda Start → sayt tasdig‘i → menyu oqimini o‘zi yakunlashi kerak.

`npm run check:secrets` lokal sirlarning UTF-8/UTF-16/base64 ko‘rinishlarini
va bot tokeni formatini tekshiradi; topilgan qiymatlarni chiqarmaydi.
