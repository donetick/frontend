import {
  Check,
  Delete,
  Edit,
  HowToReg,
  KeyboardDoubleArrowUp,
  LocalOffer,
  ManageSearch,
  MoreTime,
  MoreVert,
  Nfc,
  NoteAdd,
  RecordVoiceOver,
  Repeat,
  Report,
  SwitchAccessShortcut,
  TimesOneMobiledata,
  Update,
  Webhook,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../Config'
import writeToNFC from '../../service/NFCWriter'
import { Fetch } from '../../utils/TokenManager'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import DateModal from '../Modals/Inputs/DateModal'
import SelectModal from '../Modals/Inputs/SelectModal'
import TextModal from '../Modals/Inputs/TextModal'
const ChoreCard = ({ chore, performers, onChoreUpdate, onChoreRemove, sx }) => {
  const [activeUserId, setActiveUserId] = React.useState(0)
  const [isChangeDueDateModalOpen, setIsChangeDueDateModalOpen] =
    React.useState(false)
  const [isCompleteWithPastDateModalOpen, setIsCompleteWithPastDateModalOpen] =
    React.useState(false)
  const [isChangeAssigneeModalOpen, setIsChangeAssigneeModalOpen] =
    React.useState(false)
  const [isCompleteWithNoteModalOpen, setIsCompleteWithNoteModalOpen] =
    React.useState(false)
  const [confirmModelConfig, setConfirmModelConfig] = React.useState({})
  const [anchorEl, setAnchorEl] = React.useState(null)
  const menuRef = React.useRef(null)
  const navigate = useNavigate()
  const [isDisabled, setIsDisabled] = React.useState(false)

  // useEffect(() => {
  //   GetAllUsers()
  //     .then(response => response.json())
  //     .then(data => {
  //       setPerformers(data.res)
  //     })
  // }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleMenuOutsideClick = event => {
    if (
      anchorEl &&
      !anchorEl.contains(event.target) &&
      !menuRef.current.contains(event.target)
    ) {
      handleMenuClose()
    }
  }
  const handleEdit = () => {
    navigate(`/chores/${chore.id}/edit`)
  }
  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Chore',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: 'Are you sure you want to delete this chore?',
      onClose: isConfirmed => {
        console.log('isConfirmed', isConfirmed)
        if (isConfirmed === true) {
          Fetch(`${API_URL}/chores/${chore.id}`, {
            method: 'DELETE',
          }).then(response => {
            if (response.ok) {
              onChoreRemove(chore)
            }
          })
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleCompleteChore = () => {
    Fetch(`${API_URL}/chores/${chore.id}/do`, {
      method: 'POST',
    }).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'completed')
        })
      }
    })
    setIsDisabled(true)
    setTimeout(() => setIsDisabled(false), 3000) // Re-enable the button after 5 seconds
  }
  const handleChangeDueDate = newDate => {
    if (activeUserId === null) {
      alert('Please select a performer')
      return
    }
    Fetch(`${API_URL}/chores/${chore.id}/dueDate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dueDate: newDate ? new Date(newDate).toISOString() : null,
        UpdatedBy: activeUserId,
      }),
    }).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'rescheduled')
        })
      }
    })
  }

  const handleCompleteWithPastDate = newDate => {
    if (activeUserId === null) {
      alert('Please select a performer')
      return
    }
    Fetch(
      `${API_URL}/chores/${chore.id}/do?completedDate=${new Date(
        newDate,
      ).toISOString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    ).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'completed')
        })
      }
    })
  }
  const handleAssigneChange = assigneeId => {
    // TODO: Implement assignee change
  }
  const handleCompleteWithNote = note => {
    Fetch(`${API_URL}/chores/${chore.id}/do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: note,
      }),
    }).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'completed')
        })
      }
    })
  }
  const getDueDateChipText = nextDueDate => {
    if (chore.nextDueDate === null) return 'No Due Date'
    // if due in next 48 hours, we should it in this format : Tomorrow 11:00 AM
    const diff = moment(nextDueDate).diff(moment(), 'hours')
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar().replace(' at', '')
    }
    return 'Due ' + moment(nextDueDate).fromNow()
  }
  const getDueDateChipColor = nextDueDate => {
    if (chore.nextDueDate === null) return 'neutral'
    const diff = moment(nextDueDate).diff(moment(), 'hours')
    if (diff < 48 && diff > 0) {
      return 'warning'
    }
    if (diff < 0) {
      return 'danger'
    }

    return 'neutral'
  }

  const getIconForLabel = label => {
    if (!label || label.trim() === '') return <></>
    switch (String(label).toLowerCase()) {
      case 'high':
        return <KeyboardDoubleArrowUp />
      case 'important':
        return <Report />
      default:
        return <LocalOffer />
    }
  }

  const getRecurrentChipText = chore => {
    const dayOfMonthSuffix = n => {
      if (n >= 11 && n <= 13) {
        return 'th'
      }
      switch (n % 10) {
        case 1:
          return 'st'
        case 2:
          return 'nd'
        case 3:
          return 'rd'
        default:
          return 'th'
      }
    }
    if (chore.frequencyType === 'once') {
      return 'Once'
    } else if (chore.frequencyType === 'trigger') {
      return 'Trigger'
    } else if (chore.frequencyType === 'daily') {
      return 'Daily'
    } else if (chore.frequencyType === 'weekly') {
      return 'Weekly'
    } else if (chore.frequencyType === 'monthly') {
      return 'Monthly'
    } else if (chore.frequencyType === 'yearly') {
      return 'Yearly'
    } else if (chore.frequencyType === 'days_of_the_week') {
      let days = JSON.parse(chore.frequencyMetadata).days
      days = days.map(d => moment().day(d).format('ddd'))
      return days.join(', ')
    } else if (chore.frequencyType === 'day_of_the_month') {
      let freqData = JSON.parse(chore.frequencyMetadata)
      const months = freqData.months.map(m => moment().month(m).format('MMM'))
      return `${chore.frequency}${dayOfMonthSuffix(
        chore.frequency,
      )} of ${months.join(', ')}`
    } else if (chore.frequencyType === 'interval') {
      return `Every ${chore.frequency} ${
        JSON.parse(chore.frequencyMetadata).unit
      }`
    } else {
      return chore.frequencyType
    }
  }

  const getFrequencyIcon = chore => {
    if (['once', 'no_repeat'].includes(chore.frequencyType)) {
      return <TimesOneMobiledata />
    } else if (chore.frequencyType === 'trigger') {
      return <Webhook />
    } else {
      return <Repeat />
    }
  }

  return (
    <>
      <Chip
        variant='soft'
        sx={{
          position: 'relative',
          top: 10,
          zIndex: 1,
          left: 10,
        }}
        color={getDueDateChipColor(chore.nextDueDate)}
      >
        {getDueDateChipText(chore.nextDueDate)}
      </Chip>

      <Chip
        variant='soft'
        sx={{
          position: 'relative',
          top: 10,
          zIndex: 1,
          ml: 0.4,
          left: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getFrequencyIcon(chore)}

          {getRecurrentChipText(chore)}
        </div>
      </Chip>

      <Card
        variant='plain'
        sx={{
          ...sx,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2,
          // backgroundColor: 'white',
          boxShadow: 'sm',
          borderRadius: 20,

          // mb: 2,
        }}
      >
        <Grid container>
          <Grid item xs={9}>
            {/* Box in top right with Chip showing next due date  */}
            <Box display='flex' justifyContent='start' alignItems='center'>
              <Avatar sx={{ mr: 1, fontSize: 22 }}>
                {chore.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box display='flex' flexDirection='column'>
                <Typography level='title-md'>{chore.name}</Typography>
                <Typography level='body-md' color='text.disabled'>
                  Assigned to{' '}
                  <Chip variant='outlined'>
                    {
                      performers.find(p => p.id === chore.assignedTo)
                        ?.displayName
                    }
                  </Chip>
                </Typography>
                <Box>
                  {chore.labels?.split(',').map(label => (
                    <Chip
                      variant='solid'
                      key={label}
                      color='primary'
                      sx={{
                        position: 'relative',
                        ml: 0.5,
                        top: 10,
                        zIndex: 1,
                        left: 10,
                      }}
                      startDecorator={getIconForLabel(label)}
                    >
                      {label}
                    </Chip>
                  ))}
                </Box>
              </Box>
            </Box>
            {/* <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Chip variant='outlined'>
            {chore.nextDueDate === null
              ? '--'
              : 'Due ' + moment(chore.nextDueDate).fromNow()}
          </Chip>
        </Box> */}
          </Grid>
          <Grid
            item
            xs={3}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box display='flex' justifyContent='flex-end' alignItems='flex-end'>
              {/* <ButtonGroup> */}
              <IconButton
                variant='solid'
                color='success'
                onClick={handleCompleteChore}
                disabled={isDisabled}
                sx={{
                  borderRadius: '50%',
                  width: 50,
                  height: 50,
                  zIndex: 1,
                }}
              >
                <div className='relative grid place-items-center'>
                  <Check />
                  {isDisabled && (
                    <CircularProgress
                      variant='solid'
                      color='success'
                      size='md'
                      sx={{
                        color: 'success.main',
                        position: 'absolute',
                        zIndex: 0,
                      }}
                    />
                  )}
                </div>
              </IconButton>
              <IconButton
                // sx={{ width: 15 }}
                variant='soft'
                color='success'
                onClick={handleMenuOpen}
                sx={{
                  borderRadius: '50%',
                  width: 25,
                  height: 25,
                  position: 'relative',
                  left: -10,
                }}
              >
                <MoreVert />
              </IconButton>
              {/* </ButtonGroup> */}
              <Menu
                size='md'
                ref={menuRef}
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    setIsCompleteWithNoteModalOpen(true)
                  }}
                >
                  <NoteAdd />
                  Complete with note
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setIsCompleteWithPastDateModalOpen(true)
                  }}
                >
                  <Update />
                  Complete in past
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    Fetch(`${API_URL}/chores/${chore.id}/skip`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({}),
                    }).then(response => {
                      if (response.ok) {
                        response.json().then(data => {
                          const newChore = data.res
                          onChoreUpdate(newChore, 'skipped')
                          handleMenuClose()
                        })
                      }
                    })
                  }}
                >
                  <SwitchAccessShortcut />
                  Skip to next due date
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setIsChangeAssigneeModalOpen(true)
                  }}
                >
                  <RecordVoiceOver />
                  Delegate to someone else
                </MenuItem>
                <MenuItem>
                  <HowToReg />
                  Complete as someone else
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    navigate(`/chores/${chore.id}/history`)
                  }}
                >
                  <ManageSearch />
                  History
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setIsChangeDueDateModalOpen(true)
                  }}
                >
                  <MoreTime />
                  Change due date
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    // write current chore URL to NFC
                    writeToNFC(`${window.location.origin}/chores/${chore.id}`)
                  }}
                >
                  <Nfc />
                  Write to NFC
                </MenuItem>
                <MenuItem onClick={handleEdit}>
                  <Edit />
                  Edit
                </MenuItem>
                <MenuItem onClick={handleDelete} color='danger'>
                  <Delete />
                  Delete
                </MenuItem>
              </Menu>
            </Box>
          </Grid>
        </Grid>
        <DateModal
          isOpen={isChangeDueDateModalOpen}
          key={'changeDueDate' + chore.id}
          current={chore.nextDueDate}
          title={`Change due date`}
          onClose={() => {
            setIsChangeDueDateModalOpen(false)
          }}
          onSave={handleChangeDueDate}
        />
        <DateModal
          isOpen={isCompleteWithPastDateModalOpen}
          key={'completedInPast' + chore.id}
          current={chore.nextDueDate}
          title={`Save Chore that you completed in the past`}
          onClose={() => {
            setIsCompleteWithPastDateModalOpen(false)
          }}
          onSave={handleCompleteWithPastDate}
        />
        <SelectModal
          isOpen={isChangeAssigneeModalOpen}
          options={performers}
          displayKey='displayName'
          title={`Delegate to someone else`}
          onClose={() => {
            setIsChangeAssigneeModalOpen(false)
          }}
          onSave={handleAssigneChange}
        />
        <ConfirmationModal config={confirmModelConfig} />
        <TextModal
          isOpen={isCompleteWithNoteModalOpen}
          title='Add note to attach to this completion:'
          onClose={() => {
            setIsCompleteWithNoteModalOpen(false)
          }}
          okText={'Complete'}
          onSave={handleCompleteWithNote}
        />
      </Card>
    </>
  )
}

export default ChoreCard
