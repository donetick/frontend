import { useTranslation } from 'react-i18next'

import { useCircleMembers } from '../queries/UserQueries'
import { isSharedInbox } from '../utils/Inbox'

// Derive the label at render time so cached project names cannot become stale.
export const useInboxLabel = () => {
  const { data } = useCircleMembers()
  const { t } = useTranslation('chores')
  return t(isSharedInbox(data?.res) ? 'inbox.sharedName' : 'inbox.name')
}
