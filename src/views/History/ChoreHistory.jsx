import '@meauxt/react-swipeable-list/dist/styles.css'

import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type as ListType,
} from '@meauxt/react-swipeable-list'
import {
  Analytics,
  CalendarMonth,
  Check,
  Checklist,
  EventBusy,
  EventNote,
  FilterList,
  Group,
  History,
  HourglassEmpty,
  Person,
  Redo,
  RunningWithErrors,
  Schedule,
  Star,
  ThumbDown,
  Timelapse,
  TrendingUp,
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { Box, Card, Container, Grid, Sheet, Typography } from '@mui/joy'
import moment from 'moment'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import FilterBar from '../../components/common/FilterBar'
import { useLocalization } from '../../contexts/LocalizationContext'
import useConfirmationModal from '../../hooks/useConfirmationModal'
import { useFilter } from '../../hooks/useFilter'
import { usePendingCommands } from '../../hooks/usePendingCommands'
import {
  useChoreHistory,
  useDeleteChoreHistory,
  useUpdateChoreHistory,
} from '../../queries/ChoreQueries'
import { useCircleMembers } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { ChoreHistoryStatus } from '../../utils/Chores'
import LoadingComponent from '../components/Loading'
import EditHistoryModal from '../Modals/EditHistoryModal'
import HistoryDetailModal from '../Modals/HistoryDetailModal'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import NoteViewerModal from '../Modals/Inputs/NoteViewerModal'
import HistoryCard from './HistoryCard'

const ChoreHistory = () => {
  const { t } = useTranslation('history')
  const [userHistory, setUserHistory] = useState([])
  const [historyInfo, setHistoryInfo] = useState([])
  const { choreId } = useParams()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editHistory, setEditHistory] = useState(null)
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()
  const { fmt } = useLocalization()
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [noteViewerConfig, setNoteViewerConfig] = useState({ isOpen: false })
  const [detailModalConfig, setDetailModalConfig] = useState({ isOpen: false })
  const { showError, showSuccess } = useNotification()
  // React Query hooks
  const { data: choreHistoryData, isLoading } = useChoreHistory(choreId)
  const { data: circleMembersData } = useCircleMembers()
  const updateChoreHistory = useUpdateChoreHistory()
  const deleteChoreHistory = useDeleteChoreHistory()
  const { data: pendingCmds } = usePendingCommands(choreId)

  const choreHistory = choreHistoryData?.res || []
  const performers = circleMembersData?.res || []
  const pendingByHistoryId = useMemo(() => {
    if (!pendingCmds?.length) return {}
    return pendingCmds.reduce((acc, cmd) => {
      if (
        cmd.commandType !== 'update_chore_history' &&
        cmd.commandType !== 'delete_chore_history'
      ) {
        return acc
      }
      const historyId =
        cmd?.payload?.historyId ?? Number(String(cmd.entityId).split(':')[1])
      if (!historyId) return acc
      if (!acc[historyId]) acc[historyId] = []
      acc[historyId].push(cmd)
      return acc
    }, {})
  }, [pendingCmds])

  const filterDefs = useMemo(
    () => [
      {
        id: 'status',
        label: t('charts.status.title'),
        type: 'multi-select',
        icon: <FilterList />,
        options: [
          {
            value: ChoreHistoryStatus.COMPLETED,
            label: t('status.completed'),
            color: 'success',
            icon: <Check sx={{ fontSize: 14 }} />,
          },
          {
            value: ChoreHistoryStatus.SKIPPED,
            label: t('status.skipped'),
            color: 'warning',
            icon: <Redo sx={{ fontSize: 14 }} />,
          },
          {
            value: ChoreHistoryStatus.PENDING_APPROVAL,
            label: t('filter.pending'),
            color: 'neutral',
            icon: <HourglassEmpty sx={{ fontSize: 14 }} />,
          },
          {
            value: ChoreHistoryStatus.REJECTED,
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
      {
        id: 'hasNotes',
        label: t('filter.hasNotes'),
        type: 'boolean',
        icon: <EventNote />,
        filterFn: item => !!item.notes,
      },
      {
        id: 'completedBy',
        label: t('filter.completedBy'),
        type: 'multi-select',
        icon: <Person />,
        options: performers.map(p => ({
          value: p.userId,
          label: p.displayName,
          avatar: p.image,
        })),
        filterFn: (item, values) => values.includes(item.completedBy),
      },
      {
        id: 'dateRange',
        label: t('filter.completedAt'),
        type: 'date-range',
        icon: <CalendarMonth />,
        filterFn: (item, value) => {
          const performed = new Date(item.performedAt || item.updatedAt)
          if (value.from && performed < new Date(value.from)) return false
          if (value.to && performed > new Date(value.to)) return false
          return true
        },
      },
    ],
    [performers],
  )

  const {
    activeFilterCount,
    activeFilters,
    clearAll,
    filteredData: filteredHistory,
    setFilter,
  } = useFilter(choreHistory, filterDefs)

  const sortedHistory = useMemo(
    () =>
      [...filteredHistory].sort(
        (a, b) =>
          new Date(b.performedAt || b.updatedAt) -
          new Date(a.performedAt || a.updatedAt),
      ),
    [filteredHistory],
  )

  const handleDelete = historyEntry => {
    showConfirmation(
      t('delete.message'),
      t('delete.title'),
      () => {
        deleteChoreHistory.mutate({
          choreId,
          historyId: historyEntry.id,
        })
      },
      t('common:delete'),
      t('common:cancel'),
      'danger',
    )
  }

  const handleEdit = historyEntry => {
    setIsEditModalOpen(true)
    setEditHistory(historyEntry)
  }

  useEffect(() => {
    if (choreHistory.length > 0 && performers.length > 0) {
      const newUserChoreHistory = {}
      choreHistory.forEach(historyEntry => {
        const userId = historyEntry.completedBy
        newUserChoreHistory[userId] = (newUserChoreHistory[userId] || 0) + 1
      })
      setUserHistory(newUserChoreHistory)
      updateHistoryInfo(choreHistory, newUserChoreHistory, performers)
    }
  }, [choreHistory, performers])

  const updateHistoryInfo = (histories, userHistories, performers) => {
    // average delay for task completaion from due date:

    const averageDelay =
      histories.reduce((acc, chore) => {
        if (chore.dueDate && chore.performedAt) {
          // Only consider chores with a due date
          return acc + moment(chore.performedAt).diff(chore.dueDate, 'hours')
        }
        return acc
      }, 0) / histories.filter(chore => chore.dueDate).length
    const averageDelayMoment = moment.duration(averageDelay, 'hours')
    const maximumDelay = histories.reduce((acc, chore) => {
      if (chore.dueDate) {
        // Only consider chores with a due date
        const delay = moment(chore.performedAt).diff(chore.dueDate, 'hours')
        return delay > acc ? delay : acc
      }
      return acc
    }, 0)

    const maxDelayMoment = moment.duration(maximumDelay, 'hours')

    // find max value in userHistories:
    const userCompletedByMost = Object.keys(userHistories).reduce((a, b) =>
      userHistories[a] > userHistories[b] ? a : b,
    )

    const historyInfo = [
      {
        icon: <Checklist />,
        text: t('info.allCompleted'),
        subtext: t('info.timesSuffix', {
          count: histories.filter(
            h =>
              h.status === ChoreHistoryStatus.COMPLETED ||
              h.status === ChoreHistoryStatus.SKIPPED,
          ).length,
        }),
      },
      {
        icon: <TrendingUp />,
        text: t('info.averageTiming'),
        subtext: moment.duration(averageDelayMoment).isValid()
          ? moment.duration(averageDelayMoment).humanize()
          : t('info.onTime'),
      },
      {
        icon: <Timelapse />,
        text: t('info.longestDelay'),
        subtext: moment.duration(maxDelayMoment).isValid()
          ? moment.duration(maxDelayMoment).humanize()
          : t('info.neverLate'),
      },
      {
        icon: <Star />,
        text: t('info.completedMost'),
        subtext: `${
          performers.find(p => p.userId === Number(userCompletedByMost))
            ?.displayName || t('info.unknown')
        }`,
      },
      {
        icon: <Group />,
        text: t('info.membersInvolved'),
        subtext: t('info.membersSuffix', {
          count: Object.keys(userHistories).length,
        }),
      },
      {
        icon: <Analytics />,
        text: t('info.lastCompleted'),
        subtext: `${
          performers.find(p => p.userId === Number(histories[0].completedBy))
            ?.displayName || t('info.unknown')
        }`,
      },
    ]

    setHistoryInfo(historyInfo)
  }

  if (isLoading) {
    return <LoadingComponent />
  }
  if (!choreHistory.length) {
    return (
      <Container maxWidth='md'>
        <EmptyState
          fullHeight
          icon={<EventBusy />}
          title={t('empty.title')}
          description={t('empty.description')}
          primaryAction={{ label: t('empty.backToTasks'), to: '/chores' }}
        />
      </Container>
    )
  }

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      {/* Enhanced Header Section */}
      <Box sx={{ gap: 2, p: 2 }}>
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}> */}
        {/* Statistics Cards Grid - Compact Design */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <History sx={{ fontSize: '1.5rem' }} />
          <Typography
            level='title-md'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('title.summary')}
          </Typography>
        </Box>
        <Grid container spacing={0.5} sx={{ mb: 2 }}>
          {historyInfo.map((info, index) => (
            <Grid item xs={4} sm={2} key={index}>
              <Card
                variant='soft'
                sx={{
                  borderRadius: 'sm',
                  p: 1,
                  height: 85,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ opacity: 0.8, flexShrink: 0 }}>{info.icon}</Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.25,
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: '600',
                      color: 'text.primary',
                      textAlign: 'center',
                      lineHeight: 1.1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      fontSize: '0.75rem',
                    }}
                  >
                    {info.text}
                  </Typography>
                  <Typography
                    level='body-xs'
                    sx={{
                      color: 'text.secondary',
                      textAlign: 'center',
                      lineHeight: 1.1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      fontSize: '0.7rem',
                    }}
                  >
                    {info.subtext || '--'}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* History Section Header */}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <Analytics sx={{ fontSize: '1.5rem' }} />
        <Typography
          level='title-md'
          sx={{ fontWeight: 'lg', color: 'text.primary' }}
        >
          {t('title.activity')}
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <FilterBar
          filterDefs={filterDefs}
          activeFilters={activeFilters}
          onSetFilter={setFilter}
          onClearAll={clearAll}
          resultCount={filteredHistory.length}
          totalCount={choreHistory.length}
        />
      </Box>
      {sortedHistory.length === 0 && activeFilterCount > 0 && (
        <EmptyState
          variant='no-results'
          icon={<FilterList />}
          title={t('empty.noResultsTitle')}
          description={t('empty.noResultsDescription')}
          primaryAction={{ label: t('noResults.clear'), onClick: clearAll }}
        />
      )}

      {sortedHistory.length > 0 && (
        <Sheet variant='plain' sx={{ borderRadius: 'sm', overflow: 'hidden' }}>
          {/* Chore History List (Updated Style) */}

          <SwipeableList type={ListType.IOS} fullSwipe={false}>
            {sortedHistory.map((historyEntry, index) => (
              <SwipeableListItem
                key={historyEntry.id || index}
                swipeActionOpen={
                  showMoreInfoId === (historyEntry.id || index)
                    ? 'trailing'
                    : null
                }
                trailingActions={
                  <TrailingActions>
                    <Box
                      sx={{
                        display: 'flex',
                        boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                        zIndex: 0,
                      }}
                    >
                      <SwipeAction onClick={() => handleEdit(historyEntry)}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'neutral.softBg',
                            color: 'neutral.700',
                            px: 3,
                            height: '100%',
                            width: '100%',
                          }}
                        >
                          <EditIcon sx={{ fontSize: 20 }} />
                          <Typography level='body-xs' sx={{ mt: 0.5 }}>
                            {t('common:edit')}
                          </Typography>
                        </Box>
                      </SwipeAction>
                      <SwipeAction onClick={() => handleDelete(historyEntry)}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'danger.softBg',
                            color: 'danger.700',
                            px: 3,
                            height: '100%',
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 20 }} />
                          <Typography level='body-xs' sx={{ mt: 0.5 }}>
                            {t('common:delete')}
                          </Typography>
                        </Box>
                      </SwipeAction>
                    </Box>
                  </TrailingActions>
                }
              >
                <HistoryCard
                  historyEntry={historyEntry}
                  performers={performers}
                  allHistory={choreHistory}
                  index={index}
                  onViewDetails={() => {
                    setDetailModalConfig({
                      isOpen: true,
                      entry: historyEntry,
                      performers,
                      onClose: () => setDetailModalConfig({ isOpen: false }),
                      onEdit: record => {
                        setDetailModalConfig({ isOpen: false })
                        setEditHistory(record)
                        setIsEditModalOpen(true)
                      },
                    })
                  }}
                  pendingCommands={pendingByHistoryId[historyEntry.id] || []}
                  onViewNote={notes => {
                    setNoteViewerConfig({
                      isOpen: true,
                      title: t('noteViewer.updatedAt', {
                        date: fmt.dateTime(historyEntry.updatedAt),
                      }),
                      content: notes,
                      onClose: () => setNoteViewerConfig({ isOpen: false }),
                    })
                  }}
                  onToggleActions={() => {
                    const id = historyEntry.id || index
                    if (showMoreInfoId === id) {
                      setShowMoreInfoId(null)
                    } else {
                      setShowMoreInfoId(id)
                    }
                  }}
                />
              </SwipeableListItem>
            ))}
          </SwipeableList>
        </Sheet>
      )}
      <EditHistoryModal
        config={{
          isOpen: isEditModalOpen,
          onClose: () => {
            setIsEditModalOpen(false)
            setEditHistory(null)
          },
          onSave: updated => {
            if (!editHistory?.id) return
            updateChoreHistory.mutate(
              {
                choreId,
                historyId: editHistory.id,
                historyData: {
                  performedAt: updated.performedAt,
                  dueDate: updated.dueDate,
                  notes: updated.notes,
                },
              },
              {
                onSuccess: data => {
                  setIsEditModalOpen(false)
                  setEditHistory(null)
                  if (data?.queued) {
                    showSuccess({
                      title: t('toast.updateQueued.title'),
                      message: t('toast.updateQueued.message'),
                    })
                  } else {
                    showSuccess({
                      title: t('toast.updated.title'),
                      message: t('toast.updated.message'),
                    })
                  }
                },
                onError: error => {
                  console.error('Failed to update chore history:', error)
                },
              },
            )
          },
          onDelete: () => {
            if (!editHistory?.id) return
            deleteChoreHistory.mutate(
              {
                choreId,
                historyId: editHistory.id,
              },
              {
                onSuccess: data => {
                  setIsEditModalOpen(false)
                  setEditHistory(null)
                  if (data?.queued) {
                    showSuccess({
                      title: t('toast.deleteQueued.title'),
                      message: t('toast.deleteQueued.message'),
                    })
                  } else {
                    showSuccess({
                      title: t('toast.deleted.title'),
                      message: t('toast.deleted.message'),
                    })
                  }
                },
              },
            )
          },
        }}
        historyRecord={editHistory}
      />
      <ConfirmationModal config={confirmModalConfig} />
      <NoteViewerModal config={noteViewerConfig} />
      <HistoryDetailModal config={detailModalConfig} />
    </Container>
  )
}

export default ChoreHistory
