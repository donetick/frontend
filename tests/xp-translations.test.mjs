import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import i18next from 'i18next'

import { xpTranslationKey } from '../src/utils/XPTranslation.js'

const namespaces = ['points', 'rewards', 'chores', 'common', 'history']
const resources = Object.fromEntries(
  ['en', 'de'].map(language => [
    language,
    Object.fromEntries(
      namespaces.map(namespace => [
        namespace,
        existsSync(
          new URL(
            `../public/locales/${language}/${namespace}.json`,
            import.meta.url,
          ),
        )
          ? JSON.parse(
              readFileSync(
                new URL(
                  `../public/locales/${language}/${namespace}.json`,
                  import.meta.url,
                ),
                'utf8',
              ),
            )
          : {},
      ]),
    ),
  ]),
)
const instance = i18next.createInstance()
await instance.init({
  lng: 'de',
  fallbackLng: 'en',
  resources,
  interpolation: { escapeValue: false },
})
const translate = (namespace, key, options, xpMode = true) =>
  instance.getFixedT(null, namespace)(
    xpTranslationKey(instance, namespace, key, options, xpMode),
    options,
  )

test('XP labels keep interpolation values and resolve plural forms through fallback', () => {
  assert.match(
    translate('rewards', 'blurb', { points: 42 }),
    /Available: 42 XP\./,
  )
  for (const count of [1, 12]) {
    assert.equal(translate('rewards', 'pointsCost', { count }), `${count} XP`)
    assert.equal(
      translate('points', 'leaderboard.points', { count }),
      `${count} XP`,
    )
    assert.equal(
      translate('history', 'detail.points', { count }),
      `${count} XP`,
    )
  }
  assert.equal(
    translate('points', 'redeemModal.pointsAvailable', { count: 17 }),
    '17 XP available',
  )
})

test('Points mode and labels without an XP variant keep their original translation', () => {
  assert.equal(
    translate('points', 'redeem', undefined, false),
    instance.t('points:redeem'),
  )
  assert.equal(translate('points', 'xp.save'), instance.t('points:xp.save'))
  assert.equal(
    translate('points', 'common:cancel'),
    instance.t('common:cancel'),
  )
})

test('every English XP variant preserves the original interpolation variables', () => {
  const variables = value =>
    [...value.matchAll(/\{\{\s*([^},]+).*?\}\}/g)].map(match => match[1]).sort()
  const walk = object => {
    for (const [key, value] of Object.entries(object)) {
      if (value && typeof value === 'object') walk(value)
      else if (/_xp(?:_(?:zero|one|two|few|many|other))?$/.test(key)) {
        const original = object[key.replace(/_xp(?=_|$)/, '')]
        assert.equal(typeof original, 'string', `missing original for ${key}`)
        assert.deepEqual(variables(value), variables(original), key)
      }
    }
  }
  namespaces.forEach(namespace => walk(resources.en[namespace]))
})
