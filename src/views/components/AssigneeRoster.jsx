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
import { Add, Close, DragIndicator, GroupOutlined } from '@mui/icons-material'
import { Avatar, Box, Button, Chip, IconButton, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import {
  getNextInRotation,
  reconcileRotationOrder,
  rotateToCurrent,
} from '../../utils/AssignmentRotation'
import { resolvePhotoURL } from '../../utils/Helpers'

const PersonAvatar = ({ person, size = 26 }) => (
  <Avatar
    src={resolvePhotoURL(person?.image) || undefined}
    alt=''
    color='primary'
    sx={{ width: size, height: size, fontSize: 12, flexShrink: 0 }}
  >
    {person?.displayName?.charAt(0).toUpperCase()}
  </Avatar>
)

const RosterRow = ({
  badge,
  draggable,
  id,
  name,
  onPick,
  onRemove,
  person,
}) => {
  const { t } = useTranslation('chores')
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: !draggable })

  return (
    <Box
      component='li'
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.5,
        minHeight: 44,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
        bgcolor: isDragging
          ? 'background.level1'
          : badge === 'now'
            ? 'primary.softBg'
            : 'background.surface',
        position: 'relative',
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      {draggable && (
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
      )}
      <Box
        component={onPick ? 'button' : 'div'}
        type={onPick ? 'button' : undefined}
        onClick={onPick}
        aria-label={
          onPick ? t('assignmentRotation.makeCurrent', { name }) : undefined
        }
        aria-pressed={onPick ? badge === 'now' : undefined}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.75,
          px: draggable ? 0 : 1,
          border: 0,
          bgcolor: 'transparent',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'start',
          borderRadius: 'sm',
          cursor: onPick ? 'pointer' : 'default',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'focusVisible',
          },
        }}
      >
        <PersonAvatar person={person} />
        <Typography
          level='body-md'
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
      <IconButton
        size='sm'
        variant='plain'
        color='neutral'
        aria-label={t('assignmentRotation.remove', { name })}
        onClick={onRemove}
      >
        <Close fontSize='small' />
      </IconButton>
    </Box>
  )
}

/**
 * One control for who can be assigned, who has it now, and (for Round robin)
 * the rotation order. Selected people are listed as rows; everyone else sits
 * below as "+ add" chips, so each person appears exactly once.
 */
const AssigneeRoster = ({
  anyone,
  assignedTo,
  onAnyoneChange,
  onAssignedToChange,
  onRotationChange,
  onSelectedChange,
  orderable,
  people,
  rotation,
  selected,
  showNow,
}) => {
  const { t } = useTranslation('chores')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const selectedIds = anyone ? [] : selected.map(({ userId }) => userId)
  const savedOrder = orderable
    ? reconcileRotationOrder(rotation?.order, selected)
    : selectedIds
  // Whoever has the task now is always the top row. Round robin keeps the
  // cycle intact by rotating it; other strategies have no order, so the
  // current person simply moves to the front.
  const hasCurrent = showNow && savedOrder.includes(assignedTo)
  const rows = !hasCurrent
    ? savedOrder
    : orderable
      ? rotateToCurrent(savedOrder, assignedTo)
      : [assignedTo, ...savedOrder.filter(id => id !== assignedTo)]
  const nextId =
    orderable && assignedTo != null ? getNextInRotation(rows, assignedTo) : null
  const findPerson = id => people.find(person => person.userId === id)
  const displayName = id =>
    findPerson(id)?.displayName || t('assignmentRotation.member', { id })
  const pool = people.filter(person => !selectedIds.includes(person.userId))
  const hasCustomOrder = orderable && Array.isArray(rotation?.order)

  const add = userId => {
    if (anyone) {
      onAnyoneChange(false)
      onSelectedChange([{ userId }])
      return
    }
    onSelectedChange([...selected, { userId }])
    // New people join at the end of the cycle, i.e. just before whoever has
    // it now, so they don't jump the queue.
    if (orderable) onRotationChange({ ...rotation, order: [...rows, userId] })
  }

  const remove = userId => {
    const next = selected.filter(a => a.userId !== userId)
    if (next.length === 0) {
      onAnyoneChange(true)
      return
    }
    onSelectedChange(next)
    // Hand the turn to whoever was up next rather than the first in the list.
    if (userId === assignedTo && orderable && nextId != null) {
      onAssignedToChange(nextId)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {anyone ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            minHeight: 44,
            border: '1px solid',
            borderColor: 'primary.outlinedBorder',
            bgcolor: 'primary.softBg',
            borderRadius: 'md',
          }}
        >
          <GroupOutlined fontSize='small' />
          <Typography level='body-md' sx={{ flex: 1 }}>
            {t('choreEdit.anyone')}
          </Typography>
          <Typography level='body-xs' textColor='text.tertiary'>
            {t('assignmentRotation.anyoneHint')}
          </Typography>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return
            const next = arrayMove(
              rows,
              rows.indexOf(active.id),
              rows.indexOf(over.id),
            )
            onRotationChange({ ...rotation, order: next })
            if (next[0] !== assignedTo) onAssignedToChange(next[0])
          }}
        >
          <SortableContext items={rows} strategy={verticalListSortingStrategy}>
            <Box
              component={orderable ? 'ol' : 'ul'}
              aria-label={t(
                orderable ? 'assignmentRotation.order' : 'taskEditor.assignTo',
              )}
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
              {rows.map(id => (
                <RosterRow
                  key={id}
                  id={id}
                  name={displayName(id)}
                  person={findPerson(id)}
                  draggable={orderable}
                  badge={
                    showNow && id === assignedTo
                      ? 'now'
                      : id === nextId
                        ? 'next'
                        : null
                  }
                  onPick={
                    showNow && id !== assignedTo
                      ? () => onAssignedToChange(id)
                      : undefined
                  }
                  onRemove={() => remove(id)}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}

      {(showNow || hasCustomOrder) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography level='body-xs' textColor='text.tertiary'>
            {showNow &&
              t(
                orderable
                  ? 'assignmentRotation.rosterHintOrder'
                  : 'assignmentRotation.rosterHintNow',
              )}
          </Typography>
          {hasCustomOrder && (
            <Button
              size='sm'
              variant='plain'
              onClick={() => onRotationChange({ ...rotation, order: null })}
              sx={{ minHeight: 0, py: 0.25, flexShrink: 0 }}
            >
              {t('assignmentRotation.resetOrder')}
            </Button>
          )}
        </Box>
      )}

      {(pool.length > 0 || !anyone) && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          {pool.map(person => (
            <Chip
              key={person.userId}
              variant='outlined'
              color='neutral'
              onClick={() => add(person.userId)}
              startDecorator={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Add sx={{ fontSize: 16 }} />
                  <PersonAvatar person={person} size={20} />
                </Box>
              }
              slotProps={{
                action: {
                  'aria-label': t('assignmentRotation.add', {
                    name: person.displayName,
                  }),
                },
              }}
              sx={{ '--Chip-minHeight': '32px' }}
            >
              {person.displayName}
            </Chip>
          ))}
          {!anyone && (
            <Chip
              variant='plain'
              color='neutral'
              onClick={() => onAnyoneChange(true)}
              startDecorator={<GroupOutlined sx={{ fontSize: 16 }} />}
              sx={{ '--Chip-minHeight': '32px' }}
            >
              {t('assignmentRotation.switchToAnyone')}
            </Chip>
          )}
        </Box>
      )}
    </Box>
  )
}

export default AssigneeRoster
