import { faker } from '@faker-js/faker'

/** Formula ids aligned with ITEMS_FORMULA on the Item v2 page. */
export const FORMULA_MEDIA_ARITMETICA = 2
export const FORMULA_MEDIANA = 3

export const ITEM_FIXTURE_IDS = {
  ITEM_ID: 9001,
  NEXT_ITEM_ID: 9002,
  PREV_ITEM_ID: 9000,
  COTACAO_ID: 8001,
  ACTIVE_PRICE_ID: 1001,
  EXCLUDED_PRICE_REF_ID: 'ref-excluded-1',
  EXCLUDED_SITE_PRICE_ID: 'site-excluded-1',
} as const

export type SessionUserOverrides = Partial<{
  name: string
  email: string
  permissions: string[]
  acesso_cotacao_ia: boolean
  equipe_fonte: boolean
}>

/** Session payload returned by `/api/check-session`. */
export function buildSessionUser(overrides: SessionUserOverrides = {}) {
  return {
    name: overrides.name ?? 'E2E Tester',
    email: overrides.email ?? 'e2e@fontedeprecos.test',
    tenant: {
      name: 'Tenant E2E',
      schema: 'cliente',
      host: 'cliente.local',
      preferences: { decimal_places: 2 },
      plan: { name: 'PROFESSIONAL', years_filter_limit: null },
    },
    groups: [],
    permissions: overrides.permissions ?? [
      'quotation.cotacoes',
      'quotation.detalhes_cotacoes',
      'quotation.editar_item_cotacoes',
      'quotation.excluir_item_preco_cotacoes',
    ],
    acesso_cotacao_ia: overrides.acesso_cotacao_ia ?? false,
    equipe_fonte: overrides.equipe_fonte ?? false,
  }
}

export type PriceOverrides = Partial<{
  id: number | string
  base: string
  descricao: string
  valor_unitario: string
  excluido: boolean
  usar_no_calculo: boolean
  priceRefId: number | string
}>

export function buildPrice(overrides: PriceOverrides = {}) {
  const id = overrides.id ?? faker.number.int({ min: 1000, max: 9999 })
  const excluido = overrides.excluido ?? false
  const priceRefId = overrides.priceRefId ?? id

  return {
    id,
    base: overrides.base ?? 'comprasnet',
    descricao: overrides.descricao ?? faker.commerce.productName(),
    descricao_comp: 'Produto homologado',
    quant: '10',
    unidade: 'UN',
    uf: 'SP',
    dt_homologacao: '15/01/2025',
    valor_unitario: overrides.valor_unitario ?? '10,00',
    excluido,
    price_ref: {
      id: priceRefId,
      excluido,
      usar_no_calculo: overrides.usar_no_calculo ?? !excluido,
      preco_alternativo: null,
      use_preco_original: true,
      formula_escolhida: '',
      indice_utilizado: '',
      aplicado_via_ia: false,
    },
    avaliacao: { text: 'Válido', status: 'ok' },
  }
}

export type GetPricesOverrides = Partial<{
  itemId: number | string
  itemNome: string
  cotacaoId: number
  cotacaoNome: string
  formulaCalculo: number
  totalPrices: number
  pricesMean: number
  pricesMedian: number
  quotationMean: number
  standardDeviation: number
  coefficientOfVariation: number
  includeExcludedPrice: boolean
  prices: ReturnType<typeof buildPrice>[]
  prevItem: number | null
  nextItem: number | null
}>

/** Happy-path body for `GET /api/v3/cotacao-item/:id/get-prices/`. */
export function buildGetPricesResponse(overrides: GetPricesOverrides = {}) {
  const itemId = overrides.itemId ?? ITEM_FIXTURE_IDS.ITEM_ID
  const cotacaoId = overrides.cotacaoId ?? ITEM_FIXTURE_IDS.COTACAO_ID
  const includeExcludedPrice = overrides.includeExcludedPrice ?? false

  const activePrice = buildPrice({
    id: ITEM_FIXTURE_IDS.ACTIVE_PRICE_ID,
    base: 'comprasnet',
    descricao: 'Caneta Azul Homologada',
    valor_unitario: '10,00',
  })

  const excludedPrice = buildPrice({
    id: ITEM_FIXTURE_IDS.EXCLUDED_SITE_PRICE_ID,
    base: 'dominioamplo',
    descricao: 'Caneta Azul Excluída',
    valor_unitario: '12,00',
    excluido: true,
    usar_no_calculo: false,
    priceRefId: ITEM_FIXTURE_IDS.EXCLUDED_PRICE_REF_ID,
  })

  const prices =
    overrides.prices ??
    (includeExcludedPrice ? [activePrice, excludedPrice] : [activePrice])

  return {
    quotation_item: {
      id: itemId,
      nome: overrides.itemNome ?? 'Caneta Esferográfica Azul',
      descricao: 'Item de teste E2E',
      quant: 100,
      unidade: 'UN',
      uf: 'SP',
      position: 1,
      formula_calculo: overrides.formulaCalculo ?? FORMULA_MEDIA_ARITMETICA,
      lote: null,
      pca_unidade_id: null,
      cotacao: {
        id: cotacaoId,
        nome: overrides.cotacaoNome ?? 'Cotação E2E Material de Escritório',
        codigo: 'COT-E2E-001',
      },
    },
    prev_item: overrides.prevItem ?? null,
    next_item: overrides.nextItem ?? ITEM_FIXTURE_IDS.NEXT_ITEM_ID,
    total_prices: overrides.totalPrices ?? prices.filter((p) => !p.excluido).length,
    prices,
    prices_mean: overrides.pricesMean ?? 10,
    prices_median: overrides.pricesMedian ?? 10,
    quotation_mean: overrides.quotationMean ?? 1000,
    standard_deviation: overrides.standardDeviation ?? 0,
    coefficient_of_variation: overrides.coefficientOfVariation ?? 0,
    totals: { comprasnet: 1 },
  }
}

export function buildPriceHistoryResponse(
  events: Array<Record<string, unknown>> = [],
) {
  return { results: events }
}
