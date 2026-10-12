# Railwayga joylash

2026-10-08: loyiha uchun Railway ishga tushirish sozlamalari qo‘shildi.
Railwaydagi jonli build, domen, Redis/S3 va provider qabul sinovi hali
bajarilmagan. Lokal tekshiruvni production qabuli deb hisoblamang.

Shu sanadagi rasmiy Tezcheck signed o‘qish tekshiruvi kassa `active`,
`accepts_payments=true`, Click/Payme/Uzcard/Humo usullari va balans endpointini
tasdiqladi. Tranzaksiya namunasi **0**. Haqiqiy checkout/webhook va har
sanatoriyaning direct merchant ulanishi alohida qabul talab qiladi.

Railwayning joriy [IaC hujjati](https://docs.railway.com/infrastructure-as-code)
va [sozlama APIsi](https://docs.railway.com/infrastructure-as-code/reference)
asosida `.railway/railway.ts` ishlatiladi. Yangi xizmatlarda eski
`railway.json`/`railway.toml` tanlanmaydi. SDK `railway@3.13.1` lockfilega
bog‘langan; CLI kamida **5.42.1**, amaldagi yangilangan versiya tavsiya qilinadi.

## Xizmatlar

| Railway nomi | Build | Start | Tayyorlik |
| --- | --- | --- | --- |
| `api` | `npm run build:api` | `npm run start:api` | `/health/ready` |
| `worker` | `npm run build:api` | `npm run start:worker` | Jarayon, outbox va heartbeat kuzatuvi |
| `telegram` | `npm run build:api` | `npm run start:telegram` | Bitta polling jarayoni va Telegram holati |
| `superadmin` | `npm run build -w @sihhat/superadmin-web` | `npm run start:admin` | `/api/health/ready` |
| `partner` | `npm run build -w @sihhat/partner-web` | `npm run start:partner` | `/api/health/ready` |

Har Node xizmati uchun root directory repozitoriya ildizi: npm workspaces
`packages/ui` va `packages/api-client-ts`ni shu yerdan oladi. Barcha
xizmatlar bitta Railway environmentida bo‘lsin. Alohida `postgres`,
`redis`, `media` bucket va APIga ulangan `/private` enrollment volume ham
ta’riflangan. Bucket credentiallari serverning S3 o‘zgaruvchilariga kiritiladi.
Android APK Railway xizmati emas; u public HTTPS APIga ulanadi.

API porti `4000`, productionda IPv4/IPv6 `::` interfeysi. Panellar
Railway bergan `PORT`ni oladi, `SIHHAT_WEB_HOST=::`. Lokal standartlar
`127.0.0.1:3000/3001`. Redis/BullMQ `family: 0` bilan ikkala IP oilasini
qo‘llaydi; bu [Railway private network qoidasiga](https://docs.railway.com/networking/private-networking/library-configuration)
mos. Xizmatlarda sleep o‘chirilgan, boshlang‘ich replika **1**.

`TRUST_PROXY=private` Railwaydagi ichki proksi manzillariga ishonadi:
login/OTP limitlari panel serverining umumiy IPsi bilan emas, undan keyingi
mijoz IPsi bilan sanaladi. Public IPdan kelgan soxta oldingi
`X-Forwarded-For` hopi ishonchli deb olinmaydi. Bu
[Express proksi qoidasi](https://expressjs.com/en/guide/behind-proxies/)ga
asoslangan; jonli Railway qabulida haqiqiy edge/proksi zanjiri tekshiriladi.
Oddiy lokal APIda standart `TRUST_PROXY=none`.

Panellarning `/api` proksisi build paytida
`SIHHAT_API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4000`ga ulanadi.
Bu manzil brauzer credentiali emas. API hosti/porti o‘zgarsa ikkala
panelni qayta build/deploy qiling. Railway buildida qiymat yo‘q bo‘lsa,
localhostga ulanadigan build chiqarish o‘rniga xato qaytadi.

## Deployment muhiti

`.railway/.env.example`dagi nomlarni Railway **Shared Variables**ga kiriting
va backend xizmatlarida shu reference qiymatlarini ishlating. Namuna
manzillarni haqiqiylari bilan almashtiring. Tanlangan provider ishlatmaydigan
maydonlarni bo‘sh qiymat bilan belgilang; muqobil SMS yoki Payme tanlansa
uning tegishli rekvizitlarini to‘ldiring. Backend xizmatlari bir xil sirlar,
baza va adapterlar bilan ishlaydi. Sirlar web xizmatlariga berilmaydi.

- `AUTH_SECRET`: tasodifiy kamida 32 belgi. `MFA_ENCRYPTION_KEY`: tasodifiy
  64 hex belgi. Ularni deploymentlar orasida saqlang; kalit almashishi
  sessiya/MFA ma’lumotlariga ta’sir qiladi.
- `DATABASE_URL` va `REDIS_URL` IaCdagi database referencelaridan olinadi.
  Lokal `127.0.0.1:55432` bazasi Railway serverida ishlamaydi.
- `CORS_ORIGINS`: ikkala panelning haqiqiy HTTPS originlari, vergul bilan,
  yo‘l va oxirgi `/`siz. Origin CSRFda ham ishlatiladi.
- `SMS_ADAPTER=eskiz`: token yoki API email/password, OTP matni va uning
  rasmiy tasdig‘i. `ESKIZ_OTP_APPROVED=true`ni faqat tasdiq olingach belgilang.
- `PAYMENT_MODE=tezcheck`: server kaliti va faol kassa kodi. Webhook
  ishlatilsa public HTTPS `/payments/tezcheck` va kabinet bergan secret.
  Har sanatoriyaning direct merchant ulanishi ham alohida tasdiqlanishi kerak.
- Private S3: HTTPS endpoint, region, bucket, access/secret key. AWS S3ning
  standart endpointidan foydalanilsa `S3_ENDPOINT` bo‘sh. `media` bucketni
  provision qilib, Railway ko‘rsatgan S3 rekvizitlarini qo‘ying. Public
  rasm va private hujjat uchun signed URLlar tekshiriladi.
- Gemini, push va Telegram: tanlangan adapterga mos server rekvizitlari.
  AI uchun `catalog` fallback ishlatilishi mumkin. Telegram panel URLlari
  haqiqiy HTTPS bo‘lsin. Pushning haqiqiy qurilmaga yetishi alohida tekshiriladi.

IaC `NODE_ENV=production`, `DEMO_OTP_ENABLED=false`,
`BOOKING_SETTLEMENT_MODE=direct`, `STORAGE_ADAPTER=s3` va
`WORKER_MODE=redis`ni o‘rnatadi. `npm run deploy:check` konfiguratsiyani
tekshiradi va sirlarni chiqarmaydi; providerga so‘rov yubormaydi. Lokal
muhitda uning nonzero natijasi production uchun nimalar yetishmasligini
ko‘rsatadi. Konfiguratsiya o‘tishi haqiqiy xizmatning ishlashini isbotlamaydi.

## Joylash tartibi

1. Lokal `npm run build:api`, `npm run build:web`, `npm run check`,
   `npm test`, `npm run railway:check` va `npm run check:secrets`ni bajaring.
2. Railway CLIga kiring va aynan shu loyiha/environmentga bog‘lang:
   `railway login`, `railway link`. Yangi bo‘sh loyiha tanlang. Mavjud
   loyiha bo‘lsa avval undagi resurs va sirlarni saqlaydigan konfiguratsiya
   bilan reja tuzing; ushbu yangi loyiha namunasi mavjud resurslar ro‘yxati emas.
3. `railway config plan` orqali o‘zgarishlarni ko‘ring, keyin ko‘rib chiqilgan
   rejani `railway config apply` bilan qo‘llang. `.railway/railway.ts`
   GitHub source ulashni yoki kodni yuborishni bajarmaydi. PostgreSQL,
   Redis, bucket, volume va shared sirlarni tayyorlang.
4. API va ikkala panelga Railway public domain yarating yoki haqiqiy
   domenlarni ulang; TLS ishlasin. `CORS_ORIGINS` va Telegram URLlarini
   shu domenlarga moslang. Domenlarni CLI orqali shu repozitoriyaga
   avtomatik yozish sozlanmagan.
5. Ko‘rib chiqilgan lokal kodni `railway up --service api` bilan yuklang.
   `.railwayignore` `.env`, `.local`, kesh, signing va buildlarni chiqaradi.
   API pre-deploy avval `deploy:check`, keyin **11 migratsiya** uchun
   `prisma migrate deploy`ni bajaradi. Migratsiya build ichida bajarilmaydi;
   [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command)
   baza private networkida ishlaydi. API tayyor bo‘lgach qolgan to‘rtta
   xizmatni shu usulda alohida yuklang. Workerlar migratsiyani takrorlamaydi.
6. Yangi production superadminini demo seed bilan yaratmang. APIga
   vaqtincha secret `BOOTSTRAP_LOGIN`/`BOOTSTRAP_PASSWORD` bering va uning
   konteynerida `npm run bootstrap:production -w @sihhat/api`ni bajaring.
   MFA `/private/bootstrap-mfa.json`ga yoziladi; private faylni xavfsiz
   olib, telefondagi authenticatorga ulang. Faylni logga yoki public
   saytga chiqarmang. Bootstrap sirlarini ish tugagach olib tashlang.
7. Bir bot uchun bitta polling worker. Cloud botni ochishdan oldin lokal
   botni `npm run local:stop -- -Only telegram` bilan to‘xtating. Railway
   Telegram xizmatida IaC `overlapSeconds=0`, `drainingSeconds=30` va
   bitta replikani belgilaydi; jonli sozlama rejasida ularni tekshiring.
   Worker/Telegramga public domen kerak emas.

GitHub source keyin tanlansa kanonik repo
`MirsaidIbrohimov/Sihhat-uz1.1`, branch `main`. Lokal o‘zgarishlar foydalanuvchi
aniq push so‘ramaguncha GitHubga yuborilmaydi. GitHubdagi eski kod bilan
yangi lokal konfiguratsiya tekshirilgan deb hisoblanmaydi.

Lokal sanatoriya ma’lumotlari, rasmlar va hisoblar cloudga avtomatik
ko‘chirilmaydi. Ma’lumot ko‘chirish kerak bo‘lsa DB va media zaxirasini
alohida saqlab, mo‘ljaldagi bazani tekshirib migratsiya qiling. Private
zaxiralarni source uploadga qo‘shmang.

## Jonli qabul

API `/health/live`, `/health/ready`, katalog va ikkala panelning
`/api/health/ready`si **200** bo‘lsin. Keyin HTTPS orqali MFA/staff login,
cookie, CSRF, tenant ruxsatlari, logout va revoked sessiya tekshiriladi.
S3 private fayl ruxsati/signed URL, Redis restart/retry, Telegram hisob
ulash va xabar/javob, real SMS OTP hamda merchant checkout/webhook/polling
alohida bajariladi. Real refund/payout va bank tasdig‘i ham talab qilinadi.

PostgreSQL, media va sirlar uchun alohida zaxira/tiklash tekshiruvi zarur.
Railway konteynerining vaqtinchalik diskiga yuklangan media saqlanmang.
Haqiqiy HTTPS API va signing sozlangach Android release qayta yig‘iladi:
`npm run mobile:release -- https://haqiqiy-api-domeni`. Lokal HTTP debug
APK production ilovasi sifatida berilmaydi.
