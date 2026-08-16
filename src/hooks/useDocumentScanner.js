import { Capacitor } from '@capacitor/core'

/**
 * Normalizes a raw image string from the native document scanner into a
 * format that can be used as an <img> src and passed to Tesseract.js.
 *
 * Android returns file:// or absolute paths → convert via Capacitor.convertFileSrc
 * iOS returns raw base64 (no data: prefix) → prepend the data URI scheme
 */
function normalizeScannedImage(raw) {
  if (!raw) return null
  if (raw.startsWith('data:')) return raw
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('content://')
  )
    return raw
  if (raw.startsWith('/') || raw.startsWith('file://'))
    return Capacitor.convertFileSrc(raw)
  // iOS base64 without prefix
  return `data:image/jpeg;base64,${raw}`
}

/**
 * Hook for native document scanning via @capgo/capacitor-document-scanner.
 *
 * On native: opens the OS document scanner (edge detection, perspective correction).
 * On web:   `scanDocument` returns null — callers should fall back to their own camera UI.
 */
export function useDocumentScanner() {
  const isNativeScanner = Capacitor.isNativePlatform()

  const scanDocument = async ({
    letUserAdjustCrop = false,
    maxDocuments = 1,
    quality = 90,
  } = {}) => {
    if (!isNativeScanner) return { image: null, cancelled: false }

    try {
      const { DocumentScanner } =
        await import('@capgo/capacitor-document-scanner')
      const { scannedImages } = await DocumentScanner.scanDocument({
        croppedImageQuality: quality,
        maxNumDocuments: maxDocuments,
        letUserAdjustCrop,
      })

      if (!scannedImages?.length) return { image: null, cancelled: true }

      const normalized = normalizeScannedImage(scannedImages[0])
      return { image: normalized, cancelled: false }
    } catch (e) {
      console.error('[DocumentScanner] scan failed:', e)
      return { image: null, cancelled: false, error: e.message }
    }
  }

  return { isNativeScanner, scanDocument }
}
