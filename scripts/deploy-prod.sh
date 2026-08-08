#!/usr/bin/env bash
# ── KolayKOBİ Production Deploy ──────────────────────────────────────────────
# Kullanım: bash scripts/deploy-prod.sh
#
# Ne yapar:
#   1. Kodu Hostinger sunucusuna rsync ile gönderir
#   2. Docker image'larını build eder
#   3. Stack'i sıfırdan ayağa kaldırır
#   4. Hostinger nginx vhost'u kurar (ilk kez)

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

# ─── 4. Hostinger nginx vhost kur (ilk deploy'da) ────────────────────────────
echo "🌐 [4/4] Nginx vhost kuruluyor..."
ssh "$REMOTE_HOST" bash <<VHOST_SCRIPT
  VHOST_FILE="/etc/nginx/sites-available/$APP_DOMAIN"
  VHOST_LINK="/etc/nginx/sites-enabled/$APP_DOMAIN"

  if [[ -f "\$VHOST_FILE" ]]; then
    echo "  → Vhost zaten var, güncelleniyor..."
  else
    echo "  → Yeni vhost oluşturuluyor..."
  fi

  cp "$REMOTE_DIR/nginx/hostinger-vhost.conf" "\$VHOST_FILE"

  if [[ ! -L "\$VHOST_LINK" ]]; then
    ln -s "\$VHOST_FILE" "\$VHOST_LINK"
    echo "  → Symlink oluşturuldu"
  fi

  nginx -t && systemctl reload nginx
  echo "  ✓ Nginx yeniden yüklendi"

  # SSL sertifikası (ilk kez)
  if [[ ! -d "/etc/letsencrypt/live/$APP_DOMAIN" ]]; then
    echo ""
    echo "  ⚡ SSL sertifikası alınıyor..."
    certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos \
      -m ozdenisikgil@gmail.com --redirect || \
      echo "  ⚠️  Certbot başarısız — DNS kaydı henüz yayılmamış olabilir. 5 dakika bekleyip tekrar dene."
  else
    echo "  ✓ SSL zaten mevcut"
  fi
VHOST_SCRIPT

echo ""
echo "✅ Deploy tamamlandı!"
echo "   → https://$APP_DOMAIN adresini kontrol et"
