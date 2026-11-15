import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { getChorePermissions } from '../../src/utils/ChoreAccess.js'

const source = readFileSync(
  new URL('../../src/hooks/useChorePermissions.js', import.meta.url),
  'utf8',
)
const { code } = transformSync(source, {
  jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
  module: { type: 'commonjs' },
})

// Keep both the production identity selection and permission policy real.
// Only the providers' data is replaced, so permission regressions reach the UI.
export function loadChorePermissions({
  impersonatedUser,
  members = [],
  userId = 5,
} = {}) {
  const modules = {
    '../contexts/ImpersonateUserContext': {
      useImpersonateUser: () => ({ impersonatedUser }),
    },
    '../queries/UserQueries': {
      useUserProfile: () => ({ data: userId == null ? null : { id: userId } }),
      useCircleMembers: () => ({ data: { res: members } }),
    },
    '../utils/ChoreAccess': { getChorePermissions },
  }
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`)
      return modules[name]
    },
  })
  return exports
}
