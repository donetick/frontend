import { parseRepeatV2 } from '../TaskParsers.js'

const WEEKDAY =
  '(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)'
const WEEKDAYS = new RegExp(`^every ${WEEKDAY}(?:(?:, ?| and | )${WEEKDAY})*$`)
const NTH_WEEKDAY = new RegExp(
  '^(first|second|third|fourth|last|[1-4](?:st|nd|rd|th)) ' +
    '(monday|tuesday|wednesday|thursday|friday|saturday|sunday) of (?:the )?month$',
)
const INTERVAL = /^every ([1-9]\d*) (days?|weeks?|months?|years?)$/
const MONTH_DAY = /^(\d+)(?:st|nd|rd|th)? of every month$/
const SIMPLE = new RegExp(
  '^(?:every day|daily|everyday|every week|weekly|every month|monthly|every year|' +
    'bi-?weekly|every other (?:day|week|month|year))$',
)

// Imports accept a documented subset of quick-add expressions. An anchored
// grammar is essential: the sentence parser intentionally ignores unknown words.
export function parseRepeatExpression(
  value,
  { referenceDate = new Date() } = {},
) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Repeat must be a nonempty recurrence phrase.')
  }
  const expression = value.trim().toLowerCase().replace(/\s+/g, ' ')
  const interval = expression.match(INTERVAL)
  const monthDay = expression.match(MONTH_DAY)
  if (
    !(
      SIMPLE.test(expression) ||
      interval ||
      monthDay ||
      WEEKDAYS.test(expression) ||
      NTH_WEEKDAY.test(expression)
    ) ||
    (interval && !Number.isSafeInteger(Number(interval[1]))) ||
    (monthDay && (Number(monthDay[1]) < 1 || Number(monthDay[1]) > 31))
  ) {
    throw new Error(
      `Unsupported recurrence: "${value}". Use a supported complete phrase, such as "every 2 weeks".`,
    )
  }
  const parsed = parseRepeatV2(expression, { referenceDate })
  if (!parsed.result || parsed.cleanedSentence.trim()) {
    throw new Error(`Could not fully parse recurrence: "${value}".`)
  }
  const schedule = parsed.result
  if (schedule.frequencyMetadata.unit) {
    schedule.frequencyMetadata.unit = schedule.frequencyMetadata.unit.replace(
      /s?$/,
      's',
    )
  }
  // Keep the same reference-time default as quick add. The payload builder
  // overrides it when the template supplies a first due date.
  return { ...parsed, result: schedule }
}
