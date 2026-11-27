import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragIndicator, InfoOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Option,
  Select,
  Tooltip,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import NumberInput from '../../components/common/NumberInput'
import {
  getNextInRotation,
  isCountedRotation,
  MAX_ROTATION_COUNT,
  normalizeRotationCount,
  normalizeRotationMonthDay,
  normalizeRotationWeekday,
  reconcileRotationOrder,
  ROTATION_MODES,
  ROTATION_MONTH_DAYS,
} from '../../utils/AssignmentRotation'
import { DAYS } from '../../utils/WeekdayUtils'

const RotationRow = ({ badge, id, name, size }) => {
  const { t } = useTranslation('chores')
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  return (
    <Box
      component='li'
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pr: 1,
        minHeight: 40,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
        bgcolor: isDragging ? 'background.level1' : undefined,
        position: 'relative',
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}
        aria-label={t('assignmentRotation.drag', { name })}
        size='sm'
        sx={{ touchAction: 'none', cursor: 'grab' }}
      >
        <DragIndicator fontSize='small' />
      </IconButton>
      <Typography
        level={size === 'sm' ? 'body-sm' : 'body-md'}
        sx={{ flex: 1, overflowWrap: 'anywhere', minWidth: 0 }}
      >
        {name}
      </Typography>
      {badge && (
        <Chip
          size='sm'
          variant={badge === 'now' ? 'solid' : 'soft'}
          color={badge === 'now' ? 'primary' : 'neutral'}
        >
          {t(`assignmentRotation.badge.${badge}`)}
        </Chip>
      )}
    </Box>
  )
}

const HandOffControls = ({ onChange, size, value }) => {
  const { t } = useTranslation('chores')
  const mode = value?.mode ?? 'default'
  const count = normalizeRotationCount(value?.count)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
      }}
    >
      <Select
        size={size}
        value={mode}
        aria-label={t('assignmentRotation.handOff')}
        onChange={(_, next) => next && onChange({ ...value, mode: next })}
        sx={{ minWidth: 200 }}
      >
        {ROTATION_MODES.map(option => (
          <Option key={option} value={option}>
            {t(`assignmentRotation.modes.${option}`)}
          </Option>
        ))}
      </Select>
      {isCountedRotation(mode) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NumberInput
            size={size}
            min={1}
            max={MAX_ROTATION_COUNT}
            value={count}
            aria-label={t(`assignmentRotation.countLabel.${mode}`)}
            onValueChange={next =>
              onChange({ ...value, count: normalizeRotationCount(next) })
            }
            sx={{ width: 80 }}
          />
          <Typography level='body-sm'>
            {t(`assignmentRotation.unit.${mode}`, { count })}
          </Typography>
        </Box>
      )}
      {mode === 'week' && (
        <Select
          size={size}
          aria-label={t('assignmentRotation.weekday')}
          value={normalizeRotationWeekday(value?.weekday)}
          onChange={(_, weekday) => weekday && onChange({ ...value, weekday })}
        >
          {DAYS.map(day => (
            <Option key={day} value={day}>
              {t(`repeat.days.${day}`)}
            </Option>
          ))}
        </Select>
      )}
      {mode === 'month' && (
        <Select
          size={size}
          aria-label={t('assignmentRotation.dayOfMonth')}
          value={normalizeRotationMonthDay(value?.dayOfMonth)}
          slotProps={{ listbox: { sx: { maxHeight: 260 } } }}
          renderValue={selected =>
            t('assignmentRotation.dayN', { day: selected?.value })
          }
          onChange={(_, day) => day && onChange({ ...value, dayOfMonth: day })}
        >
          {ROTATION_MONTH_DAYS.map(day => (
            <Option key={day} value={day}>
              {day}
            </Option>
          ))}
        </Select>
      )}
    </Box>
  )
}

