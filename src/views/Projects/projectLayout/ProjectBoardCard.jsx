import {
  CalendarTodayOutlined,
  Checklist,
  OpenInNew,
  PersonOutline,
  Repeat,
} from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/joy'
import { memo } from 'react'

import { useLocalization } from '../../../contexts/LocalizationContext'
import { usePendingCommands } from '../../../hooks/usePendingCommands'
import { useXPTranslation as useTranslation } from '../../../queries/XPQueries'
import {
  getDueDateChipColor,
  getDueDateChipText,
  getRecurrentChipText,
} from '../../../utils/ChoreCardHelpers'
import {
  getFirstHttpUrl,
  getUrlHostname,
  openExternalUrl,
  splitTextAtFirstHttpUrl,
} from '../../../utils/ExternalLinks'
import { ChoreActionMenuTrigger } from '../../components/ChoreActionMenu'
import PendingBadge from '../../components/PendingBadge'
import ProjectTaskAction from './ProjectTaskAction'

const metadataSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  color: 'text.tertiary',
  fontSize: 11,
}

// A board is scanned vertically: title first, then time and person. Controls
// live in the card rather than taking a permanent rail beside its content.
const ProjectBoardCard = memo(function ProjectBoardCard({
  chore,
  isMultiSelectMode,
  isSelected,
  onOpenActionMenu,
  onSelectionToggle,
  performers = [],
}) {
  const { t, xpMode } = useTranslation('chores')
  const { timeFormat } = useLocalization()
  const { data: pendingCommands } = usePendingCommands(chore.id)
  const assignee = performers.find(item => item.userId === chore.assignedTo)
  const assigneeName =
    assignee?.displayName ||
    (chore.assignedTo === null ? t('assignee.anyone') : null)
  const { after, before, url } = splitTextAtFirstHttpUrl(chore.name)
  const links = [
    ...new Set([url, getFirstHttpUrl(chore.description)].filter(Boolean)),
  ]
  const subtasks = chore.subTasks || []
  const recurrent =
    chore.frequencyType && !['once', 'no_repeat'].includes(chore.frequencyType)
  const dueColor = getDueDateChipColor(chore.nextDueDate, chore)

  return (
    <Box sx={{ p: 0.75, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25 }}>
        {isMultiSelectMode && (
          <Box
            onClick={event => event.stopPropagation()}
            sx={{ flexShrink: 0 }}
          >
            <ProjectTaskAction
              chore={chore}
              isMultiSelectMode
              isSelected={isSelected}
              onSelectionToggle={onSelectionToggle}
            />
          </Box>
        )}
        <Typography
          component='span'
          title={chore.name}
          level='title-sm'
          sx={{
            flex: 1,
            minWidth: 0,
            border: 0,
            bgcolor: 'transparent',
            textAlign: 'start',
            color: 'text.primary',
            fontFamily: 'inherit',
            fontWeight: 500,
            fontSize: 14,
            minHeight: 44,
            lineHeight: 1.5,
            py: 1.25,
            px: 1,
            overflowWrap: 'anywhere',
            cursor: 'inherit',
            borderRadius: 'sm',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.500',
            },
          }}
        >
          {before}
          {url ? getUrlHostname(url) : ''}
          {after}
        </Typography>
        {!isMultiSelectMode && (
          <Box className='project-task-secondary-action' sx={{ flexShrink: 0 }}>
            <ChoreActionMenuTrigger
              variant='plain'
              onClick={event => {
                event.stopPropagation()
                onOpenActionMenu?.(event.currentTarget, chore)
              }}
              sx={{
                left: 0,
                width: 44,
                height: 44,
                minWidth: 44,
                color: 'text.tertiary',
                borderRadius: 'md',
              }}
            />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          px: 1,
          minHeight: 44,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
            py: 0.5,
          }}
        >
          {chore.status > 0 && (
            <Typography
              level='body-xs'
              sx={{
                color:
                  chore.status === 3
                    ? 'primary.plainColor'
                    : 'warning.plainColor',
              }}
            >
              {t(
                chore.status === 3
                  ? 'choreView.pendingApproval'
                  : chore.status === 1
                    ? 'choreView.timer.active'
                    : 'choreView.timer.paused',
              )}
            </Typography>
          )}
          {chore.nextDueDate && (
            <Typography
              component='time'
              dateTime={chore.nextDueDate}
              sx={{
                ...metadataSx,
                color:
                  dueColor === 'danger' ? 'danger.plainColor' : 'text.tertiary',
              }}
            >
              <CalendarTodayOutlined sx={{ fontSize: 13, flexShrink: 0 }} />
              {getDueDateChipText(chore.nextDueDate, chore, timeFormat)}
            </Typography>
          )}
          {assigneeName && (
            <Typography
              title={assigneeName}
              sx={{ ...metadataSx, maxWidth: 120 }}
            >
              <PersonOutline sx={{ fontSize: 14, flexShrink: 0 }} />
              <Box
                component='span'
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {assigneeName}
              </Box>
            </Typography>
          )}
          {chore.points > 0 && (
            <Typography sx={metadataSx}>
              {chore.points}
              {xpMode ? ' XP' : 'pts'}
            </Typography>
          )}
          {recurrent && (
            <Repeat
              titleAccess={getRecurrentChipText(chore)}
              sx={{ fontSize: 14, color: 'text.tertiary' }}
            />
          )}
          {subtasks.length > 0 && (
            <Typography title={t('choreView.subtasks')} sx={metadataSx}>
              <Checklist sx={{ fontSize: 14 }} />
              {subtasks.filter(item => item.completedAt).length}/
              {subtasks.length}
            </Typography>
          )}
          {(chore._pending || pendingCommands?.length > 0) && (
            <PendingBadge commands={pendingCommands} size='xs' />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {!isMultiSelectMode &&
            links.map(link => (
              <IconButton
                key={link}
                className='project-task-secondary-action'
                aria-label={link}
                title={link}
                variant='plain'
                size='sm'
                onClick={event => {
                  event.stopPropagation()
                  openExternalUrl(link)
                }}
                sx={{ color: 'text.tertiary', minWidth: 44, minHeight: 44 }}
              >
                <OpenInNew sx={{ fontSize: 15 }} />
              </IconButton>
            ))}
        </Box>
      </Box>
    </Box>
  )
})

export default ProjectBoardCard
