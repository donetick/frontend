import {
  LeadingActions,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import {
  Check,
  Delete,
  Edit,
  PlayArrow,
  Schedule,
  ThumbDown,
  ThumbUp,
} from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'
import PropTypes from 'prop-types'

import { hapticMedium } from '../../../utils/Haptics'

const canApproveReject = (chore, userProfile) =>
  userProfile?.role === 1 || chore.createdBy === userProfile?.id

// The plain ChoreCard floats its priority/label chips above the card body, so
// the actions have to drop down to align with the card itself.
const PLAIN_CARD_OFFSET = '28px'

/**
 * One swipe action tile.
 *
 * Solid fills, not `softBg`. The swipe tray is the most committal gesture in
 * the app and needs to read as a set of buttons the moment it peeks out from
 * under the row; the soft tints are near-white in light mode and near-black on
 * our pure-black dark body, which made the whole tray look disabled. Solid
 * fills also sidestep dark mode entirely — only `primary` is overridden for
 * the dark scheme, so success/warning/danger `softBg` fall back to Joy's
 * defaults there and drift away from the palette.
 */
const SwipeActionTile = ({
  bgcolor,
  color = '#fff',
  icon,
  label,
  offsetTop,
}) => (
  // Two boxes on purpose. The library styles `.swipe-action > *` with
  // `flex: 1` and a `justify-content` of flex-start/flex-end depending on the
  // side — written for a row-direction child. On a column tile that would
  // shunt the icon and label to the top or bottom edge, so the outer box stays
  // a row and absorbs those rules, and the inner one owns the column layout.
  <Box
    sx={{
      display: 'flex',
      minWidth: 76,
      height: '100%',
      ...(offsetTop && { mt: PLAIN_CARD_OFFSET }),
    }}
  >
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        bgcolor,
        color,
        px: 2,
      }}
    >
      <Box sx={{ display: 'flex', '& svg': { fontSize: 22 } }}>{icon}</Box>
      <Typography
        level='body-xs'
        sx={{
          color: 'inherit',
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  </Box>
)

SwipeActionTile.propTypes = {
  bgcolor: PropTypes.string.isRequired,
  color: PropTypes.string,
  icon: PropTypes.node.isRequired,
  label: PropTypes.node,
  offsetTop: PropTypes.bool,
}

// Amber at 500 is too light to carry white text; everything else clears 4.5:1
// against white.

/**
 * Leading (swipe-right) action: the single positive, highest-frequency action
 * for the row — complete/start, or approve on a row awaiting review.
 *
 * It lives on its own side so it never competes for width with the destructive
 * actions, and because it is the only leading action the list's `fullSwipe`
 * makes it a one-flick gesture with no aiming.
 */
export const getChoreLeadingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  showActions = true,
  t,
  userProfile,
  usesCompactCard = true,
}) => {
  if (isMultiSelectMode || !showActions) return null

  const offsetTop = !usesCompactCard

  // Awaiting approval: only reviewers get an action, and there is no useful
  // "start" for a task that is already done.
  if (chore.status === 3) {
    if (!canApproveReject(chore, userProfile)) return null
    return (
      <LeadingActions>
        <SwipeAction
          onClick={() => {
            hapticMedium()
            handleChoreAction('approve', chore)
          }}
        >
          <SwipeActionTile
            bgcolor='success.500'
            icon={<ThumbUp sx={{ color: 'white' }} />}
            label={t('choreView.approve')}
            offsetTop={offsetTop}
          />
        </SwipeAction>
      </LeadingActions>
    )
  }

  const isInProgress = chore.status === 1

  return (
    <LeadingActions>
      <SwipeAction
        onClick={() => {
          hapticMedium()
          handleChoreAction(isInProgress ? 'complete' : 'start', chore)
        }}
      >
        <SwipeActionTile
          bgcolor='success.500'
          icon={
            isInProgress ? (
              <Check sx={{ color: 'white' }} />
            ) : (
              <PlayArrow sx={{ color: 'white' }} />
            )
          }
          label={isInProgress ? t('list.complete') : t('choreView.start')}
          offsetTop={offsetTop}
        />
      </SwipeAction>
    </LeadingActions>
  )
}

/**
 * Trailing (swipe-left) actions: reschedule, edit and delete — capped at three
 * so the row stays legible behind them. Apple's guidance is a hard three, and
 * past that the labels are what break first.
 *
 * Nudge is deliberately not here; it is rare, it duplicated Schedule's amber,
 * and it already lives in the overflow menu on every row.
 *
 * Each SwipeAction must be a *direct* child of TrailingActions: the component
 * clones its children to tag the last one as the full-swipe action, so a
 * wrapping Box would both swallow that tag and receive `main`/`trailing` as
 * DOM attributes. Delete is intentionally last (and therefore the full-swipe
 * target) — it opens a confirmation modal rather than deleting outright.
 */
export const getChoreTrailingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  navigate,
  showActions = true,
  t,
  userProfile,
  usesCompactCard = true,
}) => {
  if (isMultiSelectMode || !showActions) return null

  const offsetTop = !usesCompactCard
  const actions = []

  if (chore.status === 3 && canApproveReject(chore, userProfile)) {
    actions.push(
      <SwipeAction
        key='reject'
        onClick={() => {
          hapticMedium()
          handleChoreAction('reject', chore)
        }}
      >
        <SwipeActionTile
          bgcolor='danger.600'
          icon={<ThumbDown sx={{ color: 'white' }} />}
          label={t('list.reject')}
          offsetTop={offsetTop}
        />
      </SwipeAction>,
    )
  }

  actions.push(
    <SwipeAction
      key='schedule'
      onClick={() => {
        hapticMedium()
        handleChoreAction('changeDueDate', chore)
      }}
    >
      <SwipeActionTile
        bgcolor='warning.500'
        icon={<Schedule sx={{ color: 'white' }} />}
        label={t('list.schedule')}
        offsetTop={offsetTop}
      />
    </SwipeAction>,
    <SwipeAction
      key='edit'
      onClick={() => {
        hapticMedium()
        navigate(`/chores/${chore.id}/edit`)
      }}
    >
      <SwipeActionTile
        bgcolor='primary.500'
        icon={<Edit sx={{ color: 'white' }} />}
        label={t('common:edit')}
        offsetTop={offsetTop}
      />
    </SwipeAction>,
    <SwipeAction
      key='delete'
      onClick={() => {
        hapticMedium()
        handleChoreAction('delete', chore)
      }}
    >
      <SwipeActionTile
        bgcolor='danger.500'
        icon={<Delete sx={{ color: 'white' }} />}
        label={t('common:delete')}
        offsetTop={offsetTop}
      />
    </SwipeAction>,
  )

  return <TrailingActions>{actions}</TrailingActions>
}
