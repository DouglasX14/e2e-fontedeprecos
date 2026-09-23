import { test, expect, log } from '../support/merged-fixtures'
import {
  DETALHES_FIXTURE_IDS,
  buildDetalhesItem,
} from '../support/fixtures/factories'
import {
  gotoDetalhesPage,
  openLoteMenu,
  reinjectDetalhesTestIds,
  stubDetalhesPageApis,
  waitForDetalhesDialog,
  waitForDetalhesPageReady,
} from '../support/helpers/stub-detalhes-page'

test.use({ authSessionEnabled: false })

test.describe('Cotação Detalhes v2 — lotes', () => {
  test('[P2] cria um novo lote via Gestão de lotes', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes with mutable lotes list')
    const lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotesHandler: async (route, request) => {
        if (request.method() === 'POST') {
          const body = request.postDataJSON() as {
            nome?: string
            descricao?: string
          }
          const created = {
            id: 2,
            nome: body.nome || 'Lote sem nome',
            descricao: body.descricao || '',
            ordem: 2,
            detail: 'Lote criado com sucesso',
          }
          lotesState.push(created)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(created),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lotesState),
        })
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open Novo lote and submit')
    await page.getByTestId('detalhes-novo-lote-btn').click()
    await waitForDetalhesDialog(page, 'detalhes-lote-dialog')
    await page.getByTestId('detalhes-lote-nome-input').fill('Lote E2E P2')
    await page.getByTestId('detalhes-lote-criar-confirm').click()
    await reinjectDetalhesTestIds(page)

    await expect(page.getByTestId('detalhes-lote-nome-2')).toHaveText('Lote E2E P2')
    expect(lotesState.some((l) => l.nome === 'Lote E2E P2')).toBe(true)
  })

  test('[P2] exclui lote vazio', async ({ page, interceptNetworkCall }) => {
    await log.step('Stub with empty secondary lote')
    const emptyLoteId = 99
    let lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
      {
        id: emptyLoteId,
        nome: 'Lote Vazio E2E',
        descricao: '',
        ordem: 2,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: lotesState,
      lotesHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lotesState),
        })
      },
    })

    const deleteLoteCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/delete-lote/${emptyLoteId}/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Delete empty lote via menu')
    await openLoteMenu(page, emptyLoteId)
    await page.getByTestId('detalhes-lote-excluir-action').click()
    await waitForDetalhesDialog(page, 'detalhes-lote-delete-dialog')

    lotesState = lotesState.filter((l) => l.id !== emptyLoteId)
    await page.getByTestId('detalhes-lote-delete-confirm').click()

    const { status } = await deleteLoteCall
    expect(status).toBe(200)
    await expect(page.getByText('Lote Vazio E2E')).toHaveCount(0)
  })

  test('[P2] mescla dois lotes selecionados', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub two lotes for merge')
    const lote2Id = 2
    let lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
      {
        id: lote2Id,
        nome: 'Lote 2',
        descricao: '',
        ordem: 2,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: lotesState,
      lotesHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lotesState),
        })
      },
    })

    const mesclarCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/mesclar-lotes/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Lotes mesclados com sucesso' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Select both lotes and open merge dialog')
    await page.getByTestId(`detalhes-lote-select-${DETALHES_FIXTURE_IDS.LOTE_ID}`).click()
    await page.getByTestId(`detalhes-lote-select-${lote2Id}`).click()
    await reinjectDetalhesTestIds(page)
    await expect(page.getByTestId('detalhes-mesclar-lotes-btn')).toBeVisible()
    await page.getByTestId('detalhes-mesclar-lotes-btn').click()

    await waitForDetalhesDialog(page, 'detalhes-mesclar-dialog')
    await page.getByTestId('detalhes-mesclar-nome-input').fill('Lote consolidado E2E')

    lotesState = [
      {
        id: 10,
        nome: 'Lote consolidado E2E',
        descricao: '',
        ordem: 1,
      },
    ]
    await page.getByTestId('detalhes-mesclar-confirm').click()

    const { status, requestJson } = await mesclarCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      lotes: [DETALHES_FIXTURE_IDS.LOTE_ID, lote2Id],
      nome: 'Lote consolidado E2E',
    })
  })

  test('[P2] move item selecionado para outro lote', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub two lotes + item in lote 1')
    const lote2Id = 2
    const lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
      {
        id: lote2Id,
        nome: 'Lote Destino E2E',
        descricao: '',
        ordem: 2,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: lotesState,
      itens: [
        buildDetalhesItem({
          id: DETALHES_FIXTURE_IDS.ITEM_ID,
          lote: DETALHES_FIXTURE_IDS.LOTE_ID,
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

    await log.step('Select item, choose destination lote, move')
    await page
      .getByTestId(`detalhes-item-select-${DETALHES_FIXTURE_IDS.ITEM_ID}`)
      .click()
    await reinjectDetalhesTestIds(page)
    await expect(page.getByTestId('detalhes-mover-itens-btn')).toBeVisible()

    await page.getByTestId('detalhes-mover-lote-select').click()
    await reinjectDetalhesTestIds(page)
    await page.getByTestId('detalhes-mover-lote-option-2').click()
    await page.getByTestId('detalhes-mover-itens-btn').click()

    const { status, requestJson } = await moverCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      itens: [DETALHES_FIXTURE_IDS.ITEM_ID],
      lote: lote2Id,
    })
  })

  test('[P2] duplica lotes para nova cotação', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + duplicar-lotes')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)

    const duplicarCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/duplicar-lotes/**`,
      fulfillResponse: {
        status: 200,
        // Omit id to avoid client navigate; assert API payload only.
        body: { detail: 'Nova cotação criada com sucesso' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open duplicar-lotes dialog, select lote, confirm')
    await page.getByTestId('detalhes-duplicar-lotes-btn').click()
    await waitForDetalhesDialog(page, 'detalhes-duplicar-lotes-dialog')
    await reinjectDetalhesTestIds(page)
    await page
      .getByTestId(`detalhes-duplicar-lote-option-${DETALHES_FIXTURE_IDS.LOTE_ID}`)
      .click()
    await page
      .getByTestId('detalhes-duplicar-lotes-nome-input')
      .fill('Cotação E2E duplicada')
    await page
      .getByTestId('detalhes-duplicar-lotes-copiar-precos')
      .getByText('Copiar preços dos itens')
      .click()
    await page.getByTestId('detalhes-duplicar-lotes-confirm').click()

    const { status, requestJson } = await duplicarCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      lotes: [DETALHES_FIXTURE_IDS.LOTE_ID],
      nome: 'Cotação E2E duplicada',
      with_prices: true,
    })
  })

  test('[P2] cria lote com itens selecionados', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + lotes-com-itens')
    const itemA = DETALHES_FIXTURE_IDS.ITEM_ID
    const itemB = 9003
    const lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: lotesState,
      itens: [
        buildDetalhesItem({ id: itemA, nome: 'Item Com Lote A' }),
        buildDetalhesItem({
          id: itemB,
          nome: 'Item Com Lote B',
          position: 2,
          ordem: 2,
        }),
      ],
      lotesHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lotesState),
        })
      },
    })

    const createComItensCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/lotes-com-itens/**`,
      fulfillResponse: {
        status: 200,
        body: {
          id: 5,
          nome: 'Lote Com Itens E2E',
          detail: 'Lote criado com itens com sucesso',
        },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Select items, open Com itens, create lote')
    await page.getByTestId(`detalhes-item-select-${itemA}`).click()
    await page.getByTestId(`detalhes-item-select-${itemB}`).click()
    await reinjectDetalhesTestIds(page)
    await expect(page.getByTestId('detalhes-lote-com-itens-btn')).toBeEnabled()
    await page.getByTestId('detalhes-lote-com-itens-btn').click()

    await waitForDetalhesDialog(page, 'detalhes-lote-dialog')
    await expect(page.getByTestId('detalhes-lote-com-itens-alert')).toContainText(
      '2 item(ns)',
    )
    await page.getByTestId('detalhes-lote-nome-input').fill('Lote Com Itens E2E')

    lotesState.push({
      id: 5,
      nome: 'Lote Com Itens E2E',
      descricao: '',
      ordem: 2,
    })
    await page.getByTestId('detalhes-lote-criar-confirm').click()
    await reinjectDetalhesTestIds(page)

    const { status, requestJson } = await createComItensCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      nome: 'Lote Com Itens E2E',
    })
    expect(requestJson.itens).toEqual(expect.arrayContaining([itemA, itemB]))
    expect(requestJson.itens).toHaveLength(2)
    await expect(page.getByTestId('detalhes-lote-nome-5')).toHaveText(
      'Lote Com Itens E2E',
    )
  })

  test('[P2] edita lote inline pela Gestão de lotes', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub mutable lotes for inline rename')
    const lotesState = [
      {
        id: DETALHES_FIXTURE_IDS.LOTE_ID,
        nome: 'Lote 1',
        descricao: '',
        ordem: 1,
      },
    ]

    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      lotes: lotesState,
      lotesHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lotesState),
        })
      },
    })

    const updateLoteCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/update-lote/${DETALHES_FIXTURE_IDS.LOTE_ID}/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Edit lote name inline and save')
    await openLoteMenu(page, DETALHES_FIXTURE_IDS.LOTE_ID)
    await page.getByTestId('detalhes-lote-editar-action').click()
    await reinjectDetalhesTestIds(page)
    await page.getByTestId('detalhes-lote-inline-nome').fill('Lote Renomeado E2E')

    lotesState[0] = {
      ...lotesState[0],
      nome: 'Lote Renomeado E2E',
    }
    await page.getByTestId('detalhes-lote-salvar-inline').click()
    await reinjectDetalhesTestIds(page)

    const { status, requestJson } = await updateLoteCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      nome: 'Lote Renomeado E2E',
    })
    await expect(
      page.getByTestId(`detalhes-lote-nome-${DETALHES_FIXTURE_IDS.LOTE_ID}`),
    ).toHaveText('Lote Renomeado E2E')
  })
})