const RotationSummary = ({ strategy, value }) => {
  const { t } = useTranslation('chores')
  const mode = value?.mode ?? 'default'
  const dayOfMonth = normalizeRotationMonthDay(value?.dayOfMonth)
  const parts = [
    t(`assignmentRotation.summary.${mode}`, {
      count: normalizeRotationCount(value?.count),
      day:
        mode === 'week'
          ? t(`repeat.days.${normalizeRotationWeekday(value?.weekday)}`)
          : dayOfMonth,
    }),
  ]
  if (mode === 'month' && dayOfMonth > 28) {
    parts.push(t('assignmentRotation.shortMonth'))
  }
  if (strategy === 'random') parts.push(t('assignmentRotation.randomRule'))

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
      <Typography
        role='status'
        level='body-xs'
        textColor='text.secondary'
        sx={{ flex: 1, minWidth: 0 }}
      >
        {parts.join(' ')}
      </Typography>
      {mode !== 'default' && (
        <Tooltip
          title={t('assignmentRotation.openTaskStays')}
          enterTouchDelay={0}
          leaveTouchDelay={4000}
          size='sm'
          sx={{ maxWidth: 260 }}
        >
          <IconButton
            size='sm'
            variant='plain'
            aria-label={t('assignmentRotation.openTaskStays')}
            sx={{ '--IconButton-size': '20px', mt: '-2px' }}
          >
            <InfoOutlined sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

/**
 * Hand-off timing plus, for Round robin, the rotation order. `showOrder`
 * is off in Quick Add so the panel keeps to one compact row; the order can
 * still be customised from the full editor.
 */
const AssignmentRotationFields = ({
  assignedTo,
  assignees,
  onChange,
  people,
  showOrder = true,
  size = 'md',
  strategy,
  value,
}) => {
  const { t } = useTranslation('chores')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const compact = size === 'sm'
  const labelSx = {
    typography: 'body-sm',
    fontWeight: 'md',
    color: compact ? 'text.primary' : 'text.secondary',
  }
  const hasCustomOrder = Array.isArray(value?.order)
  const order = reconcileRotationOrder(value?.order, assignees)
  const nextId =
    assignedTo != null ? getNextInRotation(order, assignedTo) : null
  const displayName = id =>
    people.find(person => person.userId === id)?.displayName ||
    assignees.find(person => person.userId === id)?.displayName ||
    t('assignmentRotation.member', { id })
  const showOrderList = showOrder && strategy === 'round_robin'

  return (
    <Box
      sx={{
        display: 'grid',
        gap: compact ? 1 : 1.5,
        minWidth: 0,
        ...(compact && { py: 0.75 }),
      }}
    >
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography sx={labelSx}>{t('assignmentRotation.handOff')}</Typography>
        <HandOffControls value={value} onChange={onChange} size={size} />
        <RotationSummary strategy={strategy} value={value} />
      </Box>

      {showOrderList && (
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography sx={labelSx}>
              {t('assignmentRotation.order')}
            </Typography>
            {hasCustomOrder && (
              <Button
                size='sm'
                variant='plain'
                onClick={() => onChange({ ...value, order: null })}
                sx={{ minHeight: 0, py: 0.25 }}
              >
                {t('assignmentRotation.resetOrder')}
              </Button>
            )}
          </Box>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              onChange({
                ...value,
                order: arrayMove(
                  order,
                  order.indexOf(active.id),
                  order.indexOf(over.id),
                ),
              })
            }}
          >
            <SortableContext
              items={order}
              strategy={verticalListSortingStrategy}
            >
              <Box
                component='ol'
                aria-label={t('assignmentRotation.order')}
                sx={{
                  listStyle: 'none',
                  p: 0,
                  m: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 'md',
                  overflow: 'hidden',
                }}
              >
                {order.map(id => (
                  <RotationRow
                    key={id}
                    id={id}
                    name={displayName(id)}
                    size={size}
                    badge={
                      id === assignedTo ? 'now' : id === nextId ? 'next' : null
                    }
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
          <Typography level='body-xs' textColor='text.tertiary'>
            {t('assignmentRotation.orderHint')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default AssignmentRotationFields
