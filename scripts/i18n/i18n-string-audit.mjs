#!/usr/bin/env node
/**
 * High-recall audit for hard-coded user-facing JSX strings. Unlike i18n-audit,
 * this checks rendered JSX text and common accessibility/label attributes.
 * Findings are candidates (not every string is translatable); review and use
 * --allow=path:line to document intentional exceptions.
 *
 * Usage: node scripts/i18n-string-audit.mjs [--json] [--allow=path:line]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { parseSync } from '@swc/core'

const root = process.cwd()
const srcRoot = join(root, 'src')
const allowed = new Set(
  process.argv.filter(a => a.startsWith('--allow=')).map(a => a.slice(8)),
)
const json = process.argv.includes('--json')
// Files that are intentionally out of scope for translation (marketing/dev-only/legal).
const defaultExcludes = [
  'src/views/Landing/',
  'src/views/Terms/',
  'src/views/PrivacyPolicy/',
  'src/views/Settings/DeveloperSettings.jsx',
  'src/views/TestView/Test.jsx',
]
const excludes = [
  ...defaultExcludes,
  ...process.argv.filter(a => a.startsWith('--exclude=')).map(a => a.slice(10)),
]
const relevantAttrs = new Set([
  'aria-label',
  'aria-description',
  'alt',
  'title',
  'placeholder',
  'label',
  'helperText',
  'error',
  'tooltip',
  'description',
  'emptyText',
  'loadingText',
  'noOptionsText',
  'clearText',
  'closeText',
])
const files = []
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(jsx|tsx)$/.test(name)) files.push(path)
  }
}
walk(srcRoot)
const findings = []
const humanText = value => {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  // Ignore empty/formatting content, numeric-only values, and obvious symbols.
  if (!text || !/[\p{L}]{2}/u.test(text)) return null
  return text
}

for (const file of files.sort()) {
  const relCheck = relative(root, file)
  if (excludes.some(e => relCheck.startsWith(e) || relCheck.includes(e)))
    continue
  const source = readFileSync(file, 'utf8')
  let ast
  try {
    ast = parseSync(source, {
      syntax: 'typescript',
      tsx: file.endsWith('.tsx'),
    })
  } catch {
    try {
      ast = parseSync(source, { syntax: 'ecmascript', jsx: true })
    } catch (error) {
      findings.push({
        file: relative(root, file),
        line: 1,
        kind: 'parse-error',
        text: error.message,
      })
      continue
    }
  }
  // `asChild` is true only while walking a JSXElement/JSXFragment's `children`
  // array — i.e. text actually rendered to the user. It's false while walking
  // JSXAttribute values, where string literals are prop/style values (variant
  // names, sx keys, aria roles, ...) rather than user-facing copy.
  const visit = (node, asChild = false) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'JSXText') {
      const text = humanText(node.value)
      if (text) add(node, 'jsx-text', text)
      return
    }
    if (node.type === 'JSXAttribute') {
      // SWC stores the attribute name as an Identifier whose text lives in
      // `.value` (not `.name` — that was the bug that made every jsx-attr
      // check silently match nothing).
      const name = node.name?.value
      const value = node.value
      if (relevantAttrs.has(name) && value?.type === 'StringLiteral') {
        const text = humanText(value.value)
        if (text) add(value, `jsx-attr:${name}`, text)
      }
      // Recurse into the attribute's own subtree with asChild reset to false.
      visit(value, false)
      return
    }
    if (asChild && node.type === 'JSXExpressionContainer') {
      const expr = node.expression
      // Literal string rendered directly as JSX child: {'text'}
      if (expr?.type === 'StringLiteral') {
        const text = humanText(expr.value)
        if (text) add(expr, 'jsx-expr', text)
      }
      // Ternary branches that are literal strings: {cond ? 'Yes' : 'No'}
      if (expr?.type === 'ConditionalExpression') {
        for (const branch of [expr.consequent, expr.alternate]) {
          if (branch?.type === 'StringLiteral') {
            const text = humanText(branch.value)
            if (text) add(branch, 'jsx-expr:ternary', text)
          }
        }
      }
      // Short-circuit rendering of a literal string: {cond && 'text'}
      if (
        expr?.type === 'LogicalExpression' &&
        expr.right?.type === 'StringLiteral'
      ) {
        const text = humanText(expr.right.value)
        if (text) add(expr.right, 'jsx-expr:logical', text)
      }
    }
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      visit(node.opening, false)
      visit(node.closing, false)
      for (const child of node.children ?? []) visit(child, true)
      return
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'span' || key === 'comments' || key === 'tokens') continue
      if (Array.isArray(value)) value.forEach(v => visit(v, false))
      else if (value && typeof value === 'object') visit(value, false)
    }
  }
  const add = (node, kind, text) => {
    const line = source
      .slice(0, Math.max(0, node.span?.start - 1))
      .split('\n').length
    const rel = relative(root, file)
    if (!allowed.has(`${rel}:${line}`))
      findings.push({ file: rel, line, kind, text })
  }
  visit(ast)
}

if (json) console.log(JSON.stringify(findings, null, 2))
else {
  for (const item of findings)
    console.log(`${item.file}:${item.line} [${item.kind}] ${item.text}`)
  console.log(
    `\n${findings.length} candidate(s). Review false positives; use --json for machine-readable output.`,
  )
}
if (process.argv.includes('--check') && findings.length) process.exitCode = 1
