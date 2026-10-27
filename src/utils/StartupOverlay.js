// index.html paints #startup before any JavaScript runs and keeps it above
// #root. Every mounted <StartupScreen /> holds it; once the last hold is
// released and nothing re-holds it for a moment, it fades out for good. Boot
// therefore hands off to the app exactly once instead of swapping loaders.

// Long enough to cover a route swap (e.g. "/" -> Navigate -> /home loader).
const SETTLE_MS = 150
// Past this, reveal the in-app loader so its slow/offline details can show.
const MAX_STARTUP_MS = 4000
const LEAVE_MS = 200

let holds = 0
let settleTimer = null
let hidden = false

export const hideStartupOverlay = () => {
  if (hidden) return
  hidden = true
  clearTimeout(settleTimer)

  const overlay = document.getElementById('startup')
  if (!overlay) return
  overlay.classList.add('startup-screen--leaving')
  // Reduced motion skips the transition, so don't rely on transitionend.
  setTimeout(() => overlay.remove(), LEAVE_MS)
}

export const holdStartupOverlay = () => {
  if (hidden) return () => {}
  holds += 1
  clearTimeout(settleTimer)

  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    if (holds > 0) return
    settleTimer = setTimeout(() => {
      if (holds === 0) hideStartupOverlay()
    }, SETTLE_MS)
  }
}

if (typeof window !== 'undefined') {
  setTimeout(hideStartupOverlay, MAX_STARTUP_MS)
}
