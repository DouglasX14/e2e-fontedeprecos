import path from 'node:path'
import {
  authStorageInit,
  configureAuthSession,
  setAuthProvider,
} from '@seontechnologies/playwright-utils/auth-session'
import fontePrecosAuthProvider from './support/auth-provider'

async function globalSetup() {
  authStorageInit()
  configureAuthSession({
    // playwright-utils persists under `{cwd}/.auth/{env}/{user}/storage-state.json`
    storageDir: path.join(process.cwd(), '.auth'),
    debug: process.env.PW_AUTH_DEBUG === 'true',
  })
  setAuthProvider(fontePrecosAuthProvider)
}

export default globalSetup
