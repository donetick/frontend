import Fuse from 'fuse.js'
import { useCallback, useMemo, useState } from 'react'
import { ChoreFilters, filterByProject } from '../../../utils/Chores'

export const useChoreFilters = ({
  chores,
  selectedProject,
  impersonatedUser,
  userProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilter, setSearchFilter] = useState('All')
  const [selectedChoreFilter, setSelectedChoreFilter] = useState(
    localStorage.getItem('selectedChoreFilter') || 'anyone',
  )

  const projectFilteredChores = useMemo(() => {
    if (!selectedProject || selectedProject.id === 'default') {
      return chores.filter(chore => !chore.projectId)
    }

    return filterByProject(chores, selectedProject.id)
  }, [chores, selectedProject])

  const hasSearchTerm = searchTerm.length > 0

  const searchIndex = useMemo(() => {
    if (!hasSearchTerm) return null

    const searchableChores = chores.map(chore => ({
      ...chore,
      raw_label: chore.labelsV2?.map(label => label.name).join(' '),
    }))
    return new Fuse(searchableChores, {
      keys: ['name', 'raw_label'],
      includeScore: true,
      isCaseSensitive: false,
      findAllMatches: true,
    })
  }, [chores, hasSearchTerm])

  const projectChoreIds = useMemo(
    () => new Set(projectFilteredChores.map(chore => chore.id)),
    [projectFilteredChores],
  )

  const searchFilteredChores = useMemo(() => {
    let baseChores = projectFilteredChores

    if (searchIndex) {
      return searchIndex
        .search(searchTerm.toLowerCase())
        .map(result => result.item)
        .filter(chore => projectChoreIds.has(chore.id))
    }

    if (impersonatedUser) {
      baseChores = baseChores.filter(
        chore => chore.assignedTo === impersonatedUser.userId,
      )
    }

    return baseChores.filter(
      ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
        selectedChoreFilter
      ],
    )
  }, [
    searchTerm,
    projectFilteredChores,
    searchIndex,
    projectChoreIds,
    impersonatedUser,
    userProfile?.id,
    selectedChoreFilter,
  ])

  // Non-project-filtered chores for custom filters that may have their own project conditions
  const nonProjectFilteredChores = useMemo(() => {
    let baseChores = chores

    if (searchIndex) {
      return searchIndex
        .search(searchTerm.toLowerCase())
        .map(result => result.item)
    }

    if (impersonatedUser) {
      baseChores = baseChores.filter(
        chore => chore.assignedTo === impersonatedUser.userId,
      )
    }

    return baseChores.filter(
      ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
        selectedChoreFilter
      ],
    )
  }, [
    searchTerm,
    chores,
    searchIndex,
    impersonatedUser,
    userProfile?.id,
    selectedChoreFilter,
  ])

  const setSelectedChoreFilterWithCache = useCallback(value => {
    setSelectedChoreFilter(value)
    localStorage.setItem('selectedChoreFilter', value)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchFilter('All')
    setSearchTerm('')
  }, [])

  return {
    searchTerm,
    searchFilter,
    selectedChoreFilter,
    projectFilteredChores,
    searchFilteredChores,
    nonProjectFilteredChores,
    setSearchTerm,
    setSearchFilter,
    setSelectedChoreFilter,
    setSelectedChoreFilterWithCache,
    clearFilters,
  }
}
