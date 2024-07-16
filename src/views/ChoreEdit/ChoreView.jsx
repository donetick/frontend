import {
  CalendarMonth,
  CancelScheduleSend,
  Check,
  Checklist,
  History,
  PeopleAlt,
  Person,
  SwitchAccessShortcut,
  Timelapse,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  FormControl,
  Grid,
  Input,
  ListItem,
  ListItemContent,
  Sheet,
  Snackbar,
  styled,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  GetAllUsers,
  GetChoreDetailById,
  MarkChoreComplete,
  SkipChore,
} from '../../utils/Fetcher'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
const IconCard = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0f0f0', // Adjust the background color as needed
  borderRadius: '50%',
  minWidth: '40px',
  height: '40px',
  marginRight: '16px',
})
const ChoreView = () => {
  const [chore, setChore] = useState({})
  const navigate = useNavigate()
  const [performers, setPerformers] = useState([])
  const [infoCards, setInfoCards] = useState([])
  const { choreId } = useParams()
  const [note, setNote] = useState(null)

  const [searchParams] = useSearchParams()

  const [isPendingCompletion, setIsPendingCompletion] = useState(false)
  const [timeoutId, setTimeoutId] = useState(null)
  const [secondsLeftToCancel, setSecondsLeftToCancel] = useState(null)
  const [completedDate, setCompletedDate] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  useEffect(() => {
    Promise.all([
      GetChoreDetailById(choreId).then(resp => {
        if (resp.ok) {
          return resp.json().then(data => {
            setChore(data.res)
          })
        }
      }),
      GetAllUsers()
        .then(response => response.json())
        .then(data => {
          setPerformers(data.res)
        }),
    ])
    const auto_complete = searchParams.get('auto_complete')
    if (auto_complete === 'true') {
      handleTaskCompletion()
    }
  }, [])
  useEffect(() => {
    if (chore && performers.length > 0) {
      generateInfoCards(chore)
    }
  }, [chore, performers])

  const generateInfoCards = chore => {
    const cards = [
      {
        size: 6,
        icon: <PeopleAlt />,
        text: 'Assigned To',
        subtext: performers.find(p => p.id === chore.assignedTo)?.displayName,
      },
      {
        size: 6,
        icon: <CalendarMonth />,
        text: 'Due Date',
        subtext: chore.nextDueDate
          ? moment(chore.nextDueDate).fromNow()
          : 'N/A',
      },

      //   {
      //     icon: <TextFields />,
      //     text: 'Frequency',
      //     subtext:
      //       chore.frequencyType.charAt(0).toUpperCase() +
      //       chore.frequencyType.slice(1),
      //   },
      {
        size: 6,
        icon: <Checklist />,
        text: 'Total Completed',
        subtext: `${chore.totalCompletedCount} times`,
      },
      {
        size: 6,
        icon: <Timelapse />,
        text: 'Last Completed',
        subtext:
          // chore.lastCompletedDate &&
          // moment(chore.lastCompletedDate).format('MM/DD/YYYY hh:mm A'),
          chore.lastCompletedDate && moment(chore.lastCompletedDate).fromNow(),
      },
      {
        size: 6,
        icon: <Person />,
        text: 'Last Performer',
        subtext: chore.lastCompletedDate
          ? `${
              performers.find(p => p.id === chore.lastCompletedBy)?.displayName
            }`
          : 'Never',
      },
      {
        size: 6,
        icon: <Person />,
        text: 'Created By',
        subtext: performers.find(p => p.id === chore.createdBy)?.displayName,
      },
      // {
      //   size: 12,
      //   icon: <Note />,
      //   text: 'Recent Note',
      //   subtext: chore.notes || '--',
      // },
    ]
    setInfoCards(cards)
  }
  const handleTaskCompletion = () => {
    setIsPendingCompletion(true)
    let seconds = 3 // Starting countdown from 3 seconds
    setSecondsLeftToCancel(seconds)

    const countdownInterval = setInterval(() => {
      seconds -= 1
      setSecondsLeftToCancel(seconds)

      if (seconds <= 0) {
        clearInterval(countdownInterval) // Stop the countdown when it reaches 0
      }
    }, 1000)

    const id = setTimeout(() => {
      MarkChoreComplete(choreId, note, completedDate)
        .then(resp => {
          if (resp.ok) {
            return resp.json().then(data => {
              setNote(null)
              setChore(data.res)
            })
          }
        })
        .then(() => {
          setIsPendingCompletion(false)
          clearTimeout(id)
          clearInterval(countdownInterval) // Ensure to clear this interval as well
          setTimeoutId(null)
          setSecondsLeftToCancel(null)
        })
        .then(() => {
          // refetch the chore details
          GetChoreDetailById(choreId).then(resp => {
            if (resp.ok) {
              return resp.json().then(data => {
                setChore(data.res)
              })
            }
          })
        })
    }, 3000)

    setTimeoutId(id)
  }
  const handleSkippingTask = () => {
    SkipChore(choreId).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          setChore(newChore)
        })
      }
    })
  }
  return (
    <Container
      maxWidth='sm'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // space between :
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography
          level='h3'
          // textAlign={'center'}
          sx={{
            mt: 2,
            mb: 1,
          }}
        >
          {chore.name}
        </Typography>
        <Chip startDecorator={<CalendarMonth />} size='lg' sx={{ mb: 4 }}>
          {chore.nextDueDate
            ? `Due at ${moment(chore.nextDueDate).format('MM/DD/YYYY hh:mm A')}`
            : 'N/A'}
        </Chip>
      </Box>
      <Box>
        <Typography level='title-md' sx={{ mb: 1 }}>
          Details
        </Typography>

        <Sheet
          sx={{
            mb: 1,
            borderRadius: 'lg',
            p: 2,
          }}
          variant='outlined'
        >
          <Grid container spacing={1}>
            {infoCards.map((detail, index) => (
              <Grid item xs={4} key={index}>
                {/* divider between the list items: */}

                <ListItem key={index}>
                  <ListItemContent>
                    <Typography level='body-xs' sx={{ fontWeight: 'md' }}>
                      {detail.text}
                    </Typography>
                    <Typography level='body-sm' color='text.tertiary'>
                      {detail.subtext ? detail.subtext : '--'}
                    </Typography>
                  </ListItemContent>
                </ListItem>
              </Grid>
            ))}
          </Grid>
        </Sheet>
        {chore.notes && (
          <>
            <Typography level='title-md' sx={{ mb: 1 }}>
              Previous note:
            </Typography>
            <Sheet variant='outlined' sx={{ p: 2, borderRadius: 'lg' }}>
              <Typography level='body-md' sx={{ mb: 1 }}>
                {chore.notes || '--'}
              </Typography>
            </Sheet>
          </>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            alignContent: 'center',
            justifyContent: 'center',
          }}
        >
          <Button
            startDecorator={<History />}
            size='lg'
            color='success'
            variant='plain'
            onClick={() => {
              navigate(`/chores/${choreId}/history`)
            }}
          >
            View History
          </Button>
        </Box>
      </Box>
      {/* <Divider
        sx={{
          my: 2,
        }}
      /> */}
      <Typography level='title-md' sx={{ mt: 1 }}>
        Actions
      </Typography>
      <Card
        sx={{
          p: 2,
          borderRadius: 'md',
          boxShadow: 'sm',
          mt: 2,
        }}
      >
        <Typography level='title-md'>Additional Notes</Typography>
        <Input
          fullWidth
          multiline
          label='Additional Notes'
          placeholder='note or information about the task'
          value={note || ''}
          onChange={e => {
            if (e.target.value.trim() === '') {
              setNote(null)
              return
            }
            setNote(e.target.value)
          }}
          size='md'
          sx={{
            mb: 1,
          }}
        />

        <FormControl size='sm'>
          <Checkbox
            defaultChecked={completedDate !== null}
            checked={completedDate !== null}
            value={completedDate !== null}
            size='lg'
            onChange={e => {
              if (e.target.checked) {
                setCompletedDate(
                  moment(new Date()).format('YYYY-MM-DDTHH:00:00'),
                )
              } else {
                setCompletedDate(null)
              }
            }}
            overlay
            sx={
              {
                // my: 1,
              }
            }
            label={<Typography level='body2'>Set completion date</Typography>}
          />
        </FormControl>
        {completedDate !== null && (
          <Input
            sx={{ mt: 1, mb: 1.5, width: 300 }}
            type='datetime-local'
            value={completedDate}
            onChange={e => {
              setCompletedDate(e.target.value)
            }}
          />
        )}

        <Button
          fullWidth
          size='lg'
          onClick={handleTaskCompletion}
          disabled={isPendingCompletion}
          color={isPendingCompletion ? 'danger' : 'success'}
          startDecorator={<Check />}
        >
          <Box>Mark as done</Box>
        </Button>
        <Button
          fullWidth
          size='lg'
          onClick={() => {
            setConfirmModelConfig({
              isOpen: true,
              title: 'Skip Task',

              message: 'Are you sure you want to skip this task?',

              confirmText: 'Skip',
              cancelText: 'Cancel',
              onClose: confirmed => {
                if (confirmed) {
                  handleSkippingTask()
                }
                setConfirmModelConfig({})
              },
            })
          }}
          startDecorator={<SwitchAccessShortcut />}
        >
          <Box>Skip</Box>
        </Button>
        <Snackbar
          open={isPendingCompletion}
          endDecorator={
            <Button
              onClick={() => {
                if (timeoutId) {
                  clearTimeout(timeoutId)
                  setIsPendingCompletion(false)
                  setTimeoutId(null)
                  setSecondsLeftToCancel(null) // Reset or adjust as needed
                }
              }}
              size='lg'
              variant='outlined'
              color='danger'
              startDecorator={<CancelScheduleSend />}
            >
              Cancel
            </Button>
          }
        >
          <Typography level='body-md' textAlign={'center'}>
            Task will be marked as completed in {secondsLeftToCancel} seconds
          </Typography>
        </Snackbar>
        <ConfirmationModal config={confirmModelConfig} />
      </Card>
    </Container>
  )
}

export default ChoreView
