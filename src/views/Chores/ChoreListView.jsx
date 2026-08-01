import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import {
  Check,
  Delete,
  Edit,
  HourglassEmpty,
  Notifications,
  PlayArrow,
  Schedule,
  ThumbDown,
} from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { useLongPress } from '../../hooks/useLongPress'
import ChoreCard from './ChoreCard'
import CompactChoreCard from './CompactChoreCard'

/**
 * One swipeable row. Owns the press-and-hold gesture (multi-select), which
 * can't live in the render loop because it needs a hook.
 */
const ChoreSwipeableItem = ({
  trailingActions,
  onClick,
  onLongPress,
  longPressEnabled,
  children,
  // SwipeableList clones its children to inject list-level config
  // (listType, fullSwipe, thresholds…), so it has to be passed through.
  ...listProps
}) => {
  const { handlers: longPressHandlers, cancel: cancelLongPress } = useLongPress(
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

const ChoreListView = ({
  chores,
  viewMode,
  membersData,
  userLabels,
  handleLabelFiltering,
  handleChoreAction,
  isMultiSelectMode,
  selectedChores,
  toggleChoreSelection,
  userProfile,
  isOfficialInstance,
  toggleMultiSelectMode,
  onLongPressChore,
  showActions = true,
}) => {
  const navigate = useNavigate()
  const renderChoreCard = (chore, key) => {
    const CardComponent = viewMode === 'compact' ? CompactChoreCard : ChoreCard
    return (
      <CardComponent
        key={key || chore.id}
        chore={chore}
        performers={membersData?.res}
        userLabels={userLabels}
        onChipClick={handleLabelFiltering}
        onAction={handleChoreAction}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedChores.has(chore.id)}
        onSelectionToggle={() => toggleChoreSelection(chore.id)}
        showActions={showActions}
      />
    )
  }
  const canApproveReject = chore => {
    return userProfile?.role === 1 || chore.createdBy === userProfile?.id
  }

  const getTrailingActions = chore => {
    if (isMultiSelectMode) return null
    if (!showActions) return null

    const isCompact = viewMode === 'compact'

    return (
      <TrailingActions>
        <Box
          sx={{
            display: 'flex',
            // boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
            zIndex: 0,
            // Offset for the floating chips above ChoreCard so swipe actions
            // align with the card body only
            ...(!isCompact && {
              mt: '28px',
              borderRadius: '8px',
            }),
          }}
        >
          {chore.status === 3 ? (
            canApproveReject(chore) ? (
              <SwipeAction onClick={() => handleChoreAction('reject', chore)}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'danger.softBg',
                    color: 'danger.700',
                    px: 3,
                    height: '100%',
                  }}
                >
                  <ThumbDown sx={{ fontSize: 20 }} />
                  <Typography level='body-xs' sx={{ mt: 0.5 }}>
                    Reject
                  </Typography>
                </Box>
              </SwipeAction>
            ) : (
              <SwipeAction onClick={() => {}}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'neutral.softBg',
                    color: 'neutral.700',
                    px: 3,
                    height: '100%',
                    opacity: 0.5,
                  }}
                >
                  <HourglassEmpty sx={{ fontSize: 20 }} />
                  <Typography level='body-xs' sx={{ mt: 0.5 }}>
                    Pending
                  </Typography>
                </Box>
              </SwipeAction>
            )
          ) : (
            <SwipeAction
              onClick={() => {
                if (chore.status === 0 || chore.status === 2) {
                  handleChoreAction('start', chore)
                } else {
                  handleChoreAction('complete', chore)
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'success.softBg',
                  color: 'success.700',
                  px: 3,
                  height: '100%',
                }}
              >
                {chore.status !== 1 ? (
                  <PlayArrow sx={{ fontSize: 20 }} />
                ) : (
                  <Check sx={{ fontSize: 20 }} />
                )}
                <Typography level='body-xs' sx={{ mt: 0.5 }}>
                  {chore.status !== 1 ? 'Start' : 'Complete'}
                </Typography>
              </Box>
            </SwipeAction>
          )}

          <SwipeAction
            onClick={() => handleChoreAction('changeDueDate', chore)}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'warning.softBg',
                color: 'warning.700',
                px: 3,
                height: '100%',
              }}
            >
              <Schedule sx={{ fontSize: 20 }} />
              <Typography level='body-xs' sx={{ mt: 0.5 }}>
                Schedule
              </Typography>
            </Box>
          </SwipeAction>

          <SwipeAction onClick={() => navigate(`/chores/${chore.id}/edit`)}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'neutral.softBg',
                color: 'neutral.700',
                px: 3,
                height: '100%',
              }}
            >
              <Edit sx={{ fontSize: 20 }} />
              <Typography level='body-xs' sx={{ mt: 0.5 }}>
                Edit
              </Typography>
            </Box>
          </SwipeAction>

          {isOfficialInstance && (
            <SwipeAction onClick={() => handleChoreAction('nudge', chore)}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.softBg',
                  color: 'warning.700',
                  px: 3,
                  height: '100%',
                }}
              >
                <Notifications sx={{ fontSize: 20 }} />
                <Typography level='body-xs' sx={{ mt: 0.5 }}>
                  Nudge
                </Typography>
              </Box>
            </SwipeAction>
          )}

          <SwipeAction onClick={() => handleChoreAction('delete', chore)}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'danger.softBg',
                color: 'danger.700',
                px: 3,
                height: '100%',
              }}
            >
              <Delete sx={{ fontSize: 20 }} />
              <Typography level='body-xs' sx={{ mt: 0.5 }}>
                Delete
              </Typography>
            </Box>
          </SwipeAction>
        </Box>
      </TrailingActions>
    )
  }

  const renderChores = chores => {
    return (
      <SwipeableList type={ListType.IOS} fullSwipe={false}>
        {chores.map(chore => (
          <ChoreSwipeableItem
            key={chore.id}
            trailingActions={getTrailingActions(chore)}
            onClick={() => {
              if (isMultiSelectMode) {
                toggleChoreSelection(chore.id)
              } else {
                navigate(`/chores/${chore.id}`)
              }
            }}
            longPressEnabled={Boolean(onLongPressChore)}
            onLongPress={() => onLongPressChore?.(chore.id)}
          >
            {renderChoreCard(chore)}
          </ChoreSwipeableItem>
        ))}
      </SwipeableList>
    )
  }

  return <>{renderChores(chores)}</>
}

export default ChoreListView
