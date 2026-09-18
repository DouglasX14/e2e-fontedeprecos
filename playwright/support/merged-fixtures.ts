import { mergeTests } from '@playwright/test'
import { log } from '@seontechnologies/playwright-utils'
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { test as interceptFixture } from '@seontechnologies/playwright-utils/intercept-network-call/fixtures'
import { createNetworkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'
import { test as recurseFixture } from '@seontechnologies/playwright-utils/recurse/fixtures'
import { test as authFixture } from './auth-fixture'

const merged = mergeTests(
  apiRequestFixture,
  recurseFixture,
  interceptFixture,
  authFixture,
)

export const test = merged.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [
      /\/static\//,
      /\/media\//,
      /tawk\.to/,
      /embed\.tawk\.to/,
    ],
    maxTestsPerError: 1,
  }),
)

export { expect } from '@playwright/test'
export { log }
