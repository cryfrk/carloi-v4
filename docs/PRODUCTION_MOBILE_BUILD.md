# Production Mobile Build

Bu dokuman son kullanici mobil uygulamasi ve admin mobile icin Expo EAS build hazirligini ozetler.

## 1. Gereksinimler

- Node 22 LTS
- Expo CLI / EAS CLI
- Apple Developer hesab iOS icin
- Google Play Console hesab i Android icin

Kurulum:

```bash
npm install -g eas-cli

eas login
```

## 2. Uygulama Kimlikleri

Son kullanici mobil uygulamasi:
- Android package: `com.carloi.v4.mobile`
- iOS bundle identifier: `com.carloi.v4.mobile`

Admin mobile uygulamasi:
- Android package: `com.carloi.v4.adminmobile`
- iOS bundle identifier: `com.carloi.v4.adminmobile`

Kaynak dosyalar:
- `apps/mobile/app.json`
- `apps/admin-mobile/app.json`

## 3. Production Env

Son kullanici mobil ornek dosya:
- `.env.production.mobile.example`

Admin uygulamalari icin ornek dosya:
- `.env.production.admin.example`

Production API adresi mutlaka HTTPS olmali:
- `EXPO_PUBLIC_API_BASE_URL=https://api.carloi.example`

## 4. EAS Profilleri

Kaynak dosyalar:
- `apps/mobile/eas.json`
- `apps/admin-mobile/eas.json`

## 5. Build Komutlari

Son kullanici mobil uygulamasi:

```bash
cd apps/mobile
eas build -p android --profile production
eas build -p ios --profile production
```

Admin mobile uygulamasi:

```bash
cd apps/admin-mobile
eas build -p android --profile production
eas build -p ios --profile production
```

## 6. Store Hazirlik Notlari

Android icin:
- Privacy policy URL hazirlayin
- Uygulama ikon ve splash asset'lerini final markaya cekin
- Version code ve changelog planini yapin

iOS icin:
- App Privacy yanitlarini hazirlayin
- Sign in, notifications ve media izin aciklamalarini gozden gecirin
- Screenshot ve App Store metadata setini hazirlayin

## 7. Release Oncesi Kontrol

- Login calisiyor mu
- Refresh flow production API ile calisiyor mu
- Upload endpoint'leri HTTPS uzerinden cevap veriyor mu
- Push notification altyapisi sonraki fazda eklenecekse store aciklamasi ona gore yapiliyor mu
- Error ekranlari ve bos durumlar test edildi mi
