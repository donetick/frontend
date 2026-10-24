import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import {
  feedbackDecoratorStyles,
  feedbackSurfaceStyles,
} from '../src/utils/feedbackTheme.js'

const theme = {
  vars: {
    palette: {
      background: { surface: 'var(--surface)' },
      text: { primary: 'var(--text)' },
      divider: 'var(--divider)',
      success: { plainColor: 'var(--success)' },
      warning: { plainColor: 'var(--warning)' },
      danger: { plainColor: 'var(--danger)' },
      primary: { plainColor: 'var(--primary)' },
      neutral: { plainColor: 'var(--neutral)' },
    },
  },
}

test('subtle alerts and snackbars use themed surfaces with semantic status cues', () => {
  for (const variant of ['soft', 'outlined']) {
    for (const color of [
      'success',
      'warning',
      'danger',
      'primary',
      'neutral',
    ]) {
      const props = { theme, ownerState: { variant, color } }
      assert.deepEqual(feedbackSurfaceStyles(props), {
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        borderColor: 'var(--divider)',
      })
      assert.deepEqual(feedbackDecoratorStyles(props), {
        color: `var(--${color})`,
      })
    }
  }
})

test('explicit solid and plain feedback variants are not overridden', () => {
  for (const variant of ['solid', 'plain']) {
    const props = { theme, ownerState: { variant, color: 'success' } }
    assert.deepEqual(feedbackSurfaceStyles(props), {})
    assert.deepEqual(feedbackDecoratorStyles(props), {})
  }
})

test('both loaders follow the primary accent, not success green or hardcoded cyan', () => {
  const readSource = path =>
    readFileSync(new URL(path, import.meta.url), 'utf8')
  const loader = readSource('../src/views/components/Loading.jsx')
  const overlay = readSource('../src/components/animations/LoadingScreen.jsx')
  assert.match(loader, /color='primary'/)
  assert.doesNotMatch(loader, /color='success'|@mui\/material/)
  assert.match(overlay, /theme\.vars\.palette\.background\.body/)
  assert.match(overlay, /primary\.plainColor/)
  assert.doesNotMatch(overlay, /#06b6d4|rgba\(255, 255, 255/)
})
