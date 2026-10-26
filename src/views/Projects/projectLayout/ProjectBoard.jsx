import './ProjectBoard.css'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDndMonitor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight,
  DeleteOutline,
  DragIndicator,
  EditOutlined,
  ExpandMore,
  MoreVert,
} from '@mui/icons-material'
import {
  Box,
  Checkbox,
  CircularProgress,
  Dropdown,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
} from '@mui/joy'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { networkManager } from '../../../hooks/NetworkManager'
import useLongPress from '../../../hooks/useLongPress'
import { useCreateChore } from '../../../queries/ChoreQueries'
import { useUserProfile } from '../../../queries/UserQueries'
import { CompleteSubTask } from '../../../utils/Fetcher'
import ChoreActionMenu from '../../components/ChoreActionMenu'
import { buildChorePayload } from '../../components/VoiceToTask/parseVoiceTask'
import TaskComposerRow from '../../components/VoiceToTask/TaskComposerRow'
import {
  useCreateSection,
  useDeleteSection,
  useMoveChore,
  useMoveSection,
  useProjectSections,
  useRenameSection,
} from '../ProjectQueries'
import { boardCardInteractions } from './boardCardInteractions'
import { boardCollisionDetection } from './boardCollisionDetection'
import { applyTaskOrder, getTaskDropOrder } from './boardTaskOrdering'
import ProjectBoardCard from './ProjectBoardCard'
import ProjectSectionComposer from './ProjectSectionComposer'
import ProjectTaskRow from './ProjectTaskRow'
const EMPTY_MEMBERS = []
const ignoreActionMenu = () => {}

const columnDndId = id => `section:${id}`
const taskDndId = id => `task:${id}`
// Keep offline-created IDs intact until SyncEngine maps them to server IDs.
const taskMutationId = id => (String(id).startsWith('temp_') ? id : Number(id))

const interactiveControlSelector =
  'button, input, textarea, select, a, [role="button"], [role="checkbox"], [role="menuitem"], [contenteditable="true"]'

// List rows and section headers use explicit handles. Board cards instead
// use their whole non-interactive surface as the drag activator.
const DragHandle = memo(function DragHandle({
  attributes,
  className,
  compact = false,
  isDragging,
  isOverlay,
  label,
  listeners,
  setActivatorNodeRef,
}) {
  return (
    <IconButton
      {...attributes}
      {...listeners}
      className={className}
      ref={setActivatorNodeRef}
      aria-label={label}
      tabIndex={isOverlay ? -1 : attributes?.tabIndex}
      variant='plain'
      color='neutral'
      size='sm'
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      sx={{
        flexShrink: 0,
        alignSelf: 'center',
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        color: 'text.tertiary',
        ...(compact
          ? {
              minWidth: 28,
              minHeight: 28,
              p: 0,
              mr: -0.25,
              '@media (pointer: coarse)': { minWidth: 32, minHeight: 32 },
            }
          : { '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 } }),
      }}
    >
      <DragIndicator sx={{ fontSize: compact ? 18 : 20 }} />
    </IconButton>
  )
})

const ColumnDragContext = createContext(null)

const ColumnDragHandle = ({ label }) => {
  const dragProps = useContext(ColumnDragContext)
  return <DragHandle {...dragProps} compact label={label} />
}

// Keep Joy/Emotion entirely outside the per-frame render path. This surface
// only updates when layout or contents change, not when a transform changes.
const ColumnSurface = memo(function ColumnSurface({
  children,
  displayMode,
  isExpanded,
}) {
  return (
    <Sheet
      variant='soft'
      sx={{
        position: 'relative',
        pt: displayMode === 'list' && isExpanded ? '40px' : 0,
        borderRadius: 'lg',
        ...(displayMode === 'list' && {
          bgcolor: 'background.body',
          border: '1px solid',
          borderColor: 'divider',
        }),
      }}
    >
      {children}
    </Sheet>
  )
})

// Only this plain DOM shell subscribes to sortable movement. Its children keep
// their identity while the pointer moves, avoiding per-frame style serialization.
const SortableColumnShell = ({
  children,
  displayMode,
  isExpanded,
  isMultiSelectMode,
  sectionId,
}) => {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: columnDndId(sectionId),
    data: { sectionId, type: 'section' },
    disabled: isMultiSelectMode,
  })
  const dragProps = useMemo(
    () => ({ attributes, listeners, setActivatorNodeRef, isDragging }),
    [attributes, listeners, setActivatorNodeRef, isDragging],
  )

  return (
    <ColumnDragContext.Provider value={dragProps}>
      <div
        ref={setNodeRef}
        className={`project-board-column project-board-column--${displayMode === 'list' ? 'list' : 'board'}`}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
          opacity: isDragging ? 0.45 : 1,
          willChange: isDragging ? 'transform' : undefined,
        }}
      >
        <ColumnSurface displayMode={displayMode} isExpanded={isExpanded}>
          {children}
        </ColumnSurface>
      </div>
    </ColumnDragContext.Provider>
  )
}

