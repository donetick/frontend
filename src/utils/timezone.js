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

// Fills in frequencyMetadata.timezone for a new chore. The server evaluates
// recurrences in it and falls back to UTC without one, so local due times
// would shift at DST. Nothing in the UI can change it afterwards, so:
// - an existing timezone is kept, and getProfileTimezone is never called;
// - the profile timezone comes first: it is the user's home zone, so a chore
//   created while travelling stays on home time;
// - the device timezone covers accounts without one, or a failed lookup.
export const withDefaultTimezone = async (metadata, getProfileTimezone) => {
  if (metadata?.timezone) return metadata
  let profileTimezone = null
  try {
    profileTimezone = await getProfileTimezone?.()
  } catch {
    // Fall through to the device timezone.
  }
  const timezone = canonicalTimezone(profileTimezone) ?? detectTimezone()
  return timezone ? { ...metadata, timezone } : metadata
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
