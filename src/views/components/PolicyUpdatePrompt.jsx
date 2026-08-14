import { useEffect, useState } from 'react'

import { useUserProfile } from '../../queries/UserQueries'
import {
  acknowledgePolicyUpdate,
  shouldShowPolicyUpdate,
} from '../../service/PolicyUpdateService'
import PolicyUpdateModal from '../Modals/PolicyUpdateModal'

// Let the screen settle before interrupting, and stay out of the way of the
// feedback prompt, which uses a longer delay from the same screen.
const OPEN_DELAY_MS = 1500

/**
 * Surfaces the policy-change notice once per revision. Mount once, near the
 * main task list.
 */
const PolicyUpdatePrompt = () => {
  const [open, setOpen] = useState(false)
  const { data: userProfile } = useUserProfile()

  useEffect(() => {
    if (!userProfile) return

    let timer = null
    let cancelled = false

    shouldShowPolicyUpdate({ userProfile }).then(eligible => {
      if (!eligible || cancelled) return
      timer = setTimeout(() => {
        if (cancelled) return
        setOpen(true)
      }, OPEN_DELAY_MS)
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [userProfile])

  if (!open) return null

  return (
    <PolicyUpdateModal
      open={open}
      onClose={() => setOpen(false)}
      onAcknowledge={acknowledgePolicyUpdate}
    />
  )
}

export default PolicyUpdatePrompt
