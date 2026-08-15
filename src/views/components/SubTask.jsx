import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight,
  Delete,
  DragIndicator,
  ExpandMore,
  KeyboardReturn,
} from '@mui/icons-material'
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Input,
  List,
  ListItem,
  Typography,
} from '@mui/joy'
import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useUserProfile } from '../../queries/UserQueries'
import { CompleteSubTask } from '../../utils/Fetcher'

function getVisibleOrder(tasks, expandedIds) {
  const result = []
  const addTask = task => {
    result.push(task)
    if (expandedIds.has(task.id)) {
      tasks
        .filter(t => t.parentId === task.id)
        .sort((a, b) => a.orderId - b.orderId)
        .forEach(addTask)
    }
  }
  tasks
    .filter(t => t.parentId === null)
    .sort((a, b) => a.orderId - b.orderId)
    .forEach(addTask)
  return result
}

function nextTempId(tasks) {
  return Math.min(0, ...tasks.map(t => t.id)) - 1
}

function SortableItem({
  task,
  allTasks,
  setTasks,
  level,
  editMode,
  expandedIds,
  onToggleExpand,
  handleToggle,
  inputRefs,
  onKeyDown,
  performers,
}) {
  const { fmt } = useLocalization()
  const { t } = useTranslation('chores')
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id })

  const expanded = expandedIds.has(task.id)
  const childTasks = allTasks
    .filter(t => t.parentId === task.id)
    .sort((a, b) => a.orderId - b.orderId)
  const hasChildren = childTasks.length > 0

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    touchAction: 'auto',
    paddingLeft: `${level * 24}px`,
  }

  return (
    <>
      <ListItem ref={setNodeRef} style={style} {...attributes}>
        {editMode && (
          <IconButton
            {...listeners}
            size='sm'
            data-drag-handle='true'
            sx={{ touchAction: 'none', cursor: 'grab' }}
          >
            <DragIndicator />
          </IconButton>
        )}

        {hasChildren ? (
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={() => onToggleExpand(task.id)}
          >
            {expanded ? <ExpandMore /> : <ChevronRight />}
          </IconButton>
        ) : level > 0 ? (
          <Box sx={{ width: 28 }} />
        ) : null}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          {!editMode && (
            <Checkbox
              checked={!!task.completedAt}
              onChange={() => handleToggle(task.id)}
            />
          )}

          {editMode ? (
            <Input
              slotProps={{
                input: {
                  ref: el => {
                    inputRefs.current[task.id] = el
                  },
                },
              }}
              value={task.name}
              placeholder={t('subtask.namePlaceholder')}
              onChange={e =>
                setTasks(prev =>
                  prev.map(t =>
                    t.id === task.id ? { ...t, name: e.target.value } : t,
                  ),
                )
              }
              onKeyDown={e => onKeyDown(e, task)}
              sx={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                boxShadow: 'none',
                '--Input-focusedHighlight': 'var(--joy-palette-primary-300)',
                '&:not(:focus-within)': {
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                },
              }}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: 50,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => handleToggle(task.id)}
            >
              <Typography
                sx={{
                  textDecoration: task.completedAt ? 'line-through' : 'none',
                }}
              >
                {task.name}
              </Typography>
              {task.completedAt && (
                <Typography sx={{ color: 'text.secondary', fontSize: 'sm' }}>
                  {fmt.dateTime(task.completedAt)}
                  {performers?.find(p => p.userId === task.completedBy) && (
                    <Chip>
                      {
                        performers.find(p => p.userId === task.completedBy)
                          .displayName
                      }
                    </Chip>
                  )}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {editMode && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              variant='soft'
              color='danger'
              size='sm'
              title={t('subtask.delete')}
              onClick={() =>
                onKeyDown(
                  {
                    key: 'Backspace',
                    shiftKey: true,
                    preventDefault: () => {},
                  },
                  task,
                )
              }
            >
              <Delete />
            </IconButton>
          </Box>
        )}
      </ListItem>

      {hasChildren && expanded && (
        <Box>
          {childTasks.map(childTask => (
            <SortableItem
              key={childTask.id}
              task={childTask}
              allTasks={allTasks}
              setTasks={setTasks}
              level={level + 1}
              editMode={editMode}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              handleToggle={handleToggle}
              inputRefs={inputRefs}
              onKeyDown={onKeyDown}
              performers={performers}
            />
          ))}
        </Box>
      )}
    </>
  )
}

