import { SwipeableListItem } from '@meauxt/react-swipeable-list'
import { Box } from '@mui/joy'
import PropTypes from 'prop-types'
import { useRef } from 'react'

import { useLongPress } from '../../../hooks/useLongPress'
import { hapticLight } from '../../../utils/Haptics'

// The point past which releasing commits the full-swipe action. Exported so
// the lists that own the gesture and the haptic that announces it can't drift
// apart — pass it as the SwipeableList `threshold`.
export const SWIPE_COMMIT_THRESHOLD = 0.8
const COMMIT_PROGRESS = SWIPE_COMMIT_THRESHOLD * 100

/**
 * One swipeable row. Owns the press-and-hold gesture (multi-select), which
 * can't live in the render loop because it needs a hook.
 */
const ChoreSwipeableItem = ({
  children,
  leadingActions,
  longPressEnabled,
  onClick,
  onLongPress,
  trailingActions,
  // SwipeableList clones its children to inject list-level config
  // (listType, fullSwipe, thresholds…), so it has to be passed through.
  ...listProps
}) => {
  const { cancel: cancelLongPress, handlers: longPressHandlers } = useLongPress(
    onLongPress,
    { enabled: longPressEnabled },
  )

  // Crossing the commit threshold is the one moment during the drag that
  // changes what releasing will do, so it's the moment that earns a tick.
  const committedRef = useRef(false)

  // The swipe list owns the gesture the moment it recognizes a drag — a hold
  // that turned into a swipe must not also open multi-select.
  const handleSwipeStart = () => {
    cancelLongPress()
    committedRef.current = false
  }

  const handleSwipeProgress = progress => {
    cancelLongPress()
    const committed = progress >= COMMIT_PROGRESS
    if (committed !== committedRef.current) {
      committedRef.current = committed
      if (committed) hapticLight()
    }
  }

  return (
    <SwipeableListItem
      {...listProps}
      leadingActions={leadingActions}
      trailingActions={trailingActions}
      onClick={onClick}
      onSwipeStart={handleSwipeStart}
      onSwipeProgress={handleSwipeProgress}
    >
      <Box
        {...longPressHandlers}
        sx={{
          width: '100%',
          // Keep a long press from selecting the task text / popping the
          // native callout on mobile
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {children}
      </Box>
    </SwipeableListItem>
  )
}

ChoreSwipeableItem.propTypes = {
  children: PropTypes.node,
  leadingActions: PropTypes.node,
  longPressEnabled: PropTypes.bool,
  onClick: PropTypes.func,
  onLongPress: PropTypes.func,
  trailingActions: PropTypes.node,
}

export default ChoreSwipeableItem
