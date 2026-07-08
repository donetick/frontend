import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import {
  Analytics,
  Checklist,
  EventBusy,
  Group,
  History,
  Star,
  Timelapse,
  TrendingUp,
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { Box, Button, Card, Container, Grid, Sheet, Typography } from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useLocalization } from '../../contexts/LocalizationContext'
import useConfirmationModal from '../../hooks/useConfirmationModal'
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
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import NoteViewerModal from '../Modals/Inputs/NoteViewerModal'
import HistoryCard from './HistoryCard'

const ChoreHistory = () => {
  const { t } = useTranslation(['history', 'common'])
  const [userHistory, setUserHistory] = useState([])
  const [historyInfo, setHistoryInfo] = useState([])
  const { choreId } = useParams()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editHistory, setEditHistory] = useState(null)
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()
  const { fmt } = useLocalization()
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [noteViewerConfig, setNoteViewerConfig] = useState({ isOpen: false })
  const { showSuccess, showError } = useNotification()
  // React Query hooks
  const { data: choreHistoryData, isLoading } = useChoreHistory(choreId)
  const { data: circleMembersData } = useCircleMembers()
  const updateChoreHistory = useUpdateChoreHistory()
  const deleteChoreHistory = useDeleteChoreHistory()

  const choreHistory = choreHistoryData?.res || []
  const performers = circleMembersData?.res || []

  const handleDelete = historyEntry => {
    showConfirmation(
      t('history:delete.confirm'),
      t('history:delete.title'),
      () => {
        deleteChoreHistory.mutate({
          choreId,
          historyId: historyEntry.id,
        })
      },
      t('common:actions.delete'),
      t('common:actions.cancel'),
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
        text: t('history:stats.allCompleted'),
        subtext: t('history:stats.times', {
          count: histories.filter(
            h =>
              h.status === ChoreHistoryStatus.COMPLETED ||
              h.status === ChoreHistoryStatus.SKIPPED,
          ).length,
        }),
      },
      {
        icon: <TrendingUp />,
        text: t('history:stats.averageTiming'),
        subtext: moment.duration(averageDelayMoment).isValid()
          ? moment.duration(averageDelayMoment).humanize()
          : t('history:stats.onTime'),
      },
      {
        icon: <Timelapse />,
        text: t('history:stats.longestDelay'),
        subtext: moment.duration(maxDelayMoment).isValid()
          ? moment.duration(maxDelayMoment).humanize()
          : t('history:stats.neverLate'),
      },
      {
        icon: <Star />,
        text: t('history:stats.completedMost'),
        subtext: `${
          performers.find(p => p.userId === Number(userCompletedByMost))
            ?.displayName || t('history:common.unknown')
        }`,
      },
      {
        icon: <Group />,
        text: t('history:stats.membersInvolved'),
        subtext: t('history:stats.membersCount', {
          count: Object.keys(userHistories).length,
        }),
      },
      {
        icon: <Analytics />,
        text: t('history:stats.lastCompleted'),
        subtext: `${
          performers.find(p => p.userId === Number(histories[0].completedBy))
            ?.displayName || t('history:common.unknown')
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
            // color: 'text.disabled',
            mb: 1,
          }}
        />

        <Typography level='h3' gutterBottom>
          {t('history:empty.title')}
        </Typography>
        <Typography level='body1'>
          {t('history:empty.description')}
        </Typography>
        <Button variant='soft' sx={{ mt: 2 }}>
          <Link to='/chores'>{t('history:empty.backToChores')}</Link>
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth='md'>
      {/* Enhanced Header Section */}
      <Box sx={{ mb: 4 }}>
        {/* Statistics Cards Grid - Compact Design */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <History sx={{ fontSize: '1.5rem' }} />
          <Typography
            level='title-md'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
        >
            {t('history:summaryTitle')}
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Analytics sx={{ fontSize: '1.5rem' }} />
        <Typography
          level='title-md'
          sx={{ fontWeight: 'lg', color: 'text.primary' }}
        >
          {t('history:activityTitle')}
        </Typography>
      </Box>
      <Sheet
        variant='plain'
        sx={{ borderRadius: 'sm', boxShadow: 'md', overflow: 'hidden' }}
      >
        {/* Chore History List (Updated Style) */}

        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {choreHistory.map((historyEntry, index) => (
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
                          {t('common:actions.edit')}
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
                          {t('common:actions.delete')}
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
                onViewNote={notes => {
                  setNoteViewerConfig({
                    isOpen: true,
                    title: t('history:common.updatedAt', {
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
                onSuccess: () => {
                  setIsEditModalOpen(false)
                  setEditHistory(null)
                  showSuccess({
                    title: t('history:messages.updatedTitle'),
                    message: t('history:messages.updatedMessage'),
                  })
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
                onSuccess: () => {
                  setIsEditModalOpen(false)
                  setEditHistory(null)
                  showSuccess({
                    title: t('history:messages.deletedTitle'),
                    message: t('history:messages.deletedMessage'),
                  })
                },
              },
            )
          },
        }}
        historyRecord={editHistory}
      />
      <ConfirmationModal config={confirmModalConfig} />
      <NoteViewerModal config={noteViewerConfig} />
    </Container>
  )
}

export default ChoreHistory
