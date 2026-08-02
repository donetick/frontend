import {
  Bedtime,
  EventNote,
  LightMode,
  NextWeek,
  NightsStay,
  Today,
  WbSunny,
  WbTwilight,
  Weekend,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Input,
  List,
  ListItem,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import ModalActions from '../../components/common/ModalActions'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'

// Split a date-ish value (ISO string / Date) into the parts this picker edits.
export const splitDueDate = value => {
  if (!value) {
    return { dueDateOnly: null, dueTime: null, useCustomTime: false }
  }
  const m = moment(value)
  if (!m.isValid()) {
    return { dueDateOnly: null, dueTime: null, useCustomTime: false }
  }
  const time = m.format('HH:mm')
  return {
    dueDateOnly: m.format('YYYY-MM-DD'),
    dueTime: time,
    // Midnight is how a date-only value round-trips, so treat it as "anytime"
    useCustomTime: time !== '00:00',
  }
}

// Inverse of splitDueDate — returns a Date, or null when there is no due date.
export const combineDueDate = ({ dueDateOnly, dueTime, useCustomTime }) => {
  if (!dueDateOnly) return null
  const time = useCustomTime && dueTime ? dueTime : '00:00'
  return moment(`${dueDateOnly} ${time}`, 'YYYY-MM-DD HH:mm').toDate()
}

export const getQuickScheduleDate = option => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (option) {
    case 'today':
      return today
    case 'tomorrow': {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return tomorrow
    }
    case 'weekend': {
      const weekend = new Date(today)
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
      weekend.setDate(today.getDate() + daysUntilSaturday)
      return weekend
    }
    case 'next-week': {
      const nextWeek = new Date(today)
      const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7
      nextWeek.setDate(today.getDate() + daysUntilMonday)
      return nextWeek
    }
    case 'next-month': {
      const nextMonth = new Date(today)
      nextMonth.setMonth(today.getMonth() + 1)
      return nextMonth
    }
    default:
      return today
  }
}

const toDateKey = date => moment(date).format('YYYY-MM-DD')

/**
 * The shared due-date picker UI (quick dates, quick times, calendar, custom
 * time). Used both by DueDatePickerField and by anything that needs to
 * reschedule a task — task cards, swipe actions, action menus.
 */
