/**
 * Smart burn-in for changed Playwright specs (CI + local).
 * Requires @seontechnologies/playwright-utils burn-in runner.
 */
import { runBurnIn } from '@seontechnologies/playwright-utils/burn-in'

async function main() {
  await runBurnIn({
    configPath: 'playwright/config/.burn-in.config.ts',
    baseBranch: process.env.BURN_IN_BASE_BRANCH || 'main',
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
