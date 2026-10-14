import { SwipeableListItem } from '@meauxt/react-swipeable-list'
import PropTypes from 'prop-types'
import { useRef } from 'react'

import { hapticLight } from '../../utils/Haptics'

// The point past which releasing commits the full-swipe action. Exported so
// the lists that own the gesture and the haptic that announces it can't drift
// apart — pass it as the SwipeableList `threshold`.
export const SWIPE_COMMIT_THRESHOLD = 0.8
const COMMIT_PROGRESS = SWIPE_COMMIT_THRESHOLD * 100

/**
 * A SwipeableListItem that ticks once the drag crosses the commit threshold —
 * the moment releasing would trigger the full-swipe action. Shared by every
 * list that renders a swipeable row (chores has its own variant that also
 * owns the long-press gesture) so the feel of "this swipe will commit" stays
 * identical everywhere.
 */
const SwipeListItem = ({ children, ...listItemProps }) => {
  const committedRef = useRef(false)

  const handleSwipeStart = () => {
    committedRef.current = false
  }

  const handleSwipeProgress = progress => {
    const committed = progress >= COMMIT_PROGRESS
    if (committed !== committedRef.current) {
      committedRef.current = committed
      if (committed) hapticLight()
    }
  }

  return (
    <SwipeableListItem
      {...listItemProps}
      onSwipeStart={handleSwipeStart}
      onSwipeProgress={handleSwipeProgress}
    >
      {children}
    </SwipeableListItem>
  )
}

SwipeListItem.propTypes = {
  children: PropTypes.node,
}

export default SwipeListItem
