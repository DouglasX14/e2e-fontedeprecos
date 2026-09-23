import type { Page, Route, Request } from '@playwright/test'
import {
  buildDetalhesSessionUser,
  buildGetItensResponse,
  buildGetPricesResponse,
  DETALHES_FIXTURE_IDS,
  ITEM_FIXTURE_IDS,
} from '../fixtures/factories'
import { maybeInjectTestIds } from './inject-testids'

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

export const FLOW_FIXTURE_IDS = {
  COTACAO_ID: DETALHES_FIXTURE_IDS.COTACAO_ID,
  ITEM_ID: ITEM_FIXTURE_IDS.ITEM_ID,
  LIST_COTACAO_ID: DETALHES_FIXTURE_IDS.COTACAO_ID,
} as const

async function stubCommonAuth(
  interceptNetworkCall: InterceptFn,
  options: { sessionBody?: ReturnType<typeof buildDetalhesSessionUser> } = {},
) {
  const sessionCall = interceptNetworkCall({
    url: '**/api/check-session**',
    fulfillResponse: {
      status: 200,
      body: options.sessionBody ?? buildDetalhesSessionUser(),
    },
  })
  const permissionsCall = interceptNetworkCall({
    url: '**/api/permissions-config/**',
    fulfillResponse: {
      status: 200,
      body: { cotacoes: ['quotation.cotacoes'] },
    },
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
  return { sessionCall, permissionsCall, preferencesCall, photoCall }
}

/** Minimal `/api/filtros/` body so Expressa Filtros + UF selects mount. */
export function buildExpressaFiltrosBody() {
  return {
    bases: [
      { name: 'Comprasnet', value: 'Comprasnet' },
      { name: 'BPS', value: "('gov_bps','BPS')" },
    ],
    bases_tabulares: ['Comprasnet', "('gov_bps','BPS')"],
    ufs: [{ name: 'São Paulo', value: 'SP' }],
    municipios: [],
    periodo: [
      { name: 'Últimos 12 meses', value: 12 },
      { name: 'Personalizado', value: 0 },
    ],
    periodoTenYears: [{ name: 'Últimos 10 anos', value: 120 }],
    tenantsTenYears: [],
    tenantsImageBasedSearch: [],
    tenantsIaBasedSearch: [],
    basesGeralPropostasInicialEFinal: [],
    flags: { suggestion: 'false' },
  }
}

export function buildExpressaSearchHit(
  overrides: Partial<{
    termo_id: number
    descricao: string
    valor_unitario: string
  }> = {},
) {
  return {
    termo_id: overrides.termo_id ?? 55001,
    descricao: overrides.descricao ?? 'Caneta Azul Homologada E2E',
    descricao_limit_15: 'Caneta Azul...',
    objeto: 'Material de escritório',
    valor_unitario: overrides.valor_unitario ?? '10,00',
    quant: 10,
    uf: 'SP',
    dt_homologacao: '15/01/2025',
    base: 'comprasnet',
    uasg_name: 'UASG E2E',
    marca: 'Bic',
    fornecedor_cnpj: '12345678000199',
  }
}

/** Stubs for `/v2/cotacao/cotacoes/detalhes/adicionar-item/:id`. */
export async function stubAdicionarItemPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Adicionar Item'
  const auth = await stubCommonAuth(interceptNetworkCall)

  interceptNetworkCall({
    url: '**/api/filtros**',
    fulfillResponse: {
      status: 200,
      body: { ufs: [{ name: 'São Paulo', value: 'SP' }], bases_tabulares: [] },
    },
  })

  const getCotacaoCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao/${cotacaoId}`,
    fulfillResponse: {
      status: 200,
      body: {
        id: cotacaoId,
        nome: cotacaoNome,
        codigo: 'COT-E2E-ADD',
      },
    },
  })
  // Trailing-slash variant used by some clients
  interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao/${cotacaoId}/`,
    fulfillResponse: {
      status: 200,
      body: {
        id: cotacaoId,
        nome: cotacaoNome,
        codigo: 'COT-E2E-ADD',
      },
    },
  })

  interceptNetworkCall({
    url: '**/api/v3/cotacao/cotacoes/unit**',
    fulfillResponse: {
      status: 200,
      body: { units: [{ unidade: 'UN', descricao: 'Unidade' }] },
    },
  })

  interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
    fulfillResponse: {
      status: 200,
      body: [{ id: DETALHES_FIXTURE_IDS.LOTE_ID, nome: 'LOTE', ordem: 1 }],
    },
  })

  interceptNetworkCall({
    url: '**/api/modelos-de-justificativas**',
    fulfillResponse: { status: 200, body: { modelos: [] } },
  })

  return { cotacaoId, cotacaoNome, getCotacaoCall, ...auth }
}

