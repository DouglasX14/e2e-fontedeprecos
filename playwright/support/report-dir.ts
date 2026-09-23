/**
 * HTML report folder name: DDMMAA-{kind}-report
 * Example: 230926-qa-report
 *
 * Override with PLAYWRIGHT_HTML_REPORT, or set QA_REPORT_KIND (qa|smoke|e2e).
 */
export function resolveHtmlReportDir(): string {
  if (process.env.PLAYWRIGHT_HTML_REPORT?.trim()) {
    return process.env.PLAYWRIGHT_HTML_REPORT.trim()
  }
  const kind = (process.env.QA_REPORT_KIND || 'e2e').trim().toLowerCase() || 'e2e'
  return `${dateTagDDMMAA()}-${kind}-report`
}

/** Local calendar date as DDMMAA (e.g. 23 Sep 2026 → 230926). */
export function dateTagDDMMAA(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}
