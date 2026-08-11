import { chromium } from '@playwright/test'
import { readFile } from 'fs/promises'

const state = JSON.parse(await readFile('.auth/state.json', 'utf8'))
const browser = await chromium.launch()
const context = await browser.newContext({ storageState: state })
const page = await context.newPage()
page.on('console', msg => console.log('[console]', msg.type(), msg.text()))
page.on('pageerror', err => console.log('[pageerror]', err.message, '\n', err.stack))

await page.goto('http://localhost:5173/chores/create')
await page.getByTestId('chore-name-input').fill('Debug Chore ' + Date.now())
await page.getByLabel('Repeat this task').click()
await page.getByLabel('Daily').click()
await page.getByRole('button', { name: 'Create' }).click()
await page.waitForURL('**/chores', { timeout: 15000 })
await page.waitForTimeout(2000)

await browser.close()
