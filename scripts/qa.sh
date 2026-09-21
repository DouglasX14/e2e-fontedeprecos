#!/usr/bin/env bash
# QA / suporte — um comando para preparar e rodar a suíte cotação v2.
# Uso: ./scripts/qa.sh [smoke|full]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-full}"
case "$MODE" in
  smoke|full) ;;
  *)
    echo "Uso: $0 [smoke|full]"
    exit 2
    ;;
esac

# --- defaults seguros para QA ---
export INJECT_TESTIDS="${INJECT_TESTIDS:-1}"
export PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-3010}"
export BASE_URL="${BASE_URL:-http://127.0.0.1:${PLAYWRIGHT_PORT}}"

DEFAULT_FRONTEND="$(cd "$ROOT/.." && pwd)/frontend-fp"
if [[ -z "${FRONTEND_DIR:-}" ]]; then
  if [[ -d "$DEFAULT_FRONTEND" ]]; then
    export FRONTEND_DIR="$DEFAULT_FRONTEND"
  fi
fi

echo "==> e2e-fontedeprecos QA ($MODE)"
echo "    BASE_URL=$BASE_URL"
echo "    INJECT_TESTIDS=$INJECT_TESTIDS"
echo "    FRONTEND_DIR=${FRONTEND_DIR:-(não definido)}"

# --- Node >= 18 ---
if ! command -v node >/dev/null 2>&1; then
  echo "Erro: Node.js não encontrado. Instale Node 18+."
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Erro: Node $NODE_MAJOR detectado; precisa Node 18+."
  exit 1
fi

if ! command -v yarn >/dev/null 2>&1; then
  echo "Erro: yarn não encontrado."
  exit 1
fi

# --- frontend disponível? ---
app_up=0
if curl -sf -o /dev/null --max-time 3 "$BASE_URL/" 2>/dev/null; then
  app_up=1
fi

if [[ "$app_up" -eq 0 ]]; then
  if [[ -z "${FRONTEND_DIR:-}" ]] || [[ ! -d "$FRONTEND_DIR" ]]; then
    echo "Erro: frontend não está em $BASE_URL e FRONTEND_DIR inválido."
    echo "  Clone o frontend-fp ao lado deste repo (../frontend-fp), ou:"
    echo "  FRONTEND_DIR=/caminho/para/frontend-fp yarn qa"
    echo "  — ou suba o Nuxt antes e use BASE_URL=$BASE_URL"
    exit 1
  fi
  echo "==> Playwright vai subir o Nuxt via FRONTEND_DIR"
else
  echo "==> App já responde em $BASE_URL (reuseExistingServer)"
  # App no ar: não força webServer se FRONTEND_DIR apontar errado — ok deixar exportado
fi

# --- deps ---
if [[ ! -d node_modules ]]; then
  echo "==> yarn install"
  yarn install
fi

echo "==> Playwright Chromium"
if [[ "${CI:-}" == "1" ]]; then
  yarn playwright install --with-deps chromium
else
  yarn playwright install chromium
fi

# --- run ---
SPECS=(playwright/e2e/cotacao-*.spec.ts)
if [[ "$MODE" == "smoke" ]]; then
  SPECS=(
    playwright/e2e/cotacao-detalhes-v2.spec.ts
    playwright/e2e/cotacao-item-v2.spec.ts
  )
fi

echo "==> Rodando: ${SPECS[*]}"
set +e
yarn playwright test "${SPECS[@]}" --workers=1
EXIT=$?
set -e

echo ""
echo "==> Exit code: $EXIT"
echo "    Relatório HTML: yarn test:e2e:report"
echo "    (pasta playwright-report/ — envie print ou zip se falhar)"
exit "$EXIT"
