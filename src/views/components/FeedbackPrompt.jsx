import { useEffect, useState } from 'react'

import { track } from '../../analytics'
import { useUserProfile } from '../../queries/UserQueries'
import {
  evaluatePromptEligibility,
  installFeedbackErrorListeners,
  markPromptDismissed,
  markPromptShown,
} from '../../service/FeedbackService'
import FeedbackModal from '../Modals/FeedbackModal'

// Let the screen settle before interrupting.
const OPEN_DELAY_MS = 4000

// This component remounts on every visit to the task list, and most users are
// blocked by the same gate every time. Reporting once per app session keeps
// the event a population measure ("what share of sessions are muted, and by
// what") instead of a count of how often people open that screen.
let suppressionReported = false

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

    evaluatePromptEligibility({ userProfile }).then(({ blockerCodes }) => {
      if (cancelled) return

      if (blockerCodes.length > 0) {
        if (!suppressionReported) {
          suppressionReported = true
          // Only the first gate: they compound, and the most permanent one
          // is the only one worth acting on.
          track('feedback_prompt_suppressed', { blocker: blockerCodes[0] })
        }
        return
      }

      timer = setTimeout(async () => {
        if (cancelled) return
        // Awaited so the persisted shownCount is settled before the modal
        // reads it back for the feedback_prompt_shown event.
        await markPromptShown()
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
    <FeedbackModal
      open={open}
      onClose={() => setOpen(false)}
      onDismiss={markPromptDismissed}
      source='auto'
    />
  )
}

export default FeedbackPrompt
