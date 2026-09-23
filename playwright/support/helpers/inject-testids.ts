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
  | 'adicionar-item'
  | 'editar-item'
  | 'expressa'
  | 'lista'
  | 'importar-itens'
  | 'ia'
  | 'compartilhar'
  | 'editar-cotacao'
  | 'relatorio-gerencial'

const DETALHES_RULES: TestIdRule[] = [
  { testId: 'detalhes-cotacao-nome', css: 'main p.text-h5.light, main .text-h5.light' },
  { testId: 'detalhes-valor-total', css: 'main p.font-weight-black' },
  { testId: 'detalhes-gerar-relatorio-btn', css: 'button:has-text("Gerar relatório")' },
  { testId: 'detalhes-memorial-btn', css: 'button:has-text("Gerar memorial de cálculo"), button:has-text("Gerar memorial")' },
  // Cotação IA renders as <a> or button inside .cotacao-ia-btn-wrap
  { testId: 'detalhes-cotacao-ia-btn', css: '.cotacao-ia-btn, a.cotacao-ia-btn, button:has-text("Cotação com IA")' },
  { testId: 'detalhes-acoes-menu', css: 'button:has-text("Ações")' },
  {
    testId: 'detalhes-acao-novo-item',
    css: '.v-menu__content .v-list-item:has-text("Novo item"), [role="menuitem"]:has-text("Novo item")',
  },
  {
    testId: 'detalhes-acao-anexar-documentos',
    css: '.v-menu__content .v-list-item:has-text("Anexar documentos"), [role="menuitem"]:has-text("Anexar documentos")',
  },
  {
    testId: 'detalhes-acao-colaboradores',
    css: '.v-menu__content .v-list-item:has-text("Selecionar colaboradores"), [role="menuitem"]:has-text("colaboradores")',
  },
  {
    testId: 'detalhes-acao-cotacao-direta',
    css: '.v-menu__content .v-list-item:has-text("Cotação direta"), [role="menuitem"]:has-text("Cotação direta")',
  },
  { testId: 'detalhes-enviar-cotacao-btn', css: 'button:has-text("Enviar cotação")' },
  { testId: 'detalhes-prazo-adicional-btn', css: 'button:has-text("Prazo adicional"), button:has-text("Prazo")' },
  { testId: 'detalhes-finalizar-cotacao-btn', css: 'button:has-text("Finalizar")' },
  { testId: 'detalhes-novo-lote-btn', css: '.lotes-quick-actions button:has-text("Novo lote"), button:has-text("Novo lote")' },
  // Stock UI label (not "Duplicar lotes" — that text is only the confirm CTA)
  {
    testId: 'detalhes-duplicar-lotes-btn',
    css: 'button:has-text("Gerar nova cotação a partir de lote"), button:has-text("Duplicar lotes")',
  },
  { testId: 'detalhes-lote-com-itens-btn', css: 'button:has-text("Com itens")' },
  { testId: 'detalhes-mesclar-lotes-btn', css: 'button:has-text("Mesclar lotes"), button:has-text("Mesclar")' },
  { testId: 'detalhes-mover-itens-btn', css: '.lotes-batch-actions button:has-text("Mover"), button:has-text("Mover")' },
  { testId: 'detalhes-filtro-item', css: 'input[aria-label="Nome do item"], label:has-text("Nome do item") + input, .v-text-field:has-text("Nome do item") input' },
  { testId: 'detalhes-filtro-buscar', css: 'button:has(.mdi-magnify)' },
  // Text link only — exclude icon v-btn that also points at /item/
  {
    testId: 'detalhes-item-link',
    css: 'a.text-decoration-none[href*="/v2/cotacoes/item/"]',
    all: true,
  },
  { testId: 'detalhes-lote-tag', css: 'span.lote-header-tag, .lote-header-tag' },
  // Row actions — stock uses mdi-file-check (not content-copy) for Duplicar
  { testId: 'detalhes-item-delete-btn', css: 'button:has(.mdi-delete)' },
  { testId: 'detalhes-item-duplicate-btn', css: 'button:has(.mdi-file-check), button:has(.mdi-content-copy)' },
  { testId: 'detalhes-item-share-btn', css: 'button:has(.mdi-share)' },
  { testId: 'detalhes-ordenar-select', css: '.v-select:has-text("Ordenar por"), label:has-text("Ordenar por") ~ div' },
  { testId: 'detalhes-ordenar-option-custom', css: '.v-menu__content .v-list-item:has-text("Personalizado"), [role="option"]:has-text("Personalizado")' },
  { testId: 'detalhes-restaurar-ordem-btn', css: 'button:has-text("Restaurar ordenação"), button:has-text("Restaurar")' },
  // Dialogs: CSS :has-text is unreliable — also mapped via injectOpenDetalhesDialogs
  { testId: 'detalhes-delete-items-dialog', css: '[role="dialog"]:has-text("deletar")' },
  { testId: 'detalhes-delete-items-confirm', css: '[role="dialog"] button:has-text("Sim, deletar")' },
  { testId: 'detalhes-duplicate-dialog', css: '[role="dialog"]:has-text("duplicar os itens")' },
  { testId: 'detalhes-duplicate-confirm', css: '[role="dialog"]:has-text("duplicar") button:has-text("Confirmar")' },
  { testId: 'detalhes-share-dialog', css: '[role="dialog"]:has-text("Compartilhar item")' },
  { testId: 'detalhes-share-confirm', css: '[role="dialog"]:has-text("Compartilhar item") button:has-text("Compartilhar")' },
  { testId: 'detalhes-lote-dialog', css: '[role="dialog"]:has-text("Criar lote"), [role="dialog"]:has-text("Novo lote")' },
  { testId: 'detalhes-lote-nome-input', css: '[role="dialog"] input[type="text"]' },
  { testId: 'detalhes-lote-criar-confirm', css: '[role="dialog"] button:has-text("Criar")' },
  { testId: 'detalhes-lote-com-itens-alert', css: '[role="dialog"] .v-alert' },
  { testId: 'detalhes-lote-delete-dialog', css: '[role="dialog"]:has-text("Excluir lote")' },
  { testId: 'detalhes-lote-delete-confirm', css: '[role="dialog"] button:has-text("Sim, excluir")' },
  { testId: 'detalhes-mesclar-dialog', css: '[role="dialog"]:has-text("Mesclar")' },
  { testId: 'detalhes-mesclar-nome-input', css: '[role="dialog"]:has-text("Mesclar") input[type="text"]' },
  { testId: 'detalhes-mesclar-confirm', css: '[role="dialog"] button:has-text("Mesclar lotes")' },
  { testId: 'detalhes-duplicar-lotes-dialog', css: '[role="dialog"]:has-text("Nova cotação a partir de lotes")' },
  { testId: 'detalhes-duplicar-lotes-nome-input', css: '[role="dialog"]:has-text("Nova cotação") input[type="text"]' },
  { testId: 'detalhes-duplicar-lotes-copiar-precos', css: '[role="dialog"] .v-input--checkbox:has-text("Copiar preços"), [role="dialog"] label:has-text("Copiar preços")' },
  { testId: 'detalhes-duplicar-lotes-confirm', css: '[role="dialog"] button:has-text("Duplicar lotes")' },
  { testId: 'detalhes-lote-editar-action', css: '.v-menu__content .v-list-item:has-text("Editar"), [role="menuitem"]:has-text("Editar")' },
  { testId: 'detalhes-lote-excluir-action', css: '.v-menu__content .v-list-item:has-text("Excluir"), [role="menuitem"]:has-text("Excluir")' },
  { testId: 'detalhes-lote-inline-nome', css: 'input.lote-input-inline' },
  { testId: 'detalhes-lote-salvar-inline', css: '.lote-edit-actions button:has(.mdi-check)' },
  { testId: 'detalhes-send-quote-dialog', css: '[role="dialog"] .send-dialog, .send-custom-quote-dialog .send-dialog' },
  { testId: 'detalhes-enviar-confirm', css: '[role="dialog"] .send-dialog__btn-primary, .send-dialog a.send-dialog__btn-primary' },
  { testId: 'detalhes-send-stat-limit-label', css: '.send-dialog .send-stat__label' },
  { testId: 'detalhes-prazo-dialog', css: '[role="dialog"]:has-text("prazo adicional")' },
  { testId: 'detalhes-prazo-dias-input', css: '[role="dialog"]:has-text("prazo") input[type="number"]' },
  { testId: 'detalhes-prazo-justificativa-input', css: '[role="dialog"]:has-text("prazo") textarea' },
  { testId: 'detalhes-prazo-confirm', css: '[role="dialog"]:has-text("prazo") button:has-text("Confirmar")' },
  { testId: 'detalhes-finalizar-dialog', css: '[role="dialog"]:has-text("Finalizar cotação")' },
  { testId: 'detalhes-finalizar-confirm', css: '[role="dialog"] button:has-text("Finalizar cotação")' },
  { testId: 'detalhes-ia-access-dialog', css: '[role="dialog"]:has-text("não contratado"), [role="dialog"]:has-text("Cotação com IA")' },
  { testId: 'detalhes-ia-interesse-btn', css: '[role="dialog"] button:has-text("interesse"), [role="dialog"] button:has-text("Solicitar")' },
  { testId: 'detalhes-mover-lote-select', css: '.lote-select-batch, .lotes-batch-actions .v-select' },
]

