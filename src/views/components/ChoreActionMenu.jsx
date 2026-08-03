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
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AppModal from '../../components/common/AppModal'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import { getIconComponent } from '../../utils/ProjectIcons'
import { useProjects } from '../Projects/ProjectQueries'

const ChoreActionMenu = ({
  chore,
  onAction,
  onChangeAssignee,
  onChangeDueDate,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  onNudge,
  onOpen,
  onWriteNFC,
  sx = {},
  variant = 'soft',
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const menuRef = React.useRef(null)
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  // Phone-only condition (matches AddTaskModal.jsx) — tablets/desktop keep the Menu
  const isSmallScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))

  useEffect(() => {
    try {
      setIsOfficialInstance(isOfficialDonetickInstanceSync())
    } catch (error) {
      console.warn('Error checking instance type:', error)
      setIsOfficialInstance(false)
    }
  }, [])

  useEffect(() => {
    if (isSmallScreen) {
      // AppModal owns its own backdrop/escape close behavior on small screens.
      if (anchorEl && onOpen) {
        onOpen()
      }
      return
    }

    const handleMenuOutsideClick = event => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        !menuRef.current?.contains(event.target)
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
  }, [anchorEl, onOpen, isSmallScreen])

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

  // Shared action list, rendered as MenuItems on large screens and as a
  // ListItemButton list inside an AppModal sheet on small screens.
  const actionItems = [
    {
      key: 'completeNote',
      icon: <NoteAdd />,
      label: 'Complete with note',
      onClick: () => {
        onCompleteWithNote?.()
        handleMenuClose()
      },
    },
    {
      key: 'completePast',
      icon: <Update />,
      label: 'Complete in past',
      onClick: () => {
        onCompleteWithPastDate?.()
        handleMenuClose()
      },
    },
    {
      key: 'skip',
      icon: <SwitchAccessShortcut />,
      label: 'Skip to next due date',
      onClick: handleSkip,
    },
    {
      key: 'delegate',
      icon: <RecordVoiceOver />,
      label: 'Delegate to someone else',
      onClick: () => {
        onChangeAssignee?.()
        handleMenuClose()
      },
    },
    isOfficialInstance && {
      key: 'nudge',
      icon: <Notifications />,
      label: 'Send nudge',
      onClick: () => {
        onNudge?.()
        handleMenuClose()
      },
    },
    { key: 'divider-1', type: 'divider' },
    {
      key: 'history',
      icon: <ManageSearch />,
      label: 'History',
      onClick: handleHistory,
    },
    { key: 'divider-2', type: 'divider' },
    { key: 'quickSchedule', type: 'quickSchedule' },
    { key: 'divider-3', type: 'divider' },
    {
      key: 'changeDueDate',
      icon: <MoreTime />,
      label: 'Change due date',
      onClick: () => {
        onChangeDueDate?.()
        handleMenuClose()
      },
    },
    {
      key: 'writeNfc',
      icon: <Nfc />,
      label: 'Write to NFC',
      onClick: () => {
        onWriteNFC?.()
        handleMenuClose()
      },
    },
    { key: 'edit', icon: <Edit />, label: 'Edit', onClick: handleEdit },
    { key: 'clone', icon: <CopyAll />, label: 'Clone', onClick: handleClone },
    { key: 'view', icon: <ViewCarousel />, label: 'View', onClick: handleView },
    {
      key: 'archive',
      icon: chore.isActive ? <Archive /> : <Unarchive />,
      label: chore.isActive ? 'Archive' : 'Unarchive',
      onClick: handleArchive,
      color: 'neutral',
    },
    projects.length > 0 && {
      key: 'moveToProject',
      icon: <DriveFileMove />,
      label: 'Move to project',
      onClick: () => setShowProjectPicker(true),
    },
    { key: 'divider-4', type: 'divider' },
    {
      key: 'delete',
      icon: <Delete />,
      label: 'Delete',
      onClick: handleDelete,
      color: 'danger',
    },
  ].filter(Boolean)

  const quickScheduleButtons = (
    <>
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
    </>
  )

  const quickScheduleRowSx = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 1,
    px: 1.5,
    py: 1,
  }

  const renderMenuActionItems = () =>
    actionItems.map(item => {
      if (item.type === 'divider') return <Divider key={item.key} />
      if (item.type === 'quickSchedule') {
        return (
          <MenuItem
            key={item.key}
            sx={{
              ...quickScheduleRowSx,
              cursor: 'default',
              '&:hover': { backgroundColor: 'transparent' },
            }}
            onClick={e => e.stopPropagation()}
          >
            {quickScheduleButtons}
          </MenuItem>
        )
      }
      return (
        <MenuItem
          key={item.key}
          color={item.color}
          onClick={e => {
            e.stopPropagation()
            item.onClick()
          }}
        >
          {item.icon}
          {item.label}
        </MenuItem>
      )
    })

  const renderModalActionItems = () =>
    actionItems.map(item => {
      if (item.type === 'divider') return <Divider key={item.key} />
      if (item.type === 'quickSchedule') {
        return (
          <ListItem key={item.key} sx={quickScheduleRowSx}>
            {quickScheduleButtons}
          </ListItem>
        )
      }
      return (
        <ListItem key={item.key}>
          <ListItemButton color={item.color} onClick={() => item.onClick()}>
            <ListItemDecorator>{item.icon}</ListItemDecorator>
            <ListItemContent>{item.label}</ListItemContent>
          </ListItemButton>
        </ListItem>
      )
    })

  const renderModalProjectPicker = () => (
    <List>
      <ListItem>
        <ListItemButton
          onClick={() =>
            handleMoveToProject({ id: null, name: 'Default Project' })
          }
        >
          <ListItemDecorator>
            {renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen')}
          </ListItemDecorator>
          <ListItemContent>Default Project</ListItemContent>
        </ListItemButton>
      </ListItem>
      {projects.map(project => (
        <ListItem key={project.id}>
          <ListItemButton onClick={() => handleMoveToProject(project)}>
            <ListItemDecorator>
              {renderProjectAvatar(project.color, project.icon)}
            </ListItemDecorator>
            <ListItemContent>{project.name}</ListItemContent>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )

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

      {isSmallScreen ? (
        <AppModal
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          title={showProjectPicker ? 'Move to project' : chore?.name}
          mobilePresentation='sheet'
          showHandle
          contentSx={{ px: 0, pb: 1 }}
        >
          {showProjectPicker && (
            <MenuItem
              onClick={() => setShowProjectPicker(false)}
              sx={{ gap: 1, mx: 2, mb: 1 }}
            >
              <ArrowBack fontSize='small' />
              <Typography level='body-sm' fontWeight={600}>
                Back
              </Typography>
            </MenuItem>
          )}
          <List sx={{ '--ListItem-radius': '8px', px: 1 }}>
            {showProjectPicker
              ? renderModalProjectPicker()
              : renderModalActionItems()}
          </List>
        </AppModal>
      ) : (
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
                  Move to project
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
                  <Typography level='body-sm'>Default Project</Typography>
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
            renderMenuActionItems()
          )}
        </Menu>
      )}
    </>
  )
}

export default ChoreActionMenu
