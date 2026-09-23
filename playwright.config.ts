import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'
const PORT = Number(process.env.PLAYWRIGHT_PORT || 3000)
const FRONTEND_DIR = process.env.FRONTEND_DIR

export default defineConfig({
  testDir: './playwright/e2e',
  globalSetup: './playwright/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./playwright/support/reporters/qa-summary-reporter.ts'],
  ],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(FRONTEND_DIR
    ? {
        webServer: {
          command: `yarn --cwd "${FRONTEND_DIR}" nuxt --hostname 127.0.0.1 --port ${PORT}`,
          url: BASE_URL,
          timeout: 300_000,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
  outputDir: 'test-results',
})