const ITEM_RULES: TestIdRule[] = [
  // KPI row — Vuetify 2 renders v-col as .col (not .v-col); avoid CotacaoItemDetalhes h3#title
  {
    testId: 'item-kpi-total-prices',
    css: 'main .v-card .col:has(.mdi-counter) h3, main .v-card .col:has-text("Qnt. Preços") h3, main h3:not(#title)',
  },
  {
    testId: 'item-kpi-prices-mean',
    css: 'main .v-card .col:has(.mdi-chart-box-outline) h3, main .v-card .col:has-text("Média dos Preços") h3',
  },
  {
    testId: 'item-formula-select',
    css: '.v-select:has-text("fórmula"), .v-select:has-text("Fórmula"), .v-select:has-text("Selecione a fórmula")',
  },
  { testId: 'item-add-price-btn', css: 'button:has-text("Adicionar"), button:has-text("Incluir")' },
  {
    testId: 'item-delete-all-btn',
    css: 'button:has-text("excluir preços"), button:has-text("Excluir todos"), button:has-text("Remover todos")',
  },
  {
    testId: 'item-delete-all-dialog',
    css: '[role="dialog"]:has-text("Excluir preços"), .v-dialog--active .v-card:has-text("Excluir preços")',
  },
  {
    testId: 'item-delete-all-confirm',
    css: '[role="dialog"]:has-text("Excluir preços") button:has-text("Excluir")',
  },
  // CotacaoItemTab uses v-list-item (a11y option), not v-tab
  {
    testId: 'item-tab-precos-excluidos',
    css: '.tab-menu .v-list-item:has-text("Preços Excluídos"), .v-list-item:has-text("Preços Excluídos"), [role="option"]:has-text("Preços Excluídos")',
  },
  {
    testId: 'item-tab-historico',
    css: '.tab-menu .v-list-item:has-text("Histórico"), .v-list-item:has-text("Histórico de Alterações"), [role="option"]:has-text("Histórico")',
  },
  {
    testId: 'item-tab-grafico-comparativo',
    css: '.tab-menu .v-list-item:has-text("Gráfico"), .v-list-item:has-text("Gráfico Comparativo"), [role="option"]:has-text("Gráfico")',
  },
  { testId: 'item-chart-panel', css: 'canvas, .apexcharts-canvas, [class*="chartjs"], .v-card canvas' },
  // Toggle is v-icon (tooltip text only) — close-circle = off, check-circle = on
  {
    testId: 'item-price-toggle-calculate',
    css: '.v-expansion-panel .mdi-close-circle, .v-expansion-panel .mdi-check-circle',
  },
  // Scope to expansion panel — tab "Preços Excluídos" also uses mdi-delete
  {
    testId: 'item-price-delete-btn',
    css: '.v-expansion-panel .mdi-delete',
    all: true,
  },
  {
    testId: 'item-price-delete-dialog',
    css: '[role="dialog"]:has-text("excluídos"), [role="dialog"]:has-text("Excluir preço"), .v-dialog--active .v-card:has-text("excluídos")',
  },
  {
    testId: 'item-price-delete-confirm',
    css: '[role="dialog"]:has-text("excluídos") button:has-text("Excluir"), [role="dialog"]:has-text("Excluir preço") button:has-text("Excluir")',
  },
  {
    testId: 'item-price-restore-btn',
    css: '.v-expansion-panel .mdi-restore, .v-expansion-panel button:has-text("Restaurar")',
  },
  {
    testId: 'item-price-restore-dialog',
    css: '[role="dialog"]:has-text("Restaurar"), [role="dialog"]:has-text("restaurado"), .v-dialog--active .v-card:has-text("Restaurar")',
  },
  {
    testId: 'item-price-restore-confirm',
    css: '[role="dialog"] button:has-text("Restaurar"), .v-dialog--active button:has-text("Restaurar")',
  },
  // CotacaoItemDetalhes uses mdi-arrow-right / mdi-arrow-left
  { testId: 'item-nav-next', css: 'button:has(.mdi-arrow-right), button:has(.mdi-chevron-right)' },
  { testId: 'item-nav-prev', css: 'button:has(.mdi-arrow-left), button:has(.mdi-chevron-left)' },
]

