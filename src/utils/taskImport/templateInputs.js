// Template inputs are the shareable half of an import: a template declares the
// values it needs ("which vacuum?") and the importer supplies one set per
// instance. Substitution is deliberately limited to free text (title,
// description, labels) so recurrence and date grammars stay strictly parsed.
const NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const PLACEHOLDER = /\{\{([^{}]*)\}\}/g
const INPUT_FIELDS = new Set(['name', 'label', 'type', 'required', 'default'])
const INPUT_TYPES = new Set(['text'])
const absent = value => value === null || value === undefined

export function parseInputs(value) {
  if (absent(value)) return []
  if (!Array.isArray(value) || !value.length)
    throw new Error('Inputs must be a nonempty list of input definitions.')
  const names = new Set()
  return value.map(input => {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('Each input must be an object.')
    for (const field of Object.keys(input)) {
      if (!INPUT_FIELDS.has(field))
        throw new Error(`Unknown input field: ${field}.`)
    }
    if (typeof input.name !== 'string' || !NAME.test(input.name.trim()))
      throw new Error(
        'Input names must start with a letter and use only letters, numbers, or underscores.',
      )
    const name = input.name.trim()
    if (names.has(name)) throw new Error(`Duplicate input: ${name}.`)
    names.add(name)
    if (!absent(input.label) && typeof input.label !== 'string')
      throw new Error(`Input "${name}" label must be text.`)
    if (!absent(input.type) && !INPUT_TYPES.has(input.type))
      throw new Error(
        `Input "${name}" uses an unsupported type. Only "text" is supported.`,
      )
    if (!absent(input.required) && typeof input.required !== 'boolean')
      throw new Error(`Input "${name}" required must be true or false.`)
    if (!absent(input.default) && typeof input.default !== 'string')
      throw new Error(`Input "${name}" default must be text.`)
    return {
      name,
      label: input.label?.trim() || name,
      type: input.type ?? 'text',
      required: input.required ?? true,
      default: input.default ?? '',
    }
  })
}

// Returns the resolved text plus whether any placeholder was expanded, so a
// label that an optional input emptied can be dropped rather than rejected.
export function substitute(text, values, names) {
  let interpolated = false
  const resolved = text.replace(PLACEHOLDER, (_, inner) => {
    const name = inner.trim()
    if (!names.has(name)) throw new Error(`Unknown input: "${name}".`)
    interpolated = true
    return values[name] ?? ''
  })
  return { text: resolved, interpolated }
}

// Leaves unknown and non-text fields untouched; the task parser still owns all
// type and value validation of the substituted row.
export function substituteRow(row, values, names) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row
  const resolved = { ...row }
  for (const field of ['title', 'description']) {
    if (typeof resolved[field] === 'string')
      resolved[field] = substitute(resolved[field], values, names).text
  }
  if (Array.isArray(resolved.labels))
    resolved.labels = substituteLabels(resolved.labels, values, names)
  return resolved
}

export function substituteLabels(labels, values, names) {
  return labels
    .map(label => {
      if (typeof label !== 'string') return label
      const { interpolated, text } = substitute(label, values, names)
      return interpolated && !text.trim() ? null : text
    })
    .filter(label => label !== null)
}

export function missingInputValues(inputs, values) {
  return inputs
    .filter(input => input.required && !String(values[input.name] ?? '').trim())
    .map(input => input.label)
}
