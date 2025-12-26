import moment from 'moment'
import { apiClient } from './apiClient'

const isPlusAccount = userProfile => {
  return userProfile?.expiration && moment(userProfile?.expiration).isAfter()
}

const resolvePhotoURL = url => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('https')) {
    return url
  }
  if (url.startsWith('assets')) {
    return apiClient.getAssetURL(url)
  }
  return url
}
export { isPlusAccount, resolvePhotoURL }
