import { Preferences } from '@capacitor/preferences'

import { API_URL } from '../Config'

/**
 * Which backend this app is talking to, and whether that backend is one we run.
 * The answer decides what help we can offer when it stops answering: our own
 * status page for Donetick Cloud, or "go look at your container" for everyone
 * who self-hosts.
 */

export const DONETICK_STATUS_URL = 'https://get.donetick.com/status'

const OFFICIAL_HOST = 'donetick.com'

/** The configured server: a custom one from the login screen, else the build's. */
export const getServerBaseUrl = async () => {
  try {
    const { value } = await Preferences.get({ key: 'customServerUrl' })
    return value || API_URL || ''
  } catch {
    return API_URL || ''
  }
}

// API_URL is `hostname/api` in AUTO builds, so a bare host has to parse too.
const parseHost = url => {
  if (!url) return ''
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host
  } catch {
    return String(url)
  }
}

export const getServerHost = url => parseHost(url)

export const isOfficialServer = url => {
  const host = parseHost(url).toLowerCase()
  return host === OFFICIAL_HOST || host.endsWith(`.${OFFICIAL_HOST}`)
}
