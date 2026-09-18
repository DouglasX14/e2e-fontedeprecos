import type { Locator, Page } from '@playwright/test'

/**
 * Injects `data-testid` into the live DOM when the app under test does not ship
 * them (e.g. stock frontend-fp without local E2E patches).
 *
 * Enable auto-inject in page waits: `INJECT_TESTIDS=1`
 * Or call explicitly: `await injectTestIds(page, 'detalhes')`
 */

export type TestIdRule = {
  testId: string
  /** CSS selector evaluated in the page. First match gets the attribute. */
  css: string
  /** If true, set on every match (lists / repeated actions). Default: first only. */
  all?: boolean
}

export type TestIdSurface =
  | 'detalhes'
  | 'item'
  | 'documentos'
  | 'colaboradores'
  | 'direta'

const DETALHES_RULES: TestIdRule[] = [
  { testId: 'detalhes-cotacao-nome', css: 'main p.text-h5.light, main .text-h5.light' },
  { testId: 'detalhes-valor-total', css: 'main p.font-weight-black' },
  { testId: 'detalhes-gerar-relatorio-btn', css: 'button:has-text("Gerar relatório")' },
  { testId: 'detalhes-memorial-btn', css: 'button:has-text("Gerar memorial"), button:has-text("Memorial")' },
  { testId: 'detalhes-cotacao-ia-btn', css: 'button:has-text("Cotação com IA"), button:has-text("Cotação IA")' },
  { testId: 'detalhes-acoes-menu', css: 'button:has-text("Ações")' },
  { testId: 'detalhes-acao-novo-item', css: '[role="menuitem"]:has-text("Novo item"), .v-list-item:has-text("Novo item")' },
  {
    testId: 'detalhes-acao-anexar-documentos',
    css: '[role="menuitem"]:has-text("Anexar documentos"), .v-list-item:has-text("Anexar documentos"), a:has-text("Anexar documentos")',
  },
  {
    testId: 'detalhes-acao-colaboradores',
    css: '[role="menuitem"]:has-text("Selecionar colaboradores"), .v-list-item:has-text("colaboradores")',
  },
  {
    testId: 'detalhes-acao-cotacao-direta',
    css: '[role="menuitem"]:has-text("Cotação direta"), .v-list-item:has-text("Cotação direta")',
  },
  { testId: 'detalhes-enviar-cotacao-btn', css: 'button:has-text("Enviar cotação")' },
  { testId: 'detalhes-prazo-adicional-btn', css: 'button:has-text("Prazo")' },
  { testId: 'detalhes-finalizar-cotacao-btn', css: 'button:has-text("Finalizar")' },
  { testId: 'detalhes-novo-lote-btn', css: 'button:has-text("Novo lote")' },
  { testId: 'detalhes-duplicar-lotes-btn', css: 'button:has-text("Duplicar lotes"), button:has-text("Duplicar lote")' },
  { testId: 'detalhes-lote-com-itens-btn', css: 'button:has-text("Com itens"), button:has-text("lote com itens")' },
  { testId: 'detalhes-mesclar-lotes-btn', css: 'button:has-text("Mesclar")' },
  { testId: 'detalhes-mover-itens-btn', css: 'button:has-text("Mover")' },
  { testId: 'detalhes-filtro-item', css: 'input[aria-label="Nome do item"], label:has-text("Nome do item") + input, .v-text-field:has-text("Nome do item") input' },
  { testId: 'detalhes-filtro-buscar', css: 'button:has(.v-icon):near(input), button.primary:has(.mdi-magnify), button:has(.mdi-magnify)' },
  { testId: 'detalhes-item-link', css: 'a[href*="/v2/cotacoes/item/"]', all: true },
  { testId: 'detalhes-lote-tag', css: 'span.lote-header-tag, .lote-header-tag' },
  { testId: 'detalhes-item-delete-btn', css: 'button:has(.mdi-delete), button[aria-label*="Excluir"]' },
  { testId: 'detalhes-item-duplicate-btn', css: 'button:has(.mdi-content-copy), button[aria-label*="Duplicar"]' },
  { testId: 'detalhes-item-share-btn', css: 'button:has(.mdi-share), button:has(.mdi-export), button[aria-label*="Compartilhar"]' },
  { testId: 'detalhes-ordenar-select', css: 'label:has-text("Ordenar por") ~ div input, .v-select:has-text("Ordenar por")' },
  { testId: 'detalhes-ordenar-option-custom', css: '.v-list-item:has-text("Personalizado"), [role="option"]:has-text("Personalizado")' },
  { testId: 'detalhes-restaurar-ordem-btn', css: 'button:has-text("Restaurar")' },
  { testId: 'detalhes-delete-items-dialog', css: '.v-dialog--active .v-card:has-text("deletar"), .v-dialog--active .v-card:has-text("Excluir")' },
  { testId: 'detalhes-delete-items-confirm', css: '.v-dialog--active button:has-text("Sim, deletar"), .v-dialog--active button:has-text("deletar")' },
  { testId: 'detalhes-duplicate-dialog', css: '.v-dialog--active .v-card:has-text("Duplicar")' },
  { testId: 'detalhes-duplicate-confirm', css: '.v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-share-dialog', css: '.v-dialog--active .v-card:has-text("Compartilhar")' },
  { testId: 'detalhes-share-confirm', css: '.v-dialog--active button:has-text("Confirmar"), .v-dialog--active button:has-text("Compartilhar")' },
  { testId: 'detalhes-lote-dialog', css: '.v-dialog--active .v-card:has-text("lote")' },
  { testId: 'detalhes-lote-nome-input', css: '.v-dialog--active input[type="text"], .v-dialog--active .v-text-field input' },
  { testId: 'detalhes-lote-criar-confirm', css: '.v-dialog--active button:has-text("Criar"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-lote-com-itens-alert', css: '.v-dialog--active .v-alert' },
  { testId: 'detalhes-lote-delete-dialog', css: '.v-dialog--active .v-card:has-text("excluir"), .v-dialog--active .v-card:has-text("Excluir lote")' },
  { testId: 'detalhes-lote-delete-confirm', css: '.v-dialog--active button:has-text("Excluir"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-mesclar-dialog', css: '.v-dialog--active .v-card:has-text("Mesclar")' },
  { testId: 'detalhes-mesclar-nome-input', css: '.v-dialog--active input' },
  { testId: 'detalhes-mesclar-confirm', css: '.v-dialog--active button:has-text("Mesclar"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-duplicar-lotes-dialog', css: '.v-dialog--active .v-card:has-text("Duplicar")' },
  { testId: 'detalhes-duplicar-lotes-nome-input', css: '.v-dialog--active input[type="text"]' },
  { testId: 'detalhes-duplicar-lotes-copiar-precos', css: '.v-dialog--active .v-input--checkbox, .v-dialog--active label:has-text("preço")' },
  { testId: 'detalhes-duplicar-lotes-confirm', css: '.v-dialog--active button:has-text("Confirmar"), .v-dialog--active button:has-text("Duplicar")' },
  { testId: 'detalhes-lote-editar-action', css: '.v-menu__content .v-list-item:has-text("Editar"), [role="menuitem"]:has-text("Editar")' },
  { testId: 'detalhes-lote-excluir-action', css: '.v-menu__content .v-list-item:has-text("Excluir"), [role="menuitem"]:has-text("Excluir")' },
  { testId: 'detalhes-lote-inline-nome', css: 'input.lote-name, .lote-name input, input[type="text"]:near(.lote-name)' },
  { testId: 'detalhes-lote-salvar-inline', css: 'button:has(.mdi-check), button[aria-label*="Salvar"]' },
  { testId: 'detalhes-send-quote-dialog', css: '.v-dialog--active .send-dialog, .v-dialog--active .v-card:has-text("Enviar")' },
  { testId: 'detalhes-enviar-confirm', css: '.v-dialog--active button:has-text("Enviar")' },
  { testId: 'detalhes-send-stat-limit-label', css: '.send-dialog .send-stat__label, .v-dialog--active .send-stat__label' },
  { testId: 'detalhes-prazo-dialog', css: '.v-dialog--active .v-card:has-text("Prazo")' },
  { testId: 'detalhes-prazo-dias-input', css: '.v-dialog--active input[type="number"]' },
  { testId: 'detalhes-prazo-justificativa-input', css: '.v-dialog--active textarea' },
  { testId: 'detalhes-prazo-confirm', css: '.v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-finalizar-dialog', css: '.v-dialog--active .v-card:has-text("Finalizar")' },
  { testId: 'detalhes-finalizar-confirm', css: '.v-dialog--active button:has-text("Finalizar"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'detalhes-ia-access-dialog', css: '.v-dialog--active .v-card:has-text("IA")' },
  { testId: 'detalhes-ia-interesse-btn', css: '.v-dialog--active button:has-text("interesse"), .v-dialog--active button:has-text("Solicitar")' },
  { testId: 'detalhes-mover-lote-select', css: 'label:has-text("lote") ~ div .v-select, .v-select:near(button:has-text("Mover"))' },
]

const ITEM_RULES: TestIdRule[] = [
  { testId: 'item-kpi-total-prices', css: 'main h3' },
  { testId: 'item-kpi-prices-mean', css: 'main h3 >> nth=1' },
  { testId: 'item-formula-select', css: '.v-select:has-text("fórmula"), .v-select:has-text("Fórmula")' },
  { testId: 'item-add-price-btn', css: 'button:has-text("Adicionar"), button:has-text("Incluir")' },
  { testId: 'item-delete-all-btn', css: 'button:has-text("Excluir todos"), button:has-text("Remover todos")' },
  { testId: 'item-delete-all-dialog', css: '.v-dialog--active .v-card' },
  { testId: 'item-delete-all-confirm', css: '.v-dialog--active button:has-text("Excluir"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'item-tab-precos-excluidos', css: '[role="tab"]:has-text("Excluídos"), .v-tab:has-text("Excluídos")' },
  { testId: 'item-tab-historico', css: '[role="tab"]:has-text("Histórico"), .v-tab:has-text("Histórico")' },
  { testId: 'item-tab-grafico-comparativo', css: '[role="tab"]:has-text("Gráfico"), .v-tab:has-text("comparativo")' },
  { testId: 'item-chart-panel', css: '.v-window-item--active .v-row, [class*="chart"]' },
  { testId: 'item-price-toggle-calculate', css: 'input[type="checkbox"], .v-input--selection-controls' },
  { testId: 'item-price-delete-btn', css: 'button:has(.mdi-delete), .mdi-delete', all: true },
  { testId: 'item-price-delete-dialog', css: '.v-dialog--active .v-card:has-text("Excluir")' },
  { testId: 'item-price-delete-confirm', css: '.v-dialog--active button:has-text("Excluir")' },
  { testId: 'item-price-restore-btn', css: 'button:has-text("Restaurar"), button:has(.mdi-restore)' },
  { testId: 'item-price-restore-dialog', css: '.v-dialog--active .v-card:has-text("Restaurar")' },
  { testId: 'item-price-restore-confirm', css: '.v-dialog--active button:has-text("Restaurar"), .v-dialog--active button:has-text("Confirmar")' },
  { testId: 'item-nav-next', css: 'button:has(.mdi-chevron-right), button:has-text("Próximo")' },
  { testId: 'item-nav-prev', css: 'button:has(.mdi-chevron-left), button:has-text("Anterior")' },
]

const DOCUMENTOS_RULES: TestIdRule[] = [
  { testId: 'documentos-page', css: 'main .v-card, main > .v-card' },
  { testId: 'documentos-cotacao-nome', css: 'p.text-h5, .text-h5' },
  { testId: 'documentos-tr-select', css: '.v-select, .v-autocomplete' },
  { testId: 'documentos-aplicar-btn', css: 'button:has-text("Aplicar")' },
]

const COLABORADORES_RULES: TestIdRule[] = [
  { testId: 'colaboradores-page', css: 'main .v-card, main > .v-card' },
  { testId: 'colaboradores-cotacao-nome', css: 'p:has-text("Cotação:")' },
  { testId: 'colaboradores-count', css: 'span.px-4, span:has-text("selecionado")' },
  { testId: 'colaboradores-salvar-btn', css: 'button:has-text("Salvar")' },
]

const DIRETA_RULES: TestIdRule[] = [
  { testId: 'direta-page', css: 'main .v-card, [class*="w-full"]' },
  { testId: 'direta-cotacao-nome', css: 'p.text-h5, .text-h5' },
  { testId: 'direta-fornecedor-select', css: '.v-autocomplete, .v-select:near(label:has-text("Fornecedor"))' },
  { testId: 'direta-unidade-select', css: '.v-select:has-text("Unidade"), label:has-text("Unidade") ~ div' },
  { testId: 'direta-unidade-option-UN', css: '.v-list-item:has-text("UN"), [role="option"]:has-text("UN")' },
  { testId: 'direta-valor-unitario', css: 'input:near(label:has-text("Valor")), label:has-text("Valor") + input' },
  { testId: 'direta-data-cotacao', css: 'input[type="date"], input:near(label:has-text("Data"))' },
  { testId: 'direta-salvar-btn', css: 'button:has-text("Salvar")', all: true },
]

export const TESTID_SURFACES: Record<TestIdSurface, TestIdRule[]> = {
  detalhes: DETALHES_RULES,
  item: ITEM_RULES,
  documentos: DOCUMENTOS_RULES,
  colaboradores: COLABORADORES_RULES,
  direta: DIRETA_RULES,
}

export function isInjectTestIdsEnabled(): boolean {
  const raw = process.env.INJECT_TESTIDS
  return raw === '1' || raw === 'true'
}

/**
 * Sets data-testid on a single element found by Playwright locator / CSS.
 * No-op if the testid already exists (unless force).
 */
export async function ensureTestId(
  page: Page,
  testId: string,
  target: Locator | string,
  options?: { force?: boolean; all?: boolean },
): Promise<boolean> {
  const existing = page.getByTestId(testId)
  if (!options?.force && (await existing.count()) > 0) return false

  const locator =
    typeof target === 'string' ? page.locator(target) : target

  const count = await locator.count()
  if (count === 0) return false

  const limit = options?.all ? count : 1
  for (let i = 0; i < limit; i++) {
    await locator.nth(i).evaluate(
      (el, id) => {
        el.setAttribute('data-testid', id)
      },
      testId,
    )
  }
  return true
}

/**
 * Apply a list of rules or a named surface registry.
 * @returns number of attributes newly set
 */
export async function injectTestIds(
  page: Page,
  surfaceOrRules: TestIdSurface | TestIdRule[],
  options?: { force?: boolean },
): Promise<number> {
  const rules = Array.isArray(surfaceOrRules)
    ? surfaceOrRules
    : TESTID_SURFACES[surfaceOrRules]

  let applied = 0
  for (const rule of rules) {
    const ok = await ensureTestId(page, rule.testId, rule.css, {
      force: options?.force,
      all: rule.all,
    })
    if (ok) applied += 1
  }
  return applied
}

/**
 * Dynamic lote / item row ids used by DnD and lote rename specs.
 */
export async function injectDynamicDetalhesTestIds(
  page: Page,
  options?: { force?: boolean },
): Promise<number> {
  return page.evaluate((force) => {
    let n = 0
    const set = (el: Element | null, id: string) => {
      if (!el) return
      if (!force && el.getAttribute('data-testid') === id) return
      if (!force && el.hasAttribute('data-testid') && el.getAttribute('data-testid') !== id)
        return
      el.setAttribute('data-testid', id)
      n += 1
    }

    document.querySelectorAll('tr.lote-row, tr[class*="lote"]').forEach((tr, idx) => {
      const id =
        tr.getAttribute('data-lote-id') ||
        tr.getAttribute('data-id') ||
        String(idx + 1)
      set(tr, `detalhes-lote-row-${id}`)
      const cb = tr.querySelector('.v-input--checkbox, input[type="checkbox"]')
      if (cb) set(cb.closest('.v-input') || cb, `detalhes-lote-select-${id}`)
      const name = tr.querySelector('.lote-name, .lote-header-tag')
      if (name && name.classList.contains('lote-name')) set(name, `detalhes-lote-nome-${id}`)
    })

    document.querySelectorAll('a[href*="/v2/cotacoes/item/"]').forEach((a) => {
      const m = a.getAttribute('href')?.match(/item\/(\d+)/)
      const row = a.closest('tr')
      if (m && row) set(row, `detalhes-item-row-${m[1]}`)
      set(a, 'detalhes-item-link')
    })

    document.querySelectorAll('.v-list-item, [role="option"]').forEach((opt) => {
      const text = (opt.textContent || '').trim()
      if (/^personalizado$/i.test(text)) set(opt, 'detalhes-ordenar-option-custom')
      if (/^UN$/i.test(text)) set(opt, 'direta-unidade-option-UN')
    })

    return n
  }, options?.force ?? false)
}

/** Convenience: inject surface + dynamic detalhes ids when enabled via env. */
export async function maybeInjectTestIds(
  page: Page,
  surface: TestIdSurface,
): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await injectTestIds(page, surface)
  if (surface === 'detalhes') {
    await injectDynamicDetalhesTestIds(page)
  }
}
