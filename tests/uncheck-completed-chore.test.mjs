import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const noRecentAction =
  'No recent action found to undo (actions can only be undone within 5 minutes)'
const source = readFileSync(
  new URL(
    '../src/views/Projects/projectLayout/uncheckCompletedChore.js',
    import.meta.url,
  ),
  'utf8',
)
// Replace only the network boundary; run the production helper body unchanged.
const helper = source
  .replace(/^import .*\n/, '')
  .replace('export const ', 'const ')
const fetcher = readFileSync(
  new URL('../src/utils/Fetcher.jsx', import.meta.url),
  'utf8',
)
const actionFetch = fetcher.slice(
  fetcher.indexOf('const ActionFetch ='),
  fetcher.indexOf('\nconst ', fetcher.indexOf('const ActionFetch =') + 1),
)
const undo = fetcher.slice(
  fetcher.indexOf('const UndoChoreAction ='),
  fetcher.indexOf('\nconst NudgeChore'),
)

function setup({ failure, message = '', status = 200 } = {}) {
  const calls = []
  const Fetch = async (url, options) => {
    calls.push(['undo', url, options.method])
    if (failure) throw failure
    return {
      ok: status >= 200 && status < 300,
      status,
      clone: () => ({ json: async () => ({ error: message }) }),
    }
  }
  const uncheck = new Function(
    'Fetch',
    'HEADERS',
    actionFetch +
      '\n' +
      undo +
      '\n' +
      helper +
      '\nreturn uncheckCompletedChore',
  )(Fetch, () => ({}))
  const response = { ok: true }
  return {
    calls,
    response,
    run: chore =>
      uncheck(chore, async id => {
        calls.push(['unarchive', id])
        return response
      }),
  }
}
const completed = { id: 7, lastCompletedDate: '2026-11-14' }

test('never-completed tasks only unarchive', async () => {
  const s = setup()
  assert.equal(await s.run({ id: 7 }), s.response)
  assert.deepEqual(s.calls, [['unarchive', 7]])
})
test('successful undo precedes unarchive', async () => {
  const s = setup()
  assert.equal(await s.run(completed), s.response)
  assert.deepEqual(s.calls, [
    ['undo', '/chores/7/undo', 'POST'],
    ['unarchive', 7],
  ])
})
test('documented no-recent-action response retains unarchive fallback', async () => {
  const s = setup({ status: 400, message: noRecentAction })
  assert.equal(await s.run(completed), s.response)
  assert.equal(s.calls.length, 2)
})
for (const [status, message] of [
  [400, 'Invalid chore ID'],
  [400, 'Cannot undo this type of action'],
  [401, 'Authentication failed'],
  [403, 'Forbidden'],
  [500, 'Failed to undo action'],
  [500, noRecentAction],
]) {
  test(`HTTP ${status} ${message} stops before unarchive`, async () => {
    const s = setup({ status, message })
    await assert.rejects(
      s.run(completed),
      error => error.status === status && error.message === message,
    )
    assert.equal(s.calls.length, 1)
  })
}
test('network failure propagates original error and does not unarchive', async () => {
  const failure = new TypeError('Network request failed')
  const s = setup({ failure })
  await assert.rejects(s.run(completed), error => error === failure)
  assert.equal(s.calls.length, 1)
})
