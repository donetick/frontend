import { FilterAlt, Star } from '@mui/icons-material'
import { Box, Sheet, Typography } from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

// Two rows of two on mobile, same reasoning as ProjectStrip: a fifth filter
// would push the section past the list above it, and the header already
// links out. Desktop gets an extra column and row instead of bigger cards.
const GRID_LIMIT_MOBILE = 4
const GRID_LIMIT_DESKTOP = 6

/**
 * Shortcuts into the saved filters that matter right now. Pinned filters lead
 * — that's the whole point of pinning one — so the strip never buries a
 * deliberate choice under whatever has the highest count today.
 */
const FilterStrip = ({ filters }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width:769px)')
  const gridLimit = isDesktop ? GRID_LIMIT_DESKTOP : GRID_LIMIT_MOBILE

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr 1fr',
      }}
    >
      {filters.slice(0, gridLimit).map(filter => (
        <Sheet
          key={filter.id}
          component='button'
          type='button'
          variant='soft'
          color='neutral'
          onClick={() =>
            navigate(`/chores?filterId=${encodeURIComponent(filter.id)}`)
          }
          sx={{
            alignItems: 'center',
            border: 'none',
            borderRadius: 'lg',
            columnGap: 1.25,
            cursor: 'pointer',
            display: 'grid',
            font: 'inherit',
            gridTemplateColumns: '28px minmax(0, 1fr)',
            px: 1.25,
            py: 1,
            textAlign: 'start',
            transition: 'background-color 160ms cubic-bezier(0.22, 1, 0.36, 1)',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.solidBg',
              outlineOffset: 2,
            },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: filter.color || 'primary.solidBg',
              borderRadius: 'sm',
              display: 'flex',
              gridRow: 'span 2',
              height: 28,
              justifyContent: 'center',
              width: 28,
            }}
          >
            {filter.isPinned ? (
              <Star sx={{ color: '#fff', fontSize: 16 }} />
            ) : (
              <FilterAlt sx={{ color: '#fff', fontSize: 16 }} />
            )}
          </Box>
          <Typography
            level='body-xs'
            fontWeight={600}
            noWrap
            textColor='text.primary'
            sx={{ fontSize: 13, width: '100%' }}
          >
            {filter.name}
          </Typography>
          <Typography
            level='body-xs'
            noWrap
            textColor={filter.count > 0 ? 'text.secondary' : 'text.tertiary'}
            sx={{ fontVariantNumeric: 'tabular-nums', width: '100%' }}
          >
            {filter.count > 0
              ? t('home.filters.tasks', { count: filter.count })
              : t('home.filters.clear')}
          </Typography>
        </Sheet>
      ))}
    </Box>
  )
}

FilterStrip.propTypes = {
  filters: PropTypes.array.isRequired,
}

export default FilterStrip
