import { COLORS } from '@/constants/theme'
import { DEFAULT_THEME_SKIN, THEME_PRESETS } from '@/constants/themePresets'

// Read by the inline script in index.html before first paint; keep in sync.
export const STARTUP_THEME_STORAGE_KEY = 'donetick-startup-theme'

// The startup screen's cyan look is the default skin, so only other skins are
// saved. Each entry becomes a --startup-skin-<name> property on <html>.
export const getStartupThemeColors = skin => {
  const preset = THEME_PRESETS[skin]
  if (!preset || skin === DEFAULT_THEME_SKIN) return null
  const accent = COLORS[preset.accent]
  return {
    light: {
      bg: preset.light.body,
      accent: accent[600],
      soft: accent[100],
      halo: accent[200],
    },
    dark: {
      bg: preset.dark.body,
      accent: accent[300],
      soft: accent[900],
      halo: accent[800],
    },
  }
}

export const saveStartupTheme = skin => {
  const colors = getStartupThemeColors(skin)
  try {
    if (colors) {
      window.localStorage.setItem(
        STARTUP_THEME_STORAGE_KEY,
        JSON.stringify(colors),
      )
    } else {
      window.localStorage.removeItem(STARTUP_THEME_STORAGE_KEY)
    }
  } catch {
    // Startup falls back to the default look when storage is unavailable.
  }
}
