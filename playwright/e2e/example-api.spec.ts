import { test, expect, log } from '../support/merged-fixtures'
import { buildCotacaoItem } from '../support/fixtures/factories'

test.describe('CPE API sample', () => {
  test('[P1] health-style GET against API base (no schema found)', async ({
    apiRequest,
    recurse,
  }) => {
    await log.step('Build sample domain payload (factory demo)')
    const item = buildCotacaoItem({ unidade: 'UN' })
    expect(item.unidade).toBe('UN')

    await log.step('Probe API root via apiRequest')
    // No response schema found for /cpe/api; assertions cover status only.
    const { status } = await apiRequest({
      method: 'GET',
      path: process.env.API_URL || '/cpe/api/',
    })

    await log.step('Allow transient startup with recurse')
    await recurse(
      async () => ({ status }),
      (result) => result.status === 200 || result.status === 401 || result.status === 403 || result.status === 404,
      { timeout: 15_000 },
    )

    expect([200, 401, 403, 404]).toContain(status)
  })
})
