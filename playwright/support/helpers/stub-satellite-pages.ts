import type { Page, Route, Request } from '@playwright/test'
import {
  buildDetalhesSessionUser,
  buildGetItensResponse,
  DETALHES_FIXTURE_IDS,
  type GetItensOverrides,
} from '../fixtures/factories/cotacao-detalhes-page'
import { maybeInjectTestIds, maybeInjectDocumentosTrOptions, maybeInjectDiretaSelectOptions } from './inject-testids'

type InterceptFn = (options: {
  method?: string
  url: string
  fulfillResponse?: { status?: number; body?: unknown }
  handler?: (route: Route, request: Request) => Promise<void> | void
}) => Promise<{
  status: number
  responseJson: unknown
  requestJson: unknown
}>

async function stubCommonAuth(interceptNetworkCall: InterceptFn) {
  const sessionCall = interceptNetworkCall({
    url: '**/api/check-session**',
    fulfillResponse: { status: 200, body: buildDetalhesSessionUser() },
  })
  const permissionsCall = interceptNetworkCall({
    url: '**/api/permissions-config/**',
    fulfillResponse: {
      status: 200,
      body: { cotacoes: ['quotation.cotacoes'] },
    },
  })
  const filtrosCall = interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })
  const preferencesCall = interceptNetworkCall({
    url: '**/api/config/preferences**',
    fulfillResponse: {
      status: 200,
      body: { decimal_places: 2, item_formula: 2 },
    },
  })
  const photoCall = interceptNetworkCall({
    url: '**/api/config/users/photo-me**',
    fulfillResponse: { status: 200, body: { photo: null } },
  })
  return {
    sessionCall,
    permissionsCall,
    filtrosCall,
    preferencesCall,
    photoCall,
  }
}

export const SATELLITE_FIXTURE_IDS = {
  COTACAO_ID: DETALHES_FIXTURE_IDS.COTACAO_ID,
  TR_ID: 501,
  USER_ID: 701,
  SUPPLIER_CNPJ: '12345678000199',
} as const

/** Stubs for `/v2/cotacoes/:id/documentos`. */
export async function stubDocumentosPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? SATELLITE_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Documentos'
  const auth = await stubCommonAuth(interceptNetworkCall)

  const getDocumentosCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/cotacao/${cotacaoId}/documentos/**`,
    fulfillResponse: {
      status: 200,
      body: {
        nome: cotacaoNome,
        dfd: null,
        etp: null,
        grmr: null,
        tr: null,
      },
    },
  })

  interceptNetworkCall({
    method: 'GET',
    url: '**/api/dfd**',
    fulfillResponse: {
      status: 200,
      body: { results: [{ id: 1, nome: 'DFD E2E' }] },
    },
  })
  interceptNetworkCall({
    method: 'GET',
    url: '**/api/etp**',
    fulfillResponse: {
      status: 200,
      body: { results: [{ id: 2, nome: 'ETP E2E' }] },
    },
  })
  interceptNetworkCall({
    method: 'GET',
    url: '**/api/grmr**',
    fulfillResponse: {
      status: 200,
      body: { results: [{ id: 3, nome: 'GRMR E2E' }] },
    },
  })
  interceptNetworkCall({
    method: 'GET',
    url: '**/api/tr',
    fulfillResponse: {
      status: 200,
      body: {
        trs: [{ id: SATELLITE_FIXTURE_IDS.TR_ID, nome: 'TR E2E Principal' }],
      },
    },
  })
  // Also match trailing slash variants used by some clients.
  interceptNetworkCall({
    method: 'GET',
    url: '**/api/tr/',
    fulfillResponse: {
      status: 200,
      body: {
        trs: [{ id: SATELLITE_FIXTURE_IDS.TR_ID, nome: 'TR E2E Principal' }],
      },
    },
  })

  return { cotacaoId, cotacaoNome, getDocumentosCall, ...auth }
}

