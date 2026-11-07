#!/bin/bash
# Prepara a VPS para os apps do kit (Ubuntu ou Debian). Pode rodar quantas vezes quiser.
# Conservador de propósito: não apaga nada, não reseta o firewall, não para serviços de outros programas e não
# liga um firewall que estava desligado. Roda como root na VPS (o kit envia por ssh).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
diga() { echo "[preparar] $*"; }

. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ;;
  *) echo "ERRO_SO=este kit prepara Ubuntu ou Debian; achei ${ID:-?} ${VERSION_ID:-?}. Reinstale a VPS com Ubuntu 24.04 pelo hPanel."; exit 20 ;;
esac

livre_gb=$(df -BG / | awk 'NR==2{gsub("G","",$4); print $4}')
if [ "${livre_gb:-0}" -lt 6 ]; then echo "ERRO_DISCO=só ${livre_gb} GB livres; o kit precisa de pelo menos 6 GB."; exit 22; fi

# portas 80 e 443: precisam estar livres ou já ser do próprio kit
dono_ok=1
for porta in 80 443; do
  if ss -ltnH "( sport = :$porta )" 2>/dev/null | grep -q .; then
    projeto=""
    if command -v docker >/dev/null 2>&1; then
      c=$(docker ps --filter "publish=$porta" --format '{{.Names}}' 2>/dev/null | head -1)
      [ -n "$c" ] && projeto=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c" 2>/dev/null || true)
    fi
    [ "$projeto" = "jevkit" ] || dono_ok=0
  fi
done
if [ "$dono_ok" = 0 ]; then
  echo "ERRO_PORTAS=as portas 80/443 estão em uso por outro programa (veja o diagnóstico)."
  exit 21
fi

diga "instalando o básico (ca-certificates, curl, tar)"
apt-get update -qq >/dev/null 2>&1 || true
apt-get install -y -qq ca-certificates curl tar gzip >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  diga "instalando o Docker (script oficial get.docker.com, ~2 min)"
  curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
fi
systemctl enable --now docker >/dev/null 2>&1 || true
if ! docker compose version >/dev/null 2>&1; then
  diga "instalando o plugin do Docker Compose"
  apt-get install -y -qq docker-compose-plugin >/dev/null
fi

# teto para os logs do Docker (só se ainda não existir configuração própria)
if [ ! -f /etc/docker/daemon.json ]; then
  mkdir -p /etc/docker
  echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' > /etc/docker/daemon.json
  systemctl restart docker
  diga "logs do Docker limitados a 30 MB por contêiner"
fi

# VPS pequena sem swap: o build dos apps pode passar da memória
ram_mb=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
if [ "$ram_mb" -lt 6000 ] && [ "$(swapon --show --noheadings 2>/dev/null | wc -l)" = 0 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  diga "swap de 2 GB criado (/swapfile)"
fi

# firewall do sistema: se o ufw estiver LIGADO, libera 80 e 443 (não liga, não reseta, não mexe no resto)
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
  diga "ufw ligado: portas 80 e 443 liberadas"
fi

mkdir -p /etc/jev-kit /opt/jev-kit
chmod 700 /etc/jev-kit
echo "PRONTO=docker $(docker --version | awk '{print $3}' | tr -d ,) · compose $(docker compose version --short) · ${ram_mb} MB de RAM · ${livre_gb} GB livres · $(uname -m)"
