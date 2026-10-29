import {
  HourglassEmpty,
  OpenInNew,
  Pause,
  PlayArrow,
  Repeat,
  ThumbUp,
} from '@mui/icons-material'
import { Box, Checkbox, IconButton, Typography } from '@mui/joy'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useLocalization } from '../../../contexts/LocalizationContext'
import { useChorePermissions } from '../../../hooks/useChorePermissions'
import { usePendingCommands } from '../../../hooks/usePendingCommands'
import {
  getDueDateChipColor,
  getDueDateChipText,
  getRecurrentChipText,
} from '../../../utils/ChoreCardHelpers'
import { notInCompletionWindow } from '../../../utils/Chores'
import { getPriorityColor } from '../../../utils/Colors'
import {
  getFirstHttpUrl,
  getUrlHostname,
  openExternalUrl,
  splitTextAtFirstHttpUrl,
} from '../../../utils/ExternalLinks'
import { ChoreActionMenuTrigger } from '../../components/ChoreActionMenu'
import ChoreStatusChip from '../../components/ChoreStatusChip'
import PendingBadge from '../../components/PendingBadge'

// The board and Home use cards. Project lists deliberately have their own
// visual: one baseline, an unfilled completion box, and no card decoration.
const ProjectTaskRow = memo(function ProjectTaskRow({
  chore,
  isMultiSelectMode,
  isSelected,
  onAction,
  onChipClick,
  onOpenActionMenu,
  onSelectionToggle,
  performers,
}) {
  const { t } = useTranslation('chores')
  const navigate = useNavigate()
  const { timeFormat } = useLocalization()
  const permissions = useChorePermissions(chore)
  const { data: pendingCommands } = usePendingCommands(chore.id)
  const canApprove = permissions.approve
  const isPendingApproval = chore.status === 3
  const actionDisabled =
    chore.isActive === false ||
    (isPendingApproval
      ? !canApprove
      : !permissions.complete || Boolean(notInCompletionWindow(chore)))
  const action = isPendingApproval
    ? 'approve'
    : chore.status === 1
      ? 'pause'
      : 'start'
  const actionLabel = isPendingApproval
    ? t(canApprove ? 'choreView.approve' : 'choreView.pendingApproval')
    : t(chore.status === 1 ? 'choreView.pauseTimer' : 'choreView.start')
  const priorityColor =
    chore.priority > 0 ? getPriorityColor(chore.priority) : null
  const assignee = performers?.find(
    member => member.userId === chore.assignedTo,
  )?.displayName
  const label = chore.labelsV2?.[0]
  const extraLabels = Math.max(0, (chore.labelsV2?.length || 0) - 1)
  const recurrent =
    chore.frequencyType && !['once', 'no_repeat'].includes(chore.frequencyType)
  const { after, before, url } = splitTextAtFirstHttpUrl(chore.name)
  const links = [
    ...new Set([url, getFirstHttpUrl(chore.description)].filter(Boolean)),
  ]
  const dueColor = getDueDateChipColor(chore.nextDueDate, chore)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.75, sm: 1 },
        minWidth: 0,
        minHeight: 44,
        pr: 0.25,
      }}
    >
      <Box
        onClick={event => event.stopPropagation()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          width: 36,
          flexShrink: 0,
        }}
      >
        {isMultiSelectMode || chore.status === 0 ? (
          <Checkbox
            checked={isMultiSelectMode ? isSelected : false}
            disabled={!isMultiSelectMode && actionDisabled}
            onChange={() => {
              if (isMultiSelectMode) onSelectionToggle?.()
              else onAction?.('complete', chore)
            }}
            size='sm'
            variant='outlined'
            slotProps={{
              input: {
                'aria-label': isMultiSelectMode
                  ? chore.name
                  : `${t('completeChore')}: ${chore.name}`,
              },
            }}
            sx={{
              '--Checkbox-size': '18px',
              position: 'relative',
              // Keep an easy-to-hit target around the small visible square.
              '& .MuiCheckbox-action': { inset: '-13px -9px' },
              '& .MuiCheckbox-checkbox': {
                borderRadius: '5px',
                borderWidth: '1.5px',
                ...(!isMultiSelectMode && {
                  bgcolor: 'transparent',
                  borderColor: priorityColor || 'neutral.outlinedBorder',
                }),
              },
              '&:hover .MuiCheckbox-checkbox': {
                borderColor: priorityColor || 'primary.400',
              },
            }}
          />
        ) : isPendingApproval && !canApprove ? (
          <HourglassEmpty
            aria-hidden='true'
            sx={{ fontSize: 17, color: 'text.tertiary' }}
          />
        ) : (
          <IconButton
            aria-label={`${actionLabel}: ${chore.name}`}
            title={actionLabel}
            size='sm'
            variant='plain'
            disabled={actionDisabled}
            onClick={() => onAction?.(action, chore)}
            sx={{
              color: isPendingApproval
                ? 'primary.plainColor'
                : 'warning.plainColor',
            }}
          >
            {isPendingApproval ? (
              <ThumbUp sx={{ fontSize: 17 }} />
            ) : chore.status === 1 ? (
              <Pause sx={{ fontSize: 18 }} />
            ) : (
              <PlayArrow sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component='span'
          role='link'
          tabIndex={0}
          title={chore.name}
          level='body-sm'
          noWrap
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            event.stopPropagation()
            if (isMultiSelectMode) onSelectionToggle?.()
            else navigate(`/chores/${chore.id}`)
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 450,
            color: 'text.primary',
            lineHeight: 1.5,
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.400',
              outlineOffset: 2,
            },
          }}
        >
          {before}
          {url ? getUrlHostname(url) : ''}
          {after}
        </Typography>
        <ChoreStatusChip chore={chore} />
      </Box>

      {(chore._pending || pendingCommands?.length > 0) && (
        <PendingBadge commands={pendingCommands} size='xs' />
      )}

      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 1,
          maxWidth: '30%',
          minWidth: 0,
          color: 'text.tertiary',
        }}
      >
        {recurrent && (
          <Repeat
            sx={{ fontSize: 14, flexShrink: 0 }}
            titleAccess={getRecurrentChipText(chore)}
          />
        )}
        {assignee && (
          <Typography
            level='body-xs'
            noWrap
            title={assignee}
            sx={{ color: 'text.tertiary', maxWidth: 100 }}
          >
            {assignee}
          </Typography>
        )}
        {label && (
          <Box
            component='button'
            type='button'
            title={chore.labelsV2.map(item => item.name).join(', ')}
            onClick={event => {
              event.stopPropagation()
              onChipClick?.({ label })
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              color: 'text.tertiary',
              font: 'inherit',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: label.color || 'primary.400',
                flexShrink: 0,
              }}
            />
            <Typography
              level='body-xs'
              noWrap
              sx={{ color: 'inherit', maxWidth: 90 }}
            >
              {label.name}
            </Typography>
            {extraLabels > 0 && (
              <Typography level='body-xs' sx={{ color: 'inherit' }}>
                +{extraLabels}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {!isMultiSelectMode &&
        links.map(link => (
          <IconButton
            key={link}
            className='project-task-secondary-action'
            size='sm'
            variant='plain'
            aria-label={link}
            title={link}
            onClick={event => {
              event.stopPropagation()
              openExternalUrl(link)
            }}
            sx={{
              color: 'text.tertiary',
              minWidth: 28,
              '--IconButton-size': '28px',
            }}
          >
            <OpenInNew sx={{ fontSize: 14 }} />
          </IconButton>
        ))}

      {chore.nextDueDate && (
        <Typography
          component='time'
          dateTime={chore.nextDueDate}
          level='body-xs'
          noWrap
          title={getDueDateChipText(chore.nextDueDate, chore, timeFormat)}
          sx={{
            flexShrink: 0,
            maxWidth: { xs: 90, sm: 150 },
            color:
              dueColor === 'neutral'
                ? 'text.tertiary'
                : `${dueColor}.plainColor`,
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {getDueDateChipText(chore.nextDueDate, chore, timeFormat)}
        </Typography>
      )}

      {!isMultiSelectMode && (
        <Box className='project-task-secondary-action' sx={{ flexShrink: 0 }}>
          <ChoreActionMenuTrigger
            variant='plain'
            onClick={event => {
              event.stopPropagation()
              onOpenActionMenu?.(event.currentTarget, chore)
            }}
            sx={{
              color: 'text.tertiary',
              '--IconButton-size': '28px',
              width: 28,
              height: 28,
              minWidth: 28,
              left: 0,
              p: 0,
            }}
          />
        </Box>
      )}
    </Box>
  )
})

export default ProjectTaskRow
