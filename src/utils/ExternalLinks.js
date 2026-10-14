import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

const HREF_URL_PATTERN = /href\s*=\s*["']((?:https?:\/\/|www\.)[^"']+)["']/i
const TEXT_URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/i
const TRAILING_PUNCTUATION_PATTERN = /[\])},.!?;:]+$/

const normalizeUrl = value => {
  if (!value) return null

  const decodedValue = value.replaceAll('&amp;', '&')
  const withoutTrailingPunctuation = decodedValue.replace(
    TRAILING_PUNCTUATION_PATTERN,
    '',
  )
  const url = /^www\./i.test(withoutTrailingPunctuation)
    ? `https://${withoutTrailingPunctuation}`
    : withoutTrailingPunctuation

  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol)
      ? parsedUrl.href
      : null
  } catch {
    return null
  }
}

const extractUrl = value => {
  if (typeof value !== 'string') return null

  const hrefMatch = value.match(HREF_URL_PATTERN)
  return normalizeUrl(hrefMatch?.[1] || value.match(TEXT_URL_PATTERN)?.[0])
}

export const getFirstHttpUrl = (...values) => {
  for (const value of values) {
    const url = extractUrl(value)
    if (url) return url
  }

  return null
}

export const splitTextAtFirstHttpUrl = value => {
  const text = typeof value === 'string' ? value : ''
  const match = text.match(TEXT_URL_PATTERN)

  if (!match) return { after: '', before: text, url: null }

  const matchedUrl = match[0].replace(TRAILING_PUNCTUATION_PATTERN, '')
  const url = normalizeUrl(matchedUrl)

  if (!url) return { after: '', before: text, url: null }

  const start = match.index
  return {
    after: text.slice(start + matchedUrl.length),
    before: text.slice(0, start),
    url,
  }
}

export const getUrlHostname = url => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url
  }
}

export const openExternalUrl = url => {
  if (Capacitor.isNativePlatform()) {
    return Browser.open({ url })
  }

  return window.open(url, '_blank', 'noopener,noreferrer')
}
