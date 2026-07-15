import {
  Archive,
  ArrowBack,
  Cancel,
  CopyAll,
  Delete,
  DriveFileMove,
  Edit,
  ManageSearch,
  MoreTime,
  MoreVert,
  NextWeek,
  Nfc,
  NoteAdd,
  Notifications,
  RecordVoiceOver,
  SwitchAccessShortcut,
  Today,
  Unarchive,
  Update,
  ViewCarousel,
  WbSunny,
  Weekend,
} from '@mui/icons-material'
import {
  Avatar,
  Divider,
  IconButton,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/joy'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import { getIconComponent } from '../../utils/ProjectIcons'
import { useProjects } from '../Projects/ProjectQueries'

const ChoreActionMenu = ({
  chore,
  onAction,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onChangeAssignee,
  onChangeDueDate,
  onWriteNFC,
  onNudge,
  onDelete,
  onOpen,
  onMouseEnter,
  onMouseLeave,
  sx = {},
  variant = 'soft',
}) => {
  const { t } = useTranslation('chores')
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const menuRef = React.useRef(null)
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()

  useEffect(() => {
    try {
      setIsOfficialInstance(isOfficialDonetickInstanceSync())
    } catch (error) {
      console.warn('Error checking instance type:', error)
      setIsOfficialInstance(false)
    }
  }, [])

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
    if (anchorEl && onOpen) {
      onOpen()
    }
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl, onOpen])

  const handleMenuOpen = event => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setShowProjectPicker(false)
  }

  const handleMoveToProject = project => {
    onAction?.('moveToProject', chore, { project })
    handleMenuClose()
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
      onAction?.('delete', chore)
    }
    handleMenuClose()
  }

  const handleArchive = () => {
    if (chore.isActive) {
      onAction?.('archive', chore)
    } else {
      onAction?.('unarchive', chore)
    }
    handleMenuClose()
  }

  const handleSkip = () => {
    onAction?.('skip', chore)
    handleMenuClose()
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
        const nowHour = now.getHours()
        const scheduled = new Date(today)
        if (nowHour < 9) {
          scheduled.setHours(9, 0, 0, 0)
        } else if (nowHour < 12) {
          scheduled.setHours(12, 0, 0, 0)
        } else if (nowHour < 17) {
          scheduled.setHours(17, 0, 0, 0)
        } else {
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
        tomorrow.setHours(12, 0, 0, 0)
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
    onAction?.('changeDueDate', chore, { date })
    handleMenuClose()
  }

  const renderProjectAvatar = (color, icon) => {
    const bg = color || LABEL_COLORS[0].value
    const IconComponent = getIconComponent(icon || 'FolderOpen')
    return (
      <Avatar size='sm' sx={{ width: 22, height: 22, backgroundColor: bg }}>
        <IconComponent
          sx={{ fontSize: 13, color: getTextColorFromBackgroundColor(bg) }}
        />
      </Avatar>
    )
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
        {showProjectPicker ? (
          <>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                setShowProjectPicker(false)
              }}
              sx={{ gap: 1 }}
            >
              <ArrowBack fontSize='small' />
              <Typography level='body-sm' fontWeight={600}>
                {t('actions.moveToProject')}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleMoveToProject({ id: null, name: 'Default Project' })
              }}
            >
              <ListItemDecorator>
                {renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen')}
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm'>
                  {t('edit.defaultProject')}
                </Typography>
              </ListItemContent>
            </MenuItem>
            {projects.map(project => (
              <MenuItem
                key={project.id}
                onClick={e => {
                  e.stopPropagation()
                  handleMoveToProject(project)
                }}
              >
                <ListItemDecorator>
                  {renderProjectAvatar(project.color, project.icon)}
                </ListItemDecorator>
                <ListItemContent>
                  <Typography level='body-sm'>{project.name}</Typography>
                </ListItemContent>
              </MenuItem>
            ))}
          </>
        ) : (
          <>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                onCompleteWithNote?.()
                handleMenuClose()
              }}
            >
              <NoteAdd />
              {t('actions.completeWithNote')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                onCompleteWithPastDate?.()
                handleMenuClose()
              }}
            >
              <Update />
              {t('actions.completeInPast')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleSkip()
              }}
            >
              <SwitchAccessShortcut />
              {t('actions.skipToNextDueDate')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                onChangeAssignee?.()
                handleMenuClose()
              }}
            >
              <RecordVoiceOver />
              {t('actions.delegate')}
            </MenuItem>
            {isOfficialInstance && (
              <MenuItem
                onClick={e => {
                  e.stopPropagation()
                  onNudge?.()
                  handleMenuClose()
                }}
              >
                <Notifications />
                {t('actions.sendNudge')}
              </MenuItem>
            )}
            <Divider />
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleHistory()
              }}
            >
              <ManageSearch />
              {t('actions.history')}
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
              <Tooltip title={t('actions.today')} placement='top'>
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
              <Tooltip title={t('actions.tomorrow')} placement='top'>
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
              <Tooltip title={t('actions.weekend')} placement='top'>
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
              <Tooltip title={t('actions.nextWeek')} placement='top'>
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
              <Tooltip title={t('actions.removeDueDate')} placement='top'>
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
              {t('actions.changeDueDate')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                onWriteNFC?.()
                handleMenuClose()
              }}
            >
              <Nfc />
              {t('actions.writeNfc')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleEdit()
              }}
            >
              <Edit />
              {t('actions.edit')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleClone()
              }}
            >
              <CopyAll />
              {t('actions.clone')}
            </MenuItem>
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleView()
              }}
            >
              <ViewCarousel />
              {t('actions.view')}
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
            {projects.length > 0 && (
              <MenuItem
                onClick={e => {
                  e.stopPropagation()
                  setShowProjectPicker(true)
                }}
              >
                <DriveFileMove />
                {t('actions.moveToProject')}
              </MenuItem>
            )}
            <Divider />
            <MenuItem
              onClick={e => {
                e.stopPropagation()
                handleDelete()
              }}
              color='danger'
            >
              <Delete />
              {t('actions.delete')}
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  )
}

export default ChoreActionMenu
