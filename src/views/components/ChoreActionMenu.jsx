import {
  Archive,
  ArrowBack,
  Cancel,
  CopyAll,
  Delete,
  DriveFileMove,
  Edit,
  Flag,
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
  Button,
  Chip,
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
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import AppModal from '../../components/common/AppModal'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import Priorities from '../../utils/Priorities'
import { getIconComponent } from '../../utils/ProjectIcons'
import { useProjects } from '../Projects/ProjectQueries'

const NO_PRIORITY = { name: 'No priority', value: 0, color: 'neutral' }

// After hiding actions the caller does not support, the dividers around them
// would otherwise stack up or dangle at the edges of the list.
const collapseDividers = items =>
  items.filter((item, index) => {
    if (item.type !== 'divider') return true
    if (index === 0 || index === items.length - 1) return false
    return items[index - 1].type !== 'divider'
  })

const ChoreActionMenu = ({
  chore,
  onAction,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onChangeAssignee,
  onChangeDueDate,
  onChangePriority,
  onWriteNFC,
  onNudge,
  onDelete,
  onOpen,
  onMouseEnter,
  onMouseLeave,
  hiddenActions = [],
  trigger,
  sx = {},
  variant = 'soft',
}) => {
  const { t } = useTranslation('chores')
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
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
    setShowPriorityPicker(false)
  }

  const handleChangePriority = priority => {
    onChangePriority?.(priority)
    handleMenuClose()
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

  const currentPriority =
    Priorities.find(p => p.value === chore?.priority) || null

  // Shared action list, rendered as MenuItems on large screens and as a
  // ListItemButton list inside an AppModal sheet on small screens.
  const actionItems = [
    {
      key: 'completeNote',
      icon: <NoteAdd />,
      label: t('actionMenu.completeWithNote'),
      onClick: () => {
        onCompleteWithNote?.()
        handleMenuClose()
      },
    },
    {
      key: 'completePast',
      icon: <Update />,
      label: t('actionMenu.completeInPast'),
      onClick: () => {
        onCompleteWithPastDate?.()
        handleMenuClose()
      },
    },
    {
      key: 'skip',
      icon: <SwitchAccessShortcut />,
      label: t('actionMenu.skipToNext'),
      onClick: handleSkip,
    },
    {
      key: 'delegate',
      icon: <RecordVoiceOver />,
      label: t('modals.delegate'),
      onClick: () => {
        onChangeAssignee?.()
        handleMenuClose()
      },
    },
    isOfficialInstance && {
      key: 'nudge',
      icon: <Notifications />,
      label: t('actionMenu.sendNudge'),
      onClick: () => {
        onNudge?.()
        handleMenuClose()
      },
    },
    { key: 'divider-1', type: 'divider' },
    {
      key: 'history',
      icon: <ManageSearch />,
      label: t('actionMenu.history'),
      onClick: handleHistory,
    },
    { key: 'divider-2', type: 'divider' },
    { key: 'quickSchedule', type: 'quickSchedule' },
    { key: 'divider-3', type: 'divider' },
    {
      key: 'changeDueDate',
      icon: <MoreTime />,
      label: t('modals.changeDueDate'),
      onClick: () => {
        onChangeDueDate?.()
        handleMenuClose()
      },
    },
    onChangePriority && {
      key: 'priority',
      icon: <Flag />,
      label: 'Priority',
      onClick: () => setShowPriorityPicker(true),
      endDecorator: (
        <Chip
          size='sm'
          variant='soft'
          color={currentPriority?.color || 'neutral'}
        >
          {currentPriority?.name.trim() || 'None'}
        </Chip>
      ),
    },
    {
      key: 'writeNfc',
      icon: <Nfc />,
      label: t('actionMenu.writeNFC'),
      onClick: () => {
        onWriteNFC?.()
        handleMenuClose()
      },
    },
    { key: 'edit', icon: <Edit />, label: t('choreView.edit'), onClick: handleEdit },
    { key: 'clone', icon: <CopyAll />, label: t('actionMenu.clone'), onClick: handleClone },
    { key: 'view', icon: <ViewCarousel />, label: t('actionMenu.view'), onClick: handleView },
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
      label: t('actionMenu.moveToProject'),
      onClick: () => setShowProjectPicker(true),
    },
    { key: 'divider-4', type: 'divider' },
    {
      key: 'delete',
      icon: <Delete />,
      label: t('archived.delete'),
      onClick: handleDelete,
      color: 'danger',
    },
  ]
    .filter(Boolean)
    .filter(item => !hiddenActions.includes(item.key))

  const visibleActionItems = collapseDividers(actionItems)

  const quickScheduleButtons = (
    <>
      <Tooltip title={t('duePicker.today')} placement='top'>
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
      <Tooltip title={t('duePicker.tomorrow')} placement='top'>
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
      <Tooltip title={t('duePicker.weekend')} placement='top'>
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
      <Tooltip title={t('duePicker.nextWeek')} placement='top'>
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
      <Tooltip title={t('actionMenu.removeDueDate')} placement='top'>
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
    visibleActionItems.map(item => {
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
          {item.endDecorator && (
            <ListItemDecorator sx={{ ml: 'auto', minInlineSize: 0 }}>
              {item.endDecorator}
            </ListItemDecorator>
          )}
        </MenuItem>
      )
    })

  const renderModalActionItems = () =>
    visibleActionItems.map(item => {
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
            {item.endDecorator}
          </ListItemButton>
        </ListItem>
      )
    })

  const priorityOptions = [...Priorities, NO_PRIORITY]

  const renderModalPriorityPicker = () =>
    priorityOptions.map(priority => (
      <ListItem key={priority.value}>
        <ListItemButton
          selected={(currentPriority?.value || 0) === priority.value}
          color={priority.color || 'neutral'}
          onClick={() => handleChangePriority(priority)}
        >
          <ListItemDecorator>{priority.icon || <Flag />}</ListItemDecorator>
          <ListItemContent>{priority.name.trim()}</ListItemContent>
        </ListItemButton>
      </ListItem>
    ))

  const renderMenuPriorityPicker = () => (
    <>
      <MenuItem
        onClick={e => {
          e.stopPropagation()
          setShowPriorityPicker(false)
        }}
        sx={{ gap: 1 }}
      >
        <ArrowBack fontSize='small' />
        <Typography level='body-sm' fontWeight={600}>
          Priority
        </Typography>
      </MenuItem>
      <Divider />
      {priorityOptions.map(priority => (
        <MenuItem
          key={priority.value}
          selected={(currentPriority?.value || 0) === priority.value}
          color={priority.color || 'neutral'}
          onClick={e => {
            e.stopPropagation()
            handleChangePriority(priority)
          }}
        >
          {priority.icon || <Flag />}
          {priority.name.trim()}
        </MenuItem>
      ))}
    </>
  )

  const renderModalProjectPicker = () => (
    <>
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
    </>
  )

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: handleMenuOpen,
          onMouseEnter,
          onMouseLeave,
        })
      ) : (
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
      )}

      {isSmallScreen ? (
        <AppModal
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          title={
            showProjectPicker
              ? 'Move to project'
              : showPriorityPicker
                ? 'Priority'
                : chore?.name
          }
          mobilePresentation='sheet'
          showHandle
          contentSx={{ px: 0, pb: 1 }}
        >
          {(showProjectPicker || showPriorityPicker) && (
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              startDecorator={<ArrowBack fontSize='small' />}
              onClick={() => {
                setShowProjectPicker(false)
                setShowPriorityPicker(false)
              }}
              sx={{ mx: 2, mb: 1 }}
            >
              <Typography level='body-sm' fontWeight={600}>
                {t('common:back')}
              </Typography>
            </Button>
          )}
          <List sx={{ '--ListItem-radius': '8px', px: 1 }}>
            {showProjectPicker
              ? renderModalProjectPicker()
              : showPriorityPicker
                ? renderModalPriorityPicker()
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
          {showPriorityPicker ? (
            renderMenuPriorityPicker()
          ) : showProjectPicker ? (
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
