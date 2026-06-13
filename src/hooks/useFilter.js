import { useMemo, useState } from 'react'

/**
 * Generic client-side filter hook.
 *
 * @param {Array} data - the full list to filter
 * @param {Array} filterDefs - array of filter definitions (see FilterBar)
 * @returns {{ filteredData, activeFilters, setFilter, clearAll, activeFilterCount, hasActiveFilters }}
 *
 * Each filterDef must include:
 *   id        - unique string key
 *   type      - 'multi-select' | 'boolean'
 *   filterFn  - (item, filterValue) => boolean
 */
export const useFilter = (data, filterDefs) => {
  const [activeFilters, setActiveFilters] = useState({})

  const setFilter = (filterId, value) => {
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
  }

  const clearAll = () => setActiveFilters({})

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