export async function gotoDocumentosPage(
  page: Page,
  cotacaoId = SATELLITE_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacoes/${cotacaoId}/documentos`, { timeout: 90_000 })
  await maybeInjectTestIds(page, 'documentos')
}

/** Open TR autocomplete and inject option testids. */
export async function openDocumentosTrSelect(page: Page) {
  await page.getByTestId('documentos-tr-select').click()
  await maybeInjectDocumentosTrOptions(page)
}

/** Stubs for `/v2/cotacoes/:id/selecionar-colaboradores`. */
export async function stubColaboradoresPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? SATELLITE_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Colaboradores'
  const auth = await stubCommonAuth(interceptNetworkCall)

  const getCollaboratorsCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/${cotacaoId}/collaborators**`,
    fulfillResponse: {
      status: 200,
      body: {
        nome: cotacaoNome,
        dt_cotacao: '2026-09-01T12:00:00Z',
        colaboradores: [],
      },
    },
  })

  const getUsersCall = interceptNetworkCall({
    method: 'GET',
    url: '**/api/collaborators/users/**',
    fulfillResponse: {
      status: 200,
      body: {
        count: 1,
        results: [
          {
            id: SATELLITE_FIXTURE_IDS.USER_ID,
            name: 'Colaborador E2E',
            email: 'colab@fontedeprecos.test',
            photo: null,
            is_active: true,
          },
        ],
      },
    },
  })

  return {
    cotacaoId,
    cotacaoNome,
    getCollaboratorsCall,
    getUsersCall,
    ...auth,
  }
}

export async function gotoColaboradoresPage(
  page: Page,
  cotacaoId = SATELLITE_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacoes/${cotacaoId}/selecionar-colaboradores`, {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'colaboradores')
}

/** Stubs for `/v2/cotacao/cotacoes/detalhes/:id/direta`. */
export async function stubDiretaPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: GetItensOverrides = {},
) {
  const auth = await stubCommonAuth(interceptNetworkCall)
  const getItensBody = buildGetItensResponse({
    cotacaoNome: 'Cotação E2E Direta',
    ...overrides,
  })
  const cotacaoId = String(getItensBody.cotacao.id)

  const getItensCall = interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
    fulfillResponse: { status: 200, body: getItensBody },
  })

  interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
    fulfillResponse: { status: 200, body: [{ id: 1, nome: 'Lote 1', ordem: 1 }] },
  })
  interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user**',
    fulfillResponse: { status: 200, body: { valid_user: true } },
  })
  interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user-ia**',
    fulfillResponse: {
      status: 200,
      body: { valid_user: false, module_enabled: false },
    },
  })

  interceptNetworkCall({
    url: '**/api/fornecedorcotacao/**',
    fulfillResponse: {
      status: 200,
      body: [
        {
          nome: 'Fornecedor E2E LTDA',
          cnpj: SATELLITE_FIXTURE_IDS.SUPPLIER_CNPJ,
        },
      ],
    },
  })

  interceptNetworkCall({
    url: '**/api/v3/cotacao/cotacoes/unit**',
    fulfillResponse: {
      status: 200,
      body: {
        units: [{ unidade: 'UN', descricao: 'Unidade' }],
      },
    },
  })

  return { cotacaoId, getItensBody, getItensCall, ...auth }
}

export async function gotoDiretaPage(
  page: Page,
  cotacaoId = SATELLITE_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacao/cotacoes/detalhes/${cotacaoId}/direta`, {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'direta')
}

/** Open fornecedor autocomplete and inject option testids. */
export async function openDiretaFornecedorSelect(page: Page) {
  await page.getByTestId('direta-fornecedor-select').click()
  await maybeInjectDiretaSelectOptions(page)
}

/** Open unidade select and inject UN option. */
export async function openDiretaUnidadeSelect(page: Page) {
  await page.getByTestId('direta-unidade-select').click()
  await maybeInjectDiretaSelectOptions(page)
}

export { DETALHES_FIXTURE_IDS }
