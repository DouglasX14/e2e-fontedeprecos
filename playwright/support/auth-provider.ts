import fs from 'node:fs'
import type { APIRequestContext } from '@playwright/test'
import type { AuthProvider } from '@seontechnologies/playwright-utils/auth-session'
import {
  authStorageInit,
  getTokenFilePath,
  loadStorageState,
  saveStorageState,
} from '@seontechnologies/playwright-utils/auth-session'

type StorageState = {
  cookies?: Array<{
    name: string
    value: string
    domain?: string
    path?: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }>
  origins?: Array<{
    origin: string
    localStorage: Array<{ name: string; value: string }>
  }>
}

function resolveAuthBaseUrl(options?: { authBaseUrl?: string; baseUrl?: string }): string {
  return (
    options?.authBaseUrl ||
    process.env.AUTH_BASE_URL ||
    process.env.API_BASE_URL ||
    // Django runserver (Makefile) — not the Nuxt BASE_URL
    'http://127.0.0.1:8103'
  ).replace(/\/$/, '')
}

function cookieDomain(): string {
  return process.env.AUTH_COOKIE_DOMAIN || '127.0.0.1'
}

function extractCsrfToken(html: string): string | null {
  const namedFirst = html.match(
    /name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/,
  )
  if (namedFirst?.[1]) return namedFirst[1]
  const valueFirst = html.match(
    /value=["']([^"']+)["']\s+name=["']csrfmiddlewaretoken["']/,
  )
  return valueFirst?.[1] ?? null
}

function hasSessionCookie(state: StorageState | null | undefined): boolean {
  return Boolean(state?.cookies?.some((c) => c.name === 'sessionid' && c.value))
}

function normalizeStorageCookies(state: StorageState): StorageState {
  const domain = cookieDomain()
  const cookies = (state.cookies || [])
    .filter((c) => c.name === 'sessionid' || c.name === 'csrftoken')
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain,
      path: c.path || '/',
      expires: c.expires ?? -1,
      httpOnly: c.name === 'sessionid' ? true : Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax',
    }))

  return {
    cookies,
    origins: state.origins || [],
  }
}

