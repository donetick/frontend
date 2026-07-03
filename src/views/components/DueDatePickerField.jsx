import {
  CalendarMonth,
  Close,
  NextWeek,
  Today,
  WbSunny,
  Weekend,
} from '@mui/icons-material'
import { Box, Button, IconButton, Input, Sheet, Typography } from '@mui/joy'
import { ClickAwayListener, Popper } from '@mui/material'
import moment from 'moment'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Z_INDEX } from '../../constants/zIndex'

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
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)

  const getQuickScheduleDate = option => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

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
    const date = getQuickScheduleDate(option)
    const dateStr = date.toISOString().split('T')[0]
    onDueDateChange?.({ target: { value: dateStr } })
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = event => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const hasDueDate = Boolean(dueDateOnly)
  const shouldShowLabel = hasDueDate || emptyDisplay === 'icon-text'

  const dueDateLabel = useMemo(() => {
    if (!dueDateOnly) {
      return 'Due'
    }

    const formattedDate = moment(dueDateOnly).format('MMM D')
    if (useCustomTime && dueTime) {
      return `${formattedDate}, ${dueTime}`
    }

    return formattedDate
  }, [dueDateOnly, dueTime, useCustomTime])

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Button
        ref={buttonRef}
        size={size}
        variant={hasDueDate ? 'soft' : 'outlined'}
        color='neutral'
        onClick={() => setIsOpen(prev => !prev)}
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
          size='sm'
          variant='soft'
          color='danger'
          onClick={e => {
            e.stopPropagation()
            onClear?.()
          }}
          sx={{
            position: 'absolute',
            top: -12,
            right: -16,
            zIndex: 10,
            maxHeight: 18,
            maxWidth: 18,
            borderRadius: '50%',
            '&:hover': {
              bgcolor: 'danger.softBg',
            },
          }}
        >
          <Close sx={{ fontSize: '18px' }} />
        </IconButton>
      )}

      {isOpen && (
        <Popper
          open={isOpen}
          anchorEl={buttonRef.current}
          placement='top-start'
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom-start', 'top-start'],
              },
            },
          ]}
          sx={{ zIndex: Z_INDEX.MODAL_CLOSE_BUTTON + 1 }}
        >
          <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Sheet
              variant='outlined'
              sx={{
                minWidth: 260,
                p: 1,
                borderRadius: 'md',
                boxShadow: 'lg',
                bgcolor: 'background.popup',
              }}
            >
              <Typography level='body-sm' sx={{ mb: 0.5 }}>
                Due Date
              </Typography>
              <Box
                sx={{ display: 'flex', gap: 0.5, mb: 1.25, flexWrap: 'wrap' }}
              >
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  startDecorator={<Today sx={{ fontSize: 16 }} />}
                  onClick={() => handleQuickSchedule('today')}
                >
                  Today
                </Button>
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  startDecorator={<WbSunny sx={{ fontSize: 16 }} />}
                  onClick={() => handleQuickSchedule('tomorrow')}
                >
                  Tomorrow
                </Button>
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  startDecorator={<Weekend sx={{ fontSize: 16 }} />}
                  onClick={() => handleQuickSchedule('weekend')}
                >
                  Weekend
                </Button>
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  startDecorator={<NextWeek sx={{ fontSize: 16 }} />}
                  onClick={() => handleQuickSchedule('next-week')}
                >
                  Next week
                </Button>
              </Box>
              <Input
                type='date'
                value={dueDateOnly || ''}
                onChange={onDueDateChange}
                sx={{ mb: 1 }}
              />
              <Typography
                level='body-xs'
                sx={{ mb: 0.5, color: 'text.tertiary' }}
              >
                Due time (optional)
              </Typography>
              <Input
                type='time'
                value={dueTime || ''}
                disabled={!dueDateOnly}
                onChange={e => {
                  if (!useCustomTime) {
                    onUseCustomTimeChange?.(true)
                  }
                  onDueTimeChange?.(e)
                }}
                sx={{ maxWidth: 200, mb: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5 }}>
                <Button
                  size='sm'
                  variant={!useCustomTime ? 'soft' : 'plain'}
                  color='neutral'
                  disabled={!dueDateOnly}
                  onClick={() => onUseCustomTimeChange?.(false)}
                >
                  Anytime
                </Button>
                <Button
                  size='sm'
                  variant={useCustomTime ? 'soft' : 'plain'}
                  color='neutral'
                  disabled={!dueDateOnly}
                  onClick={() => onUseCustomTimeChange?.(true)}
                >
                  Specific time
                </Button>
              </Box>
              {hasDueDate && (
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => {
                    onClear?.()
                    setIsOpen(false)
                  }}
                >
                  Clear due date
                </Button>
              )}
            </Sheet>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  )
}

export default DueDatePickerField
