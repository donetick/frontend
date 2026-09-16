import { SwipeableListItem } from '@meauxt/react-swipeable-list'
import { Box } from '@mui/joy'
import PropTypes from 'prop-types'

import { useLongPress } from '../../../hooks/useLongPress'

/**
 * One swipeable row. Owns the press-and-hold gesture (multi-select), which
 * can't live in the render loop because it needs a hook.
 */
const ChoreSwipeableItem = ({
  children,
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

  // The swipe list owns the gesture the moment it recognizes a drag — a hold
  // that turned into a swipe must not also open multi-select.
  const handleSwipeStart = () => {
    cancelLongPress()
  }

  return (
    <SwipeableListItem
      {...listProps}
      trailingActions={trailingActions}
      onClick={onClick}
      onSwipeStart={handleSwipeStart}
      onSwipeProgress={cancelLongPress}
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
  longPressEnabled: PropTypes.bool,
  onClick: PropTypes.func,
  onLongPress: PropTypes.func,
  trailingActions: PropTypes.node,
}

export default ChoreSwipeableItem
