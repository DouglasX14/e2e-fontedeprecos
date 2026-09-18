import { faker } from '@faker-js/faker'
import { buildSessionUser, ITEM_FIXTURE_IDS } from './cotacao-item-page'

export const DETALHES_FIXTURE_IDS = {
  COTACAO_ID: 'e2e00000-0000-4000-8000-000000008001',
  LOTE_ID: 1,
  ITEM_ID: ITEM_FIXTURE_IDS.ITEM_ID,
} as const

export type DetalhesItemOverrides = Partial<{
  id: number
  nome: string
  descricao: string
  quant: number
  lote: number | null
  value_mean: number
  value_total: number
  position: number
  ordem: number
}>

export function buildDetalhesItem(overrides: DetalhesItemOverrides = {}) {
  const id = overrides.id ?? DETALHES_FIXTURE_IDS.ITEM_ID
  const quant = overrides.quant ?? 10
  const valueMean = overrides.value_mean ?? 10

  return {
    id,
    nome: overrides.nome ?? 'Caneta Esferográfica Azul',
    descricao: overrides.descricao ?? 'Item de teste E2E Detalhes',
    quant,
    uf: 'SP',
    obs: '',
    position: overrides.position ?? 1,
    ordem: overrides.ordem ?? 1,
    lote: overrides.lote === undefined ? DETALHES_FIXTURE_IDS.LOTE_ID : overrides.lote,
    value_mean: valueMean,
    value_total: overrides.value_total ?? valueMean * quant,
    unit_type: 'Unidade',
    unit: 'UN',
    price_history: [],
  }
}

export type GetItensOverrides = Partial<{
  cotacaoId: string
  cotacaoNome: string
  userName: string
  personalizada: boolean
  itens: ReturnType<typeof buildDetalhesItem>[]
  can_add_users: boolean
  can_send_quotation: boolean
  can_finish: boolean
  can_add_item: boolean
  cat_see_prices: boolean
  governmentPrices: number
  trId: number | string | null
  dataEnvio: string | null
  status: string | null
  customQuoteCredits: {
    disponivel?: number
    limite_mensal?: number
    no_credits?: boolean
    exceeds_credits?: boolean
    needs_item_selection?: boolean
    can_send_all?: boolean
    message?: string
  } | null
}>

/** Happy-path body for `GET /api/v3/cotacao/:id/itens`. */
export function buildGetItensResponse(overrides: GetItensOverrides = {}) {
  const cotacaoId = overrides.cotacaoId ?? DETALHES_FIXTURE_IDS.COTACAO_ID
  const itens =
    overrides.itens ??
    [
      buildDetalhesItem({
        id: DETALHES_FIXTURE_IDS.ITEM_ID,
        nome: 'Caneta Esferográfica Azul',
      }),
    ]

  const pricesQuantity: Record<string, Record<string, number>> = {}
  for (const item of itens) {
    pricesQuantity[String(item.id)] = {
      government_prices: overrides.governmentPrices ?? 3,
      other_public_prices: 0,
      broad_domain: 0,
      direct_quotation: 0,
      invoices: 0,
    }
  }

  return {
    cotacao: {
      id: cotacaoId,
      nome: overrides.cotacaoNome ?? 'Cotação E2E Material de Escritório',
      dt_cotacao: '2026-09-01T12:00:00Z',
      user: {
        name: overrides.userName ?? 'E2E Tester',
        email: 'e2e@fontedeprecos.test',
      },
      personalizada: overrides.personalizada ?? false,
      data_envio:
        overrides.dataEnvio === undefined ? null : overrides.dataEnvio,
      prazo_personalizada: null,
      add_prazo: null,
      justif_add_prazo: null,
      tr_id: overrides.trId === undefined ? null : overrides.trId,
      status: overrides.status === undefined ? null : overrides.status,
      prices_quantity_by_incisor: pricesQuantity,
    },
    itens,
    files: [],
    pca_unidade_id: null,
    can_add_users: overrides.can_add_users ?? false,
    can_send_quotation: overrides.can_send_quotation ?? true,
    can_finish: overrides.can_finish ?? true,
    can_add_item: overrides.can_add_item ?? true,
    cat_see_prices: overrides.cat_see_prices ?? true,
    can_bypass_custom_quote_24h_lock: false,
    custom_quote_credits: overrides.customQuoteCredits ?? null,
  }
}

export function buildLotesResponse(
  lotes: Array<{ id: number; nome: string; descricao?: string; ordem?: number }> = [
    {
      id: DETALHES_FIXTURE_IDS.LOTE_ID,
      nome: 'Lote 1',
      descricao: '',
      ordem: 1,
    },
  ],
) {
  return lotes
}

/** Session with permissions needed for Detalhes happy path. */
export function buildDetalhesSessionUser(
  overrides: Parameters<typeof buildSessionUser>[0] = {},
) {
  return buildSessionUser({
    permissions: [
      'quotation.cotacoes',
      'quotation.detalhes_cotacoes',
      'quotation.editar_item_cotacoes',
      'quotation.excluir_item_cotacoes',
      'quotation.adicionar_item_cotacoes',
      'quotation.adicionar_item_preco_cotacoes',
      'quotation.excluir_item_preco_cotacoes',
    ],
    acesso_cotacao_ia: true,
    ...overrides,
  })
}

export function buildFakeQuotationName() {
  return `Cotação ${faker.commerce.department()} E2E`
}
