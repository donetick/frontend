import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePageShortcutScope } from '../../../contexts/KeyboardShortcutScopeContext'

export const useKeyboardShortcuts = ({
  choreSections,
  filteredChores,
  handlers,
  isMultiSelectMode,
  openChoreSections,
  searchFilter,
  searchTerm,
  selectedChores,
}) => {
  const { t } = useTranslation('chores')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  // Any open modal (add-task, etc.) claims the keyboard for itself — see
  // KeyboardShortcutScopeContext. These are the page's own shortcuts, so
  // they go silent whenever something else owns it.
  const isPageShortcutActive = usePageShortcutScope()

  useEffect(() => {
    const handleKeyDown = event => {
      if (!isPageShortcutActive) return
      // Ignore auto-repeat from a held key so e.g. Cmd+S can't toggle
      // multi-select twice from one physical press.
      if (event.repeat) return

      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }

      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey

      // Cmd/Ctrl + J and K are handled globally by GlobalQuickAdd and
      // GlobalSearchContext, respectively.
      if (isHoldingCmdOrCtrl && event.key === 'x') {
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
                title: t('shortcuts.allSelectedTitle'),
                message: t('common:ui.remaining.filteredAlready', {
                  count: visibleChores.length,
                }),
              })
            } else {
              handlers.onSelectAll()
              handlers.onShowMessage({
                title: t('shortcuts.someSelectedTitle'),
                message: t('common:ui.remaining.filteredSelected', {
                  count: visibleChores.length,
                }),
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
                title: t('shortcuts.allSelectedTitle'),
                message: t('common:ui.remaining.allAlready', {
                  count: allChores.length,
                }),
              })
            } else if (allExpandedSelected) {
              handlers.onSelectAll()
              const collapsedCount = allChores.length - expandedChores.length
              handlers.onShowMessage({
                title: t('shortcuts.allSelectedAltTitle'),
                message: t('common:ui.remaining.allSelected', {
                  count: allChores.length,
                  collapsedCount,
                }),
              })
            } else {
              handlers.onSelectAll()
              handlers.onShowMessage({
                title: t('shortcuts.someSelectedTitle'),
                message: t('common:ui.remaining.expandedSelected', {
                  count: expandedChores.length,
                }),
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
  }, [isMultiSelectMode, selectedChores.size, isPageShortcutActive, t])

  return { showKeyboardShortcuts }
}
