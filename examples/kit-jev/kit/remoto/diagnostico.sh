#!/bin/bash
# Diagnóstico da VPS, só leitura: sistema, memória, disco, Docker, quem usa as portas 80/443 e o firewall.
# O kit envia este script pelo ssh e lê as linhas CHAVE=valor.
set -u
. /etc/os-release 2>/dev/null || true
echo "SO=${ID:-?} ${VERSION_ID:-?}"
echo "ARQUITETURA=$(uname -m)"
echo "RAM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)"
echo "RAM_LIVRE_MB=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)"
echo "SWAP_MB=$(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo)"
echo "DISCO_LIVRE_GB=$(df -BG / | awk 'NR==2{gsub("G","",$4); print $4}')"
echo "CPUS=$(nproc)"
if command -v docker >/dev/null 2>&1; then
  echo "DOCKER=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ,)"
  echo "COMPOSE=$(docker compose version --short 2>/dev/null || echo nao)"
  echo "KIT_RODANDO=$(docker ps --filter label=com.docker.compose.project=jevkit -q 2>/dev/null | wc -l | tr -d ' ')"
  for porta in 80 443; do
    for c in $(docker ps --filter "publish=$porta" --format '{{.Names}}' 2>/dev/null); do
      projeto=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c" 2>/dev/null)
      echo "PORTA_${porta}_CONTEINER=$c projeto=${projeto:-nenhum}"
    done
  done
else
  echo "DOCKER=nao"
fi
for porta in 80 443; do
  linha=$(ss -ltnpH "( sport = :$porta )" 2>/dev/null | head -1)
  if [ -n "$linha" ]; then
    prog=$(echo "$linha" | sed -n 's/.*users:((\"\([^\"]*\)\".*/\1/p')
    echo "PORTA_${porta}=${prog:-ocupada}"
  else
    echo "PORTA_${porta}=livre"
  fi
done
if command -v ufw >/dev/null 2>&1; then echo "UFW=$(ufw status 2>/dev/null | head -1 | awk '{print $2}')"; else echo "UFW=ausente"; fi
echo "SSH_PORTA=${SSH_CONNECTION##* }"
echo "FIM=ok"