export async function gotoAdicionarItemPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(
    `/v2/cotacao/cotacoes/detalhes/adicionar-item/${cotacaoId}`,
    { timeout: 90_000 },
  )
  await maybeInjectTestIds(page, 'adicionar-item')
}

/** Stubs for `/v2/cotacoes/expressa?quotation=&quotation_item=`. */
export async function stubExpressaPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: {
    cotacaoId?: string | number
    itemId?: number
    itemNome?: string
    cotacaoNome?: string
  } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? ITEM_FIXTURE_IDS.COTACAO_ID
  const itemId = overrides.itemId ?? FLOW_FIXTURE_IDS.ITEM_ID
  const itemNome = overrides.itemNome ?? 'Caneta Esferográfica Azul'
  const cotacaoNome =
    overrides.cotacaoNome ?? 'Cotação E2E Material de Escritório'
  const auth = await stubCommonAuth(interceptNetworkCall)

  const filtrosBody = buildExpressaFiltrosBody()
  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: filtrosBody },
  })
  interceptNetworkCall({
    url: '**/api/filtros',
    fulfillResponse: { status: 200, body: filtrosBody },
  })

  const getPricesBody = buildGetPricesResponse({
    itemId,
    cotacaoId: Number(cotacaoId) || ITEM_FIXTURE_IDS.COTACAO_ID,
    itemNome,
    cotacaoNome,
  })

  const getPricesCall = interceptNetworkCall({
    url: `**/api/v3/cotacao-item/${itemId}/get-prices/**`,
    fulfillResponse: { status: 200, body: getPricesBody },
  })

  const getItemCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao-item/${itemId}/`,
    fulfillResponse: {
      status: 200,
      body: {
        id: itemId,
        nome: itemNome,
        descricao: 'Item de teste E2E',
        quant: 100,
        unidade: 'UN',
        position: 1,
        cotacao: { id: cotacaoId, nome: cotacaoNome },
      },
    },
  })
  interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao-item/${itemId}`,
    fulfillResponse: {
      status: 200,
      body: {
        id: itemId,
        nome: itemNome,
        descricao: 'Item de teste E2E',
        quant: 100,
        unidade: 'UN',
        position: 1,
        cotacao: { id: cotacaoId, nome: cotacaoNome },
      },
    },
  })

  const searchHit = buildExpressaSearchHit()
  const searchCall = interceptNetworkCall({
    url: '**/api/expressa/search/page**',
    fulfillResponse: {
      status: 200,
      body: {
        result: [searchHit],
        total_hits: 1,
        total_pages: 1,
      },
    },
  })

  interceptNetworkCall({
    url: '**/api/expressa/search/advanced/**',
    fulfillResponse: {
      status: 200,
      body: {
        status: true,
        quantMax: [1, 100],
        valorMax: [1, 1000],
      },
    },
  })

  return {
    cotacaoId: String(cotacaoId),
    itemId,
    itemNome,
    cotacaoNome,
    searchHit,
    getItemCall,
    getPricesCall,
    searchCall,
    getPricesBody,
    ...auth,
  }
}

