// Every event has an explicit property allowlist. Unknown events are
// dropped entirely; unknown or mistyped properties are dropped individually.
// This is the mechanism (not just a convention) that keeps user-generated
// content and PII out of PostHog — see spec.md sections 2, 14, 22.

// Attached to every event so cohort analysis (e.g. "do Plus accounts behave
// differently") works without every call site having to pass them.
const COMMON_PROPS = {
  is_plus_account: 'boolean',
  circle_member_count: 'number',
}

const withCommon = props => ({ ...props, ...COMMON_PROPS })

export const EVENT_SCHEMAS = {
  onboarding_started: withCommon({}),
  onboarding_completed: withCommon({}),
  onboarding_skipped: withCommon({}),
  onboarding_option_selected: withCommon({
    option: 'string',
    step: 'string',
  }),

  chore_created: withCommon({
    has_due_date: 'boolean',
    has_assignee: 'boolean',
    has_labels: 'boolean',
    has_description: 'boolean',
    has_recurrence: 'boolean',
    recurrence_type: 'string',
    priority: 'number',
    // quick_add/voice/scan = the AddTaskModal popup; full_page/clone = the
    // dedicated create page (ChoreEdit.jsx with no existing chore id).
    source: 'enum:quick_add,voice,scan,full_page,clone',
  }),
  chore_updated: withCommon({
    has_due_date: 'boolean',
    has_assignee: 'boolean',
    has_labels: 'boolean',
    has_description: 'boolean',
    has_recurrence: 'boolean',
    recurrence_type: 'string',
    priority: 'number',
  }),

  thing_created: withCommon({}),
  project_created: withCommon({}),
  filter_created: withCommon({}),

  localization_setting_changed: withCommon({
    setting: 'enum:language,date_format,time_format,first_day_of_week',
    value: 'string',
  }),

  analytics_enabled: withCommon({
    source: 'enum:onboarding,settings',
  }),

  feedback_prompt_shown: withCommon({
    source: 'enum:auto,settings',
    shown_count: 'number',
  }),
  feedback_prompt_dismissed: withCommon({
    source: 'enum:auto,settings',
    shown_count: 'number',
  }),
  feedback_sentiment_selected: withCommon({
    sentiment: 'enum:love,okay,issues',
  }),
  feedback_review_action: withCommon({
    action: 'enum:github,appStore,playStore',
  }),
  feedback_submitted: withCommon({
    category:
      'enum:bugs,missingFeature,tooComplicated,slow,notifications,ai,other',
    has_message: 'boolean',
    result: 'enum:sent,failed,unconfigured,misconfigured,self-hosted',
  }),
}

export const ERROR_SCHEMAS = {
  api_error: {
    http_status: 'string',
    method: 'string',
    error_code: 'string',
    operation: 'string',
  },
}

const MAX_STRING_LENGTH = 200
// Defense in depth: operation/endpoint-like strings must never carry a query
// string even though callers are expected to have already stripped one.
const containsQueryOrDisallowedChars = value => /[?&=]/.test(value)

const isValidValue = (value, type) => {
  if (value === null || value === undefined) return false

  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'number') return typeof value === 'number' && !isNaN(value)

  if (type.startsWith('enum:')) {
    const allowed = type.slice('enum:'.length).split(',')
    return typeof value === 'string' && allowed.includes(value)
  }

  if (type === 'string') {
    return (
      typeof value === 'string' &&
      value.length <= MAX_STRING_LENGTH &&
      !containsQueryOrDisallowedChars(value)
    )
  }

  return false
}

/**
 * Drops the whole event if its name isn't recognized, then drops any
 * property that isn't in the schema or fails its type/enum check. Never
 * throws — a malformed call site loses data, it never crashes the app.
 */
export const sanitizeProperties = (schemas, eventName, properties = {}) => {
  const schema = schemas[eventName]
  if (!schema) {
    if (import.meta.env.DEV) {
      console.warn(`analytics: unknown event "${eventName}", dropping`)
    }
    return null
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(properties || {})) {
    const type = schema[key]
    if (!type) {
      if (import.meta.env.DEV) {
        console.warn(
          `analytics: dropping unknown property "${key}" on "${eventName}"`,
        )
      }
      continue
    }
    if (!isValidValue(value, type)) {
      if (import.meta.env.DEV) {
        console.warn(
          `analytics: dropping invalid property "${key}" on "${eventName}"`,
        )
      }
      continue
    }
    sanitized[key] = value
  }
  return sanitized
}

export const sanitizeEventProperties = (eventName, properties) =>
  sanitizeProperties(EVENT_SCHEMAS, eventName, properties)

export const sanitizeErrorProperties = (errorType, properties) =>
  sanitizeProperties(ERROR_SCHEMAS, errorType, properties)
