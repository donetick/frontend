import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CircleIcon from '@mui/icons-material/Circle'
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'

import { EventBusy, Toll } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import React, { useEffect } from 'react'
import { UserContext } from '../../contexts/UserContext'
import { useChores, useChoresHistory } from '../../queries/ChoreQueries'
import { ChoresGrouper } from '../../utils/Chores'
import { TASK_COLOR } from '../../utils/Colors.jsx'
import LoadingComponent from '../components/Loading'

const groupByDate = history => {
  const aggregated = {}
  for (let i = 0; i < history.length; i++) {
    const item = history[i]
    const date = new Date(item.completedAt).toLocaleDateString()
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
                  time={new Date(record.completedAt).toLocaleTimeString([], {
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

const renderPieChart = (data, size, isPrimary) => (
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
    {isPrimary && <Tooltip />}
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

const UserActivites = () => {
  const { userProfile } = React.useContext(UserContext)
  const [tabValue, setTabValue] = React.useState(30)
  const [selectedHistory, setSelectedHistory] = React.useState([])
  const [selectedChart, setSelectedChart] = React.useState('history')

  const [historyPieChartData, setHistoryPieChartData] = React.useState([])
  const [choreDuePieChartData, setChoreDuePieChartData] = React.useState([])
  const [choresAssignedChartData, setChoresAssignedChartData] = React.useState(
    [],
  )
  const [choresPriorityChartData, setChoresPriorityChartData] = React.useState(
    [],
  )
  const { data: choresData, isLoading: isChoresLoading } = useChores(true)
  const {
    data: choresHistory,
    isChoresHistoryLoading,
    handleLimitChange: refetchHistory,
  } = useChoresHistory(tabValue ? tabValue : 30, false)
  useEffect(() => {
    if (!isChoresHistoryLoading && !isChoresLoading && choresHistory) {
      const enrichedHistory = choresHistory.res.map(item => {
        const chore = choresData.res.find(chore => chore.id === item.choreId)
        return {
          ...item,
          choreName: chore?.name,
        }
      })

      setSelectedHistory(enrichedHistory)
      setHistoryPieChartData(generateHistoryPieChartData(enrichedHistory))
    }
  }, [isChoresHistoryLoading, isChoresLoading, choresHistory])

  useEffect(() => {
    if (!isChoresLoading && choresData) {
      const choreDuePieChartData = generateChoreDuePieChartData(choresData.res)
      setChoreDuePieChartData(choreDuePieChartData)
      setChoresAssignedChartData(generateChoreAssignedChartData(choresData.res))
      setChoresPriorityChartData(
        generateChorePriorityPieChartData(choresData.res),
      )
    }
  }, [isChoresLoading, choresData])

  const generateChoreAssignedChartData = chores => {
    var assignedToMe = 0
    var assignedToOthers = 0
    chores.forEach(chore => {
      if (chore.assignedTo === userProfile.id) {
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

  const generateChoreDuePieChartData = chores => {
    const groups = ChoresGrouper('due_date', chores)
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
  const generateChorePriorityPieChartData = chores => {
    const groups = ChoresGrouper('priority', chores)
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
      history.filter(item => item.dueDate > item.completedAt).length || 0
    const totalLate =
      history.filter(item => item.dueDate < item.completedAt).length || 0
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
  const COLORS = historyPieChartData.map(item => item.color)
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
    assigned: {
      data: choresAssignedChartData,
      title: 'Assignee',
      description: 'Tasks assigned to you vs others',
    },
    priority: {
      data: choresPriorityChartData,
      title: 'Priority',
      description: 'Tasks by priority',
    },
  }

  if (!choresData.res?.length > 0 || !choresHistory?.res?.length > 0) {
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
      maxWidth='md'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Tabs
        onChange={(e, tabValue) => {
          setTabValue(tabValue)
          refetchHistory(tabValue)
        }}
        defaultValue={7}
        sx={{
          py: 0.5,
          borderRadius: 16,
          maxWidth: 400,
          mb: 1,
        }}
      >
        <TabList
          disableUnderline
          sx={{
            borderRadius: 16,
            backgroundColor: 'background.paper',
            boxShadow: 1,
            justifyContent: 'space-evenly',
          }}
        >
          {[
            { label: '7 Days', value: 7 },
            { label: '30 Days', value: 30 },
            { label: '90 Days', value: 90 },
          ].map((tab, index) => (
            <Tab
              key={index}
              sx={{
                borderRadius: 16,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'text.primary',
                  backgroundColor: 'primary.light',
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
      <Box sx={{ mb: 4 }}>
        <Typography level='h4' textAlign='center'>
          {chartData[selectedChart].title}
        </Typography>
        <Typography level='body-xs' textAlign='center'>
          {chartData[selectedChart].description}
        </Typography>
        {renderPieChart(chartData[selectedChart].data, 250, true)}
      </Box>
      <Grid container spacing={1}>
        {Object.entries(chartData)
          .filter(([key]) => key !== selectedChart)
          .map(([key, { data, title }]) => (
            <Grid item key={key} xs={4}>
              <Card
                onClick={() => setSelectedChart(key)}
                sx={{ cursor: 'pointer', p: 1 }}
              >
                <Typography textAlign='center' level='body-xs' mb={-2}>
                  {title}
                </Typography>
                {renderPieChart(data, 75, false)}
              </Card>
            </Grid>
          ))}
      </Grid>
      <ChoreHistoryTimeline history={selectedHistory} />
    </Container>
  )
}

export default UserActivites
