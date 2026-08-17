import {
  AccessTime,
  CalendarMonth,
  Check,
  Checklist,
  EventBusy,
  EventNote,
  HourglassEmpty,
  Person,
  Redo,
  RunningWithErrors,
  Schedule,
  Style,
  ThumbDown,
  Timeline,
  Toll,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Card,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/joy'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'

import EmptyState from '../../components/common/EmptyState'
import FilterBar from '../../components/common/FilterBar'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useFilter } from '../../hooks/useFilter'
import {
  useChores,
  useChoresHistory,
  useDeleteChoreHistory,
  useUpdateChoreHistory,
} from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { ChoresGrouper } from '../../utils/Chores'
import { COLORS, TASK_COLOR } from '../../utils/Colors.jsx'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import EditHistoryModal from '../Modals/EditHistoryModal'
import HistoryDetailModal from '../Modals/HistoryDetailModal'
import NoteViewerModal from '../Modals/Inputs/NoteViewerModal'

const groupByDate = history => {
  const aggregated = {}
  for (let i = 0; i < history.length; i++) {
    const item = history[i]
    // Key by a stable local ISO day (YYYY-MM-DD) so the render-time
    // formatter (fmt.date) receives a parseable date instead of a
    // locale-formatted string, which produced "Invalid date".
    const d = new Date(item.performedAt || item.updatedAt || item.createdAt)
    const date = isNaN(d.getTime())
      ? 'unknown'
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`
    if (!aggregated[date]) {
      aggregated[date] = []
    }
    aggregated[date].push(item)
  }
  return aggregated
}

const statusConfig = {
  0: { color: 'primary', icon: <AccessTime /> },
  1: { color: 'success', icon: <Check /> },
  2: { color: 'warning', icon: <Redo /> },
  3: { color: 'neutral', icon: <HourglassEmpty /> },
  4: { color: 'danger', icon: <ThumbDown /> },
  5: { color: 'danger', icon: <RunningWithErrors /> },
  6: { color: 'warning', icon: <Schedule /> },
}

const ChoreHistoryItem = ({
  name,
  notes,
  onViewDetails,
  onViewNote,
  points,
  status,
  time,
}) => {
  const { t } = useTranslation('history')
  const cfg = statusConfig[status] ?? statusConfig[1]

  return (
    <Stack
      direction='row'
      alignItems='center'
      spacing={1}
      onClick={onViewDetails}
      sx={{
        cursor: onViewDetails ? 'pointer' : 'default',
        borderRadius: 'sm',
        '&:hover': onViewDetails
          ? { backgroundColor: 'background.level1' }
          : {},
      }}
    >
      <Typography level='body-md' sx={{ minWidth: 80 }}>
        {time}
      </Typography>
      <Avatar
        size='sm'
        color={cfg.color}
        variant='soft'
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          '& svg': { fontSize: '16px' },
        }}
      >
        {cfg.icon}
      </Avatar>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 40,
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
            {t('detail.points', { count: points })}
          </Chip>
        )}
        {notes && (
          <Chip
            size='sm'
            variant='soft'
            color='neutral'
            startDecorator={<EventNote />}
            sx={{ cursor: 'pointer' }}
            onClick={e => {
              e.stopPropagation()
              onViewNote?.(notes)
            }}
          >
            {t('detail.note')}
          </Chip>
        )}
      </Box>
    </Stack>
  )
}

const ChoreHistoryTimeline = ({
  history,
  onViewDetails,
  onViewNote,
  performers,
}) => {
  const { fmt } = useLocalization()

  const groupedHistory = groupByDate(history)

  return (
    <Box sx={{ py: 2, width: '100%' }}>
      {Object.entries(groupedHistory).map(([date, items]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography level='title-sm' sx={{ mb: 0.5 }}>
            {date === 'unknown' ? '—' : fmt.date(date)}
          </Typography>
          <Divider />
          <Stack spacing={1}>
            {items.map(record => (
              <ChoreHistoryItem
                key={record.id}
                time={fmt.time(record.performedAt || record.updatedAt)}
                name={record.choreName}
                points={record.points}
                status={record.status}
                notes={record.notes}
                onViewNote={onViewNote}
                onViewDetails={() => onViewDetails?.(record, performers)}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}

const renderPieChart = (t, data, size, isPrimary, chartType = null) => {
  // Filter out items with zero or negative values
  const validData = data.filter(item => item.value > 0)

  if (validData.length === 0) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        <Typography level='body-sm' color='neutral'>
          {t('charts.noData')}
        </Typography>
      </Box>
    )
  }

  // For primary charts, render chart and legend separately to control layout better
  if (isPrimary) {
    const chartSize = Math.min(size - 20, 220) // Reserve space and limit max size

    return (
      <Box
        sx={{
          width: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: validData.length <= 3 ? 1.5 : 2, // Smaller gap for fewer items
        }}
      >
        {/* Chart Container */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <PieChart width={chartSize} height={chartSize}>
            <Pie
              data={validData}
              dataKey='value'
              nameKey='label'
              cx='50%'
              cy='50%'
              outerRadius={chartSize / 3}
              innerRadius={chartSize / 8}
              paddingAngle={validData.length > 1 ? 2 : 0}
              cornerRadius={3}
              minAngle={5}
            >
              {validData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => {
                if (chartType === 'tasksTime' && props.payload.count) {
                  return [`${value}h (${props.payload.count} times)`, name]
                }
                return [`${value}`, name]
              }}
            />
          </PieChart>
        </Box>

        {/* Scrollable Legend Container */}
        <Box
          sx={{
            width: '100%',
            maxHeight: validData.length <= 3 ? 'auto' : '120px', // Dynamic height based on data count
            minHeight: validData.length <= 3 ? 'auto' : '60px', // No minimum height for few items
            overflowY: validData.length <= 3 ? 'visible' : 'auto', // No scroll for few items
            overflowX: 'hidden',
            px: 1,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'neutral.100',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'neutral.400',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: 'neutral.500',
              },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            {validData.map((entry, index) => (
              <Chip
                key={`legend-${index}`}
                size='sm'
                variant='soft'
                sx={{
                  // backgroundColor: `${entry.color}20`, // 20% opacity
                  // borderColor: entry.color,
                  // border: '1px solid',
                  color: 'text.primary',
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 1,
                  maxWidth: '100%',
                  '&:hover': {
                    backgroundColor: `${entry.color}30`, // 30% opacity on hover
                  },
                }}
                startDecorator={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      backgroundColor: entry.color,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                }
              >
                <Typography
                  level='body-xs'
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px',
                  }}
                  title={`${entry.label}: ${entry.value}${
                    chartType === 'tasksTime' && entry.count
                      ? ` (${entry.count} times)`
                      : ''
                  }${
                    chartType === 'labelsDuration' || chartType === 'tasksTime'
                      ? 'h'
                      : ''
                  }`}
                >
                  {entry.label}: {entry.value}
                  {chartType === 'tasksTime' && entry.count
                    ? ` (${entry.count}x)`
                    : ''}
                  {chartType === 'labelsDuration' || chartType === 'tasksTime'
                    ? 'h'
                    : ''}
                </Typography>
              </Chip>
            ))}
          </Box>
        </Box>
      </Box>
    )
  }

  // For small preview charts, keep it simple without legend
  return (
    <PieChart width={size} height={size}>
      <Pie
        data={validData}
        dataKey='value'
        nameKey='label'
        cx='50%'
        cy='50%'
        outerRadius={size / 3.5}
        innerRadius={size / 8}
        paddingAngle={validData.length > 1 ? 1 : 0}
        cornerRadius={2}
      >
        {validData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  )
}

const USER_FILTER = (history, userId) => {
  if (userId === undefined || userId === 'all') return true
  return history.completedBy === userId
}

const UserActivites = () => {
  const { t } = useTranslation('history')
  const { data: userProfile } = useUserProfile()

  const [tabValue, setTabValue] = React.useState(7)
  const [selectedHistory, setSelectedHistory] = React.useState([])
  const [enrichedHistory, setEnrichedHistory] = React.useState([])
  const [selectedChart, setSelectedChart] = React.useState('history')
  const [noteViewerConfig, setNoteViewerConfig] = useState({ isOpen: false })
  const [detailModalConfig, setDetailModalConfig] = useState({ isOpen: false })
  const [editModalConfig, setEditModalConfig] = useState({ isOpen: false })
  const [editHistoryRecord, setEditHistoryRecord] = useState(null)
  const updateChoreHistory = useUpdateChoreHistory()
  const deleteChoreHistory = useDeleteChoreHistory()

  const [historyPieChartData, setHistoryPieChartData] = React.useState([])
  const [choreDuePieChartData, setChoreDuePieChartData] = React.useState([])
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
  const { data: userLabels } = useLabels()
  const { data: choresData, isLoading: isChoresLoading } = useChores(true)
  const {
    data: choresHistory,
    handleLimitChange: refetchHistory,
    isChoresHistoryLoading,
  } = useChoresHistory(tabValue ? tabValue : 30, true)
  const { data: circleMembersData } = useCircleMembers()
  const [selectedUser, setSelectedUser] = React.useState('all')
  const [circleUsers, setCircleUsers] = useState([])

  useEffect(() => {
    if (circleMembersData) {
      setCircleUsers(circleMembersData.res)
    }
  }, [circleMembersData])

  // Client-side filters applied on top of the user+time-window slice
  const clientFilterDefs = useMemo(
    () => [
      {
        id: 'status',
        label: t('filter.status'),
        type: 'multi-select',
        icon: <Checklist />,
        options: [
          {
            value: 1,
            label: t('status.completed'),
            color: 'success',
            icon: <Check sx={{ fontSize: 14 }} />,
          },
          {
            value: 2,
            label: t('status.skipped'),
            color: 'warning',
            icon: <Redo sx={{ fontSize: 14 }} />,
          },
          {
            value: 3,
            label: t('filter.pending'),
            color: 'neutral',
            icon: <HourglassEmpty sx={{ fontSize: 14 }} />,
          },
          {
            value: 4,
            label: t('status.rejected'),
            color: 'danger',
            icon: <ThumbDown sx={{ fontSize: 14 }} />,
          },
          {
            value: 5,
            label: t('status.missed'),
            color: 'danger',
            icon: <RunningWithErrors sx={{ fontSize: 14 }} />,
          },
          {
            value: 6,
            label: t('status.rescheduled'),
            color: 'warning',
            icon: <Schedule sx={{ fontSize: 14 }} />,
          },
        ],
        filterFn: (item, values) => values.includes(item.status),
      },
      ...(userLabels?.length > 0
        ? [
            {
              id: 'label',
              label: t('filter.labels'),
              type: 'multi-select',
              icon: <Style />,
              options: userLabels.map(l => ({
                value: l.id,
                label: l.name,
                icon: (
                  <Box
                    component='span'
                    sx={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: l.color || '#90a4ae',
                      flexShrink: 0,
                    }}
                  />
                ),
              })),
              filterFn: (item, values) =>
                item.labelsV2?.some(l => values.includes(l.id)) ?? false,
            },
          ]
        : []),
      {
        id: 'hasNotes',
        label: t('filter.hasNotes'),
        type: 'boolean',
        icon: <EventNote />,
        filterFn: item => !!item.notes,
      },
      {
        id: 'hasPoints',
        label: t('filter.hasPoints'),
        type: 'boolean',
        icon: <Toll />,
        filterFn: item => (item.points ?? 0) > 0,
      },
    ],
    [userLabels, t],
  )

  const {
    activeFilters: clientActiveFilters,
    clearAll: clearClientFilters,
    filteredData: filteredTimeline,
    setFilter: setClientFilter,
  } = useFilter(selectedHistory, clientFilterDefs)

  // All filter defs merged for FilterBar display
  const filterDefs = useMemo(
    () => [
      {
        id: 'timePeriod',
        label: t('filter.timePeriod'),
        type: 'single-select',
        icon: <CalendarMonth />,
        defaultValue: 7,
        options: [
          { value: 7, label: t('period.days', { count: 7 }) },
          { value: 30, label: t('period.days', { count: 30 }) },
          { value: 90, label: t('period.days', { count: 90 }) },
          { value: 365, label: t('period.allTime') },
        ],
      },
      {
        id: 'completedBy',
        label: t('filter.user'),
        type: 'single-select',
        icon: <Person />,
        options: circleUsers.map(u => ({
          value: u.userId,
          label: u.displayName,
          avatar: u.image,
        })),
      },
      ...clientFilterDefs,
    ],
    [circleUsers, clientFilterDefs, t],
  )

  // Merge server-driven and client-driven active filter states for the bar
  const activeFilters = useMemo(
    () => ({
      timePeriod: tabValue,
      ...(selectedUser !== 'all' ? { completedBy: selectedUser } : {}),
      ...clientActiveFilters,
    }),
    [tabValue, selectedUser, clientActiveFilters],
  )

  const handleSetFilter = (id, value) => {
    if (id === 'completedBy') {
      const userId = value ?? 'all'
      setSelectedUser(userId)
      setSelectedHistory(enrichedHistory.filter(h => USER_FILTER(h, userId)))
    } else if (id === 'timePeriod') {
      const days = value ?? 7
      setTabValue(days)
      refetchHistory(days)
    } else {
      setClientFilter(id, value)
    }
  }

  const handleClearAll = () => {
    setSelectedUser('all')
    setSelectedHistory(enrichedHistory)
    setTabValue(7)
    refetchHistory(7)
    clearClientFilters()
  }

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
          labelsV2: chore?.labelsV2,
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
    } else {
      // Reset data when loading or no data
      setEnrichedHistory([])
      setSelectedHistory([])
      setHistoryPieChartData([])
      setChoresLabelsDurationChartData([])
      setTasksTimeChartData([])
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
            label: t('charts.noLabels'),
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
          const assigneeName = assignee
            ? assignee.displayName
            : t('charts.unassigned')
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
    if (!chores || !history || chores.length === 0 || history.length === 0) {
      return []
    }

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
        label: t('charts.noLabels'),
        value: Math.round((unlabeledDuration / 3600) * 10) / 10, // Convert to hours and round to 1 decimal
        color: TASK_COLOR.ANYTIME,
        id: 'unlabeled',
      })
    }

    return result
  }

  const generateTasksTimeChartData = history => {
    if (!history || history.length === 0) {
      return []
    }

    const taskDurations = {}
    const colorValues = Object.values(COLORS)

    // Iterate through ChoreHistory to get actual time spent per task
    history.forEach(historyItem => {
      const duration = historyItem.duration || 0 // duration in seconds from ChoreHistory
      const taskName = historyItem.choreName || t('charts.unknownTask')

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
    if (!chores || chores.length === 0) {
      return []
    }

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
    if (!history || history.length === 0) {
      return []
    }

    const totalCompleted =
      history.filter(item => item.dueDate > item.performedAt).length || 0
    const totalLate =
      history.filter(item => item.dueDate < item.performedAt).length || 0
    const totalNoDueDate = history.filter(item => !item.dueDate).length || 0

    const result = []

    if (totalCompleted > 0) {
      result.push({
        label: t('badge.onTimeLabel'),
        value: totalCompleted,
        color: TASK_COLOR.COMPLETED,
        id: 1,
      })
    }

    if (totalLate > 0) {
      result.push({
        label: t('charts.late'),
        value: totalLate,
        color: TASK_COLOR.LATE,
        id: 2,
      })
    }

    if (totalNoDueDate > 0) {
      result.push({
        label: t('status.completed'),
        value: totalNoDueDate,
        color: TASK_COLOR.ANYTIME,
        id: 3,
      })
    }

    return result
  }
  if (isChoresHistoryLoading || isChoresLoading) {
    return <LoadingComponent />
  }
  const chartData = {
    history: {
      data: historyPieChartData || [],
      title: t('charts.status.title'),
      description: t('charts.status.description'),
    },
    due: {
      data: choreDuePieChartData || [],
      title: t('charts.due.title'),
      description: t('charts.due.description'),
    },
    // assigned: {
    //   data: choresAssignedChartData,
    //   title: t('chores:sort.assignedToMe'),
    //   description: 'Tasks assigned to you vs others',
    // },
    priority: {
      data: choresPriorityChartData || [],
      title: t('charts.priority.title'),
      description: t('charts.priority.description'),
    },
    labels: {
      data: choresLabelsChartData || [],
      title: t('charts.labels.title'),
      description: t('charts.labels.description'),
    },
    labelsDuration: {
      data: choresLabelsDurationChartData || [],
      title: t('charts.labelsDuration.title'),
      description: t('charts.labelsDuration.description'),
    },
    tasksTime: {
      data: tasksTimeChartData || [],
      title: t('charts.tasksTime.title'),
      description: t('charts.tasksTime.description'),
    },
    assigneeBreakdown: {
      data: choresAssigneeBreakdownChartData || [],
      title: t('charts.assigneeBreakdown.title'),
      description: t('charts.assigneeBreakdown.description'),
    },
  }
  if (!userProfile) {
    return <LoadingComponent />
  }
  // Calculate activities analytics
  return (
    <Container
      maxWidth='lg'
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Timeline sx={{ fontSize: '1.5rem' }} />
        <Typography
          level='title-md'
          sx={{ fontWeight: 'lg', color: 'text.primary' }}
        >
          {t('activities.title')}
        </Typography>
      </Box>

      <FilterBar
        filterDefs={filterDefs}
        activeFilters={activeFilters}
        onSetFilter={handleSetFilter}
        onClearAll={handleClearAll}
        resultCount={filteredTimeline.length}
        totalCount={selectedHistory.length}
      />

      {/* Conditional Content Based on Data Availability */}
      {!choresData.res?.length > 0 || !choresHistory?.length > 0 ? (
        <EmptyState
          variant='no-results'
          fullHeight
          icon={<EventBusy />}
          title='No activity in this range'
          description={`Nothing was completed by ${
            selectedUser === undefined || selectedUser === 'all'
              ? 'anyone in your circle'
              : circleUsers.find(user => user.userId === selectedUser)
                  ?.displayName || 'this member'
          } ${
            tabValue === 365 ? 'so far' : `in the last ${tabValue} days`
          }. Try a wider time range or a different member.`}
          primaryAction={{ label: 'Back to tasks', to: '/chores' }}
        />
      ) : (
        <>
          {/* Main Content Area - Mobile: Stack vertically, Desktop: Side by side */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 3,
              alignItems: 'flex-start',
            }}
          >
            {/* Left Side - Timeline (Mobile: Full width, Desktop: Flexible) */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <ChoreHistoryTimeline
                history={filteredTimeline}
                performers={circleUsers}
                onViewNote={notes => {
                  setNoteViewerConfig({
                    isOpen: true,
                    title: t('detail.note'),
                    content: notes,
                    onClose: () => setNoteViewerConfig({ isOpen: false }),
                  })
                }}
                onViewDetails={(entry, performers) => {
                  setDetailModalConfig({
                    isOpen: true,
                    entry,
                    performers,
                    onClose: () => setDetailModalConfig({ isOpen: false }),
                    onEdit: record => {
                      setDetailModalConfig(prev => ({ ...prev, isOpen: false }))
                      setEditHistoryRecord(record)
                      setEditModalConfig({
                        isOpen: true,
                        onClose: () => {
                          setEditModalConfig({ isOpen: false })
                          setEditHistoryRecord(null)
                        },
                        onSave: updated => {
                          updateChoreHistory.mutate(
                            {
                              choreId: record.choreId,
                              historyId: record.id,
                              historyData: {
                                performedAt: updated.performedAt,
                                dueDate: updated.dueDate,
                                notes: updated.notes,
                              },
                            },
                            {
                              onSuccess: () => {
                                setEditModalConfig({ isOpen: false })
                                setEditHistoryRecord(null)
                              },
                            },
                          )
                        },
                        onDelete: () => {
                          deleteChoreHistory.mutate(
                            { choreId: record.choreId, historyId: record.id },
                            {
                              onSuccess: () => {
                                setEditModalConfig({ isOpen: false })
                                setEditHistoryRecord(null)
                              },
                            },
                          )
                        },
                      })
                    },
                  })
                }}
              />
            </Box>

            {/* Right Sidebar - Charts (Desktop only, hidden on mobile) */}
            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: '350px',
                position: 'sticky',
                top: '60px',
                alignSelf: 'flex-start',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
              }}
            >
              {/* Charts Container */}
              <Card
                variant='plain'
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'sm',
                  borderRadius: 20,
                  width: { xs: '100%', lg: '315px' },
                  mr: { xs: 0, lg: 10 },
                  mb: 1,
                }}
              >
                <Stack spacing={3}>
                  {/* Main Chart */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'center',
                      minHeight: {
                        lg:
                          chartData[selectedChart].data.length <= 3
                            ? '350px'
                            : '450px',
                      }, // Dynamic height based on legend needs
                      maxHeight: {
                        lg:
                          chartData[selectedChart].data.length <= 3
                            ? '400px'
                            : '500px',
                      },
                    }}
                  >
                    <Typography level='h4' textAlign='center' sx={{ mb: 1 }}>
                      {chartData[selectedChart].title}
                    </Typography>
                    <Typography
                      level='body-xs'
                      textAlign='center'
                      sx={{ mb: 2 }}
                    >
                      {chartData[selectedChart].description}
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        width: '100%',
                      }}
                    >
                      {renderPieChart(
                        t,
                        chartData[selectedChart].data,
                        300, // Increased size for better chart container
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
                                {renderPieChart(t, data, 70, false)}
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
        </>
      )}
      <NoteViewerModal config={noteViewerConfig} />
      <HistoryDetailModal config={detailModalConfig} />
      <EditHistoryModal
        config={editModalConfig}
        historyRecord={editHistoryRecord}
      />
    </Container>
  )
}

export default UserActivites
