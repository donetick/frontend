export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const sortWeekdays = days =>
  [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
