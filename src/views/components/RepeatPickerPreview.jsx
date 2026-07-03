import { Close, Repeat } from '@mui/icons-material'
import { Box, Button, IconButton, Sheet, Typography } from '@mui/joy'
import { ClickAwayListener, Popper } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Z_INDEX } from '../../constants/zIndex'
import { getRecurrentChipText } from '../../utils/ChoreCardHelpers'

const REPEAT_PRESETS = [
  {
    id: 'daily',
    label: 'Daily',
    frequencyType: 'interval',
    frequency: 1,
    frequencyMetadata: { unit: 'days' },
  },
  {
    id: 'weekly',
    label: 'Weekly',
    frequencyType: 'interval',
    frequency: 1,
    frequencyMetadata: { unit: 'weeks' },
  },
  {
    id: 'monthly',
    label: 'Monthly',
    frequencyType: 'interval',
    frequency: 1,
    frequencyMetadata: { unit: 'months' },
  },
  {
    id: 'yearly',
    label: 'Yearly',
    frequencyType: 'interval',
    frequency: 1,
    frequencyMetadata: { unit: 'years' },
  },
]

const matchPreset = value => {
  if (!value) return null
  return (
    REPEAT_PRESETS.find(
      p =>
        p.frequencyType === value.frequencyType &&
        p.frequency === value.frequency &&
        p.frequencyMetadata?.unit === value.frequencyMetadata?.unit,
    ) || null
  )
}

const RepeatPickerPreview = ({
  value,
  onChange,
  onClear,
  emptyDisplay = 'icon-text',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const hasRepeat = Boolean(value)
  const selectedPreset = matchPreset(value)
  const shouldShowLabel = hasRepeat || emptyDisplay === 'icon-text'
  const displayLabel = hasRepeat ? getRecurrentChipText(value) : 'Repeat'

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Button
        ref={buttonRef}
        size={size}
        variant={hasRepeat ? 'soft' : 'outlined'}
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
        <Repeat sx={{ fontSize: '20px' }} />
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

      {hasRepeat && onClear && (
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
            '&:hover': { bgcolor: 'danger.softBg' },
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
            { name: 'offset', options: { offset: [0, 8] } },
            {
              name: 'flip',
              options: { fallbackPlacements: ['bottom-start', 'top-start'] },
            },
          ]}
          sx={{ zIndex: Z_INDEX.MODAL_CLOSE_BUTTON + 1 }}
        >
          <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Sheet
              variant='outlined'
              sx={{
                minWidth: 180,
                p: 0.75,
                borderRadius: 'md',
                boxShadow: 'lg',
                bgcolor: 'background.popup',
              }}
            >
              {REPEAT_PRESETS.map((preset, index) => {
                const isSelected = selectedPreset?.id === preset.id
                return (
                  <Button
                    key={preset.id}
                    variant={isSelected ? 'soft' : 'plain'}
                    color='neutral'
                    onClick={() => {
                      onChange({
                        frequencyType: preset.frequencyType,
                        frequency: preset.frequency,
                        frequencyMetadata: preset.frequencyMetadata,
                      })
                      setIsOpen(false)
                    }}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      mb: index === REPEAT_PRESETS.length - 1 ? 0 : 0.5,
                    }}
                  >
                    <Typography level='body-sm'>
                      {getRecurrentChipText(preset)}
                    </Typography>
                  </Button>
                )
              })}
              {hasRepeat && (
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => {
                    onClear?.()
                    setIsOpen(false)
                  }}
                  sx={{ width: '100%', mt: 0.5, justifyContent: 'flex-start' }}
                >
                  No repeat
                </Button>
              )}
            </Sheet>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  )
}

export default RepeatPickerPreview
