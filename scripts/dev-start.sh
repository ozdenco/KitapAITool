#!/usr/bin/env bash
# scripts/dev-start.sh — Yerel geliştirme ortamını başlatır
#
# Mimari:
#   1. Docker'da: postgres + frontend + nginx
#   2. SSH tüneli: Mac:15678 → Hostinger:5678 (n8n HTTP, SSL bypass gereksiz)
#   3. Mac host'ta: .NET backend (dotnet run, N8n__BaseUrl=http://localhost:15678)
#
# Neden SSH tüneli?
#   Hostinger n8n sunucusu IPv4'te HTTPS (443)'ü reddediyor (TLS reset).
#   n8n, Hostinger localhost'unda 5678 portunda çalışıyor.
#   SSH tüneli bu portu Mac'e güvenli şekilde iletir — SSL sorununu tamamen atlar.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

N8N_SSH_HOST="${N8N_SSH_HOST:-root@srv1492396.hstgr.cloud}"
N8N_TUNNEL_LOCAL_PORT="15678"  # Mac'te açılacak port
N8N_TUNNEL_REMOTE_PORT="5678"  # Hostinger'da n8n'in portu

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

# ── 2. SSH tüneli: Mac:15678 → Hostinger n8n:5678 ────────────────────────────
echo ""
echo "▶  SSH tüneli kuruluyor: localhost:${N8N_TUNNEL_LOCAL_PORT} → ${N8N_SSH_HOST}:${N8N_TUNNEL_REMOTE_PORT}"

# Eski tünel varsa kapat
existing_pid=$(lsof -ti "TCP:${N8N_TUNNEL_LOCAL_PORT}" -s TCP:LISTEN 2>/dev/null || true)
if [[ -n "${existing_pid}" ]]; then
  echo "   Eski tünel (PID ${existing_pid}) kapatılıyor..."
  kill "${existing_pid}" 2>/dev/null || true
  sleep 1
fi

ssh -N -f \
  -L "127.0.0.1:${N8N_TUNNEL_LOCAL_PORT}:127.0.0.1:${N8N_TUNNEL_REMOTE_PORT}" \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  "${N8N_SSH_HOST}"

echo "✅  SSH tüneli aktif: http://localhost:${N8N_TUNNEL_LOCAL_PORT}"

# ── 3. Mac host: .NET backend ─────────────────────────────────────────────────
echo ""
echo "▶  .NET backend başlatılıyor (Mac host, port 5001)..."
echo ""

export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://0.0.0.0:5001"
export ConnectionStrings__Default="Host=localhost;Port=5432;Database=kolaykobi;Username=kkbuser;Password=${DB_PASSWORD:-kkbpassword123}"
export Jwt__Secret="${JWT_SECRET:-supersecretjwtkey_change_in_production_min32chars}"
export Jwt__ExpiryMinutes="60"
export Jwt__RefreshExpiryDays="30"
# SSH tüneli üzerinden HTTP — SSL bypass gerekmez
export N8n__BaseUrl="http://localhost:${N8N_TUNNEL_LOCAL_PORT}"

echo "   N8n__BaseUrl = ${N8n__BaseUrl}"
echo ""

cd "${ROOT_DIR}/backend"
exec dotnet run
