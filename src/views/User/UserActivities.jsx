import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CircleIcon from '@mui/icons-material/Circle'
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'

import { EventBusy, Group, Toll } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Option,
  Select,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import React, { useEffect, useState } from 'react'

import { useChores, useChoresHistory } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { ChoresGrouper } from '../../utils/Chores'
import { COLORS, TASK_COLOR } from '../../utils/Colors.jsx'
import { resolvePhotoURL } from '../../utils/Helpers.jsx'
import LoadingComponent from '../components/Loading'

const groupByDate = history => {
  const aggregated = {}
  for (let i = 0; i < history.length; i++) {
    const item = history[i]
    const date = new Date(item.performedAt).toLocaleDateString()
    if (!aggregated[date]) {
      aggregated[date] = []
    }
    aggregated[date].push(item)
  }
  return aggregated
}

const ChoreHistoryItem = ({ time, name, points, status }) => {
  const statusIcon = {
    completed: <CheckCircleIcon color='success' />,
    missed: <CancelIcon color='error' />,
    pending: <CircleIcon color='neutral' />,
  }

  return (
    <Stack direction='row' alignItems='center' spacing={2}>
      <Typography level='body-md' sx={{ minWidth: 80 }}>
        {time}
      </Typography>
      <Box>
        {statusIcon[status] ? statusIcon[status] : statusIcon['completed']}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 40,
          // center vertically:
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '50vw',
          }}
          level='body-md'
        >
          {name}
        </Typography>
        {points && (
          <Chip size='sm' color='success' startDecorator={<Toll />}>
            {`${points} points`}
          </Chip>
        )}
      </Box>
    </Stack>
  )
}

const ChoreHistoryTimeline = ({ history }) => {
  const groupedHistory = groupByDate(history)

  return (
    <Container sx={{ p: 2 }}>
      <Typography level='h4' sx={{ mb: 2 }}>
        Activities Timeline
      </Typography>

      {Object.entries(groupedHistory).map(([date, items]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography level='title-sm' sx={{ mb: 0.5 }}>
            {new Date(date).toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
          <Divider />
          <Stack spacing={1}>
            {items.map(record => (
              <>
                <ChoreHistoryItem
                  key={record.id}
                  time={new Date(record.performedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  name={record.choreName}
                  points={record.points}
                  status={record.status}
                />
              </>
            ))}
          </Stack>
        </Box>
      ))}
    </Container>
  )
}

const renderPieChart = (data, size, isPrimary, chartType = null) => (
  <PieChart width={size} height={size}>
    <Pie
      data={data}
      dataKey='value'
      nameKey='label'
      cx='50%'
      cy='50%'
      innerRadius={isPrimary ? size / 4 : size / 6}
      paddingAngle={5}
      cornerRadius={5}
    >
      {data.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.color} />
      ))}
    </Pie>
    {isPrimary && (
      <Tooltip
        formatter={(value, name, props) => {
          if (chartType === 'tasksTime' && props.payload.count) {
            return [`${value}h (${props.payload.count} times)`, name]
          }
          return [`${value}`, name]
        }}
      />
    )}
    {isPrimary && (
      <Legend
        layout='horizontal'
        verticalAlign='bottom'
        align='center'
        // format as : {entry.payload.label}: {value}
        iconType='circle'
        formatter={(label, value) => `${label}: ${value.payload.value}`}
      />
    )}
  </PieChart>
)

const USER_FILTER = (history, userId) => {
  if (userId === undefined || userId === 'all') return true
  return history.completedBy === userId
}

