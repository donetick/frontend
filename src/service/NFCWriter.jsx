import { CapacitorNfc } from '@capgo/capacitor-nfc'

// Encodes a URL into an NDEF URI record (TNF=0x01, type='U')
const buildUriRecord = url => {
  const encoder = new TextEncoder()
  let prefixByte = 0x00
  let uriStr = url
  if (url.startsWith('https://')) {
    prefixByte = 0x04
    uriStr = url.slice(8)
  } else if (url.startsWith('http://')) {
    prefixByte = 0x03
    uriStr = url.slice(7)
  }
  return {
    tnf: 0x01,
    type: [0x55],
    id: [],
    payload: [prefixByte, ...Array.from(encoder.encode(uriStr))],
  }
}

// Decodes a URL from an NDEF URI record payload. Returns null if not a URI record.
export const decodeNdefUrl = record => {
  if (!record || record.tnf !== 0x01) return null
  if (record.type.length !== 1 || record.type[0] !== 0x55) return null
  const payload = record.payload
  if (!payload || payload.length === 0) return null
  const prefixes = [
    '',
    'http://www.',
    'https://www.',
    'http://',
    'https://',
    'tel:',
    'mailto:',
  ]
  const prefix = prefixes[payload[0]] ?? ''
  const uri = new TextDecoder().decode(new Uint8Array(payload.slice(1)))
  return prefix + uri
}

// Starts a native NFC write session. Calls onWaiting once scanning is active,
// then onSuccess or onError when the write completes. Returns a cancel function.
export const startNativeNFCWrite = async (
  url,
  { onError, onSuccess, onWaiting },
) => {
  let listener = null
  let done = false

  const cleanup = async () => {
    if (listener) {
      await listener.remove()
      listener = null
    }
    await CapacitorNfc.stopScanning().catch(() => {})
  }

  try {
    listener = await CapacitorNfc.addListener('nfcEvent', async () => {
      if (done) return
      done = true
      try {
        await CapacitorNfc.write({ records: [buildUriRecord(url)] })
        await cleanup()
        onSuccess()
      } catch (err) {
        await cleanup()
        onError(err.message || 'Failed to write to NFC tag')
      }
    })

    await CapacitorNfc.startScanning({
      alertMessage: 'Hold your device near the NFC tag to write',
      invalidateAfterFirstRead: true,
      // Without FLAG_READER_SKIP_NDEF_CHECK (0x80), Android enumerates
      // Ndef/NdefFormatable tech so the plugin can format blank tags on write.
      androidReaderModeFlags: 0x0f, // NFC_A | NFC_B | NFC_F | NFC_V
    })
    onWaiting()
    return cleanup
  } catch (err) {
    await cleanup()
    onError(err.message || 'Failed to start NFC session')
    return async () => {}
  }
}

// Starts a native NFC scan session for reading. Calls onTag(url) when a URL
// NDEF record is found, or onError on failure. Returns a cancel function.
export const startNativeScan = async ({ onError, onTag }) => {
  let listener = null
  let done = false

  const cleanup = async () => {
    if (listener) {
      await listener.remove()
      listener = null
    }
    await CapacitorNfc.stopScanning().catch(() => {})
  }

  try {
    listener = await CapacitorNfc.addListener('nfcEvent', async event => {
      if (done) return
      const records = event.tag?.ndefMessage ?? []
      for (const record of records) {
        const url = decodeNdefUrl(record)
        if (url) {
          done = true
          await cleanup()
          onTag(url)
          return
        }
      }
    })

    await CapacitorNfc.startScanning({
      alertMessage: 'Hold your device near the NFC tag',
      invalidateAfterFirstRead: true,
    })
    return cleanup
  } catch (err) {
    await cleanup()
    onError(err.message || 'Failed to start NFC session')
    return async () => {}
  }
}

// Legacy default export for web/PWA (NDEFReader API)
const writeToNFC = async url => {
  if ('NDEFReader' in window) {
    try {
      const ndef = new window.NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: url }] })
    } catch (error) {
      console.error('Error writing to NFC tag:', error)
      alert('Error writing to NFC tag. Please try again.')
    }
  } else {
    alert('NFC is not supported by this browser.')
  }
}

export default writeToNFC
