import {
  AccessTime,
  CalendarMonth,
  Check,
  Checklist,
  Close,
  EventBusy,
  EventNote,
  HourglassEmpty,
  Person,
  Redo,
  RunningWithErrors,
  Schedule,
  Search,
  Sort,
  Style,
  ThumbDown,
  Toll,
  Tune,
} from '@mui/icons-material'
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'

import EmptyState from '../../components/common/EmptyState'
import FilterBar from '../../components/common/FilterBar'
import SortAndFilterMenu from '../../components/common/SortAndFilterMenu'
import { useLocalization } from '../../contexts/LocalizationContext'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
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
import { isPlusHistoryWindow } from '../../utils/entitlements'
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

const PERIODS = [
  { value: 7, label: '7' },
  { value: 30, label: '30' },
  { value: 90, label: '90', plus: true },
  { value: 365, label: '∞', plus: true },
]

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const AnalyticsChart = ({ chart, chartType, t }) => {
  const data = chart.data.filter(item => item.value > 0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const isDuration = ['labelsDuration', 'tasksTime'].includes(chartType)
  // Donuts stop being useful once the slices become difficult to compare.
  // Due-date and high-cardinality breakdowns use ranked bars instead.
  const useBarBreakdown = chartType === 'due' || data.length > 5

  if (data.length === 0) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 250,
        }}
      >
        <Typography level='body-sm' textColor='text.secondary'>
          {t('charts.noData')}
        </Typography>
      </Box>
    )
  }

  if (useBarBreakdown) {
    const maxValue = Math.max(...data.map(item => item.value))

    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            alignItems: 'baseline',
            display: 'flex',
            gap: 1,
            mb: 2.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {Math.round(total * 10) / 10}
            {isDuration ? 'h' : ''}
          </Typography>
          <Typography level='body-sm' textColor='text.secondary'>
            {chart.title}
          </Typography>
        </Box>

        <Stack
          spacing={1.75}
          sx={{
            maxHeight: 380,
            overflowY: data.length > 8 ? 'auto' : 'visible',
            pr: data.length > 8 ? 1 : 0,
            scrollbarColor: 'var(--joy-palette-neutral-300) transparent',
            scrollbarWidth: 'thin',
          }}
        >
          {data.map(item => (
            <Box key={item.id ?? item.label} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  alignItems: 'baseline',
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'space-between',
                  mb: 0.625,
                }}
              >
                <Typography level='body-sm' noWrap title={item.label}>
                  {item.label}
                </Typography>
                <Typography level='body-sm' sx={{ fontWeight: 650 }}>
                  {item.value}
                  {isDuration ? 'h' : ''}
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: 'background.level1',
                  borderRadius: '999px',
                  height: 8,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    bgcolor: item.color,
                    borderRadius: 'inherit',
                    height: '100%',
                    minWidth: 4,
                    transition: 'width 300ms ease',
                    width: `${(item.value / maxValue) * 100}%`,
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                    },
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'grid',
        gap: { xs: 2, sm: 4 },
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(240px, 0.85fr) 1fr' },
        minHeight: 280,
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
        <PieChart width={240} height={240}>
          <Pie
            data={data}
            dataKey='value'
            nameKey='label'
            cx='50%'
            cy='50%'
            outerRadius={104}
            innerRadius={76}
            paddingAngle={data.length > 1 ? 3 : 0}
            cornerRadius={7}
            minAngle={4}
            stroke='none'
          >
            {data.map(entry => (
              <Cell key={entry.id ?? entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value}${isDuration ? 'h' : ''}`,
              name,
            ]}
            contentStyle={{
              background: 'var(--joy-palette-background-surface)',
              border: '1px solid var(--joy-palette-divider)',
              borderRadius: 10,
              boxShadow: 'var(--joy-shadow-md)',
              fontSize: 12,
            }}
          />
        </PieChart>
        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {Math.round(total * 10) / 10}
            {isDuration ? 'h' : ''}
          </Typography>
          <Typography level='body-xs' textColor='text.tertiary'>
            {chart.title}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1.5} sx={{ minWidth: 0, width: '100%' }}>
        {data.map(item => {
          const percentage = total ? (item.value / total) * 100 : 0
          return (
            <Box key={item.id ?? item.label} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  alignItems: 'baseline',
                  display: 'flex',
                  gap: 1,
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: item.color,
                      borderRadius: '50%',
                      flex: '0 0 auto',
                      height: 8,
                      width: 8,
                    }}
                  />
                  <Typography level='body-sm' noWrap>
                    {item.label}
                  </Typography>
                </Box>
                <Typography level='body-sm' sx={{ fontWeight: 650 }}>
                  {item.value}
                  {isDuration ? 'h' : ''}
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: 'background.level1',
                  borderRadius: '999px',
                  height: 5,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    bgcolor: item.color,
                    borderRadius: 'inherit',
                    height: '100%',
                    width: `${Math.max(percentage, 2)}%`,
                  }}
                />
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

const USER_FILTER = (history, userId) => {
  if (userId === undefined || userId === 'all') return true
  return history.completedBy === userId
}

const UserActivites = () => {
  const { t } = useTranslation('history')
  const { data: userProfile } = useUserProfile()
  const { isPlus, showPaywall } = usePaywall()
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

  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('activitiesSortBy') || 'date',
  )
  const [sortDirection, setSortDirection] = useState(
    () => localStorage.getItem('activitiesSortDirection') || 'desc',
  )
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('activitiesSortBy', sortBy)
    localStorage.setItem('activitiesSortDirection', sortDirection)
  }, [sortBy, sortDirection])

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

  const fuse = useMemo(
    () =>
      new Fuse(filteredTimeline, {
        keys: ['choreName', 'notes'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [filteredTimeline],
  )

  const sortedTimeline = useMemo(() => {
    const matched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : filteredTimeline

    const direction = sortDirection === 'desc' ? -1 : 1
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (
            direction * (a.choreName || '').localeCompare(b.choreName || '')
          )
        case 'status':
          return direction * ((a.status ?? 0) - (b.status ?? 0))
        case 'points':
          return direction * ((a.points ?? 0) - (b.points ?? 0))
        case 'date':
        default: {
          const aTime = new Date(
            a.performedAt || a.updatedAt || a.createdAt,
          ).getTime()
          const bTime = new Date(
            b.performedAt || b.updatedAt || b.createdAt,
          ).getTime()
          return direction * (aTime - bTime)
        }
      }
    })
  }, [fuse, searchTerm, filteredTimeline, sortBy, sortDirection])

  const handleSearchChange = e => setSearchTerm(e.target.value)

  const handleSearchClose = () => {
    setSearchTerm('')
    searchInputRef.current?.blur()
  }

  const filterActiveCount =
    (tabValue !== 7 ? 1 : 0) +
    (selectedUser !== 'all' ? 1 : 0) +
    Object.keys(clientActiveFilters).length

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

  const handlePeriodChange = days => {
    if (!isPlus && isPlusHistoryWindow(days)) {
      showPaywall(PAYWALL_REASON.HISTORY_WINDOW)
      return
    }
    setTabValue(days)
    refetchHistory(days)
  }

  const handleSetFilter = (id, value) => {
    if (id === 'completedBy') {
      const userId = value ?? 'all'
      setSelectedUser(userId)
      setSelectedHistory(enrichedHistory.filter(h => USER_FILTER(h, userId)))
    } else if (id === 'timePeriod') {
      handlePeriodChange(value ?? 7)
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
      maxWidth='md'
      sx={{ px: { xs: 2, sm: 3 }, pb: 6, pt: { xs: 1, sm: 2 } }}
    >
      <Box
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            level='h2'
            sx={{
              fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
              letterSpacing: '-0.028em',
              lineHeight: 1.15,
            }}
          >
            {t('activities.title')}
          </Typography>
          <Typography
            level='body-sm'
            textColor='text.secondary'
            sx={{ mt: 0.5, maxWidth: 520, textWrap: 'pretty' }}
          >
            {t('activities.subtitle')}
          </Typography>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(event, value) => handlePeriodChange(value)}
          size='sm'
          sx={{ bgcolor: 'background.level1', borderRadius: 'lg', p: 0.5 }}
        >
          <TabList disableUnderline sx={{ gap: 0.25 }}>
            {PERIODS.map(period => (
              <Tab
                key={period.value}
                value={period.value}
                disableIndicator
                sx={{
                  borderRadius: 'md',
                  minWidth: 42,
                  px: 1.25,
                  '&.Mui-selected': {
                    bgcolor: 'background.surface',
                    boxShadow: 'sm',
                  },
                }}
              >
                {period.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </Box>

      <Box
        component='section'
        sx={{ display: { xs: 'none', sm: 'block' }, mb: 4 }}
      >
        <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
          <Box
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              justifyContent: 'space-between',
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography level='title-md' sx={{ fontWeight: 650 }}>
                {chartData[selectedChart].title}
              </Typography>
              <Typography level='body-xs' textColor='text.tertiary'>
                {chartData[selectedChart].description}
              </Typography>
            </Box>
            <Select
              value={selectedChart}
              onChange={(event, value) => value && setSelectedChart(value)}
              size='sm'
              variant='soft'
              aria-label={chartData[selectedChart].title}
              sx={{
                minWidth: { xs: '100%', sm: 190 },
                '--Select-radius': 'var(--joy-radius-md)',
              }}
            >
              {Object.entries(chartData).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value.title}
                </Option>
              ))}
            </Select>
          </Box>
          <Divider />
          <AnalyticsChart
            chart={chartData[selectedChart]}
            chartType={selectedChart}
            t={t}
          />
        </Sheet>
      </Box>

      <Box component='section'>
        <Box
          sx={{
            alignItems: 'baseline',
            display: 'flex',
            justifyContent: 'space-between',
            mb: 1.25,
          }}
        >
          <Typography level='title-md' sx={{ fontWeight: 650 }}>
            {t('title.activity')}
          </Typography>
          <Typography level='body-xs' textColor='text.tertiary'>
            {sortedTimeline.length} / {selectedHistory.length}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Input
            slotProps={{ input: { ref: searchInputRef } }}
            placeholder={t('activities.searchPlaceholder')}
            value={searchTerm}
            fullWidth
            sx={{
              borderRadius: 24,
              height: 24,
              borderColor: 'text.disabled',
              padding: 1,
            }}
            onChange={handleSearchChange}
            startDecorator={<Search />}
            endDecorator={
              searchTerm && (
                <IconButton
                  variant='plain'
                  size='sm'
                  onClick={handleSearchClose}
                  sx={{ borderRadius: '50%' }}
                >
                  <Close />
                </IconButton>
              )
            }
          />
          <SortAndFilterMenu
            icon={<Sort />}
            sortOptions={[
              { name: t('activities.sort.date'), value: 'date' },
              { name: t('activities.sort.name'), value: 'name' },
              { name: t('activities.sort.status'), value: 'status' },
              { name: t('activities.sort.points'), value: 'points' },
            ]}
            selectedSort={sortBy}
            onSortChange={setSortBy}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            isActive={sortBy !== 'date' || sortDirection !== 'desc'}
          />
          <Badge
            badgeContent={filterActiveCount || null}
            color='primary'
            size='sm'
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <IconButton
              onClick={() => setFilterBarOpen(true)}
              variant='outlined'
              color={filterActiveCount > 0 ? 'primary' : 'neutral'}
              size='sm'
              sx={{ height: 32, width: 32, borderRadius: '50%', flexShrink: 0 }}
              aria-label={t('common:filterBar.filtersButton')}
            >
              <Tune />
            </IconButton>
          </Badge>
        </Box>
      </Box>

      <FilterBar
        filterDefs={filterDefs}
        activeFilters={activeFilters}
        onSetFilter={handleSetFilter}
        onClearAll={handleClearAll}
        resultCount={sortedTimeline.length}
        totalCount={selectedHistory.length}
        showTrigger={false}
        open={filterBarOpen}
        onOpenChange={setFilterBarOpen}
      />

      {/* Conditional Content Based on Data Availability */}
      {!choresData.res?.length || !choresHistory?.length ? (
        <EmptyState
          variant='no-results'
          fullHeight
          icon={<EventBusy />}
          title={t('activities.emptyTitle')}
          description={
            selectedUser === undefined || selectedUser === 'all'
              ? t('activities.emptyDescriptionEveryone', {
                  period:
                    tabValue === 365
                      ? t('activities.periodSoFar')
                      : t('activities.periodLastDays', { count: tabValue }),
                })
              : t('activities.emptyDescriptionMember', {
                  name:
                    circleUsers.find(user => user.userId === selectedUser)
                      ?.displayName || t('activities.unknownMember'),
                  period:
                    tabValue === 365
                      ? t('activities.periodSoFar')
                      : t('activities.periodLastDays', { count: tabValue }),
                })
          }
          primaryAction={{ label: t('empty.backToTasks'), to: '/chores' }}
        />
      ) : (
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <ChoreHistoryTimeline
            history={sortedTimeline}
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
