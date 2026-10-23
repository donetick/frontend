import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

const source = readFileSync(
  new URL('../src/views/User/UserPoints.jsx', import.meta.url),
)
const anchoredSource = Buffer.concat([Buffer.from(';'), source])
const ast = parseSync(anchoredSource.toString(), {
  syntax: 'ecmascript',
  jsx: true,
})
const text = node =>
  anchoredSource
    .subarray(node.span.start - ast.span.start, node.span.end - ast.span.start)
    .toString()

const forEachCallbacks = []
function collectForEachCallbacks(node) {
  if (!node || typeof node !== 'object') return
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.value === 'forEach' &&
    node.arguments[0]?.expression?.type === 'ArrowFunctionExpression'
  ) {
    forEachCallbacks.push(node.arguments[0].expression)
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) child.forEach(collectForEachCallbacks)
    else collectForEachCallbacks(child)
  }
}
collectForEachCallbacks(ast)

test('points history summaries and leaderboards count completed entries only', () => {
  const summaryCallback = forEachCallbacks.find(callback =>
    text(callback).includes('bucketByKey'),
  )
  const leaderboardCallback = forEachCallbacks.find(callback =>
    text(callback).includes('periodTasks'),
  )
  assert.ok(summaryCallback)
  assert.ok(leaderboardCallback)

  const summaryBucket = { points: 0, tasks: 0 }
  const summaryContext = {
    userId: 1,
    keyFormat: 'YYYY-MM-DD',
    bucketByKey: new Map([['today', summaryBucket]]),
    moment: () => ({ format: () => 'today' }),
  }
  const updateSummary = vm.runInNewContext(
    `(${text(summaryCallback)})`,
    summaryContext,
  )
  const userStats = { periodPoints: 0, periodTasks: 0 }
  const leaderboardContext = { stats: new Map([[1, userStats]]) }
  const updateLeaderboard = vm.runInNewContext(
    `(${text(leaderboardCallback)})`,
    leaderboardContext,
  )
  const history = [
    { status: 1, completedBy: 1, performedAt: 'today', points: 5 },
    { status: 6, completedBy: 1, performedAt: 'today', points: 0 },
    { status: 2, completedBy: 1, performedAt: 'today', points: 0 },
  ]

  history.forEach(updateSummary)
  history.forEach(updateLeaderboard)

  assert.deepEqual(summaryBucket, { points: 5, tasks: 1 })
  assert.deepEqual(userStats, { periodPoints: 5, periodTasks: 1 })
})
