import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SafeArea } from 'capacitor-plugin-safe-area'

/**
 * StatusBarManager - A utility class to handle status bar configuration
 * following Capacitor best practices and theme-aware styling
 */
class StatusBarManager {
  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform()
    this.platform = Capacitor.getPlatform()
    this.listeners = []
    this.currentTheme = 'light'
    this.safeAreaApplied = false
  }

  /**
   * Initialize the status bar with proper configuration
   * @param {string} initialTheme - The initial theme ('light' | 'dark' | 'system')
   */
  async initialize(initialTheme = 'light') {
    if (!this.isNativePlatform) {
      console.log('StatusBarManager: Not running on native platform')
      return
    }

    try {
      // Configure basic status bar settings - use overlay: true for precise control
      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.show()

      // Set initial theme
      await this.setTheme(initialTheme)

      // Apply safe area insets
      await this.applySafeAreaInsets()

      console.log('StatusBarManager: Initialized successfully')
    } catch (error) {
      console.error('StatusBarManager: Failed to initialize:', error)
    }
  }

  /**
   * Set status bar style based on theme
   * @param {string} theme - The theme ('light' | 'dark' | 'system')
   */
  async setTheme(theme) {
    if (!this.isNativePlatform) return

    this.currentTheme = theme

    try {
      let style = Style.Light // Default to light content (dark status bar)

      if (theme === 'dark') {
        style = Style.Dark // Dark content (light status bar)
      } else if (theme === 'system') {
        // For system theme, we need to detect the actual system preference
        // Joy UI's useColorScheme will handle this, but we default to light
        style = Style.Light
      }

      await StatusBar.setStyle({ style })
      console.log(`StatusBarManager: Theme set to ${theme}, style: ${style}`)
    } catch (error) {
      console.error('StatusBarManager: Failed to set theme:', error)
    }
  }

  /**
   * Apply safe area insets using CSS custom properties
   * Components should use env() variables or CSS custom properties for proper safe area handling
   */
  async applySafeAreaInsets() {
    if (!this.isNativePlatform || this.safeAreaApplied) return

    try {
      // Get safe area insets
      const { insets } = await SafeArea.getSafeAreaInsets()

      // Apply CSS custom properties for safe area
      this.applySafeAreaCSS(insets)

      this.safeAreaApplied = true
      console.log('StatusBarManager: Safe area insets applied:', insets)
    } catch (error) {
      console.error(
        'StatusBarManager: Failed to apply safe area insets:',
        error,
      )
    }
  }

  /**
   * Apply safe area insets using CSS custom properties
   * @param {Object} insets - The safe area insets
   */
  applySafeAreaCSS(insets) {
    const root = document.documentElement

    // Set CSS custom properties that can be used throughout the app
    root.style.setProperty('--safe-area-inset-top', `${insets.top}px`)
    root.style.setProperty('--safe-area-inset-right', `${insets.right}px`)
    root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`)
    root.style.setProperty('--safe-area-inset-left', `${insets.left}px`)

    // Note: We no longer apply padding directly to the body to avoid double
    // application with component-level safe area handling. Components should
    // use the CSS custom properties or the utility classes from safe-area.css

    // Let's apply it directly to body for now:
    if (Capacitor.getPlatform() === 'android') {
      // removing the top padding on android as it is handled by the navbar
      // and adding it causes double padding
      // document.body.style.paddingTop = `${insets.top}px`
      document.body.style.paddingRight = `${insets.right}px`
      document.body.style.paddingBottom = `${insets.bottom}px`
      document.body.style.paddingLeft = `${insets.left}px`
    }
  }

  /**
   * Add a listener for theme changes
   * @param {Function} callback - Function to call when theme changes
   * @returns {Function} - Cleanup function to remove the listener
   */
  addThemeChangeListener(callback) {
    this.listeners.push(callback)

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of theme change
   * @param {string} newTheme - The new theme
   */
  notifyThemeChange(newTheme) {
    this.listeners.forEach(callback => {
      try {
        callback(newTheme)
      } catch (error) {
        console.error(
          'StatusBarManager: Error in theme change listener:',
          error,
        )
      }
    })
  }

  /**
   * Update status bar based on resolved theme (after system detection)
   * @param {string} resolvedTheme - The actual theme being used ('light' | 'dark')
   */
  async updateResolvedTheme(resolvedTheme) {
    if (!this.isNativePlatform) return

    try {
      const style = resolvedTheme === 'dark' ? Style.Dark : Style.Light
      await StatusBar.setStyle({ style })
      console.log(
        `StatusBarManager: Resolved theme updated to ${resolvedTheme}`,
      )
    } catch (error) {
      console.error('StatusBarManager: Failed to update resolved theme:', error)
    }
  }

  /**
   * Hide the status bar
   */
  async hide() {
    if (!this.isNativePlatform) return

    try {
      await StatusBar.hide()
    } catch (error) {
      console.error('StatusBarManager: Failed to hide status bar:', error)
    }
  }

  /**
   * Show the status bar
   */
  async show() {
    if (!this.isNativePlatform) return

    try {
      await StatusBar.show()
    } catch (error) {
      console.error('StatusBarManager: Failed to show status bar:', error)
    }
  }

  /**
   * Get current status bar info
   */
  async getInfo() {
    if (!this.isNativePlatform) return null

    try {
      return await StatusBar.getInfo()
    } catch (error) {
      console.error('StatusBarManager: Failed to get status bar info:', error)
      return null
    }
  }

  /**
   * Clean up all listeners and reset state
   */
  cleanup() {
    this.listeners = []
    this.safeAreaApplied = false
    console.log('StatusBarManager: Cleaned up')
  }
}

// Create and export a singleton instance
const statusBarManager = new StatusBarManager()
export default statusBarManager
