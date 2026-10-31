import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { applyFilter, validateFilter } from '../src/utils/FilterEngine.js'

// Exercise the real hook's project derivation without a browser or router.
const source = readFileSync(
  new URL('../src/views/Chores/hooks/useProjectFilter.js', import.meta.url),
  'utf8',
)
const { code } = transformSync(source, {
  jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
  module: { type: 'commonjs' },
})
const exports = {}
vm.runInNewContext(code, {
  exports,
  localStorage: { getItem: () => null },
  require: name => {
    if (name === 'react') {
      return {
        useCallback: callback => callback,
        useEffect: () => {},
        useMemo: factory => factory(),
        useState: initial => [initial(), () => {}],
      }
    }
    if (name === 'react-router-dom') {
      return { useSearchParams: () => [new URLSearchParams(), () => {}] }
    }
    throw new Error(`Unexpected import: ${name}`)
  },
})

test('a stored project named Default Project does not hide unassigned tasks', () => {
  const customProject = { id: 42, name: 'Default Project' }
  const { projectsWithDefault } = exports.useProjectFilter([customProject])
  assert.deepEqual(Array.from(projectsWithDefault, project => project.id), [
    'default',
    42,
  ])
  assert.equal(projectsWithDefault[1], customProject)
})

test('default-project saved filters remain valid after a colliding project name', () => {
  const { projectsWithDefault } = exports.useProjectFilter([
    { id: 42, name: 'Default Project' },
  ])
  const context = { projects: projectsWithDefault }
  const saved = {
    conditions: [{ type: 'project', operator: 'is', value: ['default'] }],
  }
  const matching = validateFilter(saved, context).isValid
    ? applyFilter(
        [
          { id: 1, projectId: null },
          { id: 2, projectId: 42 },
        ],
        saved,
        context,
      )
    : []
  assert.deepEqual(matching.map(chore => chore.id), [1])
})

test('an existing default identity is retained without duplication', () => {
  const defaultProject = { id: 'default', name: 'Projet par défaut' }
  const projects = [defaultProject, { id: 42, name: 'Work' }]
  const { projectsWithDefault } = exports.useProjectFilter(projects)
  assert.equal(projectsWithDefault, projects)
  assert.equal(projectsWithDefault[0], defaultProject)
})

test('an empty list still exposes the default project', () => {
  const { projectsWithDefault } = exports.useProjectFilter([])
  assert.deepEqual(Array.from(projectsWithDefault, project => project.id), [
    'default',
  ])
})

test('ordinary projects retain their order and the input list is unchanged', () => {
  const projects = [
    { id: 42, name: 'Home' },
    { id: 99, name: 'Work' },
  ]
  const { projectsWithDefault } = exports.useProjectFilter(projects)
  assert.deepEqual(Array.from(projectsWithDefault, project => project.id), [
    'default',
    42,
    99,
  ])
  assert.deepEqual(projects.map(project => project.id), [42, 99])
  assert.equal(projectsWithDefault[1], projects[0])
  assert.equal(projectsWithDefault[2], projects[1])
})
