import {
  AccessTime,
  CalendarMonth,
  Check,
  Edit,
  HourglassEmpty,
  OpenInNew,
  Person,
  Redo,
  RunningWithErrors,
  Schedule,
  ThumbDown,
  Update,
} from '@mui/icons-material'
import { Avatar, Box, Button, Chip, Divider, Stack, Typography } from '@mui/joy'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'

import ModalActions from '../../components/common/ModalActions'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { TASK_COLOR } from '../../utils/Colors.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'

const STATUS_CONFIG = {
  0: { label: 'In Progress', color: 'primary', icon: <AccessTime /> },
  1: { label: 'Completed', color: 'success', icon: <Check /> },
  2: { label: 'Skipped', color: 'warning', icon: <Redo /> },
  3: { label: 'Pending Approval', color: 'neutral', icon: <HourglassEmpty /> },
  4: { label: 'Rejected', color: 'danger', icon: <ThumbDown /> },
  5: { label: 'Missed', color: 'danger', icon: <RunningWithErrors /> },
  6: { label: 'Rescheduled', color: 'warning', icon: <Schedule /> },
}

const DetailRow = ({ children, icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 0.75 }}>
    <Box
      sx={{ color: 'text.tertiary', mt: 0.25, flexShrink: 0, display: 'flex' }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.15 }}>
        {label}
      </Typography>
      {children ?? (
        <Typography
          level='body-sm'
          sx={{ color: 'text.primary', fontWeight: 'md' }}
        >
          {value}
        </Typography>
      )}
    </Box>
  </Box>
)

const TimingBadge = ({ historyEntry }) => {
  if (!historyEntry.dueDate || !historyEntry.performedAt) return null
  if ([0, 5, 6].includes(historyEntry.status)) return null

  const performedAt = moment(historyEntry.performedAt)
  const dueDate = moment(historyEntry.dueDate)
  const diffHours = performedAt.diff(dueDate, 'hours')
  const gracePeriod = 6 * 60 * 60 * 1000

  if (Math.abs(performedAt - dueDate) <= gracePeriod) {
    return (
      <Chip
        size='sm'
        variant='solid'
        sx={{ backgroundColor: TASK_COLOR.COMPLETED, color: 'white' }}
        startDecorator={<Check />}
      >
        On Time
      </Chip>
    )
  } else if (performedAt.isBefore(dueDate)) {
    const abs = Math.abs(diffHours)
    const label = abs >= 48 ? `${Math.floor(abs / 24)}d early` : `${abs}h early`
    return (
      <Chip
        size='sm'
        variant='soft'
        sx={{ backgroundColor: TASK_COLOR.SCHEDULED, color: 'white' }}
        startDecorator={<Check />}
      >
        {label}
      </Chip>
    )
  } else {
    const abs = Math.abs(diffHours)
    const label = abs >= 48 ? `${Math.floor(abs / 24)}d late` : `${abs}h late`
    return (
      <Chip
        size='sm'
        variant='solid'
        sx={{ backgroundColor: TASK_COLOR.LATE, color: 'white' }}
      >
        {label}
      </Chip>
    )
  }
}

function HistoryDetailModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const { fmt } = useLocalization()
  const navigate = useNavigate()

  const entry = config?.entry
  const performers = config?.performers ?? []

  if (!entry) return null

  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG[1]
  const isFirstSchedule = entry.status === 6 && !entry.dueDate
  const statusLabel = isFirstSchedule ? 'Scheduled' : statusCfg.label
  const performer = performers.find(p => p.userId === entry.completedBy)
  const assignedTo = performers.find(p => p.userId === entry.assignedTo)
  const isDifferentAssignee =
    entry.assignedTo && entry.completedBy !== entry.assignedTo

  // updatedAt is only meaningful if it differs from performedAt by more than a minute
  const showUpdatedAt =
    entry.updatedAt &&
    entry.performedAt &&
    Math.abs(moment(entry.updatedAt).diff(entry.performedAt, 'minutes')) > 1

  const formatDuration = seconds => {
    if (!seconds || seconds <= 0) return null
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      title='Activity Detail'
      footer={
        <ModalActions>
          {entry.choreId && (
            <Button
              variant='outlined'
              color='neutral'
              startDecorator={<OpenInNew sx={{ fontSize: 16 }} />}
              onClick={() => {
                config?.onClose?.()
                navigate(`/chores/${entry.choreId}`)
              }}
            >
              Open Task
            </Button>
          )}
          {config?.onEdit && (
            <Button
              startDecorator={<Edit sx={{ fontSize: 16 }} />}
              onClick={() => config.onEdit(entry)}
            >
              Edit Entry
            </Button>
          )}
        </ModalActions>
      }
    >
      {/* Status header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar size='sm' color={statusCfg.color} variant='soft'>
            {statusCfg.icon}
          </Avatar>
          <Typography
            level='title-md'
            fontWeight='lg'
            sx={{ color: `${statusCfg.color}.plainColor` }}
          >
            {statusLabel}
          </Typography>
        </Box>
        <TimingBadge historyEntry={entry} />
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      <Stack spacing={0}>
        {/* Who performed it */}
        {performer && (
          <DetailRow
            icon={<Check sx={{ fontSize: 16 }} />}
            label='Performed by'
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Avatar
                src={performer.image}
                alt={performer.displayName}
                size='sm'
                sx={{ width: 20, height: 20 }}
              />
              <Typography level='body-sm' fontWeight='md'>
                {performer.displayName}
              </Typography>
            </Box>
          </DetailRow>
        )}

        {/* Assigned to (only if different) */}
        {isDifferentAssignee && assignedTo && (
          <DetailRow
            icon={<Person sx={{ fontSize: 16 }} />}
            label='Assigned to'
            value={assignedTo.displayName}
          />
        )}

        <Divider />

        {/* Performed at */}
        {entry.performedAt && (
          <DetailRow
            icon={<AccessTime sx={{ fontSize: 16 }} />}
            label={
              isFirstSchedule
                ? 'Scheduled on'
                : entry.status === 6
                  ? 'Rescheduled on'
                  : entry.status === 2
                    ? 'Skipped on'
                    : 'Completed on'
            }
            value={fmt.dateTime(entry.performedAt)}
          />
        )}

        {/* Due date */}
        {entry.dueDate && (
          <DetailRow
            icon={<CalendarMonth sx={{ fontSize: 16 }} />}
            label={
              entry.status === 6
                ? 'Previous due date'
                : entry.status === 5
                  ? 'Was due'
                  : 'Due date'
            }
            value={fmt.dateTime(entry.dueDate)}
          />
        )}

        {/* Last updated (only if meaningfully different from performedAt) */}
        {showUpdatedAt && (
          <DetailRow
            icon={<Update sx={{ fontSize: 16 }} />}
            label='Last updated'
            value={fmt.dateTime(entry.updatedAt)}
          />
        )}

        {/* Duration */}
        {entry.duration > 0 && (
          <DetailRow
            icon={<Schedule sx={{ fontSize: 16 }} />}
            label='Duration'
            value={formatDuration(entry.duration)}
          />
        )}

        {/* Points */}
        {entry.points > 0 && (
          <DetailRow
            icon={<Typography sx={{ fontSize: 14 }}>★</Typography>}
            label='Points earned'
            value={`${entry.points} pt${entry.points > 1 ? 's' : ''}`}
          />
        )}

        {/* Notes */}
        {entry.notes && (
          <>
            <Divider />
            <Box sx={{ pt: 1 }}>
              <Typography
                level='body-xs'
                sx={{ color: 'text.tertiary', mb: 0.5 }}
              >
                {entry.status === 2 || entry.status === 4 ? 'Reason' : 'Notes'}
              </Typography>
              <Box sx={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <RichTextEditor value={entry.notes || ''} isEditable={false} />
              </Box>
            </Box>
          </>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default HistoryDetailModal
