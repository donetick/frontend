import {
  AccessTime,
  Check,
  HourglassEmpty,
  MoreVert,
  Redo,
  RunningWithErrors,
  Schedule,
  ThumbDown,
} from '@mui/icons-material'
import { Avatar, Box, Card, Chip, IconButton, Typography } from '@mui/joy'
import moment from 'moment'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { TASK_COLOR } from '../../utils/Colors.jsx'
import PendingBadge from '../components/PendingBadge'

const formatTime = seconds => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const stripHtmlTags = html => {
  if (!html) return ''
  if (typeof document === 'undefined') {
    return String(html).replace(/<[^>]*>/g, '')
  }
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const statusConfig = {
  0: { labelKey: 'status.inProgress', color: 'primary', icon: <AccessTime /> },
  1: { labelKey: 'status.completed', color: 'success', icon: <Check /> },
  2: { labelKey: 'status.skipped', color: 'warning', icon: <Redo /> },
  3: {
    labelKey: 'status.pendingApproval',
    color: 'neutral',
    icon: <HourglassEmpty />,
  },
  4: { labelKey: 'status.rejected', color: 'danger', icon: <ThumbDown /> },
  5: {
    labelKey: 'status.missed',
    color: 'danger',
    icon: <RunningWithErrors />,
  },
  6: { labelKey: 'status.rescheduled', color: 'warning', icon: <Schedule /> },
}

const HistoryCard = ({
  allHistory,
  historyEntry,
  index,
  onToggleActions,
  onViewDetails,
  onViewNote,
  pendingCommands,
  performers,
}) => {
  const { t } = useTranslation('history')
  const { fmt } = useLocalization()
  const performer = performers.find(p => p.userId === historyEntry.completedBy)
  const assignedTo = performers.find(p => p.userId === historyEntry.assignedTo)
  const config = statusConfig[historyEntry.status] ?? statusConfig[1]
  const displayLabel =
    historyEntry.status === 6 && !historyEntry.dueDate
      ? t('status.scheduled')
      : t(config.labelKey)
  const actionDate = historyEntry.performedAt || historyEntry.updatedAt

  const getTimingLine = () => {
    const { dueDate, performedAt, status } = historyEntry
    if (!dueDate) return null

    if (status === 6 || status === 5) {
      return t('card.wasDue', { date: fmt.date(dueDate) })
    }
    if ((status === 1 || status === 2 || status === 0) && performedAt) {
      const diffHours = moment(performedAt).diff(dueDate, 'hours')
      const abs = Math.abs(diffHours)
      if (abs <= 6) return null // chip already says "On Time"
      const early = diffHours < 0
      if (abs >= 48) {
        const days = Math.floor(abs / 24)
        return early
          ? t('card.daysBeforeDue', { count: days })
          : t('card.daysAfterDue', { count: days })
      }
      return early
        ? t('card.hoursBeforeDue', { count: abs })
        : t('card.hoursAfterDue', { count: abs })
    }
    return null
  }

  const timingLine = getTimingLine()
  const plainTextNotes = historyEntry.notes
    ? stripHtmlTags(historyEntry.notes)
    : ''

  const metaTextParts = [
    fmt.dateTime(actionDate),
    historyEntry.completedBy !== historyEntry.assignedTo && assignedTo
      ? t('card.assignedTo', { name: assignedTo.displayName })
      : null,
    historyEntry?.duration > 0
      ? `⏱ ${formatTime(historyEntry.duration)}`
      : null,
    historyEntry?.points > 0
      ? t('card.points', { count: historyEntry.points })
      : null,
  ].filter(Boolean)

  return (
    <Box
      onClick={() => onViewDetails?.()}
      sx={{
        display: 'flex',
        minWidth: '100%',
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: `${config.color}.400`,
        cursor: onViewDetails ? 'pointer' : 'default',
        '&:hover': onViewDetails ? { bgcolor: 'background.level1' } : {},
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, px: 2, py: 1.5 }}>
        {/* Status + timing chip */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Avatar
              size='sm'
              color={config.color}
              variant='soft'
              sx={{ width: 20, height: 20, '& svg': { fontSize: '11px' } }}
            >
              {config.icon}
            </Avatar>
            <Typography
              level='title-sm'
              fontWeight='lg'
              sx={{ color: `${config.color}.plainColor` }}
            >
              {displayLabel}
            </Typography>
          </Box>
        </Box>

        {/* Timing relationship line */}
        {timingLine && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.25 }}>
            {timingLine}
          </Typography>
        )}

        {/* Notes inline */}

        {plainTextNotes && (
          <Card
            variant='soft'
            color='neutral'
            size='sm'
            sx={{
              mt: 0.5,
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <Typography
              level='body-xs'
              sx={{
                color: 'text.secondary',
                fontStyle: 'italic',
                mb: 0.25,
                cursor: 'pointer',
              }}
              onClick={e => {
                e.stopPropagation()
                onViewNote?.(historyEntry.notes)
              }}
            >
              {plainTextNotes.length > 80
                ? `${plainTextNotes.slice(0, 80)}…`
                : plainTextNotes}
            </Typography>
          </Card>
        )}

        {/* Metadata strip: performer chip + date + extras */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: 0.5,
            flexWrap: 'wrap',
          }}
        >
          {performer && (
            <Chip
              size='sm'
              variant='soft'
              color='neutral'
              startDecorator={
                <Avatar
                  src={performer.image}
                  alt={performer.displayName}
                  sx={{ width: 14, height: 14 }}
                />
              }
            >
              {performer.displayName}
            </Chip>
          )}
          {metaTextParts.length > 0 && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {metaTextParts.join(' · ')}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}
        onClick={e => e.stopPropagation()}
      >
        {onToggleActions && (
          <IconButton
            color='neutral'
            variant='plain'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              onToggleActions()
            }}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
      {pendingCommands?.length > 0 && (
        <PendingBadge
          commands={pendingCommands}
          size='s'
          sx={{
            mr: 0.5,
            position: 'absolute',
            right: -3,
            top: -3,
          }}
        />
      )}
    </Box>
  )
}

export default HistoryCard
