import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ExpandMore, MoreVert } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  CircularProgress,
  Dropdown,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useChorePermissions } from '../../../hooks/useChorePermissions'
import { useChores, useUnArchiveChore } from '../../../queries/ChoreQueries'
import { useNotification } from '../../../service/NotificationProvider'
import { uncheckCompletedChore } from './uncheckCompletedChore'

const ArchivedTask = ({ chore, isMultiSelectMode }) => {
  const { t } = useTranslation('chores')
  const navigate = useNavigate()
  const permissions = useChorePermissions(chore)
  const restore = useUnArchiveChore()
  const { showError } = useNotification()
  const [isUnchecking, setIsUnchecking] = useState(false)
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({
      id: `archived-task:${chore.id}`,
      data: { type: 'archivedTask', task: chore },
      disabled: !permissions.archive || isMultiSelectMode || isUnchecking,
    })

  const uncheck = async () => {
    setIsUnchecking(true)
    try {
      const response = await uncheckCompletedChore(chore, restore.mutateAsync)
      if (!response?.ok) throw new Error(t('permissions.failed'))
    } catch (error) {
      showError({ message: error.message })
      setIsUnchecking(false)
    }
  }

  return (
    <Sheet
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
      }}
      variant='outlined'
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 'md',
        p: 0.5,
        bgcolor: 'background.body',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          flexShrink: 0,
        }}
      >
        {isUnchecking ? (
          <CircularProgress size='sm' sx={{ '--CircularProgress-size': 18 }} />
        ) : (
          <Checkbox
            checked
            disabled={!permissions.archive || isMultiSelectMode}
            onChange={uncheck}
            size='sm'
            variant='solid'
            color='neutral'
            slotProps={{
              input: {
                'aria-label': t('board.uncheckTask', { name: chore.name }),
              },
            }}
            sx={{
              '--Checkbox-size': '18px',
              // Keep an easy-to-hit target around the small visible square.
              '& .MuiCheckbox-action': { inset: '-11px' },
              '& .MuiCheckbox-checkbox': {
                borderRadius: '5px',
                borderWidth: '1.5px',
              },
            }}
          />
        )}
      </Box>
      <Box
        component='button'
        {...attributes}
        {...listeners}
        onClick={() => {
          if (!isDragging) navigate(`/chores/${chore.id}`)
        }}
        sx={{
          flex: 1,
          minWidth: 0,
          border: 0,
          bgcolor: 'transparent',
          cursor: 'pointer',
          textAlign: 'start',
          p: 1,
        }}
      >
        <Typography
          level='body-sm'
          sx={{
            color: 'text.tertiary',
            textDecoration: 'line-through',
            overflowWrap: 'anywhere',
          }}
        >
          {chore.name}
        </Typography>
      </Box>
    </Sheet>
  )
}

export default function ProjectCompletedColumn({
  canDrop,
  displayMode,
  isMultiSelectMode,
  onHide,
  projectId,
}) {
  const { t } = useTranslation('chores')
  const [expanded, setExpanded] = useState(false)
  const { data, isError, isLoading, refetch } = useChores(true)
  const { isOver, setNodeRef } = useDroppable({
    id: 'project-completed',
    data: { type: 'completed' },
    disabled: !canDrop,
  })
  const tasks = (data?.res || [])
    .filter(
      chore =>
        String(chore.projectId) === String(projectId) &&
        chore.isActive === false,
    )
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

  return (
    <div
      ref={setNodeRef}
      className={`project-board-column project-board-column--${displayMode === 'list' ? 'list' : 'board'}`}
    >
      {/* Deliberately recessed: a dashed, unfilled surface so this reads as a
          holding area for finished work, not another section of the board. */}
      <Sheet
        variant='plain'
        sx={{
          borderRadius: 'lg',
          border: '1px dashed',
          borderColor: isOver ? 'success.500' : 'neutral.outlinedBorder',
          bgcolor: isOver ? 'success.softBg' : 'transparent',
          overflow: 'hidden',
          transition: 'border-color 120ms ease, background-color 120ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}>
          <Box
            component='button'
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            aria-controls='project-completed-tasks'
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1,
              minWidth: 0,
              minHeight: 40,
              px: 1,
              border: 0,
              bgcolor: 'transparent',
              cursor: 'pointer',
              color: 'text.tertiary',
              textAlign: 'start',
            }}
          >
            {expanded ? (
              <ExpandMore sx={{ fontSize: 18 }} />
            ) : (
              <ChevronRight sx={{ fontSize: 18 }} />
            )}
            <Typography
              level='body-xs'
              textColor='inherit'
              sx={{
                flex: 1,
                fontWeight: 'lg',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t('board.completedArchive')}
            </Typography>
            <Typography level='body-xs' textColor='inherit'>
              {tasks.length}
            </Typography>
          </Box>
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{
                root: {
                  'aria-label': t('board.moreOptions'),
                  size: 'sm',
                  variant: 'plain',
                  color: 'neutral',
                  sx: { color: 'text.tertiary' },
                },
              }}
            >
              <MoreVert sx={{ fontSize: 18 }} />
            </MenuButton>
            <Menu placement='bottom-end' size='sm'>
              <MenuItem onClick={onHide}>{t('board.hideCompleted')}</MenuItem>
            </Menu>
          </Dropdown>
        </Box>
        {expanded && (
          <Typography
            level='body-xs'
            sx={{
              px: 2,
              pb: 1.5,
              color: isOver ? 'success.plainColor' : 'text.tertiary',
            }}
          >
            {t('board.dropToComplete')}
          </Typography>
        )}
        <Box id='project-completed-tasks' hidden={!expanded}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1,
              maxHeight: 'max(88px, calc(100dvh - 300px))',
              overflowY: 'auto',
            }}
          >
            {isLoading ? (
              <CircularProgress size='sm' sx={{ m: 'auto' }} />
            ) : isError ? (
              <Box
                component='button'
                onClick={() => refetch()}
                sx={{ cursor: 'pointer' }}
              >
                {t('board.retryCompleted')}
              </Box>
            ) : tasks.length === 0 ? (
              <Typography level='body-sm' sx={{ p: 1, color: 'text.tertiary' }}>
                {t('board.noCompletedTasks')}
              </Typography>
            ) : (
              tasks.map(chore => (
                <ArchivedTask
                  key={chore.id}
                  chore={chore}
                  isMultiSelectMode={isMultiSelectMode}
                />
              ))
            )}
          </Box>
        </Box>
      </Sheet>
    </div>
  )
}
