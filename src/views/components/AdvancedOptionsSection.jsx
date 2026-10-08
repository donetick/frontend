import {
  Add,
  Approval,
  HourglassTop,
  Lock,
  MoreHoriz,
  People,
  Remove,
  Timer,
} from '@mui/icons-material'
import {
  Box,
  Button,
  IconButton,
  Option,
  Select,
  Switch,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import NumberInput from '../../components/common/NumberInput'

const STRATEGY_VALUES = [
  'keep_last_assigned',
  'random',
  'least_completed',
  'round_robin',
]

const FieldRow = ({ children, description, label, onLabelClick }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      py: 0.75,
    }}
  >
    <Box
      sx={{
        minWidth: 0,
        flex: '1 1 auto',
        cursor: onLabelClick ? 'pointer' : undefined,
        userSelect: onLabelClick ? 'none' : undefined,
      }}
      onClick={onLabelClick}
    >
      <Typography level='body-sm' fontWeight='md'>
        {label}
      </Typography>
      {description && (
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      )}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {children}
    </Box>
  </Box>
)

// Trigger button — place this inside the chip/action row
export const AdvancedOptionsTrigger = ({
  activeCount = 0,
  emptyDisplay = 'icon-text',
  onToggle,
  open,
}) => {
  const { t } = useTranslation('chores')
  const showLabel = emptyDisplay === 'icon-text' || open || activeCount > 0

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <Button
        size='sm'
        variant={open || activeCount > 0 ? 'soft' : 'outlined'}
        color='neutral'
        onClick={onToggle}
        sx={{
          minHeight: 40,
          borderRadius: '128px',
          px: showLabel ? 1.25 : 0.75,
          gap: showLabel ? 1 : 0,
          transition: 'all 0.25s ease-in-out',
        }}
      >
        <MoreHoriz sx={{ fontSize: 20 }} />
        <Typography
          level='body-sm'
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: showLabel ? 120 : 0,
            opacity: showLabel ? 1 : 0,
            transform: showLabel ? 'translateX(0)' : 'translateX(-4px)',
            transition:
              'max-width 0.25s ease-in-out, opacity 0.2s ease-in-out, transform 0.25s ease-in-out',
          }}
        >
          {t('advancedOptions.more')}
        </Typography>
      </Button>

      {activeCount > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: -8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: 'primary.solidBg',
            color: 'primary.solidColor',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {activeCount}
        </Box>
      )}
    </Box>
  )
}

// Panel — place this as a sibling below the description/subtask sections
const AdvancedOptionsSection = ({
  assignStrategy,
  completionWindow,
  deadlineOffset,
  hasAssignees,
  hasDueDate,
  hasMultipleAssignees,
  isPrivate,
  onAssignStrategyChange,
  onCompletionWindowChange,
  onDeadlineOffsetChange,
  onIsPrivateChange,
  onPointsChange,
  onRequireApprovalChange,
  open,
  points,
  requireApproval,
}) => {
  const { t } = useTranslation('chores')
  const displayPoints = points <= 0 ? 0 : points

  const handleDecrement = () => {
    const next = Math.max(0, displayPoints - 1)
    onPointsChange(next === 0 ? -1 : next)
  }

  const handleIncrement = () => {
    onPointsChange(displayPoints + 1)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition:
          'grid-template-rows 0.25s ease-in-out, opacity 0.2s ease-in-out',
      }}
    >
      <Box sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            mt: 2,
            px: 2,
            py: 1,
            borderRadius: 'md',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            bgcolor: 'background.level1',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Points */}
          <FieldRow
            label={t('advancedOptions.points')}
            description={t('advancedOptions.pointsDescription')}
          >
            <IconButton
              size='sm'
              variant='outlined'
              color='neutral'
              onClick={handleDecrement}
              disabled={displayPoints === 0}
            >
              <Remove sx={{ fontSize: 16 }} />
            </IconButton>
            <NumberInput
              size='sm'
              value={displayPoints === 0 ? '' : displayPoints}
              allowEmpty
              emptyValue={0}
              min={0}
              max={9999}
              placeholder='0'
              onValueChange={next => onPointsChange(next > 0 ? next : -1)}
              sx={{ width: 64 }}
              slotProps={{ input: { style: { textAlign: 'center' } } }}
            />
            <IconButton
              size='sm'
              variant='outlined'
              color='neutral'
              onClick={handleIncrement}
            >
              <Add sx={{ fontSize: 16 }} />
            </IconButton>
          </FieldRow>

          {/* Require approval */}
          <FieldRow
            label={t('advancedOptions.requireApproval')}
            description={t('advancedOptions.requireApprovalDescription')}
            onLabelClick={() => onRequireApprovalChange(!requireApproval)}
          >
            <Switch
              size='sm'
              checked={requireApproval}
              onChange={e => onRequireApprovalChange(e.target.checked)}
            />
          </FieldRow>

          {/* Privacy */}
          <FieldRow
            label={t('advancedOptions.limitedVisibility')}
            description={
              !hasAssignees
                ? t('advancedOptions.limitedVisibilityDisabled')
                : t('advancedOptions.limitedVisibilityDescription')
            }
            onLabelClick={
              hasAssignees ? () => onIsPrivateChange(!isPrivate) : undefined
            }
          >
            <Switch
              size='sm'
              checked={isPrivate}
              disabled={!hasAssignees}
              onChange={e => onIsPrivateChange(e.target.checked)}
            />
          </FieldRow>

          {/* Assignment strategy — only shown when there are multiple assignees */}
          {hasMultipleAssignees && (
            <FieldRow
              label={t('advancedOptions.assignStrategy')}
              description={t('advancedOptions.assignStrategyDescription')}
            >
              <Select
                size='sm'
                value={assignStrategy}
                onChange={(_, v) => onAssignStrategyChange(v)}
                sx={{ minWidth: 190 }}
              >
                {STRATEGY_VALUES.map(opt => (
                  <Option key={opt} value={opt}>
                    {t(`advancedOptions.strategy.${opt}`)}
                  </Option>
                ))}
              </Select>
            </FieldRow>
          )}

          {/* Completion window and deadline — only when due date set */}
          {hasDueDate ? (
            <>
              <FieldRow
                label={t('advancedOptions.availableFrom')}
                description={t('advancedOptions.availableFromDescription')}
              >
                <NumberInput
                  size='sm'
                  placeholder='—'
                  value={completionWindow > -1 ? completionWindow : ''}
                  allowEmpty
                  emptyValue={-1}
                  min={0}
                  onValueChange={onCompletionWindowChange}
                  endDecorator={
                    <Typography level='body-xs' textColor='text.tertiary'>
                      {t('advancedOptions.hrs')}
                    </Typography>
                  }
                  sx={{ width: 96 }}
                />
              </FieldRow>
            </>
          ) : (
            <Typography
              level='body-xs'
              textColor='text.tertiary'
              sx={{ my: 0.5, fontStyle: 'italic' }}
            >
              {t('advancedOptions.setDueDateHint')}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default AdvancedOptionsSection
