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
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  List,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useConfirmationModal from '../../hooks/useConfirmationModal'
import { ChoreHistoryStatus } from '../../utils/Chores'
import {
  useChoreHistory,
  useDeleteChoreHistory,
  useUpdateChoreHistory,
} from '../../queries/ChoreQueries'
import { useCircleMembers } from '../../queries/UserQueries'
import LoadingComponent from '../components/Loading'
import EditHistoryModal from '../Modals/EditHistoryModal'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import HistoryCard from './HistoryCard'

const ChoreHistory = () => {
  const [userHistory, setUserHistory] = useState([])
  const [historyInfo, setHistoryInfo] = useState([])
  const { choreId } = useParams()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editHistory, setEditHistory] = useState({})
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()

  // React Query hooks
  const { data: choreHistoryData, isLoading } = useChoreHistory(choreId)
  const { data: circleMembersData } = useCircleMembers()
  const updateChoreHistory = useUpdateChoreHistory()
  const deleteChoreHistory = useDeleteChoreHistory()

  const choreHistory = choreHistoryData?.res || []
  const performers = circleMembersData?.res || []

  const handleDelete = historyEntry => {
    showConfirmation(
      `Are you sure you want to delete this history record?`,
      'Delete History Record',
      () => {
        deleteChoreHistory.mutate({
          choreId,
          historyId: historyEntry.id,
        })
      },
      'Delete',
      'Cancel',
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
        text: 'All Completed',
        subtext: `${histories.filter(h => h.status === ChoreHistoryStatus.COMPLETED).length} times`,
      },
      {
        icon: <TrendingUp />,
        text: 'Average Timing',
        subtext: moment.duration(averageDelayMoment).isValid()
          ? moment.duration(averageDelayMoment).humanize()
          : 'On time',
      },
      {
        icon: <Timelapse />,
        text: 'Longest Delay',
        subtext: moment.duration(maxDelayMoment).isValid()
          ? moment.duration(maxDelayMoment).humanize()
          : 'Never late',
      },
      {
        icon: <Star />,
        text: 'Completed Most',
        subtext: `${
          performers.find(p => p.userId === Number(userCompletedByMost))
            ?.displayName || 'Unknown'
        }`,
      },
      {
        icon: <Group />,
        text: 'Members Involved',
        subtext: `${Object.keys(userHistories).length} members`,
      },
      {
        icon: <Analytics />,
        text: 'Last Completed',
        subtext: `${
          performers.find(p => p.userId === Number(histories[0].completedBy))
            ?.displayName || 'Unknown'
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
          No History Yet
        </Typography>
        <Typography level='body1'>
          You haven't completed any tasks. Once you start finishing tasks,
          they'll show up here.
        </Typography>
        <Button variant='soft' sx={{ mt: 2 }}>
          <Link to='/chores'>Go back to chores</Link>
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
            Task Summary
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
          Task Activity
        </Typography>
      </Box>
      <Sheet variant='plain' sx={{ borderRadius: 'sm', boxShadow: 'md' }}>
        {/* Chore History List (Updated Style) */}

        <List sx={{ p: 0 }}>
          {choreHistory.map((historyEntry, index) => (
            <HistoryCard
              onClick={() => handleEdit(historyEntry)}
              onEditClick={handleEdit}
              onDeleteClick={handleDelete}
              historyEntry={historyEntry}
              performers={performers}
              allHistory={choreHistory}
              key={index}
              index={index}
            />
          ))}
        </List>
      </Sheet>
      <EditHistoryModal
        config={{
          isOpen: isEditModalOpen,
          onClose: () => {
            setIsEditModalOpen(false)
          },
          onSave: updated => {
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
                  setEditHistory(data.res)
                  setIsEditModalOpen(false)
                },
                onError: error => {
                  console.error('Failed to update chore history:', error)
                },
              },
            )
          },
          onDelete: () => {
            deleteChoreHistory.mutate(
              {
                choreId,
                historyId: editHistory.id,
              },
              {
                onSuccess: () => {
                  setIsEditModalOpen(false)
                },
              },
            )
          },
        }}
        historyRecord={editHistory}
      />
      <ConfirmationModal config={confirmModalConfig} />
    </Container>
  )
}

export default ChoreHistory
