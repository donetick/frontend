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
  Input,
  Option,
  Select,
  Switch,
  Typography,
} from '@mui/joy'

const STRATEGY_OPTIONS = [
  { value: 'keep_last_assigned', label: 'Keep same assignee' },
  { value: 'random', label: 'Random' },
  { value: 'least_completed', label: 'Least completed' },
  { value: 'round_robin', label: 'Round robin' },
]

const FieldRow = ({ label, description, children, onLabelClick }) => (
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
  open,
  onToggle,
  activeCount = 0,
  emptyDisplay = 'icon-text',
}) => {
  const showLabel = emptyDisplay === 'icon-text' || open || activeCount > 0

  return (
    <Box
      sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
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
            color: 'inherit',
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
          More
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
  open,
  points,
  onPointsChange,
  requireApproval,
  onRequireApprovalChange,
  completionWindow,
  onCompletionWindowChange,
  deadlineOffset,
  onDeadlineOffsetChange,
  assignStrategy,
  onAssignStrategyChange,
  isPrivate,
  onIsPrivateChange,
  hasDueDate,
  hasMultipleAssignees,
  hasAssignees,
}) => {
  const displayPoints = points <= 0 ? 0 : points

  const handleDecrement = () => {
    const next = Math.max(0, displayPoints - 1)
    onPointsChange(next === 0 ? -1 : next)
  }

  const handleIncrement = () => {
    onPointsChange(displayPoints + 1)
  }

  const handlePointsInput = e => {
    const v = parseInt(e.target.value)
    if (isNaN(v) || v <= 0) {
      onPointsChange(-1)
    } else {
      onPointsChange(Math.min(v, 9999))
    }
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
            label='Points'
            description='Award points for completing this task'
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
            <Input
              type='number'
              size='sm'
              value={displayPoints === 0 ? '' : displayPoints}
              placeholder='0'
              onChange={handlePointsInput}
              sx={{ width: 64 }}
              slotProps={{
                input: {
                  min: 0,
                  max: 9999,
                  style: { textAlign: 'center' },
                },
              }}
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
            label='Require approval'
            description='Task needs admin sign-off before it can be closed'
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
            label='Limited visibility'
            description={
              !hasAssignees
                ? 'Assign someone to enable limited visibility'
                : 'Only you and assignees can see this task'
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
              label='Assign strategy'
              description='How to pick the next assignee each recurrence'
            >
              <Select
                size='sm'
                value={assignStrategy}
                onChange={(_, v) => onAssignStrategyChange(v)}
                sx={{ minWidth: 190 }}
              >
                {STRATEGY_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </FieldRow>
          )}

          {/* Completion window and deadline — only when due date set */}
          {hasDueDate ? (
            <>
              <FieldRow
                label='Available from'
                description='Hours before the due date the task becomes available'
              >
                <Input
                  type='number'
                  size='sm'
                  placeholder='—'
                  value={completionWindow > -1 ? completionWindow : ''}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    onCompletionWindowChange(isNaN(v) ? -1 : Math.max(0, v))
                  }}
                  endDecorator={
                    <Typography level='body-xs' textColor='text.tertiary'>
                      hrs
                    </Typography>
                  }
                  sx={{ width: 96 }}
                  slotProps={{ input: { min: 0 } }}
                />
              </FieldRow>

              <FieldRow
                label='Expires after'
                description='Hours after the due date when the task can no longer be completed'
              >
                <Input
                  type='number'
                  size='sm'
                  placeholder='—'
                  value={deadlineOffset > -1 ? deadlineOffset : ''}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    onDeadlineOffsetChange(isNaN(v) ? -1 : Math.max(0, v))
                  }}
                  endDecorator={
                    <Typography level='body-xs' textColor='text.tertiary'>
                      hrs
                    </Typography>
                  }
                  sx={{ width: 96 }}
                  slotProps={{ input: { min: 0 } }}
                />
              </FieldRow>
            </>
          ) : (
            <Typography
              level='body-xs'
              textColor='text.tertiary'
              sx={{ my: 0.5, fontStyle: 'italic' }}
            >
              Set a due date to configure completion window and deadline.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default AdvancedOptionsSection
