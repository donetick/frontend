import { SwipeAction, TrailingActions } from '@meauxt/react-swipeable-list'
import {
  Check,
  Delete,
  Edit,
  HourglassEmpty,
  Notifications,
  PlayArrow,
  Schedule,
  ThumbDown,
} from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'

const canApproveReject = (chore, userProfile) =>
  userProfile?.role === 1 || chore.createdBy === userProfile?.id

/**
 * Builds the trailing swipe actions for a chore row: approve/reject or
 * start/complete, reschedule, edit, nudge (official instance only) and
 * delete. Shared by every list that renders swipeable chore rows so the
 * gesture and its actions stay identical everywhere a chore card appears.
 */
export const getChoreTrailingActions = ({
  chore,
  handleChoreAction,
  isMultiSelectMode = false,
  isOfficialInstance = false,
  navigate,
  showActions = true,
  t,
  // The plain ChoreCard floats its priority/label chips above the card body,
  // so the swipe actions need to drop down to align with the card itself.
  userProfile,
  usesCompactCard = true,
}) => {
  if (isMultiSelectMode) return null
  if (!showActions) return null

  return (
    <TrailingActions>
      <Box
        sx={{
          display: 'flex',
          zIndex: 0,
          ...(!usesCompactCard && { mt: '28px', borderRadius: '8px' }),
        }}
      >
        {chore.status === 3 ? (
          canApproveReject(chore, userProfile) ? (
            <SwipeAction onClick={() => handleChoreAction('reject', chore)}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'danger.softBg',
                  color: 'danger.700',
                  px: 3,
                  height: '100%',
                }}
              >
                <ThumbDown sx={{ fontSize: 20 }} />
                <Typography level='body-xs' sx={{ mt: 0.5 }}>
                  {t('list.reject')}
                </Typography>
              </Box>
            </SwipeAction>
          ) : (
            <SwipeAction onClick={() => {}}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'neutral.softBg',
                  color: 'neutral.700',
                  px: 3,
                  height: '100%',
                  opacity: 0.5,
                }}
              >
                <HourglassEmpty sx={{ fontSize: 20 }} />
                <Typography level='body-xs' sx={{ mt: 0.5 }}>
                  {t('list.pending')}
                </Typography>
              </Box>
            </SwipeAction>
          )
        ) : (
          <SwipeAction
            onClick={() => {
              if (chore.status === 0 || chore.status === 2) {
                handleChoreAction('start', chore)
              } else {
                handleChoreAction('complete', chore)
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.softBg',
                color: 'success.700',
                px: 3,
                height: '100%',
              }}
            >
              {chore.status !== 1 ? (
                <PlayArrow sx={{ fontSize: 20 }} />
              ) : (
                <Check sx={{ fontSize: 20 }} />
              )}
              <Typography level='body-xs' sx={{ mt: 0.5 }}>
                {chore.status !== 1 ? t('choreView.start') : t('list.complete')}
              </Typography>
            </Box>
          </SwipeAction>
        )}

        <SwipeAction onClick={() => handleChoreAction('changeDueDate', chore)}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'warning.softBg',
              color: 'warning.700',
              px: 3,
              height: '100%',
            }}
          >
            <Schedule sx={{ fontSize: 20 }} />
            <Typography level='body-xs' sx={{ mt: 0.5 }}>
              {t('list.schedule')}
            </Typography>
          </Box>
        </SwipeAction>

        <SwipeAction onClick={() => navigate(`/chores/${chore.id}/edit`)}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'neutral.softBg',
              color: 'neutral.700',
              px: 3,
              height: '100%',
            }}
          >
            <Edit sx={{ fontSize: 20 }} />
            <Typography level='body-xs' sx={{ mt: 0.5 }}>
              {t('common:edit')}
            </Typography>
          </Box>
        </SwipeAction>

        {isOfficialInstance && (
          <SwipeAction onClick={() => handleChoreAction('nudge', chore)}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'warning.softBg',
                color: 'warning.700',
                px: 3,
                height: '100%',
              }}
            >
              <Notifications sx={{ fontSize: 20 }} />
              <Typography level='body-xs' sx={{ mt: 0.5 }}>
                {t('list.nudge')}
              </Typography>
            </Box>
          </SwipeAction>
        )}

        <SwipeAction onClick={() => handleChoreAction('delete', chore)}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'danger.softBg',
              color: 'danger.700',
              px: 3,
              height: '100%',
            }}
          >
            <Delete sx={{ fontSize: 20 }} />
            <Typography level='body-xs' sx={{ mt: 0.5 }}>
              {t('common:delete')}
            </Typography>
          </Box>
        </SwipeAction>
      </Box>
    </TrailingActions>
  )
}
