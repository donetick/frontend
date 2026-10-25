// Skins are independent of light/dark mode. Keep IDs stable: they are persisted.
export const THEME_SKIN_STORAGE_KEY = 'donetick-theme-skin'
export const DEFAULT_THEME_SKIN = 'default'

export const THEME_PRESETS = {
  default: {
    accent: 'cyan',
    swatch: '#06b6d4',
    light: { body: '#FFFFFF', surface: '#FBFCFE', popup: '#FFFFFF' },
    dark: { body: '#000000', surface: '#0B0D0E', popup: '#000000' },
  },
  forest: {
    accent: 'emerald',
    neutral: 'stone',
    swatch: '#059669',
    light: { body: '#f4f8f4', surface: '#eaf4ed', popup: '#f4faf6' },
    dark: { body: '#101914', surface: '#18251e', popup: '#18251e' },
  },
  lavender: {
    accent: 'violet',
    neutral: 'slate',
    swatch: '#7c3aed',
    light: { body: '#f7f5fc', surface: '#f0eafa', popup: '#faf7ff' },
    dark: { body: '#171321', surface: '#211c2e', popup: '#211c2e' },
  },
  sand: {
    accent: 'amber',
    neutral: 'stone',
    swatch: '#b45309',
    light: { body: '#faf6ef', surface: '#f3eadc', popup: '#fffaf3' },
    dark: { body: '#1c1813', surface: '#292219', popup: '#292219' },
  },
  ocean: {
    accent: 'blue',
    neutral: 'slate',
    swatch: '#1d4ed8',
    light: { body: '#f0f6fc', surface: '#e5effa', popup: '#f5faff' },
    dark: { body: '#101923', surface: '#192838', popup: '#192838' },
  },
  rose: {
    accent: 'rose',
    neutral: 'zinc',
    swatch: '#be123c',
    light: { body: '#fff3f6', surface: '#fce7ee', popup: '#fff7fa' },
    dark: { body: '#211419', surface: '#301e26', popup: '#301e26' },
  },
  sunset: {
    accent: 'orange',
    neutral: 'stone',
    swatch: '#c2410c',
    light: { body: '#fff4ec', surface: '#ffeadb', popup: '#fff8f2' },
    dark: { body: '#231710', surface: '#332319', popup: '#332319' },
  },
  // Keep the persisted ID so existing selections upgrade to Hot Pink.
  bubblegum: {
    accent: 'pink',
    neutral: 'zinc',
    solidShade: 600,
    swatch: '#ec4899',
    light: { body: '#fff0f8', surface: '#fcdaed', popup: '#fff5fb' },
    dark: { body: '#100b10', surface: '#1c121a', popup: '#24151f' },
    darkPrimary: {
      plainColor: '#ff4da6',
      outlinedColor: '#ff4da6',
      outlinedBorder: '#a82568',
      solidBg: '#ff1493',
      solidColor: '#1a0712',
      solidHoverBg: '#ff47aa',
      solidActiveBg: '#ff0080',
      softBg: '#351027',
      softHoverBg: '#491234',
      softActiveBg: '#5a153f',
      softColor: '#ff75bd',
    },
  },
  mint: {
    accent: 'teal',
    neutral: 'slate',
    swatch: '#0d9488',
    light: { body: '#f0faf7', surface: '#e0f3ed', popup: '#f5fcf9' },
    dark: { body: '#101d1b', surface: '#192d29', popup: '#192d29' },
  },
  graphite: {
    accent: 'zinc',
    neutral: 'zinc',
    swatch: '#3f3f46',
    light: { body: '#f4f4f5', surface: '#eaeaed', popup: '#fafafa' },
    dark: { body: '#141416', surface: '#222225', popup: '#222225' },
  },
}

export const resolveThemeSkin = value =>
  Object.hasOwn(THEME_PRESETS, value) ? value : DEFAULT_THEME_SKIN

export const readThemeSkin = storage => {
  try {
    return resolveThemeSkin(
      (storage ?? window.localStorage).getItem(THEME_SKIN_STORAGE_KEY),
    )
  } catch {
    // Storage can be disabled in private browsing or embedded webviews.
    return DEFAULT_THEME_SKIN
  }
}
