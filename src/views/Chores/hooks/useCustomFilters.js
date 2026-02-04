import { useCallback, useMemo, useState } from 'react'
import { useUserProfile } from '../../../queries/UserQueries'
import {
  applyFilter,
  getFilterCount,
  getFilterOverdueCount,
  validateFilter,
} from '../../../utils/FilterEngine'
import {
  useCreateFilter,
  useDeleteFilter,
  useFilters,
  useToggleFilterPin,
  useUpdateFilter,
} from '../../Filters/FilterQueries'

export const useCustomFilters = (chores, membersData, labels, projects) => {
  const { data: userProfile } = useUserProfile()

  // React Query hooks
  const { data: filtersData = [] } = useFilters()
  const createFilterMutation = useCreateFilter()
  const updateFilterMutation = useUpdateFilter()
  const deleteFilterMutation = useDeleteFilter()
  const togglePinMutation = useToggleFilterPin()

  const [activeFilterId, setActiveFilterId] = useState(null)
  const [tempFilter, setTempFilter] = useState(null)

  const context = useMemo(
    () => ({
      userId: userProfile?.id,
      members: membersData || [],
      labels: labels || [],
      projects: projects || [],
    }),
    [userProfile?.id, membersData, labels, projects],
  )

  const filtersWithCounts = useMemo(() => {
    if (!chores || !Array.isArray(chores)) return []

    return filtersData.map(filter => {
      const validation = validateFilter(filter, context)
      const count = validation.isValid
        ? getFilterCount(chores, filter, context)
        : 0
      const overdueCount = validation.isValid
        ? getFilterOverdueCount(chores, filter, context)
        : 0

      const result = {
        ...filter,
        count,
        overdueCount,
        isValid: validation.isValid,
        validationIssues: validation.issues,
      }

      return result
    })
  }, [filtersData, chores, context])

  const activeFilter = useMemo(() => {
    if (!activeFilterId) return null
    return filtersWithCounts.find(f => f.id === activeFilterId)
  }, [activeFilterId, filtersWithCounts])

  // Check if active filter has project conditions
  const hasProjectConditions = useMemo(() => {
    if (!activeFilter || !activeFilter.conditions) return false
    return activeFilter.conditions.some(c => c.type === 'project')
  }, [activeFilter])

  // check if has any filter applied:
  const hasFilterApplied = useMemo(() => {
    return activeFilterId !== null || tempFilter !== null
  }, [activeFilterId, tempFilter])

  const filteredChores = useMemo(() => {
    // Temporary filter takes precedence over saved filters
    if (tempFilter) {
      return applyFilter(chores, tempFilter, context)
    }
    if (!activeFilter || !activeFilter.isValid) {
      return chores
    }
    return applyFilter(chores, activeFilter, context)
  }, [chores, activeFilter, tempFilter, context])

  const applyCustomFilter = useCallback(filterId => {
    setActiveFilterId(filterId)
  }, [])

  const clearActiveFilter = useCallback(() => {
    setActiveFilterId(null)
    setTempFilter(null)
  }, [])

  const applyTempFilter = useCallback(filter => {
    setTempFilter(filter)
    setActiveFilterId(null)
  }, [])

  const clearTempFilter = useCallback(() => {
    setTempFilter(null)
  }, [])

  const saveFilter = useCallback(
    filter => {
      return new Promise((resolve, reject) => {
        createFilterMutation.mutate(filter, {
          onSuccess: savedFilter => {
            resolve(savedFilter)
          },
          onError: error => {
            reject(error)
          },
        })
      })
    },
    [createFilterMutation],
  )

  const updateFilter = useCallback(
    (filterId, updates) => {
      return new Promise((resolve, reject) => {
        updateFilterMutation.mutate(
          { filterId, filterData: updates },
          {
            onSuccess: updated => {
              resolve(updated)
            },
            onError: error => {
              reject(error)
            },
          },
        )
      })
    },
    [updateFilterMutation],
  )

  const deleteFilter = useCallback(
    filterId => {
      if (activeFilterId === filterId) {
        setActiveFilterId(null)
      }
      deleteFilterMutation.mutate(filterId)
    },
    [activeFilterId, deleteFilterMutation],
  )

  const pinFilter = useCallback(
    filterId => {
      togglePinMutation.mutate(filterId)
    },
    [togglePinMutation],
  )

  const createFilterFromCurrentState = useCallback(
    currentState => {
      const conditions = []

      if (currentState.selectedProject) {
        conditions.push({
          type: 'project',
          operator: 'is',
          value: currentState.selectedProject.id,
        })
      }

      if (
        currentState.selectedChoreFilter &&
        currentState.selectedChoreFilter !== 'anyone'
      ) {
        const filterMap = {
          assigned_to_me: { type: 'assignee', operator: 'is', value: 'me' },
          assigned_to_others: {
            type: 'assignee',
            operator: 'is',
            value: 'others',
          },
          created_by_me: { type: 'createdBy', operator: 'is', value: 'me' },
        }

        const condition = filterMap[currentState.selectedChoreFilter]
        if (condition) {
          conditions.push(condition)
        }
      }

      if (currentState.searchFilter && currentState.searchFilter !== 'All') {
        if (currentState.searchFilter.startsWith('Priority: ')) {
          const priority = parseInt(
            currentState.searchFilter.replace('Priority: ', ''),
          )
          conditions.push({
            type: 'priority',
            operator: 'is',
            value: priority,
          })
        } else if (currentState.searchFilter.startsWith('Label: ')) {
          const labelName = currentState.searchFilter.replace('Label: ', '')
          const label = labels?.find(l => l.name === labelName)
          if (label) {
            conditions.push({
              type: 'label',
              operator: 'has',
              value: label.id,
            })
          }
        } else if (currentState.searchFilter === 'Overdue') {
          conditions.push({
            type: 'dueDate',
            operator: 'isOverdue',
            value: null,
          })
        } else if (currentState.searchFilter === 'Due today') {
          conditions.push({
            type: 'dueDate',
            operator: 'isDueToday',
            value: null,
          })
        } else if (currentState.searchFilter === 'Due in week') {
          conditions.push({
            type: 'dueDate',
            operator: 'isDueThisWeek',
            value: null,
          })
        } else if (currentState.searchFilter === 'No Due Date') {
          conditions.push({
            type: 'dueDate',
            operator: 'hasNoDueDate',
            value: null,
          })
        } else if (currentState.searchFilter === 'Pending Approval') {
          conditions.push({
            type: 'status',
            operator: 'is',
            value: 3,
          })
        }
      }

      return {
        conditions,
        operator: 'AND',
      }
    },
    [labels],
  )

  return {
    savedFilters: filtersWithCounts,
    activeFilter,
    activeFilterId,
    tempFilter,
    filteredChores,
    applyCustomFilter,
    clearActiveFilter,
    applyTempFilter,
    clearTempFilter,
    saveFilter,
    updateFilter,
    deleteFilter,
    pinFilter,
    createFilterFromCurrentState,
    hasProjectConditions,
    hasFilterApplied,
  }
}
