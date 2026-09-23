# e2e-fontedeprecos

Suíte **Playwright E2E** da cotação v2 do Fonte de Preços (Item, Detalhes, satellites).

## Para QA / suporte

Repo: https://github.com/DouglasX14/e2e-fontedeprecos · branch **`main`**

Layout de pastas (recomendado):

```
projetos/
  frontend-fp/           # app Nuxt (homolog / pin)
  e2e-fontedeprecos/     # este repo
```

1. Clone os dois lados a lado (ou use `FRONTEND_DIR` absoluto).
2. **Node 26** neste repo (`nvm use` — ver `.nvmrc`; mínimo 18).
3. Front no pin documentado (`frontend.pin` → `homolog` / commit `6abd19b`):

```bash
cd ../frontend-fp
git fetch
git checkout homolog   # ideal: git checkout 6abd19b
cd ../e2e-fontedeprecos
git checkout main && git pull
yarn qa:smoke   # rápido (P0)
# ou
yarn qa         # suíte cotação v2 completa
```

Front em outro path:

```bash
FRONTEND_DIR=/caminho/absoluto/frontend-fp yarn qa:smoke
```

4. Se falhar: o script gera `playwright-report-qa.zip` (só se houver HTML) — **envie esse zip**.  
   Abrir HTML local: `yarn qa:report`.

O script aplica `INJECT_TESTIDS=1`, porta `3010` e `--workers=1` automaticamente.  
Se o Nuxt não estiver no ar, o `qa` sobe ele uma vez (log em `.qa-nuxt.log`), pré-aquece todas as rotas da suíte e só então roda o Playwright; ao final, encerra o Nuxt.  
Run oficial (exige pin): `STRICT_FRONTEND_PIN=1 yarn qa`.

### Rodar várias vezes seguidas (mais rápido)

Deixe o Nuxt quente num terminal e reutilize em todos os runs:

```bash
# terminal 1 — sobe + pré-aquece; fica no ar (Ctrl+C encerra)
yarn qa:server

# terminal 2 — reutiliza o Nuxt já no ar (sem cold start)
yarn qa:smoke
yarn qa
```

### Falhas comuns

| Sintoma | O que fazer |
|---------|-------------|
| `Cannot find module 'dotenv'` | `git pull` + `yarn install` |
| `Executable doesn't exist` | Re-rodar `yarn qa` (instala Chromium) |
| Timeout / `Loading...` | Nuxt no ar; conferir `BASE_URL` / `FRONTEND_DIR` |
| Pin diverge | `git checkout` do commit em `frontend.pin` |
| Node errado | `nvm use` (`.nvmrc` = 26) |
| `strict mode` / testid errado | `git pull` (inject) + `yarn qa:report` |
| Testid / seletor | `INJECT_TESTIDS=1` (já default do `qa`) |
| App não sobe | `yarn` no `frontend-fp`; porta 3010 livre; ver `.qa-nuxt.log` |

---

