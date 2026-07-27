// Deterministic transforms that turn spoken language into the typed syntax
// CustomParsers understands. No LLM — instant, predictable, fully offline.
//
// "label groceries"     → "#groceries"   (only when it matches an existing label)
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

// "assign to Sarah" / "assigned to Sarah" / "assign Sarah" / "for Sarah".
// Speech engines spell names their own way — and worse, can auto-correct an
// unfamiliar name to an unrelated dictionary word entirely ("Moutaz" heard as
// "Models"), which plain edit-distance can't recover (too many edits apart).
// But right after an assign verb, the next word has essentially no other
// legitimate reading — it IS a name — so we take the *relative best* match
// among circle members rather than requiring it to be objectively close.
// A same-first-letter guard keeps this from firing on totally unrelated
// words. Contextual-string biasing in VoiceInputService is the primary
// defense (it can make the recognizer hear "Moutaz" correctly in the first
// place); this is the fallback for when biasing isn't supported or still
// mishears.
const ASSIGN_VERB = '(?:assign(?:ed|ee)?(?:\\s+(?:this|it))?(?:\\s+to)?|for)'
const STRICT_ASSIGN_VERB = '(?:assign(?:ed|ee)?(?:\\s+(?:this|it))?(?:\\s+to)?)'
const MIN_MATCH_SCORE = 0.2

const levenshtein = (a, b) => {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diag = tmp
    }
  }
  return prev[b.length]
}

const similarity = (a, b) =>
  1 - levenshtein(a, b) / Math.max(a.length, b.length)

const memberNameVariants = member =>
  [
    member.displayName,
    member.displayName?.split(/\s+/)[0],
    member.username,
  ].filter(n => n && n.length > 1)

// Best-scoring item for `candidate` among `items`, requiring only that it
// beats all others and shares a first letter — not an absolute closeness
// threshold. `getVariants` returns the name strings to compare a given item
// against (e.g. a member's display name/first name/username, or a label's
// name). Shared by assignee and label matching since both face the same
// problem: ASR is least confident on exactly the words that matter here.
const findBestFuzzyMatch = (candidate, items, getVariants) => {
  const c = candidate.toLowerCase()
  if (c.length < 3) return null
  let best = null
  let bestScore = MIN_MATCH_SCORE
  for (const item of items) {
    for (const name of getVariants(item)) {
      const n = name.toLowerCase()
      if (n === c) return item
      if (n.length < 3 || n[0] !== c[0]) continue
      const score = similarity(n, c)
      if (score > bestScore) {
        bestScore = score
        best = item
      }
    }
  }
  return best
}

const findMemberFuzzy = (candidate, members) =>
  findBestFuzzyMatch(candidate, members, memberNameVariants)

// "label groceries" / "tag groceries" / "labeled as groceries" — only ever
// converts to a label that already exists (matched exactly or as the closest
// existing one), never invents a new one. Restricted to single-word label
// names: CustomParsers' hashtag pattern (#([\p{L}\p{N}_]+)) can't span a
// space, so a multi-word label like "Home Maintenance" could never be
// represented as "#Home Maintenance" anyway — same limitation typing it by
// hand would hit.
const LABEL_VERB =
  '(?:with\\s+)?(?:hash\\s?tag|labell?ed(?:\\s+as)?|label|tagged(?:\\s+as)?|tag)'

const normalizeLabels = (text, userLabels = []) => {
  const singleWordLabels = userLabels.filter(l => l.name && !/\s/.test(l.name))
  let out = text

  // Exact pass first so a clean spoken match always wins over the fuzzy pass
  const byLengthDesc = [...singleWordLabels].sort(
    (a, b) => b.name.length - a.name.length,
  )
  for (const label of byLengthDesc) {
    out = out.replace(
      new RegExp(
        `\\b${LABEL_VERB}\\s+${escapeRegex(label.name)}\\b[,.]?`,
        'gi',
      ),
      `#${label.name}`,
    )
  }

  // Fuzzy pass — the spoken word after the verb, matched against the closest
  // existing single-word label
  out = out.replace(
    new RegExp(`\\b${LABEL_VERB}\\s+([\\p{L}][\\p{L}'-]*)[,.]?`, 'giu'),
    (match, candidate) => {
      const label = findBestFuzzyMatch(candidate, singleWordLabels, l => [
        l.name,
      ])
      return label ? `#${label.name}` : match
    },
  )
  return out
}

const normalizeAssignees = (text, members = []) => {
  let out = text.replace(
    new RegExp(
      `\\b${ASSIGN_VERB}\\s+(?:anyone|anybody|everyone)\\b[,.]?`,
      'gi',
    ),
    '@Anyone',
  )

  // Exact pass — full display name first so "assign to Mo Tarbin" doesn't
  // leave a dangling "Tarbin"
  for (const member of members) {
    if (!member.displayName) continue
    const names = [...new Set(memberNameVariants(member))].sort(
      (a, b) => b.length - a.length,
    )
    for (const name of names) {
      out = out.replace(
        new RegExp(`\\b${ASSIGN_VERB}\\s+${escapeRegex(name)}\\b[,.]?`, 'gi'),
        `@${member.displayName}`,
      )
    }
  }

  // Fuzzy pass — requires an assign verb (not bare "for") so only clearly
  // intended names get corrected
  out = out.replace(
    new RegExp(`\\b${STRICT_ASSIGN_VERB}\\s+([\\p{L}][\\p{L}'-]*)[,.]?`, 'giu'),
    (match, candidate) => {
      const member = findMemberFuzzy(candidate, members)
      return member ? `@${member.displayName}` : match
    },
  )
  return out
}

export const normalizeSpokenText = (
  text,
  { members = [], userLabels = [] } = {},
) => {
  let out = stripFillers(text)
  out = normalizePriority(out)
  out = normalizePoints(out)
  out = normalizeLabels(out, userLabels)
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
