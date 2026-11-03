import { JSON_SCHEMA, load } from 'js-yaml'

import { parseRepeatExpression } from './parseRepeatExpression.js'

export const MAX_IMPORT_TASKS = 200
export const MAX_IMPORT_BYTES = 256 * 1024
const TASK_FIELDS = new Set([
  'title',
  'description',
  'due',
  'repeat',
  'labels',
  'priority',
  'subtasks',
  'subTasks',
  'checklist',
])
const absent = value => value === null || value === undefined
const object = value =>
  value && typeof value === 'object' && !Array.isArray(value)
const assertFields = (value, fields) => {
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) throw new Error(`Unknown field: ${field}.`)
  }
}

function parseDue(value) {
  if (typeof value !== 'string')
    throw new Error('Due must be a quoted date or ISO timestamp.')
  const day = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/)
  if (!day)
    throw new Error(
      'Due must use YYYY-MM-DD or an ISO timestamp with an offset.',
    )
  const [, year, month, date] = day.map(Number)
  const check = new Date(0)
  check.setUTCFullYear(year, month - 1, date)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== date
  ) {
    throw new Error('Due contains an invalid calendar date.')
  }
  if (value.length === 10) {
    const local = new Date(`${value}T23:59:59`)
    return local.toISOString()
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(
      'Timed due dates must include Z or an explicit timezone offset.',
    )
  }
  return new Date(value).toISOString()
}

function parsePriority(value) {
  if (absent(value)) return 0
  if (typeof value === 'string' && /^p[1-4]$/i.test(value.trim()))
    return Number(value.trim().slice(1))
  if (Number.isInteger(value) && value >= 0 && value <= 4) return value
  throw new Error('Priority must be an integer from 0 to 4 or P1, P2, P3, P4.')
}

function parseSubtasks(task) {
  const fields = ['subtasks', 'subTasks', 'checklist'].filter(field =>
    Object.hasOwn(task, field),
  )
  if (fields.length > 1)
    throw new Error('Use only one of subtasks, subTasks, or checklist.')
  const value = task[fields[0]]
  if (absent(value)) return []
  if (
    !Array.isArray(value) ||
    value.some(name => typeof name !== 'string' || !name.trim())
  )
    throw new Error('Subtasks/checklist must be a list of nonempty titles.')
  return value.map(name => name.trim())
}

function parseTask(task, index, referenceDate) {
  if (!object(task)) throw new Error('Each task must be an object.')
  assertFields(task, TASK_FIELDS)
  if (typeof task.title !== 'string' || !task.title.trim())
    throw new Error('Title is required.')
  if (!absent(task.description) && typeof task.description !== 'string')
    throw new Error('Description must be text.')
  if (
    !absent(task.labels) &&
    (!Array.isArray(task.labels) ||
      task.labels.some(label => typeof label !== 'string' || !label.trim()))
  ) {
    throw new Error('Labels must be a list of nonempty names.')
  }
  const repeat = absent(task.repeat)
    ? null
    : parseRepeatExpression(task.repeat, { referenceDate })
  const dueDate = absent(task.due) ? null : parseDue(task.due)
  // Monthly-day parsing suggests a first occurrence. Reject JS date rollover
  // (e.g. February 31) rather than silently changing the intended day.
  if (!dueDate && repeat?.dueDate) {
    const day = task.repeat.match(/^\s*(\d+)/)?.[1]
    if (day && new Date(repeat.dueDate).getDate() !== Number(day)) {
      throw new Error(
        'This month has no such day. Supply an explicit first due date.',
      )
    }
  }
  if (
    dueDate &&
    repeat &&
    /^\d+(?:st|nd|rd|th)?\s+of\s+every\s+month$/i.test(task.repeat.trim())
  ) {
    if (
      new Date(dueDate).getDate() !== Number(task.repeat.match(/^\s*(\d+)/)[1])
    ) {
      throw new Error(
        'First due date must match the day in the monthly repeat.',
      )
    }
  }
  if (dueDate && repeat?.result.frequencyType === 'days_of_the_week') {
    const first = new Date(dueDate)
    const weekday = first
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase()
    if (
      !repeat.result.frequencyMetadata.days.some(
        day => day.toLowerCase() === weekday,
      )
    ) {
      throw new Error('First due date must match a weekday in the repeat.')
    }
    const occurrences = repeat.result.frequencyMetadata.occurrences
    if (occurrences) {
      const nth = Math.ceil(first.getDate() / 7)
      const nextWeek = new Date(first)
      nextWeek.setDate(first.getDate() + 7)
      if (
        !occurrences.includes(nth) &&
        !(occurrences.includes(-1) && nextWeek.getMonth() !== first.getMonth())
      ) {
        throw new Error(
          'First due date must match the occurrence in the repeat.',
        )
      }
    }
  }
  return {
    key: index,
    title: task.title.trim(),
    description: task.description ?? null,
    priority: parsePriority(task.priority),
    subtasks: parseSubtasks(task),
    labels: [...new Set((task.labels || []).map(label => label.trim()))],
    dueDate: dueDate ?? repeat?.dueDate ?? null,
    repeat: repeat?.result ?? null,
    repeatName: repeat?.name ?? null,
  }
}

