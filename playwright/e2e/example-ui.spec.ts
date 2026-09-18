import { test, expect, log } from '../support/merged-fixtures'

test.describe('Home UI smoke', () => {
  test('[P0] loads the landing shell with network-first intercept', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Declare API intercept before navigation')
    const healthCall = interceptNetworkCall({
      url: '**/cpe/api/**',
    })

    await log.step('Navigate to app root')
    await page.goto('/')

    await log.step('Assert document title contains product brand')
    await expect(page).toHaveTitle(/Fonte de Preços/i)

    // Optional: observe first API traffic if the page triggers it
    void healthCall
  })
})
