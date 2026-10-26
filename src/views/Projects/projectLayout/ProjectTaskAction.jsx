import {
  Check,
  HourglassEmpty,
  Pause,
  PlayArrow,
  ThumbUp,
} from '@mui/icons-material'
import { Checkbox, IconButton } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { useImpersonateUser } from '../../../contexts/ImpersonateUserContext'
import { useCircleMembers, useUserProfile } from '../../../queries/UserQueries'
import { notInCompletionWindow } from '../../../utils/Chores'

// Keep action permissions and state transitions separate from card layout.
export default function ProjectTaskAction({
  chore,
  isMultiSelectMode,
  isSelected,
  onAction,
  onSelectionToggle,
}) {
  const { t } = useTranslation('chores')
  const { data: userProfile } = useUserProfile()
  const { data: members } = useCircleMembers()
  const { impersonatedUser } = useImpersonateUser()
  const userId = impersonatedUser?.userId || userProfile?.id
  const member = members?.res?.find(item => item.userId === userId)
  const canApprove =
    member?.role === 'admin' ||
    member?.role === 'manager' ||
    (userId !== null && userId !== undefined && chore.createdBy === userId)
  const pending = chore.status === 3
  const action = pending
    ? 'approve'
    : chore.status === 0
      ? 'complete'
      : chore.status === 1
        ? 'pause'
        : 'start'
  const label = pending
    ? t(canApprove ? 'choreView.approve' : 'choreView.pendingApproval')
    : action === 'complete'
      ? t('completeChore')
      : t(action === 'pause' ? 'choreView.pauseTimer' : 'choreView.start')

  if (isMultiSelectMode) {
    return (
      <Checkbox
        checked={isSelected}
        onChange={() => onSelectionToggle?.()}
        size='sm'
        slotProps={{ input: { 'aria-label': chore.name } }}
        sx={{
          m: '12px',
          position: 'relative',
          '& .MuiCheckbox-action': { inset: '-12px' },
        }}
      />
    )
  }

  return (
    <IconButton
      aria-label={`${label}: ${chore.name}`}
      title={label}
      variant='plain'
      size='sm'
      color={pending ? 'primary' : action === 'pause' ? 'warning' : 'neutral'}
      disabled={pending ? !canApprove : Boolean(notInCompletionWindow(chore))}
      onClick={event => {
        event.stopPropagation()
        onAction?.(action, chore)
      }}
      sx={{ minWidth: 44, minHeight: 44, borderRadius: 'md' }}
    >
      {pending ? (
        canApprove ? (
          <ThumbUp sx={{ fontSize: 18 }} />
        ) : (
          <HourglassEmpty sx={{ fontSize: 18 }} />
        )
      ) : action === 'complete' ? (
        <Check
          sx={{
            fontSize: 18,
            border: '1.5px solid',
            borderColor: 'neutral.outlinedBorder',
            borderRadius: '50%',
            p: '2px',
          }}
        />
      ) : action === 'pause' ? (
        <Pause sx={{ fontSize: 18 }} />
      ) : (
        <PlayArrow sx={{ fontSize: 18 }} />
      )}
    </IconButton>
  )
}
