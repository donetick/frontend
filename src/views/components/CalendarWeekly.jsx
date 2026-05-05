import { ArrowBackIosNew, ArrowForwardIos, CheckCircle, LocationOn, Today } from '@mui/icons-material'
import { Box, Chip, IconButton, Typography } from '@mui/joy'
import { useMemo, useState } from 'react'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useLocalization } from '../../contexts/LocalizationContext'
import { getPriorityColor } from '../../utils/Colors'
import AssigneeAvatarGroup from './AssigneeAvatarGroup'
import LocationOverrideDialog from './LocationOverrideDialog'
import WeatherDisplay from './WeatherDisplay'
import styles from './CalendarWeekly.module.css'

const isSameDate = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const startOfWeek = (date, firstDayOfWeek) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const diff = (start.getDay() - firstDayOfWeek + 7) % 7
  start.setDate(start.getDate() - diff)
  return start
}

const CalendarWeekly = ({ chores, performers = [], selectedDate, onDateChange }) => {
  const { firstDayOfWeek, fmt } = useLocalization()
  const [anchorDate, setAnchorDate] = useState(selectedDate || new Date())
  const [expandedDate, setExpandedDate] = useState(null)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const { coords, isManualOverride, setManualLocation } = useGeolocation()

  const weekStart = useMemo(
    () => startOfWeek(anchorDate, firstDayOfWeek),
    [anchorDate, firstDayOfWeek],
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const choresByDay = useMemo(() => {
    return weekDays.map(day =>
      chores.filter(chore => {
        if (!chore.nextDueDate) return false
        const choreDate = new Date(chore.nextDueDate)
        if (Number.isNaN(choreDate.getTime())) return false
        return isSameDate(choreDate, day)
      }),
    )
  }, [chores, weekDays])

  const handleSelectDate = date => {
    const nextDate = new Date(date)
    setAnchorDate(nextDate)
    setExpandedDate(
      expandedDate && isSameDate(expandedDate, nextDate) ? null : nextDate,
    )
    onDateChange(nextDate)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    setAnchorDate(today)
    setExpandedDate(today)
    onDateChange(today)
  }

  const weekEnd = weekDays[6]

  return (
    <div className={styles.weekCalendar}>
      <div className={styles.weekHeader}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            variant='outlined'
            color='neutral'
            size='sm'
            onClick={() => setAnchorDate(addDays(anchorDate, -7))}
            title='Previous week'
          >
            <ArrowBackIosNew />
          </IconButton>
          <IconButton
            variant='outlined'
            color='neutral'
            size='sm'
            onClick={goToCurrentWeek}
            title='Current week'
          >
            <Today />
          </IconButton>
          <IconButton
            variant='outlined'
            color='neutral'
            size='sm'
            onClick={() => setAnchorDate(addDays(anchorDate, 7))}
            title='Next week'
          >
            <ArrowForwardIos />
          </IconButton>
          {isManualOverride && (
            <IconButton
              variant='soft'
              color='primary'
              size='sm'
              onClick={() => setLocationDialogOpen(true)}
              title='Change weather location'
            >
              <LocationOn />
            </IconButton>
          )}
        </Box>

        <Typography level='title-md' sx={{ textAlign: 'center' }}>
          {fmt.date(weekStart, 'MMM D')} - {fmt.date(weekEnd, 'MMM D, YYYY')}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Chip variant='soft' color='neutral' size='sm'>
            {choresByDay.reduce(
              (total, dayChores) => total + dayChores.length,
              0,
            )}{' '}
            tasks
          </Chip>
        </Box>
      </div>

      <div className={styles.weekGrid}>
        {weekDays.map((day, index) => {
          const dayChores = choresByDay[index]
          const isSelected = selectedDate && isSameDate(day, selectedDate)
          const isExpanded = expandedDate && isSameDate(day, expandedDate)
          const isToday = isSameDate(day, new Date())

          return (
            <button
              type='button'
              key={day.toISOString()}
              className={[
                styles.dayColumn,
                isSelected ? styles.activeDay : '',
                isExpanded ? styles.expandedDay : '',
                isToday ? styles.today : '',
              ].join(' ')}
              onClick={() => handleSelectDate(day)}
            >
              <div className={styles.dayHeader}>
                <div className={styles.dateBlock}>
                  <div className={styles.dateText}>
                    <div className={styles.dayName}>{fmt.date(day, 'ddd')}</div>
                    <div className={styles.dayNumber}>{fmt.date(day, 'D')}</div>
                  </div>
                  {coords && (
                    <WeatherDisplay
                      className={styles.weatherDisplay}
                      date={day}
                      latitude={coords.latitude}
                      longitude={coords.longitude}
                    />
                  )}
                </div>
                <Box
                  className={styles.dayBadges}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  {dayChores.length > 0 && (
                    <Chip size='sm' variant='soft' color='primary'>
                      {dayChores.length}
                    </Chip>
                  )}
                </Box>
              </div>

              <div className={styles.taskList}>
                {dayChores.slice(0, 4).map(chore => (
                  <div
                    key={chore.id}
                    className={[
                      styles.taskPill,
                      chore.frontendCompleted ? styles.completedTaskPill : '',
                    ].join(' ')}
                    style={{
                      borderLeftColor: getPriorityColor(chore.priority),
                    }}
                    title={chore.name}
                  >
                    <AssigneeAvatarGroup
                      chore={chore}
                      performers={performers}
                      size={18}
                      max={2}
                    />
                    <div className={styles.taskName}>{chore.name}</div>
                    {chore.frontendCompleted && (
                      <CheckCircle className={styles.completedIcon} />
                    )}
                  </div>
                ))}
                {dayChores.length > 4 && (
                  <div className={styles.moreTasks}>
                    +{dayChores.length - 4} more
                  </div>
                )}
              </div>

              {dayChores.length === 0 && (
                <div className={styles.emptyDay}>No tasks</div>
              )}
            </button>
          )
        })}
      </div>

      <LocationOverrideDialog
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        onSetLocation={setManualLocation}
      />
    </div>
  )
}

export default CalendarWeekly
