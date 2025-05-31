import {
  Archive,
  CancelScheduleSend,
  Check,
  CopyAll,
  Delete,
  Edit,
  ManageSearch,
  MoreTime,
  MoreVert,
  Nfc,
  NoteAdd,
  RecordVoiceOver,
  Repeat,
  SwitchAccessShortcut,
  TimesOneMobiledata,
  Unarchive,
  Update,
  ViewCarousel,
  Webhook,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { UserContext } from '../../contexts/UserContext'
import { useError } from '../../service/ErrorProvider'
import { notInCompletionWindow } from '../../utils/Chores.jsx'
import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import {
  ArchiveChore,
  DeleteChore,
  MarkChoreComplete,
  SkipChore,
  UnArchiveChore,
  UpdateChoreAssignee,
  UpdateDueDate,
} from '../../utils/Fetcher'
import Priorities from '../../utils/Priorities'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import DateModal from '../Modals/Inputs/DateModal'
import SelectModal from '../Modals/Inputs/SelectModal'
import TextModal from '../Modals/Inputs/TextModal'
import WriteNFCModal from '../Modals/Inputs/WriteNFCModal'

const CompactChoreCard = ({
  chore,
  performers,
  onChoreUpdate,
  onChoreRemove,
  sx,
  viewOnly,
  onChipClick,
}) => {
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
  const [isNFCModalOpen, setIsNFCModalOpen] = React.useState(false)
  const [anchorEl, setAnchorEl] = React.useState(null)
  const menuRef = React.useRef(null)
  const navigate = useNavigate()
  const [isDisabled, setIsDisabled] = React.useState(false)

  const [isPendingCompletion, setIsPendingCompletion] = React.useState(false)
  const [secondsLeftToCancel, setSecondsLeftToCancel] = React.useState(null)
  const [timeoutId, setTimeoutId] = React.useState(null)
  const { userProfile } = React.useContext(UserContext)
  const { impersonatedUser } = useImpersonateUser()

  const { showError } = useError()

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

  // All the existing handler methods (same as original ChoreCard)
  const handleEdit = () => {
    navigate(`/chores/${chore.id}/edit`)
  }

  const handleClone = () => {
    navigate(`/chores/${chore.id}/edit?clone=true`)
  }

  const handleView = () => {
    navigate(`/chores/${chore.id}`)
  }

  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Chore',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: 'Are you sure you want to delete this chore?',
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          DeleteChore(chore.id).then(response => {
            if (response.ok) {
              onChoreRemove(chore)
            }
          })
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleArchive = () => {
    if (chore.isActive) {
      ArchiveChore(chore.id).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = { ...chore, isActive: false }
            onChoreUpdate(newChore, 'archive')
          })
        }
      })
    } else {
      UnArchiveChore(chore.id).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = { ...chore, isActive: true }
            onChoreUpdate(newChore, 'unarchive')
          })
        }
      })
    }
    handleMenuClose()
  }

  const handleTaskCompletion = () => {
    setIsPendingCompletion(true)
    let seconds = 3
    setSecondsLeftToCancel(seconds)

    const countdownInterval = setInterval(() => {
      seconds -= 1
      setSecondsLeftToCancel(seconds)

      if (seconds <= 0) {
        clearInterval(countdownInterval)
        setIsPendingCompletion(false)
      }
    }, 1000)

    const id = setTimeout(() => {
      MarkChoreComplete(
        chore.id,
        impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
        null,
        null,
      )
        .then(resp => {
          if (resp.ok) {
            return resp.json().then(data => {
              onChoreUpdate(data.res, 'completed')
            })
          }
        })
        .then(() => {
          setIsPendingCompletion(false)
          clearTimeout(id)
          clearInterval(countdownInterval)
          setTimeoutId(null)
          setSecondsLeftToCancel(null)
        })
        .catch(error => {
          if (error?.queued) {
            showError({
              title: 'Update Failed',
              message: 'Request will be reattempt when you are online',
            })
          } else {
            showError({
              title: 'Failed to update',
              message: error,
            })
          }

          setIsPendingCompletion(false)
          clearTimeout(id)
          clearInterval(countdownInterval)
          setTimeoutId(null)
          setSecondsLeftToCancel(null)
        })
    }, 2000)

    setTimeoutId(id)
  }

  const handleChangeDueDate = newDate => {
    if (activeUserId === null) {
      alert('Please select a performer')
      return
    }
    UpdateDueDate(chore.id, newDate).then(response => {
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

    MarkChoreComplete(
      chore.id,
      impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
      new Date(newDate).toISOString(),
      null,
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
    UpdateChoreAssignee(chore.id, assigneeId).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'assigned')
        })
      }
    })
  }

  const handleCompleteWithNote = note => {
    MarkChoreComplete(
      chore.id,
      impersonatedUser
        ? { note, completedBy: impersonatedUser.userId }
        : { note },
      null,
      null,
    ).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          onChoreUpdate(newChore, 'completed')
        })
      }
    })
  }

  // Utility functions
  const getDueDateText = nextDueDate => {
    if (chore.nextDueDate === null) return 'No Due Date'
    const diff = moment(nextDueDate).diff(moment(), 'hours')
    if (diff < 24 && diff > 0) {
      return moment(nextDueDate).calendar().replace(' at', '')
    }
    if (diff < 0) {
      return 'Overdue'
    }
    return moment(nextDueDate).fromNow()
  }

  const getDueDateColor = nextDueDate => {
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

  const getRecurrentText = chore => {
    // if chore.frequencyMetadata is type string then parse it otherwise assigned to the metadata:
    const metadata =
      typeof chore.frequencyMetadata === 'string'
        ? JSON.parse(chore.frequencyMetadata)
        : chore.frequencyMetadata

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
    } else if (chore.frequencyType === 'adaptive') {
      return 'Adaptive'
    } else if (chore.frequencyType === 'weekly') {
      return 'Weekly'
    } else if (chore.frequencyType === 'monthly') {
      return 'Monthly'
    } else if (chore.frequencyType === 'yearly') {
      return 'Yearly'
    } else if (chore.frequencyType === 'days_of_the_week') {
      let days = metadata.days
      if (days.length > 4) {
        const allDays = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ]
        const selectedDays = days.map(d => moment().day(d).format('dddd'))
        const notSelectedDay = allDays.filter(
          day => !selectedDays.includes(day),
        )
        const notSelectedShortdays = notSelectedDay.map(d =>
          moment().day(d).format('ddd'),
        )
        return `Daily except ${notSelectedShortdays.join(', ')}`
      } else {
        days = days.map(d => moment().day(d).format('ddd'))
        return days.join(', ')
      }
    } else if (chore.frequencyType === 'day_of_the_month') {
      let months = metadata.months
      if (months.length > 6) {
        const allMonths = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        const selectedMonths = months.map(m => moment().month(m).format('MMMM'))
        const notSelectedMonth = allMonths.filter(
          month => !selectedMonths.includes(month),
        )
        const notSelectedShortMonths = notSelectedMonth.map(m =>
          moment().month(m).format('MMM'),
        )
        let result = `Monthly ${chore.frequency}${dayOfMonthSuffix(
          chore.frequency,
        )}`
        if (notSelectedShortMonths.length > 0)
          result += `
        except ${notSelectedShortMonths.join(', ')}`
        return result
      } else {
        let freqData = metadata
        const months = freqData.months.map(m => moment().month(m).format('MMM'))
        return `${chore.frequency}${dayOfMonthSuffix(
          chore.frequency,
        )} of ${months.join(', ')}`
      }
    } else if (chore.frequencyType === 'interval') {
      return `Every ${chore.frequency} ${metadata.unit}`
    } else {
      return chore.frequencyType
    }
  }

  const getFrequencyIcon = chore => {
    if (['once', 'no_repeat'].includes(chore.frequencyType)) {
      return <TimesOneMobiledata sx={{ fontSize: 14 }} />
    } else if (chore.frequencyType === 'trigger') {
      return <Webhook sx={{ fontSize: 14 }} />
    } else {
      return <Repeat sx={{ fontSize: 14 }} />
    }
  }

  const formatMetadata = () => {
    const parts = []

    // Frequency
    parts.push(getRecurrentText(chore))

    // Assignee (if not current user)
    if (userProfile && chore.assignedTo !== userProfile.id) {
      const assignee = performers.find(
        p => p.id === chore.assignedTo,
      )?.displayName
      if (assignee) parts.push(assignee)
    }

    // Points
    if (chore.points > 0) {
      parts.push(`${chore.points}pts`)
    }

    return parts.join(' • ')
  }

  return (
    <Box key={chore.id + '-compact-box'}>
      <Box
        style={viewOnly ? { pointerEvents: 'none' } : {}}
        sx={{
          ...sx,
          display: 'flex',
          alignItems: 'center',
          // px: 1,
          //   py: 0.75,
          minHeight: 56, // More compact height
          cursor: 'pointer',
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'background.level1',
          },
          '&:last-child': {
            borderBottom: 'none',
          },
        }}
        onClick={() => navigate(`/chores/${chore.id}`)}
      >
        {/* Left side - Content */}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            mr: 1.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Line 1: Name + Due Date + Frequency */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.25,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
                flex: 1,
              }}
            >
              {/* Chore Name */}
              <Typography
                level='title-sm'
                sx={{
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mr: 1,
                }}
              >
                {chore.name}
              </Typography>
            </Box>

            {/* Due Date */}
            <Chip
              variant='soft'
              size='sm'
              color={getDueDateColor(chore.nextDueDate)}
              sx={{ fontSize: 10, height: 20, flexShrink: 0 }}
            >
              {getDueDateText(chore.nextDueDate)}
            </Chip>
          </Box>

          {/* Line 2: Metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {getFrequencyIcon(chore)}
            <Typography
              level='body-xs'
              color='text.secondary'
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 11,
              }}
            >
              {formatMetadata()}
            </Typography>

            {/* Labels */}
            {chore.priority > 0 && (
              <Chip
                variant='solid'
                size='sm'
                color={
                  chore.priority === 1
                    ? 'danger'
                    : chore.priority === 2
                      ? 'warning'
                      : 'neutral'
                }
                startDecorator={
                  Priorities.find(p => p.value === chore.priority)?.icon
                }
                onClick={e => {
                  e.stopPropagation()
                  onChipClick({ priority: chore.priority })
                }}
                sx={{
                  ml: 0.5,
                  //   height: 16,
                  //   fontSize: 9,
                  //   px: 0.5,
                }}
              >
                P{chore.priority}
              </Chip>
            )}
            {chore.labelsV2?.map(l => (
              <div
                role='none'
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation()
                  onChipClick({ label: l })
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onChipClick({ label: l })
                  }
                }}
                style={{
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                key={`compact-chorecard-${chore.id}-label-${l.id}`}
              >
                <Chip
                  variant='solid'
                  color='primary'
                  size='sm'
                  sx={{
                    ml: 0.5,
                    // height: 16,
                    // fontSize: 9,
                    // px: 0.5,
                    backgroundColor: `${l?.color} !important`,
                    color: getTextColorFromBackgroundColor(l?.color),
                  }}
                >
                  {l?.name}
                </Chip>
              </div>
            ))}
          </Box>
        </Box>

        {/* Right side - Actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            flexShrink: 0,
          }}
        >
          {/* Complete Button */}
          <IconButton
            variant='solid'
            color='success'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              handleTaskCompletion()
            }}
            disabled={isPendingCompletion || notInCompletionWindow(chore)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
            }}
          >
            {isPendingCompletion ? (
              <CircularProgress size='sm' color='success' />
            ) : (
              <Check sx={{ fontSize: 16 }} />
            )}
          </IconButton>

          {/* Menu Button */}
          <IconButton
            variant='plain'
            color='neutral'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              handleMenuOpen(e)
            }}
            sx={{
              width: 28,
              height: 28,
              opacity: 0.6,
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <MoreVert sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {/* Menu */}
        <Menu
          ref={menuRef}
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => setIsCompleteWithNoteModalOpen(true)}>
            <NoteAdd />
            Complete with note
          </MenuItem>
          <MenuItem onClick={() => setIsCompleteWithPastDateModalOpen(true)}>
            <Update />
            Complete in past
          </MenuItem>
          <MenuItem
            onClick={() => {
              SkipChore(chore.id)
                .then(response => {
                  if (response.ok) {
                    response.json().then(data => {
                      const newChore = data.res
                      onChoreUpdate(newChore, 'skipped')
                      handleMenuClose()
                    })
                  }
                })
                .catch(error => {
                  if (error?.queued) {
                    showError({
                      title: 'Failed to update',
                      message: 'Request will be processed when you are online',
                    })
                  } else {
                    showError({
                      title: 'Failed to update',
                      message: error,
                    })
                  }
                })
            }}
          >
            <SwitchAccessShortcut />
            Skip to next due date
          </MenuItem>
          <MenuItem onClick={() => setIsChangeAssigneeModalOpen(true)}>
            <RecordVoiceOver />
            Delegate to someone else
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => navigate(`/chores/${chore.id}/history`)}>
            <ManageSearch />
            History
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setIsChangeDueDateModalOpen(true)}>
            <MoreTime />
            Change due date
          </MenuItem>
          <MenuItem onClick={() => setIsNFCModalOpen(true)}>
            <Nfc />
            Write to NFC
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <Edit />
            Edit
          </MenuItem>
          <MenuItem onClick={handleClone}>
            <CopyAll />
            Clone
          </MenuItem>
          <MenuItem onClick={handleView}>
            <ViewCarousel />
            View
          </MenuItem>
          <MenuItem onClick={handleArchive} color='neutral'>
            {chore.isActive ? <Archive /> : <Unarchive />}
            {chore.isActive ? 'Archive' : 'Unarchive'}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDelete} color='danger'>
            <Delete />
            Delete
          </MenuItem>
        </Menu>
      </Box>

      {/* All modals (same as original) */}
      <DateModal
        isOpen={isChangeDueDateModalOpen}
        key={'changeDueDate' + chore.id}
        current={chore.nextDueDate}
        title={`Change due date`}
        onClose={() => setIsChangeDueDateModalOpen(false)}
        onSave={handleChangeDueDate}
      />

      <DateModal
        isOpen={isCompleteWithPastDateModalOpen}
        key={'completedInPast' + chore.id}
        current={chore.nextDueDate}
        title={`Save Chore that you completed in the past`}
        onClose={() => setIsCompleteWithPastDateModalOpen(false)}
        onSave={handleCompleteWithPastDate}
      />

      <SelectModal
        isOpen={isChangeAssigneeModalOpen}
        options={performers}
        displayKey='displayName'
        title={`Delegate to someone else`}
        placeholder={'Select a performer'}
        onClose={() => setIsChangeAssigneeModalOpen(false)}
        onSave={selected => handleAssigneChange(selected.id)}
      />

      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}

      <TextModal
        isOpen={isCompleteWithNoteModalOpen}
        title='Add note to attach to this completion:'
        onClose={() => setIsCompleteWithNoteModalOpen(false)}
        okText={'Complete'}
        onSave={handleCompleteWithNote}
      />

      <WriteNFCModal
        config={{
          isOpen: isNFCModalOpen,
          url: `${window.location.origin}/chores/${chore.id}`,
          onClose: () => setIsNFCModalOpen(false),
        }}
      />

      {/* Snackbar for pending completion */}
      <Snackbar
        open={isPendingCompletion}
        endDecorator={
          <Button
            onClick={() => {
              if (timeoutId) {
                clearTimeout(timeoutId)
                setIsPendingCompletion(false)
                setTimeoutId(null)
                setSecondsLeftToCancel(null)
              }
            }}
            size='sm'
            variant='outlined'
            color='primary'
            startDecorator={<CancelScheduleSend />}
          >
            Cancel
          </Button>
        }
      >
        <Typography level='body-xs' textAlign={'center'}>
          Task will be marked as completed in {secondsLeftToCancel} seconds
        </Typography>
      </Snackbar>
    </Box>
  )
}

export default CompactChoreCard
