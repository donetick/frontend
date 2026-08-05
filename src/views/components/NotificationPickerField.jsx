import { Close, NotificationsNone } from '@mui/icons-material'
import { Box, Button, IconButton, Typography } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'
import ModalActions from '../../components/common/ModalActions'
import NotificationTemplate from '../../components/NotificationTemplate'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'

const getDisplayLabel = templates => {
  if (!templates || templates.length === 0) return 'Remind'
  const count = templates.length
  if (count === 1) {
    const n = templates[0]
    const numericValue = Number(n.value)
    if (numericValue === 0) return 'On due date'
    const unitName = n.unit === 'm' ? 'min' : n.unit === 'h' ? 'hr' : 'day'
    const absValue = Math.abs(numericValue)
    const plural = absValue !== 1 ? 's' : ''
    return `${absValue} ${unitName}${plural} ${numericValue < 0 ? 'before' : 'after'}`
  }
  return `${count} reminders`
}

const NotificationPickerField = ({
  value,
  onChange,
  onClear,
  emptyDisplay = 'icon-text',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const latestTemplatesRef = useRef(value?.templates || [])
  const { ResponsiveModal } = useResponsiveModal()

  useEffect(() => {
    if (isOpen) {
      latestTemplatesRef.current = value?.templates || []
    }
  }, [isOpen, value])

  const templates = value?.templates || []
  const hasNotifications = templates.length > 0
  const shouldShowLabel = hasNotifications || emptyDisplay === 'icon-text'
  const displayLabel = getDisplayLabel(templates)

  const handleSave = () => {
    onChange({ ...value, templates: latestTemplatesRef.current })
    setIsOpen(false)
  }

  const footer = (
    <ModalActions
      tertiary={
        hasNotifications
          ? {
              label: 'Remove all',
              color: 'danger',
              onClick: () => {
                onClear?.()
                setIsOpen(false)
              },
            }
          : undefined
      }
      secondary={{ label: 'Cancel', onClick: () => setIsOpen(false) }}
      primary={{ label: 'Apply', onClick: handleSave }}
    />
  )

  return (
    <>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Button
          size={size}
          variant={hasNotifications ? 'soft' : 'outlined'}
          color='neutral'
          onClick={() => setIsOpen(true)}
          sx={{
            minHeight: 40,
            borderRadius: '128px',
            minWidth: 'min-content',
            px: shouldShowLabel ? 1.25 : 0.75,
            gap: shouldShowLabel ? 1 : 0,
            justifyContent: 'flex-start',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s ease-in-out',
          }}
        >
          <NotificationsNone sx={{ fontSize: '20px' }} />
          <Typography
            level='body-sm'
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: shouldShowLabel ? 220 : 0,
              opacity: shouldShowLabel ? 1 : 0,
              transform: shouldShowLabel ? 'translateX(0)' : 'translateX(-4px)',
              transition:
                'max-width 0.25s ease-in-out, opacity 0.2s ease-in-out, transform 0.25s ease-in-out',
            }}
          >
            {displayLabel}
          </Typography>
        </Button>

        {hasNotifications && onClear && (
          <IconButton
            aria-label='Remove reminders'
            size='sm'
            variant='soft'
            color='danger'
            onClick={e => {
              e.stopPropagation()
              onClear?.()
            }}
            sx={{
              position: 'absolute',
              top: -18,
              right: -18,
              zIndex: 10,
              borderRadius: '50%',
              '&:hover': { bgcolor: 'danger.softBg' },
            }}
          >
            <Close sx={{ fontSize: '18px' }} />
          </IconButton>
        )}
      </Box>

      <ResponsiveModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title='Reminders'
        footer={footer}
      >
        <NotificationTemplate
          value={value}
          minNotifications={0}
          onChange={({ notifications }) => {
            latestTemplatesRef.current = notifications
          }}
          showTimeline={false}
        />
      </ResponsiveModal>
    </>
  )
}

export default NotificationPickerField
