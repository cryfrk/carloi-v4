# Security

## Auth ve Session

- Kullanici ve admin auth ayri JWT zinciri kullanir.
- Refresh tokenlar hash'li saklanir.
- Admin tarafinda `ADMIN_JWT_SECRET` fallback'i ile ayrik access/refresh secretlari desteklenir.

## Role Koruma

- Normal kullanici tokeni admin endpointlerine giremez.
- `SUPER_ADMIN`, `INSURANCE_ADMIN`, `COMMERCIAL_ADMIN` ayrimi guard katmaninda korunur.

## Hassas Veri

- TC, plaka, telefon ve ruhsat alanlari ihtiyaca gore maskeli doner.
- Private medya `GET /media/assets/:id/file` uzerinden yetki kontrollu acilir.
- Profil gizliligi ve `showGarageVehicles` ayari public response'u sinirlar.

## Network ve CORS

- Development ortaminda CORS acik kalabilir.
- Production ortaminda `CORS_ORIGINS` tanimlanmadan cross-origin erisim acilmamasi hedeflenir.

## Payment Guvenligi

- Garanti callback verileri dogrulanmadan odeme `PAID` sayilmaz.
- Callback metadata audit log'a yazilir.
- Production ortaminda eksik Garanti env varsa mock fallback acilmaz.

## Upload Guvenligi

- MIME type ve boyut limiti uygulanir.
- Random dosya isimleri kullanilir.
- Public/private ayrimi `MediaAsset.visibility` ile korunur.

## Halen Dikkat Gerektiren Alanlar

- In-memory rate limit dagitik ortamlarda merkezi degildir.
- S3 signed URL akisi placeholder seviyesindedir.
- Web ve mobile istemciler icin uzun omurlu secret saklama politikasi deployment sirasinda tekrar gozden gecirilmelidir.
