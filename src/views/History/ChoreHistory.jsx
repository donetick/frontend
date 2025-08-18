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
import { LoadingScreen } from '../../components/animations'
import { ChoreHistoryStatus } from '../../utils/Chores'
import {
  DeleteChoreHistory,
  GetAllCircleMembers,
  GetChoreHistory,
  UpdateChoreHistory,
} from '../../utils/Fetcher'
import EditHistoryModal from '../Modals/EditHistoryModal'
import HistoryCard from './HistoryCard'

const ChoreHistory = () => {
  const [choreHistory, setChoresHistory] = useState([])
  const [userHistory, setUserHistory] = useState([])
  const [performers, setPerformers] = useState([])
  const [historyInfo, setHistoryInfo] = useState([])

  const [isLoading, setIsLoading] = useState(true) // Add loading state
  const { choreId } = useParams()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editHistory, setEditHistory] = useState({})

  useEffect(() => {
    setIsLoading(true) // Start loading

    Promise.all([
      GetChoreHistory(choreId).then(res => res.json()),
      GetAllCircleMembers(),
    ])
      .then(([historyData, usersData]) => {
        setChoresHistory(historyData.res)

        const newUserChoreHistory = {}
        historyData.res.forEach(choreHistory => {
          const userId = choreHistory.completedBy
          newUserChoreHistory[userId] = (newUserChoreHistory[userId] || 0) + 1
        })
        setUserHistory(newUserChoreHistory)

        setPerformers(usersData.res)
        updateHistoryInfo(historyData.res, newUserChoreHistory, usersData.res)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        // Handle errors, e.g., show an error message to the user
      })
      .finally(() => {
        setIsLoading(false) // Finish loading
      })
  }, [choreId])

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
    return <LoadingScreen message='Loading task history...' />
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
          <Link to='/my/chores'>Go back to chores</Link>
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
              onClick={() => {
                setIsEditModalOpen(true)
                setEditHistory(historyEntry)
              }}
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
            UpdateChoreHistory(choreId, editHistory.id, {
              performedAt: updated.performedAt,
              dueDate: updated.dueDate,
              notes: updated.notes,
            }).then(res => {
              if (!res.ok) {
                console.error('Failed to update chore history:', res)
                return
              }

              const newRecord = res.json().then(data => {
                const newRecord = data.res
                const newHistory = choreHistory.map(record =>
                  record.id === newRecord.id ? newRecord : record,
                )
                setChoresHistory(newHistory)
                setEditHistory(newRecord)
                setIsEditModalOpen(false)
              })
            })
          },
          onDelete: () => {
            DeleteChoreHistory(choreId, editHistory.id).then(() => {
              const newHistory = choreHistory.filter(
                record => record.id !== editHistory.id,
              )
              setChoresHistory(newHistory)
              setIsEditModalOpen(false)
            })
          },
        }}
        historyRecord={editHistory}
      />
    </Container>
  )
}

export default ChoreHistory
