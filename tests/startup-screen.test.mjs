import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mock, test } from 'node:test'

import { transformSync } from '@swc/core'
import PropTypes from 'prop-types'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const html = read('../index.html')
const source = read('../src/components/StartupScreen.jsx')
const { code } = transformSync(
  source
    .replace(/^import .+$/gm, '')
    .replace('export default StartupScreen', ''),
  {
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
  },
)
const StartupScreen = new Function(
  'React',
  'PropTypes',
  'useLayoutEffect',
  'holdStartupOverlay',
  'logo',
  `${code}; return StartupScreen`,
)(
  React,
  PropTypes,
  () => {},
  () => () => {},
  '/src/assets/logo.svg',
)

const startupStyle = () => html.match(/<style>([\s\S]*?)<\/style>/)[1]

test('pre-JavaScript screen matches the React loading fallback', () => {
  const overlay = html.match(/(<div\s+id="startup"[\s\S]*?\n {4}<\/div>)/)[1]
  const normalize = markup =>
    markup
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+id="startup"/, '')
      .replace(/<[^>]+>/g, tag =>
        tag.replace(/\s+/g, ' ').replace(/\s*(\/?>)$/, '$1'),
      )
      .replace(/>\s+</g, '><')
      .trim()
  assert.equal(
    normalize(overlay),
    normalize(renderToStaticMarkup(React.createElement(StartupScreen))),
  )
})

test('the boot overlay lives outside #root so React never replaces it', () => {
  assert.match(html, /<div id="root"><\/div>/)
  assert.ok(html.indexOf('<div id="root">') < html.indexOf('id="startup"'))
  assert.match(startupStyle(), /#startup\s*\{[^}]*z-index/)
})

test('startup does not depend on translations, providers, or app chunks', () => {
  const imports = source.match(/^import .+$/gm)
  assert.deepEqual(imports, [
    "import PropTypes from 'prop-types'",
    "import { useLayoutEffect } from 'react'",
    "import logo from '../assets/logo.svg'",
    "import { holdStartupOverlay } from '../utils/StartupOverlay'",
  ])
  assert.doesNotMatch(read('../src/utils/StartupOverlay.js'), /^import /m)
  assert.match(source, /role='status'/)
  assert.match(source, /aria-hidden='true'/)
  assert.match(
    read('../src/main.jsx'),
    /<React\.Suspense fallback=\{<StartupScreen \/>\}>/,
  )
})

test('startup uses the original cyan accent unless a skin is saved', () => {
  const [light, dark] = startupStyle().split(
    ":root[data-startup-mode='dark'] .startup-screen",
  )
  assert.match(
    light,
    /--startup-accent: var\(--startup-skin-accent, #0891b2\);/,
  )
  assert.match(light, /--startup-soft: var\(--startup-skin-soft, #cffafe\);/)
  assert.match(dark, /--startup-accent: var\(--startup-skin-accent, #67e8f9\);/)
  assert.match(dark, /--startup-soft: var\(--startup-skin-soft, #164e63\);/)
  assert.doesNotMatch(
    startupStyle(),
    /#7c79d8|#b7b1f4|#dcd9fa|#49416d|#aaa5e7|#68629b/i,
  )
})

test('startup reads the saved theme before first paint', () => {
  const head = html.slice(0, html.indexOf('<body>'))
  assert.ok(
    head.indexOf('<style>') < head.indexOf("localStorage.getItem('themeMode')"),
  )
  assert.match(head, /prefers-color-scheme: dark/)
  assert.match(head, /data-startup-mode/)
  const storageKey = read('../src/utils/StartupTheme.js').match(
    /STARTUP_THEME_STORAGE_KEY = '([^']+)'/,
  )[1]
  assert.ok(head.includes(`localStorage.getItem('${storageKey}')`))
})

test('startup styles are inline and respect reduced motion', () => {
  const style = startupStyle()
  assert.match(style, /\.startup-screen\s*\{/)
  assert.match(style, /prefers-reduced-motion: reduce/)
  assert.match(style, /animation: none/)
  assert.ok(html.indexOf('<style>') < html.indexOf('<body>'))
})

test('the overlay hides once, after the last hold settles', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const classes = new Set()
  let removed = 0
  const overlay = {
    classList: { add: name => classes.add(name) },
    remove: () => (removed += 1),
  }
  globalThis.window = {}
  globalThis.document = { getElementById: () => overlay }

  try {
    const { holdStartupOverlay } =
      await import('../src/utils/StartupOverlay.js')
    const releaseFallback = holdStartupOverlay()
    releaseFallback()
    // A route loader mounts during the settle window: still up.
    const releaseRoute = holdStartupOverlay()
    mock.timers.tick(1000)
    assert.equal(classes.size, 0)

    releaseRoute()
    releaseRoute()
    mock.timers.tick(149)
    assert.equal(classes.size, 0)
    mock.timers.tick(1)
    assert.ok(classes.has('startup-screen--leaving'))
    mock.timers.tick(200)
    assert.equal(removed, 1)

    // Later in-app loaders don't bring it back.
    holdStartupOverlay()()
    mock.timers.tick(10000)
    assert.equal(removed, 1)
  } finally {
    mock.timers.reset()
    delete globalThis.window
    delete globalThis.document
  }
})