const UserActivites = () => {
  const { data: userProfile } = useUserProfile()

  const [tabValue, setTabValue] = React.useState(30)
  const [selectedHistory, setSelectedHistory] = React.useState([])
  const [enrichedHistory, setEnrichedHistory] = React.useState([])
  const [selectedChart, setSelectedChart] = React.useState('history')

  const [historyPieChartData, setHistoryPieChartData] = React.useState([])
  const [choreDuePieChartData, setChoreDuePieChartData] = React.useState([])
  const [choresAssignedChartData, setChoresAssignedChartData] = React.useState(
    [],
  )
  const [choresPriorityChartData, setChoresPriorityChartData] = React.useState(
    [],
  )
  const [choresLabelsChartData, setChoresLabelsChartData] = React.useState([])
  const [choresLabelsDurationChartData, setChoresLabelsDurationChartData] =
    React.useState([])
  const [tasksTimeChartData, setTasksTimeChartData] = React.useState([])
  const [
    choresAssigneeBreakdownChartData,
    setChoresAssigneeBreakdownChartData,
  ] = React.useState([])
  const { data: choresData, isLoading: isChoresLoading } = useChores(true)
  const {
    data: choresHistory,
    isChoresHistoryLoading,
    handleLimitChange: refetchHistory,
  } = useChoresHistory(tabValue ? tabValue : 30, true)
  const { data: circleMembersData } = useCircleMembers()
  const [selectedUser, setSelectedUser] = React.useState('all')
  const [circleUsers, setCircleUsers] = useState([])

  useEffect(() => {
    if (circleMembersData) {
      setCircleUsers(circleMembersData.res)
    }
  }, [circleMembersData])

  useEffect(() => {
    if (
      !isChoresHistoryLoading &&
      !isChoresLoading &&
      choresHistory &&
      choresData?.res
    ) {
      const enrichedHistory = choresHistory.map(item => {
        const chore = choresData.res.find(chore => chore.id === item.choreId)
        return {
          ...item,
          choreName: chore?.name,
        }
      })
      setEnrichedHistory(enrichedHistory)

      const filteredHistory = enrichedHistory.filter(h =>
        USER_FILTER(h, selectedUser),
      )
      setSelectedHistory(filteredHistory)
      setHistoryPieChartData(generateHistoryPieChartData(filteredHistory))

      // Generate labels duration chart data when both chores and history are available
      setChoresLabelsDurationChartData(
        generateChoreLabelsWithDurationChartData(
          choresData.res,
          filteredHistory,
        ),
      )

      // Generate tasks time chart data
      setTasksTimeChartData(generateTasksTimeChartData(filteredHistory))
    }
  }, [
    isChoresHistoryLoading,
    isChoresLoading,
    choresHistory,
    choresData?.res,
    selectedUser,
  ])

  useEffect(() => {
    if (!isChoresLoading && choresData) {
      // Filter chores based on selected user
      const filteredChores =
        selectedUser === 'all' || selectedUser === undefined
          ? choresData.res
          : choresData.res.filter(chore => chore.assignedTo === selectedUser)

      const generateChoreAssignedChartData = chores => {
        var assignedToMe = 0
        var assignedToOthers = 0
        chores.forEach(chore => {
          if (chore.assignedTo === userProfile?.id) {
            assignedToMe++
          } else assignedToOthers++
        })

        const group = []
        if (assignedToMe > 0) {
          group.push({
            label: `Assigned to me`,
            value: assignedToMe,
            color: TASK_COLOR.ASSIGNED_TO_ME,
            id: 1,
          })
        }
        if (assignedToOthers > 0) {
          group.push({
            label: `Assigned to others`,
            value: assignedToOthers,
            color: TASK_COLOR.ASSIGNED_TO_OTHERS,
            id: 2,
          })
        }
        return group
      }

      const generateChorePriorityPieChartData = chores => {
        const groups = ChoresGrouper('priority', chores, null)
        return groups
          .map(group => {
            return {
              label: group.name,
              value: group.content.length,
              color: group.color,
              id: group.name,
            }
          })
          .filter(item => item.value > 0)
      }

      const generateChoreLabelsChartData = chores => {
        const labelCounts = {}
        let unlabeledCount = 0

        chores.forEach(chore => {
          if (chore.labelsV2 && chore.labelsV2.length > 0) {
            chore.labelsV2.forEach(label => {
              if (labelCounts[label.id]) {
                labelCounts[label.id].count++
              } else {
                labelCounts[label.id] = {
                  label: label.name,
                  count: 1,
                  color: label.color || TASK_COLOR.ANYTIME,
                  id: label.id,
                }
              }
            })
          } else {
            unlabeledCount++
          }
        })

        const result = Object.values(labelCounts)
          .map(item => ({
            label: item.label,
            value: item.count,
            color: item.color,
            id: item.id,
          }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value) // Sort by count descending

        // Add unlabeled tasks if there are any
        if (unlabeledCount > 0) {
          result.push({
            label: 'No Labels',
            value: unlabeledCount,
            color: TASK_COLOR.ANYTIME,
            id: 'unlabeled',
          })
        }

        return result
      }

      const generateChoreAssigneeBreakdownChartData = chores => {
        const assigneeCounts = {}

        // Define a set of distinct colors for different assignees

        const assigneeColors = Object.values(COLORS)

        let colorIndex = 0

        chores.forEach(chore => {
          const assignee = circleUsers.find(
            user => user.userId === chore.assignedTo,
          )
          const assigneeName = assignee ? assignee.displayName : 'Unassigned'
          const assigneeId = chore.assignedTo || 'unassigned'

          if (assigneeCounts[assigneeId]) {
            assigneeCounts[assigneeId].count++
          } else {
            assigneeCounts[assigneeId] = {
              label: assigneeName,
              count: 1,
              color:
                assigneeId === 'unassigned'
                  ? TASK_COLOR.ANYTIME
                  : assigneeColors[colorIndex % assigneeColors.length],
              id: assigneeId,
            }
            if (assigneeId !== 'unassigned') {
              colorIndex++
            }
          }
        })

        return Object.values(assigneeCounts)
          .map(item => ({
            label: item.label,
            value: item.count,
            color: item.color,
            id: item.id,
          }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value) // Sort by count descending
      }

      const choreDuePieChartData = generateChoreDuePieChartData(filteredChores)
      setChoreDuePieChartData(choreDuePieChartData)
      setChoresAssignedChartData(generateChoreAssignedChartData(filteredChores))
      setChoresPriorityChartData(
        generateChorePriorityPieChartData(filteredChores),
      )
      setChoresLabelsChartData(generateChoreLabelsChartData(filteredChores))
      setChoresAssigneeBreakdownChartData(
        generateChoreAssigneeBreakdownChartData(filteredChores),
      )
    }
  }, [isChoresLoading, choresData, userProfile?.id, circleUsers, selectedUser])

  const generateChoreLabelsWithDurationChartData = (chores, history) => {
    const labelDurations = {}
    let unlabeledDuration = 0

    // Iterate through ChoreHistory to get actual time spent
    history.forEach(historyItem => {
      const duration = historyItem.duration || 0 // duration in seconds from ChoreHistory

      // Find the corresponding chore to get its labels
      const chore = chores.find(c => c.id === historyItem.choreId)

      if (chore && chore.labelsV2 && chore.labelsV2.length > 0) {
        // If chore has labels, add duration to each label
        chore.labelsV2.forEach(label => {
          if (labelDurations[label.id]) {
            labelDurations[label.id].duration += duration
          } else {
            labelDurations[label.id] = {
              label: label.name,
              duration: duration,
              color: label.color || TASK_COLOR.ANYTIME,
              id: label.id,
            }
          }
        })
      } else {
        // If chore has no labels or chore not found, add to unlabeled
        unlabeledDuration += duration
      }
    })

    // Convert seconds to hours for better readability
    const result = Object.values(labelDurations)
      .map(item => ({
        label: item.label,
        value: Math.round((item.duration / 3600) * 10) / 10, // Convert to hours and round to 1 decimal
        color: item.color,
        id: item.id,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value) // Sort by duration descending

    // Add unlabeled tasks duration if there is any
    if (unlabeledDuration > 0) {
      result.push({
        label: 'No Labels',
        value: Math.round((unlabeledDuration / 3600) * 10) / 10, // Convert to hours and round to 1 decimal
        color: TASK_COLOR.ANYTIME,
        id: 'unlabeled',
      })
    }

    return result
  }

  const generateTasksTimeChartData = history => {
    const taskDurations = {}
    const colorValues = Object.values(COLORS)

    // Iterate through ChoreHistory to get actual time spent per task
    history.forEach(historyItem => {
      const duration = historyItem.duration || 0 // duration in seconds from ChoreHistory
      const taskName = historyItem.choreName || 'Unknown Task'

      if (taskDurations[taskName]) {
        taskDurations[taskName].duration += duration
        taskDurations[taskName].count += 1
      } else {
        taskDurations[taskName] = {
          taskName: taskName,
          duration: duration,
          count: 1,
        }
      }
    })

    // Convert seconds to hours and prepare chart data
    const result = Object.values(taskDurations)
      .map((item, index) => ({
        label: item.taskName,
        value: Math.round((item.duration / 3600) * 10) / 10, // Convert to hours and round to 1 decimal
        count: item.count,
        color: colorValues[index % colorValues.length],
        id: item.taskName,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value) // Sort by time spent descending
      .slice(0, 10) // Show top 10 tasks only

    return result
  }

  const generateChoreDuePieChartData = chores => {
    const groups = ChoresGrouper('due_date', chores, null)
    return groups
      .map(group => {
        return {
          label: group.name,
          value: group.content.length,
          color: group.color,
          id: group.name,
        }
      })
      .filter(item => item.value > 0)
  }

  const generateHistoryPieChartData = history => {
    const totalCompleted =
      history.filter(item => item.dueDate > item.performedAt).length || 0
    const totalLate =
      history.filter(item => item.dueDate < item.performedAt).length || 0
    const totalNoDueDate = history.filter(item => !item.dueDate).length || 0

    return [
      {
        label: `On time`,
        value: totalCompleted,
        color: TASK_COLOR.COMPLETED,
        id: 1,
      },
      {
        label: `Late`,
        value: totalLate,
        color: TASK_COLOR.LATE,
        id: 2,
      },
      {
        label: `Completed`,
        value: totalNoDueDate,
        color: TASK_COLOR.ANYTIME,
        id: 3,
      },
    ]
  }
  if (isChoresHistoryLoading || isChoresLoading) {
    return <LoadingComponent />
  }
  const chartData = {
    history: {
      data: historyPieChartData,
      title: 'Status',
      description: 'Completed tasks status',
    },
    due: {
      data: choreDuePieChartData,
      title: 'Due Date',
      description: 'Current tasks due date',
    },
    // assigned: {
    //   data: choresAssignedChartData,
    //   title: 'Assigned to me',
    //   description: 'Tasks assigned to you vs others',
    // },
    priority: {
      data: choresPriorityChartData,
      title: 'Priority',
      description: 'Tasks by priority',
    },
    labels: {
      data: choresLabelsChartData,
      title: 'Labels',
      description: 'Tasks by labels',
    },
    labelsDuration: {
      data: choresLabelsDurationChartData,
      title: 'Labels (time)',
      description: 'Time spent by labels (hours)',
    },
    tasksTime: {
      data: tasksTimeChartData,
      title: 'Tasks (time)',
      description: 'Time spent by individual tasks (hours)',
    },
    assigneeBreakdown: {
      data: choresAssigneeBreakdownChartData,
      title: 'by Assignee',
      description: 'Tasks grouped by assignee',
    },
  }
  if (!userProfile) {
    return <LoadingComponent />
  }
  if (!choresData.res?.length > 0 || !choresHistory?.length > 0) {
    return (
      <Container
        maxWidth='md'
        sx={{
          textAlign: 'center',
          display: 'flex',
          // make sure the content is centered vertically:
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '50vh',
        }}
      >
        <EventBusy
          sx={{
            fontSize: '6rem',
            mb: 1,
          }}
        />

        <Typography level='h3' gutterBottom>
          No activities
        </Typography>
        <Typography level='body1'>
          You have no activities for the selected period.
        </Typography>
        <Button variant='soft' sx={{ mt: 2 }}>
          <Link to='/my/chores'>Go back to chores</Link>
        </Button>
      </Container>
    )
  }

  return (
    <Container
      maxWidth='xl'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2, sm: 3 },
      }}
    >
      <Typography
        mb={3}
        level='h4'
        sx={{
          alignSelf: 'flex-start',
        }}
      >
        Activities Overview
      </Typography>

      {/* Main Content Area - Mobile: Stack vertically, Desktop: Side by side */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          alignItems: 'flex-start',
        }}
      >
        {/* Left Side - Timeline with Filters (Mobile: Full width, Desktop: Flexible) */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {/* Improved Filter Bar - Now above timeline */}
          <Card
            variant='outlined'
            sx={{
              width: '100%',
              p: 2,
              mb: 3,
              borderRadius: 12,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Stack spacing={2}>
              <Typography level='title-sm' sx={{ color: 'text.secondary' }}>
                Filter Activities
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                {/* User Filter */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography level='body-sm' sx={{ mb: 1, fontWeight: 500 }}>
                    Show activities for:
                  </Typography>
                  <Select
                    sx={{
                      width: '100%',
                    }}
                    variant='outlined'
                    value={selectedUser}
                    onChange={(e, selected) => {
                      setSelectedUser(selected)
                      setSelectedHistory(
                        enrichedHistory.filter(h => USER_FILTER(h, selected)),
                      )
                    }}
                    renderValue={() => {
                      if (
                        selectedUser === undefined ||
                        selectedUser === 'all'
                      ) {
                        return (
                          <Typography
                            startDecorator={
                              <Avatar color='primary' size='sm'>
                                <Group />
                              </Avatar>
                            }
                          >
                            All Users
                          </Typography>
                        )
                      }
                      return (
                        <Typography
                          startDecorator={
                            <Avatar
                              color='primary'
                              size='sm'
                              src={resolvePhotoURL(
                                circleUsers.find(
                                  user => user.userId === selectedUser,
                                )?.image,
                              )}
                            >
                              {circleUsers
                                .find(user => user.userId === selectedUser)
                                ?.displayName?.charAt(0)}
                            </Avatar>
                          }
                        >
                          {
                            circleUsers.find(
                              user => user.userId === selectedUser,
                            )?.displayName
                          }
                        </Typography>
                      )
                    }}
                  >
                    <Option value='all'>
                      <Typography
                        startDecorator={
                          <Avatar color='primary' size='sm'>
                            <Group />
                          </Avatar>
                        }
                      >
                        All Users
                      </Typography>
                    </Option>
                    {circleUsers.map(user => (
                      <Option key={user.userId} value={user.userId}>
                        <Avatar
                          color='primary'
                          size='sm'
                          src={resolvePhotoURL(user.image)}
                        >
                          {user.displayName?.charAt(0)}
                        </Avatar>
                        <Typography>{user.displayName}</Typography>
                        <Chip
                          color='success'
                          size='sm'
                          variant='soft'
                          startDecorator={<Toll />}
                        >
                          {user.points - user.pointsRedeemed}
                        </Chip>
                      </Option>
                    ))}
                  </Select>
                </Box>

                {/* Time Period Filter */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography level='body-sm' sx={{ mb: 1, fontWeight: 500 }}>
                    Time period:
                  </Typography>
                  <Tabs
                    onChange={(e, tabValue) => {
                      setTabValue(tabValue)
                      refetchHistory(tabValue)
                    }}
                    value={tabValue}
                    sx={{
                      borderRadius: 8,
                      backgroundColor: 'background.surface',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <TabList
                      disableUnderline
                      sx={{
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                        p: 0.5,
                        gap: 0.5,
                      }}
                    >
                      {[
                        { label: '7 Days', value: 7 },
                        { label: '30 Days', value: 30 },
                        { label: '90 Days', value: 90 },
                        { label: 'All Time', value: 365 },
                      ].map((tab, index) => (
                        <Tab
                          key={index}
                          sx={{
                            borderRadius: 6,
                            minWidth: 'auto',
                            px: 2,
                            py: 1,
                            fontSize: 'sm',
                            fontWeight: 500,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                              color: 'primary.plainColor',
                              backgroundColor: 'primary.softBg',
                              fontWeight: 600,
                            },
                            '&:hover': {
                              backgroundColor: 'neutral.softHoverBg',
                            },
                          }}
                          disableIndicator
                          value={tab.value}
                        >
                          {tab.label}
                        </Tab>
                      ))}
                    </TabList>
                  </Tabs>
                </Box>
              </Stack>
            </Stack>
          </Card>

          {/* Current Filter Summary */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              Showing activities for{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'primary.500' }}
              >
                {selectedUser === undefined || selectedUser === 'all'
                  ? 'All Users'
                  : circleUsers.find(user => user.userId === selectedUser)
                      ?.displayName || 'Unknown User'}
              </Typography>{' '}
              over the{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'primary.500' }}
              >
                {tabValue === 365 ? 'All Time' : `Last ${tabValue} Days`}
              </Typography>
            </Typography>
          </Box>

          <ChoreHistoryTimeline history={selectedHistory} />
        </Box>

        {/* Right Sidebar - Charts (Mobile: Full width, Desktop: Fixed width + sticky) */}
        <Box
          sx={{
            width: { xs: '100%', lg: '350px' },
            position: { xs: 'static', lg: 'sticky' },
            top: { lg: '20px' },
            alignSelf: { lg: 'flex-start' },
            maxHeight: { lg: 'calc(100vh - 40px)' },
            overflowY: { lg: 'auto' },
            order: { xs: -1, lg: 1 }, // Show charts first on mobile, last on desktop
          }}
        >
          {/* Charts Container */}
          <Card
            variant='outlined'
            sx={{
              p: 2,
              borderRadius: 12,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Stack spacing={3}>
              {/* Main Chart */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: { lg: '400px' },
                }}
              >
                <Typography level='h4' textAlign='center' sx={{ mb: 1 }}>
                  {chartData[selectedChart].title}
                </Typography>
                <Typography level='body-xs' textAlign='center' sx={{ mb: 2 }}>
                  {chartData[selectedChart].description}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {renderPieChart(
                    chartData[selectedChart].data,
                    240,
                    true,
                    selectedChart,
                  )}
                </Box>
              </Box>

              <Divider />

              {/* Chart Selection Grid */}
              <Box>
                <Grid container spacing={1}>
                  {Object.entries(chartData)
                    .filter(([key]) => key !== selectedChart)
                    .map(([key, { data, title }]) => (
                      <Grid
                        item
                        key={key}
                        xs={4}
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Card
                          onClick={() => setSelectedChart(key)}
                          variant='plain'
                          sx={{
                            cursor: 'pointer',
                            p: 1,
                            transition: 'all 0.2s ease-in-out',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 80,
                            maxWidth: 90,
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: 'sm',
                            },
                          }}
                        >
                          <Typography
                            textAlign='center'
                            level='body-xs'
                            sx={{
                              mb: 0.5,
                              fontSize: '0.65rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {title}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {renderPieChart(data, 70, false)}
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            </Stack>
          </Card>
        </Box>
      </Box>
    </Container>
  )
}

export default UserActivites
