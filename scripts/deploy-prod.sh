#!/usr/bin/env bash
# ── KolayKOBİ Production Deploy ──────────────────────────────────────────────
# Kullanım:
#   bash scripts/deploy-prod.sh           → sadece değişen servisler build
#   bash scripts/deploy-prod.sh --full    → hepsini sıfırdan build (ilk deploy)
#   bash scripts/deploy-prod.sh --env     → sadece .env gönder, servis yeniden başlat

set -euo pipefail

FULL_BUILD=false
ENV_ONLY=false
for arg in "$@"; do
  case $arg in
    --full) FULL_BUILD=true ;;
    --env)  ENV_ONLY=true  ;;
  esac
done

# ─── Ayarlar ─────────────────────────────────────────────────────────────────
REMOTE_HOST="${REMOTE_HOST:-root@srv1492396.hstgr.cloud}"
REMOTE_DIR="${REMOTE_DIR:-/opt/kolaykobi}"
APP_DOMAIN="${APP_DOMAIN:-app.kolaykobi.com}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 KolayKOBİ Deploy  $([ "$FULL_BUILD" = true ] && echo '[TAM BUILD]' || echo '[HIZLI]')"
echo "   Sunucu : $REMOTE_HOST"
echo ""

# ─── Sadece .env değişmişse ───────────────────────────────────────────────────
if [[ "$ENV_ONLY" = true ]]; then
  echo "🔑 .env gönderiliyor..."
  rsync -az "$ROOT_DIR/.env" "$REMOTE_HOST:$REMOTE_DIR/.env"
  echo "🔄 Backend yeniden başlatılıyor (yeni env ile)..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d --no-deps --no-recreate backend && docker compose restart backend"
  echo "✅ Tamamlandı — env değişkenleri güncellendi."
  exit 0
fi

# ─── 1. Hangi servisler değişti? ─────────────────────────────────────────────
echo "🔍 [1/4] Değişiklikler tespit ediliyor..."
CHANGED=$(git -C "$ROOT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null || echo "all")

BUILD_FRONTEND=false
BUILD_BACKEND=false

if [[ "$FULL_BUILD" = true || "$CHANGED" == "all" ]]; then
  BUILD_FRONTEND=true
  BUILD_BACKEND=true
else
  echo "$CHANGED" | grep -q "^frontend/" && BUILD_FRONTEND=true || true
  echo "$CHANGED" | grep -q "^backend/"  && BUILD_BACKEND=true  || true
  # docker-compose, nginx config veya .env değişmişse her ikisini de build et
  echo "$CHANGED" | grep -qE "^(docker-compose|nginx/nginx)" && BUILD_FRONTEND=true && BUILD_BACKEND=true || true
fi

echo "   Frontend build: $([ "$BUILD_FRONTEND" = true ] && echo '✓' || echo 'atlandı (değişiklik yok)')"
echo "   Backend  build: $([ "$BUILD_BACKEND"  = true ] && echo '✓' || echo 'atlandı (değişiklik yok)')"
echo ""

# ─── 2. Kod + .env gönder ────────────────────────────────────────────────────
echo "📦 [2/4] Kod sunucuya gönderiliyor..."
rsync -az --checksum \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='backend/bin' \
  --exclude='backend/obj' \
  --exclude='.env' \
  "$ROOT_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

if [[ -f "$ROOT_DIR/.env" ]]; then
  rsync -az "$ROOT_DIR/.env" "$REMOTE_HOST:$REMOTE_DIR/.env"
fi
echo ""

# ─── 3. Docker build + restart ───────────────────────────────────────────────
echo "🐳 [3/4] Docker servisleri güncelleniyor..."
ssh "$REMOTE_HOST" bash <<REMOTE_SCRIPT
  set -e
  cd "$REMOTE_DIR"
  export DOCKER_BUILDKIT=1

  BUILD_FRONTEND=$BUILD_FRONTEND
  BUILD_BACKEND=$BUILD_BACKEND

  # Hangi servisleri build edeceğimizi belirle
  SERVICES=""
  [[ "\$BUILD_FRONTEND" = true ]] && SERVICES="\$SERVICES frontend"
  [[ "\$BUILD_BACKEND"  = true ]] && SERVICES="\$SERVICES backend"

  if [[ -n "\$SERVICES" ]]; then
    echo "  → Build ediliyor:\$SERVICES (cache kullanılıyor)..."
    # --parallel: frontend ve backend aynı anda build edilir
    docker compose build --parallel \$SERVICES

    echo "  → Servisler yeniden başlatılıyor..."
    # Sadece değişen servisleri restart et — postgres ve nginx dokunulmaz
    docker compose up -d --no-deps \$SERVICES
  else
    echo "  → Kod değişikliği yok, servisler olduğu gibi çalışıyor."
  fi

  echo "  → Durum:"
  docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
REMOTE_SCRIPT
echo ""

# ─── 4. Traefik routing doğrula ──────────────────────────────────────────────
echo "🌐 [4/4] Erişim kontrol ediliyor..."
ssh "$REMOTE_HOST" bash <<VERIFY_SCRIPT
  sleep 5
  STATUS=\$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$APP_DOMAIN" 2>/dev/null || echo "000")
  if [[ "\$STATUS" =~ ^[23] ]]; then
    echo "  ✓ https://$APP_DOMAIN → HTTP \$STATUS"
  else
    echo "  ⚠️  https://$APP_DOMAIN → HTTP \$STATUS"
  fi
VERIFY_SCRIPT

echo ""
echo "✅ Deploy tamamlandı! → https://$APP_DOMAIN"
