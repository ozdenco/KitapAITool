#!/usr/bin/env bash
# scripts/dev-start.sh — Yerel geliştirme ortamını başlatır
#
# Bu script:
#   1. Docker'da: postgres + frontend + nginx (host.docker.internal üzerinden backend'e proxy)
#   2. Mac host'ta: .NET backend (dotnet run)
#
# Neden? Docker'ın TLS stack'i Hostinger/Cloudflare'ı geçemiyor.
# macOS TLS'i n8n'e sorunsuz ulaşıyor.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── .env dosyasını yükle ──────────────────────────────────────────────────────
if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "❌  .env dosyası bulunamadı: ${ROOT_DIR}/.env"
  exit 1
fi
# shellcheck disable=SC1090
source <(grep -v '^#' "${ROOT_DIR}/.env" | grep '=')

# ── 1. Docker: postgres + frontend + nginx ────────────────────────────────────
echo "▶  Docker container'ları başlatılıyor (postgres + frontend + nginx)..."
cd "${ROOT_DIR}"
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up -d postgres frontend nginx

echo ""
echo "⏳  postgres hazır olana kadar bekleniyor..."
until docker exec kkb-postgres pg_isready -U kkbuser -d kolaykobi -q 2>/dev/null; do
  sleep 1
done
echo "✅  postgres hazır"

# ── 2. Mac host: .NET backend ─────────────────────────────────────────────────
echo ""
echo "▶  .NET backend başlatılıyor (Mac host, port 5000)..."
echo "   n8n → macOS TLS ile erişiliyor (Docker bypass)"
echo ""

export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://0.0.0.0:5001"   # 5000: macOS AirPlay tarafından kullanılıyor
export ConnectionStrings__Default="Host=localhost;Port=5432;Database=kolaykobi;Username=kkbuser;Password=${DB_PASSWORD:-kkbpassword123}"
export Jwt__Secret="${JWT_SECRET:-supersecretjwtkey_change_in_production_min32chars}"
export Jwt__ExpiryMinutes="60"
export Jwt__RefreshExpiryDays="30"
export N8n__BaseUrl="${N8N_BASE_URL:-https://n8n.srv1492396.hstgr.cloud}"

cd "${ROOT_DIR}/backend"
exec dotnet run
