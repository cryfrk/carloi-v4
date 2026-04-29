#!/bin/sh
set -eu

ENV_FILE="${1:-.env}"
COMPOSE_FILE="docker-compose.prod.yml"

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

info() {
  printf 'INFO: %s\n' "$1"
}

ok() {
  printf 'OK: %s\n' "$1"
}

if [ ! -f "$ENV_FILE" ]; then
  fail "$ENV_FILE dosyasi bulunamadi. Once production env dosyanizi hazirlayin."
fi

if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm bulunamadi. Node.js ve pnpm kurulu olmali."
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker bulunamadi. Dry-run icin Docker gerekli."
fi

set -a
. "$ENV_FILE"
set +a

PLACEHOLDER_ERRORS=""

append_error() {
  if [ -n "$PLACEHOLDER_ERRORS" ]; then
    PLACEHOLDER_ERRORS="$PLACEHOLDER_ERRORS
- $1"
  else
    PLACEHOLDER_ERRORS="- $1"
  fi
}

read_var() {
  eval "printf '%s' \"\${$1-}\""
}

require_value() {
  name="$1"
  value="$(read_var "$name")"
  if [ -z "$value" ]; then
    append_error "$name bos birakilmis"
    return
  fi

  case "$value" in
    replace-me|*replace-me*|*example.com*|*carloi.example*|*localhost*)
      append_error "$name production degeri ile degistirilmeli"
      ;;
  esac
}

require_any_value() {
  first="$1"
  second="$2"
  first_value="$(read_var "$first")"
  second_value="$(read_var "$second")"

  case "$first_value" in
    ''|replace-me|*replace-me*|*example.com*|*carloi.example*|*localhost*) first_value='' ;;
  esac
  case "$second_value" in
    ''|replace-me|*replace-me*|*example.com*|*carloi.example*|*localhost*) second_value='' ;;
  esac

  if [ -z "$first_value" ] && [ -z "$second_value" ]; then
    append_error "$first veya $second alanlarindan en az biri gercek production degeri ile doldurulmali"
  fi
}

require_value NODE_ENV
if [ "${NODE_ENV:-}" != "production" ]; then
  append_error "NODE_ENV production olmali"
fi

for key in \
  PORT \
  DATABASE_URL \
  POSTGRES_DB \
  POSTGRES_USER \
  POSTGRES_PASSWORD \
  REDIS_URL \
  CORS_ORIGINS \
  JWT_ACCESS_SECRET \
  JWT_REFRESH_SECRET \
  ADMIN_JWT_SECRET \
  BREVO_API_KEY \
  BREVO_SMS_SENDER \
  BREVO_EMAIL_SENDER \
  GARANTI_MERCHANT_ID \
  GARANTI_TERMINAL_ID \
  GARANTI_PROVISION_USER \
  GARANTI_PROVISION_PASSWORD \
  GARANTI_STORE_KEY \
  GARANTI_SUCCESS_URL \
  GARANTI_FAIL_URL \
  GARANTI_MODE \
  MEDIA_STORAGE_PROVIDER \
  LOI_AI_DAILY_LIMIT
  do
  require_value "$key"
done

if [ "${MEDIA_STORAGE_PROVIDER:-}" != "s3" ]; then
  append_error "MEDIA_STORAGE_PROVIDER production icin s3 olmali"
else
  for key in S3_BUCKET S3_REGION S3_ACCESS_KEY S3_SECRET_KEY S3_PUBLIC_BASE_URL; do
    require_value "$key"
  done
fi

require_any_value OPENAI_API_KEY DEEPSEEK_API_KEY

if [ -n "$PLACEHOLDER_ERRORS" ]; then
  printf 'Production env eksikleri bulundu:\n%s\n' "$PLACEHOLDER_ERRORS"
  exit 1
fi

ok "Production env zorunlu alanlari dolu gorunuyor"

info "docker compose production config kontrolu basliyor"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null
ok "docker compose prod config gecti"

info "Prisma generate calistiriliyor"
pnpm prisma:generate
ok "Prisma generate gecti"

info "Workspace build calistiriliyor"
pnpm build
ok "Workspace build gecti"

info "API test zinciri calistiriliyor"
pnpm test
ok "API test zinciri gecti"

printf 'Dry-run tamamlandi. Gercek deploy yapilmadi.\n'
