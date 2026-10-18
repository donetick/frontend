#!/usr/bin/env node
/**
 * Finds translation gaps: keys that exist in public/locales/en/*.json but
 * are absent or empty ("") in another locale's matching file.
 *
 * Regional variants (ar-SA, es-ES, fr-FR, zh-CN, ...) intentionally carry
 * only a subset of namespace files — we only diff files that already exist
 * for the target locale, we never invent new namespace files for them.
 *
 * Usage:
 *   node scripts/i18n-find-missing.mjs                 # summary, all locales
 *   node scripts/i18n-find-missing.mjs --lang=ar        # summary, one locale
 *   node scripts/i18n-find-missing.mjs --lang=ar --ns=chores --json
 *   node scripts/i18n-find-missing.mjs --lang=ar --ns=chores --json --limit=40
 *
 * --json emits translation-ready batches: source (en) text, existing
 * neighbor translations (for tone/context), and the plural categories the
 * target locale actually needs (via Intl.PluralRules), so a plural key base
 * like "results" reports exactly which suffixes (_one/_other/_few/...) are
 * required instead of blindly copying English's two-form _one/_other.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const LOCALES_DIR = 'public/locales'
const SOURCE_LANG = 'en'

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

const asJson = Boolean(args.json)
const limit = args.limit ? Number(args.limit) : Infinity

const allLocales = readdirSync(LOCALES_DIR).filter(
  d =>
    d !== SOURCE_LANG &&
    !d.startsWith('.') &&
    statSync(join(LOCALES_DIR, d)).isDirectory(),
)
const targetLocales = args.lang ? [args.lang] : allLocales
for (const lang of targetLocales) {
  if (!allLocales.includes(lang)) {
    console.error(`Unknown locale directory: ${lang}`)
    process.exit(1)
  }
}

const loadJson = path => JSON.parse(readFileSync(path, 'utf8'))

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  )

const pluralBase = key => key.replace(/_(zero|one|two|few|many|other)$/, '')
const pluralSuffix = key => key.match(/_(zero|one|two|few|many|other)$/)?.[1]

const pluralCategoriesFor = lang => {
  try {
    return new Intl.PluralRules(lang).resolvedOptions().pluralCategories
  } catch {
    return ['one', 'other']
  }
}

const results = {}

for (const lang of targetLocales) {
  const langDir = join(LOCALES_DIR, lang)
  const files = readdirSync(langDir).filter(f => f.endsWith('.json'))
  const nsFilter = args.ns
  const nsFiles = nsFilter
    ? files.filter(f => basename(f, '.json') === nsFilter)
    : files

  const langGaps = {}
  const pluralCats = pluralCategoriesFor(lang)

  for (const file of nsFiles) {
    const ns = basename(file, '.json')
    const enPath = join(LOCALES_DIR, SOURCE_LANG, file)
    const targetPath = join(langDir, file)
    const enFlat = flatten(loadJson(enPath))
    const targetObj = loadJson(targetPath)
    const targetFlat = new Map(flatten(targetObj))

    // Group flattened en keys by plural base so we only ask for the
    // suffixes the target locale actually needs.
    const pluralBases = new Set(
      enFlat.filter(([k]) => pluralSuffix(k)).map(([k]) => pluralBase(k)),
    )

    const gaps = []
    const seenBases = new Set()

    for (const [key, enValue] of enFlat) {
      if (typeof enValue !== 'string') continue
      const base = pluralBase(key)
      const isPlural = pluralBases.has(base)

      if (isPlural) {
        if (seenBases.has(base)) continue
        seenBases.add(base)
        const missingCats = pluralCats.filter(cat => {
          const v = targetFlat.get(`${base}_${cat}`)
          return v === undefined || v === ''
        })
        if (missingCats.length === 0) continue
        gaps.push({
          key: base,
          plural: true,
          neededSuffixes: missingCats,
          source: Object.fromEntries(
            pluralCats.map(cat => [
              cat,
              enFlat.find(([k]) => k === `${base}_${cat}`)?.[1] ??
                enFlat.find(([k]) => k === `${base}_other`)?.[1],
            ]),
          ),
        })
        continue
      }

      const targetValue = targetFlat.get(key)
      if (targetValue !== undefined && targetValue !== '') continue
      gaps.push({ key, plural: false, source: enValue })
    }

    if (gaps.length) langGaps[ns] = gaps.slice(0, limit)
  }

  if (Object.keys(langGaps).length) results[lang] = langGaps
}

if (asJson) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

let totalGaps = 0
for (const [lang, nsMap] of Object.entries(results)) {
  const langTotal = Object.values(nsMap).reduce((n, g) => n + g.length, 0)
  totalGaps += langTotal
  console.log(`${lang}: ${langTotal} gap(s)`)
  for (const [ns, gaps] of Object.entries(nsMap)) {
    console.log(`  ${ns}: ${gaps.length}`)
  }
}
if (totalGaps === 0) {
  console.log('No translation gaps found.')
} else {
  console.log(
    `\nTotal: ${totalGaps} gap(s) across ${Object.keys(results).length} locale(s).`,
  )
  console.log(
    'Re-run with --json (and --lang=/--ns=) to get translation-ready batches.',
  )
}