async function acquireDjangoSession(
  request: APIRequestContext,
  options: {
    authBaseUrl?: string
    baseUrl?: string
    userIdentifier?: string
    userPassword?: string
  } = {},
): Promise<StorageState> {
  const email =
    options.userIdentifier ||
    process.env.TEST_USER_EMAIL ||
    ''
  const password =
    options.userPassword ||
    process.env.TEST_USER_PASSWORD ||
    ''

  if (!email || !password) {
    throw new Error(
      'AuthProvider: set TEST_USER_EMAIL / TEST_USER_PASSWORD (or authOptions.userIdentifier / userPassword) before acquiring a Django session.',
    )
  }

  const authBase = resolveAuthBaseUrl(options)
  const authHost = process.env.AUTH_HOST // optional django-tenants Host
  const commonHeaders: Record<string, string> = {
    Referer: `${authBase}/login`,
    Origin: authBase,
    ...(authHost ? { Host: authHost } : {}),
  }

  const loginPage = await request.get(`${authBase}/login`, {
    headers: commonHeaders,
  })
  if (!loginPage.ok()) {
    throw new Error(
      `AuthProvider: GET ${authBase}/login failed with ${loginPage.status()}. Is AUTH_BASE_URL pointing at Django?`,
    )
  }

  const html = await loginPage.text()
  const csrfmiddlewaretoken = extractCsrfToken(html)
  if (!csrfmiddlewaretoken) {
    throw new Error(
      'AuthProvider: csrfmiddlewaretoken not found on /login. Check AUTH_HOST / tenant domain.',
    )
  }

  const loginResponse = await request.post(`${authBase}/login`, {
    form: {
      email,
      password,
      csrfmiddlewaretoken,
    },
    headers: {
      ...commonHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    maxRedirects: 0,
  })

  const status = loginResponse.status()
  const location = loginResponse.headers()['location'] || ''

  // Cross-tenant SSO: follow one-time token on the Location host/path.
  if (status >= 300 && status < 400 && location.includes('/login/sso')) {
    const ssoUrl = location.startsWith('http')
      ? location
      : new URL(location, authBase).toString()
    const ssoResponse = await request.get(ssoUrl, { maxRedirects: 5 })
    if (!ssoResponse.ok() && ssoResponse.status() >= 400) {
      throw new Error(
        `AuthProvider: SSO follow failed (${ssoResponse.status()}) for ${ssoUrl}`,
      )
    }
  } else if (status >= 400) {
    throw new Error(
      `AuthProvider: POST /login failed with ${status}. Check credentials and tenant Host (AUTH_HOST).`,
    )
  } else if (status === 200) {
    // Form re-rendered (invalid credentials) — login page still shows.
    const body = await loginResponse.text()
    if (body.includes('csrfmiddlewaretoken') && body.includes('password')) {
      throw new Error(
        'AuthProvider: login rejected (form re-rendered). Verify TEST_USER_EMAIL / TEST_USER_PASSWORD.',
      )
    }
  }

  const rawState = (await request.storageState()) as StorageState
  const storageState = normalizeStorageCookies(rawState)

  if (!hasSessionCookie(storageState)) {
    throw new Error(
      'AuthProvider: login completed but sessionid cookie was not set. Check SESSION_COOKIE_DOMAIN / AUTH_COOKIE_DOMAIN.',
    )
  }

  return storageState
}

/**
 * Django session auth for Fonte de Preços (sessionid + csrftoken).
 * Login: GET/POST `{AUTH_BASE_URL}/login` with CSRF (painel.LoginView).
 */
const fontePrecosAuthProvider: AuthProvider = {
  getEnvironment: (options) => options?.environment || process.env.TEST_ENV || 'local',

  getUserIdentifier: (options) =>
    options?.userIdentifier || process.env.TEST_USER_EMAIL || 'default-user',

  getBaseUrl: (options) =>
    options?.baseUrl || process.env.BASE_URL || 'http://127.0.0.1:3000',

  extractToken: (storageState) => {
    const state = storageState as StorageState
    const cookie =
      state.cookies?.find((c) => c.name === 'sessionid') ||
      state.cookies?.find((c) => c.name === 'auth_token')
    return cookie?.value ?? null
  },

  extractCookies: (tokenData) => {
    const domain = cookieDomain()
    const state = tokenData as StorageState
    if (Array.isArray(state.cookies) && state.cookies.length > 0) {
      return state.cookies
        .filter((c) => c.name === 'sessionid' || c.name === 'csrftoken')
        .map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || domain,
          path: c.path || '/',
          expires: c.expires,
          httpOnly: c.name === 'sessionid' ? true : Boolean(c.httpOnly),
          secure: Boolean(c.secure),
          sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax',
        }))
    }
    return []
  },

  // Library passes the raw sessionid string from extractToken.
  isTokenExpired: (_rawToken: string) => false,

  manageAuthToken: async (request, options = {}) => {
    const environment = fontePrecosAuthProvider.getEnvironment(options)
    const userIdentifier = fontePrecosAuthProvider.getUserIdentifier(options)
    authStorageInit({ environment, userIdentifier })

    const tokenPath = getTokenFilePath({ environment, userIdentifier })
    const existing = loadStorageState(tokenPath) as StorageState | null
    if (hasSessionCookie(existing)) {
      return existing as Record<string, unknown>
    }

    const storageState = await acquireDjangoSession(request, {
      authBaseUrl: options.authBaseUrl,
      baseUrl: options.baseUrl,
      userIdentifier: options.userIdentifier,
      userPassword: options.userPassword,
    })

    saveStorageState(tokenPath, storageState as Record<string, unknown>)
    return storageState as Record<string, unknown>
  },

  clearToken: (options = {}) => {
    const environment = fontePrecosAuthProvider.getEnvironment(options)
    const userIdentifier = fontePrecosAuthProvider.getUserIdentifier(options)
    const tokenPath = getTokenFilePath({ environment, userIdentifier })
    try {
      if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath)
    } catch {
      // ignore missing / locked file
    }
  },
}

export default fontePrecosAuthProvider
