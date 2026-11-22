// Shared timings keep visual transitions and presence lifetimes in sync.
export const MOTION = Object.freeze({
  press: 100,
  tooltip: 125,
  popup: 180,
  modal: 250,
  sheet: 300,
  exit: 180,
  reduced: 80,
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeDrawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
})
