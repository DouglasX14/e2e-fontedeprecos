import { test, expect, log } from '../support/merged-fixtures'
import {
  gotoDetalhesPage,
  stubDetalhesPageApis,
  waitForDetalhesPageReady,
} from '../support/helpers/stub-detalhes-page'

test.use({ authSessionEnabled: false })

test.describe('Cotação Detalhes v2 — navegação Ações', () => {
  test('[P2] navega Ações → Anexar documentos', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes and open Anexar documentos')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)
    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await page.getByTestId('detalhes-acoes-menu').click()
    const anexar = page.getByTestId('detalhes-acao-anexar-documentos')
    await expect(anexar).toBeVisible()
    await Promise.all([
      page.waitForURL(new RegExp(`/v2/cotacoes/${stubs.cotacaoId}/documentos`)),
      anexar.click(),
    ])
  })

  test('[P2] navega Ações → Selecionar colaboradores', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes with can_add_users')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall, {
      can_add_users: true,
    })
    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await page.getByTestId('detalhes-acoes-menu').click()
    const colaboradores = page.getByTestId('detalhes-acao-colaboradores')
    await expect(colaboradores).toBeVisible()
    await Promise.all([
      page.waitForURL(
        new RegExp(`/v2/cotacoes/${stubs.cotacaoId}/selecionar-colaboradores`),
      ),
      colaboradores.click(),
    ])
  })

  test('[P2] navega Ações → Cotação direta', async ({
    page,
    interceptNetworkCall,
  }) => {
    await log.step('Stub detalhes and open Cotação direta')
    const stubs = await stubDetalhesPageApis(interceptNetworkCall)
    await gotoDetalhesPage(page, stubs.cotacaoId)
    await stubs.getItensCall
    await waitForDetalhesPageReady(page)

    await page.getByTestId('detalhes-acoes-menu').click()
    const direta = page.getByTestId('detalhes-acao-cotacao-direta')
    await expect(direta).toBeVisible()
    await Promise.all([
      page.waitForURL(
        new RegExp(
          `/v2/cotacao/cotacoes/detalhes/${stubs.cotacaoId}/direta`,
        ),
      ),
      direta.click(),
    ])
  })
})
