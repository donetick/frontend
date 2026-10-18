#!/usr/bin/env node
/**
 * Checks a pull request for destructive locale changes.
 *
 * Usage:
 *   node scripts/i18n/i18n-pr-safety.mjs --base=<sha> --head=<sha>
 *   node scripts/i18n/i18n-pr-safety.mjs --base=<sha> --head=<sha> --crowdin
 *
 * --crowdin additionally requires the PR branch to contain the current base
 * commit and rejects changes outside translated locale files. This prevents a
 * stale Crowdin service branch from reverting application code.
 */

import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const options = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.replace(/^--/, '').split(/=(.*)/s)
    return [key, value ?? true]
  }),
)

const base = options.base
const head = options.head
const isCrowdin = Boolean(options.crowdin)

if (!base || !head) {
  console.error(
    'Usage: i18n-pr-safety.mjs --base=<sha> --head=<sha> [--crowdin]',
  )
  process.exit(2)
}

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

const exists = (rev, path) => {
  try {
    execFileSync('git', ['cat-file', '-e', `${rev}:${path}`], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const readJson = (rev, path, failures) => {
  if (!exists(rev, path)) return null
  try {
    return JSON.parse(git('show', `${rev}:${path}`))
  } catch (error) {
    failures.push(
      `${path}: invalid JSON at ${rev.slice(0, 8)} (${error.message})`,
    )
    return null
  }
}

const flatten = (value, prefix = '') => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [[prefix, value]]
}

const placeholders = value =>
  [...String(value ?? '').matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)]
    .map(match => match[1])
    .sort()

const tags = value =>
  [...String(value ?? '').matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)]
    .map(match => match[0])
    .sort()

const sameList = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const pluralSuffix = key => key.match(/_(zero|one|two|few|many|other)$/)?.[1]
const pluralBase = key => key.replace(/_(zero|one|two|few|many|other)$/, '')
const pluralCategoriesFor = language => {
  try {
    return new Intl.PluralRules(language).resolvedOptions().pluralCategories
  } catch {
    return ['one', 'other']
  }
}

const failures = []
const warnings = []

if (isCrowdin) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', base, head], {
      stdio: 'ignore',
    })
  } catch {
    failures.push(
      'Crowdin branch is stale: it does not contain the current PR base. Delete/reset the l10n branch and export again from the latest target branch.',
    )
  }
}

const changedFiles = git('diff', '--name-only', base, head)
  .split('\n')
  .filter(Boolean)

if (isCrowdin) {
  const unexpected = changedFiles.filter(
    path =>
      !/^public\/locales\/[^/]+\/[^/]+\.json$/.test(path) ||
      path.startsWith('public/locales/en/'),
  )
  if (unexpected.length) {
    failures.push(
      `Crowdin PR changes ${unexpected.length} non-translation file(s):\n  ${unexpected.join('\n  ')}`,
    )
  }
}

const localeFiles = changedFiles.filter(
  path =>
    /^public\/locales\/[^/]+\/[^/]+\.json$/.test(path) &&
    !path.startsWith('public/locales/en/'),
)

for (const path of localeFiles) {
  const oldObject = readJson(base, path, failures)
  const newObject = readJson(head, path, failures)
  if (oldObject === null && newObject === null) continue

  const oldValues = new Map(flatten(oldObject ?? {}))
  const newValues = new Map(flatten(newObject ?? {}))
  const sourcePath = `public/locales/en/${basename(path)}`
  const baseSourceValues = new Map(
    flatten(readJson(base, sourcePath, failures) ?? {}),
  )
  const headSourceValues = new Map(
    flatten(readJson(head, sourcePath, failures) ?? {}),
  )
  const sourceValues = headSourceValues.size
    ? headSourceValues
    : baseSourceValues
  const language = path.split('/')[2]
  const requiredPluralCategories = pluralCategoriesFor(language)
  const baseSourcePluralBases = new Set(
    [...baseSourceValues.keys()]
      .filter(key => pluralSuffix(key))
      .map(key => pluralBase(key)),
  )
  const headSourcePluralBases = new Set(
    [...headSourceValues.keys()]
      .filter(key => pluralSuffix(key))
      .map(key => pluralBase(key)),
  )

  for (const [key, oldValue] of oldValues) {
    if (!newValues.has(key)) {
      // A target key can be removed when its source key was also removed.
      // Checking both sides avoids false reports from stale Crowdin branches.
      const sourceKeyStillExists =
        baseSourceValues.has(key) && headSourceValues.has(key)
      const suffix = pluralSuffix(key)
      const requiredRuntimePlural =
        suffix &&
        requiredPluralCategories.includes(suffix) &&
        baseSourcePluralBases.has(pluralBase(key)) &&
        headSourcePluralBases.has(pluralBase(key))

      if (sourceKeyStillExists || requiredRuntimePlural) {
        const reason = requiredRuntimePlural
          ? `required "${suffix}" plural form for ${language}`
          : 'key still present in English'
        failures.push(`${path}: removed ${reason}: ${key}`)
      }
      continue
    }

    const newValue = newValues.get(key)
    if (typeof oldValue === 'string' && oldValue && newValue === '') {
      failures.push(`${path}: non-empty translation became empty: ${key}`)
    }
  }

  for (const [key, newValue] of newValues) {
    const oldValue = oldValues.get(key)
    if (newValue === oldValue) continue

    if (newValue === '') {
      if (!oldValues.has(key))
        warnings.push(`${path}: new untranslated key: ${key}`)
      continue
    }
    if (typeof newValue !== 'string') continue

    const sourceValue = sourceValues.get(key)
    if (typeof sourceValue !== 'string') continue

    if (!sameList(placeholders(sourceValue), placeholders(newValue))) {
      failures.push(`${path}: placeholder mismatch for ${key}`)
    }
    if (!sameList(tags(sourceValue), tags(newValue))) {
      failures.push(`${path}: HTML tag mismatch for ${key}`)
    }
    if (newValue === sourceValue) {
      warnings.push(`${path}: target text equals English for ${key}`)
    }
  }
}

if (warnings.length) {
  console.warn(`i18n PR safety: ${warnings.length} warning(s)`)
  console.warn(warnings.slice(0, 100).join('\n'))
  if (warnings.length > 100)
    console.warn(`...and ${warnings.length - 100} more`)
  console.warn('')
}

if (failures.length) {
  console.error(`i18n PR safety: ${failures.length} failure(s)\n`)
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(
  `i18n PR safety: passed (${localeFiles.length} locale file(s) checked)`,
)
