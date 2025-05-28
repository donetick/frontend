import { CalendarMonth } from '@mui/icons-material'
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/joy'
import moment from 'moment'
import React, { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { getTextColorFromBackgroundColor, TASK_COLOR } from '../../utils/Colors'
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
        <CalendarMonth color='primary' />
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
          variant='outlined'
          sx={{
            // p: 2,
            // borderRadius: 20,
            // if exceed the height, scroll:
            mt: 1,
            maxHeight: '160px',
            overflowY: 'auto',
            // minimum height to fit the content:
            height: '50vh',
            width: '100%',
          }}
        >
          {chores
            .filter(chore => {
              const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
              const selectedLocalDate = selectedDate.toLocaleDateString()
              return choreDate === selectedLocalDate
            })
            .map((chore, idx) => (
              <Card
                key={idx}
                variant='outlined'
                onClick={() => {
                  Navigate('/chores/' + chore.id)
                }}
                sx={{
                  mb: 0.4,
                  py: 1,
                  px: 1,
                  cursor: 'pointer',
                }}
              >
                <CardContent>
                  <Typography
                    key={chore.id}
                    className='truncate'
                    maxWidth='100%'
                  >
                    <Chip
                      variant='plain'
                      size='sm'
                      sx={{
                        backgroundColor: getAssigneeColor(
                          chore.assignedTo,
                          userProfile,
                        ),
                        mr: 0.5,
                        color: getTextColorFromBackgroundColor(
                          getAssigneeColor(chore.assignedTo, userProfile),
                        ),
                      }}
                    >
                      {moment(chore.nextDueDate).format('hh:mm A')}
                    </Chip>
                    {chore.name}
                  </Typography>
                </CardContent>
              </Card>
            ))}
        </Box>
      )}
    </div>
  )
}

export default CalendarView
