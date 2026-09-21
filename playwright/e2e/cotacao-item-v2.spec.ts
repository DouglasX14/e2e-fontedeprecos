import { test, expect, log } from '../support/merged-fixtures'
import {
  FORMULA_MEDIA_ARITMETICA,
  FORMULA_MEDIANA,
  ITEM_FIXTURE_IDS,
  buildPrice,
  buildPriceHistoryResponse,
} from '../support/fixtures/factories'
import {
  clickItemTab,
  gotoItemPage,
  openFormulaSelect,
  reinjectItemTestIds,
  stubItemPageApis,
  waitForItemPageReady,
} from '../support/helpers/stub-item-page'

// Item v2 E2E stubs /api/check-session; real Django login is not wired yet.
test.use({ authSessionEnabled: false })

test.describe('Cotação Item v2 — /v2/cotacoes/item/:id', () => {
  test('[P0] carrega KPIs do item na tela', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub auth + get-prices before navigation')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      itemNome: 'Parafuso hexagonal M6',
      totalPrices: 2,
      pricesMean: 15,
    })

    await log.step('Open Item v2 screen')
    await gotoItemPage(page, stubs.itemId)

    await log.step('Wait for get-prices and assert KPIs')
    const { status, responseJson } = await stubs.getPricesCall
    expect(status).toBe(200)
    expect(
      (responseJson as { quotation_item: { nome: string } } | null)?.quotation_item
        ?.nome ?? stubs.getPricesBody.quotation_item.nome,
    ).toBe('Parafuso hexagonal M6')

    await waitForItemPageReady(page)
    await expect(page.getByTestId('item-kpi-total-prices')).toHaveText('2')
    await expect(page.getByTestId('item-kpi-prices-mean')).toBeVisible()
    await expect(page.getByText('Qnt. Preços')).toBeVisible()
    await expect(page.getByText('Média dos Preços')).toBeVisible()
    await expect(page.getByText('Mediana dos Preços')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Parafuso hexagonal M6/ }),
    ).toBeVisible()
  })

  test('[P0] altera fórmula para mediana e persiste a escolha', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page APIs and set-formula')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      formulaCalculo: FORMULA_MEDIA_ARITMETICA,
    })

    const setFormulaCall = interceptNetworkCall({
      method: 'POST',
      url: '**/api/v3/cotacao-item/set-formula/**',
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await log.step('Select Mediana formula')
    await openFormulaSelect(page)
    await page.getByTestId(`item-formula-option-${FORMULA_MEDIANA}`).click()

    await log.step('Assert set-formula payload')
    const { status, requestJson } = await setFormulaCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      item_id: stubs.itemId,
      formula_calculo: FORMULA_MEDIANA,
    })
  })

  test('[P0] exclusão em massa na aba Preços Excluídos', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page with one excluded price')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      includeExcludedPrice: true,
    })

    const deletePriceCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${stubs.itemId}/delete-price/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await log.step('Open Preços Excluídos tab and confirm bulk delete')
    await clickItemTab(page, 'item-tab-precos-excluidos')
    await page.getByTestId('item-delete-all-btn').click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await reinjectItemTestIds(page)
    await expect(page.getByTestId('item-delete-all-dialog')).toBeVisible()
    await expect(
      page.getByText(/preço.*removido|preços serão removidos/i),
    ).toBeVisible()
    await page.getByTestId('item-delete-all-confirm').click()

    await log.step('Assert delete-price was called for excluded price')
    const { status, requestJson } = await deletePriceCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      id: ITEM_FIXTURE_IDS.EXCLUDED_PRICE_REF_ID,
      base: 'dominioamplo',
    })
  })

  test('[P0] mostra histórico de alterações do item', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page + price-history')
    const stubs = await stubItemPageApis(interceptNetworkCall)

    const historyBody = buildPriceHistoryResponse([
      {
        id: 1,
        action: 'item_formula_updated',
        action_label: 'Fórmula atualizada',
        user_name: 'E2E Tester',
        created_at: '2026-09-18T12:00:00Z',
        price_object_id: null,
        metadata: { formula_calculo: FORMULA_MEDIANA },
      },
    ])

    const historyCall = interceptNetworkCall({
      url: `**/api/v3/cotacao-item/${stubs.itemId}/price-history/**`,
      fulfillResponse: {
        status: 200,
        body: historyBody,
      },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await log.step('Open Histórico de Alterações')
    await clickItemTab(page, 'item-tab-historico')

    const { status, responseJson } = await historyCall
    expect(status).toBe(200)
    expect((responseJson as { results: unknown[] }).results).toHaveLength(1)
    await expect(page.getByText('Linha do tempo de alterações')).toBeVisible()
    await expect(page.getByText('Fórmula atualizada')).toBeVisible()
  })

  test('[P1] exibe falha de servidor quando o item não é encontrado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub session + failing get-prices body')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      getPricesRawBody: { detail: 'quotationItem not found' },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall

    await expect(
      page.getByText('Falha no Servidor!! Entre em contato com o suporte.'),
    ).toBeVisible()
  })

  test('[P1] considera preço no cálculo via toggle usar_no_calculo', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page with price excluded from calculation')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      prices: [
        buildPrice({
          id: ITEM_FIXTURE_IDS.ACTIVE_PRICE_ID,
          base: 'comprasnet',
          descricao: 'Caneta Azul Homologada',
          valor_unitario: '10,00',
          usar_no_calculo: false,
        }),
      ],
    })

    const changeCalculateCall = interceptNetworkCall({
      method: 'POST',
      url: '**/api/v3/cotacao-item/change-price-calculate/**',
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await log.step('Toggle OFF→ON skips justificativa modal')
    await page.getByTestId('item-price-toggle-calculate').click()

    const { status, requestJson } = await changeCalculateCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      id: ITEM_FIXTURE_IDS.ACTIVE_PRICE_ID,
      base: 'comprasnet',
      state: true,
    })
  })

  test('[P1] navega para incluir novos preços pela CTA', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub item page and click Incluir')
    const stubs = await stubItemPageApis(interceptNetworkCall)
    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await page.getByTestId('item-add-price-btn').click()

    await expect(page).toHaveURL(
      new RegExp(
        `/v2/cotacoes/expressa\\?quotation=${ITEM_FIXTURE_IDS.COTACAO_ID}&quotation_item=${stubs.itemId}`,
      ),
    )
  })

  test('[P1] soft-delete individual e restore de preço excluído', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page with active + excluded prices')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      includeExcludedPrice: true,
    })

    const deletePriceCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${stubs.itemId}/delete-price/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    const restorePriceCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${stubs.itemId}/restore-price/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await log.step('Soft-delete active price')
    await page.getByTestId('item-price-delete-btn').first().click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await reinjectItemTestIds(page)
    await expect(page.getByTestId('item-price-delete-dialog')).toBeVisible()
    await page.getByTestId('item-price-delete-confirm').click()

    const deleteResult = await deletePriceCall
    expect(deleteResult.status).toBe(200)
    expect(deleteResult.requestJson).toMatchObject({
      id: ITEM_FIXTURE_IDS.ACTIVE_PRICE_ID,
      base: 'comprasnet',
    })

    await log.step('Restore excluded price from Preços Excluídos')
    await clickItemTab(page, 'item-tab-precos-excluidos')
    await page.getByTestId('item-price-restore-btn').click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await reinjectItemTestIds(page)
    await expect(page.getByTestId('item-price-restore-dialog')).toBeVisible()
    await page.getByTestId('item-price-restore-confirm').click()

    const restoreResult = await restorePriceCall
    expect(restoreResult.status).toBe(200)
    expect(restoreResult.requestJson).toMatchObject({
      id: ITEM_FIXTURE_IDS.EXCLUDED_SITE_PRICE_ID,
      base: 'dominioamplo',
    })
  })

  test('[P2] exibe gráfico comparativo na aba dedicada', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub page and open Gráfico Comparativo')
    const stubs = await stubItemPageApis(interceptNetworkCall)
    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await clickItemTab(page, 'item-tab-grafico-comparativo')
    await expect(page.getByTestId('item-chart-panel')).toBeVisible()
  })

  test('[P2] navega para o próximo item via Detalhes', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub current + next item get-prices')
    const stubs = await stubItemPageApis(interceptNetworkCall, {
      nextItem: ITEM_FIXTURE_IDS.NEXT_ITEM_ID,
      prevItem: ITEM_FIXTURE_IDS.PREV_ITEM_ID,
    })

    await gotoItemPage(page, stubs.itemId)
    await stubs.getPricesCall
    await waitForItemPageReady(page)

    await expect(page.getByTestId('item-nav-next')).toBeEnabled()
    await page.getByTestId('item-nav-next').click()

    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacoes/item/${ITEM_FIXTURE_IDS.NEXT_ITEM_ID}`),
    )
    await expect(
      page.getByRole('heading', { name: /Item vizinho 9002/ }),
    ).toBeVisible()
  })
})
