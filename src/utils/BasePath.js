// Runtime base path support.
//
// Donetick normally runs at the root of its own origin ("/").
// When it is served under a path prefix (e.g. Home Assistant ingress "/api/hassio_ingress/<token>")
// the backend injects that prefix into index.html as `window.__DONETICK_BASE_PATH__` and `<base href="PREFIX">`.

const normalizeBasePath = value => {
  if (typeof value !== 'string') return ''
  const path = value.replace(/\/+$/, '')
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

// BASE_PATH is the prefix with no trailing slash, or '' when running at root,
// so the default deployment behaves exactly as before.
export const BASE_PATH = normalizeBasePath(
  typeof window !== 'undefined' ? window.__DONETICK_BASE_PATH__ : '',
)

export const hasBasePath = () => BASE_PATH !== ''

// Prefix an app-absolute path ("/login") with the base path.
export const withBasePath = (path = '/') => {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${p}`
}

// Full URL (origin + base path + path) for links shared outside the app.
export const absoluteAppUrl = (path = '/') =>
  `${window.location.origin}${withBasePath(path)}`

// Outputs window.location.pathname with the base path removed to enable comparing simple paths (e.g. `/login`) whether or not the app is running under a prefix.
// Only a whole-segment match counts, so a prefix of "/donetick" doesn't strip "/donetickfoo".
export const appPathname = () => {
  const { pathname } = window.location
  if (BASE_PATH) {
    if (pathname === BASE_PATH) return '/'
    if (pathname.startsWith(`${BASE_PATH}/`)) {
      return pathname.slice(BASE_PATH.length)
    }
  }
  return pathname
}
