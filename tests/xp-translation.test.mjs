import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { translatePoints } from '../src/utils/XPTranslation.js'
const catalog = ns =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../public/locales/en/${ns}.json`, import.meta.url),
    ),
  )
const setup = async lng => {
  const i18n = i18next.createInstance()
  await i18n.init({
    lng,
    fallbackLng: 'en',
    resources: {
      en: {
        points: catalog('points'),
        rewards: catalog('rewards'),
        chores: catalog('chores'),
      },
      es: { points: { redeem: 'Canjear puntos', unchanged: 'Sin cambios' } },
    },
  })
  return (xp, ns, key, options) =>
    translatePoints(i18n.getFixedT(null, ns), i18n, ns, xp, key, options)
}
test('points default and XP plural terminology preserve values', async () => {
  const t = await setup('en')
  assert.equal(
    t(false, 'points', 'leaderboard.points', { count: 2 }),
    '2 points',
  )
  assert.equal(t(true, 'points', 'leaderboard.points', { count: 2 }), '2 XP')
  assert.equal(t(true, 'points', 'leaderboard.points', { count: 1 }), '1 XP')
  assert.equal(
    t(true, 'chores', 'activitiesCard.pointsShort', { count: 50 }),
    '50 XP',
  )
})
test('XP fallback changes only contextual labels, retaining unrelated locale text', async () => {
  const t = await setup('es')
  assert.equal(t(false, 'points', 'redeem'), 'Canjear puntos')
  assert.equal(t(true, 'points', 'redeem'), 'Deduct XP')
  assert.equal(t(true, 'points', 'unchanged'), 'Sin cambios')
  assert.equal(t(true, 'points', 'missing', 'Fallback text'), 'Fallback text')
})
test('terminology preserves interpolation variable names', async () => {
  const t = await setup('en')
  assert.match(t(true, 'rewards', 'blurb', { points: 37 }), /37 XP/)
  assert.doesNotMatch(t(true, 'rewards', 'blurb', { points: 37 }), /\{\{/)
})
