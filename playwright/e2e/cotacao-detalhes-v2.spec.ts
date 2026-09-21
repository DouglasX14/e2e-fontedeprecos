import { test, expect, log } from '../support/merged-fixtures'
import {
  DETALHES_FIXTURE_IDS,
  buildDetalhesItem,
  buildGetItensResponse,
} from '../support/fixtures/factories'
import {
  gotoDetalhesPage,
  openAcoesMenu,
  stubDetalhesPageApis,
  waitForDetalhesPageReady,
} from '../support/helpers/stub-detalhes-page'
import { stubItemPageApis } from '../support/helpers/stub-item-page'

test.use({ authSessionEnabled: false })

test.describe('Cotação Detalhes v2 — core (P0/P1)', () => {
  test('[P0] carrega cabeçalho e itens da cotação', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub auth + itens before navigation')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      cotacaoNome: 'Cotação E2E Parte 02',
    })

    await log.step('Open Detalhes v2')
    await gotoDetalhesPage(page, stubs.cotacaoId)

    await log.step('Wait for itens and assert header')
    const { status } = await stubs.getItensCall
    expect(status).toBe(200)

    await waitForDetalhesPageReady(page)
    await expect(page.getByTestId('detalhes-cotacao-nome')).toHaveText(
      'Cotação E2E Parte 02',
    )
    await expect(page.getByTestId('detalhes-valor-total')).toBeVisible()
    await expect(page.getByTestId('detalhes-item-link')).toContainText(
      'Caneta Esferográfica Azul',
    )
    await expect(page.getByTestId('detalhes-lote-tag')).toHaveText('LOTE')
  })

  test('[P0] filtra itens pelo nome via query item=', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes with filter-aware itens handler')
    const allItens = [
      buildDetalhesItem({
        id: DETALHES_FIXTURE_IDS.ITEM_ID,
        nome: 'Caneta Esferográfica Azul',
      }),
      buildDetalhesItem({
        id: 9003,
        nome: 'Parafuso hexagonal M6',
        position: 2,
        ordem: 2,
      }),
    ]

    let filterHits = 0
    const getItensBody = buildGetItensResponse({ itens: allItens })
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      itens: allItens,
      itensHandler: async (route, request) => {
        filterHits += 1
        const url = new URL(request.url())
        const itemFilter = url.searchParams.get('item') || ''
        const itens = itemFilter
          ? allItens.filter((i) =>
              i.nome.toLowerCase().includes(itemFilter.toLowerCase()),
            )
          : allItens
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...getItensBody, itens }),
        })
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Filter by Parafuso')
    await page.getByTestId('detalhes-filtro-item').fill('Parafuso')
    await page.getByTestId('detalhes-filtro-buscar').click()

    await expect.poll(() => filterHits).toBeGreaterThanOrEqual(2)
    // Vue re-renders the table — re-inject testids lost on DOM replace
    await waitForDetalhesPageReady(page)
    await expect(page.getByTestId('detalhes-item-link')).toHaveCount(1)
    await expect(page.getByTestId('detalhes-item-link')).toContainText(
      'Parafuso hexagonal M6',
    )
  })

  test('[P0] navega do item para a tela Item v2', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes + item page')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)
    await stubItemPageApis(interceptNetworkCall, {
      itemId: DETALHES_FIXTURE_IDS.ITEM_ID,
      itemNome: 'Caneta Esferográfica Azul',
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Click item name link')
    await page.getByTestId('detalhes-item-link').click()

    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacoes/item/${DETALHES_FIXTURE_IDS.ITEM_ID}`),
    )
    await expect(
      page.getByRole('heading', { name: /Caneta Esferográfica Azul/ }),
    ).toBeVisible()
  })

  test('[P0] abre Ações → Novo item', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes and open Novo item')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)
    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await openAcoesMenu(page)
    const novoItem = page.getByTestId('detalhes-acao-novo-item')
    await expect(novoItem).toBeVisible()
    await Promise.all([
      page.waitForURL(
        new RegExp(
          `/v2/cotacao/cotacoes/detalhes/adicionar-item/${stubs.cotacaoId}`,
        ),
      ),
      novoItem.click(),
    ])
  })

  test('[P1] exibe falha de servidor quando itens não carrega', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub session + failing itens body')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      getItensRawBody: { detail: 'Not found' },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall

    await expect(
      page.getByText('Falha no Servidor!! Entre em contato com o suporte.'),
    ).toBeVisible()
  })

  test('[P1] Gerar relatório abre diálogo quando faltam preços', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes with incomplete price counts')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      governmentPrices: 1,
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await page.getByTestId('detalhes-gerar-relatorio-btn').click()
    await expect(
      page.getByText('Deseja prosseguir para o relatório?'),
    ).toBeVisible()
  })
})
