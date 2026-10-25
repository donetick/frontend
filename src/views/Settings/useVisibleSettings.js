import { Capacitor } from '@capacitor/core'
import { useQuery } from '@tanstack/react-query'

import { getVisibleSettings } from '../../constants/settingsSections'
import { useUserProfile } from '../../queries/UserQueries'
import { isCloudInstance } from '../../service/FeedbackService'
import { isParentUser } from '../../utils/UserHelpers'

export const useVisibleSettings = () => {
  const { data: userProfile } = useUserProfile()
  const { data: isCloud } = useQuery({
    queryKey: ['settings', 'cloud-instance'],
    queryFn: isCloudInstance,
    staleTime: 5 * 60 * 1000,
  })
  return getVisibleSettings({
    isParent: isParentUser(userProfile),
    isNative: Capacitor.isNativePlatform(),
    isCloud,
  })
}
