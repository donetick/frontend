// Tracks whether an OAuth authorization-code exchange is currently in flight.
//
// During that window the app is legitimately unauthenticated: the deep link has
// arrived but Authenticating.jsx has not received tokens yet. Any 401 from an
// unrelated request (background sync, a resumed query) must NOT be treated as an
// expired session — the forced logout it triggers clears storage and does a hard
// `window.location.href = '/login'`, which tears down the page and aborts the
// in-flight code exchange.
let exchangeInProgress = false

export const beginOAuthExchange = () => {
  exchangeInProgress = true
}

export const endOAuthExchange = () => {
  exchangeInProgress = false
}

// The in-memory flag covers the native deep-link path, where the callback
// arrives while the app is already running. On web the provider redirects with a
// full page load, so nothing has run to set the flag — the pathname check covers
// that case (and doubles as a backstop if the flag is never cleared).
export const isOAuthExchangeInProgress = () =>
  exchangeInProgress || window.location.pathname === '/auth/oauth2'
