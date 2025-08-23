import {
  Archive,
  Cancel,
  CopyAll,
  Delete,
  Edit,
  ManageSearch,
  MoreTime,
  MoreVert,
  NextWeek,
  Nfc,
  NoteAdd,
  RecordVoiceOver,
  SwitchAccessShortcut,
  Today,
  Unarchive,
  Update,
  ViewCarousel,
  WbSunny,
  Weekend,
} from '@mui/icons-material'
import { Divider, IconButton, Menu, MenuItem, Tooltip } from '@mui/joy'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../service/NotificationProvider'
import {
  ArchiveChore,
  DeleteChore,
  SkipChore,
  UnArchiveChore,
  UpdateDueDate,
} from '../../utils/Fetcher'

const ChoreActionMenu = ({
  chore,
  onChoreUpdate,
  onChoreRemove,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onChangeAssignee,
  onChangeDueDate,
  onWriteNFC,
  onDelete,
  onOpen,
  onMouseEnter,
  onMouseLeave,
  sx = {},
  variant = 'soft',
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const menuRef = React.useRef(null)
  const navigate = useNavigate()
  const { showError } = useNotification()

  useEffect(() => {
    const handleMenuOutsideClick = event => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        !menuRef.current.contains(event.target)
      ) {
        handleMenuClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    if (anchorEl) {
      onOpen()
    }
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  const handleMenuOpen = event => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    navigate(`/chores/${chore.id}/edit`)
    handleMenuClose()
  }

  const handleClone = () => {
    navigate(`/chores/${chore.id}/edit?clone=true`)
    handleMenuClose()
  }

  const handleView = () => {
    navigate(`/chores/${chore.id}`)
    handleMenuClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    } else {
      // Default delete behavior
      DeleteChore(chore.id).then(response => {
        if (response.ok) {
          onChoreRemove?.(chore)
        }
      })
    }
    handleMenuClose()
  }

  const handleArchive = () => {
    if (chore.isActive) {
      ArchiveChore(chore.id).then(response => {
        if (response.ok) {
          response.json().then(() => {
            const newChore = { ...chore, isActive: false }
            onChoreUpdate?.(newChore, 'archive')
          })
        }
      })
    } else {
      UnArchiveChore(chore.id).then(response => {
        if (response.ok) {
          response.json().then(() => {
            const newChore = { ...chore, isActive: true }
            onChoreUpdate?.(newChore, 'unarchive')
          })
        }
      })
    }
    handleMenuClose()
  }

  const handleSkip = () => {
    SkipChore(chore.id)
      .then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = data.res
            onChoreUpdate?.(newChore, 'skipped')
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
  }

  const handleHistory = () => {
    navigate(`/chores/${chore.id}/history`)
    handleMenuClose()
  }

  const getQuickScheduleDate = option => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (option) {
      case 'today': {
        // Schedule for today at the next available slot: 9am, 12pm, 5pm, or now if after 5pm
        const nowHour = now.getHours()
        const scheduled = new Date(today)
        if (nowHour < 9) {
          scheduled.setHours(9, 0, 0, 0)
        } else if (nowHour < 12) {
          scheduled.setHours(12, 0, 0, 0)
        } else if (nowHour < 17) {
          scheduled.setHours(17, 0, 0, 0)
        } else {
          // After 5pm, use current time
          scheduled.setHours(
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds(),
          )
        }
        return scheduled
      }
      case 'tomorrow-morning': {
        const tomorrowMorning = new Date(today)
        tomorrowMorning.setDate(today.getDate() + 1)
        tomorrowMorning.setHours(9, 0, 0, 0)
        return tomorrowMorning
      }
      case 'tomorrow': {
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        tomorrow.setHours(12, 0, 0, 0) // Set to noon
        return tomorrow
      }
      case 'tomorrow-afternoon': {
        const tomorrowAfternoon = new Date(today)
        tomorrowAfternoon.setDate(today.getDate() + 1)
        tomorrowAfternoon.setHours(14, 0, 0, 0)
        return tomorrowAfternoon
      }
      case 'weekend': {
        const weekend = new Date(today)
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
        weekend.setDate(today.getDate() + daysUntilSaturday)
        return weekend
      }
      case 'next-week': {
        const nextWeek = new Date(today)
        const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7
        nextWeek.setDate(today.getDate() + daysUntilMonday)
        return nextWeek
      }
      default:
        return today
    }
  }

  const handleQuickSchedule = option => {
    const date = option === 'remove' ? null : getQuickScheduleDate(option)
    UpdateDueDate(chore.id, date).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = {
            ...chore,
            nextDueDate: date ? date.toISOString() : null,
          }
          onChoreUpdate(
            newChore,
            option === 'remove' ? 'due-date-removed' : 'rescheduled',
          )
        })
      }
    })
    handleMenuClose()
  }

  return (
    <>
      <IconButton
        variant={variant}
        color='success'
        onClick={handleMenuOpen}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          borderRadius: '50%',
          width: 25,
          height: 25,
          position: 'relative',
          left: -10,
          ...sx,
        }}
      >
        <MoreVert />
      </IconButton>

      <Menu
        size='md'
        ref={menuRef}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          position: 'absolute',
          top: '100%',
          left: '50%',
        }}
      >
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            onCompleteWithNote?.()
            handleMenuClose()
          }}
        >
          <NoteAdd />
          Complete with note
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            onCompleteWithPastDate?.()
            handleMenuClose()
          }}
        >
          <Update />
          Complete in past
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleSkip()
          }}
        >
          <SwitchAccessShortcut />
          Skip to next due date
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            onChangeAssignee?.()
            handleMenuClose()
          }}
        >
          <RecordVoiceOver />
          Delegate to someone else
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleHistory()
          }}
        >
          <ManageSearch />
          History
        </MenuItem>
        <Divider />
        <MenuItem
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: 1,
            cursor: 'default',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
          onClick={e => e.stopPropagation()}
        >
          <Tooltip title='Today' placement='top'>
            <IconButton
              size='sm'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('today')
              }}
            >
              <Today />
            </IconButton>
          </Tooltip>
          <Tooltip title='Tomorrow' placement='top'>
            <IconButton
              size='sm'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('tomorrow')
              }}
            >
              <WbSunny />
            </IconButton>
          </Tooltip>
          {/* <Tooltip title='Tomorrow afternoon' placement='top'>
            <IconButton
              size='sm'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('tomorrow-afternoon')
              }}
            >
              <WbTwilight />
            </IconButton>
          </Tooltip> */}
          <Tooltip title='Weekend' placement='top'>
            <IconButton
              size='sm'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('weekend')
              }}
            >
              <Weekend />
            </IconButton>
          </Tooltip>
          <Tooltip title='Next week' placement='top'>
            <IconButton
              size='sm'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('next-week')
              }}
            >
              <NextWeek />
            </IconButton>
          </Tooltip>
          <Tooltip title='Remove due date' placement='top'>
            <IconButton
              size='sm'
              color='neutral'
              onClick={e => {
                e.stopPropagation()
                handleQuickSchedule('remove')
              }}
            >
              <Cancel />
            </IconButton>
          </Tooltip>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            onChangeDueDate?.()
            handleMenuClose()
          }}
        >
          <MoreTime />
          Change due date
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            onWriteNFC?.()
            handleMenuClose()
          }}
        >
          <Nfc />
          Write to NFC
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleEdit()
          }}
        >
          <Edit />
          Edit
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleClone()
          }}
        >
          <CopyAll />
          Clone
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleView()
          }}
        >
          <ViewCarousel />
          View
        </MenuItem>
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleArchive()
          }}
          color='neutral'
        >
          {chore.isActive ? <Archive /> : <Unarchive />}
          {chore.isActive ? 'Archive' : 'Unarchive'}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={e => {
            e.stopPropagation()
            handleDelete()
          }}
          color='danger'
        >
          <Delete />
          Delete
        </MenuItem>
      </Menu>
    </>
  )
}

export default ChoreActionMenu
