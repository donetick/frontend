import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { transformSync } from '@swc/core'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const html = read('../index.html')
const source = read('../src/components/StartupScreen.jsx')
const { code } = transformSync(
  source
    .replace(
      "import logo from '../assets/logo.svg'",
      "const logo = '/src/assets/logo.svg'",
    )
    .replace('export default StartupScreen', ''),
  {
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
  },
)
const StartupScreen = new Function('React', `${code}; return StartupScreen`)(
  React,
)

test('pre-JavaScript screen matches the React loading fallback', () => {
  const root = html.match(/<div id="root">([\s\S]*?)\n {4}<\/div>/)[1]
  const normalize = markup =>
    markup
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, tag =>
        tag.replace(/\s+/g, ' ').replace(/\s*(\/?>)$/, '$1'),
      )
      .replace(/>\s+</g, '><')
      .trim()
  assert.equal(
    normalize(root),
    normalize(renderToStaticMarkup(React.createElement(StartupScreen))),
  )
})

test('startup does not depend on translations, providers, or app chunks', () => {
  const imports = source.match(/^import .+$/gm)
  assert.deepEqual(imports, ["import logo from '../assets/logo.svg'"])
  assert.match(source, /role='status'/)
  assert.match(source, /aria-hidden='true'/)
  assert.match(
    read('../src/main.jsx'),
    /<React\.Suspense fallback=\{<StartupScreen \/>\}>/,
  )
})

test('startup uses the original cyan accent in light and dark mode', () => {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  const [light, dark] = style.split('@media (prefers-color-scheme: dark)')
  assert.match(light, /--startup-accent: #0891b2;/)
  assert.match(light, /--startup-soft: #cffafe;/)
  assert.match(dark, /--startup-accent: #67e8f9;/)
  assert.match(dark, /--startup-soft: #164e63;/)
  assert.doesNotMatch(style, /#7c79d8|#b7b1f4|#dcd9fa|#49416d|#aaa5e7|#68629b/i)
})

test('startup styles are inline, theme-aware and respect reduced motion', () => {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(style, /\.startup-screen\s*\{/)
  assert.match(style, /prefers-color-scheme: dark/)
  assert.match(style, /prefers-reduced-motion: reduce/)
  assert.match(style, /animation: none/)
  assert.ok(html.indexOf('<style>') < html.indexOf('<body>'))
})