const DOCUMENTOS_RULES: TestIdRule[] = [
  { testId: 'documentos-page', css: 'main .v-card, .v-card.pa-4' },
  { testId: 'documentos-cotacao-nome', css: 'p.text-h5, .text-h5' },
  // TR is the 4th autocomplete (DFD, ETP, GRMR, TR)
  {
    testId: 'documentos-tr-select',
    css: 'label:has-text("Termo de Referência") ~ * .v-autocomplete, .v-row:has-text("Termo de Referência") .v-autocomplete',
  },
  { testId: 'documentos-aplicar-btn', css: 'button:has-text("Aplicar")' },
]

const COLABORADORES_RULES: TestIdRule[] = [
  { testId: 'colaboradores-page', css: 'main .v-card, .v-card.pa-2' },
  { testId: 'colaboradores-cotacao-nome', css: 'p:has-text("Cotação:")' },
  { testId: 'colaboradores-count', css: 'span.px-4, span:has-text("selecionado")' },
  { testId: 'colaboradores-salvar-btn', css: 'button:has-text("Salvar Seleção"), button:has-text("Salvar")' },
]

const DIRETA_RULES: TestIdRule[] = [
  { testId: 'direta-page', css: 'main .v-card, .v-card.w-full' },
  { testId: 'direta-cotacao-nome', css: 'p.text-h5, .text-h5' },
  { testId: 'direta-fornecedor-select', css: '.v-autocomplete:has-text("Fornecedor"), label:has-text("Fornecedor") ~ input, .v-autocomplete' },
  { testId: 'direta-unidade-select', css: '.v-select:has-text("Unidade de medida"), label:has-text("Unidade de medida") ~ div' },
  { testId: 'direta-unidade-option-UN', css: '.v-menu__content .v-list-item:has-text("Unidade"), .v-list-item:has-text("UN"), [role="option"]:has-text("UN")' },
  { testId: 'direta-valor-unitario', css: 'label:has-text("Valor Unitário") ~ input, .v-text-field:has-text("Valor Unitário") input' },
  { testId: 'direta-data-cotacao', css: 'input[type="date"], label:has-text("Data da Cotação") ~ input' },
  { testId: 'direta-salvar-btn', css: 'button:has-text("Salvar")', all: true },
]

const ADICIONAR_ITEM_RULES: TestIdRule[] = [
  { testId: 'adicionar-item-page', css: 'main .v-card.w-full, main .v-card' },
  { testId: 'adicionar-item-cotacao-nome', css: 'main p.text-h5.light, main .text-h5.light, main p.text-h5' },
  { testId: 'adicionar-item-nome', css: 'label:has-text("Nome") ~ input, .v-text-field:has-text("Nome") input' },
  {
    testId: 'adicionar-item-quantidade',
    css: 'label:has-text("Quantidade") ~ input, .v-text-field:has-text("Quantidade") input',
  },
  {
    testId: 'adicionar-item-unidade',
    css: '.v-select:has-text("Unidade de medida"), label:has-text("Unidade de medida") ~ div',
  },
  { testId: 'adicionar-item-lote', css: '.v-select:has-text("Lote"), label:has-text("Lote") ~ div' },
  {
    testId: 'adicionar-item-descricao',
    css: 'label:has-text("Descri") ~ input, .v-text-field:has-text("Descri") input',
  },
  {
    testId: 'adicionar-item-submit',
    css: 'button:has-text("Adicionar"), button:has-text("Salvar")',
  },
  {
    testId: 'adicionar-item-voltar',
    css: 'a:has-text("Voltar"), button:has-text("Voltar")',
  },
]

const EXPRESSA_RULES: TestIdRule[] = [
  { testId: 'expressa-page', css: 'main .cotacao-detail-root, main .v-card, main' },
  {
    testId: 'expressa-item-nome',
    css: '.item-header__description, .cotacao-detail-card .item-header',
  },
  {
    testId: 'expressa-keyword',
    css: 'label:has-text("Descrição") ~ input, label:has-text("Palavra chave") ~ input, .v-text-field:has-text("Descrição") input, .v-autocomplete:has-text("Palavra chave") input',
  },
  { testId: 'expressa-buscar-btn', css: 'button:has-text("Buscar")' },
  {
    testId: 'expressa-results',
    css: 'main .v-card:has-text("Foram encontrados"), main .v-card-subtitle:has-text("homologados")',
  },
]

