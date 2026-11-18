export const DEFAULT_OVERDUE_NAGGING_MINUTES = 60
export const MAX_OVERDUE_NAGGING_MINUTES = 10080
export const DEFAULT_OVERDUE_FOLLOW_UP_LIMIT = 3
export const MAX_OVERDUE_FOLLOW_UP_LIMIT = 100

export const isValidFollowUpLimit = limit =>
  Number.isInteger(limit) && limit >= 1 && limit <= MAX_OVERDUE_FOLLOW_UP_LIMIT

export const isValidFollowUpInterval = minutes =>
  Number.isInteger(minutes) &&
  minutes >= 1 &&
  minutes <= MAX_OVERDUE_NAGGING_MINUTES

export const isValidOverdueNagging = value =>
  !value ||
  (isValidFollowUpInterval(value.intervalMinutes) &&
    (value.continueUntilComplete ||
      isValidFollowUpLimit(
        value.maxFollowUps ?? DEFAULT_OVERDUE_FOLLOW_UP_LIMIT,
      )))
