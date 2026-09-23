import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter'

type Row = {
  title: string
  file: string
  detail: string
  hint?: string
}

type FinalEntry = {
  test: TestCase
  result: TestResult
}

/**
 * Terminal summary in Portuguese: passed / failed / skipped with reasons.
 * Complements the default `list` + HTML reporters.
 */
class QaSummaryReporter implements Reporter {
  /** Last attempt per test id (retries overwrite). */
  private finals = new Map<string, FinalEntry>()

  onTestEnd(test: TestCase, result: TestResult): void {
    this.finals.set(test.id, { test, result })
  }

  onEnd(_result: FullResult): void {
    let passed = 0
    let flaky = 0
    const failed: Row[] = []
    const skipped: Row[] = []

    for (const { test, result } of this.finals.values()) {
      const title = formatTitle(test)
      const file = relativize(test.location.file)

      if (result.status === 'skipped' || test.expectedStatus === 'skipped') {
        skipped.push({
          title,
          file,
          detail: skipReason(test, result),
        })
        continue
      }

      if (result.status === 'passed') {
        if (result.retry > 0) flaky += 1
        else passed += 1
        continue
      }

      if (
        result.status === 'failed' ||
        result.status === 'timedOut' ||
        result.status === 'interrupted'
      ) {
        const error = firstError(result)
        failed.push({
          title,
          file,
          detail: error,
          hint: hintForError(error),
        })
      }
    }

    const total = passed + flaky + failed.length + skipped.length

    console.log('')
    console.log('========== Resumo QA (e2e-fontedeprecos) ==========')
    console.log(
      `  Total: ${total}  ·  passou: ${passed}` +
        (flaky ? `  ·  flaky: ${flaky}` : '') +
        `  ·  falhou: ${failed.length}  ·  pulado: ${skipped.length}`,
    )

    if (skipped.length > 0) {
      console.log('')
      console.log('  PULADOS (não executaram — isso não é falha):')
      for (const row of skipped) {
        console.log(`  · ${row.title}`)
        console.log(`      arquivo: ${row.file}`)
        console.log(`      motivo:  ${row.detail}`)
      }
    }

    if (failed.length > 0) {
      console.log('')
      console.log('  FALHAS:')
      for (const row of failed) {
        console.log(`  · ${row.title}`)
        console.log(`      arquivo: ${row.file}`)
        console.log(`      erro:    ${row.detail}`)
        if (row.hint) console.log(`      dica:    ${row.hint}`)
      }
      console.log('')
      console.log(
        '  Detalhe visual: yarn qa:report  (trace/screenshot por falha)',
      )
    } else if (skipped.length > 0) {
      console.log('')
      console.log(
        '  Suíte OK. Os pulados acima são opcionais / condicionais — veja o motivo.',
      )
    } else {
      console.log('')
      console.log('  Suíte OK — nenhum teste falhou ou foi pulado.')
    }

    console.log('===================================================')
    console.log('')
  }
}

function formatTitle(test: TestCase): string {
  // titlePath usually starts with the project name; sometimes also the file.
  return test
    .titlePath()
    .filter((p) => p !== 'chromium' && !/\.(spec\.)?tsx?$/i.test(p))
    .join(' › ')
}

function relativize(abs: string): string {
  const cwd = process.cwd().replace(/\\/g, '/')
  return abs.replace(/\\/g, '/').replace(cwd + '/', '')
}

function skipReason(test: TestCase, result: TestResult): string {
  const anns = [...test.annotations, ...result.annotations]
  const skip = anns.find(
    (a) => a.type === 'skip' || a.type === 'fixme' || a.type === 'fix',
  )
  if (skip?.description?.trim()) return skip.description.trim()

  const err = firstError(result)
  if (err && err !== '(sem mensagem)') return err

  return (
    'Pulado sem motivo explícito. Se for cotacao-item-api, precisa ' +
    'RUN_LIVE_ITEM_API=1 + sessão Django (AUTH_BASE_URL).'
  )
}

function firstError(result: TestResult): string {
  const msg = result.errors?.[0]?.message || result.error?.message || ''
  const line = msg
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('Call log:'))
  if (!line) return '(sem mensagem)'
  return line.length > 180 ? line.slice(0, 177) + '…' : line
}

function hintForError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('strict mode violation')) {
    return 'Mais de um elemento com o mesmo data-testid — revisar inject/seletores.'
  }
  if (m.includes('timeout') && (m.includes('testid') || m.includes('getby'))) {
    return 'Elemento/testid não apareceu a tempo — inject, stub de API ou Nuxt frio (yarn qa:server).'
  }
  if (m.includes('timeout') && m.includes('waiting for')) {
    return 'Timeout de ação/navegação — conferir BASE_URL, stubs e workers=1.'
  }
  if (m.includes('loading')) {
    return 'UI presa em Loading — Nuxt ainda compilando ou stub faltando.'
  }
  if (
    m.includes('err_connection') ||
    m.includes('net::') ||
    m.includes('econnrefused')
  ) {
    return 'Front não responde — suba com yarn qa:server ou confira BASE_URL/FRONTEND_DIR.'
  }
  if (m.includes("executable doesn't exist") || m.includes('browser')) {
    return 'Chromium ausente — rode yarn playwright install chromium.'
  }
  if (m.includes('dotenv')) {
    return 'Dependência ausente — yarn install / git pull.'
  }
  return 'Abra yarn qa:report e o trace.zip do teste para o passo exato.'
}

export default QaSummaryReporter