const DueDatePickerModal = ({
  open,
  onClose,
  title = 'Due Date',
  dueDateOnly,
  dueTime,
  useCustomTime,
  onApply,
  onRemove,
  applyLabel = 'Apply',
}) => {
  const { ResponsiveModal } = useResponsiveModal()
  const { firstDayOfWeek } = useLocalization()

  // Local buffered state — only committed on Apply
  const [localDueDateOnly, setLocalDueDateOnly] = useState(dueDateOnly)
  const [localDueTime, setLocalDueTime] = useState(dueTime)
  const [localUseCustomTime, setLocalUseCustomTime] = useState(useCustomTime)

  // Sync local state from props whenever the modal opens
  useEffect(() => {
    if (open) {
      setLocalDueDateOnly(dueDateOnly)
      setLocalDueTime(dueTime)
      setLocalUseCustomTime(useCustomTime)
    }
  }, [open, dueDateOnly, dueTime, useCustomTime])

  const calendarType =
    firstDayOfWeek === 1
      ? 'iso8601'
      : firstDayOfWeek === 6
        ? 'islamic'
        : 'gregory'

  const pillListSx = {
    '--List-gap': '8px',
    '--ListItem-radius': '20px',
  }

  const handleQuickSchedule = option => {
    setLocalDueDateOnly(toDateKey(getQuickScheduleDate(option)))
  }

  const handleQuickTime = timeStr => {
    // Tap the active chip again to deselect it
    if (localUseCustomTime && localDueTime === timeStr) {
      setLocalUseCustomTime(false)
      setLocalDueTime(null)
      return
    }
    if (!localDueDateOnly) {
      setLocalDueDateOnly(toDateKey(new Date()))
    }
    setLocalUseCustomTime(true)
    setLocalDueTime(timeStr)
  }

  const handleCalendarChange = selected => {
    if (!selected || Array.isArray(selected)) return
    setLocalDueDateOnly(moment(selected).format('YYYY-MM-DD'))
  }

  const handleLocalTimeInputChange = e => {
    setLocalUseCustomTime(true)
    setLocalDueTime(e.target.value)
  }

  const handleSave = () => {
    onApply?.({
      dueDateOnly: localDueDateOnly || null,
      dueTime: localUseCustomTime ? localDueTime || null : null,
      useCustomTime: Boolean(localUseCustomTime && localDueTime),
    })
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      fullWidth={false}
      footer={
        <ModalActions
          tertiary={
            onRemove && dueDateOnly
              ? {
                  label: 'Remove',
                  color: 'danger',
                  onClick: onRemove,
                }
              : undefined
          }
          secondary={{ label: 'Cancel', onClick: onClose }}
          primary={{ label: applyLabel, onClick: handleSave }}
        />
      }
    >
      <Box sx={{ fontFamily: 'var(--joy-fontFamily-body)', maxWidth: 360 }}>
        {/* Date shortcuts */}
        <Typography
          level='body-xs'
          sx={{
            mb: 0.75,
            color: 'text.tertiary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick date
        </Typography>
        <List orientation='horizontal' wrap sx={{ ...pillListSx, mb: 1.5 }}>
          {[
            {
              key: 'today',
              label: 'Today',
              icon: <Today sx={{ fontSize: 14 }} />,
            },
            {
              key: 'tomorrow',
              label: 'Tomorrow',
              icon: <WbSunny sx={{ fontSize: 14 }} />,
            },
            {
              key: 'weekend',
              label: 'Weekend',
              icon: <Weekend sx={{ fontSize: 14 }} />,
            },
            {
              key: 'next-week',
              label: 'Next week',
              icon: <NextWeek sx={{ fontSize: 14 }} />,
            },
            {
              key: 'next-month',
              label: 'Next month',
              icon: <EventNote sx={{ fontSize: 14 }} />,
            },
          ].map(opt => {
            const dateStr = toDateKey(getQuickScheduleDate(opt.key))
            return (
              <ListItem key={opt.key}>
                <Checkbox
                  checked={localDueDateOnly === dateStr}
                  onClick={() => handleQuickSchedule(opt.key)}
                  overlay
                  disableIcon
                  variant='soft'
                  label={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </Box>
                  }
                />
              </ListItem>
            )
          })}
        </List>

        {/* Time shortcuts */}
        <Typography
          level='body-xs'
          sx={{
            mb: 0.75,
            color: 'text.tertiary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick time
        </Typography>
        <List orientation='horizontal' wrap sx={{ ...pillListSx, mb: 1.5 }}>
          {[
            {
              time: '09:00',
              label: 'Morning',
              icon: <LightMode sx={{ fontSize: 14 }} />,
            },
            {
              time: '12:00',
              label: 'Noon',
              icon: <WbSunny sx={{ fontSize: 14 }} />,
            },
            {
              time: '15:00',
              label: 'Afternoon',
              icon: <WbTwilight sx={{ fontSize: 14 }} />,
            },
            {
              time: '18:00',
              label: 'Evening',
              icon: <NightsStay sx={{ fontSize: 14 }} />,
            },
            {
              time: '22:00',
              label: 'Night',
              icon: <Bedtime sx={{ fontSize: 14 }} />,
            },
          ].map(opt => (
            <ListItem key={opt.time}>
              <Checkbox
                checked={localUseCustomTime && localDueTime === opt.time}
                onClick={() => handleQuickTime(opt.time)}
                overlay
                disableIcon
                variant='soft'
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {opt.icon}
                    {opt.label}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            mb: 1.5,
            borderRadius: 'md',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            bgcolor: 'background.surface',
            p: 1,
            // Fix the height so switching views (month/year/decade) doesn't
            // cause layout shift — month view with 6 rows is the tallest.
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            '& .react-calendar': {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            },
            '& .react-calendar__viewContainer': {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            },
            '& .react-calendar__month-view, & .react-calendar__year-view, & .react-calendar__decade-view, & .react-calendar__century-view':
              {
                flex: 1,
              },
            // Navigation row
            '& .react-calendar__navigation': {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              mb: 1,
            },
            // All nav buttons — large tap targets
            '& .react-calendar__navigation button': {
              background: 'none',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--joy-palette-text-primary)',
              fontFamily: 'var(--joy-fontFamily-body)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '40px',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 8px',
              transition: 'background 0.15s',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softBg)',
              },
              '&:disabled': {
                opacity: 0.35,
                cursor: 'default',
              },
            },
            // Label button (month/year text) takes remaining space
            '& .react-calendar__navigation__label': {
              flex: 1,
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
            },
            // Prev/next arrow buttons — slightly larger icon feel
            '& .react-calendar__navigation__prev-button, & .react-calendar__navigation__next-button':
              {
                fontSize: '1.75rem',
              },
            '& .react-calendar__navigation__prev2-button, & .react-calendar__navigation__next2-button':
              {
                fontSize: '1.4rem',
              },
            // Weekday headers
            '& .react-calendar__month-view__weekdays__weekday': {
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--joy-palette-text-tertiary)',
              textAlign: 'center',
              padding: '4px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            },
            '& .react-calendar__month-view__weekdays__weekday abbr': {
              textDecoration: 'none',
            },
            // All tiles — shared base
            '& .react-calendar__tile': {
              border: 'none',
              background: 'none',
              color: 'var(--joy-palette-text-primary)',
              fontFamily: 'var(--joy-fontFamily-body)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              '&:hover': {
                background: 'var(--joy-palette-neutral-softBg)',
              },
            },
            // Day tiles only — circular
            '& .react-calendar__month-view__days .react-calendar__tile': {
              aspectRatio: '1',
              borderRadius: '50%',
            },
            // Month tiles (year view) — pill shape, no huge circle
            '& .react-calendar__year-view .react-calendar__tile': {
              borderRadius: '8px',
              padding: '10px 4px',
              fontSize: '0.875rem',
            },
            // Year tiles (decade view) — pill shape
            '& .react-calendar__decade-view .react-calendar__tile': {
              borderRadius: '8px',
              padding: '10px 4px',
              fontSize: '0.875rem',
            },
            // Century tiles — pill shape
            '& .react-calendar__century-view .react-calendar__tile': {
              borderRadius: '8px',
              padding: '10px 4px',
              fontSize: '0.875rem',
            },
            '& .react-calendar__tile--now': {
              border:
                '1.5px solid var(--joy-palette-primary-solidBg) !important',
              color: 'var(--joy-palette-primary-solidBg) !important',
              fontWeight: 700,
              background: 'none !important',
            },
            '& .react-calendar__tile--active, & .react-calendar__tile--active:hover':
              {
                background: 'var(--joy-palette-primary-solidBg) !important',
                color: 'var(--joy-palette-primary-solidColor) !important',
                fontWeight: 700,
              },
            '& .react-calendar__month-view__days__day--neighboringMonth': {
              color: 'var(--joy-palette-text-tertiary)',
            },
            '& .react-calendar__month-view__days': {
              display: 'grid !important',
              gridTemplateColumns: 'repeat(7, 1fr) !important',
            },
            '& .react-calendar__month-view__weekdays': {
              display: 'grid !important',
              gridTemplateColumns: 'repeat(7, 1fr) !important',
            },
          }}
        >
          <Calendar
            value={
              localDueDateOnly ? new Date(`${localDueDateOnly}T00:00:00`) : null
            }
            calendarType={calendarType}
            onChange={handleCalendarChange}
            formatShortWeekday={(locale, date) =>
              ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()]
            }
            formatMonth={(locale, date) =>
              [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ][date.getMonth()]
            }
          />
        </Box>
        <Typography
          level='body-xs'
          sx={{
            mb: 0.5,
            mt: 0.5,
            color: 'text.tertiary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Custom time
        </Typography>
        <Input
          type='time'
          size='sm'
          value={localUseCustomTime ? localDueTime || '' : ''}
          disabled={!localDueDateOnly}
          onChange={handleLocalTimeInputChange}
          sx={{ maxWidth: 200, mb: 1 }}
          slotProps={{ input: { style: { fontFamily: 'inherit' } } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5 }}>
          <Button
            size='sm'
            variant={!localUseCustomTime ? 'soft' : 'plain'}
            color='neutral'
            disabled={!localDueDateOnly}
            onClick={() => setLocalUseCustomTime(false)}
          >
            Anytime
          </Button>
          <Button
            size='sm'
            variant={localUseCustomTime ? 'soft' : 'plain'}
            color='neutral'
            disabled={!localDueDateOnly}
            onClick={() => setLocalUseCustomTime(true)}
          >
            Specific time
          </Button>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default DueDatePickerModal
