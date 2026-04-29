#!/bin/sh
set -eu

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/health}"

if [ ! -f "$ENV_FILE" ]; then
  echo ".env dosyasi bulunamadi. Once .env olusturun."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "API health kontrolu bekleniyor: $HEALTH_URL"
ATTEMPT=1
while [ "$ATTEMPT" -le 30 ]; do
  if wget -qO- "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Deploy basarili. API ayakta."
    exit 0
  fi

  sleep 5
  ATTEMPT=$((ATTEMPT + 1))
done

echo "Deploy tamamlandi ancak health endpoint dogrulamasi zaman asimina ugradi."
exit 1