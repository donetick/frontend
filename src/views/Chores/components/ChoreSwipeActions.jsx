import { LeadingActions, TrailingActions } from '@meauxt/react-swipeable-list'
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
      <LeadingActions>
        <SwipeActionButton
          disabled={!permissions.approve}
          reason={t('swipeRestrictions.approval')}
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
    <LeadingActions>
      <SwipeActionButton
        disabled={!permissions.complete || unavailable}
        reason={t(
          !permissions.complete
            ? 'swipeRestrictions.complete'
            : 'swipeRestrictions.window',
        )}
        onClick={act(isInProgress ? 'complete' : 'start')}
        bgcolor='primary.solidBg'
        color='primary.solidColor'
        icon={isInProgress ? <Check /> : <PlayArrow />}
        label={isInProgress ? t('list.complete') : t('choreView.start')}
        offsetTop={offsetTop}
      />
      <SwipeActionButton
        disabled={unavailable}
        reason={t('swipeRestrictions.window')}
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
        reason={t('swipeRestrictions.approval')}
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
        reason={t('swipeRestrictions.edit')}
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
      reason={t('swipeRestrictions.edit')}
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
      reason={t('swipeRestrictions.edit')}
      onClick={act('delete')}
      bgcolor='danger.500'
      color='#fff'
      icon={<Delete />}
      label={t('common:delete')}
      offsetTop={offsetTop}
    />,
  )
  return <TrailingActions>{actions}</TrailingActions>
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
    <LeadingActions>
      <SwipeActionButton
        disabled={!permissions.archive}
        reason={t('swipeRestrictions.restore')}
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
    <TrailingActions>
      <SwipeActionButton
        disabled={!permissions.edit}
        reason={t('swipeRestrictions.edit')}
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
