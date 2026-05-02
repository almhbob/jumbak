#!/data/data/com.termux/files/usr/bin/bash
set -e

API_URL="${EXPO_PUBLIC_API_URL:-https://workspaceapi-server-production-3e22.up.railway.app}"
PROJECT_DIR="$HOME/jumbak"

echo "Jnbk | جنبك mobile preview launcher"
echo "API: $API_URL"

if ! command -v git >/dev/null 2>&1; then
  pkg update -y
  pkg install -y git
fi

if ! command -v node >/dev/null 2>&1; then
  pkg install -y nodejs-lts
fi

corepack enable
corepack prepare pnpm@9.12.0 --activate

if [ ! -d "$PROJECT_DIR/.git" ]; then
  cd "$HOME"
  git clone https://github.com/almhbob/jumbak.git
else
  cd "$PROJECT_DIR"
  git fetch origin main
  git reset --hard origin/main
fi

cd "$PROJECT_DIR"
pnpm install --frozen-lockfile=false

cd "$PROJECT_DIR/apps/mobile"
echo "Starting Expo preview..."
echo "If LAN fails, stop with CTRL+C then run: pnpm start -- --clear"
EXPO_PUBLIC_API_URL="$API_URL" pnpm start -- --clear --host lan
