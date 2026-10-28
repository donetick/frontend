// Inspect the rendered action declarations, before the swipe library clones
// them. A mixed tray remains revealable, but only explicit taps may execute.
export const hasDisabledSwipeActions = (...nodes) =>
  nodes.some(node => {
    if (Array.isArray(node)) return hasDisabledSwipeActions(...node)
    if (!node || typeof node !== 'object') return false
    return (
      node.props?.disabled === true ||
      hasDisabledSwipeActions(node.props?.children)
    )
  })

export const canCommitSwipe = ({
  fullSwipe,
  leadingActions,
  trailingActions,
}) =>
  Boolean(fullSwipe) &&
  !hasDisabledSwipeActions(leadingActions, trailingActions)