const LISTA_RULES: TestIdRule[] = [
  { testId: 'lista-page', css: 'main .v-card, main' },
  {
    testId: 'lista-adicionar-cotacao',
    css: 'a:has-text("Adicionar cotação"), button:has-text("Adicionar cotação")',
  },
  {
    testId: 'lista-filtro-input',
    css: 'label:has-text("Filtrar cotações") ~ input, .v-text-field:has-text("Filtrar cotações") input',
  },
  {
    testId: 'lista-filtro-buscar',
    css: 'button:has(.mdi-magnify)',
  },
  {
    testId: 'lista-filtro-andamento',
    css: 'button:has-text("Cotações em andamento")',
  },
  {
    testId: 'lista-cotacao-link',
    css: 'td span.primary--text, span.text-caption.primary--text',
    all: true,
  },
]

// Same CotacaoItemForm as adicionar — Salvar instead of Adicionar
const EDITAR_ITEM_RULES: TestIdRule[] = [
  { testId: 'editar-item-page', css: 'main .v-card.w-full, main .v-card' },
  { testId: 'editar-item-cotacao-nome', css: 'main p.text-h5.light, main .text-h5.light, main p.text-h5' },
  { testId: 'editar-item-nome', css: 'label:has-text("Nome") ~ input, .v-text-field:has-text("Nome") input' },
  {
    testId: 'editar-item-quantidade',
    css: 'label:has-text("Quantidade") ~ input, .v-text-field:has-text("Quantidade") input',
  },
  { testId: 'editar-item-submit', css: 'button:has-text("Salvar")' },
  { testId: 'editar-item-voltar', css: 'a:has-text("Voltar"), button:has-text("Voltar")' },
]

const IMPORTAR_ITENS_RULES: TestIdRule[] = [
  { testId: 'importar-itens-page', css: 'main .v-card, main' },
  {
    testId: 'importar-itens-cotacao-nome',
    css: 'main p.text-h5, main .text-h5',
  },
  {
    testId: 'importar-itens-modelo',
    css: 'a:has-text("Baixar planilha modelo"), a[href*="Example.xlsx"]',
  },
  {
    testId: 'importar-itens-escolher',
    css: 'button:has-text("Escolher Arquivo")',
  },
  {
    testId: 'importar-itens-file',
    css: 'input[type="file"][accept*="xls"]',
  },
  {
    testId: 'importar-itens-submit',
    css: 'button:has-text("Importar itens")',
  },
  {
    testId: 'importar-itens-cancelar',
    css: 'button:has-text("Cancelar")',
  },
]

const IA_RULES: TestIdRule[] = [
  { testId: 'ia-page', css: 'main .cotar-ia-page, main .v-card, main' },
  {
    testId: 'ia-titulo',
    css: 'main p.text-h5:has-text("Cotação com IA"), main .text-h6:has-text("Módulo Cotação com IA")',
  },
  {
    testId: 'ia-sem-acesso',
    css: 'main .v-card:has-text("não contratado"), main .text-h6:has-text("não contratado")',
  },
  {
    testId: 'ia-tenho-interesse',
    css: 'a:has-text("Tenho interesse"), button:has-text("Tenho interesse")',
  },
  {
    testId: 'ia-voltar',
    css: 'a:has-text("Voltar aos detalhes"), button:has-text("Voltar aos detalhes")',
  },
  {
    testId: 'ia-cotacao-nome',
    css: '.cotar-ia-header .text-body-2, .cotar-ia-header p.grey--text',
  },
  {
    testId: 'ia-itens-panel',
    css: '.cotar-ia-panel:has-text("Itens da cotação"), .cotar-ia-select',
  },
]

const COMPARTILHAR_RULES: TestIdRule[] = [
  { testId: 'compartilhar-page', css: 'main .v-card, main' },
  {
    testId: 'compartilhar-cotacao-nome',
    css: 'main p.text-h5, main .text-h5',
  },
  {
    testId: 'compartilhar-email',
    css: 'label:has-text("Email") ~ .v-input input, .v-text-field input[placeholder*="Email"]',
  },
  {
    testId: 'compartilhar-obs',
    css: 'label:has-text("Observações") ~ .v-input textarea, .v-textarea textarea',
  },
  { testId: 'compartilhar-submit', css: 'button:has-text("Compartilhar")' },
  { testId: 'compartilhar-cancelar', css: 'button:has-text("Cancelar")' },
]

const EDITAR_COTACAO_RULES: TestIdRule[] = [
  { testId: 'editar-cotacao-page', css: 'main .v-card.w-full, main .v-card' },
  {
    testId: 'editar-cotacao-nome',
    css: 'label:has-text("Nome da Cotação") ~ input, .v-text-field:has-text("Nome da Cotação") input',
  },
  {
    testId: 'editar-cotacao-obs',
    css: 'label:has-text("Observações") ~ textarea, .v-textarea:has-text("Observações") textarea',
  },
  { testId: 'editar-cotacao-submit', css: 'button:has-text("Salvar")' },
  {
    testId: 'editar-cotacao-voltar',
    css: 'a:has-text("Voltar"), button:has-text("Voltar")',
  },
]

const RELATORIO_GERENCIAL_RULES: TestIdRule[] = [
  { testId: 'relatorio-gerencial-page', css: 'main .filter-card, main' },
  {
    testId: 'relatorio-gerencial-aplicar',
    css: 'button:has-text("Aplicar filtros"), button:has-text("Aplicar")',
  },
  {
    testId: 'relatorio-gerencial-exportar',
    css: 'button:has-text("Exportar")',
  },
  {
    testId: 'relatorio-gerencial-kpis',
    css: '.kpi-grid, .kpi-card',
  },
  {
    testId: 'relatorio-gerencial-tabela',
    css: 'main .v-data-table, main .v-card:has-text("Resumo por usuário")',
  },
]

