// Deterministic transforms that turn spoken language into the typed syntax
// CustomParsers understands. No LLM — instant, predictable, fully offline.
//
// "label groceries"     → "#groceries"
// "assign to Sarah"     → "@Sarah"        (only when Sarah is a circle member)
// "worth five points"   → "*5"
// "p one" / "top priority" → "priority 1" (parsePriority already handles that)

const FILLER_REGEX = /(?:^|\s)(?:um+|uh+|erm+|hmm+|mmm+)(?=[\s,.!?]|$)[,.]?/gi

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  'twenty five': 25,
  'twenty-five': 25,
  fifty: 50,
  hundred: 100,
  'one hundred': 100,
}

const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS)
  // Longest first so "twenty five" wins over "five"
  .sort((a, b) => b.length - a.length)
  .join('|')

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const stripFillers = text =>
  text.replace(FILLER_REGEX, ' ').replace(/\s+/g, ' ').trim()

const normalizePriority = text =>
  text
    .replace(/\b(?:top|highest)\s+priority\b/gi, 'priority 1')
    .replace(
      /\bp[\s-]?(one|two|three|four|[1-4])\b/gi,
      (_, n) => `priority ${NUMBER_WORDS[n.toLowerCase()] || n}`,
    )

const normalizePoints = text =>
  text.replace(
    new RegExp(
      `\\b(?:worth\\s+)?(\\d+|${NUMBER_WORD_PATTERN})\\s+points?\\b`,
      'gi',
    ),
    (_, n) => `*${NUMBER_WORDS[n.toLowerCase()] || n} points`,
  )

const normalizeLabels = text =>
  text.replace(
    /\b(?:with\s+)?(?:hash\s?tag|labell?ed(?:\s+as)?|label|tagged(?:\s+as)?|tag)\s+([\p{L}\p{N}_]+)/giu,
    '#$1',
  )

const normalizeAssignees = (text, members = []) => {
  const assignVerb = '(?:assign(?:ed)?\\s+(?:this\\s+|it\\s+)?to|for)'
  let out = text.replace(
    new RegExp(`\\b${assignVerb}\\s+(?:anyone|anybody|everyone)\\b`, 'gi'),
    '@Anyone',
  )

  for (const member of members) {
    const displayName = member.displayName
    if (!displayName) continue
    const firstName = displayName.split(/\s+/)[0]
    // Full display name first so "assign to Mo Tarbin" doesn't leave "Tarbin"
    const names = [...new Set([displayName, firstName])].filter(
      n => n.length > 1,
    )
    for (const name of names) {
      out = out.replace(
        new RegExp(`\\b${assignVerb}\\s+${escapeRegex(name)}\\b`, 'gi'),
        `@${displayName}`,
      )
    }
  }
  return out
}

export const normalizeSpokenText = (text, { members = [] } = {}) => {
  let out = stripFillers(text)
  out = normalizePriority(out)
  out = normalizePoints(out)
  out = normalizeLabels(out)
  out = normalizeAssignees(out, members)
  return out.replace(/\s+/g, ' ').trim()
}

// ── Multi-task segmentation ─────────────────────────────────────────────────
// A pause (utterance boundary) always splits — that's handled upstream by the
// recognizer. These spoken separators additionally split within one utterance.
// Deliberately conservative: "and then" is NOT a separator ("wash and then
// fold laundry" is one task).

const SEPARATOR_REGEX =
  /\s*\b(?:and\s+also|also|next\s+task|new\s+task|another\s+task)\b[,.]?\s*/gi

export const splitSpokenSegments = text =>
  text
    .split(SEPARATOR_REGEX)
    .map(s => s.trim().replace(/^[,.]\s*/, ''))
    .filter(Boolean)

// ── "Scratch that" correction ───────────────────────────────────────────────
// Everything spoken before the command dies. If the command opens the
// utterance ("…pause… scratch that"), the previously committed task dies
// instead. Words after the command carry on as the replacement.

const SCRATCH_REGEX =
  /\s*\b(?:(?:scratch|forget|delete|remove|cancel)\s+(?:that|this|it|last(?:\s+one)?)|never\s?mind)\b[,.]?\s*/gi

export const applyScratchThat = text => {
  const parts = text.split(SCRATCH_REGEX)
  if (parts.length === 1) {
    return { text: text.trim(), dropPrevious: false }
  }
  const before = parts.slice(0, -1).join(' ').trim()
  const after = parts[parts.length - 1].trim()
  return { text: after, dropPrevious: before.length === 0 }
}
