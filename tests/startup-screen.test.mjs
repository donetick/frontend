import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'
import postcss from 'postcss'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  applyStartupTheme,
  STARTUP_TOKENS,
} from '../src/constants/startupTheme.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const html = read('../index.html')
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const stylesheet = postcss.parse(style)
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1]

function startupTheme({
  blockedStorage = false,
  media = true,
  mode,
  osDark = false,
  skin,
} = {}) {
  const properties = {}
  const attributes = {}
  const root = {
    setAttribute: (name, value) => {
      attributes[name] = value
    },
    style: {
      setProperty: (name, value) => {
        properties[name] = value
      },
    },
  }
  const window = {
    localStorage: {
      getItem(key) {
        if (blockedStorage) throw new Error('Storage blocked')
        return { 'joy-mode': mode, 'donetick-theme-skin': skin }[key] ?? null
      },
    },
    ...(media
      ? {
          matchMedia: query => {
            assert.equal(query, '(prefers-color-scheme: dark)')
            return { matches: osDark }
          },
        }
      : {}),
  }
  vm.runInNewContext(bootstrap, { window, document: { documentElement: root } })
  return { root, properties, attributes }
}
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

test('startup respects a saved Chinese language without waiting for translation resources', () => {
  const previous = globalThis.window
  globalThis.window = {
    localStorage: { getItem: key => (key === 'language' ? '"zh-CN"' : null) },
  }
  try {
    const markup = renderToStaticMarkup(React.createElement(StartupScreen))
    assert.match(markup, /正在准备/)
    assert.match(markup, /正在加载 Donetick/)
    assert.doesNotMatch(markup, /Getting things ready/)
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})

test('startup resolves saved mode before OS preference and keeps the default cyan colors', () => {
  for (const fixture of [
    {
      mode: 'light',
      osDark: true,
      want: 'light',
      accent: '#0891b2',
      soft: '#cffafe',
    },
    {
      mode: 'dark',
      osDark: false,
      want: 'dark',
      accent: '#67e8f9',
      soft: '#164e63',
    },
    {
      mode: 'system',
      osDark: true,
      want: 'dark',
      accent: '#67e8f9',
      soft: '#164e63',
    },
    { osDark: false, want: 'light', accent: '#0891b2', soft: '#cffafe' },
    {
      mode: 'invalid',
      osDark: true,
      want: 'dark',
      accent: '#67e8f9',
      soft: '#164e63',
    },
    {
      blockedStorage: true,
      osDark: true,
      want: 'dark',
      accent: '#67e8f9',
      soft: '#164e63',
    },
    { media: false, want: 'light', accent: '#0891b2', soft: '#cffafe' },
  ]) {
    const { attributes, properties } = startupTheme(fixture)
    assert.equal(attributes['data-startup-theme'], fixture.want)
    assert.equal(properties['--startup-accent'], fixture.accent)
    assert.equal(properties['--startup-soft'], fixture.soft)
  }
})

test('startup applies saved skins, falls back for unknown skins, and matches the React theme applier', () => {
  const forest = startupTheme({ skin: 'forest', mode: 'dark' })
  assert.equal(forest.properties['--startup-bg'], '#101914')
  assert.equal(forest.properties['--startup-accent'], '#6ee7b7')
  assert.equal(
    startupTheme({ skin: 'unknown', mode: 'light' }).properties[
      '--startup-accent'
    ],
    '#0891b2',
  )

  for (const skin of Object.keys(STARTUP_TOKENS)) {
    for (const mode of ['light', 'dark']) {
      const inline = startupTheme({ skin, mode })
      const react = startupTheme({ skin: 'default', mode: 'light' })
      const previous = globalThis.document
      globalThis.document = { documentElement: react.root }
      try {
        applyStartupTheme(skin, mode)
      } finally {
        if (previous === undefined) delete globalThis.document
        else globalThis.document = previous
      }
      assert.deepEqual(
        inline.properties,
        react.properties,
        `${skin}/${mode} properties`,
      )
      assert.deepEqual(
        inline.attributes,
        react.attributes,
        `${skin}/${mode} mode`,
      )
    }
  }
})

test('startup styles are inline, consume resolved theme colors, and disable descendant animations for reduced motion', () => {
  const screen = stylesheet.nodes.find(
    node => node.type === 'rule' && node.selector === '.startup-screen',
  )
  const declarations = Object.fromEntries(
    screen.nodes.map(node => [node.prop, node.value]),
  )
  assert.equal(declarations.background, 'var(--startup-bg)')
  assert.equal(declarations.color, 'var(--startup-text)')
  const dark = stylesheet.nodes.find(
    node =>
      node.type === 'rule' &&
      node.selector === ":root[data-startup-theme='dark']",
  )
  assert.ok(
    dark.nodes.some(
      node => node.prop === '--startup-text' && node.value === '#f0f1f5',
    ),
  )
  const reduced = stylesheet.nodes.find(
    node =>
      node.type === 'atrule' &&
      node.name === 'media' &&
      node.params === '(prefers-reduced-motion: reduce)',
  )
  assert.ok(reduced, 'reduced motion media rule exists')
  const animations = reduced.nodes.find(node =>
    node.selectors?.includes('.startup-screen .startup-screen__content *'),
  )
  assert.ok(animations, 'reduced motion includes animated descendants')
  assert.ok(
    animations.nodes.some(
      node => node.prop === 'animation' && node.value === 'none',
    ),
  )
  assert.ok(html.indexOf('<script>') < html.indexOf('<style>'))
  assert.ok(html.indexOf('<style>') < html.indexOf('<body>'))
})