export const TESTID_SURFACES: Record<TestIdSurface, TestIdRule[]> = {
  detalhes: DETALHES_RULES,
  item: ITEM_RULES,
  documentos: DOCUMENTOS_RULES,
  colaboradores: COLABORADORES_RULES,
  direta: DIRETA_RULES,
  'adicionar-item': ADICIONAR_ITEM_RULES,
  'editar-item': EDITAR_ITEM_RULES,
  expressa: EXPRESSA_RULES,
  lista: LISTA_RULES,
  'importar-itens': IMPORTAR_ITENS_RULES,
  ia: IA_RULES,
  compartilhar: COMPARTILHAR_RULES,
  'editar-cotacao': EDITAR_COTACAO_RULES,
  'relatorio-gerencial': RELATORIO_GERENCIAL_RULES,
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
 * Walks the Vue page instance to resolve real lote ids (stock DOM has none).
 */
export async function injectDynamicDetalhesTestIds(
  page: Page,
  options?: { force?: boolean },
): Promise<number> {
  return page.evaluate((force) => {
    let n = 0
    const set = (el: Element | null | undefined, id: string) => {
      if (!el) return
      if (!force && el.getAttribute('data-testid') === id) return
      if (
        !force &&
        el.hasAttribute('data-testid') &&
        el.getAttribute('data-testid') !== id
      ) {
        return
      }
      el.setAttribute('data-testid', id)
      n += 1
    }

    type VueLike = {
      lotes?: Array<{ id: number; nome?: string }>
      objects?: Array<{ id: number; lote?: number | null }>
      $children?: VueLike[]
    }

    const findDetalhesVm = (vm: VueLike | null | undefined, depth = 0): VueLike | null => {
      if (!vm || depth > 50) return null
      if (Array.isArray(vm.lotes) && vm.lotes.length >= 0 && 'objects' in vm) return vm
      if (Array.isArray(vm.lotes)) return vm
      for (const child of vm.$children || []) {
        const found = findDetalhesVm(child, depth + 1)
        if (found) return found
      }
      return null
    }

    let pageVm: VueLike | null = null
    const nuxt = (window as unknown as { $nuxt?: VueLike }).$nuxt
    if (nuxt) pageVm = findDetalhesVm(nuxt)

    if (!pageVm) {
      const rootEl =
        document.querySelector('#__layout') ||
        document.querySelector('#__nuxt') ||
        document.querySelector('#app')
      pageVm = findDetalhesVm((rootEl as { __vue__?: VueLike } | null)?.__vue__ || null)
    }

    if (!pageVm) {
      const nodes = document.querySelectorAll('*')
      for (let i = 0; i < nodes.length; i++) {
        const vm = (nodes[i] as { __vue__?: VueLike }).__vue__
        if (vm && Array.isArray(vm.lotes) && vm.lotes.length) {
          pageVm = vm
          break
        }
      }
    }

    const lotes = pageVm?.lotes || []

    // Gestão de lotes cards — prefer Vue id, else match by visible name
    document.querySelectorAll('.lote-item').forEach((el, idx) => {
      const name = (el.querySelector('.lote-name')?.textContent || '').trim()
      const matched = lotes.find((l) => (l.nome || '').trim() === name)
      const id = matched?.id ?? lotes[idx]?.id ?? idx + 1
      set(el, `detalhes-lote-card-${id}`)
      set(el.querySelector('.lote-name'), `detalhes-lote-nome-${id}`)
      const menuBtn = el.querySelector('.lote-actions-inline button')
      set(menuBtn, `detalhes-lote-menu-${id}`)
      // Inline edit controls (when present)
      const inlineInput = el.querySelector('input.lote-input-inline')
      set(inlineInput, 'detalhes-lote-inline-nome')
      el.querySelectorAll('.lote-edit-actions button').forEach((btn) => {
        if (btn.querySelector('.mdi-check')) set(btn, 'detalhes-lote-salvar-inline')
        if (btn.querySelector('.mdi-close')) set(btn, 'detalhes-lote-cancelar-inline')
      })
    })

    // Table lote header rows (same order as groupedItems ≈ lotes with items + empty)
    document.querySelectorAll('tr.lote-row').forEach((tr, idx) => {
      const nameEl = tr.querySelector('.lote-header-name')
      const nameText = (nameEl?.textContent || '').trim().toUpperCase()
      let id: number | string = idx + 1
      const matched = lotes.find((l) => {
        const label = `${l.ordem || ''} - ${(l.nome || '').toUpperCase()}`.trim()
        return (
          nameText.includes((l.nome || '').toUpperCase()) ||
          nameText === label ||
          nameText.endsWith((l.nome || '').toUpperCase())
        )
      })
      if (matched) id = matched.id
      else if (lotes[idx]) id = lotes[idx].id

      set(tr, `detalhes-lote-row-${id}`)
      const cb = tr.querySelector('.v-simple-checkbox, .v-input--checkbox, input[type="checkbox"]')
      if (cb) set(cb.closest('.v-simple-checkbox') || cb.closest('.v-input') || cb, `detalhes-lote-select-${id}`)
    })

    // Item rows + select checkboxes (id from /item/:id link)
    document.querySelectorAll('a.text-decoration-none[href*="/v2/cotacoes/item/"]').forEach((a) => {
      const m = a.getAttribute('href')?.match(/item\/(\d+)/)
      const row = a.closest('tr')
      if (!m || !row) return
      const itemId = m[1]
      set(row, `detalhes-item-row-${itemId}`)
      set(a, 'detalhes-item-link')
      const cb = row.querySelector('.v-simple-checkbox, .v-input--checkbox, input[type="checkbox"]')
      if (cb) {
        set(
          cb.closest('.v-simple-checkbox') || cb.closest('.v-input') || cb,
          `detalhes-item-select-${itemId}`,
        )
      }
    })

    // Open menus / selects — Personalizado + mover / duplicar lote options
    document
      .querySelectorAll(
        '.v-menu__content .v-list-item, [role="option"], .v-select-list .v-list-item, [role="dialog"] .v-list-item, .v-dialog__content--active .v-list-item',
      )
      .forEach((opt) => {
      const text = (opt.textContent || '').replace(/\s+/g, ' ').trim()
      if (/^personalizado$/i.test(text)) set(opt, 'detalhes-ordenar-option-custom')
      if (/^UN$/i.test(text)) set(opt, 'direta-unidade-option-UN')

      const dialogRoot = opt.closest('.v-dialog__content--active, [role="dialog"]')
      const dialogText = (dialogRoot?.textContent || '').replace(/\s+/g, ' ')
      const inDuplicarDialog = /Nova cotação a partir de lotes|Selecione os lotes para duplicar/i.test(
        dialogText,
      )

      for (const lote of lotes) {
        const nome = lote.nome || ''
        if (!nome || !text.includes(nome)) continue

        if (inDuplicarDialog) {
          set(opt, `detalhes-duplicar-lote-option-${lote.id}`)
          continue
        }

        // Mover destino: "2 - Lote Destino E2E"
        if (/^\d+\s*-/.test(text) || text === nome || text === (lote as { label?: string }).label) {
          set(opt, `detalhes-mover-lote-option-${lote.id}`)
        }
      }
    })

    // Share dialog destination quotations
    document.querySelectorAll('[role="dialog"] .v-list-item, .v-dialog--active .v-list-item').forEach((opt) => {
      const text = (opt.textContent || '').replace(/\s+/g, ' ')
      const valueAttr =
        opt.getAttribute('value') ||
        (opt as HTMLElement).dataset?.value ||
        ''
      if (valueAttr && /[0-9a-f-]{8,}/i.test(valueAttr)) {
        set(opt, `detalhes-share-quotation-${valueAttr}`)
        return
      }
      const uuidInText = text.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      )
      if (uuidInText) {
        set(opt, `detalhes-share-quotation-${uuidInText[0]}`)
        return
      }
      if (/DEST-99|Cotação Destino E2E/i.test(text)) {
        set(opt, 'detalhes-share-quotation-e2e00000-0000-4000-8000-000000008099')
      }
    })

    return n
  }, options?.force ?? false)
}

