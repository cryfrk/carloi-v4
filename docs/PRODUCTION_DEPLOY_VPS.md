# Production Deploy - VPS

Bu dokuman, Carloi V4 API production stack'ini Ubuntu uzerinde Docker ile ayaga kaldirmak icindir.

## 1. Sunucu Hazirligi

Onerilen ortam:
- Ubuntu 22.04 LTS veya 24.04 LTS
- En az 2 vCPU, 4 GB RAM
- Ayri bir block storage ya da duzenli snapshot stratejisi
- DNS kayitlari hazir: `api.carloi.example`

Temel hazirlik:

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Europe/Istanbul
sudo apt install -y ca-certificates curl git
```

## 2. Docker Kurulumu

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

## 3. Repo Clone

```bash
sudo mkdir -p /opt/carloi-v4
sudo chown -R $USER:$USER /opt/carloi-v4
cd /opt/carloi-v4
git clone <REPO_URL> carloi-v4
cd carloi-v4
```

## 4. Production Env Hazirlama

API stack icin ornek dosya:
- `.env.production.api.example`

Sunucuda:

```bash
cp .env.production.api.example .env
nano .env
```

Asagidaki alanlari gercek degerlerle doldurun:
- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_JWT_SECRET`
- `CORS_ORIGINS`
- `BREVO_*`
- `GARANTI_*`
- `MEDIA_STORAGE_PROVIDER=s3`
- `S3_*`
- `OPENAI_API_KEY` ve/veya `DEEPSEEK_API_KEY`
- `ADMIN_SEED_PASSWORD`

## 5. Dry-Run Kontrolu

Gercek deploy oncesi zorunlu kontrol:

```bash
sh scripts/deploy-dry-run.sh .env
```

Bu script sunlari kontrol eder:
- `.env` var mi
- production icin zorunlu alanlar dolu mu
- `docker compose -f docker-compose.prod.yml config` geciyor mu
- `pnpm prisma:generate` geciyor mu
- `pnpm build` geciyor mu
- `pnpm test` geciyor mu

## 6. Production Stack'i Baslatma

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Hazir script ile ayni islem:

```bash
sh scripts/deploy-prod.sh
```

## 7. Migration ve Seed

Not:
- API container acilirken `prisma migrate deploy` otomatik kosar.
- Seed sadece ilk kurulumda ya da bilincli veri hazirliginda calistirilmalidir.

Container icinden elle tetikleme:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec api pnpm prisma:generate
docker compose -f docker-compose.prod.yml --env-file .env exec api pnpm prisma:seed
```

## 8. Health Kontrolu

```bash
curl http://127.0.0.1:3001/health
```

Beklenen alanlar:
- `status`
- `checks.database.status`
- `checks.redis.status`
- `checks.queues.notifications`
- `checks.queues.futureJobs`

## 9. Log Kontrolu

API loglari:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f api
```

Backup cron loglari:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f postgres-backup
```

## 10. Backup Kontrolu

Backup container'i ve dosyalari kontrol edin:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec postgres-backup sh -lc 'ls -lah /backups'
```

Isterseniz elle bir backup tetikleyin:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec postgres-backup sh /usr/local/bin/postgres-backup.sh
```

## 11. Reverse Proxy ve Domain

Onerilen yapi:
- `api.carloi.example` -> VPS
- TLS terminasyonu -> Nginx veya Caddy
- Proxy target -> `127.0.0.1:3001`

Nginx kullaniliyorsa `client_max_body_size` medya boyutlarina uygun ayarlanmalidir.

## 12. Rollback Adimlari

Onerilen yontem:
- Her deploy'u git tag veya release branch ile yapin.
- Onceki stabil commit'i ya da tag'i saklayin.

Uygulama rollback:

```bash
cd /opt/carloi-v4/carloi-v4
git fetch --all --tags
git checkout <ONCEKI_TAG_VEYA_COMMIT>
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Veritabani rollback gerekiyorsa son backup'tan donun:

```bash
gunzip -c /path/to/backup.sql.gz | docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## 13. Deploy Sonrasi Hemen Kontrol Edilecekler

- `/health` `ok` donuyor mu
- Login ve refresh calisiyor mu
- S3 upload ve private media signed URL akisi calisiyor mu
- Redis queue health `ok` mu
- Backup cron dosya uretiyor mu
- `CORS_ORIGINS` sadece gercek domainleri mi iceriyor
