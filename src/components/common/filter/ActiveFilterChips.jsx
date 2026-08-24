import { Add, Close } from '@mui/icons-material'
import { Box, Button, Chip, ChipDelete, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const ActiveFilterChips = ({
  chipSize = 'md',
  chipSx,
  chips = [],
  clearButtonSize = 'sm',
  clearButtonSx,
  containerSx,
  maxVisible = 2,
  onAdd,
  onClearAll,
  onOpen,
  overflowChipSx,
  resultCount,
  resultSx,
  showAddChip = false,
  totalCount,
}) => {
  const { t } = useTranslation('common')
  if (!chips.length) {
    return null
  }

  const visible = chips.slice(0, maxVisible)
  const overflow = chips.length - maxVisible

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        py: 0.5,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        ...containerSx,
      }}
    >
      {visible.map(({ color = 'primary', key, label, onClear }) => (
        <Chip
          key={key}
          size={chipSize}
          variant='soft'
          color={color}
          endDecorator={
            // ChipDelete rather than a bare icon: Joy's chip end decorator is
            // `pointer-events: none`, so anything else here is swallowed by the
            // chip's own click surface and can never clear the condition.
            <ChipDelete
              variant='plain'
              color={color}
              onDelete={event => {
                event.stopPropagation()
                onClear?.()
              }}
              aria-label={t('activeFilterChips.removeFilterAria', { label })}
              sx={{
                '--Chip-deleteSize': chipSize === 'sm' ? '1.1rem' : '1.4rem',
                '--Icon-fontSize': chipSize === 'sm' ? '12px' : '16px',
              }}
            >
              <Close />
            </ChipDelete>
          }
          onClick={onOpen}
          sx={{
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            alignItems: 'center',
            '& .MuiChip-endDecorator': {
              display: 'flex',
              alignItems: 'center',
              ml: 0.5,
            },
            '& .MuiChip-label': {
              lineHeight: 1.2,
            },
            '&:hover': { opacity: 0.85 },
            ...chipSx,
          }}
        >
          {label}
        </Chip>
      ))}

      {/* Everything already visible → spend that slot on a "+" for appending
          another condition instead. With overflow, the count chip opens the
          same sheet anyway. */}
      {overflow > 0 ? (
        <Chip
          size={chipSize}
          variant='soft'
          color='neutral'
          onClick={onOpen}
          sx={{
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            '&:hover': { opacity: 0.85 },
            ...overflowChipSx,
          }}
        >
          +{overflow} more
        </Chip>
      ) : (
        showAddChip &&
        (onAdd || onOpen) && (
          <Chip
            size={chipSize}
            variant='outlined'
            color='neutral'
            onClick={onAdd || onOpen}
            aria-label={t('activeFilterChips.addFilterCondition')}
            title={t('activeFilterChips.addFilterCondition')}
            sx={{
              cursor: 'pointer',
              flexShrink: 0,
              px: 0.75,
              transition: 'all 0.15s ease',
              '&:hover': { opacity: 0.85 },
              ...overflowChipSx,
            }}
          >
            <Add
              sx={{ fontSize: chipSize === 'sm' ? 12 : 16, display: 'block' }}
            />
          </Chip>
        )
      )}

      {resultCount != null && totalCount != null && (
        <Typography
          level='body-xs'
          sx={{
            color: 'text.tertiary',
            ml: 'auto',
            flexShrink: 0,
            ...resultSx,
          }}
        >
          {resultCount} / {totalCount}
        </Typography>
      )}

      {onClearAll && (
        <Button
          size={clearButtonSize}
          variant='plain'
          color='neutral'
          onClick={onClearAll}
          sx={{
            px: 0.5,
            fontSize: chipSize === 'sm' ? '0.72rem' : '0.75rem',
            color: 'text.secondary',
            minHeight: 0,
            flexShrink: 0,
            ...clearButtonSx,
          }}
        >
          {t('clearAll')}
        </Button>
      )}
    </Box>
  )
}

export default ActiveFilterChips
