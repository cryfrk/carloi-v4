# Admin Desktop Distribution

Bu dokuman Windows icin admin desktop dagitim akislarini ozetler.

## 1. Gereken Komutlar

Bundle:

```bash
pnpm --filter @carloi-v4/admin-desktop bundle
```

Portable EXE:

```bash
pnpm --filter @carloi-v4/admin-desktop dist:win:portable
```

Installer:

```bash
pnpm --filter @carloi-v4/admin-desktop dist:win:installer
```

## 2. Cikti Konumu

Uretilen dosyalar tipik olarak su klasorde yer alir:
- `apps/admin-desktop/release/`

## 3. Portable mi Installer mi

Portable tercih edin:
- Hizli ic test dagitimlarinda
- IT onayi beklenmeyen ortamlarda
- USB veya paylasimli klasor dagitimlarinda

Installer tercih edin:
- Son kullaniciya daha tanidik bir Windows kurulum akisi lazimsa
- Masaustu kisayolu ve kaldirma akisi isteniyorsa

## 4. Windows Defender Uyarilari

Bu repo asamasinda EXE dosyalari imzasizdir.
Bu nedenle su durumlar gorulebilir:
- SmartScreen uyarisi
- "Unknown publisher" bildirimi
- Ilk calistirmada ek onay adimi

Kritik not:
- Production dagitiminda kod imzalama sertifikasi eklenmesi tavsiye edilir.
- Imza eklenmedikce kurumsal ortamlarda daha agresif Defender uyarilari gorulebilir.

## 5. Imzasiz EXE Notu

Imzasiz build ile dagitim yapiliyorsa:
- SHA256 checksum paylasin
- Indirme kaynagini sadece resmi domain veya guvenilen kanal yapin
- Son kullaniciya hash dogrulama adimlarini verin

## 6. Admin Giris Bilgileri ve Seed Mantigi

Seed ile olusan admin kullanicilari:
- `superadmin`
- `insuranceadmin`
- `commercialadmin`

Sifre mantigi:
- Seed sirasinda `ADMIN_SEED_PASSWORD` ne ise bu kullanicilar o sifre ile olusur
- Production'da development fallback sifresi kullanilmamalidir
- Ilk seed sonrasi sifrelerin degistirilmesi tavsiye edilir

## 7. Dagitim Oncesi Kontrol

- Login calisiyor mu
- Role gore menu degisiyor mu
- Insurance requests listesi aciliyor mu
- Commercial approvals listesi aciliyor mu
- Payments ve audit logs sadece uygun rollerden gorunuyor mu
- API endpoint'leri production `VITE_API_BASE_URL` adresine gidiyor mu