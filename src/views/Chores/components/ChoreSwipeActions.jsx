import {
  Check,
  Delete,
  Edit,
  PlayArrow,
  Schedule,
  SkipNext,
  ThumbDown,
  ThumbUp,
  Unarchive,
} from '@mui/icons-material'

import SwipeActionButton from '../../../components/common/SwipeActionButton'
import {
  LeadingSwipeActions as LeadingActions,
  TrailingSwipeActions as TrailingActions,
} from '../../../components/common/SwipeActionTray'
import { notInCompletionWindow } from '../../../utils/Chores'
import { hapticMedium } from '../../../utils/Haptics'

// Restricted actions remain in the tray. The row wrappers detect disabled
// declarations and turn off full-swipe commits (including the commit haptic).
export const getChoreLeadingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  permissions = {},
  showActions = true,
  t,
  usesCompactCard = true,
}) => {
  if (isMultiSelectMode || !showActions || chore.isActive === false) return null
  const offsetTop = !usesCompactCard
  const act = action => () => {
    hapticMedium()
    handleChoreAction(action, chore)
  }

  if (chore.status === 3)
    return (
      <LeadingActions
        resourceName={chore.name}
        description={t('permissions.approval')}
      >
        <SwipeActionButton
          disabled={!permissions.approve}
          onClick={act('approve')}
          bgcolor='primary.solidBg'
          color='primary.solidColor'
          icon={<ThumbUp />}
          label={t('choreView.approve')}
          offsetTop={offsetTop}
        />
      </LeadingActions>
    )

  const unavailable = Boolean(notInCompletionWindow(chore))
  const isInProgress = chore.status === 1
  return (
    <LeadingActions
      resourceName={chore.name}
      description={t(
        !permissions.complete ? 'permissions.complete' : 'permissions.window',
      )}
      restrictionLabel={
        permissions.complete && unavailable ? t('swipeUnavailable') : undefined
      }
      title={
        permissions.complete && unavailable ? t('swipeUnavailable') : undefined
      }
    >
      <SwipeActionButton
        disabled={!permissions.complete || unavailable}
        onClick={act(isInProgress ? 'complete' : 'start')}
        bgcolor='primary.solidBg'
        color='primary.solidColor'
        icon={isInProgress ? <Check /> : <PlayArrow />}
        label={isInProgress ? t('list.complete') : t('choreView.start')}
        offsetTop={offsetTop}
      />
      <SwipeActionButton
        disabled={unavailable}
        onClick={act('skip')}
        bgcolor='warning.500'
        color='#fff'
        icon={<SkipNext />}
        label={t('choreView.skip')}
        offsetTop={offsetTop}
      />
    </LeadingActions>
  )
}

export const getChoreTrailingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  navigate,
  permissions = {},
  showActions = true,
  t,
  usesCompactCard = true,
}) => {
  if (isMultiSelectMode || !showActions) return null
  const offsetTop = !usesCompactCard
  const act = action => () => {
    hapticMedium()
    handleChoreAction(action, chore)
  }
  const actions = []
  if (chore.status === 3)
    actions.push(
      <SwipeActionButton
        key='reject'
        disabled={!permissions.approve}
        onClick={act('reject')}
        bgcolor='danger.600'
        color='#fff'
        icon={<ThumbDown />}
        label={t('list.reject')}
        offsetTop={offsetTop}
      />,
    )
  // Keep the tray to three actions; rescheduling a completion awaiting
  // review stays in the overflow menu instead of competing with Reject.
  if (chore.status !== 3)
    actions.push(
      <SwipeActionButton
        key='schedule'
        disabled={!permissions.edit}
        onClick={act('changeDueDate')}
        bgcolor='warning.500'
        color='#fff'
        icon={<Schedule />}
        label={t('list.schedule')}
        offsetTop={offsetTop}
      />,
    )
  actions.push(
    <SwipeActionButton
      key='edit'
      disabled={!permissions.edit}
      onClick={() => {
        hapticMedium()
        navigate(`/chores/${chore.id}/edit`)
      }}
      bgcolor='primary.solidBg'
      color='primary.solidColor'
      icon={<Edit />}
      label={t('common:edit')}
      offsetTop={offsetTop}
    />,
    <SwipeActionButton
      key='delete'
      disabled={!permissions.edit}
      onClick={act('delete')}
      bgcolor='danger.500'
      color='#fff'
      icon={<Delete />}
      label={t('common:delete')}
      offsetTop={offsetTop}
    />,
  )
  return (
    <TrailingActions
      resourceType='task'
      resourceName={chore.name}
      description={chore.status === 3 ? t('swipeReviewPermission') : undefined}
    >
      {actions}
    </TrailingActions>
  )
}

// Only restore/delete apply to archived tasks. Never show start/skip/edit here.
export const getArchivedLeadingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  permissions = {},
  t,
}) => {
  if (isMultiSelectMode) return null
  return (
    <LeadingActions
      resourceName={chore.name}
      description={t('permissions.archive')}
    >
      <SwipeActionButton
        disabled={!permissions.archive}
        onClick={() => {
          hapticMedium()
          handleChoreAction('restore', chore)
        }}
        bgcolor='primary.solidBg'
        color='primary.solidColor'
        icon={<Unarchive />}
        label={t('archived.restore')}
      />
    </LeadingActions>
  )
}

export const getArchivedTrailingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  permissions = {},
  t,
}) => {
  if (isMultiSelectMode) return null
  return (
    <TrailingActions resourceType='task' resourceName={chore.name}>
      <SwipeActionButton
        disabled={!permissions.edit}
        onClick={() => {
          hapticMedium()
          handleChoreAction('delete', chore)
        }}
        bgcolor='danger.500'
        color='#fff'
        icon={<Delete />}
        label={t('archived.delete')}
      />
    </TrailingActions>
  )
}