const SubTasks = ({
  editMode = true,
  choreId = 0,
  tasks = [],
  setTasks,
  performers,
  shouldFocus = false,
}) => {
  const { t } = useTranslation('chores')
  const [newTask, setNewTask] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())
  const { data: userProfile } = useUserProfile()
  const { impersonatedUser } = useImpersonateUser()
  const inputRefs = useRef({})

  const focusId = id => {
    setTimeout(() => {
      inputRefs.current[id]?.focus()
    }, 50)
  }

  const topLevelTasks = tasks.filter(task => task.parentId === null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
  )

  const handleToggle = taskId => {
    const updatedTask = tasks.find(task => task.id === taskId)
    const newCompletedAt = updatedTask.completedAt
      ? null
      : new Date().toISOString()

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            completedAt: newCompletedAt,
            completedBy: impersonatedUser?.userId || userProfile?.id,
          }
        : task,
    )

    if (newCompletedAt) {
      const completeChildren = parentId => {
        const children = updatedTasks.filter(t => t.parentId === parentId)
        children.forEach(child => {
          const index = updatedTasks.findIndex(t => t.id === child.id)
          if (index !== -1) {
            updatedTasks[index] = {
              ...updatedTasks[index],
              completedAt: newCompletedAt,
            }
            completeChildren(child.id)
          }
        })
      }
      completeChildren(taskId)
    }

    CompleteSubTask(taskId, Number(choreId), newCompletedAt).then(res => {
      if (res.status !== 200) console.log('Error updating task')
    })

    setTasks(updatedTasks)
  }

  const handleDelete = useCallback(
    taskId => {
      const findDescendants = id => {
        const descendants = []
        tasks
          .filter(t => t.parentId === id)
          .forEach(child => {
            descendants.push(child.id)
            descendants.push(...findDescendants(child.id))
          })
        return descendants
      }
      const idsToDelete = [taskId, ...findDescendants(taskId)]
      setTasks(
        tasks
          .filter(task => !idsToDelete.includes(task.id))
          .map((task, index) => ({
            ...task,
            orderId: task.parentId === null ? index : task.orderId,
          })),
      )
    },
    [tasks, setTasks],
  )

  const handleToggleExpand = useCallback(taskId => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }, [])

  const handleKeyDown = useCallback(
    (e, task) => {
      const input = inputRefs.current[task.id]
      const selStart = input?.selectionStart ?? 0
      const selEnd = input?.selectionEnd ?? 0
      const valLen = input?.value?.length ?? 0
      const cursorAtStart = selStart === 0 && selEnd === 0
      const cursorAtEnd = selStart === valLen && selEnd === valLen

      // Enter → add sibling after current task at same level
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const newId = nextTempId(tasks)
        const newTaskObj = {
          id: newId,
          name: '',
          completedAt: null,
          parentId: task.parentId,
          orderId: task.orderId + 1,
        }
        setTasks(prev => [
          ...prev.map(t =>
            t.parentId === task.parentId && t.orderId > task.orderId
              ? { ...t, orderId: t.orderId + 1 }
              : t,
          ),
          newTaskObj,
        ])
        focusId(newId)
        return
      }

      // Shift+Enter → add child subtask nested under current
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        const newId = nextTempId(tasks)
        const childCount = tasks.filter(t => t.parentId === task.id).length
        const newTaskObj = {
          id: newId,
          name: '',
          completedAt: null,
          parentId: task.id,
          orderId: childCount,
        }
        setExpandedIds(prev => new Set([...prev, task.id]))
        setTasks(prev => [...prev, newTaskObj])
        focusId(newId)
        return
      }

      // ArrowUp → focus previous visible task
      if (e.key === 'ArrowUp' && !e.shiftKey) {
        e.preventDefault()
        const visible = getVisibleOrder(tasks, expandedIds)
        const idx = visible.findIndex(t => t.id === task.id)
        if (idx > 0) inputRefs.current[visible[idx - 1].id]?.focus()
        return
      }

      // ArrowDown → focus next visible task
      if (e.key === 'ArrowDown' && !e.shiftKey) {
        e.preventDefault()
        const visible = getVisibleOrder(tasks, expandedIds)
        const idx = visible.findIndex(t => t.id === task.id)
        if (idx < visible.length - 1)
          inputRefs.current[visible[idx + 1].id]?.focus()
        return
      }

      // Shift+ArrowUp → move task up among siblings; at top, promote before parent
      if (e.key === 'ArrowUp' && e.shiftKey) {
        e.preventDefault()
        const siblings = tasks
          .filter(t => t.parentId === task.parentId)
          .sort((a, b) => a.orderId - b.orderId)
        const idx = siblings.findIndex(t => t.id === task.id)
        if (idx <= 0) {
          // Already first sibling — promote to parent level, insert before parent
          if (task.parentId === null) return
          const parent = tasks.find(t => t.id === task.parentId)
          if (!parent) return
          setTasks(prev =>
            prev.map(t => {
              // Shift items at parent's orderId and above to make room
              if (t.id === task.id)
                return {
                  ...t,
                  parentId: parent.parentId,
                  orderId: parent.orderId,
                }
              if (
                t.parentId === parent.parentId &&
                t.orderId >= parent.orderId &&
                t.id !== task.id
              )
                return { ...t, orderId: t.orderId + 1 }
              return t
            }),
          )
          focusId(task.id)
          return
        }
        const prev = siblings[idx - 1]
        setTasks(all =>
          all.map(t => {
            if (t.id === task.id) return { ...t, orderId: prev.orderId }
            if (t.id === prev.id) return { ...t, orderId: task.orderId }
            return t
          }),
        )
        focusId(task.id)
        return
      }

      // Shift+ArrowDown → move task down among siblings; at bottom, promote after parent
      if (e.key === 'ArrowDown' && e.shiftKey) {
        e.preventDefault()
        const siblings = tasks
          .filter(t => t.parentId === task.parentId)
          .sort((a, b) => a.orderId - b.orderId)
        const idx = siblings.findIndex(t => t.id === task.id)
        if (idx >= siblings.length - 1) {
          // Already last sibling — promote to parent level, insert after parent
          if (task.parentId === null) return
          const parent = tasks.find(t => t.id === task.parentId)
          if (!parent) return
          setTasks(prev =>
            prev.map(t => {
              if (t.id === task.id)
                return {
                  ...t,
                  parentId: parent.parentId,
                  orderId: parent.orderId + 1,
                }
              if (
                t.parentId === parent.parentId &&
                t.orderId > parent.orderId &&
                t.id !== task.id
              )
                return { ...t, orderId: t.orderId + 1 }
              return t
            }),
          )
          focusId(task.id)
          return
        }
        const next = siblings[idx + 1]
        setTasks(all =>
          all.map(t => {
            if (t.id === task.id) return { ...t, orderId: next.orderId }
            if (t.id === next.id) return { ...t, orderId: task.orderId }
            return t
          }),
        )
        focusId(task.id)
        return
      }

      // Shift+ArrowLeft (at cursor start) or Shift+Tab → outdent one level
      const shouldOutdent =
        (e.key === 'ArrowLeft' && e.shiftKey && cursorAtStart) ||
        (e.key === 'Tab' && e.shiftKey)

      if (shouldOutdent) {
        e.preventDefault()
        if (task.parentId === null) return
        const parent = tasks.find(t => t.id === task.parentId)
        if (!parent) return
        const newOrderId = parent.orderId + 1
        setTasks(prev =>
          prev.map(t => {
            if (t.id === task.id)
              return { ...t, parentId: parent.parentId, orderId: newOrderId }
            if (
              t.parentId === parent.parentId &&
              t.orderId >= newOrderId &&
              t.id !== task.id
            )
              return { ...t, orderId: t.orderId + 1 }
            return t
          }),
        )
        focusId(task.id)
        return
      }

      // Shift+ArrowRight (at cursor end) or Tab → indent under previous sibling
      const shouldIndent =
        (e.key === 'ArrowRight' && e.shiftKey && cursorAtEnd) ||
        (e.key === 'Tab' && !e.shiftKey)

      if (shouldIndent) {
        e.preventDefault()
        const siblings = tasks
          .filter(t => t.parentId === task.parentId)
          .sort((a, b) => a.orderId - b.orderId)
        const idx = siblings.findIndex(t => t.id === task.id)
        if (idx <= 0) return
        const newParent = siblings[idx - 1]
        const newChildCount = tasks.filter(
          t => t.parentId === newParent.id,
        ).length
        setExpandedIds(prev => new Set([...prev, newParent.id]))
        setTasks(prev =>
          prev.map(t =>
            t.id === task.id
              ? { ...t, parentId: newParent.id, orderId: newChildCount }
              : t,
          ),
        )
        focusId(task.id)
        return
      }

      // Backspace on empty task → delete and focus previous
      if (e.key === 'Backspace' && !e.shiftKey && task.name === '') {
        e.preventDefault()
        const visible = getVisibleOrder(tasks, expandedIds)
        const idx = visible.findIndex(t => t.id === task.id)
        if (idx > 0) focusId(visible[idx - 1].id)
        handleDelete(task.id)
        return
      }

      // Shift+Backspace or Shift+Delete → delete task and focus nearest
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.shiftKey) {
        e.preventDefault()
        const visible = getVisibleOrder(tasks, expandedIds)
        const idx = visible.findIndex(t => t.id === task.id)
        if (idx > 0) focusId(visible[idx - 1].id)
        else if (idx < visible.length - 1) focusId(visible[idx + 1].id)
        handleDelete(task.id)
        return
      }

      // Escape → blur current input
      if (e.key === 'Escape') {
        input?.blur()
      }
    },
    [tasks, expandedIds, setTasks, handleDelete],
  )

  const addInputRef = useRef(null)

  const handleAdd = () => {
    if (!newTask.trim()) return
    const id1 = nextTempId(tasks)
    const id2 = id1 - 1
    flushSync(() => {
      setTasks([
        ...tasks,
        {
          id: id1,
          name: newTask,
          completedAt: null,
          orderId: 0,
          parentId: null,
        },
        { id: id2, name: '', completedAt: null, orderId: 1, parentId: null },
      ])
      setNewTask('')
    })
    inputRefs.current[id2]?.focus()
  }

  const onDragEnd = event => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTasks(items => {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return items

      const activeItem = items[oldIndex]
      const overItem = items[newIndex]

      const reordered = [...items]
      reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, activeItem)

      const parentId = overItem.parentId
      const siblings = reordered.filter(item => item.parentId === parentId)

      return reordered.map(item => {
        if (item.id === activeItem.id)
          return { ...item, parentId, orderId: siblings.indexOf(item) }
        return item.parentId === parentId
          ? { ...item, orderId: siblings.indexOf(item) }
          : item
      })
    })
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      sensors={sensors}
    >
      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        <List
          sx={{
            padding: 0,
            maxHeight: 'inherit',
            overflow: 'visible',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {topLevelTasks
            .sort((a, b) => a.orderId - b.orderId)
            .map(task => (
              <SortableItem
                key={task.id}
                task={task}
                allTasks={tasks}
                setTasks={setTasks}
                level={0}
                editMode={editMode}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                handleToggle={handleToggle}
                inputRefs={inputRefs}
                onKeyDown={handleKeyDown}
                performers={performers}
              />
            ))}

          {editMode && tasks.length === 0 && (
            <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Input
                autoFocus={shouldFocus}
                placeholder={t('subtask.addPlaceholder')}
                value={newTask}
                slotProps={{ input: { ref: addInputRef } }}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                sx={{ flex: 1 }}
              />
              <IconButton onClick={handleAdd}>
                <KeyboardReturn />
              </IconButton>
            </ListItem>
          )}
        </List>
      </SortableContext>
    </DndContext>
  )
}

export default SubTasks
