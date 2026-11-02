import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { buildSync } from 'esbuild'

const languages = await import('../src/i18n/languages.js').catch(() => ({}))

test('every selectable language has a unique code and matching resource directory', () => {
  assert.ok(
    Array.isArray(languages.AVAILABLE_LANGUAGES),
    '语言菜单必须使用统一的语言定义',
  )
  const codes = languages.AVAILABLE_LANGUAGES.map(language => language.code)
  assert.equal(new Set(codes).size, codes.length)
  assert.equal(codes.length, 15)
  for (const language of languages.AVAILABLE_LANGUAGES) {
    const file = new URL(
      `../public/locales/${language.code}/common.json`,
      import.meta.url,
    )
    assert.ok(existsSync(file), `${language.code} 没有对应资源`)
    assert.doesNotThrow(() => JSON.parse(readFileSync(file, 'utf8')))
    assert.equal(languages.resolveLanguage(language.code), language.code)
  }
})

test('browser and saved regional aliases resolve to offered resource codes', () => {
  assert.equal(typeof languages.resolveLanguage, 'function')
  for (const [input, expected] of [
    ['zh', 'zh-CN'],
    ['ZH_cn', 'zh-CN'],
    ['zh-Hans-CN', 'zh-CN'],
    ['ar-SA', 'ar'],
    ['fr-FR', 'fr'],
    ['pt-BR', 'pt'],
    ['es-ES', 'es-ES'],
    ['es-MX', 'es'],
    ['de-DE', 'de'],
    ['not-a-language', 'en'],
    ['', 'en'],
    [null, 'en'],
  ])
    assert.equal(languages.resolveLanguage(input), expected, String(input))
})

test('all language choices register their matching Moment locale in a browser bundle', () => {
  assert.equal(typeof languages.getMomentLocale, 'function')
  const config = readFileSync(
    new URL('../src/i18n/config.js', import.meta.url),
    'utf8',
  )
  const imports = [
    ...config.matchAll(/import ['"](moment\/(?:dist\/)?locale\/[^'"]+)['"]/g),
  ]
    .map(match => `import '${match[1]}';`)
    .join('\n')
  const result = buildSync({
    stdin: {
      contents: `import moment from 'moment'; ${imports}
        import { AVAILABLE_LANGUAGES, getMomentLocale } from './src/i18n/languages.js';
        globalThis.results = AVAILABLE_LANGUAGES.map(language => {
          moment.locale('en');
          const expected = getMomentLocale(language.code);
          const sample = moment('2026-01-15').locale(expected);
          return { code: language.code, expected, actual: sample.locale(), month: sample.format('MMMM') };
        });`,
      resolveDir: new URL('..', import.meta.url).pathname,
    },
    bundle: true,
    platform: 'browser',
    mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main'],
    format: 'iife',
    write: false,
    logLevel: 'silent',
  })
  const context = {}
  vm.runInNewContext(result.outputFiles[0].text, context)
  for (const item of context.results)
    assert.equal(item.actual, item.expected, item.code)
  assert.equal(context.results.find(item => item.code === 'pt').actual, 'pt-br')
  assert.equal(context.results.find(item => item.code === 'es-ES').actual, 'es')
  assert.equal(
    context.results.find(item => item.code === 'zh-CN').month,
    '一月',
  )
})
