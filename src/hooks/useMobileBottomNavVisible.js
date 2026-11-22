import { useSyncExternalStore } from 'react'

// MobileBottomNav derives its own visibility from the viewport, the route and
// the host. Overlays that live near the bottom edge (toasts) need that answer
// without duplicating the logic — and without a router context, since the
// notification provider renders above the router.
let visible = false
const listeners = new Set()

export const setMobileBottomNavVisible = next => {
  if (visible === next) return
  visible = next
  listeners.forEach(listener => listener())
}

const subscribe = listener => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => visible
const getServerSnapshot = () => false

export const useMobileBottomNavVisible = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
