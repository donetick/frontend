import { useCallback, useMemo, useState } from 'react'

import { usePersistedState } from './usePersistedState'

const EMPTY_FILTERS = {}

/**
 * Generic client-side filter hook.
 *
 * @param {Array} data - the full list to filter
 * @param {Array} filterDefs - array of filter definitions (see FilterBar)
 * @param {string} [storageKey] - when set, active filters persist in sessionStorage
 * @returns {{ filteredData, activeFilters, setFilter, clearAll, activeFilterCount, hasActiveFilters }}
 *
 * Each filterDef must include:
 *   id        - unique string key
 *   type      - 'multi-select' | 'boolean'
 *   filterFn  - (item, filterValue) => boolean
 */
export const useFilter = (data, filterDefs, storageKey) => {
  const [persisted, setPersisted] = usePersistedState(
    storageKey || '__unused_filter__',
    EMPTY_FILTERS,
  )
  const [local, setLocal] = useState(EMPTY_FILTERS)
  const activeFilters = storageKey ? persisted : local
  const setActiveFilters = storageKey ? setPersisted : setLocal

  // Stable identities: callers put these in effect dependency arrays, and a new
  // function every render makes those effects re-run on every render.
  const setFilter = useCallback(
    (filterId, value) => {
      setActiveFilters(prev => {
        const isEmpty =
          value === null ||
          value === undefined ||
          (Array.isArray(value) && value.length === 0)

        if (isEmpty) {
          const { [filterId]: _removed, ...rest } = prev
          return rest
        }
        return { ...prev, [filterId]: value }
      })
    },
    [setActiveFilters],
  )

  const clearAll = useCallback(
    () => setActiveFilters(EMPTY_FILTERS),
    [setActiveFilters],
  )

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!Object.keys(activeFilters).length) return data

    return data.filter(item =>
      filterDefs.every(def => {
        const value = activeFilters[def.id]
        if (value === undefined || value === null) return true
        if (Array.isArray(value) && value.length === 0) return true
        return def.filterFn(item, value)
      }),
    )
  }, [data, activeFilters, filterDefs])

  const activeFilterCount = Object.keys(activeFilters).length

  return {
    filteredData,
    activeFilters,
    setFilter,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  }
}
