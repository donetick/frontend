import {
  Check,
  HourglassEmpty,
  Pause,
  PlayArrow,
  Repeat,
  ThumbUp,
  TimesOneMobiledata,
  Webhook,
} from '@mui/icons-material'
import { Box, Checkbox, Chip, IconButton, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import {
  getDueDateChipColor,
  getDueDateChipText,
  getRecurrentChipText,
} from '../../utils/ChoreCardHelpers.jsx'
import { notInCompletionWindow } from '../../utils/Chores.jsx'
import {
  getPriorityColor,
  getTextColorFromBackgroundColor,
} from '../../utils/Colors.jsx'
import ChoreActionMenu from '../components/ChoreActionMenu'

const CompactChoreCard = ({
  chore,
  performers,
  sx,
  viewOnly,
  showActions = true,
  onChipClick,
  onAction,
  // Multi-select props
  isMultiSelectMode = false,
  isSelected = false,
  onSelectionToggle,
  onlyClickable = false,
}) => {
  const navigate = useNavigate()

  const { data: userProfile } = useUserProfile()
  const { data: circleMembersData } = useCircleMembers()

  const { impersonatedUser } = useImpersonateUser()

  // Check if the current user can approve/reject (admin, manager, or task owner)
  const canApproveReject = () => {
    if (!circleMembersData?.res || !chore) return false

    const currentUser = circleMembersData.res.find(
      member => member.userId === (impersonatedUser?.userId || userProfile?.id),
    )

    // User can approve/reject if they are:
    // 1. Admin or manager of the circle
    // 2. Owner/creator of the task
    return (
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager' ||
      chore.createdBy === (impersonatedUser?.userId || userProfile?.id)
    )
  }

  // Utility functions

  const getFrequencyIcon = chore => {
    if (['once', 'no_repeat'].includes(chore.frequencyType)) {
      return <TimesOneMobiledata sx={{ fontSize: 14 }} />
    } else if (chore.frequencyType === 'trigger') {
      return <Webhook sx={{ fontSize: 14 }} />
    } else {
      return <Repeat sx={{ fontSize: 14 }} />
    }
  }

  const formatMetadata = () => {
    const parts = []

    // Frequency
    parts.push(getRecurrentChipText(chore))

    // Assignee (if not current user)
    if (chore.assignedTo && chore.assignedTo !== userProfile.id) {
      const assignee = performers.find(
        p => p.userId === chore.assignedTo,
      )?.displayName
      if (assignee) parts.push(assignee)
    }
    if (chore.assignedTo === null) {
      parts.push('Anyone')
    }

    // Points
    if (chore.points > 0) {
      parts.push(`${chore.points}pts`)
    }

    return parts.join(' • ')
  }

  return (
    <Box
      style={viewOnly ? { pointerEvents: 'none' } : {}}
      sx={{
        ...sx,
        display: 'flex',
        alignItems: 'center',
        minHeight: 56,
        minWidth: '100%',
        cursor: 'pointer',
        position: 'relative',
        pl: '16px',
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 'none',
        },
        '&:hover': {
          bgcolor: 'background.level1',
          boxShadow: 'sm',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: getPriorityColor(chore.priority),
          borderRadius: '16px',
        },
      }}
    >
      {/* Priority bar clickable area */}
      {chore.priority > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '12px',
            cursor: 'pointer',
            zIndex: 1,
          }}
          onClick={e => {
            e.stopPropagation()
            onChipClick({ priority: chore.priority })
          }}
        />
      )}

      {/* Animated transition container for Complete Button / Multi-select checkbox */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          mr: 1.5,
          flexShrink: 0,
        }}
      >
        {/* Complete Button */}
        {showActions && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition:
                'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
              opacity: isMultiSelectMode ? 0 : 1,
              transform: isMultiSelectMode
                ? 'scale(0.8) rotate(45deg)'
                : 'scale(1) rotate(0deg)',
              pointerEvents: isMultiSelectMode ? 'none' : 'auto',
            }}
          >
            {chore.status === 3 ? (
              // Pending approval: Show approve/reject for admins/managers/owners, grayed out for others
              canApproveReject() ? (
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <IconButton
                    variant='soft'
                    color='success'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation()
                      onAction('approve', chore)
                    }}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                    }}
                  >
                    <ThumbUp sx={{ fontSize: 12 }} />
                  </IconButton>
                  {/* <IconButton
                      variant='soft'
                      color='danger'
                      size='sm'
                      onClick={e => {
                        e.stopPropagation()
                        onAction('reject', chore)
                      }}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                        '&:active': {
                          transform: 'scale(0.95)',
                        },
                      }}
                    >
                      <ThumbDown sx={{ fontSize: 12 }} />
                    </IconButton> */}
                </Box>
              ) : (
                <IconButton
                  variant='soft'
                  color='neutral'
                  size='sm'
                  disabled={true}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    opacity: 0.5,
                  }}
                >
                  <HourglassEmpty sx={{ fontSize: 16 }} />
                </IconButton>
              )
            ) : (
              <IconButton
                variant='soft'
                color={chore.status === 0 ? 'success' : 'warning'}
                size='sm'
                onClick={e => {
                  e.stopPropagation()
                  if (chore.status === 0) {
                    onAction('complete', chore)
                  } else if (chore.status === 1) {
                    onAction('pause', chore)
                  } else {
                    onAction('start', chore)
                  }
                }}
                disabled={notInCompletionWindow(chore)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },

                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    transform: 'none',
                  },
                }}
              >
                {chore.status === 0 ? (
                  <Check sx={{ fontSize: 16 }} />
                ) : chore.status === 1 ? (
                  <Pause sx={{ fontSize: 16 }} />
                ) : (
                  <PlayArrow sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            )}
          </Box>
        )}
        {/* Multi-select Checkbox */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            opacity: isMultiSelectMode ? 1 : 0,
            transform: isMultiSelectMode
              ? 'scale(1) rotate(0deg)'
              : 'scale(0.8) rotate(-45deg)',
            pointerEvents: isMultiSelectMode ? 'auto' : 'none',
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={onSelectionToggle}
            sx={{
              bgcolor: 'background.surface',
              borderRadius: 'md',
              boxShadow: 'sm',
              border: '2px solid',
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'background.level1',
                borderColor: 'primary.300',
              },
              '&.Mui-checked': {
                bgcolor: 'primary.500',
                borderColor: 'primary.500',
                color: 'primary.solidColor',
                '&:hover': {
                  bgcolor: 'primary.600',
                  borderColor: 'primary.600',
                },
              },
            }}
            onClick={e => e.stopPropagation()}
          />
        </Box>
      </Box>

      {/* Content - Center */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          mr: 1.5,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Line 1: Name + Due Date */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.25,
          }}
        >
          {/* Chore Name */}
          <Typography
            level='title-sm'
            sx={{
              fontWeight: 600,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mr: 1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {chore.name}
          </Typography>

          {/* Due Date - Inline with name */}
          <Chip
            variant='soft'
            size='sm'
            color={getDueDateChipColor(chore.nextDueDate, chore)}
            sx={{
              fontSize: 10,
              height: 18,
              px: 0.75,
              flexShrink: 0,
              ml: 1,
            }}
          >
            {getDueDateChipText(chore.nextDueDate, chore)}
          </Chip>
        </Box>

        {/* Line 2: Metadata */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {getFrequencyIcon(chore)}
          <Typography
            level='body-xs'
            color='text.secondary'
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 11,
            }}
          >
            {formatMetadata()}
          </Typography>

          {/* Labels - Priority chip removed, now shown as vertical bar */}
          {chore.labelsV2?.map(l => (
            <div
              role='none'
              tabIndex={0}
              onClick={e => {
                e.stopPropagation()
                onChipClick({ label: l })
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onChipClick({ label: l })
                }
              }}
              style={{
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
              }}
              key={`compact-chorecard-${chore.id}-label-${l.id}`}
            >
              <Chip
                variant='solid'
                color='primary'
                size='sm'
                sx={{
                  ml: 0.5,
                  // height: 16,
                  // fontSize: 9,
                  // px: 0.5,
                  backgroundColor: `${l?.color} !important`,
                  color: getTextColorFromBackgroundColor(l?.color),
                }}
              >
                {l?.name}
              </Chip>
            </div>
          ))}
        </Box>
      </Box>

      {/* Right side - Action Menu with animation */}
      <Box
        sx={{
          transition:
            'opacity 0.3s ease-in-out, transform 0.3s ease-in-out, width 0.3s ease-in-out, margin 0.3s ease-in-out',
          opacity: isMultiSelectMode ? 0 : 1,
          transform: isMultiSelectMode
            ? 'translateX(20px) scale(0.8)'
            : 'translateX(0) scale(1)',
          width: isMultiSelectMode ? 0 : 32,
          marginRight: isMultiSelectMode ? 0 : undefined,
          overflow: 'hidden',
          pointerEvents: isMultiSelectMode ? 'none' : 'auto',
        }}
      >
        {showActions && (
          <ChoreActionMenu
            variant='plain'
            chore={chore}
            onAction={onAction}
            onCompleteWithNote={() => onAction('completeWithNote', chore)}
            onCompleteWithPastDate={() =>
              onAction('completeWithPastDate', chore)
            }
            onChangeAssignee={() => onAction('changeAssignee', chore)}
            onChangeDueDate={() => onAction('changeDueDate', chore)}
            onWriteNFC={() => onAction('writeNFC', chore)}
            onNudge={() => onAction('nudge', chore)}
            onDelete={() => onAction('delete', chore)}
            sx={{
              width: 32,
              height: 32,
              color: 'text.tertiary',
              flexShrink: 0,
              '&:hover': {
                color: 'text.secondary',
                bgcolor: 'background.level1',
              },
            }}
          />
        )}
      </Box>
    </Box>
  )
}

export default CompactChoreCard
