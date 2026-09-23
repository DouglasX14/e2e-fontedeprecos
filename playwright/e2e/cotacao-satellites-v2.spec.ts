import { test, expect, log } from '../support/merged-fixtures'
import { DETALHES_FIXTURE_IDS } from '../support/fixtures/factories'
import {
  SATELLITE_FIXTURE_IDS,
  gotoColaboradoresPage,
  gotoDiretaPage,
  gotoDocumentosPage,
  openDiretaFornecedorSelect,
  openDiretaUnidadeSelect,
  openDocumentosTrSelect,
  stubColaboradoresPageApis,
  stubDiretaPageApis,
  stubDocumentosPageApis,
} from '../support/helpers/stub-satellite-pages'

test.use({ authSessionEnabled: false })

test.describe('Documentos da cotação — /v2/cotacoes/:id/documentos', () => {
  test('[P2] carrega documentos e aplica seleção de TR', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub documentos page APIs')
    const stubs = await stubDocumentosPageApis(interceptNetworkCall)

    await gotoDocumentosPage(page, stubs.cotacaoId)
    // Wait for GET before registering POST on the same URL — playwright-utils
    // uses route.continue() on method mismatch, which skips earlier GET stubs.
    await stubs.getDocumentosCall

    await log.step('Assert header and select TR')
    await expect(page.getByTestId('documentos-page')).toBeVisible()
    await expect(page.getByTestId('documentos-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )

    const saveCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/cotacao/${stubs.cotacaoId}/documentos/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await openDocumentosTrSelect(page)
    await page
      .getByTestId(`documentos-tr-option-${SATELLITE_FIXTURE_IDS.TR_ID}`)
      .click()
    await page.getByTestId('documentos-aplicar-btn').click()

    const { status, requestJson } = await saveCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      tr: SATELLITE_FIXTURE_IDS.TR_ID,
    })
    await expect(page.getByText('Documentos salvos com sucesso.')).toBeVisible()
  })
})

test.describe('Colaboradores — /v2/cotacoes/:id/selecionar-colaboradores', () => {
  test('[P2] seleciona colaborador e salva', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub colaboradores page APIs')
    const stubs = await stubColaboradoresPageApis(interceptNetworkCall)

    await gotoColaboradoresPage(page, stubs.cotacaoId)
    // Wait for GETs before POST on the same collaborators URL (see documentos note).
    await stubs.getCollaboratorsCall
    await stubs.getUsersCall

    await log.step('Select user and save')
    await expect(page.getByTestId('colaboradores-page')).toBeVisible()
    await expect(page.getByTestId('colaboradores-cotacao-nome')).toContainText(
      stubs.cotacaoNome,
      { timeout: 30_000 },
    )
    await expect(page.getByText('Colaborador E2E')).toBeVisible()

    const saveCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/${stubs.cotacaoId}/collaborators**`,
      fulfillResponse: {
        status: 200,
        body: {
          nome: stubs.cotacaoNome,
          dt_cotacao: '2026-09-01T12:00:00Z',
          colaboradores: [SATELLITE_FIXTURE_IDS.USER_ID],
        },
      },
    })

    // Click checkbox role inside wrapper; force bypasses Vuetify ripple.
    await page
      .getByTestId(
        `colaboradores-user-check-${SATELLITE_FIXTURE_IDS.USER_ID}`,
      )
      .getByRole('checkbox')
      .click({ force: true })
    await expect(page.getByTestId('colaboradores-count')).toContainText(
      '1 colaboradores selecionados',
    )
    await page.getByTestId('colaboradores-salvar-btn').click()

    const { status, requestJson } = await saveCall
    expect(status).toBe(200)
    expect(requestJson).toMatchObject({
      collaborators: [SATELLITE_FIXTURE_IDS.USER_ID],
    })
    await expect(
      page.getByText('Colaboradores salvos com sucesso.'),
    ).toBeVisible()
  })
})

test.describe('Cotação direta — /v2/cotacao/cotacoes/detalhes/:id/direta', () => {
  test('[P2] preenche preço direto e salva', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub direta page APIs')
    const stubs = await stubDiretaPageApis(interceptNetworkCall)

    const saveCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/direct-quotation/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDiretaPage(page, stubs.cotacaoId)
    await stubs.getItensCall

    await log.step('Assert page and fill required price fields')
    await expect(page.getByTestId('direta-page')).toBeVisible()
    await expect(page.getByTestId('direta-cotacao-nome')).toHaveText(
      'Cotação E2E Direta',
    )
    await expect(
      page.getByTestId(`direta-item-${DETALHES_FIXTURE_IDS.ITEM_ID}`),
    ).toBeVisible()

    await openDiretaFornecedorSelect(page)
    await page
      .getByTestId(
        `direta-fornecedor-option-${SATELLITE_FIXTURE_IDS.SUPPLIER_CNPJ}`,
      )
      .click()

    await openDiretaUnidadeSelect(page)
    await page.getByTestId('direta-unidade-option-UN').click()

    await page.getByTestId('direta-valor-unitario').fill('10,50')
    await page.getByTestId('direta-data-cotacao').fill('2026-09-17')

    await log.step('Submit direct quotation')
    await Promise.all([
      page.waitForURL(
        new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
      ),
      page.getByTestId('direta-salvar-btn').first().click(),
    ])

    const { status } = await saveCall
    expect(status).toBe(200)
  })
})
