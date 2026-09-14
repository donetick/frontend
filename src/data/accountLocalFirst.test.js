import { beforeEach, describe, expect, it } from 'vitest'

import { setAppMode } from './appMode'
import {
  setAccountLocalFirstEnabled,
  shouldUseLocalFirstStore,
} from './accountLocalFirst'

describe('shouldUseLocalFirstStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('is true in local mode regardless of the account flag', () => {
    setAppMode('local')
    setAccountLocalFirstEnabled(false)
    expect(shouldUseLocalFirstStore()).toBe(true)
  })

  it('is false for a signed-out/undecided session with the flag off', () => {
    setAccountLocalFirstEnabled(false)
    expect(shouldUseLocalFirstStore()).toBe(false)
  })

  it('is true once the account-mode flag is enabled, without local mode', () => {
    setAccountLocalFirstEnabled(true)
    expect(shouldUseLocalFirstStore()).toBe(true)
  })

  it('flips back to false when the flag is disabled again', () => {
    setAccountLocalFirstEnabled(true)
    expect(shouldUseLocalFirstStore()).toBe(true)
    setAccountLocalFirstEnabled(false)
    expect(shouldUseLocalFirstStore()).toBe(false)
  })
})
