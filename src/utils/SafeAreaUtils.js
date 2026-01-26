import { Capacitor } from '@capacitor/core'

/**
 * Utility functions for handling safe area insets consistently across the app
 */

/**
 * Get the appropriate bottom value that accounts for safe area insets
 * @param {number|string} baseBottom - The base bottom value (default: 0)
 * @param {number|string} extraPadding - Additional padding to add (default: 0)
 * @returns {string} - CSS calc() expression for bottom positioning
 */
export const getSafeBottom = (baseBottom = 0, extraPadding = 0) => {
  const base = typeof baseBottom === 'number' ? `${baseBottom}px` : baseBottom
  const extra =
    typeof extraPadding === 'number' ? `${extraPadding}px` : extraPadding

  if (Capacitor.getPlatform() === 'android') {
    if (extraPadding) {
      return `calc(var(--safe-area-inset-bottom, 0px) + ${base} + ${extra})`
    }
    return `calc(var(--safe-area-inset-bottom, 0px) + ${base})`
  }

  // For iOS and web, safe area is already handled by the system
  if (extraPadding) {
    return `calc(${base} + ${extra})`
  }
  return base
}

/**
 * Get safe area padding for bottom elements
 * @param {number|string} extraPadding - Additional padding to add
 * @returns {string} - CSS calc() expression for padding
 */
export const getSafeBottomPadding = (extraPadding = 0) => {
  const extra =
    typeof extraPadding === 'number' ? `${extraPadding * 8}px` : extraPadding

  if (Capacitor.getPlatform() === 'android') {
    if (extraPadding) {
      return `calc(var(--safe-area-inset-bottom, 0px) + ${extra})`
    }
    return `var(--safe-area-inset-bottom, 0px)`
  }

  return extra || '0px'
}

/**
 * Get safe area styles object for common bottom-positioned elements
 * @param {object} options - Configuration options
 * @param {number|string} options.bottom - Bottom position value
 * @param {number|string} options.padding - Additional padding
 * @param {'fixed'|'absolute'|'sticky'} options.position - Position type
 * @returns {object} - Style object
 */
export const getSafeBottomStyles = ({
  bottom = 0,
  padding = 0,
  position = 'fixed',
} = {}) => {
  return {
    position,
    bottom: getSafeBottom(bottom, padding),
  }
}

/**
 * Hook-like function to get safe area values for use in components
 * @returns {object} - Object with safe area utility functions
 */
export const useSafeArea = () => {
  return {
    getSafeBottom,
    getSafeBottomPadding,
    getSafeBottomStyles,
    isAndroid: Capacitor.getPlatform() === 'android',
    isNative: Capacitor.isNativePlatform(),
  }
}

export default {
  getSafeBottom,
  getSafeBottomPadding,
  getSafeBottomStyles,
  useSafeArea,
}