Repo independente do app. Os testes sobem contra um checkout local do [`frontend-fp`](https://github.com/promaxima-dynamics/frontend-fp) (Nuxt).

## Pré-requisitos

- Node 18+
- Yarn
- Checkout do **frontend-fp** (com as telas/testids que a suíte cobre)
- Chromium do Playwright

```bash
yarn install
yarn test:e2e:install
cp .env.example .env
```

## Como apontar para o app

### Opção A — Nuxt já rodando

```bash
# terminal 1 (frontend-fp)
cd ../frontend-fp && yarn nuxt --hostname 127.0.0.1 --port 3010

# terminal 2 (este repo)
BASE_URL=http://127.0.0.1:3010 PLAYWRIGHT_PORT=3010 yarn test:e2e:cotacao-v2:stable
```

### Opção B — Playwright sobe o Nuxt

```bash
FRONTEND_DIR=../frontend-fp \
BASE_URL=http://127.0.0.1:3010 \
PLAYWRIGHT_PORT=3010 \
yarn test:e2e:cotacao-v2:stable
```

`FRONTEND_DIR` ativa o `webServer` no `playwright.config.ts`. Sem ele, o app **precisa** já estar em `BASE_URL`.

## Scripts

| Comando | Uso |
|---------|-----|
| `yarn qa` / `yarn qa:full` | Kit QA: install + Chromium + suíte cotação v2 (inject, workers=1) |
| `yarn qa:smoke` | Kit QA rápido (detalhes core + item v2) |
| `yarn qa:server` | Sobe o Nuxt na 3010, pré-aquece as rotas e fica no ar para os próximos `qa` |
| `yarn qa:report` | Abre o HTML report (`playwright-report/`) |
| `yarn test:e2e` | Todos os specs em `playwright/e2e/` |
| `yarn test:e2e:cotacao-v2` | Suíte `cotacao-*.spec.ts` |
| `yarn test:e2e:cotacao-v2:stable` | Idem, `--workers=1` (recomendado local) |
| `yarn test:e2e:cotacao-v2:inject` | Idem com `INJECT_TESTIDS=1` |
| `yarn test:e2e:ui` | Playwright UI mode |
| `yarn test:e2e:headed` | Browser visível |
| `yarn test:e2e:report` | Abre o HTML report |
| `yarn test:e2e:install` | Baixa Chromium |

## Specs

| Arquivo | Escopo |
|---------|--------|
| `cotacao-item-v2.spec.ts` | Item v2 — KPIs, preços, soft-delete/restore |
| `cotacao-item-api.spec.ts` | Item API live (opcional via `RUN_LIVE_ITEM_API=1`) |
| `cotacao-detalhes-v2.spec.ts` | Detalhes core P0/P1 |
| `cotacao-detalhes-v2-lotes.spec.ts` | Gestão de lotes |
| `cotacao-detalhes-v2-itens.spec.ts` | Itens, DnD, memorial, share |
| `cotacao-detalhes-v2-personalizada.spec.ts` | Personalizada / IA / capacity |
| `cotacao-detalhes-v2-navegacao.spec.ts` | Ações → satellites |
| `cotacao-satellites-v2.spec.ts` | Documentos, colaboradores, direta |
| `cotacao-flow-v2.spec.ts` | Adicionar/editar item, Expressa, lista, importar, IA, compartilhar, editar cotação, relatório gerencial |
| `example-*.spec.ts` | Exemplos de scaffold |

## Arquitetura

```
playwright/
  e2e/                 # specs
  support/
    merged-fixtures.ts # import { test, expect, log } from aqui
    auth-fixture.ts
    auth-provider.ts
    helpers/           # stubs de página
    fixtures/factories/
  global-setup.ts
  auth-sessions/       # gitignored (exceto .gitkeep)
playwright.config.ts
```

- Specs usam `merged-fixtures`, não `@playwright/test` direto.
- Network-first: `interceptNetworkCall` **antes** de `page.goto`.
- Maioria dos specs cotação v2: `authSessionEnabled: false` + stub de sessão.

## Injeção de `data-testid` (sem alterar o Dynamics)

Se o `frontend-fp` sob teste **não** tiver os `data-testid` no template, ative a injeção no DOM:

```bash
INJECT_TESTIDS=1 FRONTEND_DIR=../frontend-fp \
  BASE_URL=http://127.0.0.1:3010 PLAYWRIGHT_PORT=3010 \
  yarn test:e2e:cotacao-v2:stable
```

API (sob demanda nos specs):

```ts
import {
  injectTestIds,
  ensureTestId,
  injectDynamicDetalhesTestIds,
} from '../support/helpers/inject-testids'

await injectTestIds(page, 'detalhes') // ou 'item' | 'documentos' | ...
await ensureTestId(page, 'detalhes-acoes-menu', 'button:has-text("Ações")')
```

Helper: `playwright/support/helpers/inject-testids.ts`.  
Com `INJECT_TESTIDS=1`, os waits (`waitForDetalhesPageReady`, `waitForItemPageReady`, gotos de satellites) aplicam o registry automaticamente.

## Estabilidade

Paralelo + Nuxt frio pode gerar timeout em `Loading...` (flake de cold-start).  
Preferir `yarn test:e2e:cotacao-v2:stable` no local.

## Auth (opcional)

Só necessário se algum spec ligar `authSessionEnabled: true`:

```bash
# .env
AUTH_BASE_URL=http://127.0.0.1:8103
TEST_USER_EMAIL=you@example.com
TEST_USER_PASSWORD=secret
```

## Troubleshooting

Para QA, ver também **Falhas comuns** no topo. Em falha, `yarn qa` gera `playwright-report-qa.zip`.

| Sintoma | Ação |
|---------|------|
| `Cannot find module 'dotenv'` | `git pull` ou `yarn add -D dotenv` |
| `Executable doesn't exist` | `yarn qa` ou `yarn test:e2e:install` |
| Timeout / `Loading...` | Use `:stable` / `yarn qa`; suba o Nuxt; confira `BASE_URL` |
| `webServer` não sobe | Defina `FRONTEND_DIR` válido com `yarn` no app |
| App não encontrado | Sem `FRONTEND_DIR`, garanta Nuxt em `BASE_URL` |
| Pin diverge | Checkout do commit em `frontend.pin` (ou `STRICT_FRONTEND_PIN=1`) |

## CI

O workflow deste repo instala deps + Chromium. **Não** executa a suíte completa (depende do `frontend-fp` privado). Rode localmente com `FRONTEND_DIR` ou `BASE_URL`.

## Variáveis

Ver [`.env.example`](.env.example).
