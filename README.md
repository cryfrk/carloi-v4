# Carloi V4

Carloi V4, arac alim-satim, sosyal medya, garaj, OBD expertiz, mesajlasma, sigorta ve admin operasyonlarini tek monorepo icinde birlestiren bir platformdur.

Bu repo su hedefler icin hazirlandi:
- Gelistirme icin tek komutla ayaga kalkabilen workspace yapisi
- Test edilebilir NestJS + Prisma backend
- Mobile, web, admin desktop ve admin mobile istemcileri
- Deploy icin temel Docker, Vercel, Expo EAS ve Windows paketleme hazirligi

## Proje Yapisi

```text
carloi-v4/
  apps/
    api/
    mobile/
    web/
    admin-desktop/
    admin-mobile/
  packages/
    ui/
    types/
    config/
  prisma/
  docs/
  docker-compose.yml
  docker-compose.prod.yml
```

## Workspace Bilesenleri

- `apps/api`: NestJS API, Prisma, auth, post/feed, listings, garage, OBD, Loi AI, messaging, insurance, payments, admin.
- `apps/mobile`: Expo React Native son kullanici uygulamasi.
- `apps/web`: Next.js App Router web istemcisi.
- `apps/admin-desktop`: Electron + React admin masaustu uygulamasi.
- `apps/admin-mobile`: Expo React Native admin mobil uygulamasi.
- `packages/types`: Ortak enum ve DTO tipleri.
- `packages/ui`: Paylasilan UI yardimcilari.
- `packages/config`: Ortak config yardimcilari.
- `prisma`: Schema, migrations ve seed.

## Kurulum

Windows icin kritik not:
- Projeyi OneDrive, Desktop sync, Dropbox veya iCloud gibi senkronize klasorlerde calistirmayin.
- Onerilen yerel yol: `C:\dev\carloi-v4`
- Windows hazirlik scripti: `pnpm setup:windows`

```powershell
Copy-Item .env.example .env
pnpm setup:windows
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Zorunlu Ortam Degiskenleri

Asgari yerel kurulum icin su gruplari doldurulmalidir:

- Veritabani: `DATABASE_URL`
- Kullanici JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Admin JWT: `ADMIN_JWT_SECRET` veya ayri olarak `ADMIN_JWT_ACCESS_SECRET`, `ADMIN_JWT_REFRESH_SECRET`
- API istemci adresleri: `NEXT_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_API_BASE_URL`
- Seed: `ADMIN_SEED_PASSWORD`, gerekirse `SEED_USER_PASSWORD`

Opsiyonel servisler:

- Brevo: `BREVO_API_KEY`, `BREVO_SMS_SENDER`, `BREVO_EMAIL_SENDER`
- Loi AI: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`
- Garanti Sanal POS: `GARANTI_MERCHANT_ID`, `GARANTI_TERMINAL_ID`, `GARANTI_PROVISION_USER`, `GARANTI_PROVISION_PASSWORD`, `GARANTI_STORE_KEY`, `GARANTI_SUCCESS_URL`, `GARANTI_FAIL_URL`, `GARANTI_MODE`
- Medya storage: `MEDIA_STORAGE_PROVIDER`, `LOCAL_UPLOAD_DIR`, `PUBLIC_MEDIA_BASE_URL`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- CORS: `CORS_ORIGINS`

Tum degiskenlerin guncel listesi [`.env.example`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\.env.example) icindedir.

## Veritabani ve Seed

Temel Prisma komutlari:

```powershell
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Seed asagidaki demo verileri olusturur:

- Admin kullanicilari: `superadmin`, `insuranceadmin`, `commercialadmin`
- Ornek son kullanicilar: `demoindividual`, `democommercial`, `pendingdealer`
- Ornek arac katalogu: Fiat/Egea, Renault/Clio, Volkswagen/Golf
- Ornek ilanlar: `CLV4-2026-0001`, `CLV4-2026-0002`
- Ornek sosyal postlar ve profiller
- Ornek ticari basvuru verileri

## Gelistirme Komutlari

```powershell
pnpm setup:windows
pnpm dev
pnpm api:dev
pnpm web:dev
pnpm mobile:dev
pnpm admin-desktop:dev
pnpm admin-mobile:dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Notlar:
- `pnpm build` workspace build zincirini calistirir.
- Web icin production bundle komutu: `pnpm --filter @carloi-v4/web bundle`
- Admin desktop icin production bundle komutu: `pnpm --filter @carloi-v4/admin-desktop bundle`
- Admin desktop portable exe icin: `pnpm --filter @carloi-v4/admin-desktop dist:win:portable`
- Admin desktop installer icin: `pnpm --filter @carloi-v4/admin-desktop dist:win:installer`

## Windows Sorun Giderme

### pnpm install OneDrive altinda takiliyorsa

- Repoyu senkronize olmayan bir klasore tasiyin. Onerilen hedef: `C:\dev\carloi-v4`
- Ardindan `pnpm setup:windows` komutunu calistirin.

### Web SWC / Next.js bundle sorunu

Kontrol komutlari:

```powershell
pnpm --filter @carloi-v4/web typecheck
pnpm --filter @carloi-v4/web bundle
```

Windows onarim scripti:

```powershell
pnpm fix:web:swc:windows
powershell -ExecutionPolicy Bypass -File scripts/fix-next-swc-windows.ps1 -CleanModules
```

