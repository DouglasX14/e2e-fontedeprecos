import { request } from '@playwright/test'
import { setAuthProvider } from '@seontechnologies/playwright-utils/auth-session'
import provider from '../support/auth-provider'

async function main() {
  setAuthProvider(provider)
  const ctx = await request.newContext()
  const prevEmail = process.env.TEST_USER_EMAIL
  const prevPassword = process.env.TEST_USER_PASSWORD
  delete process.env.TEST_USER_EMAIL
  delete process.env.TEST_USER_PASSWORD

  try {
    await provider.manageAuthToken(ctx, { userIdentifier: 'smoke-no-creds' })
    console.error('UNEXPECTED_SUCCESS')
    process.exit(1)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('TEST_USER_EMAIL')) {
      console.error('UNEXPECTED_ERROR:', message)
      process.exit(1)
    }
    console.log('OK:', message)
  } finally {
    if (prevEmail !== undefined) process.env.TEST_USER_EMAIL = prevEmail
    if (prevPassword !== undefined) process.env.TEST_USER_PASSWORD = prevPassword
    await ctx.dispose()
  }
}

main()
