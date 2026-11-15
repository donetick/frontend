// Per-browser defaults applied to newly created tasks.

const DEFAULT_ROLLING_KEY = 'defaultRollingSetting'

// true: "reschedule from completion date", false: "reschedule from due date".
export const getDefaultIsRolling = () => {
  try {
    return JSON.parse(localStorage.getItem(DEFAULT_ROLLING_KEY)) === true
  } catch {
    return false
  }
}

export const setDefaultIsRolling = isRolling => {
  localStorage.setItem(DEFAULT_ROLLING_KEY, JSON.stringify(Boolean(isRolling)))
}
