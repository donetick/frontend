import {
  Archive,
  Cancel,
  Check,
  ChevronRight,
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
  Pause,
  PlayArrow,
  RecordVoiceOver,
  SwitchAccessShortcut,
  ThumbDown,
  ThumbUp,
  Today,
  Unarchive,
  Update,
  ViewCarousel,
  ViewColumn,
  WbSunny,
  Weekend,
} from '@mui/icons-material'
import { Avatar, Chip, IconButton, ListItemDecorator } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import ActionMenu from '../../components/common/ActionMenu'
import { useChorePermissions } from '../../hooks/useChorePermissions'
import { notInCompletionWindow } from '../../utils/Chores'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import Priorities from '../../utils/Priorities'
import { getIconComponent } from '../../utils/ProjectIcons'
import { useProjects } from '../Projects/ProjectQueries'
import { ProjectAccessIcon } from '../Projects/ProjectVisibilityField'

const NO_PRIORITY = { name: 'No priority', value: 0, color: 'neutral' }

/**
 * The task action list. Owns which actions a chore permits and what each one
 * does; ActionMenu owns how that list is presented per viewport.
 */
const ChoreActionMenu = ({
  additionalActions = [],
  anchorEl,
  chore,
  hiddenActions = [],
  onAction,
  onChangeAssignee,
  onChangeDueDate,
  onChangePriority,
  onClose,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  onNudge,
  onOpen,
  onWriteNFC,
  sections = [],
  sx = {},
  trigger,
  variant = 'soft',
}) => {
  const { t } = useTranslation('chores')
  const permissions = useChorePermissions(chore)
  const completionUnavailable =
    !permissions.complete ||
    (chore && notInCompletionWindow(chore)) ||
    chore?.isActive === false ||
    chore?.status === 3
  const unavailable = [
    ...(!onAction || completionUnavailable
      ? ['complete', 'start', 'pause']
      : []),
    ...(chore?.status === 1 ? ['start'] : ['pause']),
    ...(!onAction || !permissions.approve || chore?.status !== 3
      ? ['approve', 'reject']
      : []),
    ...(chore?.isActive === false ? ['approve'] : []),
    ...(!onAction ||
    chore?.isActive === false ||
    chore?.status === 3 ||
    (chore && notInCompletionWindow(chore))
      ? ['skip']
      : []),
    ...(!permissions.edit
      ? ['edit', 'schedule', 'priority', 'moveToProject', 'moveToSection']
      : []),
    ...(!permissions.edit ? ['delete'] : []),
    ...(!permissions.archive ? ['archive'] : []),
    ...(!permissions.delegate ? ['delegate'] : []),
    ...(completionUnavailable ? ['completeNote', 'completePast'] : []),
  ]
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)
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

  // Every hook above has already run, so bailing here is safe.
  if (!chore) return null

  const handleArchive = () => {
    if (chore.isActive) {
      onAction?.('archive', chore)
    } else {
      onAction?.('unarchive', chore)
    }
  }

  // Quick-schedule always moves the date only and leaves the task at
  // "anytime" — the app-wide no-specific-time stamp is 23:59:59 (see
  // END_OF_DAY in useChoreActions.js and DueDatePickerModal's splitDueDate),
  // so every option below lands there rather than an arbitrary hour.
  const getQuickScheduleDate = option => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(23, 59, 59, 0)

    switch (option) {
      case 'today':
        return today
      case 'tomorrow': {
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        return tomorrow
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

  const scheduleItems = [
    {
      key: 'today',
      icon: <Today />,
      label: t('duePicker.today'),
      onClick: () => handleQuickSchedule('today'),
    },
    {
      key: 'tomorrow',
      icon: <WbSunny />,
      label: t('duePicker.tomorrow'),
      onClick: () => handleQuickSchedule('tomorrow'),
    },
    {
      key: 'weekend',
      icon: <Weekend />,
      label: t('duePicker.weekend'),
      onClick: () => handleQuickSchedule('weekend'),
    },
    {
      key: 'next-week',
      icon: <NextWeek />,
      label: t('duePicker.nextWeek'),
      onClick: () => handleQuickSchedule('next-week'),
    },
    { key: 'divider-presets', type: 'divider' },
    !hiddenActions.includes('changeDueDate') && {
      key: 'custom',
      icon: <MoreTime />,
      label: t('modals.changeDueDate'),
      onClick: () => onChangeDueDate?.(),
    },
    { key: 'divider-remove', type: 'divider' },
    {
      key: 'remove',
      icon: <Cancel />,
      label: t('actionMenu.removeDueDate'),
      onClick: () => handleQuickSchedule('remove'),
    },
  ]

  const priorityItems = [...Priorities, NO_PRIORITY].map(priority => ({
    key: `priority-${priority.value}`,
    icon: priority.icon || <Flag />,
    label: priority.name.trim(),
    color: priority.color || 'neutral',
    selected: (currentPriority?.value || 0) === priority.value,
    onClick: () => onChangePriority?.(priority),
  }))

  const projectItems = [
    {
      key: 'project-default',
      icon: renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen'),
      label: t('actionMenu.defaultProject'),
      selected: !chore.projectId,
      onClick: () =>
        onAction?.('moveToProject', chore, {
          project: { id: null, name: t('actionMenu.defaultProject') },
        }),
    },
    ...projects.map(project => ({
      key: `project-${project.id}`,
      icon: renderProjectAvatar(project.color, project.icon),
      label: (
        <>
          {project.name}
          <ProjectAccessIcon
            project={project}
            sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'text-bottom' }}
          />
        </>
      ),
      selected: chore.projectId === project.id,
      onClick: () => onAction?.('moveToProject', chore, { project }),
    })),
  ]

  const sectionItems = sections.map(section => ({
    key: `section-${section.id}`,
    icon: <ViewColumn />,
    label: section.name,
    selected: chore.sectionId === section.id,
    onClick: () => onAction?.('moveToSection', chore, { section }),
  }))

  // Follow the familiar context-menu hierarchy: navigation first, common task
  // actions next, organization and utilities after that, and destructive
  // actions at the bottom.
  const items = [
    ...additionalActions,
    ...(additionalActions.length
      ? [{ key: 'divider-page', type: 'divider' }]
      : []),
    {
      key: 'view',
      icon: <ViewCarousel />,
      label: t('actionMenu.view'),
      onClick: () => navigate(`/chores/${chore.id}`),
    },
    {
      key: 'edit',
      icon: <Edit />,
      label: t('choreView.edit'),
      onClick: () => navigate(`/chores/${chore.id}/edit`),
    },
    { key: 'divider-primary', type: 'divider' },
    ...[
      { key: 'complete', icon: <Check />, label: t('list.complete') },
      { key: 'start', icon: <PlayArrow />, label: t('choreView.start') },
      { key: 'pause', icon: <Pause />, label: t('choreView.pauseTimer') },
      { key: 'approve', icon: <ThumbUp />, label: t('choreView.approve') },
      {
        key: 'reject',
        icon: <ThumbDown />,
        label: t('list.reject'),
        color: 'danger',
      },
    ].map(item => ({
      ...item,
      onClick: () => onAction?.(item.key, chore),
    })),
    {
      key: 'completeNote',
      icon: <NoteAdd />,
      label: t('actionMenu.completeWithNote'),
      onClick: () => onCompleteWithNote?.(),
    },
    {
      key: 'completePast',
      icon: <Update />,
      label: t('actionMenu.completeInPast'),
      onClick: () => onCompleteWithPastDate?.(),
    },
    {
      key: 'skip',
      icon: <SwitchAccessShortcut />,
      label: t('actionMenu.skipToNext'),
      onClick: () => onAction?.('skip', chore),
    },
    { key: 'divider-task-actions', type: 'divider' },
    {
      key: 'schedule',
      icon: <MoreTime />,
      label: t('choreView.schedule'),
      panel: 'schedule',
      endDecorator: <ChevronRight fontSize='small' />,
    },
    onChangePriority && {
      key: 'priority',
      icon: <Flag />,
      label: t('priority'),
      panel: 'priority',
      endDecorator: (
        <>
          <Chip
            size='sm'
            variant='soft'
            color={currentPriority?.color || 'neutral'}
          >
            {currentPriority?.name.trim() || t('actionMenu.noPriority')}
          </Chip>
          <ChevronRight fontSize='small' />
        </>
      ),
    },
    {
      key: 'delegate',
      icon: <RecordVoiceOver />,
      label: t('modals.delegate'),
      onClick: () => onChangeAssignee?.(),
    },
    projects.length > 0 && {
      key: 'moveToProject',
      icon: <DriveFileMove />,
      label: t('actionMenu.moveToProject'),
      panel: 'project',
      endDecorator: <ChevronRight fontSize='small' />,
    },
    sections.length > 0 && {
      key: 'moveToSection',
      icon: <ViewColumn />,
      label: t('actionMenu.moveToSection'),
      panel: 'section',
      endDecorator: <ChevronRight fontSize='small' />,
    },
    { key: 'divider-utilities', type: 'divider' },
    isOfficialInstance && {
      key: 'nudge',
      icon: <Notifications />,
      label: t('actionMenu.sendNudge'),
      onClick: () => onNudge?.(),
    },
    {
      key: 'history',
      icon: <ManageSearch />,
      label: t('actionMenu.history'),
      onClick: () => navigate(`/chores/${chore.id}/history`),
    },
    {
      key: 'clone',
      icon: <CopyAll />,
      label: t('actionMenu.clone'),
      onClick: () => navigate(`/chores/${chore.id}/edit?clone=true`),
    },
    {
      key: 'writeNfc',
      icon: <Nfc />,
      label: t('actionMenu.writeNFC'),
      onClick: () => onWriteNFC?.(),
    },
    { key: 'divider-destructive', type: 'divider' },
    {
      key: 'archive',
      icon: chore.isActive ? <Archive /> : <Unarchive />,
      label: chore.isActive
        ? t('actionMenu.archive')
        : t('actionMenu.unarchive'),
      onClick: handleArchive,
      color: 'neutral',
    },
    {
      key: 'delete',
      icon: <Delete />,
      label: t('archived.delete'),
      onClick: () => (onDelete ? onDelete() : onAction?.('delete', chore)),
      color: 'danger',
    },
  ]
    .filter(Boolean)
    .filter(
      item =>
        !hiddenActions.includes(item.key) && !unavailable.includes(item.key),
    )

  return (
    <ActionMenu
      anchorEl={anchorEl}
      aria-label={t('choreView.more')}
      items={items}
      onClose={onClose}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onOpen={onOpen}
      panels={{
        schedule: { title: t('choreView.schedule'), items: scheduleItems },
        priority: { title: t('priority'), items: priorityItems },
        project: { title: t('actionMenu.moveToProject'), items: projectItems },
        section: { title: t('actionMenu.moveToSection'), items: sectionItems },
      }}
      // A named sheet gives mobile users context and gives the dialog an
      // accessible label.
      title={chore.name || t('choreView.more')}
      trigger={
        trigger || (
          <ChoreActionMenuTrigger sx={sx} variant={variant} color='success' />
        )
      }
    />
  )
}

/**
 * The trigger button on its own. Rows in a long list use this and hand the
 * click up to a single shared menu, so opening a menu costs one component
 * instead of N.
 */
export const ChoreActionMenuTrigger = ({
  'aria-label': ariaLabel,
  color = 'success',
  onClick,
  onMouseEnter,
  onMouseLeave,
  sx = {},
  variant = 'soft',
  ...props
}) => {
  const { t } = useTranslation('chores')

  return (
    <IconButton
      aria-haspopup='menu'
      aria-label={ariaLabel || t('choreView.more')}
      variant={variant}
      color={color}
      onClick={onClick}
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
      {...props}
    >
      <MoreVert />
    </IconButton>
  )
}

export default ChoreActionMenu