const DETALHES_MENU_ACTION_RULES: TestIdRule[] = [
  {
    testId: 'detalhes-acao-novo-item',
    css: '.v-menu__content .v-list-item:has-text("Novo item")',
  },
  {
    testId: 'detalhes-acao-anexar-documentos',
    css: '.v-menu__content .v-list-item:has-text("Anexar documentos")',
  },
  {
    testId: 'detalhes-acao-colaboradores',
    css: '.v-menu__content .v-list-item:has-text("Selecionar colaboradores")',
  },
  {
    testId: 'detalhes-acao-cotacao-direta',
    css: '.v-menu__content .v-list-item:has-text("Cotação direta")',
  },
]

/** Inject Ações menu items after the menu is open. */
export async function maybeInjectDetalhesMenuActions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await injectTestIds(page, DETALHES_MENU_ACTION_RULES, { force: true })
}

/** Inject lote card menu actions (Editar / Excluir) after the dots menu is open. */
export async function maybeInjectDetalhesLoteMenuActions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await injectTestIds(
    page,
    [
      {
        testId: 'detalhes-lote-editar-action',
        css: '.v-menu__content .v-list-item:has-text("Editar")',
      },
      {
        testId: 'detalhes-lote-excluir-action',
        css: '.v-menu__content .v-list-item:has-text("Excluir")',
      },
    ],
    { force: true },
  )
}

/** Inject "Personalizado" after Ordenar por select is open. */
export async function maybeInjectDetalhesOrdenarOptions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await ensureTestId(
    page,
    'detalhes-ordenar-option-custom',
    '.v-menu__content .v-list-item:has-text("Personalizado"), [role="option"]:has-text("Personalizado")',
    { force: true },
  )
}

/** Inject formula dropdown options (menu must be open). */
export async function maybeInjectItemFormulaOptions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await page.evaluate(() => {
    const pairs: Array<[RegExp, string]> = [
      [/média aritmética/i, 'item-formula-option-2'],
      [/^mediana/i, 'item-formula-option-3'],
      [/menor preço/i, 'item-formula-option-4'],
      [/média saneada/i, 'item-formula-option-5'],
      [/média ponderada/i, 'item-formula-option-6'],
      [/média relativa/i, 'item-formula-option-7'],
    ]
    document
      .querySelectorAll(
        '.v-menu__content .v-list-item, .v-select-list .v-list-item, [role="option"]',
      )
      .forEach((opt) => {
        const text = (opt.textContent || '').trim()
        for (const [re, id] of pairs) {
          if (re.test(text)) {
            opt.setAttribute('data-testid', id)
            break
          }
        }
      })
  })
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
  if (surface === 'documentos') {
    await injectDynamicDocumentosTestIds(page)
  }
  if (surface === 'colaboradores') {
    await injectDynamicColaboradoresTestIds(page)
  }
  if (surface === 'direta') {
    await injectDynamicDiretaTestIds(page)
  }
}

/** TR autocomplete options (menu must be open). */
export async function maybeInjectDocumentosTrOptions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.v-menu__content .v-list-item, .v-autocomplete__content .v-list-item, [role="option"]',
      )
      .forEach((opt) => {
        const text = (opt.textContent || '').trim()
        if (/TR E2E/i.test(text)) {
          opt.setAttribute('data-testid', 'documentos-tr-option-501')
        }
      })
  })
}

