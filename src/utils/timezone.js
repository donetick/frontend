// Resolve IANA aliases before comparing: e.g. US/Eastern and America/New_York.
export const canonicalTimezone = timezone => {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en', {
      timeZone: timezone,
    }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

export const detectTimezone = () => {
  try {
    return canonicalTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    return null
  }
}

export const needsTimezoneUpdate = (saved, detected) =>
  Boolean(detected && canonicalTimezone(saved) !== canonicalTimezone(detected))

export const getTimezones = (...included) => {
  let supported = []
  try {
    supported = Intl.supportedValuesOf?.('timeZone') || []
  } catch {
    // Older webviews may not support timezone enumeration.
  }
  return [...new Set([...supported, ...included, detectTimezone()])]
    .filter(timezone => canonicalTimezone(timezone))
    .sort()
}

export const timezoneLabel = timezone => {
  if (!timezone) return ''
  const label = timezone.replace(/_/g, ' ')
  try {
    const time = new Date().toLocaleTimeString(undefined, {
      timeZone: timezone,
      timeStyle: 'short',
    })
    return `${label} (${time})`
  } catch {
    return label
  }
}

export const timezonePromptKey = (userId, saved, detected) =>
  `timezone-prompt:${JSON.stringify([userId, canonicalTimezone(saved), detected])}`

export const TIMEZONE_SNOOZE_MS = 24 * 60 * 60 * 1000
