import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { SendIntent } from '@supernotes/capacitor-send-intent'

const PENDING_SHARE_KEY = 'donetick.pendingShare'

const decodeUri = value => {
  if (!value) return null
  let decoded = value
  // The iOS extension passes values through URLComponents after encoding them,
  // so older versions of iOS can leave the file URL encoded twice.
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    } catch {
      break
    }
  }
  return decoded
}

const normalizeItem = item => ({
  description: item?.description || null,
  title: item?.title || null,
  type: item?.type || null,
  url: item?.type === 'text/plain' ? item?.url || null : decodeUri(item?.url),
})

const hasContent = item => item.title || item.description || item.url

export const normalizeShareIntent = result => {
  if (!result) return null
  const items = [result, ...(result.additionalItems || [])]
    .map(normalizeItem)
    .filter(hasContent)
  if (items.length === 0) return null
  return { id: `${Date.now()}-${Math.random()}`, items }
}

export const storePendingShare = share => {
  if (!share) return
  sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(share))
}

export const consumePendingShare = () => {
  const value = sessionStorage.getItem(PENDING_SHARE_KEY)
  sessionStorage.removeItem(PENDING_SHARE_KEY)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const receivePendingShare = async onShare => {
  try {
    const share = normalizeShareIntent(
      await SendIntent.checkSendIntentReceived(),
    )
    if (share) onShare(share)
  } catch {
    // "No processing needed" is the plugin's normal response when the app was
    // opened directly rather than from the platform share sheet.
  }
}

const base64ToBlob = (data, type) => {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: type || 'application/octet-stream' })
}

export const sharedItemToFile = async item => {
  if (!item) return null

  if (item.type === 'text/plain') {
    const content = item.url || item.description || item.title
    if (!content) return null

    // Native share APIs expose selected text and web links as text rather than
    // files. Materialize that value so it follows the same draft-attachment
    // flow as documents, audio, and video.
    const isLink = /^https?:\/\//i.test(content)
    return new File([content], isLink ? 'shared-link.txt' : 'shared-text.txt', {
      type: 'text/plain',
    })
  }

  if (!item.url) return null

  const name = item.title || `shared-${Date.now()}`
  let blob

  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.readFile({ path: item.url })
    blob =
      typeof result.data === 'string'
        ? base64ToBlob(result.data, item.type)
        : result.data
    // Both native implementations copy incoming files to temporary private
    // storage. The File now owns the bytes, so remove that copy rather than
    // accumulating every item ever shared with Donetick.
    void Filesystem.deleteFile({ path: item.url }).catch(() => {})
  } else {
    const response = await fetch(item.url)
    blob = await response.blob()
  }

  return new File([blob], name, {
    type: item.type || blob.type || 'application/octet-stream',
  })
}

export const fileToDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
