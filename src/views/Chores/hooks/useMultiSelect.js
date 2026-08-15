import { useCallback, useRef, useState } from 'react'

// A field is "shared" only when every selected chore agrees on it. Anything
// else is mixed, which the bulk editor shows as an unset control rather than
// pretending one of the values is the current one.
const sharedValue = (items, pick) => {
  if (items.length === 0) return { value: null, isMixed: false }
  const first = pick(items[0])
  const isMixed = items.some(item => pick(item) !== first)
  return { value: isMixed ? null : first, isMixed }
}

const labelIdsOf = chore => (chore.labelsV2 || []).map(label => label.id)

export const useMultiSelect = () => {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedChores, setSelectedChores] = useState(new Set())
  // Anchor for shift-click range selection. A ref because it only matters at
  // the moment of the next click and should never trigger a render.
  const lastSelectedId = useRef(null)

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => {
      if (!prev) setSelectedChores(new Set())
      return !prev
    })
    lastSelectedId.current = null
  }, [])

  const toggleChoreSelection = useCallback(choreId => {
    setSelectedChores(prev => {
      const next = new Set(prev)
      if (next.has(choreId)) {
        next.delete(choreId)
      } else {
        next.add(choreId)
      }
      return next
    })
    lastSelectedId.current = choreId
  }, [])

  // Entry point for press-and-hold on a task card: turn multi-select on (if it
  // isn't already) with that task selected.
  const enterMultiSelectWithChore = useCallback(
    choreId => {
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true)
        setSelectedChores(new Set([choreId]))
        lastSelectedId.current = choreId
        return
      }
      toggleChoreSelection(choreId)
    },
    [isMultiSelectMode, toggleChoreSelection],
  )

  // Shift-click: add everything between the previous click and this one, in the
  // order the user actually sees them. Falls back to a plain toggle when there
  // is no anchor yet or the anchor has scrolled out of the current list.
  const selectChoreRange = useCallback(
    (choreId, orderedChores = []) => {
      const anchorId = lastSelectedId.current
      if (anchorId === null || anchorId === choreId) {
        toggleChoreSelection(choreId)
        return
      }

      const anchorIndex = orderedChores.findIndex(c => c.id === anchorId)
      const targetIndex = orderedChores.findIndex(c => c.id === choreId)
      if (anchorIndex === -1 || targetIndex === -1) {
        toggleChoreSelection(choreId)
        return
      }

      const [from, to] =
        anchorIndex < targetIndex
          ? [anchorIndex, targetIndex]
          : [targetIndex, anchorIndex]

      setSelectedChores(prev => {
        const next = new Set(prev)
        for (let i = from; i <= to; i++) next.add(orderedChores[i].id)
        return next
      })
      lastSelectedId.current = choreId
    },
    [toggleChoreSelection],
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
        setSelectedChores(new Set(choresToSelect.map(chore => chore.id)))
      }

      return choresToSelect.length
    },
    [selectedChores],
  )

  const clearSelection = useCallback(() => {
    lastSelectedId.current = null
    if (selectedChores.size === 0) {
      setIsMultiSelectMode(false)
      return
    }
    setSelectedChores(new Set())
  }, [selectedChores.size])

  const getSelectedChoresData = useCallback(
    allChores => {
      if (selectedChores.size === 0) return []
      const byId = new Map(allChores.map(chore => [chore.id, chore]))
      return Array.from(selectedChores)
        .map(id => byId.get(id))
        .filter(Boolean)
    },
    [selectedChores],
  )

  // What the bulk editor needs to render its controls: the current value where
  // the selection agrees, and which labels are on all / only some of them so
  // "add" and "remove" can be offered accurately.
  const getSelectionSummary = useCallback(
    allChores => {
      const selected = getSelectedChoresData(allChores)

      const labelCounts = new Map()
      const labelsById = new Map()
      selected.forEach(chore => {
        ;(chore.labelsV2 || []).forEach(label => {
          labelsById.set(label.id, label)
          labelCounts.set(label.id, (labelCounts.get(label.id) || 0) + 1)
        })
      })

      const commonLabelIds = []
      const partialLabelIds = []
      labelCounts.forEach((count, id) => {
        if (count === selected.length) commonLabelIds.push(id)
        else partialLabelIds.push(id)
      })

      return {
        count: selected.length,
        assignee: sharedValue(selected, c => c.assignedTo),
        priority: sharedValue(selected, c => c.priority),
        dueDate: sharedValue(selected, c => c.nextDueDate),
        project: sharedValue(selected, c => c.projectId ?? null),
        labels: {
          byId: labelsById,
          common: commonLabelIds,
          partial: partialLabelIds,
          // Anything present on at least one chore can be removed.
          removable: [...commonLabelIds, ...partialLabelIds],
        },
        // Candidate assignees common to the whole selection. An empty (or
        // absent) `assignees` list on a chore means "anyone", so those chores
        // place no restriction. null here means no restriction at all, and the
        // caller should offer every circle member.
        assignableUserIds: selected.reduce((acc, chore) => {
          const ids = (chore.assignees || []).map(a => a.userId)
          if (ids.length === 0) return acc
          if (acc === null) return ids
          return acc.filter(id => ids.includes(id))
        }, null),
        hasArchived: selected.some(chore => chore.isActive === false),
        labelIdsOf,
      }
    },
    [getSelectedChoresData],
  )

  return {
    isMultiSelectMode,
    selectedChores,
    toggleMultiSelectMode,
    toggleChoreSelection,
    selectChoreRange,
    enterMultiSelectWithChore,
    selectAllVisibleChores,
    clearSelection,
    getSelectedChoresData,
    getSelectionSummary,
    setIsMultiSelectMode,
    setSelectedChores,
  }
}