/** Fornecedor / unidade options after select open. */
export async function maybeInjectDiretaSelectOptions(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.v-menu__content .v-list-item, .v-autocomplete__content .v-list-item, [role="option"]',
      )
      .forEach((opt) => {
        const text = (opt.textContent || '').replace(/\s+/g, ' ').trim()
        if (/12345678000199|Fornecedor E2E/i.test(text)) {
          opt.setAttribute(
            'data-testid',
            'direta-fornecedor-option-12345678000199',
          )
        }
        if (/^Unidade$/i.test(text) || /^UN$/i.test(text) || /\bUN\b/.test(text)) {
          opt.setAttribute('data-testid', 'direta-unidade-option-UN')
        }
      })
  })
}

async function injectDynamicDocumentosTestIds(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Prefer the TR row autocomplete
    const rows = Array.from(document.querySelectorAll('.v-row'))
    const trRow = rows.find((r) =>
      /Termo de Referência|\(TR\)/i.test(r.textContent || ''),
    )
    const trSelect =
      trRow?.querySelector('.v-autocomplete') ||
      document.querySelectorAll('.v-autocomplete')[3]
    if (trSelect) trSelect.setAttribute('data-testid', 'documentos-tr-select')
  })
}

async function injectDynamicColaboradoresTestIds(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('tr').forEach((tr) => {
      if (!/Colaborador E2E/i.test(tr.textContent || '')) return
      const cb =
        tr.querySelector('.v-input--checkbox') ||
        tr.querySelector('input[type="checkbox"]')?.closest('.v-input')
      if (cb) cb.setAttribute('data-testid', 'colaboradores-user-check-701')
    })
  })
}

async function injectDynamicDiretaTestIds(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.mb-8 > .v-card, .v-card.pa-4').forEach((card) => {
      const title = card.querySelector('.text-subtitle-1, .font-weight-bold')
      const text = title?.textContent || ''
      // "1 - Caneta..." — no id in text; fall back to first card = fixture item
      const m = text.match(/item\/(\d+)/)
      if (m) {
        card.setAttribute('data-testid', `direta-item-${m[1]}`)
      }
    })
    // Map first price-form item card to fixture 9001 when only one item
    const cards = document.querySelectorAll('.mb-8 > .v-card.pa-4, div.mb-8 > .v-card')
    if (cards.length === 1) {
      cards[0].setAttribute('data-testid', 'direta-item-9001')
    } else {
      cards.forEach((card, idx) => {
        if (!card.getAttribute('data-testid')) {
          // Keep stable for single-item stubs used by the suite
          if (idx === 0) card.setAttribute('data-testid', 'direta-item-9001')
        }
      })
    }
  })
}

/** Force re-apply item registry (dialogs / tab-gated controls after UI mutation). */
export async function maybeReinjectItemTestIds(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await injectTestIds(page, 'item', { force: true })
  await injectOpenItemDialogs(page)
}

/** Force re-apply detalhes registry after dialogs / menus / DnD mode. */
export async function maybeReinjectDetalhesTestIds(page: Page): Promise<void> {
  if (!isInjectTestIdsEnabled()) return
  await injectTestIds(page, 'detalhes', { force: true })
  await injectDynamicDetalhesTestIds(page, { force: true })
  await injectOpenDetalhesDialogs(page)
}

