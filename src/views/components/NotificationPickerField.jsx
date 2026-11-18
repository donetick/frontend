import { Close, NotificationsNone } from '@mui/icons-material'
import { Box, Button, FormHelperText, IconButton, Typography } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions'
import NotificationTemplate from '../../components/NotificationTemplate'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { isValidOverdueNagging } from '../../utils/overdueNagging'
import OverdueNaggingSettings from './OverdueNaggingSettings'

const getDisplayLabel = (templates, t) => {
  if (!templates || templates.length === 0) return t('remind.remind')
  const count = templates.length
  if (count === 1) {
    const n = templates[0]
    const numericValue = Number(n.value)
    if (numericValue === 0) return t('remind.onDueDate')
    const unitName =
      n.unit === 'm'
        ? t('remind.unitMin')
        : n.unit === 'h'
          ? t('remind.unitHr')
          : t('remind.unitDay')
    const absValue = Math.abs(numericValue)
    const direction = numericValue < 0 ? t('remind.before') : t('remind.after')
    return `${t('remind.duration', { count: absValue, unit: unitName })} ${direction}`
  }
  return t('remind.reminder', { count })
}

const NotificationPickerField = ({
  emptyDisplay = 'icon-text',
  naggingAllowed,
  onChange,
  onClear,
  remindersAllowed = true,
  remindersUnavailableReason = 'remindersNeedDueDate',
  size = 'sm',
  value,
}) => {
  const { t } = useTranslation('chores')
  const [isOpen, setIsOpen] = useState(false)
  const [nagging, setNagging] = useState(null)
  const latestTemplatesRef = useRef(value?.templates || [])
  const { ResponsiveModal } = useResponsiveModal()

  useEffect(() => {
    if (isOpen) {
      latestTemplatesRef.current = value?.templates || []
    }
  }, [isOpen, value])

  const templates = value?.templates || []
  const hasNotifications = templates.length > 0
  const hasNagging = naggingAllowed && Boolean(value?.overdueNagging)
  const shouldShowLabel =
    hasNotifications || hasNagging || emptyDisplay === 'icon-text'
  const displayLabel = !remindersAllowed
    ? t(`remind.${remindersUnavailableReason}Short`)
    : !hasNotifications && hasNagging
      ? t('remind.overdueNagging')
      : getDisplayLabel(templates, t)

  const handleSave = () => {
    onChange({
      ...value,
      templates: latestTemplatesRef.current,
      ...(naggingAllowed !== undefined && { overdueNagging: nagging }),
    })
    setIsOpen(false)
  }

  const footer = (
    <ModalActions
      tertiary={
        hasNotifications
          ? {
              label: t('common:removeAll'),
              color: 'danger',
              onClick: () => {
                onClear?.()
                setIsOpen(false)
              },
            }
          : undefined
      }
      secondary={{
        label: t('choreView.cancel'),
        onClick: () => setIsOpen(false),
      }}
      primary={{
        label: t('common:apply'),
        onClick: handleSave,
        disabled:
          !remindersAllowed ||
          (naggingAllowed && !isValidOverdueNagging(nagging)),
      }}
    />
  )

  return (
    <>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Button
          size={size}
          variant={hasNotifications || hasNagging ? 'soft' : 'outlined'}
          color='neutral'
          onClick={() => {
            setNagging(value?.overdueNagging ?? null)
            setIsOpen(true)
          }}
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
            aria-label={t('remind.removeAria')}
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
        title={t('remind.title')}
        footer={footer}
      >
        {remindersAllowed ? (
          <NotificationTemplate
            value={value}
            minNotifications={0}
            onChange={({ notifications }) => {
              latestTemplatesRef.current = notifications
            }}
            showTimeline={false}
          />
        ) : (
          <FormHelperText>
            {t(`remind.${remindersUnavailableReason}`)}
          </FormHelperText>
        )}
        {naggingAllowed !== undefined && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <OverdueNaggingSettings
              allowed={naggingAllowed}
              value={nagging}
              onChange={setNagging}
            />
          </Box>
        )}
      </ResponsiveModal>
    </>
  )
}

export default NotificationPickerField