export async function gotoExpressaPage(
  page: Page,
  options: { cotacaoId?: string | number; itemId?: number } = {},
) {
  const cotacaoId = options.cotacaoId ?? ITEM_FIXTURE_IDS.COTACAO_ID
  const itemId = options.itemId ?? FLOW_FIXTURE_IDS.ITEM_ID
  await page.goto(
    `/v2/cotacoes/expressa?quotation=${cotacaoId}&quotation_item=${itemId}`,
    { timeout: 90_000 },
  )
  await maybeInjectTestIds(page, 'expressa')
}

/** Stubs for `/v2/cotacao/cotacoes` list. */
export async function stubListaCotacoesPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: {
    cotacaoId?: string
    cotacaoNome?: string
  } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.LIST_COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Lista Principal'
  const auth = await stubCommonAuth(interceptNetworkCall)

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user**',
    fulfillResponse: { status: 200, body: { valid_user: true } },
  })

  interceptNetworkCall({
    url: '**/cotacao/cotacoes/compartilhadas/mensagem**',
    fulfillResponse: { status: 200, body: { mensagem: '' } },
  })
  interceptNetworkCall({
    url: '**/cotacao/cotacoes/compartilhadas_api**',
    fulfillResponse: { status: 200, body: { results: [] } },
  })

  const listItem = {
    id: cotacaoId,
    nome: cotacaoNome,
    dt_cotacao: '2026-09-01T12:00:00Z',
    itens_count: 2,
    mean_price: null,
    personalizada: false,
    ativo: true,
    user: { name: 'E2E Tester' },
  }

  const getListCall = interceptNetworkCall({
    method: 'GET',
    url: '**/api/v3/cotacao?**',
    fulfillResponse: {
      status: 200,
      body: {
        count: 1,
        results: [listItem],
      },
    },
  })
  // Some clients hit without query on first paint
  interceptNetworkCall({
    method: 'GET',
    url: '**/api/v3/cotacao',
    fulfillResponse: {
      status: 200,
      body: {
        count: 1,
        results: [listItem],
      },
    },
  })

  return { cotacaoId, cotacaoNome, listItem, getListCall, ...auth }
}

export async function gotoListaCotacoesPage(page: Page) {
  await page.goto('/v2/cotacao/cotacoes', { timeout: 90_000 })
  await maybeInjectTestIds(page, 'lista')
}

/** Stubs for `/v2/cotacao/cotacoes/detalhes/editar-item/:id/:item_id`. */
export async function stubEditarItemPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: {
    cotacaoId?: string
    itemId?: number
    cotacaoNome?: string
    itemNome?: string
  } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const itemId = overrides.itemId ?? FLOW_FIXTURE_IDS.ITEM_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Editar Item'
  const itemNome = overrides.itemNome ?? 'Caneta Esferográfica Azul'
  const auth = await stubCommonAuth(interceptNetworkCall)

  interceptNetworkCall({
    url: '**/api/filtros**',
    fulfillResponse: {
      status: 200,
      body: { ufs: [{ name: 'São Paulo', value: 'SP' }], bases_tabulares: [] },
    },
  })
  interceptNetworkCall({
    url: '**/api/v3/cotacao/cotacoes/unit**',
    fulfillResponse: {
      status: 200,
      body: { units: [{ unidade: 'UN', descricao: 'Unidade' }] },
    },
  })
  interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
    fulfillResponse: {
      status: 200,
      body: [{ id: DETALHES_FIXTURE_IDS.LOTE_ID, nome: 'LOTE', ordem: 1 }],
    },
  })
  interceptNetworkCall({
    url: '**/api/modelos-de-justificativas**',
    fulfillResponse: { status: 200, body: { modelos: [] } },
  })

  const itemBody = {
    id: itemId,
    nome: itemNome,
    descricao: 'Descrição editável E2E',
    quant: 10,
    // Form matches units by descricao === res.unidade
    unidade: 'Unidade',
    uf: 'SP',
    obs: '',
    cotacao: { id: cotacaoId, nome: cotacaoNome },
  }

  const getItemCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao-item/${itemId}`,
    fulfillResponse: { status: 200, body: itemBody },
  })
  interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao-item/${itemId}/`,
    fulfillResponse: { status: 200, body: itemBody },
  })

  return { cotacaoId, itemId, cotacaoNome, itemNome, getItemCall, ...auth }
}

