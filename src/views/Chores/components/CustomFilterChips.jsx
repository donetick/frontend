import { Delete, Edit, Star, StarBorder, Warning } from '@mui/icons-material'
import { Box, Chip, Menu, MenuItem, Tooltip, Typography } from '@mui/joy'
import { useState } from 'react'

const CustomFilterChips = ({
  filters = [],
  activeFilterId,
  onFilterClick,
  onFilterDelete,
  onFilterPin,
  onFilterEdit,
}) => {
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

  const sortedFilters = [...filters].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return (b.usageCount || 0) - (a.usageCount || 0)
  })

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        py: 1,
        '&::-webkit-scrollbar': {
          height: 6,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'neutral.400',
          borderRadius: 3,
        },
      }}
    >
      {sortedFilters.map(filter => {
        const isActive = activeFilterId === filter.id
        const hasWarning = !filter.isValid

        return (
          <Tooltip
            key={filter.id}
            title={
              hasWarning
                ? `Filter has issues: ${filter.validationIssues?.join(', ')}`
                : `${filter.count} tasks${filter.overdueCount > 0 ? ` (${filter.overdueCount} overdue)` : ''}`
            }
            placement='bottom'
          >
            <Chip
              variant={isActive ? 'solid' : 'soft'}
              color={hasWarning ? 'warning' : isActive ? 'primary' : 'neutral'}
              size='lg'
              onClick={() => !hasWarning && onFilterClick(filter.id)}
              onContextMenu={e => handleContextMenu(e, filter)}
              sx={{
                cursor: hasWarning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                px: 1.5,
                py: 0.5,
                opacity: hasWarning ? 0.7 : 1,
              }}
              startDecorator={
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {filter.isPinned && (
                    <Star sx={{ fontSize: '0.9rem', color: 'warning.500' }} />
                  )}
                  <Chip
                    size='sm'
                    variant='solid'
                    color={
                      hasWarning ? 'warning' : isActive ? 'primary' : 'neutral'
                    }
                  >
                    {filter.count}
                  </Chip>
                </Box>
              }
              endDecorator={
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {hasWarning && <Warning sx={{ fontSize: '1rem' }} />}
                  {!hasWarning && filter.overdueCount > 0 && (
                    <Chip size='sm' variant='solid' color='danger'>
                      {filter.overdueCount}
                    </Chip>
                  )}
                </Box>
              }
            >
              <Typography
                level='body-sm'
                fontWeight={isActive ? 'md' : 'normal'}
                sx={{
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {filter.name}
              </Typography>
            </Chip>
          </Tooltip>
        )
      })}

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
