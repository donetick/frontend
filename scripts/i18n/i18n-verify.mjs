#!/usr/bin/env node
/**
 * Sanity-checks translated locale files against their en source:
 *   - valid JSON
 *   - no leftover empty-string values
 *   - {{placeholder}} interpolation tokens match the en source exactly
 *   - <tag> HTML tokens match the en source exactly
 *   - plural key sets match what Intl.PluralRules(lang) actually needs
 *     (e.g. ar needs zero/one/two/few/many/other; ja needs only other)
 *
 * This is a *content-quality* check, separate from scripts/i18n-audit.mjs
 * (which checks that keys used in src/ resolve in en). Run this after
 * scripts/i18n-apply-translations.mjs to confirm a translation batch is
 * well-formed before moving on to the next one.
 *
 * Usage:
 *   node scripts/i18n-verify.mjs                # all locales
 *   node scripts/i18n-verify.mjs --lang=ar
 *   node scripts/i18n-verify.mjs --lang=ar --ns=chores
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

const allLocales = readdirSync(LOCALES_DIR).filter(
  d =>
    d !== SOURCE_LANG &&
    !d.startsWith('.') &&
    statSync(join(LOCALES_DIR, d)).isDirectory(),
)
const targetLocales = args.lang ? [args.lang] : allLocales

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  )

const pluralBase = key => key.replace(/_(zero|one|two|few|many|other)$/, '')
const pluralSuffix = key => key.match(/_(zero|one|two|few|many|other)$/)?.[1]

const placeholders = str =>
  [...(str ?? '').matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map(m => m[1]).sort()

const tags = str =>
  [...(str ?? '').matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)]
    .map(m => m[0])
    .sort()

const pluralCategoriesFor = lang => {
  try {
    return new Intl.PluralRules(lang).resolvedOptions().pluralCategories
  } catch {
    return ['one', 'other']
  }
}

const problems = []

for (const lang of targetLocales) {
  const langDir = join(LOCALES_DIR, lang)
  const files = readdirSync(langDir).filter(f => f.endsWith('.json'))
  const nsFiles = args.ns
    ? files.filter(f => basename(f, '.json') === args.ns)
    : files
  const pluralCats = pluralCategoriesFor(lang)

  for (const file of nsFiles) {
    const enPath = join(LOCALES_DIR, SOURCE_LANG, file)
    const targetPath = join(langDir, file)

    let targetObj
    try {
      targetObj = JSON.parse(readFileSync(targetPath, 'utf8'))
    } catch (e) {
      problems.push(`${targetPath}: invalid JSON (${e.message})`)
      continue
    }
    const enObj = JSON.parse(readFileSync(enPath, 'utf8'))
    const enFlat = flatten(enObj)
    const targetFlat = new Map(flatten(targetObj))

    const pluralBases = new Set(
      enFlat.filter(([k]) => pluralSuffix(k)).map(([k]) => pluralBase(k)),
    )
    const checkedBases = new Set()

    for (const [key, enValue] of enFlat) {
      if (typeof enValue !== 'string') continue
      const base = pluralBase(key)

      if (pluralBases.has(base)) {
        if (checkedBases.has(base)) continue
        checkedBases.add(base)
        for (const cat of pluralCats) {
          const v = targetFlat.get(`${base}_${cat}`)
          if (v === undefined) {
            problems.push(
              `${targetPath}: ${base}_${cat} missing (locale needs "${cat}" per Intl.PluralRules)`,
            )
          } else if (v === '') {
            problems.push(`${targetPath}: ${base}_${cat} is empty`)
          } else {
            const enPh = placeholders(
              enFlat.find(([k]) => k === `${base}_other`)?.[1],
            )
            const tPh = placeholders(v)
            if (JSON.stringify(enPh) !== JSON.stringify(tPh)) {
              problems.push(
                `${targetPath}: ${base}_${cat} placeholder mismatch: en=${enPh} target=${tPh}`,
              )
            }
          }
        }
        continue
      }

      const tValue = targetFlat.get(key)
      if (tValue === undefined) {
        problems.push(`${targetPath}: ${key} missing`)
        continue
      }
      if (tValue === '') {
        problems.push(`${targetPath}: ${key} is empty`)
        continue
      }
      if (typeof tValue !== 'string') continue

      const enPh = placeholders(enValue)
      const tPh = placeholders(tValue)
      if (JSON.stringify(enPh) !== JSON.stringify(tPh)) {
        problems.push(
          `${targetPath}: ${key} placeholder mismatch: en=${enPh} target=${tPh}`,
        )
      }

      const enTags = tags(enValue)
      const tTags = tags(tValue)
      if (JSON.stringify(enTags) !== JSON.stringify(tTags)) {
        problems.push(
          `${targetPath}: ${key} tag mismatch: en=${enTags} target=${tTags}`,
        )
      }
    }
  }
}

if (problems.length) {
  console.error(`i18n verify: ${problems.length} problem(s)\n`)
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log('i18n verify: all checked locales are consistent with en')
