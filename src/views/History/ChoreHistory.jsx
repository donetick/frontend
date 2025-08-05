import {
  Analytics,
  Checklist,
  EventBusy,
  Group,
  Star,
  Timelapse,
  TrendingUp,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
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
    const userCompletedByLeast = Object.keys(userHistories).reduce((a, b) =>
      userHistories[a] < userHistories[b] ? a : b,
    )

    const historyInfo = [
      {
        icon: <Checklist />,
        text: 'Total Completed',
        subtext: `${histories.length} times`,
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
        text: 'Maximum Delay',
        subtext: moment.duration(maxDelayMoment).isValid()
          ? moment.duration(maxDelayMoment).humanize()
          : 'Never late',
      },
      {
        icon: <Star />,
        text: 'Top Performer',
        subtext: `${
          performers.find(p => p.userId === Number(userCompletedByMost))
            ?.displayName || 'Unknown'
        }`,
      },
      {
        icon: <Group />,
        text: 'Team Members',
        subtext: `${Object.keys(userHistories).length} active`,
      },
      {
        icon: <Analytics />,
        text: 'Last Completed By',
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
        {/* Statistics Cards Grid */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {historyInfo.map((info, index) => (
            <Grid item xs={6} sm={6} key={index}>
              <Card
                variant='soft'
                sx={{
                  borderRadius: 'md',
                  boxShadow: 1,
                  px: 2,
                  py: 1,
                  minHeight: 90,
                  height: '100%',
                  justifyContent: 'start',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'start',
                      mb: 0.5,
                    }}
                  >
                    {info.icon}
                    <Typography
                      level='body-md'
                      sx={{
                        ml: 1,
                        fontWeight: '500',
                        color: 'text.primary',
                      }}
                    >
                      {info.text}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      level='body-sm'
                      sx={{ color: 'text.secondary', lineHeight: 1.5 }}
                    >
                      {info.subtext || '--'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* History Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Analytics sx={{ fontSize: '1.5rem', color: 'primary.500' }} />
        <Typography level='h4' sx={{ fontWeight: 'lg', color: 'text.primary' }}>
          Completion History
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
