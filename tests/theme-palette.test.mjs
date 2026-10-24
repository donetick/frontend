import assert from 'node:assert/strict'
import test from 'node:test'

import colors from 'tailwindcss/colors.js'

import { THEME_PRESETS } from '../src/constants/themePresets.js'
import { tintNeutralPalette } from '../src/utils/themePalette.js'

const luminance = hex => {
  const channels = hex.match(/[\da-f]{2}/gi).map(channel => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (values[1] + 0.05) / (values[0] + 0.05)
}

const skins = Object.entries(THEME_PRESETS).filter(([id]) => id !== 'default')

test('neutral tint preserves all shades without mutating shared palettes', () => {
  const original = { ...colors.slate }
  const tinted = tintNeutralPalette(colors.slate, colors.violet)
  assert.deepEqual(colors.slate, original)
  assert.deepEqual(Object.keys(tinted), Object.keys(original))
  assert.notEqual(tinted[100], original[100])
  assert.notEqual(tinted[800], original[800])
  for (const value of Object.values(tinted)) {
    assert.match(value, /^#[\da-f]{6}$/i)
  }
})

test('solid button shades retain readable white labels', () => {
  for (const [id, preset] of skins) {
    const shade = preset.solidShade ?? 700
    for (const step of [0, 100, 200]) {
      assert.ok(
        contrast('#ffffff', colors[preset.accent][shade + step]) >= 4.5,
        id,
      )
    }
  }
  assert.equal(THEME_PRESETS.bubblegum.solidShade, 600)
})

test('Hot Pink dark accents retain readable text across interaction states', () => {
  const preset = THEME_PRESETS.bubblegum
  const primary = preset.darkPrimary
  assert.equal(primary.solidBg, '#ff1493')
  for (const token of ['solidBg', 'solidHoverBg', 'solidActiveBg']) {
    assert.ok(contrast(primary.solidColor, primary[token]) >= 4.5, token)
  }
  for (const token of ['softBg', 'softHoverBg', 'softActiveBg']) {
    assert.ok(contrast(primary.softColor, primary[token]) >= 4.5, token)
  }
  for (const token of ['body', 'surface', 'popup']) {
    assert.ok(contrast(primary.plainColor, preset.dark[token]) >= 4.5, token)
    assert.ok(contrast(primary.outlinedColor, preset.dark[token]) >= 4.5, token)
  }
})

test('success and warning cues remain readable on themed feedback surfaces', () => {
  for (const [id, preset] of skins) {
    for (const palette of [colors.emerald, colors.amber]) {
      assert.ok(contrast('#ffffff', palette[700]) >= 4.5)
      assert.ok(contrast(palette[800], preset.light.surface) >= 4.5, id)
      assert.ok(contrast(palette[300], preset.dark.surface) >= 4.5, id)
    }
  }
})

test('Graphite remains monochrome', () => {
  assert.deepEqual(tintNeutralPalette(colors.zinc, colors.zinc), colors.zinc)
})

test('tinted palettes retain light-to-dark shade ordering', () => {
  for (const [, preset] of skins) {
    const neutral = tintNeutralPalette(
      colors[preset.neutral],
      colors[preset.accent],
    )
    const values = Object.values(neutral).map(luminance)
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i] < values[i - 1])
    }
  }
})

test('soft cards and themed surfaces retain readable neutral text', () => {
  for (const [id, preset] of skins) {
    const neutral = tintNeutralPalette(
      colors[preset.neutral],
      colors[preset.accent],
    )
    // Joy uses 700 on 100 for light soft variants and 200 on 800 for dark.
    // Explicit secondary text in task cards uses 700 (light) / 300 (dark).
    const pairs = [
      [neutral[700], neutral[100]],
      [neutral[300], neutral[800]],
      [neutral[700], preset.light.surface],
      [neutral[300], preset.dark.surface],
      [neutral[700], preset.light.popup],
      [neutral[300], preset.dark.popup],
    ]
    for (const [text, background] of pairs) {
      assert.ok(
        contrast(text, background) >= 4.5,
        `${id}: ${text} on ${background}`,
      )
    }
  }
})
