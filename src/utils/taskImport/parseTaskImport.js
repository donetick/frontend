import { parseRepeatExpression } from './parseRepeatExpression.js'
import {
  missingInputValues,
  parseInputs,
  substituteLabels,
  substituteRow,
} from './templateInputs.js'

export const MAX_IMPORT_TASKS = 200
export const MAX_IMPORT_BYTES = 256 * 1024
const DOCUMENT_FIELDS = new Set([
  'format',
  'version',
  'title',
  'labels',
  'inputs',
  'tasks',
])
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

function parseTask(task, key, referenceDate) {
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
    key,
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

// Structure only: reads the envelope and the declared inputs so the importer
// can collect values before any task is validated. No substitution happens
// here, so the document stays reusable across instances.
export function parseTaskImportDocument(text, { format = 'template' } = {}) {
  const document = {
    title: '',
    inputs: [],
    globalLabels: [],
    rows: [],
    interpolate: false,
    errors: [],
  }
  try {
    if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
      throw new Error('Import is too large (maximum 256 KB).')
    if (format === 'lines') {
      document.rows = text
        .split(/\r?\n/)
        .map(title =>
          title.trim().replace(/^(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, ''),
        )
        .filter(Boolean)
        .map(title => ({ title }))
    } else if (format === 'template') {
      const parsed = JSON.parse(text)
      if (!object(parsed))
        throw new Error('Expected a DoneTick JSON document.')
      assertFields(parsed, DOCUMENT_FIELDS)
      if (parsed.format !== 'donetick' || ![1, 2].includes(parsed.version))
        throw new Error('Expected format: donetick and version: 1 or 2.')
      if (parsed.version === 1 && !absent(parsed.inputs))
        throw new Error('Inputs require version: 2.')
      if (!absent(parsed.title) && typeof parsed.title !== 'string')
        throw new Error('Template title must be text.')
      document.title = parsed.title?.trim() || ''
      document.interpolate = parsed.version === 2
      document.inputs = parseInputs(parsed.inputs)
      if (!absent(parsed.labels)) {
        if (
          !Array.isArray(parsed.labels) ||
          parsed.labels.some(
            label => typeof label !== 'string' || !label.trim(),
          )
        )
          throw new Error('Global labels must be a list of nonempty names.')
        document.globalLabels = parsed.labels.map(label => label.trim())
      }
      document.rows = parsed.tasks
    } else {
      throw new Error('Unknown import format.')
    }
    if (!Array.isArray(document.rows) || !document.rows.length)
      throw new Error('Add at least one task.')
    if (document.rows.length > MAX_IMPORT_TASKS)
      throw new Error(`Import at most ${MAX_IMPORT_TASKS} tasks at a time.`)
  } catch (error) {
    document.rows = []
    document.errors.push({ row: null, instance: null, message: error.message })
  }
  return document
}

// Pure resolution: no network calls, IDs, account defaults, or task creation.
// One value set per instance; every row is expanded once per instance so the
// same template can cover several devices, rooms, or people in one import.
export function resolveTaskImport(
  document,
  { instances = [{}], referenceDate = new Date() } = {},
) {
  const errors = [...document.errors]
  const tasks = []
  const sets = instances.length ? instances : [{}]
  const names = new Set(document.inputs.map(input => input.name))
  if (document.rows.length * sets.length > MAX_IMPORT_TASKS) {
    errors.push({
      row: null,
      instance: null,
      message: `Import at most ${MAX_IMPORT_TASKS} tasks at a time.`,
    })
    return { tasks, errors, warnings: [] }
  }
  sets.forEach((values, instance) => {
    const missing = missingInputValues(document.inputs, values)
    if (missing.length) {
      errors.push({
        row: null,
        instance,
        message: `Provide a value for: ${missing.join(', ')}.`,
      })
      return
    }
    let globalLabels
    try {
      globalLabels = document.interpolate
        ? substituteLabels(document.globalLabels, values, names)
        : document.globalLabels
    } catch (error) {
      errors.push({ row: null, instance, message: error.message })
      return
    }
    document.rows.forEach((row, index) => {
      try {
        const resolved = document.interpolate
          ? substituteRow(row, values, names)
          : row
        const task = parseTask(resolved, `${instance}:${index}`, referenceDate)
        task.instance = instance
        task.labels = [...globalLabels, ...task.labels]
        tasks.push(task)
      } catch (error) {
        errors.push({ row: index + 1, instance, message: error.message })
      }
    })
  })
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
