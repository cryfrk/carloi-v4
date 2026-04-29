# Architecture

## Monorepo Yaklasimi

Carloi V4 pnpm workspace uzerinde calisir. Domain mantigi API icinde moduller halinde ayrilir, istemciler ortak tipleri `packages/types` uzerinden tuketir.

## Katmanlar

- `apps/api`: Tek kaynak backend. Auth, social, listings, garage, OBD, Loi AI, messaging, insurance, payments, admin ve media modulleri burada yer alir.
- `apps/mobile` ve `apps/web`: Son kullanici deneyimi. Benzer domain akislarini farkli arayuzlerle sunar.
- `apps/admin-desktop` ve `apps/admin-mobile`: Operasyon ekipleri icin rol bazli yonetim istemcileri.
- `packages/types`: Workspace genelindeki enum, DTO ve API response tipleri.
- `packages/ui`: Paylasilan UI yardimcilari ve bilesenleri.
- `prisma`: Domain modelleri, migration zinciri ve demo seed.

## Veri Akisi

- Kullanici ve admin auth ayridir.
- API tum kalici veriyi Prisma uzerinden PostgreSQL'e yazar.
- Medya yuklemeleri `MediaAsset` ile izlenir; dev ortaminda local storage kullanilir.
- Hikaye, post, listing, garage ve message attachment alanlari kademeli olarak `mediaAssetId` ile iliskilenir.
- Insurance ve payments akislari messaging deal threadleriyle baglantili calisir.

## Tasarim Ilkeleri

- Service/controller ayrimi korunur.
- DTO + `ValidationPipe` zorunludur.
- Hassas veri maskelenir.
- Soft delete gerekli alanlarda korunur.
- Mock provider katmanlari geliþtirici deneyimini bozmadan entegrasyonlara hazirlik saglar.
