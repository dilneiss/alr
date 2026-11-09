#!/usr/bin/env bash
# ==============================================================================
# ALR (Autonomous Learning Runtime) - Linux & Linux ARM Installation Script
# Supports: x86_64, aarch64 (ARM64), armv7l (Raspberry Pi 3/4/5, AWS Graviton,
# Oracle Cloud Ampere A1, Apple Silicon Linux, Debian, Ubuntu, Fedora, Arch)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  Autonomous Learning Runtime (ALR) - Linux & ARM Installer     ${NC}"
echo -e "${BLUE}  Alternativa Gratuita, Local e Open Source ao JEV / System 1   ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Detect Architecture and OS
ARCH=$(uname -m)
OS=$(uname -s)

if [ "$OS" != "Linux" ]; then
    echo -e "${RED}[ERRO] Este script foi desenhado para Linux. Sistema detectado: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}[✔] Sistema Operacional:${NC} $OS"
echo -e "${GREEN}[✔] Arquitetura de CPU:${NC} $ARCH"

case "$ARCH" in
    aarch64|arm64)
        echo -e "${GREEN}[✔] Plataforma detectada: Linux ARM 64-bit (ARM64 / AArch64)${NC}"
        echo -e "    Otimizações NEON e operações SIMD ativadas automaticamente."
        ;;
    armv7*|armhf)
        echo -e "${YELLOW}[!] Plataforma detectada: Linux ARM 32-bit (armv7l)${NC}"
        ;;
    x86_64|amd64)
        echo -e "${GREEN}[✔] Plataforma detectada: Linux x86_64 (AMD64)${NC}"
        echo -e "    Otimizações AVX2 / AVX-512 ativadas automaticamente."
        ;;
    *)
        echo -e "${YELLOW}[!] Arquitetura incomum ($ARCH). O compilador Rust tentará gerar binário nativo.${NC}"
        ;;
esac

# 2. Detect Package Manager and Dependencies
echo -e "\n${BLUE}--> Verificando dependências do sistema...${NC}"

if command -v apt-get &> /dev/null; then
    PKG_MGR="apt"
    echo -e "${GREEN}[✔] Gerenciador de pacotes:${NC} apt (Debian / Ubuntu / Raspberry Pi OS)"
    PACKAGES="build-essential curl git ca-certificates"
    MISSING=""
    for pkg in gcc make curl git; do
        if ! command -v $pkg &> /dev/null; then
            MISSING="$MISSING $pkg"
        fi
    done
    if [ -n "$MISSING" ]; then
        echo -e "${YELLOW}[i] Instalando dependências de compilação:${NC} $PACKAGES"
        sudo apt-get update -y && sudo apt-get install -y $PACKAGES
    fi
elif command -v dnf &> /dev/null; then
    PKG_MGR="dnf"
    echo -e "${GREEN}[✔] Gerenciador de pacotes:${NC} dnf (Fedora / RHEL / Amazon Linux)"
    if ! command -v gcc &> /dev/null || ! command -v git &> /dev/null; then
        echo -e "${YELLOW}[i] Instalando grupo Development Tools...${NC}"
        sudo dnf groupinstall -y "Development Tools" && sudo dnf install -y curl git
    fi
elif command -v pacman &> /dev/null; then
    PKG_MGR="pacman"
    echo -e "${GREEN}[✔] Gerenciador de pacotes:${NC} pacman (Arch Linux / Manjaro ARM)"
    if ! command -v gcc &> /dev/null; then
        sudo pacman -Syu --noconfirm base-devel curl git
    fi
fi

# 3. Check / Install Rust Compiler
echo -e "\n${BLUE}--> Verificando compilador Rust (rustc / cargo)...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}[!] Rust não encontrado. Instalando via rustup.rs para $ARCH...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo -e "${GREEN}[✔] Rust já instalado:${NC} $(rustc --version)"
fi

# 4. Compile ALR in Release Mode
echo -e "\n${BLUE}--> Compilando o ALR em modo release nativo ($ARCH)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

cargo build --release -p alr-cli

ALR_BIN="$SCRIPT_DIR/target/release/alr"

if [ ! -f "$ALR_BIN" ]; then
    echo -e "${RED}[ERRO] Falha ao encontrar o binário compilado em: $ALR_BIN${NC}"
    exit 1
fi

echo -e "${GREEN}[✔] Binário compilado com sucesso:${NC} $ALR_BIN"
"$ALR_BIN" --version || true

# 5. Optional Systemd User Service Setup
echo -e "\n${BLUE}--> Deseja configurar o ALR para iniciar no boot (systemd user service)? [s/N]${NC}"
read -r -t 15 CONF_SERVICE || CONF_SERVICE="n"

if [[ "$CONF_SERVICE" =~ ^[sSyY]$ ]]; then
    SERVICE_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SERVICE_DIR"
    
    cat <<EOF > "$SERVICE_DIR/alr.service"
[Unit]
Description=Autonomous Learning Runtime (ALR) - Playground & JEV System 1 Engine
After=network.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
ExecStart=$ALR_BIN playground --port 3000
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=RUST_LOG=info

[Install]
WantedBy=default.target
EOF

    systemctl --user daemon-reload
    systemctl --user enable --now alr.service

    if command -v loginctl &> /dev/null; then
        loginctl enable-linger "$USER" || true
    fi

    echo -e "${GREEN}[✔] Serviço systemd ativado!${NC}"
    echo -e "    Status: systemctl --user status alr.service"
    echo -e "    Logs:   journalctl --user -u alr.service -f"
else
    echo -e "${BLUE}[i] Para rodar o ALR manualmente a qualquer momento:${NC}"
    echo -e "    $ALR_BIN playground --port 3000"
fi

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}  ALR instalado e pronto na arquitetura $ARCH!                  ${NC}"
echo -e "${GREEN}  Acesse o Playground & API /v1/systemone em:                   ${NC}"
echo -e "${GREEN}  👉 http://localhost:3000                                      ${NC}"
echo -e "${GREEN}================================================================${NC}"
