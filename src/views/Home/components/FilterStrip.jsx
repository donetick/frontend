import { FilterAlt, Star } from '@mui/icons-material'
import { Box, Chip, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

// Two rows of two, same reasoning as ProjectStrip: a fifth filter would push
// the section past the list above it, and the header already links out.
const GRID_LIMIT = 4

/**
 * Shortcuts into the saved filters that matter right now. Pinned filters lead
 * — that's the whole point of pinning one — so the strip never buries a
 * deliberate choice under whatever has the highest count today.
 */
const FilterStrip = ({ filters }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      {filters.slice(0, GRID_LIMIT).map(filter => (
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
          {filter.count > 0 ? (
            <Chip
              variant='soft'
              color={filter.overdueCount > 0 ? 'danger' : 'primary'}
              size='sm'
              sx={{
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
                height: 18,
                justifySelf: 'start',
                px: 0.75,
              }}
            >
              {t('home.filters.tasks', { count: filter.count })}
            </Chip>
          ) : (
            <Typography
              level='body-xs'
              noWrap
              textColor='text.tertiary'
              sx={{ fontVariantNumeric: 'tabular-nums', width: '100%' }}
            >
              {t('home.filters.clear')}
            </Typography>
          )}
        </Sheet>
      ))}
    </Box>
  )
}

FilterStrip.propTypes = {
  filters: PropTypes.array.isRequired,
}

export default FilterStrip
