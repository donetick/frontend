import { CalendarMonth, Close } from '@mui/icons-material'
import { Box, Button, IconButton, Typography } from '@mui/joy'
import moment from 'moment'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DueDatePickerModal from './DueDatePickerModal'

const DueDatePickerField = ({
  dueDateOnly,
  dueTime,
  useCustomTime,
  onDueDateChange,
  onDueTimeChange,
  onUseCustomTimeChange,
  onClear,
  emptyDisplay = 'icon-text',
  size = 'sm',
}) => {
  const { t } = useTranslation('chores')
  const [isOpen, setIsOpen] = useState(false)

  const handleSave = ({
    dueDateOnly: nextDate,
    dueTime: nextTime,
    useCustomTime: nextUseCustomTime,
  }) => {
    onDueDateChange?.({ target: { value: nextDate || '' } })
    onUseCustomTimeChange?.(nextUseCustomTime)
    onDueTimeChange?.({
      target: { value: nextUseCustomTime && nextTime ? nextTime : '' },
    })
    setIsOpen(false)
  }

  const hasDueDate = Boolean(dueDateOnly)
  const shouldShowLabel = hasDueDate || emptyDisplay === 'icon-text'

  const dueDateLabel = useMemo(() => {
    if (!dueDateOnly) {
      return t('duePicker.due')
    }

    const formattedDate = moment(dueDateOnly).format('MMM D')
    if (useCustomTime && dueTime) {
      return `${formattedDate}, ${dueTime}`
    }

    return formattedDate
  }, [dueDateOnly, dueTime, useCustomTime])

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Button
          size={size}
          variant={hasDueDate ? 'soft' : 'outlined'}
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
          <CalendarMonth sx={{ fontSize: '20px' }} />
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
            {dueDateLabel}
          </Typography>
        </Button>
        {hasDueDate && onClear && (
          <IconButton
            aria-label={t('dueDateClearAria')}
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
              '&:hover': {
                bgcolor: 'danger.softBg',
              },
            }}
          >
            <Close sx={{ fontSize: '18px' }} />
          </IconButton>
        )}
      </Box>

      <DueDatePickerModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dueDateOnly={dueDateOnly}
        dueTime={dueTime}
        useCustomTime={useCustomTime}
        onApply={handleSave}
        onRemove={
          onClear
            ? () => {
                onClear()
                setIsOpen(false)
              }
            : undefined
        }
      />
    </>
  )
}

export default DueDatePickerField
