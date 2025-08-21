import { CalendarMonth } from '@mui/icons-material'
import { Avatar, Box, Chip, Grid, Typography } from '@mui/joy'
import moment from 'moment'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { getPriorityColor, TASK_COLOR } from '../../utils/Colors'

import CalendarMonthly from './CalendarMonthly'

const getAssigneeColor = (assignee, userProfile) => {
  return assignee === userProfile.id
    ? TASK_COLOR.ASSIGNED_TO_ME
    : TASK_COLOR.ASSIGNED_TO_OTHER
}
const CalendarView = ({ chores }) => {
  const { data: userProfile } = useUserProfile()

  const [selectedDate, setSeletedDate] = useState(null)
  const Navigate = useNavigate()

  // Fetch circle members data to get assignee names
  const { data: circleMembersData } = useCircleMembers()
  const circleMembers = circleMembersData?.res || []

  // Helper function to get assignee display name
  const getAssigneeName = assignedTo => {
    if (assignedTo === userProfile.id) {
      return userProfile.displayName
    }
    const assignee = circleMembers.find(member => member.userId === assignedTo)
    return assignee ? `${assignee.displayName}` : 'Assigned to other'
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
          maxWidth: '250px',
          mb: 2,
        }}
      >
        <CalendarMonth />
        <Typography level='title-md'>Calendar Overview</Typography>
      </Box>

      <div>
        <CalendarMonthly
          // className={styled.reactCalendar}
          chores={chores}
          onDateChange={date => {
            setSeletedDate(date)
          }}
        />
      </div>

      {!selectedDate && (
        <Grid
          container
          ml={3}
          mt={1}
          // start from left:
          sx={{
            width: '100%',
            display: 'flex',
            // alignItems: 'center',
            justifyContent: 'start',
          }}
        >
          {/* Show legend with priority colors */}
          {(() => {
            const priorityLevels = new Set(
              chores.map(chore => chore.priority).filter(p => p !== undefined),
            )
            const legendItems = []

            // Add priority levels that exist in the chores
            if (priorityLevels.has(1)) {
              legendItems.push({
                name: 'High Priority',
                color: TASK_COLOR.PRIORITY_1,
              })
            }
            if (priorityLevels.has(2)) {
              legendItems.push({
                name: 'Medium Priority',
                color: TASK_COLOR.PRIORITY_2,
              })
            }
            if (priorityLevels.has(3)) {
              legendItems.push({
                name: 'Low Priority',
                color: TASK_COLOR.PRIORITY_3,
              })
            }
            if (priorityLevels.has(4)) {
              legendItems.push({
                name: 'Lowest Priority',
                color: TASK_COLOR.PRIORITY_4,
              })
            }
            if (
              chores.some(
                chore =>
                  chore.priority === undefined || chore.priority === null,
              )
            ) {
              legendItems.push({
                name: 'No Priority',
                color: TASK_COLOR.NO_PRIORITY,
              })
            }

            return legendItems.map((item, index) => (
              <Grid
                key={index}
                xs={6}
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
                <Typography level='body-xs' ml={0.5}>
                  {item.name}
                </Typography>
              </Grid>
            ))
          })()}
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
                      backgroundColor: getPriorityColor(chore.priority),
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
                    {/* <Typography
                      level='body-xs'
                      sx={{
                        color: getAssigneeColor(chore.assignedTo, userProfile),
                      }}
                    >
                      {getAssigneeName(chore.assignedTo)}
                    </Typography> */}
                    <Chip
                      variant='soft'
                      color='neutral'
                      size='sm'
                      startDecorator={
                        <Avatar
                          src={
                            circleMembers.find(
                              member => member.userId === chore.assignedTo,
                            )?.image
                          }
                        />
                      }
                      sx={{
                        backgroundColor: getAssigneeColor(
                          chore.assignedTo,
                          userProfile,
                        ),
                        color: 'white',
                      }}
                    >
                      {getAssigneeName(chore.assignedTo)}
                    </Chip>
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