export async function gotoEditarItemPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
  itemId = FLOW_FIXTURE_IDS.ITEM_ID,
) {
  await page.goto(
    `/v2/cotacao/cotacoes/detalhes/editar-item/${cotacaoId}/${itemId}`,
    { timeout: 90_000 },
  )
  await maybeInjectTestIds(page, 'editar-item')
}

/** Stubs for `/v2/cotacao/cotacoes/detalhes/importar-itens/:id`. */
export async function stubImportarItensPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Importar Itens'
  const auth = await stubCommonAuth(interceptNetworkCall)

  const getItensBody = buildGetItensResponse({
    cotacaoId,
    cotacaoNome,
  })

  const getItensCall = interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
    fulfillResponse: { status: 200, body: getItensBody },
  })

  // Single lote → lote select hidden (lotes.length > 1 gate)
  interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/lotes**`,
    fulfillResponse: {
      status: 200,
      body: [{ id: DETALHES_FIXTURE_IDS.LOTE_ID, nome: 'LOTE', ordem: 1 }],
    },
  })

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  return { cotacaoId, cotacaoNome, getItensCall, getItensBody, ...auth }
}

export async function gotoImportarItensPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(
    `/v2/cotacao/cotacoes/detalhes/importar-itens/${cotacaoId}`,
    { timeout: 90_000 },
  )
  await maybeInjectTestIds(page, 'importar-itens')
}

/** Stubs for `/v2/cotacao/cotacoes/detalhes/:id/ia`. */
export async function stubIaPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: {
    cotacaoId?: string
    cotacaoNome?: string
    /** When false, page shows "módulo não contratado". Default true. */
    moduleEnabled?: boolean
  } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Cotação IA'
  const moduleEnabled = overrides.moduleEnabled ?? true
  const auth = await stubCommonAuth(interceptNetworkCall, {
    // User flag must be on to reach tenant permission check (valid-user-ia).
    sessionBody: buildDetalhesSessionUser({
      acesso_cotacao_ia: true,
      equipe_fonte: false,
    }),
  })

  interceptNetworkCall({
    url: '**/api/v3/cotacao/valid-user-ia**',
    fulfillResponse: {
      status: 200,
      body: { valid_user: moduleEnabled, module_enabled: moduleEnabled },
    },
  })

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: buildExpressaFiltrosBody() },
  })

  const getItensBody = buildGetItensResponse({
    cotacaoId,
    cotacaoNome,
    personalizada: false,
  })

  const getItensCall = interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
    fulfillResponse: { status: 200, body: getItensBody },
  })

  interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/lotes/**`,
    fulfillResponse: {
      status: 200,
      body: [{ id: DETALHES_FIXTURE_IDS.LOTE_ID, nome: 'LOTE', ordem: 1 }],
    },
  })

  interceptNetworkCall({
    url: `**/cotacao/cotacoes/${cotacaoId}/ia/uso**`,
    fulfillResponse: {
      status: 200,
      body: {
        restantes_usd: 50,
        limite_mensal_usd: 100,
        max_itens_com_saldo: 10,
        custo_estimado_por_item_usd: 1,
        saldo_esgotado: false,
        dentro_vigencia: true,
      },
    },
  })

  return {
    cotacaoId,
    cotacaoNome,
    moduleEnabled,
    getItensCall,
    getItensBody,
    ...auth,
  }
}

