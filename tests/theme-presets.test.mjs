import assert from 'node:assert/strict'
import test from 'node:test'

import colors from 'tailwindcss/colors.js'

import {
  DEFAULT_THEME_SKIN,
  readThemeSkin,
  resolveThemeSkin,
  THEME_PRESETS,
  THEME_SKIN_STORAGE_KEY,
} from '../src/constants/themePresets.js'

test('all skins have complete light and dark previews', () => {
  assert.deepEqual(Object.keys(THEME_PRESETS), [
    'default',
    'forest',
    'lavender',
    'sand',
    'ocean',
    'rose',
    'sunset',
    'bubblegum',
    'mint',
    'graphite',
  ])
  for (const preset of Object.values(THEME_PRESETS)) {
    assert.ok(preset.accent)
    assert.match(preset.swatch, /^#[\da-f]{6}$/i)
    for (const mode of ['light', 'dark']) {
      for (const token of ['body', 'surface', 'popup']) {
        assert.match(preset[mode][token], /^#[\da-f]{6}$/i)
      }
    }
    assert.notEqual(preset.light.body, preset.dark.body)
  }
})

test('every skin uses complete accent and neutral color scales', () => {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
  for (const preset of Object.values(THEME_PRESETS)) {
    for (const name of [preset.accent, preset.neutral].filter(Boolean)) {
      for (const shade of shades) {
        assert.match(colors[name]?.[shade] ?? '', /^#[\da-f]{6}$/i)
      }
    }
  }
})

test('custom card surfaces are tinted and retain readable text in both modes', () => {
  const luminance = hex => {
    const channels = hex.match(/[\da-f]{2}/gi).map(channel => {
      const value = parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  for (const [id, preset] of Object.entries(THEME_PRESETS)) {
    if (id === 'default') continue
    assert.notEqual(preset.light.surface.toLowerCase(), '#ffffff')
    for (const mode of ['light', 'dark']) {
      const text = colors[preset.neutral][mode === 'light' ? 800 : 100]
      for (const token of ['surface', 'popup']) {
        const values = [luminance(text), luminance(preset[mode][token])].sort(
          (a, b) => a - b,
        )
        const contrast = (values[1] + 0.05) / (values[0] + 0.05)
        assert.ok(
          contrast >= 4.5,
          `${id} ${mode} ${token} text contrast: ${contrast}`,
        )
      }
    }
  }
})

test('default skin preserves existing body colors', () => {
  assert.equal(THEME_PRESETS.default.light.body, '#FFFFFF')
  assert.equal(THEME_PRESETS.default.dark.body, '#000000')
  assert.equal(THEME_PRESETS.default.accent, 'cyan')
})

test('invalid or obsolete persisted skins fall back safely', () => {
  for (const value of [
    null,
    undefined,
    '',
    'retired-theme',
    '__proto__',
    'constructor',
  ]) {
    assert.equal(resolveThemeSkin(value), DEFAULT_THEME_SKIN)
  }
})

test('valid skins restore independently of color mode', () => {
  for (const id of Object.keys(THEME_PRESETS)) {
    assert.equal(
      readThemeSkin({
        getItem: key => {
          assert.equal(key, THEME_SKIN_STORAGE_KEY)
          return id
        },
      }),
      id,
    )
  }
})

test('missing and unavailable storage do not prevent startup', () => {
  assert.equal(readThemeSkin({ getItem: () => null }), DEFAULT_THEME_SKIN)
  assert.equal(
    readThemeSkin({
      getItem: () => {
        throw new Error('Storage denied')
      },
    }),
    DEFAULT_THEME_SKIN,
  )
})
