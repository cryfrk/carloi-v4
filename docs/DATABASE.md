# Database

## Temel Teknoloji

- Prisma ORM
- PostgreSQL
- Migration klasoru: `prisma/migrations`
- Seed dosyasi: [`prisma/seed.js`](C:\Users\faruk\OneDrive\Masaüstü\carloi v4\carloi-v4\prisma\seed.js)

## Ana Alanlar

- Kullanici ve profil
- Social post, story, like, comment, save, follow
- Listing, garage vehicle, vehicle catalog, OBD raporu
- Messaging thread, attachment ve deal agreement
- Insurance request, offer, payment, policy documents
- Admin user, admin session, audit log
- MediaAsset ve story view

## Veri Kurallari

- Tum temel ID alanlari `cuid()` uretir.
- Soft delete olan modeller `deletedAt` alanini kullanir.
- Listing ve garage gibi alanlarda gerekli unique indexler korunur.
- Media tarafinda eski `url` alanlari kirilmadan, yeni `mediaAssetId` alanlari ile kademeli gecis korunur.

## Seed Icerigi

- 3 admin hesap
- 3 ornek son kullanici
- Onayli ve bekleyen ticari hesap verisi
- 2 ornek listing
- 2 ornek post
- Ornek follow iliskileri
- Araç katalogu ve vehicle knowledge

## Oneri

Production gecisinde `prisma migrate deploy` kullanin. Lokal schema tasarimi gelistirirken `migrate dev` ile yeni migration uretin; mevcut migration dosyalarini manuel degistirmemek daha guvenlidir.
