import { test, expect, log } from '../support/merged-fixtures'
import {
  gotoAdicionarItemPage,
  gotoExpressaPage,
  gotoListaCotacoesPage,
  stubAdicionarItemPageApis,
  stubExpressaPageApis,
  stubListaCotacoesPageApis,
} from '../support/helpers/stub-flow-pages'
import { maybeInjectTestIds } from '../support/helpers/inject-testids'

test.use({ authSessionEnabled: false })

test.describe('Adicionar item — /v2/cotacao/cotacoes/detalhes/adicionar-item/:id', () => {
  test('[P0] preenche formulário e adiciona item', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub adicionar-item APIs')
    const stubs = await stubAdicionarItemPageApis(interceptNetworkCall)

    const addItemCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${stubs.cotacaoId}/add-item/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Item adicionado com sucesso.' },
      },
    })

    // Detalhes after redirect (FormCotacaoItem pushes back here)
    interceptNetworkCall({
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/itens**`,
      fulfillResponse: {
        status: 200,
        body: {
          cotacao: { id: stubs.cotacaoId, nome: stubs.cotacaoNome },
          itens: [],
          lotes: [],
        },
      },
    })

    await gotoAdicionarItemPage(page, stubs.cotacaoId)
    await stubs.getCotacaoCall

    await log.step('Assert form and submit')
    await expect(page.getByTestId('adicionar-item-page')).toBeVisible()
    await expect(page.getByTestId('adicionar-item-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )

    await page.getByTestId('adicionar-item-nome').fill('Item E2E Novo')
    await page.getByTestId('adicionar-item-quantidade').fill('5')
    await page.getByTestId('adicionar-item-submit').click()

    const { status } = await addItemCall
    expect(status).toBe(200)

    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })
})

test.describe('Expressa — /v2/cotacoes/expressa', () => {
  test('[P0] carrega item da cotação e busca preços', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub expressa page APIs')
    const stubs = await stubExpressaPageApis(interceptNetworkCall)

    await gotoExpressaPage(page, {
      cotacaoId: stubs.cotacaoId,
      itemId: stubs.itemId,
    })
    await stubs.getItemCall

    await log.step('Assert item header on Expressa')
    await expect(page.getByTestId('expressa-page')).toBeVisible()
    await expect(page.getByTestId('expressa-item-nome')).toContainText(
      stubs.itemNome,
      { timeout: 30_000 },
    )
    await expect(
      page.getByTestId('expressa-item-nome').getByText(stubs.cotacaoNome),
    ).toBeVisible()

    await log.step('Search by keyword')
    await maybeInjectTestIds(page, 'expressa')
    await page.getByTestId('expressa-keyword').fill('caneta')
    await page.getByTestId('expressa-buscar-btn').click()

    await stubs.searchCall
    await maybeInjectTestIds(page, 'expressa')
    await expect(page.getByTestId('expressa-results')).toContainText(
      'Foram encontrados',
    )
    // CustomHeader shows descricao_limit_15 when present
    await expect(page.getByText(/Caneta Azul/)).toBeVisible()
    await expect(page.getByText(/itens homologados/i)).toBeVisible()
  })
})

test.describe('Lista de cotações — /v2/cotacao/cotacoes', () => {
  test('[P0] lista cotações e abre detalhes', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub lista + detalhes destino')
    const stubs = await stubListaCotacoesPageApis(interceptNetworkCall)

    interceptNetworkCall({
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/itens**`,
      fulfillResponse: {
        status: 200,
        body: {
          cotacao: { id: stubs.cotacaoId, nome: stubs.cotacaoNome },
          itens: [],
          lotes: [],
        },
      },
    })

    await gotoListaCotacoesPage(page)
    await stubs.getListCall

    await log.step('Assert list and open cotação')
    await expect(page.getByTestId('lista-page')).toBeVisible()
    await expect(page.getByTestId('lista-adicionar-cotacao')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('lista-cotacao-link').first()).toContainText(
      'Cotação E2E',
    )

    await page.getByTestId('lista-cotacao-link').first().click()
    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })
})
