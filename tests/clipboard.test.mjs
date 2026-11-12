import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(
  new URL('../src/utils/Clipboard.js', import.meta.url),
  'utf8',
).replace('export const copyText', 'globalThis.copyText')

function setup({ clipboard, result = true, throws = false } = {}) {
  const calls = []
  const savedRange = {}
  const dialog = { appendChild: element => calls.push(['append', element]) }
  const textarea = {
    style: {},
    focus: () => calls.push('focus'),
    select: () => calls.push('select'),
    setSelectionRange: (start, end) => calls.push(['selectRange', start, end]),
    remove: () => calls.push('remove'),
  }
  const context = vm.createContext({
    navigator: { clipboard },
    window: {
      getSelection: () => ({
        rangeCount: 1,
        getRangeAt: () => ({ cloneRange: () => savedRange }),
        removeAllRanges: () => calls.push('clearSelection'),
        addRange: range => calls.push(['restoreSelection', range]),
      }),
    },
    document: {
      activeElement: {
        closest: () => dialog,
        focus: () => calls.push('restoreFocus'),
      },
      createElement: () => textarea,
      execCommand: command => {
        calls.push(command)
        if (throws) throw new Error('Copy blocked')
        return result
      },
    },
  })
  vm.runInContext(source, context)
  return { copyText: context.copyText, calls, textarea, savedRange }
}

test('uses the modern API when available without creating a text field', async () => {
  const written = []
  const { calls, copyText } = setup({
    clipboard: { writeText: async text => written.push(text) },
  })
  assert.equal(await copyText('secure copy'), true)
  assert.deepEqual(written, ['secure copy'])
  assert.deepEqual(calls, [])
})

test('HTTP fallback copies inside the focused dialog and restores focus and selection', async () => {
  const { calls, copyText, savedRange, textarea } = setup()
  const promise = copyText('token\nwith unicode: é')
  // HTTP fallback must execute during the click, before yielding activation.
  assert.ok(calls.includes('copy'))
  assert.equal(await promise, true)
  assert.equal(textarea.value, 'token\nwith unicode: é')
  assert.deepEqual(calls, [
    ['append', textarea],
    'focus',
    'select',
    ['selectRange', 0, textarea.value.length],
    'copy',
    'remove',
    'restoreFocus',
    'clearSelection',
    ['restoreSelection', savedRange],
  ])
})

test('falls back when the modern clipboard API rejects', async () => {
  const { calls, copyText } = setup({
    clipboard: {
      writeText: async () => {
        throw new Error('Permission denied')
      },
    },
  })
  assert.equal(await copyText('copy'), true)
  assert.ok(calls.includes('copy'))
})

for (const options of [{ result: false }, { throws: true }]) {
  test(`reports failure and cleans up when legacy copying ${options.throws ? 'throws' : 'returns false'}`, async () => {
    const { calls, copyText } = setup(options)
    assert.equal(await copyText('keep token visible'), false)
    assert.ok(calls.includes('remove'))
    assert.ok(calls.includes('restoreFocus'))
  })
}

test('does not copy missing values', async () => {
  const { calls, copyText } = setup()
  assert.equal(await copyText(null), false)
  assert.equal(await copyText(undefined), false)
  assert.deepEqual(calls, [])
})
