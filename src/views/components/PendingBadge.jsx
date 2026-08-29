import { Close, CloudSync } from '@mui/icons-material'
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemContent,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { commandQueue } from '../../utils/CommandQueue'

const LABEL_KEYS = {
  complete_chore: 'completePending',
  skip_chore: 'skipPending',
  update_chore: 'updatePending',
  create_chore: 'createPending',
  delete_chore: 'deletePending',
  update_chore_history: 'editHistoryPending',
  delete_chore_history: 'deleteHistoryPending',
  reschedule_chore: 'reschedulePending',
  archive_chore: 'archivePending',
  unarchive_chore: 'restorePending',
  start_chore: 'startPending',
  pause_chore: 'pausePending',
}

const formatCommandLabel = (commandType, t) => {
  const key = LABEL_KEYS[commandType]
  if (key) return t(`pendingBadge.${key}`)
  return (
    commandType
      ?.replace(/_/g, ' ')
      ?.replace(/\b\w/g, letter => letter.toUpperCase()) ||
    t('sync.commandLabels.pendingAction')
  )
}

function PendingBadge({ commands, size = 'sm', sx = {} }) {
  const { t } = useTranslation('common')
  const { ResponsiveModal } = useResponsiveModal()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [cancelingIds, setCancelingIds] = useState({})
  const [isCancelingAll, setIsCancelingAll] = useState(false)

  const pendingSyncLabel = t('sync.pendingSyncLabel', {
    count: commands?.length || 0,
  })

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

      <ResponsiveModal
        open={isOpen}
        onClose={handleClose}
        size='sm'
        title={t('sync.pendingActionsTitle')}
        footer={
          <ModalActions
            secondary={{ label: t('close'), onClick: handleClose }}
            primary={{
              label: t('cancelAll'),
              color: 'danger',
              onClick: handleCancelAll,
              loading: isCancelingAll,
              disabled: commands.length === 0,
            }}
          />
        }
      >
        <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 1.5 }}>
          {t('sync.actionsWaitingToSync', { count: commands.length })}
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
                  {formatCommandLabel(cmd.commandType, t)}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {new Date(cmd.createdAt).toLocaleString()}
                </Typography>
              </ListItemContent>

              <IconButton
                aria-label={t('sync.cancelActionAria', {
                  label: formatCommandLabel(cmd.commandType, t),
                })}
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
      </ResponsiveModal>
    </Box>
  )
}

export default PendingBadge
