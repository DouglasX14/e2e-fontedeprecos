import { faker } from '@faker-js/faker'

export type CotacaoItemOverrides = Partial<{
  descricao: string
  quantidade: number
  unidade: string
}>

/** Factory for cotação item payloads used in API setup / UI stubs. */
export function buildCotacaoItem(overrides: CotacaoItemOverrides = {}) {
  return {
    descricao: overrides.descricao ?? faker.commerce.productName(),
    quantidade: overrides.quantidade ?? faker.number.int({ min: 1, max: 100 }),
    unidade: overrides.unidade ?? 'UN',
  }
}

export type UserOverrides = Partial<{
  email: string
  name: string
}>

export function buildTestUser(overrides: UserOverrides = {}) {
  return {
    email: overrides.email ?? faker.internet.email().toLowerCase(),
    name: overrides.name ?? faker.person.fullName(),
  }
}

export {
  FORMULA_MEDIA_ARITMETICA,
  FORMULA_MEDIANA,
  ITEM_FIXTURE_IDS,
  buildSessionUser,
  buildPrice,
  buildGetPricesResponse,
  buildPriceHistoryResponse,
} from './cotacao-item-page'

export type {
  GetPricesOverrides,
  PriceOverrides,
  SessionUserOverrides,
} from './cotacao-item-page'

export {
  DETALHES_FIXTURE_IDS,
  buildDetalhesItem,
  buildGetItensResponse,
  buildLotesResponse,
  buildDetalhesSessionUser,
} from './cotacao-detalhes-page'

export type {
  DetalhesItemOverrides,
  GetItensOverrides,
} from './cotacao-detalhes-page'