Oneriler:
- Node 22 LTS kullanin
- Repo senkronize klasorde olmasin
- Microsoft Visual C++ Redistributable kurulu olsun

### Admin desktop Windows paketleme

Portable exe uretimi:

```powershell
pnpm --filter @carloi-v4/admin-desktop dist:win:portable
```

Installer uretimi:

```powershell
pnpm --filter @carloi-v4/admin-desktop dist:win:installer
```

Notlar:
- Portable build, `signAndEditExecutable=false` ayari sayesinde symlink yetkisi istemeden uretilir.
- Mevcut ayarda installer da symlink yetkisine takilmadan uretilir. Ileride custom signing veya executable editing acilirsa Windows Developer Mode ya da yukseltilmis yetki tekrar gerekebilir.
- Kod imzalama eklendigi anda Windows sertifika ve yetki gereksinimleri yeniden devreye girer.

## Test Komutlari

```powershell
pnpm test
pnpm --filter @carloi-v4/api test
pnpm typecheck
pnpm lint
```

## Production Ready Checklist

- `NODE_ENV=production`
- `CORS_ORIGINS` sadece gercek domainlerle tanimli
- `REDIS_URL` aktif
- `MEDIA_STORAGE_PROVIDER=s3`
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` dolu
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET` gercek degerlerle degistirilmis
- `GARANTI_*`, `BREVO_*`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` production degerleri girilmis
- `pnpm build`
- `pnpm test`
- `docker compose -f docker-compose.prod.yml config`
- Backup klasoru ve retention ayarlari dogrulanmis
- `/health` endpointi `database`, `redis` ve `queues` kontrolleriyle cevap veriyor
- Private medya akislari `signed URL` ile calisiyor
- Access token guard'lari aktif session kontrolu yapiyor
- Rate limit ve helmet production'da aktif

## Deploy Rehberi

### API - VPS / Docker

- Dockerfile: [`apps/api/Dockerfile`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\api\Dockerfile)
- Production compose: [`docker-compose.prod.yml`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docker-compose.prod.yml)

Ornek:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Bu akista:
- PostgreSQL ayaga kalkar
- Redis ayaga kalkar
- API container acilir
- `pnpm prisma:migrate` otomatik kosar
- Upload ve log klasorleri volume olarak map edilir
- Gunluk PostgreSQL backup cron container'i devreye girer
- `/health` endpoint'i healthcheck olarak kullanilir

Hazir deploy scripti:

```bash
sh scripts/deploy-prod.sh
```

### Web - Vercel

- Root Directory: `apps/web`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm bundle`
- Output: `.next`
- Yardimci config: [`apps/web/vercel.json`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\web\vercel.json)

Temel env listesi:
- `NEXT_PUBLIC_API_BASE_URL`

### Mobile - Expo EAS

- Mobile config: [`apps/mobile/app.json`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\mobile\app.json)
- Mobile EAS: [`apps/mobile/eas.json`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\mobile\eas.json)
- Admin mobile config: [`apps/admin-mobile/app.json`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\admin-mobile\app.json)
- Admin mobile EAS: [`apps/admin-mobile/eas.json`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\admin-mobile\eas.json)

Ornek build:

```powershell
cd apps/mobile
eas build -p android --profile preview
```

```powershell
cd apps/admin-mobile
eas build -p ios --profile production
```

### Admin Desktop - Windows

- Portable paketleme: `pnpm --filter @carloi-v4/admin-desktop dist:win:portable`
- Installer paketleme: `pnpm --filter @carloi-v4/admin-desktop dist:win:installer`
- Electron config: [`apps/admin-desktop/electron.vite.config.ts`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\admin-desktop\electron.vite.config.ts)
- Installer ciktilari: `apps/admin-desktop/release/`

## Admin Rolleri

- `SUPER_ADMIN`: Dashboard, users, listings, commercial approvals, insurance requests, payments, audit logs.
- `INSURANCE_ADMIN`: Dashboard ve insurance requests akisina erisir.
- `COMMERCIAL_ADMIN`: Dashboard, commercial approvals ve sinirli user gorunumu.

## Bilinen Eksikler / Sonraki Fazlar

- Web bundle su an geciyor. Native SWC binary yine de uyari verirse repo yolu, Node 22 LTS ve Visual C++ Redistributable kontrol edilmelidir.
- Mobile ve admin mobile build'leri bu repo asamasinda Expo typecheck + config hazirligi seviyesindedir; store release oncesi cihaz tabanli smoke test gerekir.
- Story/video oynatma ve medya thumbnail turetimi daha ileri fazda guclendirilebilir.
- Real-time websocket katmani ileride eklenebilir.
- S3 icin bucket policy, object lifecycle ve CDN katmani hedef ortama gore ayrica sertlestirilmelidir.

## Ilgili Dokumanlar

- [`docs/ARCHITECTURE.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\ARCHITECTURE.md)
- [`docs/API_MODULES.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\API_MODULES.md)
- [`docs/DATABASE.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\DATABASE.md)
- [`docs/DEPLOYMENT.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\DEPLOYMENT.md)
- [`docs/SECURITY.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\SECURITY.md)
- [`docs/LEGAL_COMPLIANCE_NOTES.md`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docs\LEGAL_COMPLIANCE_NOTES.md)


