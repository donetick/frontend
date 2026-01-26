import { useState, useEffect } from 'react'

export const useKeyboardShortcuts = ({
  isMultiSelectMode,
  selectedChores,
  addTaskModalOpen,
  searchTerm,
  searchFilter,
  filteredChores,
  choreSections,
  openChoreSections,
  handlers,
}) => {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  useEffect(() => {
    const handleKeyDown = event => {
      if (addTaskModalOpen) return

      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }

      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey

      if (isHoldingCmdOrCtrl && event.key === 'k') {
        event.preventDefault()
        handlers.onOpenTaskModal()
        return
      }

      if (addTaskModalOpen) return

      if (isHoldingCmdOrCtrl && event.key === 'j') {
        event.preventDefault()
        handlers.onNavigateToCreate()
        return
      } else if (isHoldingCmdOrCtrl && event.key === 'f') {
        event.preventDefault()
        handlers.onFocusSearch()
        return
      } else if (isHoldingCmdOrCtrl && event.key === 'x') {
        event.preventDefault()
        if (searchTerm?.length > 0) {
          handlers.onCloseSearch()
        }
      } else if (isHoldingCmdOrCtrl && event.key === 's') {
        event.preventDefault()
        handlers.onToggleMultiSelect()
        return
      } else if (
        isHoldingCmdOrCtrl &&
        !event.shiftKey &&
        event.key === 'a' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        event.preventDefault()
        if (!isMultiSelectMode) {
          handlers.onEnableMultiSelectAndSelectAll()
        } else {
          let visibleChores = []

          if (searchTerm?.length > 0 || searchFilter !== 'All') {
            visibleChores = filteredChores
            const allVisibleSelected =
              visibleChores.length > 0 &&
              visibleChores.every(chore => selectedChores.has(chore.id))

            if (allVisibleSelected) {
              handlers.onShowMessage({
                title: '✅ All Tasks Selected',
                message: `All ${visibleChores.length} filtered task${visibleChores.length !== 1 ? 's are' : ' is'} already selected.`,
              })
            } else {
              handlers.onSelectAll()
              handlers.onShowMessage({
                title: '🎯 Tasks Selected',
                message: `Selected ${visibleChores.length} filtered task${visibleChores.length !== 1 ? 's' : ''}.`,
              })
            }
          } else {
            const expandedChores = choreSections
              .filter((_section, index) => openChoreSections[index])
              .flatMap(section => section.content || [])

            const allExpandedSelected =
              expandedChores.length > 0 &&
              expandedChores.every(chore => selectedChores.has(chore.id))

            const allChores = choreSections.flatMap(
              section => section.content || [],
            )
            const allChoresSelected =
              allChores.length > 0 &&
              allChores.every(chore => selectedChores.has(chore.id))

            if (allChoresSelected) {
              handlers.onShowMessage({
                title: '✅ All Tasks Selected',
                message: `All ${allChores.length} task${allChores.length !== 1 ? 's are' : ' is'} already selected (including collapsed sections).`,
              })
            } else if (allExpandedSelected) {
              handlers.onSelectAll()
              const collapsedCount = allChores.length - expandedChores.length
              handlers.onShowMessage({
                title: '🎯 All Tasks Selected',
                message: `Selected all ${allChores.length} tasks (including ${collapsedCount} from collapsed sections).`,
              })
            } else {
              handlers.onSelectAll()
              handlers.onShowMessage({
                title: '🎯 Tasks Selected',
                message: `Selected ${expandedChores.length} task${expandedChores.length !== 1 ? 's' : ''} from expanded sections.`,
              })
            }
          }
        }
      }

      if (isMultiSelectMode) {
        if (event.key === 'Escape') {
          event.preventDefault()
          handlers.onClearSelection()
          return
        }

        if (
          isHoldingCmdOrCtrl &&
          event.key === 'Enter' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handlers.onBulkComplete()
          return
        }

        if (
          isHoldingCmdOrCtrl &&
          event.key === '/' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handlers.onBulkSkip()
          return
        }

        if (
          isHoldingCmdOrCtrl &&
          (event.key === 'x' || event.key === 'X') &&
          selectedChores.size > 0 &&
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
        ) {
          event.preventDefault()
          handlers.onBulkArchive()
          return
        }
      }

      if (
        isHoldingCmdOrCtrl &&
        (event.key === 'e' || event.key === 'E') &&
        selectedChores.size > 0 &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        event.preventDefault()
        if (isMultiSelectMode && selectedChores.size > 0) {
          handlers.onBulkDelete()
        }
        return
      }

      if (isHoldingCmdOrCtrl && event.key === 'o') {
        event.preventDefault()
        handlers.onNavigateToArchived()
        return
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isMultiSelectMode, selectedChores.size, addTaskModalOpen])

  return { showKeyboardShortcuts }
}
