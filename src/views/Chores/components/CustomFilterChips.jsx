import {
  Check,
  Delete,
  Edit,
  Settings,
  Star,
  StarBorder,
  Warning,
} from '@mui/icons-material'
import { Box, Chip, Menu, MenuItem, Tooltip, Typography } from '@mui/joy'
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
        const hasCustomColor = !!filter.color && !hasWarning
        const textColor = hasCustomColor
          ? getTextColorFromBackgroundColor(filter.color)
          : undefined

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
            <div onClick={() => !hasWarning && onFilterClick(filter.id)}>
              <Chip
                variant='solid'
                size='lg'
                onContextMenu={e => handleContextMenu(e, filter)}
                sx={{
                  cursor: hasWarning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  px: 1.5,
                  py: 0.5,
                  opacity: hasWarning ? 0.7 : isActive ? 1 : 0.85,
                  ...(hasCustomColor && {
                    backgroundColor: `${filter.color} !important`,
                    color: `${textColor} !important`,
                    '&:hover': {
                      backgroundColor: `${filter.color} !important`,
                      filter: 'brightness(0.95)',
                      opacity: 1,
                    },
                  }),
                }}
                startDecorator={
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {filter.isPinned && (
                      <Star
                        sx={{
                          fontSize: '0.9rem',
                          color: hasCustomColor ? textColor : 'warning.500',
                        }}
                      />
                    )}
                    {isActive ? (
                      <Check
                        sx={{
                          fontSize: '1rem',
                          color: hasCustomColor ? textColor : 'primary.500',
                        }}
                      />
                    ) : (
                      <Chip
                        size='sm'
                        variant='solid'
                        sx={{
                          ...(hasCustomColor
                            ? {
                                bgcolor:
                                  textColor === '#FFFFFF'
                                    ? '#00000040'
                                    : '#FFFFFF40',
                                color: textColor,
                                border: `1px solid ${textColor}30`,
                              }
                            : {}),
                        }}
                        color={
                          hasCustomColor
                            ? undefined
                            : hasWarning
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {filter.count}
                      </Chip>
                    )}
                  </Box>
                }
                endDecorator={
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {hasWarning && <Warning sx={{ fontSize: '1rem' }} />}
                    {!hasWarning && filter.overdueCount > 0 && (
                      <Chip
                        size='sm'
                        variant='solid'
                        sx={{
                          ...(hasCustomColor
                            ? {
                                bgcolor: '#ff4444',
                                color: '#FFFFFF',
                                border: `1px solid ${textColor}30`,
                              }
                            : {}),
                        }}
                        color={hasCustomColor ? undefined : 'danger'}
                      >
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
                    ...(hasCustomColor && {
                      color: textColor,
                    }),
                  }}
                >
                  {filter.name}
                </Typography>
              </Chip>
            </div>
          </Tooltip>
        )
      })}

      <Chip
        variant='outlined'
        size='lg'
        sx={{ cursor: 'pointer', minWidth: 'auto', px: 0.8 }}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          navigate('/filters')
        }}
      >
        <Settings />
      </Chip>

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
