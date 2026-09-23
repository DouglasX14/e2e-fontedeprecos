#!/usr/bin/env bash
# QA / suporte — um comando para preparar e rodar a suíte cotação v2.
# Uso: ./scripts/qa.sh [smoke|full|server]
#   server — sobe o Nuxt na porta do QA, pré-aquece as rotas e fica no ar
#            (rode `yarn qa` em outro terminal para reutilizá-lo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-full}"
case "$MODE" in
  smoke|full|server) ;;
  *)
    echo "Uso: $0 [smoke|full|server]"
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
else
  echo "==> App já responde em $BASE_URL (reutilizando)"
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

# --- Nuxt: sobe uma vez e pré-aquece ---
NUXT_LOG="$ROOT/.qa-nuxt.log"
SERVER_PID=""

# Rotas cobertas pela suíte; o primeiro request de cada uma compila/renderiza a página.
WARM_ID="e2e00000-0000-4000-8000-000000008001"
WARM_ROUTES=(
  "/"
  "/v2/cotacao/cotacoes"
  "/v2/cotacao/cotacoes/detalhes/$WARM_ID"
  "/v2/cotacoes/item/9001"
  "/v2/cotacao/cotacoes/detalhes/adicionar-item/$WARM_ID"
  "/v2/cotacao/cotacoes/detalhes/editar-item/$WARM_ID/9001"
  "/v2/cotacao/cotacoes/detalhes/importar-itens/$WARM_ID"
  "/v2/cotacao/cotacoes/detalhes/$WARM_ID/ia"
  "/v2/cotacao/cotacoes/detalhes/$WARM_ID/direta"
  "/v2/cotacoes/expressa"
  "/v2/cotacoes/$WARM_ID/documentos"
  "/v2/cotacoes/$WARM_ID/selecionar-colaboradores"
  "/v2/cotacao/cotacoes/compartilhar/$WARM_ID"
  "/v2/cotacao/cotacoes/editar/$WARM_ID"
  "/v2/cotacao/cotacoes/relatorio-gerencial"
)

stop_server() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "==> Encerrando Nuxt (pid $SERVER_PID)"
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
}

start_server() {
  echo "==> Subindo Nuxt em $BASE_URL (log: $NUXT_LOG)"
  # Job control gives the background job its own process group, so stop_server
  # can kill yarn and the nuxt child together.
  set -m
  yarn --cwd "$FRONTEND_DIR" nuxt --hostname 127.0.0.1 --port "$PLAYWRIGHT_PORT" >"$NUXT_LOG" 2>&1 &
  SERVER_PID=$!
  set +m
  trap stop_server EXIT

  local waited=0
  local limit="${QA_SERVER_TIMEOUT:-300}"
  until [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE_URL/" 2>/dev/null)" != "000" ]]; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "Erro: Nuxt encerrou antes de responder. Últimas linhas do log:"
      tail -n 30 "$NUXT_LOG" || true
      exit 1
    fi
    if [[ "$waited" -ge "$limit" ]]; then
      echo "Erro: Nuxt não respondeu em ${limit}s. Veja $NUXT_LOG"
      exit 1
    fi
    sleep 3
    waited=$((waited + 3))
  done
  echo "==> Nuxt no ar após ~${waited}s"
}

warm_routes() {
  echo "==> Pré-aquecendo rotas"
  local route code
  for route in "${WARM_ROUTES[@]}"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 180 "$BASE_URL$route" 2>/dev/null || true)"
    echo "    $route -> ${code:-000}"
  done
}

if [[ "$app_up" -eq 0 ]]; then
  start_server
fi
warm_routes

if [[ "$MODE" == "server" ]]; then
  if [[ -z "$SERVER_PID" ]]; then
    echo "==> Nuxt já estava no ar em $BASE_URL — nada a subir."
    exit 0
  fi
  echo "==> Pronto. Deixe este terminal aberto e rode \`yarn qa\` / \`yarn qa:smoke\` em outro."
  echo "    Ctrl+C encerra o Nuxt."
  wait "$SERVER_PID" || true
  exit 0
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
  echo "    OK — suíte passou (resumo acima: passou / pulado / falhou)."
  echo "    Relatório HTML: yarn qa:report"
  exit 0
fi

echo "    FALHOU — leia o bloco «Resumo QA» acima (motivo + dica por teste)."
echo ""
echo "--- Falhas comuns ---"
echo "  Cannot find module 'dotenv' →  git pull / yarn install"
echo "  Executable doesn't exist  →  re-rode yarn qa (instala Chromium)"
echo "  Timeout / Loading...      →  Nuxt no ar? BASE_URL / FRONTEND_DIR ok?"
echo "  Pin diverge               →  git checkout do commit em frontend.pin"
echo "  Node errado               →  nvm use  (.nvmrc = 26)"
echo "  Testid / strict mode      →  git pull (inject) + yarn qa:report"
echo "  App não sobe              →  yarn no frontend-fp; porta 3010 livre; veja .qa-nuxt.log"
echo "  2 skipped (item-api)      →  normal sem RUN_LIVE_ITEM_API=1 (não é falha)"
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
