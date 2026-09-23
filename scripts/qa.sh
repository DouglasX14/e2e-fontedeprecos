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

# FRONTEND_DIR: env > ../frontend-fp > ../../frontend-fp
if [[ -z "${FRONTEND_DIR:-}" ]]; then
  for candidate in \
    "$(cd "$ROOT/.." && pwd)/frontend-fp" \
    "$(cd "$ROOT/../.." && pwd)/frontend-fp"
  do
    if [[ -d "$candidate" ]]; then
      export FRONTEND_DIR="$candidate"
      break
    fi
  done
fi

echo "==> e2e-fontedeprecos QA ($MODE)"
echo "    BASE_URL=$BASE_URL"
echo "    INJECT_TESTIDS=$INJECT_TESTIDS"
echo "    FRONTEND_DIR=${FRONTEND_DIR:-(não definido)}"

# --- Node >= 18 ---
if ! command -v node >/dev/null 2>&1; then
  echo "Erro: Node.js não encontrado. Instale Node 18+ (recomendado: nvm use neste repo)."
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Erro: Node $NODE_MAJOR detectado; precisa Node 18+."
  exit 1
fi

if [[ -f "$ROOT/.nvmrc" ]]; then
  WANT_NODE="$(tr -d '[:space:]' < "$ROOT/.nvmrc")"
  if [[ -n "$WANT_NODE" && "$NODE_MAJOR" != "$WANT_NODE" ]]; then
    echo "Aviso: Node $NODE_MAJOR em uso; .nvmrc recomenda $WANT_NODE (nvm use)."
  fi
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
    echo "  Layout esperado:"
    echo "    projetos/"
    echo "      frontend-fp/"
    echo "      e2e-fontedeprecos/"
    echo "  Ou: FRONTEND_DIR=/caminho/absoluto/frontend-fp yarn qa"
    echo "  Ou suba o Nuxt e use BASE_URL=$BASE_URL"
    exit 1
  fi
  echo "==> Playwright vai subir o Nuxt via FRONTEND_DIR"
else
  echo "==> App já responde em $BASE_URL (reuseExistingServer)"
fi

# --- pin frontend.pin ---
PIN_FILE="$ROOT/frontend.pin"
PIN_COMMIT=""
if [[ -f "$PIN_FILE" ]]; then
  PIN_COMMIT="$(grep '^commit=' "$PIN_FILE" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
fi

check_frontend_pin() {
  local dir="$1"
  if [[ -z "$PIN_COMMIT" ]]; then
    return 0
  fi
  if [[ ! -d "$dir/.git" ]] && ! git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    echo "Aviso: FRONTEND_DIR não é repo git — pin $PIN_COMMIT não verificado."
    return 0
  fi
  local head
  head="$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || true)"
  if [[ -z "$head" ]]; then
    echo "Aviso: não foi possível ler HEAD em $dir — pin não verificado."
    return 0
  fi
  if [[ "$head" == "$PIN_COMMIT"* || "$PIN_COMMIT" == "$head"* ]]; then
    echo "==> frontend pin OK ($head == $PIN_COMMIT de frontend.pin)"
    return 0
  fi
  echo "Aviso: frontend HEAD=$head diverge do pin $PIN_COMMIT (ref em frontend.pin)."
  echo "  Ideal: cd \"$dir\" && git fetch && git checkout $PIN_COMMIT"
  if [[ "${STRICT_FRONTEND_PIN:-}" == "1" ]]; then
    echo "Erro: STRICT_FRONTEND_PIN=1 — abortando."
    exit 1
  fi
}

if [[ -n "${FRONTEND_DIR:-}" && -d "${FRONTEND_DIR}" ]]; then
  check_frontend_pin "$FRONTEND_DIR"
elif [[ "$app_up" -eq 1 ]]; then
  echo "Aviso: pin não verificado (app já no ar / sem FRONTEND_DIR)."
fi

# --- deps ---
if [[ ! -d node_modules ]]; then
  echo "==> yarn install"
  yarn install
fi

if ! node -e "require('dotenv')" 2>/dev/null; then
  echo "Erro: módulo 'dotenv' ausente (necessário para playwright-utils)."
  echo "  Rode: yarn install   (ou yarn add -D dotenv) e git pull."
  exit 1
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

if [[ "$EXIT" -eq 0 ]]; then
  echo "    OK — suíte passou."
  echo "    Relatório (opcional): yarn qa:report"
  exit 0
fi

echo "    FALHOU — veja o checklist e o report abaixo."
echo ""
echo "--- Falhas comuns ---"
echo "  Cannot find module 'dotenv' →  git pull / yarn install"
echo "  Executable doesn't exist  →  re-rode yarn qa (instala Chromium)"
echo "  Timeout / Loading...      →  Nuxt no ar? BASE_URL / FRONTEND_DIR ok?"
echo "  Pin diverge               →  git checkout do commit em frontend.pin"
echo "  Node errado               →  nvm use  (.nvmrc = 26)"
echo "  Testid / strict mode      →  git pull (inject) + yarn qa:report"
echo "  App não sobe              →  yarn no frontend-fp; porta 3010 livre"
echo ""

ZIP="$ROOT/playwright-report-qa.zip"
if [[ -f "$ROOT/playwright-report/index.html" ]]; then
  rm -f "$ZIP" "${ZIP%.zip}.tgz"
  if command -v zip >/dev/null 2>&1; then
    (cd "$ROOT" && zip -qr "$ZIP" playwright-report)
  else
    (cd "$ROOT" && tar -czf "${ZIP%.zip}.tgz" playwright-report)
    ZIP="${ZIP%.zip}.tgz"
  fi
  echo "    Report empacotado: $ZIP"
  echo "    Envie este arquivo ao time (ou print do HTML)."
else
  echo "    Aviso: playwright-report/index.html ausente — sem zip."
fi
echo "    Abrir HTML local: yarn qa:report"
exit "$EXIT"
