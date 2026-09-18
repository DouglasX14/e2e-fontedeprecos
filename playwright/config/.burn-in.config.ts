import type { BurnInConfig } from '@seontechnologies/playwright-utils/burn-in'

/**
 * Burn-in selection for Fonte de Preços (frontend-fp).
 * Used by playwright/scripts/burn-in-changed.ts via runBurnIn.
 */
const config: BurnInConfig = {
  skipBurnInPatterns: [
    '**/config/**',
    '**/*constants*',
    '**/*types*',
    '**/*.md',
    '**/README*',
    '**/.github/**',
    '**/docs/**',
  ],
  burnInTestPercentage: 0.3,
  burnIn: {
    repeatEach: 3,
    retries: 1,
  },
}

export default config
