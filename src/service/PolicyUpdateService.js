import { Preferences } from '@capacitor/preferences'

import {
  POLICY_EFFECTIVE_DATE,
  POLICY_VERSION,
} from '../constants/policyUpdates'

const STATE_KEY = 'policyUpdateState'

const defaultState = {
  // Highest POLICY_VERSION the user has dismissed. 0 = never acknowledged.
  acknowledgedVersion: 2,
  acknowledgedAt: null,
  // Developer Settings escape hatch; never set in normal use.
  devForced: false,
}

let cachedState = null

const readState = async () => {
  if (cachedState) return cachedState
  try {
    const { value } = await Preferences.get({ key: STATE_KEY })
    cachedState = { ...defaultState, ...(value ? JSON.parse(value) : {}) }
  } catch (error) {
    console.warn('PolicyUpdateService: unable to read state', error)
    cachedState = { ...defaultState }
  }
  return cachedState
}

const writeState = async patch => {
  const current = await readState()
  cachedState = { ...current, ...patch }
  try {
    await Preferences.set({
      key: STATE_KEY,
      value: JSON.stringify(cachedState),
    })
  } catch (error) {
    // Worst case the notice is shown once more on the next launch, which is
    // strictly better than suppressing a legal notice we failed to record.
    console.warn('PolicyUpdateService: unable to persist state', error)
  }
}

export const getPolicyUpdateState = readState

// FeedbackService sees both spellings off the profile endpoint; match it.
const getSignupDate = userProfile =>
  userProfile?.createdAt || userProfile?.created_at || null

/**
 * The notice is for people who agreed to an *earlier* revision. Accounts
 * created on or after the effective date already signed up under the current
 * documents, so they are silently marked as acknowledged instead of being
 * interrupted by a change they never experienced.
 */
export const shouldShowPolicyUpdate = async ({ userProfile } = {}) => {
  const state = await readState()
  if (state.devForced) return true
  if (state.acknowledgedVersion >= POLICY_VERSION) return false

  // An unreadable signup date errs toward showing: a missed legal notice is
  // worse than one extra dismissal.
  const signupDate = getSignupDate(userProfile)
  const signedUpAt = signupDate ? new Date(signupDate) : null

  if (
    signedUpAt &&
    !isNaN(signedUpAt.getTime()) &&
    signedUpAt >= new Date(`${POLICY_EFFECTIVE_DATE}T00:00:00Z`)
  ) {
    await acknowledgePolicyUpdate()
    return false
  }

  return true
}

export const acknowledgePolicyUpdate = () =>
  writeState({
    acknowledgedVersion: POLICY_VERSION,
    acknowledgedAt: new Date().toISOString(),
    devForced: false,
  })

/** Developer Settings only: replay the notice on the next eligible mount. */
export const resetPolicyUpdate = () =>
  writeState({ acknowledgedVersion: 0, acknowledgedAt: null, devForced: true })
