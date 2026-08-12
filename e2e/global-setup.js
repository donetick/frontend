import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// FRONTEND_URL: what the browser navigates to (Playwright baseURL)
// API_URL:      where the Go API lives (may be the same in production builds)
export const FRONTEND_URL =
  process.env.E2E_FRONTEND_URL ||
  process.env.E2E_BASE_URL ||
  'http://localhost:5173'
export const API_URL =
  process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'http://localhost:2021'

export const TEST_USER = {
  username: 'e2e.user',
  email: 'e2e@donetick.test',
  password: 'E2ePassword123!',
  displayName: 'E2E User',
}

/**
 * Global setup: create the shared E2E test user (idempotent) and persist
 * the JWT token as a Playwright storage state so authenticated tests can
 * skip the login UI.
 */
export default async function globalSetup() {
  await waitForServer(API_URL)

  // Create user – ignore 409/conflict so re-runs are safe
  const signupRes = await fetch(`${API_URL}/api/v1/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  })
  if (!signupRes.ok) {
    const body = await signupRes.text()
    // Treat "already exists" errors as success so re-runs are idempotent
    if (!body.includes('already exists') && !body.includes('already taken')) {
      throw new Error(`Signup failed (${signupRes.status}): ${body}`)
    }
  }

  // Login and grab the access token
  const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USER.username,
      password: TEST_USER.password,
    }),
  })
  if (!loginRes.ok) {
    const body = await loginRes.text()
    throw new Error(`Login failed (${loginRes.status}): ${body}`)
  }

  const { token, expire } = await loginRes.json()

  // Write a Playwright storage-state file containing the token in localStorage
  const stateDir = path.join(__dirname, '.auth')
  await mkdir(stateDir, { recursive: true })
  await writeFile(
    path.join(stateDir, 'state.json'),
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: FRONTEND_URL,
          localStorage: [
            { name: 'token', value: token },
            { name: 'token_expiry', value: expire },
          ],
        },
      ],
    }),
    'utf8',
  )

  console.log('[global-setup] Test user ready, storage state saved.')
}

async function waitForServer(url, retries = 20, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${url}/api/v1/auth/login`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
      if (res.status < 500) return
    } catch {
      // server not up yet
    }
    console.log(`[global-setup] Waiting for server… (${i + 1}/${retries})`)
    await new Promise(r => setTimeout(r, delayMs))
  }
  throw new Error(`Server at ${url} did not become ready in time`)
}