/** Map visible detalhes dialogs via role/text — Vuetify :has-text CSS is unreliable. */
async function injectOpenDetalhesDialogs(page: Page): Promise<void> {
  let dialog = page.getByRole('dialog')
  let count = await dialog.count()
  if (count === 0) {
    dialog = page.locator('.v-dialog__content--active')
    count = await dialog.count()
  }
  if (count === 0) return

  for (let i = 0; i < count; i++) {
    const d = dialog.nth(i)
    if (!(await d.isVisible().catch(() => false))) continue
    const text = ((await d.innerText().catch(() => '')) || '').replace(/\s+/g, ' ')
    const hasSendDialog = (await d.locator('.send-dialog').count()) > 0

    let dialogId: string | null = null
    let confirmId: string | null = null
    let confirmName: RegExp | null = null

    if (/Deseja deletar todos os itens|Sim, deletar/i.test(text)) {
      dialogId = 'detalhes-delete-items-dialog'
      confirmId = 'detalhes-delete-items-confirm'
      confirmName = /Sim, deletar/i
    } else if (/duplicar os itens selecionados/i.test(text)) {
      dialogId = 'detalhes-duplicate-dialog'
      confirmId = 'detalhes-duplicate-confirm'
      confirmName = /^Confirmar$/i
    } else if (/Compartilhar item/i.test(text)) {
      dialogId = 'detalhes-share-dialog'
      confirmId = 'detalhes-share-confirm'
      confirmName = /^Compartilhar$/i
    } else if (/Excluir lote\?/i.test(text)) {
      dialogId = 'detalhes-lote-delete-dialog'
      confirmId = 'detalhes-lote-delete-confirm'
      confirmName = /Sim, excluir/i
    } else if (/Mesclar \d+ lotes|Nome final do lote/i.test(text)) {
      dialogId = 'detalhes-mesclar-dialog'
      confirmId = 'detalhes-mesclar-confirm'
      confirmName = /Mesclar lotes/i
    } else if (/Nova cotação a partir de lotes/i.test(text)) {
      dialogId = 'detalhes-duplicar-lotes-dialog'
      confirmId = 'detalhes-duplicar-lotes-confirm'
      confirmName = /Duplicar lotes/i
    } else if (
      /Criar lote|Novo lote|Editar lote/i.test(text) ||
      (/item\(ns\) será adicionado/i.test(text) && /lote/i.test(text))
    ) {
      dialogId = 'detalhes-lote-dialog'
      confirmId = 'detalhes-lote-criar-confirm'
      confirmName = /^(Criar|Criar com itens|Salvar)$/i
    } else if (/Adicionar prazo adicional/i.test(text)) {
      dialogId = 'detalhes-prazo-dialog'
      confirmId = 'detalhes-prazo-confirm'
      confirmName = /^Confirmar$/i
    } else if (/Finalizar cotação personalizada/i.test(text)) {
      dialogId = 'detalhes-finalizar-dialog'
      confirmId = 'detalhes-finalizar-confirm'
      confirmName = /Finalizar cotação/i
    } else if (/não contratado|Módulo Cotação com IA/i.test(text)) {
      dialogId = 'detalhes-ia-access-dialog'
      confirmId = 'detalhes-ia-interesse-btn'
      confirmName = /Tenho interesse|interesse|Solicitar/i
    } else if (hasSendDialog || /Limite contratado|Confirmar envio|Créditos disponíveis/i.test(text)) {
      dialogId = 'detalhes-send-quote-dialog'
      confirmId = 'detalhes-enviar-confirm'
      confirmName = null
    }

    if (!dialogId) continue

    // Prefer the inner .send-dialog card to avoid duplicate testids on wrapper + card
    if (dialogId === 'detalhes-send-quote-dialog') {
      const sendCard = d.locator('.send-dialog').first()
      if ((await sendCard.count()) > 0) {
        await sendCard.evaluate((el, id) => el.setAttribute('data-testid', id), dialogId)
      } else {
        await d.evaluate((el, id) => el.setAttribute('data-testid', id), dialogId)
      }
      // Clear accidental duplicate on the outer wrapper
      await d.evaluate((el) => {
        if (el.classList.contains('v-dialog__content') && el.getAttribute('data-testid') === 'detalhes-send-quote-dialog') {
          el.removeAttribute('data-testid')
        }
      })
      const label = d.locator('.send-stat__label').first()
      if ((await label.count()) > 0) {
        await label.evaluate((el) =>
          el.setAttribute('data-testid', 'detalhes-send-stat-limit-label'),
        )
      }
      const primary = d.locator('.send-dialog__btn-primary').first()
      if ((await primary.count()) > 0 && confirmId) {
        await primary.evaluate((el, id) => el.setAttribute('data-testid', id), confirmId)
      }
      continue
    }

    await d.evaluate((el, id) => el.setAttribute('data-testid', id), dialogId)

    if (dialogId === 'detalhes-lote-dialog') {
      const alert = d.locator('.v-alert')
      if ((await alert.count()) > 0) {
        await alert
          .first()
          .evaluate((el) => el.setAttribute('data-testid', 'detalhes-lote-com-itens-alert'))
      }
      const nome = d.locator('input[type="text"]').first()
      if ((await nome.count()) > 0) {
        await nome.evaluate((el) => el.setAttribute('data-testid', 'detalhes-lote-nome-input'))
      }
    }

    if (dialogId === 'detalhes-mesclar-dialog') {
      const nome = d.locator('input[type="text"]').first()
      if ((await nome.count()) > 0) {
        await nome.evaluate((el) => el.setAttribute('data-testid', 'detalhes-mesclar-nome-input'))
      }
    }

    if (dialogId === 'detalhes-duplicar-lotes-dialog') {
      const nome = d.locator('input[type="text"]').first()
      if ((await nome.count()) > 0) {
        await nome.evaluate((el) =>
          el.setAttribute('data-testid', 'detalhes-duplicar-lotes-nome-input'),
        )
      }
      const copyPrices = d
        .locator('.v-input--checkbox')
        .filter({ hasText: /Copiar preços/i })
      if ((await copyPrices.count()) > 0) {
        await copyPrices
          .first()
          .evaluate((el) =>
            el.setAttribute('data-testid', 'detalhes-duplicar-lotes-copiar-precos'),
          )
      }
    }

    if (dialogId === 'detalhes-prazo-dialog') {
      const dias = d.locator('input[type="number"]').first()
      if ((await dias.count()) > 0) {
        await dias.evaluate((el) => el.setAttribute('data-testid', 'detalhes-prazo-dias-input'))
      }
      const just = d.locator('textarea').first()
      if ((await just.count()) > 0) {
        await just.evaluate((el) =>
          el.setAttribute('data-testid', 'detalhes-prazo-justificativa-input'),
        )
      }
    }

    if (confirmId && confirmName) {
      const btn = d.getByRole('button', { name: confirmName })
      if ((await btn.count()) > 0) {
        await btn
          .first()
          .evaluate((el, id) => el.setAttribute('data-testid', id), confirmId)
      }
    }
  }
}

/** Map visible item dialogs via role/text — Vuetify :has-text CSS is unreliable on role=dialog. */
async function injectOpenItemDialogs(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog')
  const count = await dialog.count()
  if (count === 0) return

  for (let i = 0; i < count; i++) {
    const d = dialog.nth(i)
    if (!(await d.isVisible().catch(() => false))) continue
    const text = ((await d.innerText().catch(() => '')) || '').replace(/\s+/g, ' ')

    let dialogId: string | null = null
    let confirmId: string | null = null
    let confirmName: RegExp = /^Excluir$/i

    if (/Excluir preços\?/i.test(text) || /preço será removido|preços serão removidos/i.test(text)) {
      dialogId = 'item-delete-all-dialog'
      confirmId = 'item-delete-all-confirm'
      confirmName = /^Excluir$/i
    } else if (/Mover para preços excluídos|Excluir preço\?/i.test(text)) {
      dialogId = 'item-price-delete-dialog'
      confirmId = 'item-price-delete-confirm'
      confirmName = /^Excluir$/i
    } else if (/restaurad|Restaurar/i.test(text) && /preço/i.test(text)) {
      dialogId = 'item-price-restore-dialog'
      confirmId = 'item-price-restore-confirm'
      confirmName = /^Restaurar$/i
    }

    if (!dialogId) continue
    await d.evaluate((el, id) => el.setAttribute('data-testid', id), dialogId)
    if (confirmId) {
      const btn = d.getByRole('button', { name: confirmName })
      if ((await btn.count()) > 0) {
        await btn.first().evaluate((el, id) => el.setAttribute('data-testid', id), confirmId)
      }
    }
  }
}
