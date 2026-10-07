import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { track } from '../analytics'
import SubscriptionModal from '../components/SubscriptionModal'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'

// Where the user ran into the wall. Used for the modal's lead line and for the
// analytics event, so we can see which gate actually drives upgrades.
export const PAYWALL_REASON = {
  ADVANCED_REMINDERS: 'advanced_reminders',
  REMINDER_CHANNELS: 'reminder_channels',
  HISTORY_WINDOW: 'history_window',
  THING_TRIGGERS: 'thing_triggers',
  PROJECT_LIMIT: 'project_limit',
  QUICK_FILTER_LIMIT: 'quick_filter_limit',
  FILE_UPLOAD: 'file_upload',
}

const PaywallContext = createContext(null)

// Components deep in the tree (the reminder editor, the history filters) are
// also rendered by the marketing app, which has no provider and no session.
// There, treat everything as unlocked and make `showPaywall` a no-op so the
// demo keeps working instead of rendering a dead lock icon.
const UNGATED_FALLBACK = {
  isPlus: true,
  isPlanKnown: true,
  showPaywall: () => {},
}

export const usePaywall = () => useContext(PaywallContext) ?? UNGATED_FALLBACK

export const PaywallProvider = ({ children }) => {
  const { data: userProfile } = useUserProfile()
  const [reason, setReason] = useState(null)

  const isPlus = isPlusAccount(userProfile)
  // Until the profile lands, `isPlus` is false only because we don't know yet.
  // Anything destructive (trimming a Plus user's reminders back to the free
  // allowance) must wait for this, while the click-time gates can treat an
  // unknown plan as free — the worst case there is a dismissable modal.
  const isPlanKnown = Boolean(userProfile)

  const showPaywall = useCallback(nextReason => {
    setReason(nextReason ?? null)
    track('paywall_shown', { reason: nextReason ?? 'unknown' })
  }, [])

  const value = useMemo(
    () => ({ isPlus, isPlanKnown, showPaywall }),
    [isPlus, isPlanKnown, showPaywall],
  )

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <SubscriptionModal
        open={reason !== null}
        reason={reason}
        onClose={() => setReason(null)}
      />
    </PaywallContext.Provider>
  )
}

export default PaywallProvider
