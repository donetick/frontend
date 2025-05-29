import { CalendarMonth } from '@mui/icons-material'
import { Box, Chip, Grid, Typography } from '@mui/joy'
import moment from 'moment'
import React, { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { TASK_COLOR } from '../../utils/Colors'
import './Calendar.css'

const getAssigneeColor = (assignee, userProfile) => {
  return assignee === userProfile.id
    ? TASK_COLOR.ASSIGNED_TO_ME
    : TASK_COLOR.ASSIGNED_TO_OTHER
}

const CalendarView = ({ chores }) => {
  const { userProfile } = React.useContext(UserContext)
  const [selectedDate, setSeletedDate] = useState(null)
  const Navigate = useNavigate()

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayChores = chores.filter(chore => {
        const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
        const tileDate = date.toLocaleDateString()
        return choreDate === tileDate
      })
      if (dayChores.length === 0) {
        return (
          <div className='dot-container'>
            <span className='dot-empty'></span>
          </div>
        )
      }
      if (dayChores.length > 3) {
        return (
          <div className='dot-container'>
            <span
              className='dot-with-line'
              style={{
                backgroundColor: getAssigneeColor(
                  dayChores[0].assignedTo,
                  userProfile,
                ),
              }}
            ></span>
          </div>
        )
      }

      return (
        <div className='dot-container'>
          {dayChores.map((chore, index) => {
            return (
              <span
                key={index}
                className='dot'
                style={{
                  backgroundColor: getAssigneeColor(
                    chore.assignedTo,
                    userProfile,
                  ),
                }}
              ></span>
            )
          })}
        </div>
      )
    }
    return null
  }

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
      {/* Calendar Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1,
          width: '100%',
          mb: 2,
        }}
      >
        <CalendarMonth />
        <Typography level='title-md'>Calendar Overview</Typography>
      </Box>

      <Calendar
        tileContent={tileContent}
        onChange={d => {
          setSeletedDate(new Date(d))
        }}
        // format the days from MON, TUE, WED, THU, FRI, SAT, SUN to first three letters:
        formatShortWeekday={(locale, date) =>
          ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]
        }
      />
      {!selectedDate && (
        <Grid container ml={-3} mt={1}>
          {[
            { name: 'Assigned to me', color: TASK_COLOR.ASSIGNED_TO_ME },
            { name: 'Assigned to other', color: TASK_COLOR.ASSIGNED_TO_OTHER },
          ].map((item, index) => (
            <Grid
              key={index}
              item
              xs={12}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'start',
              }}
            >
              <Box
                sx={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                }}
              />
              <Typography level='body-xs' ml={0.3}>
                {item.name}
              </Typography>
            </Grid>
          ))}
        </Grid>
      )}
      {selectedDate && (
        <Box
          sx={{
            mt: 2,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography level='title-md'>
              {moment(selectedDate).format('MMMM D, YYYY')}
            </Typography>
            <Chip variant='soft' color='primary' size='md'>
              {(() => {
                const count = chores.filter(chore => {
                  const choreDate = new Date(
                    chore.nextDueDate,
                  ).toLocaleDateString()
                  const selectedLocalDate = selectedDate.toLocaleDateString()
                  return choreDate === selectedLocalDate
                }).length
                return `${count} Tasks`
              })()}
            </Chip>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              // maxHeight: 'calc(100vh - 500px)',
              overflowY: 'auto',
              maxHeight: '170px',

              p: 1,
            }}
          >
            {chores
              .filter(chore => {
                const choreDate = new Date(
                  chore.nextDueDate,
                ).toLocaleDateString()
                const selectedLocalDate = selectedDate.toLocaleDateString()
                return choreDate === selectedLocalDate
              })
              .sort((a, b) => moment(a.nextDueDate).diff(moment(b.nextDueDate)))
              .map((chore, idx) => (
                <Box
                  key={idx}
                  onClick={() => {
                    Navigate('/chores/' + chore.id)
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                    cursor: 'pointer',
                    position: 'relative',
                    pl: '16px',
                    py: 0.75,
                    transition: 'all 0.2s ease-in-out',
                    borderRadius: 'sm',
                    '&:hover': {
                      // transform: 'translateX(4px)',
                      bgcolor: 'background.level1',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      backgroundColor: getAssigneeColor(
                        chore.assignedTo,
                        userProfile,
                      ),
                      borderRadius: '2px',
                    },
                  }}
                >
                  <Typography
                    level='body-sm'
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                    }}
                  >
                    {chore.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      level='body-xs'
                      sx={{
                        color: 'neutral.500',
                      }}
                    >
                      {moment(chore.nextDueDate).format('h:mm A')}
                    </Typography>
                    <Typography
                      level='body-xs'
                      sx={{
                        color: getAssigneeColor(chore.assignedTo, userProfile),
                      }}
                    >
                      {chore.assignedTo === userProfile.id
                        ? 'Assigned to me'
                        : 'Assigned to other'}
                    </Typography>
                  </Box>
                </Box>
              ))}
          </Box>
        </Box>
      )}
    </div>
  )
}

export default CalendarView
