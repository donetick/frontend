import { Close } from '@mui/icons-material'
import { Box, Button, IconButton, Sheet, Typography } from '@mui/joy'
import { ClickAwayListener, Popper } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

const BaseOptionPicker = ({
  items = [],
  value = null,
  values = [],
  multiple = false,
  onChange,
  onValuesChange,
  emptyDisplay = 'icon',
  emptyLabel = 'Select',
  placement = 'top-start',
  menuMinWidth = 180,
  menuMaxHeight = 280,
  getItemValue = item => item.id,
  getItemLabel = item => item.label,
  renderItemStart,
  renderTriggerIcon,
  getItemColor,
  getTriggerText,
  onClear,
  menuFooter,
  open: openProp,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const isOpen = isControlled ? openProp : internalOpen
  const setIsOpen = value => {
    if (!isControlled) setInternalOpen(value)
    const nextValue = typeof value === 'function' ? value(isOpen) : value
    onOpenChange?.(nextValue)
  }
  const buttonRef = useRef(null)

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

  const selectedItems = useMemo(() => {
    if (multiple) {
      const selectedSet = new Set(values)
      return items.filter(item => selectedSet.has(getItemValue(item)))
    }

    if (value === null || value === undefined) return []
    return items.filter(item => getItemValue(item) === value)
  }, [items, multiple, value, values, getItemValue])

  const isEmpty = selectedItems.length === 0
  const shouldShowLabel = !isEmpty || emptyDisplay === 'icon-text'

  const triggerText = getTriggerText
    ? getTriggerText({ selectedItems, isEmpty })
    : isEmpty
      ? emptyLabel
      : getItemLabel(selectedItems[0])

  const triggerColor = isEmpty
    ? undefined
    : getItemColor
      ? getItemColor(selectedItems[0])
      : undefined

  const handleSelect = selectedValue => {
    if (multiple) {
      const selectedSet = new Set(values)
      if (selectedSet.has(selectedValue)) {
        selectedSet.delete(selectedValue)
      } else {
        selectedSet.add(selectedValue)
      }
      onValuesChange?.(Array.from(selectedSet))
      return
    }

    onChange?.(selectedValue)
    setIsOpen(false)
  }

  const isSelected = item => {
    const optionValue = getItemValue(item)
    if (multiple) {
      return values.includes(optionValue)
    }
    return value === optionValue
  }

  const handleClear = e => {
    e.stopPropagation()
    onClear?.()
  }

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
          ref={buttonRef}
          size={'sm'}
          variant={isEmpty ? 'outlined' : 'soft'}
          color='neutral'
          onClick={() => setIsOpen(prev => !prev)}
          sx={{
            borderRadius: '128px',
            minHeight: 40,
            minWidth: 'min-content',
            px: shouldShowLabel ? 1.25 : 0.75,
            gap: shouldShowLabel ? 1 : 0,
            justifyContent: 'flex-start',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s ease-in-out',
            backgroundColor: triggerColor ? `${triggerColor}20` : undefined,
            borderColor: triggerColor || undefined,
            color: triggerColor || undefined,
            '&:hover': {
              backgroundColor: triggerColor ? `${triggerColor}28` : undefined,
              borderColor: triggerColor || undefined,
            },
          }}
        >
          {renderTriggerIcon?.({ selectedItems, isEmpty })}
          <Typography
            level='body-sm'
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: shouldShowLabel ? 180 : 0,
              opacity: shouldShowLabel ? 1 : 0,
              transform: shouldShowLabel ? 'translateX(0)' : 'translateX(-4px)',
              transition:
                'max-width 0.25s ease-in-out, opacity 0.2s ease-in-out, transform 0.25s ease-in-out',
            }}
          >
            {triggerText}
          </Typography>
        </Button>
        {!isEmpty && onClear && (
          <IconButton
            size='sm'
            variant='soft'
            color='danger'
            onClick={handleClear}
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
      </Box>

      {isOpen && (
        <Popper
          open={isOpen}
          anchorEl={buttonRef.current}
          placement={placement}
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
          sx={{ zIndex: 'calc(var(--joy-zIndex-modal) + 1)' }}
        >
          <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Sheet
              variant='outlined'
              sx={{
                minWidth: menuMinWidth,
                maxHeight: menuMaxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: 0.75,
                borderRadius: 'md',
                boxShadow: 'lg',
                bgcolor: 'background.popup',
              }}
            >
              {items.map((item, index) => {
                const optionValue = getItemValue(item)
                const selected = isSelected(item)
                const itemColor = getItemColor ? getItemColor(item) : undefined

                return (
                  <Button
                    key={optionValue ?? index}
                    variant={selected ? 'soft' : 'plain'}
                    color='neutral'
                    onClick={() => handleSelect(optionValue)}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      gap: 1,
                      whiteSpace: 'nowrap',
                      mb: index === items.length - 1 ? 0 : 0.5,
                      color: selected
                        ? itemColor || 'text.primary'
                        : 'text.primary',
                    }}
                  >
                    {renderItemStart?.({ item, selected })}
                    <Typography
                      level='body-sm'
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {getItemLabel(item)}
                    </Typography>
                  </Button>
                )
              })}
              {menuFooter && (
                <Box sx={{ mt: items.length > 0 ? 0.5 : 0 }}>{menuFooter}</Box>
              )}
            </Sheet>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  )
}

export default BaseOptionPicker
