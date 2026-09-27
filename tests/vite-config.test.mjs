import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldUploadPosthogSourcemaps } from '../vite.config.mjs'

test('sourcemap uploads stay disabled unless explicitly enabled', () => {
  assert.equal(
    shouldUploadPosthogSourcemaps({
      command: 'build',
      env: {
        POSTHOG_API_KEY: 'phx_example',
        POSTHOG_PROJECT_ID: '123',
        POSTHOG_HOST: 'https://us.i.posthog.com',
      },
    }),
    false,
  )
})

test('sourcemap uploads turn on only with explicit opt-in', () => {
  assert.equal(
    shouldUploadPosthogSourcemaps({
      command: 'build',
      env: {
        POSTHOG_API_KEY: 'phx_example',
        POSTHOG_PROJECT_ID: '123',
        POSTHOG_HOST: 'https://us.i.posthog.com',
        POSTHOG_UPLOAD_SOURCEMAPS: 'true',
      },
    }),
    true,
  )
})
