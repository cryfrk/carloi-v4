# Production Deploy - Vercel

Bu dokuman `apps/web` Next.js istemcisini Vercel uzerine almak icindir.

## 1. Proje Ayarlari

Vercel proje ayarlari:
- Framework Preset: Next.js
- Root Directory: `apps/web`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm bundle`
- Output Directory: `.next`

## 2. Env Dosyasi

Ornek dosya:
- `.env.production.web.example`

Gerekli alan:
- `NEXT_PUBLIC_API_BASE_URL=https://api.carloi.example`

Vercel dashboard icinde bu degiskeni su ortamlara ekleyin:
- Production
- Preview
- Gerekirse Development

## 3. Domain ve API Yonlendirmesi

Onerilen domainler:
- `app.carloi.example`
- `www.carloi.example`

Dikkat:
- API domaini `NEXT_PUBLIC_API_BASE_URL` ile birebir eslesmeli.
- API tarafindaki `CORS_ORIGINS`, Vercel domainlerini icermelidir.

## 4. Deploy Adimlari

```bash
pnpm --filter @carloi-v4/web typecheck
pnpm --filter @carloi-v4/web bundle
```

Ardindan Vercel'e push veya import ile deploy edin.

## 5. Deployment Sonrasi Kontrol

Kontrol listesi:
- Login ekrani aciliyor mu
- Feed veri cekiyor mu
- Listings listesi geliyor mu
- Notifications paneli cevap veriyor mu
- Profile ve settings route'lari aciliyor mu
- Browser network tab'inda API istekleri production domainine mi gidiyor

## 6. Sorun Giderme

### API'ye istek gitmiyorsa
- `NEXT_PUBLIC_API_BASE_URL` degerini kontrol edin
- API `CORS_ORIGINS` listesinde web domaininiz var mi kontrol edin
- Reverse proxy ve TLS yonlendirmesini kontrol edin

### Build hatasi varsa
- Vercel Node surumunu `22.x` LTS ile eslestirin
- Workspace install'in `pnpm install --frozen-lockfile` ile geldigini kontrol edin
- Tekrar lokal test edin:

```bash
pnpm --filter @carloi-v4/web bundle
```
