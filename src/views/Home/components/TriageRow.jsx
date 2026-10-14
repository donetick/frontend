import { CheckCircleOutline } from '@mui/icons-material'
import { Box, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/**
 * Three buttons, not three metrics. Each one navigates into the task list with
 * the matching smart-insight filter already applied, so a count is never a
 * dead end. Categories with nothing in them are dropped rather than shown as a
 * zero — a screen of zeros reads as a dashboard, and this is not one.
 *
 * The `filterId` values must stay in step with INSIGHT_FILTER_DEFS in
 * SmartInsightsCard, which is what /chores reads back out of the URL.
 */
const TriageRow = ({ comingUp, dueToday, needsReview, overdue, unplanned }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const tiles = [
    { color: 'danger', count: overdue, filterId: 'overdue', key: 'overdue' },
    {
      color: 'warning',
      count: dueToday,
      filterId: 'due-today',
      key: 'dueToday',
    },
    {
      color: 'primary',
      count: needsReview,
      filterId: 'pending-approval',
      key: 'needsReview',
    },
    {
      color: 'success',
      count: comingUp,
      filterId: 'coming-up',
      key: 'comingUp',
    },
    {
      color: 'neutral',
      count: unplanned,
      filterId: 'unplanned',
      key: 'unplanned',
    },
  ].filter(tile => tile.count > 0)

  if (tiles.length === 0) {
    return (
      <Sheet
        variant='soft'
        color='success'
        role='status'
        sx={{
          alignItems: 'center',
          borderRadius: 'lg',
          display: 'flex',
          gap: 1.25,
          px: 1.75,
          py: 1.5,
        }}
      >
        <CheckCircleOutline sx={{ fontSize: 20 }} />
        <Typography level='body-sm' fontWeight={600} sx={{ color: 'inherit' }}>
          {t('home.triage.allClear')}
        </Typography>
      </Sheet>
    )
  }

  // One category on its own is a statement, not a comparison, so it spans the
  // row and reads left to right instead of sitting orphaned in the corner.
  const solo = tiles.length === 1

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {tiles.map(tile => (
        <Sheet
          key={tile.key}
          component='button'
          type='button'
          variant='soft'
          color={tile.color}
          onClick={() => navigate(`/chores?filterId=${tile.filterId}`)}
          sx={{
            border: 'none',
            borderRadius: 'lg',
            cursor: 'pointer',
            alignItems: solo ? 'baseline' : 'stretch',
            display: 'flex',
            // Tiles share the row evenly but never stretch into billboards
            // when two categories are empty.
            flex: '1 1 0',
            flexDirection: solo ? 'row' : 'column',
            font: 'inherit',
            gap: solo ? 1 : 0.25,
            maxWidth: solo ? 'none' : 150,
            px: 1.75,
            py: solo ? 1.5 : 1.25,
            textAlign: 'start',
            transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            '&:hover': { transform: 'translateY(-2px)' },
            '&:active': { transform: 'none' },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { transform: 'none' },
            },
          }}
        >
          <Typography
            level='h2'
            sx={{
              color: 'inherit',
              fontSize: 26,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {tile.count}
          </Typography>
          <Typography
            level={solo ? 'body-sm' : 'body-xs'}
            sx={{ color: 'inherit', fontWeight: 500, lineHeight: 1.25 }}
          >
            {t(`home.triage.${tile.key}`)}
          </Typography>
        </Sheet>
      ))}
    </Box>
  )
}

TriageRow.propTypes = {
  comingUp: PropTypes.number.isRequired,
  dueToday: PropTypes.number.isRequired,
  needsReview: PropTypes.number.isRequired,
  overdue: PropTypes.number.isRequired,
  unplanned: PropTypes.number.isRequired,
}

export default TriageRow
