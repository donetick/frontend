#!/usr/bin/env node
/**
 * Writes translated strings produced for scripts/i18n-find-missing.mjs
 * gaps back into public/locales/<lang>/<ns>.json.
 *
 * Input is a JSON file (or stdin) shaped like:
 *   {
 *     "ar": {
 *       "chores": {
 *         "archived.selectSectionTitle": "تحديد كل المهام في هذا القسم",
 *         "results": { "one": "{{count}} نتيجة", "other": "{{count}} نتائج" }
 *       }
 *     }
 *   }
 * A plain string sets a leaf key directly; an object at a plural-base key
 * (matching a `plural: true` gap) expands to `<key>_<suffix>` entries.
 *
 * Every write is merged into the *existing* file rebuilt in en's key order
 * (new keys get inserted at their en position instead of appended), so
 * locale files stay structurally parallel to en for easy diffing.
 *
 * Usage:
 *   node scripts/i18n-apply-translations.mjs translations.json
 *   cat translations.json | node scripts/i18n-apply-translations.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = 'public/locales'
const SOURCE_LANG = 'en'

const inputPath = process.argv[2]
const raw = inputPath
  ? readFileSync(inputPath, 'utf8')
  : readFileSync(0, 'utf8')
const patch = JSON.parse(raw)

const getPath = (obj, key) =>
  key
    .split('.')
    .reduce((cur, part) => (cur == null ? undefined : cur[part]), obj)

const setPath = (obj, key, value) => {
  const parts = key.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
      cur[parts[i]] = {}
    }
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
}

const pluralSuffixRe = /^(.+)_(zero|one|two|few|many|other)$/
const pluralBaseOf = key => key.match(pluralSuffixRe)?.[1]
const suffixOrder = ['zero', 'one', 'two', 'few', 'many', 'other']

// Rebuild `target` using `en`'s key/order as the skeleton so new keys land
// in the right spot instead of at the end of the file. Target-only plural
// suffixes a locale needs but en doesn't (e.g. Polish/Arabic _few/_many
// when en only has _one/_other) are inserted next to their siblings, in
// canonical CLDR suffix order, so re-running this script never reorders
// keys that haven't changed.
const rebuildInOrder = (en, target) => {
  if (Array.isArray(en)) return target ?? en
  if (en !== null && typeof en === 'object') {
    const entries = Object.keys(en).map(k => [
      k,
      rebuildInOrder(
        en[k],
        target && typeof target === 'object' ? target[k] : undefined,
      ),
    ])

    if (target && typeof target === 'object') {
      const known = new Set(entries.map(([k]) => k))
      const leftover = Object.keys(target).filter(k => !known.has(k))
      // Group leftover plural siblings by base so they land together, in
      // CLDR order, instead of being scattered one insertion at a time.
      const byBase = new Map()
      const nonPlural = []
      for (const k of leftover) {
        const base = pluralBaseOf(k)
        const hasSibling =
          base && entries.some(([ek]) => ek === `${base}_other`)
        if (hasSibling) {
          if (!byBase.has(base)) byBase.set(base, [])
          byBase.get(base).push(k)
        } else {
          nonPlural.push(k)
        }
      }

      const withInserts = []
      for (const [k, v] of entries) {
        withInserts.push([k, v])
        const base = pluralBaseOf(k)
        if (base && k === `${base}_other` && byBase.has(base)) {
          const siblings = byBase
            .get(base)
            .sort(
              (a, b) =>
                suffixOrder.indexOf(a.split('_').pop()) -
                suffixOrder.indexOf(b.split('_').pop()),
            )
          for (const sk of siblings) withInserts.push([sk, target[sk]])
          byBase.delete(base)
        }
      }
      for (const k of nonPlural) withInserts.push([k, target[k]])

      return Object.fromEntries(withInserts)
    }
    return Object.fromEntries(entries)
  }
  return target !== undefined ? target : en
}

let filesWritten = 0

for (const [lang, nsMap] of Object.entries(patch)) {
  for (const [ns, entries] of Object.entries(nsMap)) {
    const enPath = join(LOCALES_DIR, SOURCE_LANG, `${ns}.json`)
    const targetPath = join(LOCALES_DIR, lang, `${ns}.json`)
    const en = JSON.parse(readFileSync(enPath, 'utf8'))
    const target = JSON.parse(readFileSync(targetPath, 'utf8'))

    for (const [key, value] of Object.entries(entries)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        // Plural expansion: { one: "...", other: "..." } -> key_one, key_other
        for (const [suffix, str] of Object.entries(value)) {
          setPath(target, `${key}_${suffix}`, str)
        }
      } else {
        if (getPath(en, key) === undefined) {
          console.warn(
            `Warning: ${lang}/${ns} key "${key}" has no matching en source key — skipping`,
          )
          continue
        }
        setPath(target, key, value)
      }
    }

    const ordered = rebuildInOrder(en, target)
    writeFileSync(targetPath, JSON.stringify(ordered, null, 2) + '\n')
    filesWritten++
    console.log(`Wrote ${targetPath}`)
  }
}

console.log(`\n${filesWritten} file(s) updated.`)
