// Colors for the startup/loading screen, one entry per skin in THEME_PRESETS.
//
// The screen can't read the Joy theme: it paints before JavaScript (index.html)
// and again inside a Suspense fallback that must not depend on a provider. So
// the skin's colors are flattened into this table and pushed onto :root as
// --startup-* custom properties instead.
//
// Values are derived from each preset: bg/surface from its body/popup
// backgrounds, and accent/soft/halo from its accent palette (600/100/200 in
// light, 300/900/800 in dark), border from its neutral (200/800). `default`
// keeps the hand-tuned colors the screen originally shipped with.
//
// index.html inlines a copy of this table so the pre-JavaScript screen is
// themed on first paint, before this module is downloaded. Keep the two in
// sync — tests/startup-screen.test.mjs asserts they are identical.
export const STARTUP_TOKEN_NAMES = [
  'bg',
  'surface',
  'accent',
  'soft',
  'halo',
  'border',
]

export const STARTUP_TOKENS = {
  default: {
    light: ['#fbfcfe', '#ffffff', '#0891b2', '#cffafe', '#a5f3fc', '#e9eaf0'],
    dark: ['#101216', '#1b1e25', '#67e8f9', '#164e63', '#155e75', '#2b2f39'],
  },
  forest: {
    light: ['#f4f8f4', '#f4faf6', '#059669', '#d1fae5', '#a7f3d0', '#e7e5e4'],
    dark: ['#101914', '#18251e', '#6ee7b7', '#064e3b', '#065f46', '#292524'],
  },
  lavender: {
    light: ['#f7f5fc', '#faf7ff', '#7c3aed', '#ede9fe', '#ddd6fe', '#e2e8f0'],
    dark: ['#171321', '#211c2e', '#c4b5fd', '#4c1d95', '#5b21b6', '#1e293b'],
  },
  sand: {
    light: ['#faf6ef', '#fffaf3', '#d97706', '#fef3c7', '#fde68a', '#e7e5e4'],
    dark: ['#1c1813', '#292219', '#fcd34d', '#78350f', '#92400e', '#292524'],
  },
  ocean: {
    light: ['#f0f6fc', '#f5faff', '#2563eb', '#dbeafe', '#bfdbfe', '#e2e8f0'],
    dark: ['#101923', '#192838', '#93c5fd', '#1e3a8a', '#1e40af', '#1e293b'],
  },
  rose: {
    light: ['#fff3f6', '#fff7fa', '#e11d48', '#ffe4e6', '#fecdd3', '#e4e4e7'],
    dark: ['#211419', '#301e26', '#fda4af', '#881337', '#9f1239', '#27272a'],
  },
  sunset: {
    light: ['#fff4ec', '#fff8f2', '#ea580c', '#ffedd5', '#fed7aa', '#e7e5e4'],
    dark: ['#231710', '#332319', '#fdba74', '#7c2d12', '#9a3412', '#292524'],
  },
  bubblegum: {
    light: ['#fff0f8', '#fff5fb', '#db2777', '#fce7f3', '#fbcfe8', '#e4e4e7'],
    dark: ['#100b10', '#1c121a', '#f9a8d4', '#831843', '#9d174d', '#27272a'],
  },
  mint: {
    light: ['#f0faf7', '#f5fcf9', '#0d9488', '#ccfbf1', '#99f6e4', '#e2e8f0'],
    dark: ['#101d1b', '#192d29', '#5eead4', '#134e4a', '#115e59', '#1e293b'],
  },
  // Graphite's accent *is* its neutral, so accent-100/200 would disappear into
  // the body. Its soft/halo are shifted two shades darker for contrast.
  graphite: {
    light: ['#f4f4f5', '#fafafa', '#52525b', '#e4e4e7', '#d4d4d8', '#e4e4e7'],
    dark: ['#141416', '#222225', '#d4d4d8', '#27272a', '#3f3f46', '#27272a'],
  },
}

// Mirrors the inline applier in index.html. Inline styles on :root outrank the
// stylesheet's per-mode defaults, so the table always wins when it is applied
// and the CSS stays a working fallback when it isn't.
export const applyStartupTheme = (skin, mode) => {
  const root = document.documentElement
  root.setAttribute('data-startup-theme', mode)
  const tokens = (STARTUP_TOKENS[skin] ?? STARTUP_TOKENS.default)[mode]
  if (!tokens) return
  STARTUP_TOKEN_NAMES.forEach((name, index) => {
    root.style.setProperty(`--startup-${name}`, tokens[index])
  })
}
