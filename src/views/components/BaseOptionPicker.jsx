import { Close, Search } from '@mui/icons-material'
import { Box, Button, IconButton, Input, Sheet, Typography } from '@mui/joy'
import { ClickAwayListener, Popper } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

const BaseOptionPicker = ({
  emptyDisplay = 'icon',
  emptyLabel = 'Select',
  filterItems,
  getItemColor,
  getItemLabel = item => item.label,
  getItemValue = item => item.id,
  getTriggerText,
  items = [],
  menuFooter,
  menuMaxHeight = 280,
  menuMinWidth = 180,
  multiple = false,
  noResultsText,
  onChange,
  onClear,
  onOpenChange,
  onValuesChange,
  open: openProp,
  placement = 'top-start',
  renderItemEnd,
  renderItemStart,
  renderTriggerIcon,
  searchPlaceholder,
  value = null,
  values = [],
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const visibleItems = filterItems ? filterItems(items, query) : items
  const isControlled = openProp !== undefined
  const isOpen = isControlled ? openProp : internalOpen
  const setIsOpen = value => {
    if (!isControlled) setInternalOpen(value)
    const nextValue = typeof value === 'function' ? value(isOpen) : value
    setQuery('')
    onOpenChange?.(nextValue)
  }
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = event => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
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
          aria-label={emptyLabel}
          aria-expanded={isOpen}
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
            {
              name: 'preventOverflow',
              options: {
                rootBoundary: 'viewport',
                padding: 12,
                // Also constrain the vertical axis for top/bottom placements.
                altAxis: true,
                tether: false,
              },
            },
          ]}
          sx={{ zIndex: 'calc(var(--joy-zIndex-modal) + 1)' }}
        >
          <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Sheet
              variant='outlined'
              onKeyDown={event => {
                if (
                  !filterItems ||
                  !['ArrowDown', 'ArrowUp'].includes(event.key)
                )
                  return
                const targets = Array.from(
                  event.currentTarget.querySelectorAll(
                    'input, button:not([disabled])',
                  ),
                )
                const index = targets.indexOf(document.activeElement)
                const direction = event.key === 'ArrowDown' ? 1 : -1
                event.preventDefault()
                targets[
                  (index + direction + targets.length) % targets.length
                ]?.focus()
              }}
              sx={{
                minWidth: menuMinWidth,
                maxWidth: 'calc(100vw - 24px)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: filterItems ? 'min(420px, 70dvh)' : menuMaxHeight,
                overflowY: filterItems ? 'hidden' : 'auto',
                overflowX: 'hidden',
                p: 0.75,
                borderRadius: 'md',
                boxShadow: 'lg',
                bgcolor: 'background.popup',
              }}
            >
              {filterItems && (
                <Input
                  size='sm'
                  placeholder={searchPlaceholder}
                  startDecorator={<Search sx={{ fontSize: 18 }} />}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  slotProps={{ input: { 'aria-label': searchPlaceholder } }}
                  sx={{ mb: 0.75, flexShrink: 0 }}
                />
              )}
              <Box sx={{ overflowY: 'auto', minHeight: 0 }}>
                {visibleItems.length === 0 && noResultsText && (
                  <Typography level='body-sm' role='status' sx={{ p: 1 }}>
                    {noResultsText}
                  </Typography>
                )}
                {visibleItems.map((item, index) => {
                  const optionValue = getItemValue(item)
                  const selected = isSelected(item)
                  const itemColor = getItemColor
                    ? getItemColor(item)
                    : undefined

                  return (
                    <Button
                      key={optionValue ?? index}
                      aria-pressed={multiple ? selected : undefined}
                      variant={selected ? 'soft' : 'plain'}
                      color='neutral'
                      onClick={() => handleSelect(optionValue)}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: 1,
                        whiteSpace: 'nowrap',
                        mb: index === visibleItems.length - 1 ? 0 : 0.5,
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
                      {renderItemEnd?.({ item, selected })}
                    </Button>
                  )
                })}
              </Box>
              {menuFooter && (
                <Box sx={{ mt: 0.5, flexShrink: 0 }}>{menuFooter}</Box>
              )}
            </Sheet>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  )
}

export default BaseOptionPicker
