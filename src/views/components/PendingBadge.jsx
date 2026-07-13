import { Close, CloudSync } from '@mui/icons-material'
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemContent,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { commandQueue } from '../../utils/CommandQueue'

const LABELS = {
  complete_chore: 'Complete pending',
  skip_chore: 'Skip pending',
  update_chore: 'Update pending',
  create_chore: 'Create pending',
  delete_chore: 'Delete pending',
  update_chore_history: 'Edit history pending',
  delete_chore_history: 'Delete history pending',
  reschedule_chore: 'Reschedule pending',
  archive_chore: 'Archive pending',
  unarchive_chore: 'Restore pending',
  start_chore: 'Start pending',
  pause_chore: 'Pause pending',
}

const formatCommandLabel = commandType => {
  return (
    LABELS[commandType] ||
    commandType
      ?.replace(/_/g, ' ')
      ?.replace(/\b\w/g, letter => letter.toUpperCase()) ||
    'Pending action'
  )
}

function PendingBadge({ commands, size = 'sm', sx = {} }) {
  const { ResponsiveModal } = useResponsiveModal()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [cancelingIds, setCancelingIds] = useState({})
  const [isCancelingAll, setIsCancelingAll] = useState(false)

  const pendingSyncLabel = `${commands?.length || 0} pending action${commands?.length === 1 ? '' : 's'} to sync`

  if (!commands || commands.length === 0) return null

  const stopEvent = e => {
    e.stopPropagation()
  }

  const invalidatePending = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
    await queryClient.invalidateQueries({ queryKey: ['chores'] })
    await queryClient.invalidateQueries({ queryKey: ['choreHistory'] })
  }

  const handleUndo = async (e, cmdId) => {
    e.stopPropagation()
    setCancelingIds(prev => ({ ...prev, [cmdId]: true }))

    try {
      await commandQueue.cancel(cmdId)
      await invalidatePending()
    } finally {
      setCancelingIds(prev => {
        const next = { ...prev }
        delete next[cmdId]
        return next
      })
    }
  }

  const handleCancelAll = async e => {
    e.stopPropagation()
    if (commands.length === 0) return

    setIsCancelingAll(true)
    try {
      await Promise.all(commands.map(cmd => commandQueue.cancel(cmd.id)))
      await invalidatePending()
      setIsOpen(false)
    } finally {
      setIsCancelingAll(false)
      setCancelingIds({})
    }
  }

  const handleOpen = e => {
    e.stopPropagation()
    setIsOpen(true)
  }

  const handleClose = e => {
    if (e?.stopPropagation) {
      e.stopPropagation()
    }
    setIsOpen(false)
  }

  const isXs = size === 'xs'

  return (
    <Box data-no-chore-nav='true' sx={{ mt: isXs ? 0 : 0.5, ...sx }}>
      <IconButton
        variant='soft'
        color='warning'
        size='sm'
        onClick={handleOpen}
        onMouseDown={stopEvent}
        onPointerDown={stopEvent}
        aria-label={pendingSyncLabel}
        title={pendingSyncLabel}
        sx={{
          borderRadius: '50%',
          ...(isXs && {
            width: 18,
            height: 18,
            minWidth: 18,
            minHeight: 18,
            p: 0.25,
          }),
        }}
      >
        {/* <Badge
          badgeContent={commands.length}
          size='sm'
          color='warning'
          sx={{
            '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 },
          }}
        > */}
        <CloudSync sx={{ fontSize: isXs ? 14 : 16 }} />
        {/* </Badge> */}
      </IconButton>

      <ResponsiveModal open={isOpen} onClose={handleClose} size='sm'>
        <Typography level='title-lg' mb={0.5}>
          Pending actions
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 1.5 }}>
          {commands.length} action{commands.length > 1 ? 's' : ''} waiting to be
          synced.
        </Typography>

        <List sx={{ '--List-gap': '8px', p: 0, mb: 1 }}>
          {commands.map(cmd => (
            <ListItem
              key={cmd.id}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'md',
              }}
            >
              <ListItemContent>
                <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                  {formatCommandLabel(cmd.commandType)}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {new Date(cmd.createdAt).toLocaleString()}
                </Typography>
              </ListItemContent>

              <IconButton
                variant='plain'
                color='danger'
                size='sm'
                onClick={e => handleUndo(e, cmd.id)}
                disabled={Boolean(cancelingIds[cmd.id]) || isCancelingAll}
              >
                <Close sx={{ fontSize: 14 }} />
              </IconButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mb: 1 }} />

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant='outlined' onClick={handleClose}>
            Close
          </Button>
          <Button
            color='danger'
            onClick={handleCancelAll}
            loading={isCancelingAll}
            disabled={commands.length === 0}
          >
            Cancel all
          </Button>
        </Box>
      </ResponsiveModal>
    </Box>
  )
}

export default PendingBadge
