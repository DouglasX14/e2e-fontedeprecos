import { test, expect, log } from '../support/merged-fixtures'
import {
  gotoAdicionarItemPage,
  gotoCompartilharPage,
  gotoEditarCotacaoPage,
  gotoEditarItemPage,
  gotoExpressaPage,
  gotoIaPage,
  gotoImportarItensPage,
  gotoListaCotacoesPage,
  gotoRelatorioGerencialPage,
  stubAdicionarItemPageApis,
  stubCompartilharPageApis,
  stubEditarCotacaoPageApis,
  stubEditarItemPageApis,
  stubExpressaPageApis,
  stubIaPageApis,
  stubImportarItensPageApis,
  stubListaCotacoesPageApis,
  stubRelatorioGerencialPageApis,
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

test.describe('Editar item — /v2/cotacao/cotacoes/detalhes/editar-item/:id/:item_id', () => {
  test('[P0] carrega item e salva edição', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub editar-item APIs')
    const stubs = await stubEditarItemPageApis(interceptNetworkCall)

    const editCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao-item/${stubs.cotacaoId}/edit-item/${stubs.itemId}/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Item atualizado com sucesso.' },
      },
    })

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

    await gotoEditarItemPage(page, stubs.cotacaoId, stubs.itemId)
    await stubs.getItemCall

    await log.step('Assert prefilled form and save')
    await expect(page.getByTestId('editar-item-page')).toBeVisible()
    await expect(page.getByTestId('editar-item-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )
    await expect(page.getByTestId('editar-item-nome')).toHaveValue(
      stubs.itemNome,
    )

    await page.getByTestId('editar-item-nome').fill('Caneta E2E Editada')
    await page.getByTestId('editar-item-submit').click()

    const { status } = await editCall
    expect(status).toBe(200)
    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })
})

test.describe('Importar itens — /v2/cotacao/cotacoes/detalhes/importar-itens/:id', () => {
  test('[P0] importa planilha e volta aos detalhes', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub importar-itens APIs')
    const stubs = await stubImportarItensPageApis(interceptNetworkCall)

    const importCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v2/cotacoes/importar-itens/${stubs.cotacaoId}**`,
      fulfillResponse: {
        status: 200,
        body: {
          success: true,
          message: 'Itens importados com sucesso!',
          erros_planilha: [],
        },
      },
    })

    await gotoImportarItensPage(page, stubs.cotacaoId)
    await stubs.getItensCall

    await log.step('Assert page and upload file')
    await expect(page.getByTestId('importar-itens-page')).toBeVisible()
    await expect(page.getByTestId('importar-itens-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )
    await expect(page.getByTestId('importar-itens-modelo')).toBeVisible()

    await page.getByTestId('importar-itens-file').setInputFiles({
      name: 'itens-e2e.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('PK\u0003\u0004e2e-xlsx'),
    })
    await maybeInjectTestIds(page, 'importar-itens')
    await page.getByTestId('importar-itens-submit').click()

    const { status } = await importCall
    expect(status).toBe(200)
    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })
})

test.describe('Cotação IA — /v2/cotacao/cotacoes/detalhes/:id/ia', () => {
  test('[P0] exibe gate quando módulo não contratado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub IA sem módulo')
    const stubs = await stubIaPageApis(interceptNetworkCall, {
      moduleEnabled: false,
    })

    await gotoIaPage(page, stubs.cotacaoId)

    await log.step('Assert no-access card')
    await expect(page.getByTestId('ia-page')).toBeVisible()
    await expect(
      page.getByText(/Módulo Cotação com IA não contratado/i),
    ).toBeVisible({ timeout: 30_000 })
    await maybeInjectTestIds(page, 'ia')
    await expect(page.getByTestId('ia-tenho-interesse')).toBeVisible()
    await expect(page.getByTestId('ia-voltar')).toBeVisible()
  })

  test('[P0] carrega seleção de itens com módulo ativo', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub IA com módulo')
    const stubs = await stubIaPageApis(interceptNetworkCall, {
      moduleEnabled: true,
    })

    await gotoIaPage(page, stubs.cotacaoId)
    await stubs.getItensCall

    await log.step('Assert IA select phase')
    await expect(page.getByTestId('ia-page')).toBeVisible()
    await maybeInjectTestIds(page, 'ia')
    await expect(page.getByTestId('ia-titulo')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('ia-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
    )
    await expect(page.getByTestId('ia-itens-panel')).toBeVisible()
    await expect(page.getByText('Caneta Esferográfica Azul')).toBeVisible()
  })
})

test.describe('Compartilhar — /v2/cotacao/cotacoes/compartilhar/:id', () => {
  test('[P0] compartilha cotação por email', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub compartilhar + lista destino')
    const stubs = await stubCompartilharPageApis(interceptNetworkCall)
    await stubListaCotacoesPageApis(interceptNetworkCall)

    const shareCall = interceptNetworkCall({
      method: 'POST',
      url: `**/cotacao/cotacoes/${stubs.cotacaoId}/compartilhar**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoCompartilharPage(page, stubs.cotacaoId)
    await stubs.getItensCall

    await log.step('Fill email and submit')
    await expect(page.getByTestId('compartilhar-page')).toBeVisible()
    await expect(page.getByTestId('compartilhar-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )
    await page.getByTestId('compartilhar-email').fill('qa@fontedeprecos.test')
    await page.getByTestId('compartilhar-obs').fill('Compartilhamento E2E')
    await page.getByTestId('compartilhar-submit').click()

    const { status, requestJson } = await shareCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      email: 'qa@fontedeprecos.test',
      notes: 'Compartilhamento E2E',
    })
    await expect(page).toHaveURL(/\/v2\/cotacao\/cotacoes\/?$/)
  })
})

