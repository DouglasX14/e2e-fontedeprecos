import type { Page, Route, Request } from '@playwright/test'
import {
  buildGetPricesResponse,
  buildSessionUser,
  ITEM_FIXTURE_IDS,
  type GetPricesOverrides,
} from '../fixtures/factories'
import { maybeInjectItemFormulaOptions, maybeInjectTestIds, maybeReinjectItemTestIds } from './inject-testids'

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
 * Stubs auth + Item-screen APIs so E2E runs without a live Django session.
 * Call BEFORE page.goto (network-first).
 */
export async function stubItemPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: GetPricesOverrides & {
    /** When set, get-prices returns this body instead of the factory happy path. */
    getPricesRawBody?: Record<string, unknown>
  } = {},
) {
  const { getPricesRawBody, ...factoryOverrides } = overrides
  const getPricesBody = buildGetPricesResponse(factoryOverrides)
  const itemId = getPricesBody.quotation_item.id

  const sessionCall = interceptNetworkCall({
    url: '**/api/check-session**',
    fulfillResponse: { status: 200, body: buildSessionUser() },
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
    fulfillResponse: { status: 200, body: { decimal_places: 2 } },
  })

  const justificativasCall = interceptNetworkCall({
    url: '**/api/modelos-de-justificativas-desconsiderar-precos**',
    fulfillResponse: { status: 200, body: { modelos: [] } },
  })

  // Menu.getPhotoUser toggles globalLoading; without a stub the overlay never clears.
  const photoCall = interceptNetworkCall({
    url: '**/api/config/users/photo-me**',
    fulfillResponse: { status: 200, body: { photo: null } },
  })

  if (getPricesRawBody) {
    const getPricesCall = interceptNetworkCall({
      url: `**/api/v3/cotacao-item/${itemId}/get-prices/**`,
      fulfillResponse: { status: 200, body: getPricesRawBody },
    })

    return {
      itemId,
      getPricesBody,
      sessionCall,
      permissionsCall,
      filtrosCall,
      preferencesCall,
      justificativasCall,
      photoCall,
      getPricesCall,
    }
  }

  const getPricesCall = interceptNetworkCall({
    url: `**/api/v3/cotacao-item/${itemId}/get-prices/**`,
    fulfillResponse: { status: 200, body: getPricesBody },
  })

  // Stub sibling items so prev/next navigation does not hang on live APIs.
  const relatedIds = [getPricesBody.prev_item, getPricesBody.next_item].filter(
    (id): id is number => typeof id === 'number' && id !== itemId,
  )
  for (const relatedId of relatedIds) {
    const relatedBody = buildGetPricesResponse({
      itemId: relatedId,
      itemNome: `Item vizinho ${relatedId}`,
      cotacaoId: getPricesBody.quotation_item.cotacao.id,
      prevItem: relatedId === getPricesBody.next_item ? itemId : null,
      nextItem: relatedId === getPricesBody.prev_item ? itemId : null,
    })
    interceptNetworkCall({
      url: `**/api/v3/cotacao-item/${relatedId}/get-prices/**`,
      fulfillResponse: { status: 200, body: relatedBody },
    })
  }

  return {
    itemId,
    getPricesBody,
    sessionCall,
    permissionsCall,
    filtrosCall,
    preferencesCall,
    justificativasCall,
    photoCall,
    getPricesCall,
  }
}

export async function gotoItemPage(page: Page, itemId = ITEM_FIXTURE_IDS.ITEM_ID) {
  await page.goto(`/v2/cotacoes/item/${itemId}`)
}

/** Wait until layout loading overlay is gone so clicks are not intercepted. */
export async function waitForItemPageReady(page: Page) {
  await maybeInjectTestIds(page, 'item')
  await page.getByTestId('item-kpi-total-prices').waitFor({ state: 'visible' })
  await page.locator('.tr_overlay.v-overlay--active').waitFor({ state: 'hidden' })
}

/** Click a side-tab and re-inject (tab-gated buttons/dialogs appear after switch). */
export async function clickItemTab(page: Page, tabTestId: string) {
  await page.getByTestId(tabTestId).click()
  await maybeReinjectItemTestIds(page)
}

/** Re-inject after opening a dialog / mutating price row UI. */
export async function reinjectItemTestIds(page: Page) {
  await maybeReinjectItemTestIds(page)
}

/** Open formula v-select and inject option testids when INJECT_TESTIDS=1. */
export async function openFormulaSelect(page: Page) {
  await page.getByTestId('item-formula-select').click()
  await maybeInjectItemFormulaOptions(page)
}

export { ITEM_FIXTURE_IDS }
