const controlSelector =
  'button, input, textarea, select, a, [role="button"], [role="checkbox"], [role="menuitem"], [contenteditable="true"]'

// The sortable surface itself has role=button. Only nested controls should
// opt out of dragging, not the title or the card's own surface.
export const isNestedCardControl = event => {
  const control = event.target.closest(controlSelector)
  return Boolean(
    control &&
    control !== event.currentTarget &&
    event.currentTarget.contains(control),
  )
}

export const boardCardInteractions = ({
  isDragging,
  isMultiSelectMode,
  listeners,
  onOpen,
  onSelectionToggle,
}) => ({
  onMouseDown: event => {
    if (!isMultiSelectMode && !isNestedCardControl(event))
      listeners?.onMouseDown?.(event)
  },
  onTouchStart: event => {
    if (!isMultiSelectMode && !isNestedCardControl(event))
      listeners?.onTouchStart?.(event)
  },
  onClick: event => {
    if (isDragging || isNestedCardControl(event)) return
    if (isMultiSelectMode) onSelectionToggle?.()
    else onOpen()
  },
  onKeyDown: event => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || (isMultiSelectMode && event.key === ' ')) {
      event.preventDefault()
      if (isDragging) return
      if (isMultiSelectMode) onSelectionToggle?.()
      else onOpen()
      return
    }
    if (!isMultiSelectMode) listeners?.onKeyDown?.(event)
  },
  onContextMenu: event => {
    if (!isMultiSelectMode && !isNestedCardControl(event))
      event.preventDefault()
  },
})
