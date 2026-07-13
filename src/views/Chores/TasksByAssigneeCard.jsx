import { BarChart, Person } from '@mui/icons-material'
import { Avatar, Box, Sheet, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useCircleMembers } from '../../queries/UserQueries'
import { TASK_COLOR } from '../../utils/Colors'
import { resolvePhotoURL } from '../../utils/Helpers'

const TasksByAssigneeCard = ({ chores = [] }) => {
  const [assigneeData, setAssigneeData] = useState([])
  const { data: circleMembersData, isLoading: isCircleMembersLoading } =
    useCircleMembers()

  useEffect(() => {
    if (
      !isCircleMembersLoading &&
      circleMembersData?.res &&
      chores.length > 0
    ) {
      const members = circleMembersData.res
      const data = processTasksByAssignee(chores, members)
      setAssigneeData(data)
    }
  }, [chores, circleMembersData, isCircleMembersLoading])

  const processTasksByAssignee = (chores, members) => {
    const assigneeStats = {}

    // Initialize stats for all members
    members.forEach(member => {
      assigneeStats[member.userId] = {
        id: member.userId,
        name: member.displayName || member.name,
        image: member.image,
        inProgress: 0,
        overdue: 0,
        scheduled: 0,
        pendingReview: 0,
        total: 0,
      }
    })

    // Count tasks by status for each assignee
    chores.forEach(chore => {
      if (chore.assignedTo && assigneeStats[chore.assignedTo]) {
        const assignee = assigneeStats[chore.assignedTo]
        assignee.total++

        // Map chore status to our categories based on your system
        if (chore.status === 3) {
          // Pending approval/review
          assignee.pendingReview++
        } else if (chore.status === 1 || chore.status === 2) {
          // In progress (started or paused)
          assignee.inProgress++
        } else if (
          chore.nextDueDate &&
          new Date(chore.nextDueDate) < new Date()
        ) {
          // Overdue - past due date
          assignee.overdue++
        } else {
          // Scheduled/planned - future due date or no due date
          assignee.scheduled++
        }
      }
    })

    // Filter out members with no tasks and sort by total tasks
    return Object.values(assigneeStats)
      .filter(assignee => assignee.total > 0)
      .sort((a, b) => b.total - a.total)
  }

  const getStatusColor = status => {
    switch (status) {
      case 'inProgress':
        return TASK_COLOR.IN_PROGRESS
      case 'overdue':
        return TASK_COLOR.OVERDUE
      case 'scheduled':
        return TASK_COLOR.COMPLETED
      case 'pendingReview':
        return TASK_COLOR.PENDING_REVIEW
      default:
        return TASK_COLOR.DEFAULT
    }
  }

  const maxTasks = Math.max(...assigneeData.map(a => a.total), 1)

  if (isCircleMembersLoading) {
    return (
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'sm',
          borderRadius: 20,
          width: '315px',
          minHeight: 300,
          mb: 1,
        }}
      >
        <Typography level='body-sm' color='neutral'>
          Loading tasks by assignee...
        </Typography>
      </Sheet>
    )
  }

  if (assigneeData.length === 0) {
    return (
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'sm',
          borderRadius: 20,
          width: '315px',
          minHeight: 300,
          mb: 1,
        }}
      >
        <Person sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
        <Typography level='body-sm' color='neutral'>
          No assigned tasks found
        </Typography>
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='plain'
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'sm',
        borderRadius: 20,
        width: '315px',
        minHeight: 300,
        mb: 1,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1,
          }}
        >
          <BarChart color='' />
          <Typography level='title-md'>Tasks by Assignee</Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          mb: 3,
          px: 1,
        }}
      >
        {[
          {
            key: 'inProgress',
            label: 'In Progress',
            color: getStatusColor('inProgress'),
          },
          {
            key: 'overdue',
            label: 'Overdue',
            color: getStatusColor('overdue'),
          },
          {
            key: 'scheduled',
            label: 'Scheduled',
            color: getStatusColor('scheduled'),
          },
          {
            key: 'pendingReview',
            label: 'Pending Review',
            color: getStatusColor('pendingReview'),
          },
        ].map(status => (
          <Box
            key={status.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: status.color,
                flexShrink: 0,
              }}
            />
            <Typography
              level='body-xs'
              sx={{
                fontSize: '10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {status.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Chart Container */}
      <Box sx={{ position: 'relative', height: 200 }}>
        {/* Chart */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'end',
            gap: 1,
            height: '100%',
            pl: 4,
            pr: 2,
            pt: 2,
          }}
        >
          {assigneeData.slice(0, 6).map((assignee, index) => {
            const barHeight = Math.max((assignee.total / maxTasks) * 140, 8)

            return (
              <Box
                key={assignee.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 45,
                }}
              >
                {/* Avatar */}
                <Avatar
                  size='sm'
                  src={resolvePhotoURL(assignee.image)}
                  sx={{
                    width: 28,
                    height: 28,
                    mb: 1,
                    border: '2px solid white',
                    boxShadow: 'sm',
                    fontSize: '12px',
                  }}
                >
                  {assignee.name?.charAt(0) || <Person />}
                </Avatar>

                {/* Stacked bars */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: barHeight,
                    width: '100%',
                    maxWidth: 28,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                  }}
                >
                  {/* Pending Review - bottom */}
                  {assignee.pendingReview > 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(assignee.pendingReview / assignee.total) * 100}%`,
                        backgroundColor: getStatusColor('pendingReview'),
                        order: 4,
                      }}
                    />
                  )}

                  {/* Scheduled */}
                  {assignee.scheduled > 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(assignee.scheduled / assignee.total) * 100}%`,
                        backgroundColor: getStatusColor('scheduled'),
                        order: 3,
                      }}
                    />
                  )}

                  {/* In Progress */}
                  {assignee.inProgress > 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(assignee.inProgress / assignee.total) * 100}%`,
                        backgroundColor: getStatusColor('inProgress'),
                        order: 2,
                      }}
                    />
                  )}

                  {/* Overdue - top */}
                  {assignee.overdue > 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(assignee.overdue / assignee.total) * 100}%`,
                        backgroundColor: getStatusColor('overdue'),
                        order: 1,
                      }}
                    />
                  )}
                </Box>

                {/* Name */}
                <Box sx={{ mt: 1, textAlign: 'center', width: '100%' }}>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: 500,
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {assignee.name}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>

        {/* Y-axis labels */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 20,
            height: 140,
            width: 32,
            pr: 0.5,
          }}
        >
          {[0, 20, 40, 60, 80, 100].map((value, index) => {
            const yPosition = (value / 100) * 140
            return (
              <Typography
                key={value}
                level='body-xs'
                sx={{
                  fontSize: '9px',
                  color: 'text.secondary',
                  lineHeight: 1,
                  position: 'absolute',
                  bottom: `${yPosition}px`,
                  right: 4,
                  transform: 'translateY(50%)',
                }}
              >
                {Math.round((value / 100) * maxTasks)}
              </Typography>
            )
          })}
        </Box>
      </Box>
    </Sheet>
  )
}

export default TasksByAssigneeCard
