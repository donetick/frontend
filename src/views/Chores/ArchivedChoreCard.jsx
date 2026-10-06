import { Archive } from '@mui/icons-material'
import { Box, Checkbox, Chip, Typography } from '@mui/joy'

import {
  getPriorityColor,
  getTextColorFromBackgroundColor,
} from '../../utils/Colors.jsx'
import { useDateFormatter } from '../../utils/DateFormatter'

const ArchivedChoreCard = ({
  chore,
  isMultiSelectMode = false,
  isSelected = false,
  onSelectionToggle,
  performers = [],
  // Undefined leaves the old `&:last-child` CSS rule in charge; pass
  // explicitly once a wrapper puts each card in its own single-child
  // container, where `:last-child` always matches.
  showDivider,
  sx,
  viewOnly,
}) => {
  const { formatRelative } = useDateFormatter()

  const assigneeName = chore.assignedTo
    ? performers.find(p => p.userId === chore.assignedTo)?.displayName
    : null

  const visibleLabels = chore.labelsV2?.slice(0, 2) ?? []
  const extraLabelCount = Math.max(
    0,
    (chore.labelsV2?.length ?? 0) - visibleLabels.length,
  )
  const showMetaRow = Boolean(assigneeName) || visibleLabels.length > 0

  return (
    <Box
      style={viewOnly ? { pointerEvents: 'none' } : {}}
      sx={{
        ...sx,
        display: 'flex',
        alignItems: 'center',
        minHeight: 44,
        minWidth: '100%',
        cursor: 'pointer',
        position: 'relative',
        pl: isMultiSelectMode ? '8px' : '14px',
        py: '4px',
        bgcolor: isSelected ? 'primary.softBg' : 'background.body',
        borderBottom: showDivider === false ? 'none' : '1px solid',
        borderColor: 'divider',
        ...(showDivider === undefined && {
          '&:last-child': { borderBottom: 'none' },
        }),
        transition: 'background-color 0.15s ease-in-out',
        '&:hover': {
          bgcolor: isSelected ? 'primary.softBg' : 'background.level1',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: getPriorityColor(chore.priority),
          borderRadius: '16px',
        },
      }}
    >
      {/* Multi-select checkbox slot — the only leading affordance an archived
          row ever needs; there is no complete/pause action for a dead task. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isMultiSelectMode ? 36 : 0,
          height: 36,
          mr: isMultiSelectMode ? 1 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          opacity: isMultiSelectMode ? 1 : 0,
          transition:
            'width 0.2s ease-in-out, margin 0.2s ease-in-out, opacity 0.2s ease-in-out',
        }}
      >
        <Checkbox
          checked={isSelected}
          onChange={onSelectionToggle}
          sx={{
            bgcolor: 'background.surface',
            borderRadius: 'md',
            boxShadow: 'sm',
            border: '2px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'background.level1',
              borderColor: 'primary.300',
            },
            '&.Mui-checked': {
              bgcolor: 'primary.500',
              borderColor: 'primary.500',
              color: 'primary.solidColor',
              '&:hover': {
                bgcolor: 'primary.600',
                borderColor: 'primary.600',
              },
            },
          }}
          onClick={e => e.stopPropagation()}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, mr: 1.5 }}>
        {/* Line 1: Name + archived-ago indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography
            level='title-sm'
            sx={{
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.4,
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chore.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            <Archive sx={{ fontSize: 12, color: 'text.tertiary' }} />
            <Typography
              level='body-xs'
              sx={{
                fontSize: 11,
                color: 'text.tertiary',
                whiteSpace: 'nowrap',
              }}
            >
              {formatRelative(chore.updatedAt)}
            </Typography>
          </Box>
        </Box>

        {/* Line 2: Assignee + labels — only rendered when there's something
            to show, so most archived rows stay single-line. */}
        {showMetaRow && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.25,
              rowGap: 0.25,
              mt: 0.25,
            }}
          >
            {assigneeName && (
              <Typography
                level='body-xs'
                color='text.secondary'
                sx={{ fontSize: 11, lineHeight: 1.4 }}
              >
                {assigneeName}
              </Typography>
            )}

            {visibleLabels.map(l => (
              <Chip
                key={`archived-chorecard-${chore.id}-label-${l.id}`}
                variant='solid'
                color='primary'
                size='sm'
                sx={{
                  ml: 0.5,
                  backgroundColor: `${l?.color} !important`,
                  color: getTextColorFromBackgroundColor(l?.color),
                  whiteSpace: 'nowrap',
                  maxWidth: 'none',
                }}
              >
                {l?.name}
              </Chip>
            ))}
            {extraLabelCount > 0 && (
              <Chip
                variant='soft'
                color='neutral'
                size='sm'
                sx={{ ml: 0.5, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                +{extraLabelCount}
              </Chip>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default ArchivedChoreCard