test.describe('Editar cotação — /v2/cotacao/cotacoes/editar/:id', () => {
  test('[P0] altera nome e salva', async ({ page, interceptNetworkCall }) => {
    await log.step('Stub editar cotação')
    const stubs = await stubEditarCotacaoPageApis(interceptNetworkCall)

    const updateCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/update/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Cotação atualizada com sucesso.', id: stubs.cotacaoId },
      },
    })

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

    await gotoEditarCotacaoPage(page, stubs.cotacaoId)
    await stubs.getCotacaoCall

    await log.step('Assert form and save')
    await expect(page.getByTestId('editar-cotacao-page')).toBeVisible()
    await expect(page.getByTestId('editar-cotacao-nome')).toHaveValue(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )
    await page.getByTestId('editar-cotacao-nome').fill('Cotação E2E Renomeada')
    await page.getByTestId('editar-cotacao-submit').click()

    const { status } = await updateCall
    expect(status).toBe(200)
    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })
})

test.describe('Relatório gerencial — /v2/cotacao/cotacoes/relatorio-gerencial', () => {
  test('[P0] carrega KPIs e resumo para admin', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub relatório gerencial (admin)')
    const stubs = await stubRelatorioGerencialPageApis(interceptNetworkCall)

    await gotoRelatorioGerencialPage(page)
    await stubs.getReportCall

    await log.step('Assert dashboard')
    await expect(page.getByTestId('relatorio-gerencial-page')).toBeVisible()
    await maybeInjectTestIds(page, 'relatorio-gerencial')
    await expect(page.getByTestId('relatorio-gerencial-aplicar')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('relatorio-gerencial-kpis')).toBeVisible()
    await expect(page.getByText('Cotações criadas')).toBeVisible()
    await expect(page.getByTestId('relatorio-gerencial-tabela')).toBeVisible()
    await expect(
      page.getByTestId('relatorio-gerencial-tabela').getByText('E2E Tester'),
    ).toBeVisible()
    await expect(page.getByTestId('relatorio-gerencial-exportar')).toBeVisible()
  })
})