export async function gotoIaPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacao/cotacoes/detalhes/${cotacaoId}/ia`, {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'ia')
}

/** Stubs for `/v2/cotacao/cotacoes/compartilhar/:id`. */
export async function stubCompartilharPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Compartilhar'
  const auth = await stubCommonAuth(interceptNetworkCall)

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  const getItensBody = buildGetItensResponse({ cotacaoId, cotacaoNome })
  const getItensCall = interceptNetworkCall({
    url: `**/api/v3/cotacao/${cotacaoId}/itens**`,
    fulfillResponse: { status: 200, body: getItensBody },
  })

  return { cotacaoId, cotacaoNome, getItensCall, ...auth }
}

export async function gotoCompartilharPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacao/cotacoes/compartilhar/${cotacaoId}`, {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'compartilhar')
}

/** Stubs for `/v2/cotacao/cotacoes/editar/:id`. */
export async function stubEditarCotacaoPageApis(
  interceptNetworkCall: InterceptFn,
  overrides: { cotacaoId?: string; cotacaoNome?: string } = {},
) {
  const cotacaoId = overrides.cotacaoId ?? FLOW_FIXTURE_IDS.COTACAO_ID
  const cotacaoNome = overrides.cotacaoNome ?? 'Cotação E2E Editar'
  const auth = await stubCommonAuth(interceptNetworkCall)

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  const cotacaoBody = {
    id: cotacaoId,
    nome: cotacaoNome,
    obs: 'Obs inicial E2E',
    personalizada: false,
    dt_cotacao: '2026-09-01T12:00:00Z',
    user: { name: 'E2E Tester' },
    usuario_contato: { nome: '', email: '', telefone: '' },
    propostas_existentes: [],
  }

  const getCotacaoCall = interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao/${cotacaoId}`,
    fulfillResponse: { status: 200, body: cotacaoBody },
  })
  interceptNetworkCall({
    method: 'GET',
    url: `**/api/v3/cotacao/${cotacaoId}/`,
    fulfillResponse: { status: 200, body: cotacaoBody },
  })

  return { cotacaoId, cotacaoNome, getCotacaoCall, ...auth }
}

export async function gotoEditarCotacaoPage(
  page: Page,
  cotacaoId = FLOW_FIXTURE_IDS.COTACAO_ID,
) {
  await page.goto(`/v2/cotacao/cotacoes/editar/${cotacaoId}`, {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'editar-cotacao')
}

/** Stubs for `/v2/cotacao/cotacoes/relatorio-gerencial` (admin). */
export async function stubRelatorioGerencialPageApis(
  interceptNetworkCall: InterceptFn,
) {
  const auth = await stubCommonAuth(interceptNetworkCall, {
    sessionBody: buildDetalhesSessionUser({
      groups: [{ name: 'Administrador' }],
    }),
  })

  interceptNetworkCall({
    url: '**/api/filtros/**',
    fulfillResponse: { status: 200, body: { bases_tabulares: [] } },
  })

  const reportBody = {
    kpis: {
      criadas: 12,
      em_andamento: 5,
      finalizadas: 6,
      excluidas: 1,
      usuarios_ativos: 3,
      total_itens: 40,
    },
    usuarios_filtro: [{ id: 701, name: 'E2E Tester' }],
    resumo: {
      count: 1,
      results: [
        {
          user_id: 701,
          nome: 'E2E Tester',
          cotacoes: 12,
          itens: 40,
          em_andamento: 5,
          finalizadas: 6,
          excluidas: 1,
          ultima_cotacao: '2026-09-20T12:00:00Z',
        },
      ],
    },
    graficos: {
      por_usuario: [{ label: 'E2E Tester', value: 12 }],
      evolucao: [{ label: '2026-09-01', value: 4 }],
    },
    filtros: {},
  }

  const getReportCall = interceptNetworkCall({
    method: 'GET',
    url: '**/api/v3/cotacao/relatorio-gerencial/**',
    fulfillResponse: { status: 200, body: reportBody },
  })

  return { getReportCall, reportBody, ...auth }
}

export async function gotoRelatorioGerencialPage(page: Page) {
  await page.goto('/v2/cotacao/cotacoes/relatorio-gerencial', {
    timeout: 90_000,
  })
  await maybeInjectTestIds(page, 'relatorio-gerencial')
}
