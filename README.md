# e2e-fontedeprecos

Suíte **Playwright E2E** da cotação v2 do Fonte de Preços (Item, Detalhes, satellites).

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
| `yarn test:e2e` | Todos os specs em `playwright/e2e/` |
| `yarn test:e2e:cotacao-v2` | Suíte `cotacao-*.spec.ts` |
| `yarn test:e2e:cotacao-v2:stable` | Idem, `--workers=1` (recomendado local) |
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

| Sintoma | Ação |
|---------|------|
| `Executable doesn't exist` | `yarn test:e2e:install` |
| Timeout / `Loading...` | Use `:stable` ou suba o Nuxt antes; confira `BASE_URL` |
| `webServer` não sobe | Defina `FRONTEND_DIR` absoluto/relativo válido com `yarn` no app |
| App não encontrado | Sem `FRONTEND_DIR`, garanta Nuxt em `BASE_URL` |

## CI

O workflow deste repo instala deps + Chromium. **Não** executa a suíte completa (depende do `frontend-fp` privado). Rode localmente com `FRONTEND_DIR` ou `BASE_URL`.

## Variáveis

Ver [`.env.example`](.env.example).
