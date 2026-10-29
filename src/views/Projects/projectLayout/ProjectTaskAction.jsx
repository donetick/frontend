import { Check, Pause, PlayArrow, ThumbUp } from '@mui/icons-material'
import { Checkbox, IconButton } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { useChorePermissions } from '../../../hooks/useChorePermissions'
import { notInCompletionWindow } from '../../../utils/Chores'
import ChoreStatusChip from '../../components/ChoreStatusChip'

// Keep action permissions and state transitions separate from card layout.
export default function ProjectTaskAction({
  chore,
  isMultiSelectMode,
  isSelected,
  onAction,
  onSelectionToggle,
}) {
  const { t } = useTranslation('chores')
  const permissions = useChorePermissions(chore)
  const pending = chore.status === 3
  const action = pending
    ? 'approve'
    : chore.status === 0
      ? 'complete'
      : chore.status === 1
        ? 'pause'
        : 'start'
  const label = pending
    ? t('choreView.approve')
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

  if (pending && !permissions.approve) return <ChoreStatusChip chore={chore} />

  return (
    <IconButton
      aria-label={`${label}: ${chore.name}`}
      title={label}
      variant='plain'
      size='sm'
      color={pending ? 'primary' : action === 'pause' ? 'warning' : 'neutral'}
      disabled={
        chore.isActive === false ||
        (pending
          ? !permissions.approve
          : !permissions.complete || Boolean(notInCompletionWindow(chore)))
      }
      onClick={event => {
        event.stopPropagation()
        onAction?.(action, chore)
      }}
      sx={{ minWidth: 44, minHeight: 44, borderRadius: 'md' }}
    >
      {pending ? (
        <ThumbUp sx={{ fontSize: 18 }} />
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