// Pure ingestion: no network calls, IDs, account defaults, or task creation.
export function parseTaskImport(
  text,
  { format = 'template', referenceDate = new Date() } = {},
) {
  const errors = []
  const tasks = []
  try {
    if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
      throw new Error('Import is too large (maximum 256 KB).')
    let rows
    let globalLabels = []
    if (format === 'lines') {
      rows = text
        .split(/\r?\n/)
        .map(title =>
          title.trim().replace(/^(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, ''),
        )
        .filter(Boolean)
        .map(title => ({ title }))
    } else if (format === 'template') {
      const document = load(text, { schema: JSON_SCHEMA })
      if (!object(document))
        throw new Error('Expected a DoneTick YAML or JSON document.')
      assertFields(
        document,
        new Set(['format', 'version', 'title', 'labels', 'tasks']),
      )
      if (document.format !== 'donetick' || document.version !== 1)
        throw new Error('Expected format: donetick and version: 1.')
      if (!absent(document.labels)) {
        if (
          !Array.isArray(document.labels) ||
          document.labels.some(
            label => typeof label !== 'string' || !label.trim(),
          )
        )
          throw new Error('Global labels must be a list of nonempty names.')
        globalLabels = document.labels.map(label => label.trim())
      }
      rows = document.tasks
    } else {
      throw new Error('Unknown import format.')
    }
    if (!Array.isArray(rows) || !rows.length)
      throw new Error('Add at least one task.')
    if (rows.length > MAX_IMPORT_TASKS)
      throw new Error(`Import at most ${MAX_IMPORT_TASKS} tasks at a time.`)
    rows.forEach((row, index) => {
      try {
        const task = parseTask(row, index, referenceDate)
        task.labels = [...globalLabels, ...task.labels]
        tasks.push(task)
      } catch (error) {
        errors.push({ row: index + 1, message: error.message })
      }
    })
  } catch (error) {
    errors.push({ row: null, message: error.message })
  }
  // Label identity is case-insensitive throughout review and creation. Keep
  // the first spelling so templates cannot create both "Home" and "home".
  const labelNames = new Map()
  for (const task of tasks) {
    task.labels = [
      ...new Set(
        task.labels.map(name => {
          const key = name.toLowerCase()
          if (!labelNames.has(key)) labelNames.set(key, name)
          return labelNames.get(key)
        }),
      ),
    ]
  }
  return { tasks, errors, warnings: [] }
}

export function resolveImportLabels(tasks, labels) {
  const resolved = new Map()
  const missing = new Set()
  for (const name of new Set(tasks.flatMap(task => task.labels))) {
    const matches = labels.filter(
      label => label.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (matches.length > 1)
      throw new Error(
        `Multiple labels match "${name}". Rename the label in your template.`,
      )
    if (matches.length) resolved.set(name, matches[0].id)
    else missing.add(name)
  }
  return { resolved, missing: [...missing] }
}
