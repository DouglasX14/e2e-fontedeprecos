#!/usr/bin/env bash
# Abre o último HTML report (ou pasta passada como argumento).
# Nome padrão: DDMMAA-{tipo}-report  ex.: 230926-qa-report
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" != "" ]]; then
  REPORT="$1"
elif [[ -f "$ROOT/.qa-last-report" ]]; then
  REPORT="$(tr -d '[:space:]' <"$ROOT/.qa-last-report")"
else
  # fallback: pasta mais recente no padrão
  REPORT="$(ls -1d [0-9][0-9][0-9][0-9][0-9][0-9]-*-report 2>/dev/null | tail -1 || true)"
fi

if [[ -z "${REPORT:-}" ]] || [[ ! -f "$ROOT/$REPORT/index.html" && ! -f "$REPORT/index.html" ]]; then
  echo "Nenhum report encontrado."
  echo "  Rode yarn qa / yarn qa:smoke primeiro."
  echo "  Ou: yarn qa:report 230926-qa-report"
  exit 1
fi

echo "==> Abrindo report: $REPORT"
exec yarn playwright show-report "$REPORT"
