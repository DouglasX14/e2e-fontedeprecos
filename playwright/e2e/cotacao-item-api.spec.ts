/**
 * API-level checks for Cotação Item endpoints.
 * Live calls require Django session via AuthProvider (AUTH_BASE_URL + credentials).
 * Prefer the E2E suite (`cotacao-item-v2.spec.ts`) for CI without live backend;
 * these tests run only when RUN_LIVE_ITEM_API=1.
 */
import { test, expect, log } from '../support/merged-fixtures'
import { ITEM_FIXTURE_IDS } from '../support/fixtures/factories'

const live = process.env.RUN_LIVE_ITEM_API === '1'
const itemId = process.env.TEST_ITEM_ID || ITEM_FIXTURE_IDS.ITEM_ID
const apiBase =
  process.env.AUTH_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://127.0.0.1:8103'

type GetPricesBody = {
  quotation_item?: { id?: number | string; nome?: string }
  total_prices?: unknown
  prices_mean?: unknown
  prices?: unknown
}

type PriceHistoryBody = {
  results?: unknown
}

test.describe('Cotação Item API — live (optional)', () => {
  test.skip(
    !live,
    'API live desligada: este spec chama o Django de verdade. ' +
      'Para rodar: RUN_LIVE_ITEM_API=1 TEST_ITEM_ID=<id> AUTH_BASE_URL=<django> ' +
      'com sessão válida. No dia a dia use cotacao-item-v2.spec.ts (stubs, sem backend).',
  )
  // AuthProvider.manageAuthToken → Django /login (still skipped in CI by default)
  test.use({ authSessionEnabled: true })

  test('[P0] retorna item, totais e média ao carregar preços', async ({
    apiRequest,
    authToken,
  }) => {
    await log.step('GET get-prices for known item (authenticated)')
    const { status, body } = await apiRequest({
      method: 'GET',
      path: `/api/v3/cotacao-item/${itemId}/get-prices/`,
      configBaseUrl: apiBase,
      headers: {
        Cookie: `sessionid=${authToken}`,
      },
    })

    expect(status).toBe(200)

    const payload = body as GetPricesBody
    expect(payload.quotation_item).toEqual(
      expect.objectContaining({
        id: expect.anything(),
        nome: expect.any(String),
      }),
    )
    expect(typeof payload.total_prices).toBe('number')
    expect(payload.total_prices).toBeGreaterThanOrEqual(0)
    expect(typeof payload.prices_mean).toBe('number')
    expect(Array.isArray(payload.prices)).toBe(true)
  })

  test('[P1] retorna eventos tipados no histórico de preços', async ({
    apiRequest,
    authToken,
  }) => {
    await log.step('GET price-history (authenticated)')
    const { status, body } = await apiRequest({
      method: 'GET',
      path: `/api/v3/cotacao-item/${itemId}/price-history/`,
      configBaseUrl: apiBase,
      headers: {
        Cookie: `sessionid=${authToken}`,
      },
    })

    expect(status).toBe(200)

    const payload = body as PriceHistoryBody
    expect(Array.isArray(payload.results)).toBe(true)

    const results = payload.results as Array<Record<string, unknown>>
    for (const event of results) {
      expect(event).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          action: expect.any(String),
          created_at: expect.any(String),
        }),
      )
    }
  })
})
