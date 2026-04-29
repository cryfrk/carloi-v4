# Deployment

## API - Docker / VPS

Gerekli dosyalar:
- [`apps/api/Dockerfile`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\apps\api\Dockerfile)
- [`docker-compose.prod.yml`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\docker-compose.prod.yml)

Adimlar:
1. Sunucuya repo ve `.env` dosyasini aktar.
2. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
3. `/health` endpoint'ini kontrol et.
4. Upload volume'unu kalici disk ile esle.

## Web - Vercel

- Root directory: `apps/web`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm bundle`
- Output: `.next`
- Zorunlu env: `NEXT_PUBLIC_API_BASE_URL`

## Mobile - Expo EAS

- Mobile app id: `com.carloi.v4.mobile`
- Admin mobile app id: `com.carloi.v4.adminmobile`
- EAS profilleri her iki Expo app klasorunde de hazir.

Ornek:
- `cd apps/mobile && eas build -p android --profile preview`
- `cd apps/admin-mobile && eas build -p ios --profile production`

## Admin Desktop - Windows

- Bundle: `pnpm --filter @carloi-v4/admin-desktop bundle`
- Installer: `pnpm --filter @carloi-v4/admin-desktop dist:win`
- Cikti klasoru: `apps/admin-desktop/release`

## Ortam Hatirlatmasi

Production ortaminda asagidaki gruplar gercek degerlerle doldurulmalidir:
- JWT ve admin JWT secretlari
- Database URL
- Brevo bilgileri
- Garanti POS bilgileri
- Media storage ayarlari
- `CORS_ORIGINS`
