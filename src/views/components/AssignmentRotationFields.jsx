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
import {
  DragIndicator,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material'
import {
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Option,
  Select,
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

const RotationRow = ({ id, index, length, name, onMove, size }) => {
  const { t } = useTranslation('chores')
  const {
    attributes,
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
        gap: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
        px: 0.5,
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
        {index + 1}. {name}
      </Typography>
      <IconButton
        size='sm'
        aria-label={t('assignmentRotation.up', { name })}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <KeyboardArrowUp fontSize='small' />
      </IconButton>
      <IconButton
        size='sm'
        aria-label={t('assignmentRotation.down', { name })}
        disabled={index === length - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <KeyboardArrowDown fontSize='small' />
      </IconButton>
    </Box>
  )
}

const AssignmentRotationFields = ({
  assignedTo,
  assignees,
  onChange,
  people,
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
    ...(compact ? {} : { mb: 0.75 }),
  }
  const mode = value?.mode ?? 'default'
  const count = normalizeRotationCount(value?.count)
  const dayOfMonth = normalizeRotationMonthDay(value?.dayOfMonth)
  const useCustomOrder =
    strategy === 'round_robin' && Array.isArray(value?.order)
  const order = reconcileRotationOrder(value?.order, assignees)
  const displayName = id =>
    people.find(person => person.userId === id)?.displayName ||
    assignees.find(person => person.userId === id)?.displayName ||
    t('assignmentRotation.member', { id })
  const move = (from, to) => {
    if (from < 0 || to < 0 || from === to || to >= order.length) return
    onChange({ ...value, order: arrayMove(order, from, to) })
  }
  const nextId = useCustomOrder ? getNextInRotation(order, assignedTo) : null

  return (
    <Box
      sx={{
        display: 'grid',
        gap: compact ? 1 : 2,
        minWidth: 0,
        ...(compact && { py: 0.75 }),
      }}
    >
      <FormControl size={size}>
        <FormLabel sx={labelSx}>
          {t('assignmentRotation.switchAssignee')}
        </FormLabel>
        <Select
          value={mode}
          onChange={(_, next) => next && onChange({ ...value, mode: next })}
        >
          {ROTATION_MODES.map(option => (
            <Option key={option} value={option}>
              {t(`assignmentRotation.modes.${option}`)}
            </Option>
          ))}
        </Select>
      </FormControl>
      {isCountedRotation(mode) && (
        <FormControl size={size}>
          <FormLabel sx={labelSx}>
            {t(`assignmentRotation.countLabel.${mode}`)}
          </FormLabel>
          <NumberInput
            min={1}
            max={MAX_ROTATION_COUNT}
            value={count}
            onValueChange={next =>
              onChange({ ...value, count: normalizeRotationCount(next) })
            }
            sx={{ maxWidth: 100 }}
          />
        </FormControl>
      )}
      {mode === 'week' && (
        <FormControl size={size}>
          <FormLabel sx={labelSx}>{t('assignmentRotation.weekday')}</FormLabel>
          <Select
            value={normalizeRotationWeekday(value?.weekday)}
            onChange={(_, weekday) =>
              weekday && onChange({ ...value, weekday })
            }
          >
            {DAYS.map(day => (
              <Option key={day} value={day}>
                {t(`repeat.days.${day}`)}
              </Option>
            ))}
          </Select>
        </FormControl>
      )}
      {mode === 'month' && (
        <FormControl size={size}>
          <FormLabel sx={labelSx}>
            {t('assignmentRotation.dayOfMonth')}
          </FormLabel>
          <Select
            value={dayOfMonth}
            slotProps={{ listbox: { sx: { maxHeight: 260 } } }}
            onChange={(_, day) =>
              day && onChange({ ...value, dayOfMonth: day })
            }
          >
            {ROTATION_MONTH_DAYS.map(day => (
              <Option key={day} value={day}>
                {day}
              </Option>
            ))}
          </Select>
          {dayOfMonth > 28 && (
            <FormHelperText>
              {t('assignmentRotation.shortMonth')}
            </FormHelperText>
          )}
        </FormControl>
      )}
      {mode !== 'default' && (
        <Typography level='body-xs' textColor='text.secondary'>
          {t(`assignmentRotation.rules.${mode}`, { count })}{' '}
          {t('assignmentRotation.openTaskStays')}
        </Typography>
      )}
      {strategy === 'round_robin' && (
        <Checkbox
          size={size}
          checked={useCustomOrder}
          label={t('assignmentRotation.customOrder')}
          onChange={event =>
            onChange({ ...value, order: event.target.checked ? order : null })
          }
        />
      )}
      {useCustomOrder && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (over) move(order.indexOf(active.id), order.indexOf(over.id))
          }}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <Box
              component='ol'
              aria-label={t('assignmentRotation.customOrder')}
              sx={{
                listStyle: 'none',
                p: 0.5,
                m: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'md',
              }}
            >
              {order.map((id, index) => (
                <RotationRow
                  key={id}
                  id={id}
                  name={displayName(id)}
                  index={index}
                  length={order.length}
                  onMove={move}
                  size={size}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}
      {nextId != null && assignedTo != null && (
        <Typography role='status' level='body-xs' textColor='text.secondary'>
          {t('assignmentRotation.preview', {
            current: displayName(assignedTo),
            next: displayName(nextId),
          })}
        </Typography>
      )}
      {strategy === 'random' && mode !== 'default' && (
        <Typography level='body-xs' textColor='text.secondary'>
          {t('assignmentRotation.randomRule')}
        </Typography>
      )}
    </Box>
  )
}

export default AssignmentRotationFields
