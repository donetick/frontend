import { Close } from '@mui/icons-material'
import { Box, Button, Chip, Typography } from '@mui/joy'

const ActiveFilterChips = ({
  chips = [],
  onOpen,
  onClearAll,
  resultCount,
  totalCount,
  maxVisible = 2,
  chipSize = 'md',
  clearButtonSize = 'sm',
  clearButtonSx,
  containerSx,
  chipSx,
  overflowChipSx,
  resultSx,
}) => {
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
      {visible.map(({ key, label, onClear, color = 'primary' }) => (
        <Chip
          key={key}
          size={chipSize}
          variant='soft'
          color={color}
          endDecorator={
            <Close
              sx={{ cursor: 'pointer', fontSize: chipSize === 'sm' ? 12 : 16 }}
              onClick={e => {
                e.stopPropagation()
                onClear?.()
              }}
            />
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

      {overflow > 0 && (
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
          Clear all
        </Button>
      )}
    </Box>
  )
}

export default ActiveFilterChips