const flattenSubtasks = (tasks, parentId = null, level = 0) =>
  tasks
    .filter(task => task.parentId === parentId)
    .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))
    .flatMap(task => [
      { ...task, level },
      ...flattenSubtasks(tasks, task.id, level + 1),
    ])

const TaskCard = memo(function TaskCard({
  chore,
  displayMode,
  dragAttributes,
  dragListeners,
  isDragging = false,
  isMultiSelectMode,
  isOverlay = false,
  isSelected,
  membersData,
  onAction,
  onChipClick,
  onLongPress,
  onOpenActionMenu,
  onSelectionToggle,
  onSubtasksExpandedChange,
  sections,
  setActivatorNodeRef,
  subtasksExpanded = false,
}) {
  const { t } = useTranslation('chores')
  const [subtasks, setSubtasks] = useState(chore.subTasks || [])
  const navigate = useNavigate()
  const { cancel: cancelLongPress, handlers: longPressHandlers } = useLongPress(
    () => onLongPress?.(chore.id),
    {
      enabled:
        displayMode === 'list' && Boolean(onLongPress) && !isMultiSelectMode,
    },
  )
  const showSubtasks =
    displayMode === 'list' && subtasks.length > 0 && !isMultiSelectMode
  const TaskContent = displayMode === 'list' ? ProjectTaskRow : ProjectBoardCard

  useEffect(() => setSubtasks(chore.subTasks || []), [chore.subTasks])
  useEffect(() => {
    if (isDragging) cancelLongPress()
  }, [cancelLongPress, isDragging])

  const toggleSubtask = async subtask => {
    const previous = subtasks
    const completedAt = subtask.completedAt ? null : new Date().toISOString()
    setSubtasks(current =>
      current.map(item =>
        item.id === subtask.id ? { ...item, completedAt } : item,
      ),
    )
    try {
      const response = await CompleteSubTask(
        subtask.id,
        Number(chore.id),
        completedAt,
      )
      if (!response?.ok) setSubtasks(previous)
    } catch {
      setSubtasks(previous)
    }
  }

  return (
    <Sheet
      {...(displayMode === 'list'
        ? longPressHandlers
        : {
            ...(!isMultiSelectMode && !isOverlay ? dragAttributes : {}),
            ...boardCardInteractions({
              isDragging,
              isMultiSelectMode,
              listeners: isOverlay ? undefined : dragListeners,
              onOpen: () => navigate(`/chores/${chore.id}`),
              onSelectionToggle,
            }),
            ref:
              isMultiSelectMode || isOverlay ? undefined : setActivatorNodeRef,
            role: 'button',
            tabIndex: isOverlay ? -1 : 0,
            'aria-label': chore.name,
            'aria-pressed': isMultiSelectMode ? Boolean(isSelected) : undefined,
          })}
      onPointerDown={event => {
        if (
          displayMode !== 'list' ||
          event.target.closest(interactiveControlSelector)
        )
          return
        longPressHandlers.onPointerDown(event)
      }}
      aria-hidden={isOverlay || undefined}
      className={
        displayMode === 'list'
          ? 'project-task-row-shell'
          : 'project-board-card-shell'
      }
      data-dragging={isDragging || undefined}
      variant={displayMode === 'list' ? 'plain' : 'outlined'}
      {...(displayMode === 'list' && {
        onClick: () => {
          if (isMultiSelectMode) onSelectionToggle()
          else navigate(`/chores/${chore.id}`)
        },
      })}
      sx={{
        borderRadius: displayMode === 'list' ? 0 : 'md',
        ...(displayMode !== 'list' && {
          minWidth: 0,
          bgcolor: isSelected ? 'primary.softBg' : 'background.surface',
          borderColor: isSelected ? 'primary.outlinedBorder' : 'divider',
          '&:hover': { borderColor: 'neutral.outlinedHoverBorder' },
          '&:focus-within': {
            outline: '2px solid',
            outlineColor: 'primary.500',
            outlineOffset: 2,
          },
        }),
        ...(displayMode === 'list' && {
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isSelected ? 'primary.softBg' : 'background.body',
          '&:hover': { bgcolor: 'background.level1' },
        }),
        overflow: 'hidden',
        flexShrink: 0,
        opacity: isDragging && !isOverlay ? 0 : 1,
        pointerEvents: isOverlay ? 'none' : undefined,
        touchAction: 'auto',
        cursor:
          displayMode === 'list' || isMultiSelectMode
            ? 'pointer'
            : isDragging
              ? 'grabbing'
              : 'grab',
        ...(displayMode !== 'list' && { userSelect: 'none' }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        {displayMode === 'list' && !showSubtasks && !isMultiSelectMode && (
          <Box sx={{ width: 24, flexShrink: 0 }} />
        )}
        {showSubtasks && (
          <IconButton
            aria-label={t(
              subtasksExpanded
                ? 'board.collapseSubtasks'
                : 'board.expandSubtasks',
            )}
            aria-expanded={subtasksExpanded}
            size='sm'
            variant='plain'
            onClick={event => {
              event.stopPropagation()
              onSubtasksExpandedChange?.(!subtasksExpanded)
            }}
            sx={{ width: 24, minWidth: 24, borderRadius: 0 }}
          >
            {subtasksExpanded ? <ExpandMore /> : <ChevronRight />}
          </IconButton>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <TaskContent
            chore={chore}
            performers={membersData?.res || EMPTY_MEMBERS}
            isMultiSelectMode={isMultiSelectMode}
            isSelected={isSelected}
            onAction={onAction}
            onChipClick={onChipClick}
            onSelectionToggle={onSelectionToggle}
            onOpenActionMenu={isOverlay ? ignoreActionMenu : onOpenActionMenu}
            sections={sections}
            showDivider={false}
          />
        </Box>
        {displayMode === 'list' && !isMultiSelectMode && (
          <DragHandle
            className={
              displayMode === 'list'
                ? 'project-task-secondary-action'
                : undefined
            }
            attributes={dragAttributes}
            listeners={dragListeners}
            label={`${t('board.dragTask')}: ${chore.name}`}
            setActivatorNodeRef={setActivatorNodeRef}
            isDragging={isDragging}
            isOverlay={isOverlay}
          />
        )}
      </Box>
      {showSubtasks && subtasksExpanded && (
        <Box
          onClick={event => event.stopPropagation()}
          sx={{ borderTop: '1px solid', borderColor: 'divider', py: 0.5 }}
        >
          {flattenSubtasks(subtasks).map(subtask => (
            <Box
              key={subtask.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 34,
                pl: `${16 + Math.min(subtask.level, 4) * 20}px`,
                pr: 1,
              }}
            >
              <Checkbox
                checked={Boolean(subtask.completedAt)}
                size='sm'
                onChange={() => toggleSubtask(subtask)}
              />
              <Typography
                level='body-sm'
                sx={{
                  color: subtask.completedAt ? 'text.tertiary' : 'text.primary',
                  textDecoration: subtask.completedAt ? 'line-through' : 'none',
                }}
              >
                {subtask.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Sheet>
  )
})

const SortableTask = props => {
  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: taskDndId(props.chore.id),
    data: {
      type: 'task',
      taskId: String(props.chore.id),
      sectionId: props.sectionId,
      subtasksExpanded,
    },
    disabled: props.isMultiSelectMode,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        flexShrink: 0,
      }}
    >
      <TaskCard
        {...props}
        subtasksExpanded={subtasksExpanded}
        onSubtasksExpandedChange={setSubtasksExpanded}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  )
}

const BoardColumn = ({
  canDelete,
  chores,
  displayMode,
  isMultiSelectMode,
  membersData,
  onAction,
  onAddTask,
  onChipClick,
  onDelete,
  onLongPressChore,
  onOpenActionMenu,
  onQuickAdd,
  onRename,
  section,
  sections,
  selectedChores,
  toggleChoreSelection,
  toggleSectionSelection,
  userLabels,
  userProfile,
}) => {
  const { t } = useTranslation('chores')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isExpanded = displayMode !== 'list' || !isCollapsed
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(section.name)
  useDndMonitor({
    onDragOver: ({ active, over }) => {
      if (
        displayMode === 'list' &&
        isCollapsed &&
        active.data.current?.type === 'task' &&
        over?.data.current?.sectionId === section.id
      ) {
        setIsCollapsed(false)
      }
    },
  })
  useEffect(() => setName(section.name), [section.name])

  const saveName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== section.name) onRename(trimmed)
    else setName(section.name)
    setIsEditing(false)
  }

  return (
    <SortableColumnShell
      sectionId={section.id}
      displayMode={displayMode}
      isExpanded={isExpanded}
      isMultiSelectMode={isMultiSelectMode}
    >
      <Box
        sx={
          displayMode === 'list' && isExpanded
            ? {
                position: 'absolute',
                inset: '1px 1px min(72px, calc(100% - 40px))',
                pointerEvents: 'none',
                zIndex: 2,
              }
            : undefined
        }
      >
        <Box
          onClick={event => {
            const control = event.target.closest(interactiveControlSelector)
            if (
              displayMode !== 'list' ||
              (control && event.currentTarget.contains(control))
            )
              return
            setIsCollapsed(value => !value)
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minHeight: 40,
            height: 40,
            pointerEvents: 'auto',
            px: 1,
            position: 'sticky',
            top: displayMode === 'list' ? 'var(--app-header-offset, 0px)' : 0,
            transition: 'top 220ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            zIndex: 2,
            bgcolor: 'background.level1',
            borderRadius:
              displayMode === 'list'
                ? isExpanded
                  ? 'calc(var(--joy-radius-lg) - 1px) calc(var(--joy-radius-lg) - 1px) 0 0'
                  : 'calc(var(--joy-radius-lg) - 1px)'
                : 'var(--joy-radius-lg) var(--joy-radius-lg) 0 0',
            borderBottom: isExpanded ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {!isMultiSelectMode && (
            <ColumnDragHandle
              label={`${t('board.dragSection')}: ${section.name}`}
            />
          )}
          {displayMode === 'list' && (
            <IconButton
              aria-label={t(
                isCollapsed ? 'board.expandSection' : 'board.collapseSection',
              )}
              aria-expanded={isExpanded}
              aria-controls={`project-section-${section.id}`}
              size='sm'
              variant='plain'
              onClick={() => setIsCollapsed(value => !value)}
            >
              {isCollapsed ? <ChevronRight /> : <ExpandMore />}
            </IconButton>
          )}
          {isMultiSelectMode && (
            <Checkbox
              checked={
                chores.length > 0 &&
                chores.every(chore => selectedChores.has(chore.id))
              }
              indeterminate={
                chores.some(chore => selectedChores.has(chore.id)) &&
                !chores.every(chore => selectedChores.has(chore.id))
              }
              disabled={chores.length === 0}
              size='sm'
              onChange={() => toggleSectionSelection(chores)}
            />
          )}
          {isEditing ? (
            <Input
              autoFocus
              size='sm'
              value={name}
              onChange={event => setName(event.target.value)}
              onBlur={saveName}
              onKeyDown={event => {
                if (event.key === 'Enter') saveName()
                if (event.key === 'Escape') {
                  setName(section.name)
                  setIsEditing(false)
                }
              }}
              sx={{ flex: 1 }}
            />
          ) : (
            <Typography level='title-sm' noWrap sx={{ flex: 1, minWidth: 0 }}>
              {section.name}
            </Typography>
          )}
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {chores.length}
          </Typography>
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{
                root: {
                  'aria-label': t('board.moreOptions'),
                  size: 'sm',
                  variant: 'plain',
                },
              }}
            >
              <MoreVert sx={{ fontSize: 18 }} />
            </MenuButton>
            <Menu
              placement='bottom-end'
              size='sm'
              onClick={event => event.stopPropagation()}
            >
              <MenuItem onClick={() => setIsEditing(true)}>
                <EditOutlined sx={{ fontSize: 17 }} />
                {t('board.renameSection')}
              </MenuItem>
              <MenuItem color='danger' disabled={!canDelete} onClick={onDelete}>
                <DeleteOutline sx={{ fontSize: 18 }} />
                {t('board.deleteSection')}
              </MenuItem>
            </Menu>
          </Dropdown>
        </Box>
      </Box>

      <Box id={`project-section-${section.id}`} hidden={!isExpanded}>
        <SortableContext
          items={chores.map(chore => taskDndId(chore.id))}
          strategy={verticalListSortingStrategy}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: displayMode === 'list' ? 0 : 1,
              minHeight: displayMode === 'list' ? 44 : 88,
              maxHeight:
                displayMode === 'list' ? 'none' : 'calc(100vh - 260px)',
              overflowY: displayMode === 'list' ? 'visible' : 'auto',
              p: displayMode === 'list' ? 0 : 1,
            }}
          >
            {chores.length === 0 && (
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: displayMode === 'list' ? 44 : 70,
                  border: displayMode === 'list' ? 'none' : '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 'md',
                }}
              >
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('board.dropTasksHere')}
                </Typography>
              </Box>
            )}
            {chores.map(chore => (
              <SortableTask
                key={chore.id}
                chore={chore}
                sectionId={section.id}
                displayMode={displayMode}
                isMultiSelectMode={isMultiSelectMode}
                isSelected={selectedChores.has(chore.id)}
                membersData={membersData}
                onAction={onAction}
                onChipClick={onChipClick}
                onLongPress={onLongPressChore}
                onOpenActionMenu={onOpenActionMenu}
                onSelectionToggle={() => toggleChoreSelection(chore.id)}
                sections={sections}
              />
            ))}
          </Box>
        </SortableContext>
        {!isMultiSelectMode && (
          <TaskComposerRow
            currentUserId={userProfile?.id}
            members={membersData?.res || []}
            userLabels={userLabels}
            placeholder={t('board.addTaskPlaceholder')}
            onSubmit={onQuickAdd}
            onMoreOptions={onAddTask}
          />
        )}
      </Box>
    </SortableColumnShell>
  )
}

const ProjectBoard = ({
  chores,
  displayMode = 'board',
  handleChoreAction,
  handleLabelFiltering,
  isMultiSelectMode = false,
  membersData,
  onAddTask,
  onLongPressChore,
  onTaskCreated,
  projectId,
  selectedChores = new Set(),
  toggleChoreSelection,
  toggleSectionSelection,
  userLabels = [],
}) => {
  const { t } = useTranslation('chores')
  const [dragPreview, setDragPreview] = useState(null)
  const [actionMenu, setActionMenu] = useState(null)
  const openActionMenu = useCallback((anchorEl, chore) => {
    setActionMenu({ anchorEl, chore })
  }, [])
  const closeActionMenu = useCallback(() => setActionMenu(null), [])
  const [pendingTaskOrder, setPendingTaskOrder] = useState(null)
  const [dragTaskOrder, setDragTaskOrder] = useState(null)
  const [pendingSectionOrder, setPendingSectionOrder] = useState(null)
  const hasEnsuredDefaultsRef = useRef(false)

  const {
    data: sections = [],
    isFetching: isFetchingSections,
    isLoading,
    isSuccess: hasLoadedSections,
  } = useProjectSections(projectId)
  const { data: userProfile } = useUserProfile()
  const createSectionMutation = useCreateSection()
  const renameSectionMutation = useRenameSection()
  const deleteSectionMutation = useDeleteSection()
  const moveSectionMutation = useMoveSection()
  const moveChoreMutation = useMoveChore()
  const createChoreMutation = useCreateChore()

  // Mirrors AddTaskModal's voice-to-task multi-create path: `effective` is the
  // same parsed-plus-overrides shape TaskPreviewCard works with, so this
  // builds the same default-filled payload and lets the caller (MyChores)
  // splice the result into local state the same way a modal-created task would.
  const quickAddTask = async (sectionId, effective) => {
    const chore = buildChorePayload(effective, {
      projectId,
      sectionId,
      userProfile,
    })
    chore.source = 'quick_add'
    const result = await createChoreMutation.mutateAsync(chore)
    onTaskCreated?.(
      result?._pendingCreate ? result : { ...chore, ...result, id: result?.id },
    )
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // A project's board starts without any columns. Create the usual three the
  // first time anyone opens it empty, so it isn't blank. This can race with
  // another viewer doing the same at the same moment; worst case is a couple
  // of duplicate default sections, which anyone can rename or delete.
  useEffect(() => {
    if (
      !hasLoadedSections ||
      isFetchingSections ||
      !networkManager.isOnline ||
      sections.length > 0 ||
      hasEnsuredDefaultsRef.current
    ) {
      return
    }
    hasEnsuredDefaultsRef.current = true
    ;[
      t('board.defaults.todo'),
      t('board.defaults.inProgress'),
      t('board.defaults.done'),
    ].forEach(name => {
      createSectionMutation.mutate({ projectId, name })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedSections, isFetchingSections, sections.length, projectId])

  const displayedSections =
    pendingSectionOrder?.projectId === projectId
      ? pendingSectionOrder.sections
      : sections

  const choresBySection = useMemo(() => {
    let grouped = Object.fromEntries(sections.map(section => [section.id, []]))
    const firstSectionId = sections[0]?.id
    chores.forEach(chore => {
      const sectionId = grouped[chore.sectionId]
        ? chore.sectionId
        : firstSectionId
      if (sectionId) grouped[sectionId].push(chore)
    })
    Object.values(grouped).forEach(items =>
      items.sort((a, b) => (a.boardPosition || 0) - (b.boardPosition || 0)),
    )
    if (pendingTaskOrder?.projectId === projectId) {
      grouped = applyTaskOrder(grouped, pendingTaskOrder)
    }
    return grouped
  }, [chores, sections, pendingTaskOrder, projectId])

  const displayedChoresBySection = useMemo(
    () =>
      dragTaskOrder?.projectId === projectId
        ? applyTaskOrder(choresBySection, dragTaskOrder)
        : choresBySection,
    [choresBySection, dragTaskOrder, projectId],
  )

  const handleAction = (action, chore, extraData) => {
    if (action === 'moveToSection') {
      moveChoreMutation.mutate({
        projectId,
        choreId: taskMutationId(chore.id),
        sectionId: extraData.section.id,
        afterChoreId: null,
      })
      return
    }
    handleChoreAction(action, chore, extraData)
  }

  const addSection = name =>
    createSectionMutation.mutateAsync({ projectId, name })

  const renameSection = (sectionId, name) =>
    renameSectionMutation.mutate({ projectId, sectionId, name })

  const deleteSection = sectionId => {
    if (sections.length <= 1) return
    deleteSectionMutation.mutate({ projectId, sectionId })
  }

  const handleDragStart = ({ active }) => {
    closeActionMenu()
    setDragTaskOrder(null)
    if (active.data.current?.type === 'task') {
      const task = chores.find(
        chore => String(chore.id) === active.data.current.taskId,
      )
      const rect = active.rect.current?.initial
      setDragPreview(
        task
          ? {
              task,
              subtasksExpanded: active.data.current.subtasksExpanded,
              size: rect
                ? { width: rect.width, height: rect.height }
                : undefined,
            }
          : null,
      )
    }
  }

  const handleDragCancel = () => {
    setDragPreview(null)
    setDragTaskOrder(null)
  }

  // Change the rendered order only when crossing section boundaries, not on
  // every pointer move. Inside a section dnd-kit handles the insertion animation.
  const handleDragOver = ({ active, over }) => {
    if (active.data.current?.type !== 'task' || !over) return
    const { taskId } = active.data.current
    const targetSectionId = over.data.current?.sectionId
    const target = displayedChoresBySection[targetSectionId]
    if (!target || target.some(task => String(task.id) === taskId)) return

    const translated = active.rect.current.translated
    const insertAfter = Boolean(
      translated && translated.top > over.rect.top + over.rect.height / 2,
    )
    const order = getTaskDropOrder(
      displayedChoresBySection,
      taskId,
      targetSectionId,
      over.data.current?.taskId,
      insertAfter,
    )
    if (order) setDragTaskOrder({ ...order, projectId })
  }

  const handleDragEnd = ({ active, over }) => {
    setDragPreview(null)
    setDragTaskOrder(null)
    if (!over || (active.id === over.id && !dragTaskOrder)) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type === 'section' && overData?.type === 'section') {
      const oldIndex = displayedSections.findIndex(
        section => section.id === activeData.sectionId,
      )
      const newIndex = displayedSections.findIndex(
        section => section.id === overData.sectionId,
      )
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(displayedSections, oldIndex, newIndex)
      const movedIndex = reordered.findIndex(
        section => section.id === activeData.sectionId,
      )
      const afterSectionId =
        movedIndex === 0 ? null : reordered[movedIndex - 1].id
      const pendingOrder = { projectId, sections: reordered }
      setPendingSectionOrder(pendingOrder)
      moveSectionMutation.mutate(
        {
          projectId,
          sectionId: activeData.sectionId,
          afterSectionId,
        },
        {
          onSettled: () =>
            setPendingSectionOrder(current =>
              current === pendingOrder ? null : current,
            ),
        },
      )
      return
    }

    if (activeData?.type !== 'task') return
    const taskId = activeData.taskId
    const order = getTaskDropOrder(
      displayedChoresBySection,
      taskId,
      overData?.sectionId,
      overData?.taskId,
    )
    if (!order) return
    const newIndex = order.orderedIds.indexOf(taskId)
    const afterChoreId =
      newIndex <= 0 ? null : taskMutationId(order.orderedIds[newIndex - 1])
    const pendingOrder = { ...order, projectId }
    setPendingTaskOrder(pendingOrder)
    moveChoreMutation.mutate(
      {
        projectId,
        choreId: taskMutationId(taskId),
        sectionId: order.sectionId,
        afterChoreId,
      },
      {
        onSettled: () =>
          setPendingTaskOrder(current =>
            current === pendingOrder ? null : current,
          ),
      },
    )
  }

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />
  }

  return (
    <Box sx={{ mt: 1 }}>
      <DndContext
        collisionDetection={boardCollisionDetection}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayedSections.map(section => columnDndId(section.id))}
          strategy={
            displayMode === 'list'
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: displayMode === 'list' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: 1.5,
              overflowX: displayMode === 'list' ? 'visible' : 'auto',
              pb: 2,
              scrollSnapType:
                displayMode === 'list'
                  ? 'none'
                  : { xs: 'x proximity', md: 'none' },
              '& > *': { scrollSnapAlign: 'start' },
            }}
          >
            {displayedSections.map(section => (
              <BoardColumn
                key={section.id}
                section={section}
                chores={displayedChoresBySection[section.id] || []}
                canDelete={sections.length > 1}
                displayMode={displayMode}
                isMultiSelectMode={isMultiSelectMode}
                membersData={membersData}
                onAction={handleAction}
                onAddTask={text => onAddTask?.(section.id, text)}
                onChipClick={handleLabelFiltering}
                onLongPressChore={onLongPressChore}
                onOpenActionMenu={openActionMenu}
                onQuickAdd={effective => quickAddTask(section.id, effective)}
                sections={sections}
                selectedChores={selectedChores}
                toggleChoreSelection={toggleChoreSelection}
                toggleSectionSelection={toggleSectionSelection}
                onRename={name => renameSection(section.id, name)}
                onDelete={() => deleteSection(section.id)}
                userLabels={userLabels}
                userProfile={userProfile}
              />
            ))}
            <ProjectSectionComposer
              displayMode={displayMode}
              onSubmit={addSection}
            />
          </Box>
        </SortableContext>
        {createPortal(
          <DragOverlay adjustScale={false} style={{ willChange: 'transform' }}>
            {dragPreview ? (
              <Box sx={{ ...dragPreview.size, '& > *': { height: '100%' } }}>
                <TaskCard
                  chore={dragPreview.task}
                  subtasksExpanded={dragPreview.subtasksExpanded}
                  displayMode={displayMode}
                  isOverlay
                  isDragging
                  membersData={membersData}
                  sections={sections}
                />
              </Box>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {actionMenu && (
        <ChoreActionMenu
          chore={actionMenu.chore}
          anchorEl={actionMenu.anchorEl}
          sections={sections}
          onClose={closeActionMenu}
          onAction={handleAction}
          onCompleteWithNote={() =>
            handleAction('completeWithNote', actionMenu.chore)
          }
          onCompleteWithPastDate={() =>
            handleAction('completeWithPastDate', actionMenu.chore)
          }
          onChangeAssignee={() =>
            handleAction('changeAssignee', actionMenu.chore)
          }
          onChangeDueDate={() =>
            handleAction('changeDueDate', actionMenu.chore)
          }
          onWriteNFC={() => handleAction('writeNFC', actionMenu.chore)}
          onNudge={() => handleAction('nudge', actionMenu.chore)}
          onDelete={() => handleAction('delete', actionMenu.chore)}
        />
      )}
    </Box>
  )
}

export default ProjectBoard
