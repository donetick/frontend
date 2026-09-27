import {
  closestCenter,
  DndContext,
  PointerSensor,
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
  Add,
  ChevronRight,
  Delete,
  DragIndicator,
  Edit,
  ExpandMore,
  KeyboardReturn,
  MoreVert,
  PlaylistAdd,
  SubdirectoryArrowLeft,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dropdown,
  IconButton,
  Input,
  List,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  Textarea,
  Typography,
} from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'

import AppModal from '../../components/common/AppModal'
import ModalActions from '../../components/common/ModalActions'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { CompleteSubTask } from '../../utils/Fetcher'

// Keep deep trees usable on narrow screens. The hierarchy remains unlimited,
// but indentation is capped so controls and task names never get pushed beyond
// the container.
const MOBILE_MAX_INDENT_LEVEL = 3
const DESKTOP_MAX_INDENT_LEVEL = 5
const MOBILE_INDENT_SIZE = 12
const DESKTOP_INDENT_SIZE = 16

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
  allTasks,
  editMode,
  expandedIds,
  handleToggle,
  inputRefs,
  isSmallScreen,
  level,
  onAddChild,
  onAddSibling,
  onEdit,
  onFocusTask,
  onKeyDown,
  onToggleExpand,
  performers,
  setTasks,
  task,
}) {
  const { t } = useTranslation('chores')
  const { fmt } = useLocalization()
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
  }
  const mobileIndent =
    Math.min(level, MOBILE_MAX_INDENT_LEVEL) * MOBILE_INDENT_SIZE
  const desktopIndent =
    Math.min(level, DESKTOP_MAX_INDENT_LEVEL) * DESKTOP_INDENT_SIZE

  return (
    <>
      <ListItem
        ref={setNodeRef}
        style={style}
        {...attributes}
        sx={{
          alignItems: 'center',
          boxSizing: 'border-box',
          columnGap: 0,
          display: 'flex',
          maxWidth: '100%',
          minWidth: 0,
          paddingInlineEnd: 0,
          paddingInlineStart: {
            xs: `${mobileIndent}px`,
            sm: `${desktopIndent}px`,
          },
          touchAction: 'auto',
          width: '100%',
        }}
      >
        {editMode && (
          <IconButton
            {...listeners}
            size='sm'
            data-drag-handle='true'
            sx={{
              '--IconButton-size': '28px',
              cursor: 'grab',
              flexShrink: 0,
              p: 0,
              touchAction: 'none',
            }}
          >
            <DragIndicator sx={{ fontSize: 18 }} />
          </IconButton>
        )}

        {hasChildren ? (
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={() => onToggleExpand(task.id)}
            sx={{ '--IconButton-size': '24px', flexShrink: 0, p: 0 }}
          >
            {expanded ? (
              <ExpandMore sx={{ fontSize: 18 }} />
            ) : (
              <ChevronRight sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        ) : null}

        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flex: 1,
            gap: 1,
            minWidth: 0,
          }}
        >
          {!editMode && (
            <Checkbox
              checked={!!task.completedAt}
              onChange={() => handleToggle(task.id)}
            />
          )}

          {editMode ? (
            isSmallScreen ? (
              <Box
                component='button'
                type='button'
                onClick={() => onEdit(task)}
                sx={{
                  appearance: 'none',
                  bgcolor: 'transparent',
                  border: 0,
                  color: 'inherit',
                  cursor: 'pointer',
                  flex: 1,
                  font: 'inherit',
                  minWidth: 0,
                  px: 0.5,
                  py: 0.625,
                  textAlign: 'start',
                }}
              >
                <Typography
                  level='body-md'
                  sx={{
                    display: '-webkit-box',
                    overflow: 'hidden',
                    overflowWrap: 'anywhere',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                  }}
                >
                  {task.name || t('subTask.untitled')}
                </Typography>
              </Box>
            ) : (
              <Input
                slotProps={{
                  input: {
                    ref: el => {
                      inputRefs.current[task.id] = el
                    },
                  },
                }}
                value={task.name}
                placeholder={t('subTask.namePlaceholder')}
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
                  minWidth: 0,
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
            )
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: 50,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
                minWidth: 0,
              }}
              onClick={() => handleToggle(task.id)}
            >
              <Typography
                sx={{
                  overflowWrap: 'anywhere',
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
          <Box sx={{ display: 'flex', flexShrink: 0, gap: 0.5 }}>
            <Dropdown>
              <MenuButton
                slots={{ root: IconButton }}
                slotProps={{
                  root: {
                    'aria-label': t('subTask.actions'),
                    color: 'neutral',
                    size: 'sm',
                    sx: {
                      '--IconButton-size': '28px',
                      marginInlineEnd: isSmallScreen ? -0.5 : 0,
                      p: 0,
                    },
                    variant: 'plain',
                  },
                }}
              >
                <MoreVert />
              </MenuButton>
              <Menu placement='bottom-end' size='sm'>
                <MenuItem
                  onClick={() =>
                    isSmallScreen ? onEdit(task) : onFocusTask(task.id)
                  }
                >
                  <Edit />
                  {t('subTask.edit')}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    isSmallScreen
                      ? onAddSibling(task)
                      : onKeyDown(
                          {
                            key: 'Enter',
                            shiftKey: false,
                            preventDefault: () => {},
                          },
                          task,
                        )
                  }
                >
                  <PlaylistAdd />
                  {t('subTask.addBelow')}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    isSmallScreen
                      ? onAddChild(task)
                      : onKeyDown(
                          {
                            key: 'Enter',
                            shiftKey: true,
                            preventDefault: () => {},
                          },
                          task,
                        )
                  }
                >
                  <Add />
                  {t('subTask.addChild')}
                </MenuItem>
                <MenuItem
                  disabled={task.parentId === null}
                  onClick={() =>
                    onKeyDown(
                      {
                        key: 'Tab',
                        shiftKey: true,
                        preventDefault: () => {},
                      },
                      task,
                    )
                  }
                >
                  <SubdirectoryArrowLeft />
                  {t('subTask.moveUpLevel')}
                </MenuItem>
                <MenuItem
                  color='danger'
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
                  {t('subTask.delete')}
                </MenuItem>
              </Menu>
            </Dropdown>
          </Box>
        )}
      </ListItem>

      {hasChildren && expanded && (
        <Box sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
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
              isSmallScreen={isSmallScreen}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onEdit={onEdit}
              onFocusTask={onFocusTask}
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
  choreId = 0,
  editMode = true,
  performers,
  setTasks,
  shouldFocus = false,
  tasks = [],
}) => {
  const { t } = useTranslation('chores')
  const [newTask, setNewTask] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [editor, setEditor] = useState(null)
  const [editorText, setEditorText] = useState('')
  const isSmallScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const { data: userProfile } = useUserProfile()
  const { impersonatedUser } = useImpersonateUser()
  const inputRefs = useRef({})
  const editorInputRef = useRef(null)

  useEffect(() => {
    if (!editor) return undefined

    // Menus restore focus to their trigger when they close. Focusing on the
    // next frame ensures the newly opened mobile editor wins that race.
    const frame = requestAnimationFrame(() => {
      const input = editorInputRef.current
      if (!input) return

      input.focus()
      const end = input.value.length
      input.setSelectionRange(end, end)
    })
    return () => cancelAnimationFrame(frame)
  }, [editor])

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

  const openTaskEditor = useCallback(task => {
    setEditor({ taskId: task.id })
    setEditorText(task.name || '')
  }, [])

  const openNewChildEditor = useCallback(
    task => {
      setEditor({
        parentId: task.id,
        orderId: tasks.filter(item => item.parentId === task.id).length,
        type: 'child',
      })
      setEditorText('')
      setExpandedIds(prev => new Set([...prev, task.id]))
    },
    [tasks],
  )

  const openNewSiblingEditor = useCallback(task => {
    setEditor({
      parentId: task.parentId,
      orderId: task.orderId + 1,
      type: 'sibling',
    })
    setEditorText('')
  }, [])

  const openNewRootEditor = useCallback(() => {
    const lastOrderId = Math.max(
      -1,
      ...tasks.filter(task => task.parentId === null).map(task => task.orderId),
    )
    setEditor({ parentId: null, orderId: lastOrderId + 1, type: 'root' })
    setEditorText('')
  }, [tasks])

  const closeTaskEditor = () => {
    setEditor(null)
    setEditorText('')
  }

  const saveTaskEditor = () => {
    const name = editorText.trim()
    if (!name || !editor) return

    if (editor.taskId !== undefined) {
      setTasks(prev => {
        const currentTasks = Array.isArray(prev) ? prev : []
        return currentTasks.map(task =>
          task.id === editor.taskId ? { ...task, name } : task,
        )
      })
    } else {
      setTasks(prev => {
        const currentTasks = Array.isArray(prev) ? prev : []
        return [
          ...currentTasks.map(task =>
            task.parentId === editor.parentId && task.orderId >= editor.orderId
              ? { ...task, orderId: task.orderId + 1 }
              : task,
          ),
          {
            id: nextTempId(currentTasks),
            name,
            completedAt: null,
            parentId: editor.parentId,
            orderId: editor.orderId,
          },
        ]
      })
    }
    closeTaskEditor()
  }

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
            boxSizing: 'border-box',
            maxHeight: 'inherit',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'visible',
            padding: 0,
            WebkitOverflowScrolling: 'touch',
            width: '100%',
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
                isSmallScreen={isSmallScreen}
                onAddChild={openNewChildEditor}
                onAddSibling={openNewSiblingEditor}
                onEdit={openTaskEditor}
                onFocusTask={focusId}
                onKeyDown={handleKeyDown}
                performers={performers}
              />
            ))}

          {editMode && isSmallScreen && (
            <ListItem sx={{ p: 0.5 }}>
              <Button
                color='neutral'
                fullWidth
                onClick={openNewRootEditor}
                startDecorator={<Add />}
                variant='outlined'
                sx={{
                  bgcolor: 'background.surface',
                  borderStyle: 'dashed',
                  justifyContent: 'flex-start',
                  minHeight: 40,
                  '&:hover': {
                    bgcolor: 'primary.softBg',
                    borderColor: 'primary.outlinedBorder',
                    color: 'primary.700',
                  },
                }}
              >
                {t('subTask.addTitle')}
              </Button>
            </ListItem>
          )}

          {editMode && !isSmallScreen && tasks.length === 0 && (
            <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Input
                autoFocus={shouldFocus}
                placeholder={t('subTask.addPlaceholder')}
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

      <AppModal
        open={Boolean(editor)}
        onClose={closeTaskEditor}
        title={
          editor?.taskId !== undefined
            ? t('subTask.editTitle')
            : editor?.type === 'child'
              ? t('subTask.addChildTitle')
              : t('subTask.addTitle')
        }
        size='sm'
        mobilePresentation='sheet'
        showHandle
        footer={
          <ModalActions
            secondary={{
              label: t('common:cancel'),
              onClick: closeTaskEditor,
            }}
            primary={{
              disabled: !editorText.trim(),
              label: t('common:save'),
              onClick: saveTaskEditor,
            }}
          />
        }
      >
        <Textarea
          autoFocus
          slotProps={{ textarea: { ref: editorInputRef } }}
          minRows={3}
          maxRows={8}
          placeholder={t('subTask.namePlaceholder')}
          value={editorText}
          onChange={event => setEditorText(event.target.value)}
        />
      </AppModal>
    </DndContext>
  )
}

export default SubTasks
