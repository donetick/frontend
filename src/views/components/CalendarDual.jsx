import { Box, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
// import 'react-calendar/dist/Calendar.css'
import { useNavigate } from 'react-router-dom'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { getPriorityColor, TASK_COLOR } from '../../utils/Colors'
import styles from './CalendarDual.module.css'

const getAssigneeColor = (assignee, userProfile) => {
  return assignee === userProfile.id
    ? TASK_COLOR.ASSIGNED_TO_ME
    : TASK_COLOR.ASSIGNED_TO_OTHER
}
const CalendarDual = ({ chores, onDateChange }) => {
  const { data: userProfile } = useUserProfile()

  const [selectedDate, setSeletedDate] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [nextMonth, setNextMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return next
  })
  const Navigate = useNavigate()

  // Fetch circle members data to get assignee names
  const { data: circleMembersData } = useCircleMembers()
  const circleMembers = circleMembersData?.res || []

  // Update next month whenever current date changes
  useEffect(() => {
    const next = new Date(currentDate.getTime())
    next.setMonth(currentDate.getMonth() + 1)
    setNextMonth(next)
  }, [currentDate])

  // Helper function to get assignee display name
  const getAssigneeName = assignedTo => {
    if (assignedTo === userProfile.id) {
      return userProfile.displayName
    }
    const assignee = circleMembers.find(member => member.userId === assignedTo)
    return assignee ? `${assignee.displayName}` : 'Assigned to other'
  }

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayChores = chores.filter(chore => {
        const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
        const tileDate = date.toLocaleDateString()
        return choreDate === tileDate
      })
      if (dayChores.length === 0) {
        return (
          <div className={styles.dotContainer}>
            <span className={styles.dotEmpty}></span>
          </div>
        )
      }
      if (dayChores.length > 3) {
        return (
          <div className={styles.dotContainer}>
            <span
              className={styles.dotWithLine}
              style={{
                backgroundColor: getPriorityColor(dayChores[0].priority),
              }}
            ></span>
          </div>
        )
      }

      return (
        <div className={styles.dotContainer}>
          {dayChores.map((chore, index) => {
            return (
              <span
                key={index}
                className={styles.dot}
                style={{
                  backgroundColor: getPriorityColor(chore.priority),
                }}
              ></span>
            )
          })}
        </div>
      )
    }
    return null
  }

  const renderSingleCalendar = (date, isSecondary = false) => (
    <div
      className={`${styles.reactCalendar} ${isSecondary ? styles.secondaryCalendar : ''}`}
    >
      {isSecondary && (
        <div className={styles.secondaryCalendarHeader}>
          <Typography level='title-md' sx={{ textAlign: 'center', mb: 1 }}>
            {date.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Typography>
        </div>
      )}
      <Calendar
        className={styles.reactCalendar}
        tileContent={tileContent}
        onChange={d => {
          let date = new Date(d)
          setSeletedDate(date)
          onDateChange(date)
        }}
        value={selectedDate}
        activeStartDate={date}
        // Don't show navigation on secondary calendar
        showNavigation={!isSecondary}
        // format the days from MON, TUE, WED, THU, FRI, SAT, SUN to first three letters:
        formatShortWeekday={(locale, date) =>
          ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]
        }
        onActiveStartDateChange={({ activeStartDate }) => {
          if (!isSecondary) {
            setCurrentDate(activeStartDate)
          }
        }}
      />
    </div>
  )

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Responsive Calendar Layout */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 4 },
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'flex-start' },
        }}
      >
        {/* Primary Calendar */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {renderSingleCalendar(currentDate)}
        </Box>

        {/* Secondary Calendar - only show on desktop */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            justifyContent: 'center',
          }}
        >
          {renderSingleCalendar(nextMonth, true)}
        </Box>
      </Box>
    </div>
  )
}

export default CalendarDual
