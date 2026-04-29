# API Modules

## Core

- `auth`: Kayit, login, refresh, logout, verify-code, forgot/reset password.
- `admin`: Admin auth, dashboard, role guard, user/listing/payment/audit islemleri.
- `media`: Form-data upload, local storage, private medya erisimi.

## Social

- `posts`: Post create, feed, like, comment, save.
- `stories`: Story create, feed, view, viewer list, delete.
- `profiles`: Profile detail, tab icerikleri, own profile update.
- `notifications`: Bildirim listesi, tekil goruldu, toplu goruldu.
- `follows`: Follow akislari users controller/servisi etrafinda calisir.

## Commerce

- `listings`: Listing create, feed, detail, save, update, delete.
- `vehicles`: Vehicle catalog sorgulari.
- `garage`: Garage vehicle CRUD, public garage ve listing baglantisi.
- `obd`: Mock adapter, rapor olusturma, expertise ozeti.
- `legal-compliance`: Listing limit, ruhsat eslesmesi ve ticari onay kontrolleri.

## Communication and AI

- `messages`: Direct, group, listing-deal threadleri, agree/share-license/request-insurance.
- `loi-ai`: Conversation, provider routing, listing search parser, comparison, seller questions, description generation.

## Insurance and Payments

- `insurance`: Insurance request/offer/document akislari.
- `payments`: Mock/Garanti provider, callback verification, payment result.

## Ops Notlari

- Tumu `/health` ile ayni Nest app icinde servis edilir.
- Public feed ve listing feed cursor tabanli sayfalama kullanir.
- Admin endpointleri ayri JWT secret zinciri ve role guard ile korunur.
