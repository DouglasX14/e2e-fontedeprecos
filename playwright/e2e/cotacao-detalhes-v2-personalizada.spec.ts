import { test, expect, log } from '../support/merged-fixtures'
import {
  gotoDetalhesPage,
  stubDetalhesPageApis,
  waitForDetalhesPageReady,
} from '../support/helpers/stub-detalhes-page'

test.use({ authSessionEnabled: false })

test.describe('Cotação Detalhes v2 — personalizada / IA / capacity', () => {
  test('[P2] Cotação IA — solicita interesse quando módulo não contratado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub session with IA flag + valid-user-ia false')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      sessionOverrides: { acesso_cotacao_ia: true },
      validUserIaBody: { valid_user: false, module_enabled: false },
    })

    const interesseCall = interceptNetworkCall({
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/ia/tenho-interesse/**`,
      fulfillResponse: { status: 200, body: { ok: true } },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await stubs.validUserIaCall
    await waitForDetalhesPageReady(page)

    await log.step('Open IA access dialog and send interest')
    await expect(page.getByTestId('detalhes-cotacao-ia-btn')).toBeVisible()
    await page.getByTestId('detalhes-cotacao-ia-btn').click()
    await expect(page.getByTestId('detalhes-ia-access-dialog')).toBeVisible()
    await page.getByTestId('detalhes-ia-interesse-btn').click()

    const { status } = await interesseCall
    expect(status).toBe(200)
    await expect(
      page.getByText('Solicitação enviada'),
    ).toBeVisible()
  })

  test('[P2] Cotação IA — navega para /ia quando módulo contratado', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub session with IA + valid-user-ia true')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      sessionOverrides: { acesso_cotacao_ia: true },
      validUserIaBody: { valid_user: true, module_enabled: true },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await stubs.validUserIaCall
    await waitForDetalhesPageReady(page)

    const iaBtn = page.getByTestId('detalhes-cotacao-ia-btn')
    await expect(iaBtn).toBeVisible()
    await expect(iaBtn).toHaveAttribute(
      'href',
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}/ia`),
    )

    await log.step('Click Cotação com IA and assert navigation')
    await Promise.all([
      page.waitForURL(
        new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}/ia`),
      ),
      iaBtn.click(),
    ])
  })

  test('[P2] capacity-limit — abre dialog via query capacity_limit=1', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub personalizada cotação')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      personalizada: true,
      customQuoteCredits: {
        disponivel: 5,
        limite_mensal: 5,
        can_send_all: true,
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId, {
      query: { capacity_limit: '1' },
    })
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Assert capacity dialog from query')
    const dialog = page.getByTestId('detalhes-send-quote-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Limite contratado atingido')).toBeVisible()
    await expect(
      dialog.getByTestId('detalhes-send-stat-limit-label'),
    ).toHaveText('Limite contratado')
  })

  test('[P2] capacity-limit — Novo item bloqueado ao exceder limite mensal', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub personalizada with limite_mensal = itens count')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      personalizada: true,
      customQuoteCredits: {
        disponivel: 10,
        limite_mensal: 1,
        can_send_all: true,
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Click Novo item and expect capacity dialog')
    await page.getByTestId('detalhes-acoes-menu').click()
    await page.getByTestId('detalhes-acao-novo-item').click()

    await expect(page.getByTestId('detalhes-send-quote-dialog')).toBeVisible()
    await expect(page.getByText('Limite contratado atingido')).toBeVisible()
    await expect(page).toHaveURL(
      new RegExp(`/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}`),
    )
  })

  test('[P2] adiciona prazo adicional em cotação personalizada', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub personalizada with can_finish')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      personalizada: true,
      can_finish: true,
    })

    const prazoCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/add-deadline/**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Prazo adicional incluído com sucesso' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open prazo dialog and confirm')
    await page.getByTestId('detalhes-prazo-adicional-btn').click()
    await expect(page.getByTestId('detalhes-prazo-dialog')).toBeVisible()
    await page.getByTestId('detalhes-prazo-dias-input').fill('3')
    await page
      .getByTestId('detalhes-prazo-justificativa-input')
      .fill('Necessário prazo extra para pesquisa E2E')
    await page.getByTestId('detalhes-prazo-confirm').click()

    const { status, requestJson } = await prazoCall
    expect(status).toBe(200)
    expect(Number((requestJson as { deadline?: string | number }).deadline)).toBe(
      3,
    )
    expect(requestJson).toMatchObject({
      justify: 'Necessário prazo extra para pesquisa E2E',
    })
  })

  test('[P2] envia cotação personalizada', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub personalizada ready to send')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      personalizada: true,
      can_send_quotation: true,
      trId: 4242,
      customQuoteCredits: {
        disponivel: 10,
        limite_mensal: 50,
        can_send_all: true,
      },
    })

    const sendCall = interceptNetworkCall({
      method: 'GET',
      url: `**/cotacao/cotacoes/detalhes/enviar/${stubs.cotacaoId}**`,
      fulfillResponse: {
        status: 200,
        body: { detail: 'Cotação enviada com sucesso.' },
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open send dialog and confirm')
    await page.getByTestId('detalhes-enviar-cotacao-btn').click()
    const dialog = page.getByTestId('detalhes-send-quote-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Confirmar envio')).toBeVisible()
    await page.getByTestId('detalhes-enviar-confirm').click()

    const { status } = await sendCall
    expect(status).toBe(200)
  })

  test('[P2] finaliza cotação personalizada já enviada', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub personalizada already sent')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      personalizada: true,
      can_finish: true,
      dataEnvio: '2026-09-18T10:00:00Z',
      status: null,
      trId: 4242,
    })

    const finalizeCall = interceptNetworkCall({
      method: 'POST',
      url: `**/api/v3/cotacao/${stubs.cotacaoId}/finalize/**`,
      handler: async (route, request) => {
        const body = request.postData() || ''
        expect(body).toContain('name="type"')
        expect(body).toContain('FN')
        expect(body).toContain('name="finalizationType"')
        expect(body).toMatch(/name="finalizationType"[\s\S]*\r?\nc\r?\n/)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Cotação finalizada com sucesso' }),
        })
      },
    })

    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await log.step('Open finalize dialog, choose Concluído, confirm')
    await page.getByTestId('detalhes-finalizar-cotacao-btn').click()
    await expect(page.getByTestId('detalhes-finalizar-dialog')).toBeVisible()
    await page
      .getByTestId('detalhes-finalizar-dialog')
      .getByText('Concluído', { exact: true })
      .click()
    await page.getByTestId('detalhes-finalizar-confirm').click()

    const { status } = await finalizeCall
    expect(status).toBe(200)
  })
})
