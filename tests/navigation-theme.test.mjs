import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

const readSource = name =>
  readFileSync(
    new URL(`../src/views/components/${name}.jsx`, import.meta.url),
    'utf8',
  )

// Navigation surfaces should use a real, scheme-aware Joy token rather than
// an invented RGB channel, which silently turns transparent in the browser.
test('header, sidebar, drawer and bottom navigation use the themed canvas', () => {
  const navbar = readSource('NavBar')
  const bottomNav = readSource('MobileBottomNav')
  assert.equal((navbar.match(/bgcolor: 'background.body'/g) || []).length, 3)
  assert.match(bottomNav, /bgcolor: 'background.body'/)
  assert.doesNotMatch(navbar, /background-surfaceChannel|backdropFilter/)
})

test('navigation branding follows the accent instead of hardcoded cyan', () => {
  const navbar = readSource('NavBar')
  assert.match(navbar, /component='span' sx={{ color: 'primary.plainColor' }}/)
  assert.doesNotMatch(navbar, /#06b6d4/)
})

test('active navigation labels and icons share the soft variant foreground', () => {
  const link = readSource('NavBarLink')
  assert.match(link, /color: active \? 'primary.softColor' : 'text.secondary'/)
  assert.match(link, /color: 'inherit', fontWeight: active \? 600 : 400/)
})
