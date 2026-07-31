import {
  Check,
  Delete,
  Edit,
  MoreVert,
  Settings,
  Star,
  StarBorder,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTextColorFromBackgroundColor } from '../../../utils/Colors'

const CustomFilterChips = ({
  filters = [],
  activeFilterId,
  onFilterClick,
  onFilterDelete,
  onFilterPin,
  onFilterEdit,
}) => {
  const navigate = useNavigate()
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState(null)

  if (filters.length === 0) return null

  const handleContextMenu = (event, filter) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedFilter(filter)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedFilter(null)
  }

  const handleDelete = () => {
    if (selectedFilter) {
      onFilterDelete(selectedFilter.id)
    }
    handleMenuClose()
  }

  const handlePin = () => {
    if (selectedFilter) {
      onFilterPin(selectedFilter.id)
    }
    handleMenuClose()
  }

  const handleEdit = () => {
    if (selectedFilter && onFilterEdit) {
      onFilterEdit(selectedFilter)
    }
    handleMenuClose()
  }

  const pinnedFilters = filters
    .filter(f => f.isPinned)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))

  if (pinnedFilters.length === 0) return null

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          display: 'flex',
          gap: 0.75,
          overflowX: 'auto',
          py: 1,
          pr: 2,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
      >
        {pinnedFilters.map(filter => {
          const isActive = activeFilterId === filter.id
          const hasWarning = !filter.isValid
          const badgeColor = filter.color || 'var(--joy-palette-neutral-400)'
          const badgeTextColor = filter.color
            ? getTextColorFromBackgroundColor(filter.color)
            : '#ffffff'
          const displayCount =
            filter.count > 99 ? '99+' : (filter.count ?? 0)

          return (
            <Tooltip
              key={filter.id}
              title={
                hasWarning
                  ? `Filter has issues: ${filter.validationIssues?.join(', ')}`
                  : `${filter.description ? filter.description + ' - ' : ''}${filter.count} tasks${filter.overdueCount > 0 ? ` (${filter.overdueCount} overdue)` : ''}`
              }
              placement='bottom'
            >
              <Chip
                variant={isActive ? 'solid' : 'outlined'}
                color={hasWarning ? 'warning' : isActive ? 'primary' : 'neutral'}
                size='md'
                onClick={() => !hasWarning && onFilterClick(filter.id)}
                sx={{
                  cursor: hasWarning ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  px: 1,
                  height: 32,
                  flexShrink: 0,
                  fontWeight: isActive ? 600 : 500,
                  '&:hover': {
                    backgroundColor: isActive ? undefined : 'neutral.softHoverBg',
                  },
                }}
                startDecorator={
                  !hasWarning && (
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isActive ? (
                        <Check
                          sx={{ fontSize: '0.85rem', color: badgeTextColor }}
                        />
                      ) : (
                        <Typography
                          level='body-xs'
                          sx={{
                            fontSize: '0.65rem',
                            lineHeight: 1,
                            color: badgeTextColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            textAlign: 'center',
                          }}
                        >
                          {displayCount}
                        </Typography>
                      )}
                    </Box>
                  )
                }
                endDecorator={
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={e => {
                      e.stopPropagation()
                      handleContextMenu(e, filter)
                    }}
                    sx={{
                      '--IconButton-size': '20px',
                      ml: 0.25,
                      opacity: 0.6,
                      '&:hover': { opacity: 1, backgroundColor: 'transparent' },
                    }}
                  >
                    <MoreVert sx={{ fontSize: '0.95rem' }} />
                  </IconButton>
                }
              >
                <Typography
                  level='body-sm'
                  fontWeight='inherit'
                  sx={{
                    whiteSpace: 'nowrap',
                    maxWidth: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'inherit',
                  }}
                >
                  {filter.name}
                </Typography>
              </Chip>
            </Tooltip>
          )
        })}

        <IconButton
          variant='outlined'
          color='neutral'
          size='sm'
          sx={{ borderRadius: 24, flexShrink: 0 }}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            navigate('/filters')
          }}
        >
          <Settings sx={{ fontSize: '1.1rem' }} />
        </IconButton>
      </Box>

      {/* Fade hint that more chips are scrollable off the trailing edge */}
      <Box
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 24,
          background:
            'linear-gradient(to right, transparent, var(--joy-palette-background-surface, #fff))',
        }}
      />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        placement='bottom-start'
      >
        {selectedFilter && (
          <>
            <MenuItem onClick={handlePin}>
              {selectedFilter.isPinned ? (
                <>
                  <StarBorder sx={{ mr: 1 }} />
                  Unpin filter
                </>
              ) : (
                <>
                  <Star sx={{ mr: 1 }} />
                  Pin filter
                </>
              )}
            </MenuItem>
            {onFilterEdit && (
              <MenuItem onClick={handleEdit}>
                <Edit sx={{ mr: 1 }} />
                Edit filter
              </MenuItem>
            )}
            <MenuItem onClick={handleDelete} color='danger'>
              <Delete sx={{ mr: 1 }} />
              Delete filter
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  )
}

export default CustomFilterChips
