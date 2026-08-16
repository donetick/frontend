import { ArrowDownward, ArrowUpward, Check, Sort } from '@mui/icons-material'
import {
  Box,
  Divider,
  IconButton,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Radio,
  Typography,
} from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

/**
 * Compact sort + filter menu, meant to sit next to a search input.
 *
 * Props:
 *   sortOptions      - [{ name, value }] shown under the sort header
 *   selectedSort     - currently selected sort value
 *   onSortChange     - (value) => void
 *   sortDirection    - 'asc' | 'desc'
 *   onSortDirectionChange - (direction) => void
 *   filterTitle      - optional header for the filter section
 *   filterOptions    - optional [{ name, value }] rendered as radios
 *   selectedFilter   - currently selected filter value
 *   onFilterChange   - (value) => void
 *   isActive         - highlights the trigger button when a non-default choice is on
 */
const SortAndFilterMenu = ({
  filterOptions,
  filterTitle,
  icon = <Sort />,
  isActive,
  onFilterChange,
  onSortChange,
  onSortDirectionChange,
  selectedFilter,
  selectedSort,
  sortDirection = 'asc',
  sortOptions = [],
  title = 'Sort by',
}) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const handleMenuClose = () => setAnchorEl(null)

  useEffect(() => {
    const handleMenuOutsideClick = event => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        handleMenuClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [])

  const SectionHeader = ({ children }) => (
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
          {children}
        </Typography>
      </ListItemContent>
    </MenuItem>
  )

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={event => setAnchorEl(anchorEl ? null : event.currentTarget)}
        variant='outlined'
        color={isActive ? 'primary' : 'neutral'}
        size='sm'
        sx={{ height: 32, width: 32, borderRadius: '50%', flexShrink: 0 }}
        aria-label='Sort and filter options'
        title='Sort & Filter'
      >
        {icon}
      </IconButton>

      <Menu
        ref={menuRef}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        placement='bottom-end'
        sx={{
          minWidth: 240,
          p: 1,
          '--List-gap': '4px',
          boxShadow: 'var(--joy-shadow-lg)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: 'var(--joy-radius-md)',
          zIndex: 1300,
        }}
      >
        <SectionHeader>{title}</SectionHeader>
        <Divider sx={{ my: 1 }} />

        {sortOptions.map(option => (
          <MenuItem
            key={option.value}
            onClick={() => {
              onSortChange(option.value)
              handleMenuClose()
            }}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              backgroundColor:
                selectedSort === option.value
                  ? 'var(--joy-palette-primary-softBg)'
                  : 'transparent',
              '&:hover': {
                backgroundColor:
                  selectedSort === option.value
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
                    fontWeight: selectedSort === option.value ? 600 : 400,
                    color:
                      selectedSort === option.value
                        ? 'var(--joy-palette-primary-600)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  {option.name}
                </Typography>
                {selectedSort === option.value && (
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

        {onSortDirectionChange && (
          <>
            <Divider sx={{ my: 1 }} />
            <MenuItem
              onClick={() =>
                onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
              }
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator>
                {sortDirection === 'asc' ? (
                  <ArrowUpward sx={{ fontSize: '18px' }} />
                ) : (
                  <ArrowDownward sx={{ fontSize: '18px' }} />
                )}
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm'>
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </Typography>
              </ListItemContent>
            </MenuItem>
          </>
        )}

        {filterOptions?.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <SectionHeader>{filterTitle || 'Filter'}</SectionHeader>
            {filterOptions.map(option => (
              <MenuItem
                key={option.value}
                onClick={() => {
                  onFilterChange(option.value)
                  handleMenuClose()
                }}
                sx={{
                  borderRadius: 'var(--joy-radius-sm)',
                  backgroundColor:
                    selectedFilter === option.value
                      ? 'var(--joy-palette-primary-softBg)'
                      : 'transparent',
                  '&:hover': {
                    backgroundColor:
                      selectedFilter === option.value
                        ? 'var(--joy-palette-primary-softBg)'
                        : 'var(--joy-palette-neutral-softHoverBg)',
                  },
                }}
              >
                <ListItemDecorator>
                  <Radio
                    checked={selectedFilter === option.value}
                    variant='outlined'
                  />
                </ListItemDecorator>
                <ListItemContent>
                  <Typography
                    level='body-sm'
                    sx={{
                      fontWeight: selectedFilter === option.value ? 600 : 400,
                      color:
                        selectedFilter === option.value
                          ? 'var(--joy-palette-primary-600)'
                          : 'var(--joy-palette-text-primary)',
                    }}
                  >
                    {option.name}
                  </Typography>
                </ListItemContent>
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </>
  )
}

export default SortAndFilterMenu
