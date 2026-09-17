import { useColorScheme } from '@mui/joy'
import { useEffect } from 'react'

import { THEME_BACKGROUND } from '@/constants/theme'

import statusBarManager from '../utils/StatusBarManager'

// The Capacitor StatusBar plugin only runs on native builds. On the web/PWA the
// OS reads <meta name="theme-color"> for the status bar, so sync it here —
// otherwise it stays at the hardcoded light value even in dark mode.
const setMetaThemeColor = resolvedTheme => {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const color = THEME_BACKGROUND[resolvedTheme] ?? THEME_BACKGROUND.light
  meta.setAttribute('content', color)
}

/**
 * Custom hook to manage status bar integration with Joy UI themes
 * This hook automatically syncs the status bar style with the current theme
 */
export const useStatusBar = () => {
  const { mode, systemMode } = useColorScheme()

  useEffect(() => {
    // Initialize status bar on mount
    const initializeStatusBar = async () => {
      await statusBarManager.initialize(mode)
    }

    initializeStatusBar()

    // Cleanup on unmount
    return () => {
      statusBarManager.cleanup()
    }
  }, [mode]) // Include mode dependency

  useEffect(() => {
    // Update status bar when theme changes
    const updateStatusBarTheme = async () => {
      let resolvedTheme = mode

      // Handle system mode by using the detected system theme
      if (mode === 'system') {
        resolvedTheme = systemMode || 'light'
      }

      // Sync the web/PWA theme-color meta tag (browser equivalent of the
      // native StatusBar update below).
      setMetaThemeColor(resolvedTheme)

      // Update the status bar with the resolved theme
      await statusBarManager.updateResolvedTheme(resolvedTheme)

      // Notify any custom listeners
      statusBarManager.notifyThemeChange(resolvedTheme)
    }

    updateStatusBarTheme()
  }, [mode, systemMode]) // Update when either mode or systemMode changes

  return {
    statusBarManager,
    currentTheme: mode,
    resolvedTheme: mode === 'system' ? systemMode : mode,
  }
}

export default useStatusBar
