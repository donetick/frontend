import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export const LINK_TYPES = {
  email: 'email',
  phone: 'phone',
  url: 'url',
}

const HREF_PATTERN =
  /href\s*=\s*["']((?:https?:\/\/|www\.|mailto:|tel:)[^"']+)["']/i

const TEXT_URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/i

const TEXT_EMAIL_PATTERN =
  /(?:mailto:)?[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+/i

// Deliberately conservative so plain numbers (dates, counts, prices, ids) are
// not mistaken for phone numbers. A match needs an explicit country code, an
// area code in parentheses, separator-grouped digits, or a bare 10 digit run.
const TEXT_PHONE_PATTERN = new RegExp(
  '(?:^|[^\\w+])(' +
    [
      'tel:\\+?[\\d\\s().-]{6,20}\\d',
      '\\+\\d[\\d\\s().-]{5,18}\\d',
      '\\(\\d{2,4}\\)[\\s.-]*\\d{2,4}[\\s.-]*\\d{2,6}',
      '\\d{3}[\\s.-]\\d{3}[\\s.-]\\d{4}',
      '\\d{10}',
    ].join('|') +
    ')(?![\\w-])',
)

const TRAILING_PUNCTUATION_PATTERN = /[\])},.!?;:]+$/
const PHONE_TRAILING_PATTERN = /[\s.()-]+$/

// Trailing punctuation belongs to the sentence, not to the link.
const trimTrailing = (value, type) =>
  value.replace(
    type === LINK_TYPES.phone
      ? PHONE_TRAILING_PATTERN
      : TRAILING_PUNCTUATION_PATTERN,
    '',
  )

const normalizeUrl = value => {
  if (!value) return null

  const decodedValue = value.replaceAll('&amp;', '&')
  const trimmed = trimTrailing(decodedValue, LINK_TYPES.url)
  const url = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed

  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol)
      ? parsedUrl.href
      : null
  } catch {
    return null
  }
}

const normalizeEmail = value => {
  if (!value) return null

  const address = trimTrailing(
    value.replace(/^mailto:/i, '').trim(),
    LINK_TYPES.email,
  )

  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(address) ? address : null
}

const normalizePhone = value => {
  if (!value) return null

  const raw = trimTrailing(value.replace(/^tel:/i, '').trim(), LINK_TYPES.phone)
  const digits = raw.replace(/\D/g, '')

  if (digits.length < 7 || digits.length > 15) return null

  return { dial: `${raw.startsWith('+') ? '+' : ''}${digits}`, raw }
}

const buildLink = (type, value) => {
  if (type === LINK_TYPES.url) {
    const href = normalizeUrl(value)
    return href ? { href, label: getUrlHostname(href), type } : null
  }

  if (type === LINK_TYPES.email) {
    const address = normalizeEmail(value)
    return address ? { href: `mailto:${address}`, label: address, type } : null
  }

  const phone = normalizePhone(value)
  return phone ? { href: `tel:${phone.dial}`, label: phone.raw, type } : null
}

const matchLink = (text, type, pattern) => {
  const match = text.match(pattern)
  if (!match) return null

  // Phone matches capture the number in group 1 to keep the leading boundary out.
  const matched = match[1] ?? match[0]
  const start = match.index + match[0].indexOf(matched)
  const consumed = trimTrailing(matched, type)
  const link = buildLink(type, consumed)

  return link ? { end: start + consumed.length, link, start } : null
}

const findFirstLinkMatch = value => {
  if (typeof value !== 'string' || !value) return null

  const urlMatch = matchLink(value, LINK_TYPES.url, TEXT_URL_PATTERN)
  const candidates = [urlMatch]

  for (const [type, pattern] of [
    [LINK_TYPES.email, TEXT_EMAIL_PATTERN],
    [LINK_TYPES.phone, TEXT_PHONE_PATTERN],
  ]) {
    const match = matchLink(value, type, pattern)

    // Ignore emails/phones that are only part of a matched URL (paths, queries).
    const insideUrl =
      match &&
      urlMatch &&
      match.start >= urlMatch.start &&
      match.start < urlMatch.end

    if (match && !insideUrl) candidates.push(match)
  }

  return candidates.filter(Boolean).sort((a, b) => a.start - b.start)[0] || null
}

const extractLink = value => {
  if (typeof value !== 'string') return null

  const hrefMatch = value.match(HREF_PATTERN)?.[1]

  if (hrefMatch) {
    const type = /^mailto:/i.test(hrefMatch)
      ? LINK_TYPES.email
      : /^tel:/i.test(hrefMatch)
        ? LINK_TYPES.phone
        : LINK_TYPES.url
    const link = buildLink(type, hrefMatch)
    if (link) return link
  }

  return findFirstLinkMatch(value)?.link || null
}

export const getFirstLink = (...values) => {
  for (const value of values) {
    const link = extractLink(value)
    if (link) return link
  }

  return null
}

export const splitTextAtFirstLink = value => {
  const text = typeof value === 'string' ? value : ''
  const match = findFirstLinkMatch(text)

  if (!match) return { after: '', before: text, link: null }

  return {
    after: text.slice(match.end),
    before: text.slice(0, match.start),
    link: match.link,
  }
}

export const getUrlHostname = url => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url
  }
}

export const openExternalLink = link => {
  const href = typeof link === 'string' ? link : link?.href
  if (!href) return undefined

  // tel:/mailto: must be handed to the OS, the in-app browser cannot open them.
  if (/^(?:tel|mailto):/i.test(href)) {
    window.location.href = href
    return undefined
  }

  if (Capacitor.isNativePlatform()) {
    return Browser.open({ url: href })
  }

  return window.open(href, '_blank', 'noopener,noreferrer')
}
