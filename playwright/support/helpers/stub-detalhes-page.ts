import type { Page, Route, Request } from '@playwright/test'
import {
  buildDetalhesSessionUser,
  buildGetItensResponse,
  buildLotesResponse,
  DETALHES_FIXTURE_IDS,
  type GetItensOverrides,
} from '../fixtures/factories/cotacao-detalhes-page'
import { maybeInjectTestIds } from './inject-testids'

type InterceptFn = (options: {
  method?: string
  url: string
  fulfillResponse?: { status?: number; body?: unknown }
  handler?: (route: Route, request: Request) => Promise<void> | void
}) => Promise<{
  status: number
  responseJson: unknown
  requestJson: unknown
}>

/**
 * Stubs auth + Detalhes-screen APIs so E2E runs without a live Django session.
 * Call BEFORE page.goto (network-first).
 */
export async function stubDetalhesPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: GetItensOverrides & {
    getItensRawBody?: Record<string, unknown>
    /** Custom handler for itens (e.g. filter by ?item=). */
    itensHandler?: (route: Route, request: Request) => Promise<void> | void
    /** Initial lotes list (default: single Lote 1). */
    lotes?: Array<{ id: number; nome: string; descricao?: string; ordem?: number }>
    /** Custom handler for GET/POST lotes (overrides default fulfill). */
    lotesHandler?: (route: Route, request: Request) => Promise<void> | void
    /** Override `/api/v3/cotacao/valid-user-ia` body. */
    validUserIaBody?: Record<string, unknown>
    /** Extra session fields (e.g. acesso_cotacao_ia). */
    sessionOverrides?: Parameters<typeof buildDetalhesSessionUser>[0]
  } = {},
) {
  const {
    getItensRawBody,
    itensHandler,
    lotes,
    lotesHandler,
    validUserIaBody,
    sessionOverrides,
    ...factoryOverrides
  } = overrides
  const getItensBody = buildGetItensResponse(factoryOverrides)
  const cotacaoId = String(getItensBody.cotacao.id)
  const lotesBody = buildLotesResponse(lotes)

  const sessionCall = interceptNetworkCall({
    url: '**/api/check-session**',
    fulfillResponse: {
      status: 200,
      body: buildDetalhesSessionUser(sessionOverrides),
    },
  })

  const permissionsCall = interceptNetworkCall({
    url: '**/api/permissions-config/**',
    fulfillResponse: {
      status: 200,
      body: { cotacoes: ['quotation.cotacoes'] },
    },
  })

  const filtrosCall = interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  const preferencesCall = interceptNetworkCall({
    url: '**/api/config/preferences**',
    fulfillResponse: {
      status: 200,
      body: { decimal_places: 2, item_formula: 2 },
    },
  })

  const photoCall = interceptNetworkCall({
    url: '**/api/config/users/photo-me**',
    fulfillResponse: { status: 200, body: { photo: null } },
  })

  const validUserCall = interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user**',
    fulfillResponse: { status: 200, body: { valid_user: true } },
  })

  const validUserIaCall = interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user-ia**',
    fulfillResponse: {
      status: 200,
      body: validUserIaBody ?? {
        valid_user: false,
        module_enabled: false,
      },
    },
  })

  const lotesCall = lotesHandler
    ? interceptNetworkCall({
        url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
        handler: lotesHandler,
      })
    : interceptNetworkCall({
        url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
        fulfillResponse: { status: 200, body: lotesBody },
      })

  const getItensCall = itensHandler
    ? interceptNetworkCall({
        url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
        handler: itensHandler,
      })
    : interceptNetworkCall({
        url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
        fulfillResponse: {
          status: 200,
          body: getItensRawBody ?? getItensBody,
        },
      })

  return {
    cotacaoId,
    getItensBody,
    lotesBody,
    sessionCall,
    permissionsCall,
    filtrosCall,
    preferencesCall,
    photoCall,
    validUserCall,
    validUserIaCall,
    lotesCall,
    getItensCall,
  }
}

export async function gotoDetalhesPage(
  page: Page,
  cotacaoId = DETALHES_FIXTURE_IDS.COTACAO_ID,
  options: { query?: Record<string, string> } = {},
) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('orderBy')
    } catch {
      /* ignore */
    }
  })
  const qs = options.query
    ? `?${new URLSearchParams(options.query).toString()}`
    : ''
  // First hit can compile the Nuxt route; allow longer than default 30s.
  await page.goto(`/v2/cotacao/cotacoes/detalhes/${cotacaoId}${qs}`, {
    timeout: 90_000,
  })
}

/** Wait until skeleton is gone and header is visible. */
export async function waitForDetalhesPageReady(page: Page) {
  await maybeInjectTestIds(page, 'detalhes')
  await page.getByTestId('detalhes-cotacao-nome').waitFor({ state: 'visible' })
  await page
    .locator('.tr_overlay.v-overlay--active')
    .waitFor({ state: 'hidden' })
}

export { DETALHES_FIXTURE_IDS }
