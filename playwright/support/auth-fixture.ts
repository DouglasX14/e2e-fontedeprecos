import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  setAuthProvider,
} from '@seontechnologies/playwright-utils/auth-session'
import fontePrecosAuthProvider from './auth-provider'

setAuthProvider(fontePrecosAuthProvider)

export const test = base.extend(createAuthFixtures())
