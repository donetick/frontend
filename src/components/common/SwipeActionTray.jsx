import { LeadingActions, TrailingActions } from '@meauxt/react-swipeable-list'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { areAllSwipeActionsDisabled } from '../../utils/SwipeActions'

/** One tray-level hint, only when none of the revealed actions is available. */
export default function SwipeActionTray({ children, leading = false }) {
  const { t } = useTranslation('chores')
  const Actions = leading ? LeadingActions : TrailingActions
  const actions = <Actions>{children}</Actions>
  if (!areAllSwipeActionsDisabled(children)) return actions

  // Only disabled trays get a layout wrapper: enabled actions remain direct
  // children of the library's Actions component for full-swipe registration.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>{actions}</Box>
      <Typography
        level='body-xs'
        sx={{
          bgcolor: 'background.level1',
          color: 'text.tertiary',
          fontSize: 10,
          lineHeight: 1.2,
          textAlign: 'center',
          py: 0.125,
          flexShrink: 0,
        }}
      >
        {t('swipeViewOnly')}
      </Typography>
    </Box>
  )
}

export function LeadingSwipeActions({ children }) {
  return <SwipeActionTray leading>{children}</SwipeActionTray>
}

export const TrailingSwipeActions = SwipeActionTray
