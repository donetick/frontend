import { LeadingActions, TrailingActions } from '@meauxt/react-swipeable-list'
import { Block as BlockIcon } from '@mui/icons-material'
import { Box, Button } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { areAllSwipeActionsDisabled } from '../../utils/SwipeActions'
import PermissionDeniedModal from './PermissionDeniedModal'

/** Replace wholly unavailable trays with one explicit restriction-details button. */
export default function SwipeActionTray({
  children,
  description,
  leading = false,
  resourceName,
  resourceType = 'item',
  restrictionLabel,
  title,
}) {
  const { t } = useTranslation('chores')
  const [permissionOpen, setPermissionOpen] = useState(false)
  const Actions = leading ? LeadingActions : TrailingActions
  if (!areAllSwipeActionsDisabled(children))
    return <Actions>{children}</Actions>

  // Do not mount SwipeAction: this button explains restrictions, never commits
  // or dismisses a row. The row's original declarations still guard full swipe.
  return (
    <Box
      onClick={event => event.stopPropagation()}
      sx={{ display: 'flex', minWidth: 104, height: '100%' }}
    >
      <Button
        variant='plain'
        color='neutral'
        aria-haspopup='dialog'
        aria-expanded={permissionOpen}
        onClick={event => {
          event.stopPropagation()
          setPermissionOpen(true)
        }}
        sx={{
          flex: 1,
          minHeight: 44,
          borderRadius: 0,
          bgcolor: 'background.level1',
          color: 'text.secondary',
          flexDirection: 'column',
          gap: 0.5,
          px: 1,
          fontSize: 12,
        }}
      >
        <BlockIcon sx={{ fontSize: 22 }} />
        {restrictionLabel || t('swipeNoPermission')}
      </Button>
      {permissionOpen && (
        <PermissionDeniedModal
          open
          onClose={() => setPermissionOpen(false)}
          resourceType={resourceType}
          resourceName={resourceName}
          title={title || t('swipePermissionTitle')}
          description={description}
        />
      )}
    </Box>
  )
}

export function LeadingSwipeActions(props) {
  return <SwipeActionTray {...props} leading />
}

export const TrailingSwipeActions = SwipeActionTray
