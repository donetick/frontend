import { useImpersonateUser } from '../contexts/ImpersonateUserContext'
import { useCircleMembers, useUserProfile } from '../queries/UserQueries'
import { getChorePermissions } from '../utils/ChoreAccess'

export const useChorePermissions = chore => {
  const { data: user } = useUserProfile()
  const { data: members } = useCircleMembers()
  const { impersonatedUser } = useImpersonateUser()
  return getChorePermissions(
    chore,
    impersonatedUser?.userId || user?.id,
    members?.res || [],
  )
}
