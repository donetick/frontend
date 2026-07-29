import { useEffect, useState } from 'react'
import { useUserProfile } from '../../queries/UserQueries'
import {
  installFeedbackErrorListeners,
  markPromptDismissed,
  markPromptShown,
  shouldShowSentimentPrompt,
} from '../../service/FeedbackService'
import FeedbackModal from '../Modals/FeedbackModal'

// Let the screen settle before interrupting.
const OPEN_DELAY_MS = 4000

/**
 * Decides whether to surface the sentiment prompt automatically. Mount once,
 * near the main task list.
 */
const FeedbackPrompt = () => {
  const [open, setOpen] = useState(false)
  const { data: userProfile } = useUserProfile()

  useEffect(() => {
    installFeedbackErrorListeners()
  }, [])

  useEffect(() => {
    if (!userProfile) return

    let timer = null
    let cancelled = false

    shouldShowSentimentPrompt({ userProfile }).then(eligible => {
      if (!eligible || cancelled) return
      timer = setTimeout(() => {
        if (cancelled) return
        markPromptShown()
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
    <FeedbackModal
      open={open}
      onClose={() => setOpen(false)}
      onDismiss={markPromptDismissed}
    />
  )
}

export default FeedbackPrompt
