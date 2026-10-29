import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

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

const inlineStartup = html.match(/<script>([\s\S]*?)<\/script>/)[1]
const startupModule = transformSync(read('../src/constants/startupTheme.js'), {
  jsc: { parser: { syntax: 'ecmascript' } },
  module: { type: 'commonjs' },
}).code
const startupDocument = () => {
  const attributes = {}
  const properties = {}
  return {
    attributes,
    properties,
    document: {
      documentElement: {
        setAttribute: (name, value) => {
          attributes[name] = value
        },
        style: {
          setProperty: (name, value) => {
            properties[name] = value
          },
        },
      },
    },
  }
}
const runStartup = ({
  dark = false,
  mode,
  skin,
  storageDenied = false,
} = {}) => {
  const state = startupDocument()
  vm.runInNewContext(inlineStartup, {
    document: state.document,
    window: {
      localStorage: {
        getItem: key => {
          if (storageDenied) throw new Error('Storage unavailable')
          return { 'joy-mode': mode, 'donetick-theme-skin': skin }[key] ?? null
        },
      },
      matchMedia: query => {
        assert.equal(query, '(prefers-color-scheme: dark)')
        return { matches: dark }
      },
    },
  })
  return state
}

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
  const [light, dark] = style.split(":root[data-startup-theme='dark']")
  assert.match(light, /--startup-accent: #0891b2;/)
  assert.match(light, /--startup-soft: #cffafe;/)
  assert.match(dark, /--startup-accent: #67e8f9;/)
  assert.match(dark, /--startup-soft: #164e63;/)
  assert.doesNotMatch(style, /#7c79d8|#b7b1f4|#dcd9fa|#49416d|#aaa5e7|#68629b/i)
  for (const [mode, accent, soft] of [
    ['light', '#0891b2', '#cffafe'],
    ['dark', '#67e8f9', '#164e63'],
  ]) {
    const state = runStartup({ mode, dark: mode !== 'dark' })
    assert.equal(state.attributes['data-startup-theme'], mode)
    assert.equal(state.properties['--startup-accent'], accent)
    assert.equal(state.properties['--startup-soft'], soft)
  }
})

test('first paint and later theme updates apply the same tokens for every skin', () => {
  const state = startupDocument()
  const exports = {}
  vm.runInNewContext(startupModule, { document: state.document, exports })
  for (const skin of Object.keys(exports.STARTUP_TOKENS)) {
    for (const mode of ['light', 'dark']) {
      exports.applyStartupTheme(skin, mode)
      const firstPaint = runStartup({ skin, mode, dark: mode !== 'dark' })
      assert.deepEqual(
        firstPaint.properties,
        state.properties,
        `${skin}/${mode}`,
      )
      assert.equal(firstPaint.attributes['data-startup-theme'], mode)
      assert.equal(state.attributes['data-startup-theme'], mode)
      assert.equal(Object.keys(firstPaint.properties).length, 6)
    }
  }
})

test('startup falls back to the system mode and default skin without stored preferences', () => {
  for (const dark of [false, true]) {
    for (const mode of [undefined, 'system', 'unrecognized']) {
      const state = runStartup({ mode, skin: 'missing-skin', dark })
      assert.equal(
        state.attributes['data-startup-theme'],
        dark ? 'dark' : 'light',
      )
      assert.equal(
        state.properties['--startup-accent'],
        dark ? '#67e8f9' : '#0891b2',
      )
    }
    const denied = runStartup({
      mode: 'light',
      skin: 'forest',
      dark,
      storageDenied: true,
    })
    assert.equal(
      denied.attributes['data-startup-theme'],
      dark ? 'dark' : 'light',
    )
    assert.equal(
      denied.properties['--startup-accent'],
      dark ? '#67e8f9' : '#0891b2',
    )
  }
})

test('startup styles are inline, theme-aware and respect reduced motion', () => {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(style, /\.startup-screen\s*\{/)
  assert.match(style, /:root\[data-startup-theme='dark'\]/)
  assert.match(inlineStartup, /prefers-color-scheme: dark/)
  assert.match(style, /prefers-reduced-motion: reduce/)
  assert.match(style, /animation: none/)
  assert.ok(html.indexOf('<style>') < html.indexOf('<body>'))
})
