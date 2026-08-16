import { Add, Check } from '@mui/icons-material'
import {
  Box,
  Button,
  Divider,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Radio,
  Typography,
} from '@mui/joy'
import IconButton from '@mui/joy/IconButton'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'

const SortAndGrouping = ({
  icon,
  isActive,
  k,
  label,
  onCreateNewFilter,
  onItemSelect,
  selectedFilter,
  selectedItem,
  setFilter,
  setSelectedItem,
  title,
  useChips,
}) => {
  const { t } = useTranslation('chores')
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget)
    setIsKeyboardNavigating(false)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  useEffect(() => {
    const handleMenuOutsideClick = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleMenuClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = event => {
      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey

      // Cmd/Ctrl + G to open sort menu
      if (isHoldingCmdOrCtrl && event.key === 'g') {
        event.preventDefault()
        if (!anchorEl) {
          setAnchorEl(buttonRef.current)
          setSelectedIndex(0)
          setIsKeyboardNavigating(true)
        } else {
          handleMenuClose()
        }
        return
      }

      // Only handle navigation keys when menu is open
      if (!anchorEl) return

      const groupByItems = [
        { name: t('sort.smart'), value: 'default' },
        { name: t('group.dueDate'), value: 'due_date' },
        { name: t('priority'), value: 'priority' },
        { name: t('labels.label'), value: 'labels' },
        { name: t('sort.createdDate'), value: 'created_date' },
        { name: t('sort.updatedDate'), value: 'updated_date' },
      ]

      const filterItems = [
        'anyone',
        'assigned_to_me',
        'available_for_me',
        'assigned_to_others',
      ]

      // Total selectable items: 4 (group by) + 3 (filters) + 1 (create custom filter) = 8
      const totalItems = groupByItems.length + filterItems.length + 1

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setIsKeyboardNavigating(true)
          setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          event.preventDefault()
          setIsKeyboardNavigating(true)
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex < groupByItems.length) {
            // Group by items (0-3)
            const item = groupByItems[selectedIndex]
            onItemSelect(item)
            setSelectedItem?.(item.name)
            handleMenuClose()
          } else if (selectedIndex < groupByItems.length + filterItems.length) {
            // Filter items (4-6)
            const filterIndex = selectedIndex - groupByItems.length
            setFilter(filterItems[filterIndex])
            handleMenuClose()
          } else {
            // Create custom filter (7)
            onCreateNewFilter()
            handleMenuClose()
          }
          break
        case 'Escape':
          event.preventDefault()
          handleMenuClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    anchorEl,
    selectedIndex,
    onItemSelect,
    setSelectedItem,
    setFilter,
    onCreateNewFilter,
  ])

  // Reset selected index when menu opens
  useEffect(() => {
    if (anchorEl) {
      setSelectedIndex(0)
    }
  }, [anchorEl])

  // Keyboard shortcut hint handler
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const MenuItem_QuickFilter = props => {
    return (
      <MenuItem
        key={props.key}
        onClick={() => {
          setFilter(props.filterKey)
          handleMenuClose()
        }}
        onMouseEnter={() => setIsKeyboardNavigating(false)}
        sx={{
          borderRadius: 'var(--joy-radius-sm)',
          backgroundColor:
            selectedFilter === props.filterKey
              ? 'var(--joy-palette-primary-softBg)'
              : selectedIndex === props.index &&
                  anchorEl &&
                  isKeyboardNavigating
                ? 'var(--joy-palette-neutral-softHoverBg)'
                : 'transparent',
          '&:hover': {
            backgroundColor:
              selectedFilter === props.filterKey
                ? 'var(--joy-palette-primary-softBg)'
                : 'var(--joy-palette-neutral-softHoverBg)',
          },
        }}
      >
        <ListItemDecorator>
          <Radio
            checked={selectedFilter === props.filterKey}
            variant='outlined'
          />
        </ListItemDecorator>
        <ListItemContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              level='body-sm'
              sx={{
                fontWeight: selectedFilter === props.filterKey ? 600 : 400,
                color:
                  selectedFilter === props.filterKey
                    ? 'var(--joy-palette-primary-600)'
                    : 'var(--joy-palette-text-primary)',
              }}
            >
              {props.label}
            </Typography>
          </Box>
        </ListItemContent>
      </MenuItem>
    )
  }

  return (
    <>
      {!label && (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            ref={buttonRef}
            onClick={handleMenuOpen}
            variant='outlined'
            color={isActive ? 'primary' : 'neutral'}
            size='sm'
            sx={{
              height: 24,
              borderRadius: 24,
            }}
            title={t('sort.sortAndGroup')}
          >
            {icon}
            {label ? label : null}
          </IconButton>
          <KeyboardShortcutHint
            shortcut='G'
            show={showKeyboardShortcuts}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 1000,
            }}
          />
        </Box>
      )}
      {label && (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Button
            ref={buttonRef}
            onClick={handleMenuOpen}
            variant='outlined'
            color={isActive ? 'primary' : 'neutral'}
            size='sm'
            startDecorator={icon}
            sx={{
              height: 24,
              borderRadius: 24,
            }}
            title={t('sort.sortAndGroup')}
          >
            {label}
          </Button>
          <KeyboardShortcutHint
            shortcut='G'
            show={showKeyboardShortcuts}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 1000,
            }}
          />
        </Box>
      )}

      <Menu
        key={k}
        ref={menuRef}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        placement='bottom-start'
        sx={{
          minWidth: 280,
          p: 1,
          '--List-gap': '4px',
          boxShadow: 'var(--joy-shadow-lg)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: 'var(--joy-radius-md)',
        }}
      >
        <MenuItem
          disabled
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            cursor: 'default',
            opacity: 1,
          }}
        >
          <ListItemContent>
            <Typography level='title-sm' sx={{ fontWeight: 600 }}>
              {title || t('sort.groupBy')}
            </Typography>
          </ListItemContent>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {[
          { name: t('sort.smart'), value: 'default' },
          { name: t('group.dueDate'), value: 'due_date' },
          { name: t('priority'), value: 'priority' },
          { name: t('labels.label'), value: 'labels' },
          { name: t('sort.createdDate'), value: 'created_date' },
          { name: t('sort.updatedDate'), value: 'updated_date' },
        ].map((item, index) => (
          <MenuItem
            key={`${k}-${item?.value}`}
            onClick={() => {
              onItemSelect(item)
              setSelectedItem?.(item.name)
              handleMenuClose()
            }}
            onMouseEnter={() => setIsKeyboardNavigating(false)}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              backgroundColor:
                selectedItem === item.value
                  ? 'var(--joy-palette-primary-softBg)'
                  : selectedIndex === index && anchorEl && isKeyboardNavigating
                    ? 'var(--joy-palette-neutral-softHoverBg)'
                    : 'transparent',
              '&:hover': {
                backgroundColor:
                  selectedItem === item.value
                    ? 'var(--joy-palette-primary-softBg)'
                    : 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{
                    fontWeight: selectedItem === item.value ? 600 : 400,
                    color:
                      selectedItem === item.value
                        ? 'var(--joy-palette-primary-600)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  {item.name}
                </Typography>
                {selectedItem === item.value && (
                  <Check
                    sx={{
                      fontSize: '16px',
                      color: 'var(--joy-palette-primary-500)',
                    }}
                  />
                )}
              </Box>
            </ListItemContent>
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          disabled
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            cursor: 'default',
            opacity: 1,
          }}
        >
          <ListItemContent>
            <Typography level='title-sm' sx={{ fontWeight: 600 }}>
              {t('sort.quickFilters')}
            </Typography>
          </ListItemContent>
        </MenuItem>

        <MenuItem
          disabled
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            cursor: 'default',
            opacity: 1,
            paddingY: '4px',
          }}
        >
          <ListItemContent>
            <Typography level='body-xs' sx={{ fontWeight: 600 }}>
              {t('sort.assignedTo')}
            </Typography>
          </ListItemContent>
        </MenuItem>

        <MenuItem_QuickFilter
          key={`${k}-assignee-anyone`}
          index={4}
          filterKey='anyone'
          label={t('assignee.anyone')}
        />

        <MenuItem_QuickFilter
          key={`${k}-assignee-assigned-to-me`}
          index={5}
          filterKey='assigned_to_me'
          label={t('sort.assignedToMe')}
        />

        <MenuItem_QuickFilter
          key={`${k}-assignee-available-for-me`}
          index={6}
          filterKey='available_for_me'
          label={t('sort.availableForMe')}
        />

        <MenuItem_QuickFilter
          key={`${k}-assignee-assigned-to-others`}
          index={7}
          filterKey='assigned_to_others'
          label={t('sort.assignedToOthers')}
        />

        <Divider sx={{ my: 1 }} />

        <MenuItem
          key={`${k}-custom-filter`}
          onClick={() => {
            onCreateNewFilter()
            handleMenuClose()
          }}
          onMouseEnter={() => setIsKeyboardNavigating(false)}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            backgroundColor:
              selectedIndex === 8 && anchorEl && isKeyboardNavigating
                ? 'var(--joy-palette-success-softHoverBg)'
                : 'transparent',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-success-softHoverBg)',
            },
          }}
        >
          <ListItemDecorator sx={{ color: 'var(--joy-palette-success-500)' }}>
            <Add />
          </ListItemDecorator>
          <ListItemContent>
            <Typography
              level='body-sm'
              sx={{
                fontWeight: 500,
              }}
            >
              {t('sort.createFilter')}
            </Typography>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              {t('sort.createFilterHint')}
            </Typography>
          </ListItemContent>
        </MenuItem>
      </Menu>
    </>
  )
}

export default SortAndGrouping
