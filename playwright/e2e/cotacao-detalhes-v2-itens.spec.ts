import { test, expect, log } from '../support/merged-fixtures'
import {
  DETALHES_FIXTURE_IDS,
  buildDetalhesItem,
} from '../support/fixtures/factories'
import {
  gotoDetalhesPage,
  stubDetalhesPageApis,
  waitForDetalhesPageReady,
} from '../support/helpers/stub-detalhes-page'

test.use({ authSessionEnabled: false })

test.describe('Cotação Detalhes v2 — itens / ordenação', () => {
  test('[P2] soft-delete individual de item via ações da linha', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes and delete-with-items')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)

    const deleteItemsCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/delete-with-items/**`,
      fulfillResponse: {
        status: 200,
        body: { details: 'Itens removidos com sucesso' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Delete item from row actions')
    await page.getByTestId('detalhes-item-delete-btn').click()
    await expect(page.getByTestId('detalhes-delete-items-dialog')).toBeVisible()
    await page.getByTestId('detalhes-delete-items-confirm').click()

    const { status, requestJson } = await deleteItemsCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      itens: [DETALHES_FIXTURE_IDS.ITEM_ID],
    })
  })

  test('[P2] gera memorial de cálculo (PDF)', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + memorial PDF')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)

    const memorialCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/memorial/**`,
      handler: async (route, request) => {
        expect(request.postDataJSON()).toMatchObject({ type: 'PDF' })
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="memorial_e2e.pdf"',
          },
          body: Buffer.from('%PDF-1.4 e2e memorial'),
        })
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await page.getByTestId('detalhes-memorial-btn').click()

    const { status } = await memorialCall
    expect(status).toBe(200)
  })

  test('[P2] duplica item individual via ações da linha', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + duplicate-items')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)

    const duplicateCall = interceptNetworkCall({
      method: 'POST',
      url: '**/api/v3/cotacao-item/duplicate-items/**',
      fulfillResponse: {
        status: 200,
        body: { details: 'Item duplicado com sucesso.' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open duplicate dialog and confirm')
    await page.getByTestId('detalhes-item-duplicate-btn').click()
    await expect(page.getByTestId('detalhes-duplicate-dialog')).toBeVisible()
    await page.getByTestId('detalhes-duplicate-confirm').click()

    const { status, requestJson } = await duplicateCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      items: [DETALHES_FIXTURE_IDS.ITEM_ID],
      with_prices: true,
    })
  })

  test('[P2] reordena itens por drag-and-drop no modo Personalizado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub two items in same lote for custom order')
    const itemA = DETALHES_FIXTURE_IDS.ITEM_ID
    const itemB = 9003
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      itens: [
        buildDetalhesItem({
          id: itemA,
          nome: 'Item A E2E',
          position: 1,
          ordem: 1,
        }),
        buildDetalhesItem({
          id: itemB,
          nome: 'Item B E2E',
          position: 2,
          ordem: 2,
        }),
      ],
    })

    const orderCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/order-items/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Switch to Personalizado and drag Item A onto Item B')
    await page.getByTestId('detalhes-ordenar-select').click()
    await page.getByTestId('detalhes-ordenar-option-custom').click()

    const source = page.getByTestId(`detalhes-item-row-${itemA}`)
    const target = page.getByTestId(`detalhes-item-row-${itemB}`)
    await expect(source).toBeVisible()
    await expect(target).toBeVisible()

    // HTML5 DnD: Playwright mouse drag is unreliable; dispatch events Vue listens to.
    await page.evaluate(
      ({ sourceTestId, targetTestId }) => {
        const src = document.querySelector(
          `[data-testid="${sourceTestId}"]`,
        ) as HTMLElement | null
        const dst = document.querySelector(
          `[data-testid="${targetTestId}"]`,
        ) as HTMLElement | null
        if (!src || !dst) throw new Error('DnD rows not found')
        const dt = new DataTransfer()
        src.dispatchEvent(
          new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }),
        )
        dst.dispatchEvent(
          new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }),
        )
        dst.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
        )
      },
      {
        sourceTestId: `detalhes-item-row-${itemA}`,
        targetTestId: `detalhes-item-row-${itemB}`,
      },
    )

    const { status, requestJson } = await orderCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      order_by: 'ordem',
      new_order: [
        { item: itemB, order: 0 },
        { item: itemA, order: 1 },
      ],
    })
  })

  test('[P2] restaura ordenação padrão no modo Personalizado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub two items and restore default order')
    const itemLowId = DETALHES_FIXTURE_IDS.ITEM_ID
    const itemHighId = 9003
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      itens: [
        buildDetalhesItem({
          id: itemHighId,
          nome: 'Item Z E2E',
          position: 1,
          ordem: 1,
        }),
        buildDetalhesItem({
          id: itemLowId,
          nome: 'Item A E2E',
          position: 2,
          ordem: 2,
        }),
      ],
    })

    const orderCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/order-items/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Enable Personalizado and click restore')
    await page.getByTestId('detalhes-ordenar-select').click()
    await page.getByTestId('detalhes-ordenar-option-custom').click()

    await expect(page.getByTestId('detalhes-restaurar-ordem-btn')).toBeVisible()
    await page.getByTestId('detalhes-restaurar-ordem-btn').click()

    const { status, requestJson } = await orderCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      order_by: 'ordem',
      new_order: [
        { item: itemLowId, order: 0 },
        { item: itemHighId, order: 1 },
      ],
    })
  })

  test('[P2] move múltiplos itens selecionados por DnD para outro lote', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub two lotes + two items in lote 1')
    const lote2Id = 2
    const itemA = DETALHES_FIXTURE_IDS.ITEM_ID
    const itemB = 9003
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: [
        {
          id: DETALHES_FIXTURE_IDS.LOTE_ID,
          nome: 'Lote 1',
          descricao: '',
          ordem: 1,
        },
        {
          id: lote2Id,
          nome: 'Lote Destino Multi',
          descricao: '',
          ordem: 2,
        },
      ],
      itens: [
        buildDetalhesItem({
          id: itemA,
          nome: 'Item Multi A',
          lote: DETALHES_FIXTURE_IDS.LOTE_ID,
          position: 1,
          ordem: 1,
        }),
        buildDetalhesItem({
          id: itemB,
          nome: 'Item Multi B',
          lote: DETALHES_FIXTURE_IDS.LOTE_ID,
          position: 2,
          ordem: 2,
        }),
      ],
    })

    const moverCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/mover-itens/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Enable Personalizado, select both items, drop on lote 2')
    await page.getByTestId('detalhes-ordenar-select').click()
    await page.getByTestId('detalhes-ordenar-option-custom').click()

    await page.getByTestId(`detalhes-item-select-${itemA}`).click()
    await page.getByTestId(`detalhes-item-select-${itemB}`).click()

    await page.evaluate(
      ({ sourceTestId, targetTestId }) => {
        const src = document.querySelector(
          `[data-testid="${sourceTestId}"]`,
        ) as HTMLElement | null
        const dst = document.querySelector(
          `[data-testid="${targetTestId}"]`,
        ) as HTMLElement | null
        if (!src || !dst) throw new Error('Multi DnD rows not found')
        const dt = new DataTransfer()
        src.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        )
        dst.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        )
        dst.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        )
      },
      {
        sourceTestId: `detalhes-item-row-${itemA}`,
        targetTestId: `detalhes-lote-row-${lote2Id}`,
      },
    )

    const { status, requestJson } = await moverCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      lote: lote2Id,
    })
    expect(requestJson.itens).toEqual(expect.arrayContaining([itemA, itemB]))
    expect(requestJson.itens).toHaveLength(2)
  })

  test('[P2] compartilha item para outra cotação', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + cotações destino + share-item')
    const destCotacaoId = 'e2e00000-0000-4000-8000-000000008099'
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)

    interceptNetworkCall({
      url: '**/api/v3/cotacao?**',
      fulfillResponse: {
        status: 200,
        body: [
          {
            id: stubs.cotacaoId,
            nome: 'Cotação origem',
            codigo: 'ORIG-1',
            descricao: 'Atual',
          },
          {
            id: destCotacaoId,
            nome: 'Cotação Destino E2E',
            codigo: 'DEST-99',
            descricao: 'Destino para share',
          },
        ],
      },
    })

    const shareCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${DETALHES_FIXTURE_IDS.ITEM_ID}/share-item/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Item compartilhado com sucesso' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open share dialog, select destination, confirm')
    await page.getByTestId('detalhes-item-share-btn').click()
    await expect(page.getByTestId('detalhes-share-dialog')).toBeVisible()
    await page.getByTestId(`detalhes-share-quotation-${destCotacaoId}`).click()
    await page.getByTestId('detalhes-share-confirm').click()

    const { status, requestJson } = await shareCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      item: expect.objectContaining({ id: DETALHES_FIXTURE_IDS.ITEM_ID }),
      withPrices: true,
      quotations: [destCotacaoId],
    })
  })
})
