#!/usr/bin/env node
/**
 * Fails if any t() / <Trans> key in src/ has no entry in public/locales/en/.
 *
 * Why this is a script and not an ESLint rule: the namespace for a bare
 * t('foo') comes from the useTranslation('chores') call at the top of the
 * component, so resolving a key needs whole-file context that a per-node lint
 * rule does not have. Editor i18n plugins get this wrong constantly — they
 * assume the default namespace and flag half the codebase.
 *
 * Usage:  node scripts/i18n-audit.mjs [--orphans]
 *   --orphans  also list en/*.json keys that nothing in src/ references
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const LOCALE_DIR = 'public/locales/en'
const SRC_DIR = 'src'
const DEFAULT_NS = 'common'

const bundles = Object.fromEntries(
  readdirSync(LOCALE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => [
      basename(f, '.json'),
      JSON.parse(readFileSync(join(LOCALE_DIR, f), 'utf8')),
    ]),
)

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    return statSync(full).isDirectory()
      ? walk(full)
      : /\.jsx?$/.test(full)
        ? [full]
        : []
  })

const lookup = (ns, key) =>
  key.split('.').reduce((cur, part) => {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return null
    return cur[part]
  }, bundles[ns] ?? null)

/**
 * i18next appends _one/_other to plural keys, so `card.points` is present in
 * the bundle as `card.points_one` + `card.points_other`. Treat a leaf whose
 * siblings carry a plural suffix as resolved.
 */
const exists = (ns, key) => {
  if (lookup(ns, key) !== null) return true
  const dot = key.lastIndexOf('.')
  const parent = dot === -1 ? (bundles[ns] ?? null) : lookup(ns, key.slice(0, dot))
  const leaf = key.slice(dot + 1)
  return (
    parent !== null &&
    typeof parent === 'object' &&
    Object.keys(parent).some(k => k.startsWith(`${leaf}_`))
  )
}

const collectKeys = src => {
  const found = new Set()
  const push = re => {
    for (const m of src.matchAll(re)) found.add(m[1])
  }
  // t('key') / t("key") / t(`key`)
  push(/\bt\(\s*'([A-Za-z][\w.:-]*)'/g)
  push(/\bt\(\s*"([A-Za-z][\w.:-]*)"/g)
  push(/\bt\(\s*`([A-Za-z][\w.:-]*)`/g)
  // t(`prefix.${expr}`) — the interpolated leaf is unknowable, but the
  // prefix must at least resolve to an object
  push(/\bt\(\s*`([A-Za-z][\w.:-]*)\.\$\{/g)
  return found
}

const failures = []

for (const file of walk(SRC_DIR).sort()) {
  const src = readFileSync(file, 'utf8')
  const nsMatch = src.match(/useTranslation\(\s*(?:'([^']+)'|\[\s*'([^']+)')/)
  const hasTrans = src.includes('i18nKey')
  if (!nsMatch && !hasTrans) continue

  const fallbackNs = nsMatch ? (nsMatch[1] ?? nsMatch[2]) : DEFAULT_NS

  const check = (raw, kind, nsOverride) => {
    const [ns, key] = raw.includes(':')
      ? raw.split(/:(.+)/)
      : [nsOverride ?? fallbackNs, raw]
    if (!exists(ns, key)) failures.push(`${file}  ${kind}  ${ns}:${key}`)
  }

  for (const raw of collectKeys(src)) check(raw, 't()')

  // <Trans i18nKey='x' ns='y'> and thin wrappers that forward i18nKey
  const transNs = src.match(/\bns='([^']+)'/)?.[1]
  for (const m of src.matchAll(/i18nKey=(?:'([^']+)'|\{'([^']+)'\})/g)) {
    check(m[1] ?? m[2], 'Trans', transNs)
  }
}

if (process.argv.includes('--orphans')) {
  const allSrc = walk(SRC_DIR)
    .map(f => readFileSync(f, 'utf8'))
    .join('\n')
  const flatten = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
      v !== null && typeof v === 'object'
        ? flatten(v, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    )
  const orphans = []
  for (const [ns, bundle] of Object.entries(bundles)) {
    for (const key of flatten(bundle)) {
      const leaf = key.replace(/_(one|other|zero|two|few|many)$/, '')
      if (!allSrc.includes(leaf) && !allSrc.includes(leaf.split('.').pop())) {
        orphans.push(`${ns}:${leaf}`)
      }
    }
  }
  if (orphans.length) {
    console.log(`\nPossibly unused (${new Set(orphans).size}):`)
    console.log([...new Set(orphans)].sort().join('\n'))
  }
}

const unique = [...new Set(failures)].sort()
if (unique.length) {
  console.error(`i18n audit: ${unique.length} unresolved key(s)\n`)
  console.error(unique.join('\n'))
  process.exit(1)
}
console.log('i18n audit: all keys resolve')
