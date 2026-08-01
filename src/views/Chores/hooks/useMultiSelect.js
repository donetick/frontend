import { useState, useCallback } from 'react'

export const useMultiSelect = () => {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedChores, setSelectedChores] = useState(new Set())

  const toggleMultiSelectMode = useCallback(() => {
    const newMode = !isMultiSelectMode
    setIsMultiSelectMode(newMode)

    if (newMode) {
      setSelectedChores(new Set())
    }
  }, [isMultiSelectMode])

  const toggleChoreSelection = useCallback(
    choreId => {
      const newSelection = new Set(selectedChores)
      if (newSelection.has(choreId)) {
        newSelection.delete(choreId)
      } else {
        newSelection.add(choreId)
      }
      setSelectedChores(newSelection)
    },
    [selectedChores],
  )

  // Entry point for press-and-hold on a task card: turn multi-select on (if it
  // isn't already) with that task selected.
  const enterMultiSelectWithChore = useCallback(
    choreId => {
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true)
        setSelectedChores(new Set([choreId]))
        return
      }
      toggleChoreSelection(choreId)
    },
    [isMultiSelectMode, toggleChoreSelection],
  )

  const selectAllVisibleChores = useCallback(
    (visibleChores, choreSections = [], openChoreSections = {}) => {
      let choresToSelect = []

      if (visibleChores && visibleChores.length > 0) {
        choresToSelect = visibleChores
      } else {
        const expandedChores = choreSections
          .filter((_section, index) => openChoreSections[index])
          .flatMap(section => section.content || [])

        const allExpandedSelected =
          expandedChores.length > 0 &&
          expandedChores.every(chore => selectedChores.has(chore.id))

        if (allExpandedSelected) {
          choresToSelect = choreSections.flatMap(
            section => section.content || [],
          )
        } else {
          choresToSelect = expandedChores
        }
      }

      if (choresToSelect.length > 0) {
        const allIds = new Set(choresToSelect.map(chore => chore.id))
        setSelectedChores(allIds)
      }

      return choresToSelect.length
    },
    [selectedChores],
  )

  const clearSelection = useCallback(() => {
    if (selectedChores.size === 0) {
      setIsMultiSelectMode(false)
      return
    }
    setSelectedChores(new Set())
  }, [selectedChores.size])

  const getSelectedChoresData = useCallback(
    allChores => {
      return Array.from(selectedChores)
        .map(id => allChores.find(chore => chore.id === id))
        .filter(Boolean)
    },
    [selectedChores],
  )

  return {
    isMultiSelectMode,
    selectedChores,
    toggleMultiSelectMode,
    toggleChoreSelection,
    enterMultiSelectWithChore,
    selectAllVisibleChores,
    clearSelection,
    getSelectedChoresData,
    setIsMultiSelectMode,
    setSelectedChores,
  }
}
