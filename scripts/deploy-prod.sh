#!/usr/bin/env bash
# ── KolayKOBİ Production Deploy ──────────────────────────────────────────────
# Kullanım: bash scripts/deploy-prod.sh
#
# Ne yapar:
#   1. Kodu Hostinger sunucusuna rsync ile gönderir
#   2. Docker image'larını build eder
#   3. Stack'i sıfırdan ayağa kaldırır
#   4. Traefik routing'i doğrular (SSL otomatik, sistem nginx gerekmez)

set -euo pipefail

# ─── Ayarlar ─────────────────────────────────────────────────────────────────
REMOTE_HOST="${REMOTE_HOST:-root@srv1492396.hstgr.cloud}"
REMOTE_DIR="${REMOTE_DIR:-/opt/kolaykobi}"
APP_DOMAIN="${APP_DOMAIN:-app.kolaykobi.com}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 KolayKOBİ Production Deploy"
echo "   Sunucu : $REMOTE_HOST"
echo "   Dizin  : $REMOTE_DIR"
echo "   Domain : $APP_DOMAIN"
echo ""

# ─── 1. Kod gönder ───────────────────────────────────────────────────────────
echo "📦 [1/4] Kod sunucuya gönderiliyor..."
rsync -avz --progress \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='backend/bin' \
  --exclude='backend/obj' \
  --exclude='.env' \
  --exclude='scripts/dev-start.sh' \
  "$ROOT_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

echo ""

# ─── 2. .env dosyasını gönder ─────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/.env" ]]; then
  echo "🔑 [2/4] .env gönderiliyor..."
  rsync -avz "$ROOT_DIR/.env" "$REMOTE_HOST:$REMOTE_DIR/.env"
else
  echo "⚠️  .env bulunamadı — sunucuda manuel oluştur:"
  echo "   ssh $REMOTE_HOST 'nano $REMOTE_DIR/.env'"
fi

echo ""

# ─── 3. Docker stack başlat ──────────────────────────────────────────────────
echo "🐳 [3/4] Docker stack ayağa kaldırılıyor..."
ssh "$REMOTE_HOST" bash <<REMOTE_SCRIPT
  set -e
  cd "$REMOTE_DIR"

  echo "  → Image'lar build ediliyor..."
  docker compose build --no-cache

  echo "  → Stack yeniden başlatılıyor..."
  docker compose down --remove-orphans || true
  docker compose up -d

  echo "  → Sağlık kontrolü (30s)..."
  sleep 30
  docker compose ps
REMOTE_SCRIPT

echo ""

# ─── 4. Traefik routing doğrula ──────────────────────────────────────────────
# Sistem nginx gerekmez — Traefik (n8n stack'i) Docker label'lardan
# kkb-nginx'i otomatik keşfeder ve SSL sertifikasını Let's Encrypt'ten alır.
echo "🌐 [4/4] Traefik routing doğrulanıyor..."
ssh "$REMOTE_HOST" bash <<VERIFY_SCRIPT
  # kkb-nginx'in Traefik ağında olduğunu kontrol et
  NETWORKS=\$(docker inspect kkb-nginx --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}' 2>/dev/null || echo "")
  if echo "\$NETWORKS" | grep -q "n8n_default"; then
    echo "  ✓ kkb-nginx Traefik ağında (n8n_default)"
  else
    echo "  ⚠️  kkb-nginx Traefik ağında değil — docker compose up -d nginx çalıştırılıyor..."
    cd "$REMOTE_DIR" && docker compose up -d --no-deps nginx
  fi

  # HTTP yanıtı kontrol et (Traefik HTTPS'e yönlendirmeli)
  sleep 3
  STATUS=\$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$APP_DOMAIN" 2>/dev/null || echo "000")
  if [[ "\$STATUS" =~ ^[23] ]]; then
    echo "  ✓ https://$APP_DOMAIN yanıt veriyor (HTTP \$STATUS)"
  else
    echo "  ⚠️  https://$APP_DOMAIN yanıt kodu: \$STATUS (DNS yayılımı bekleniyor olabilir)"
  fi
VERIFY_SCRIPT

echo ""
echo "✅ Deploy tamamlandı!"
echo "   → https://$APP_DOMAIN adresini kontrol et"
