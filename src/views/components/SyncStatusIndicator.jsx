import {
  CheckCircleOutline,
  ClearAll,
  CloudDone,
  CloudQueue,
  CloudSync,
  Refresh,
  WifiOff,
} from '@mui/icons-material'
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dropdown,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { networkManager } from '../../hooks/NetworkManager'
import {
  PENDING_POLL_MS,
  SERVER_PROBE_MS,
} from '../../hooks/useSyncOnReconnect'
import { commandQueue } from '../../utils/CommandQueue'
import {
  isOfflineFeatureEnabled,
  subscribeToOfflineFeature,
} from '../../utils/OfflineFeatureToggle'
import { syncEngine } from '../../utils/SyncEngine'

const COMMAND_LABEL_KEYS = {
  create_chore: 'createChore',
  update_chore: 'updateChore',
  update_chore_history: 'updateChoreHistory',
  complete_chore: 'completeChore',
  skip_chore: 'skipChore',
  start_chore: 'startChore',
  pause_chore: 'pauseChore',
  delete_chore: 'deleteChore',
  delete_chore_history: 'deleteChoreHistory',
  reschedule_chore: 'rescheduleChore',
  archive_chore: 'archiveChore',
  unarchive_chore: 'unarchiveChore',
}

const formatCommandLabel = (commandType, t) => {
  const key = COMMAND_LABEL_KEYS[commandType]
  if (key) return t(`sync.commandLabels.${key}`)
  return (
    commandType
      ?.replace(/_/g, ' ')
      ?.replace(/\b\w/g, letter => letter.toUpperCase()) ||
    t('sync.commandLabels.pendingAction')
  )
}

function SyncStatusIndicator() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [pendingCommands, setPendingCommands] = useState([])
  const [failedCommands, setFailedCommands] = useState([])
  const [syncState, setSyncState] = useState({
    syncing: false,
    lastSync: null,
    error: null,
  })
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)
  const [offlineSince, setOfflineSince] = useState(networkManager.offlineSince)
  const [offlineReason, setOfflineReason] = useState(
    networkManager.offlineReason,
  )

  // Mirror the actual intervals used by useSyncOnReconnect so the countdown is accurate
  const retryInterval = useMemo(
    () =>
      !isOnline && offlineReason === 'server'
        ? SERVER_PROBE_MS / 1000
        : PENDING_POLL_MS / 1000,
    [isOnline, offlineReason],
  )

  const [retryIn, setRetryIn] = useState(retryInterval)
  const [offlineFeatureEnabled, setOfflineFeatureEnabled] = useState(
    isOfflineFeatureEnabled(),
  )

  useEffect(() => {
    const unsubscribe = subscribeToOfflineFeature(setOfflineFeatureEnabled)
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = syncEngine.onSyncStateChange(state => {
      setSyncState(prev => ({ ...prev, ...state }))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!syncState.syncing) {
      setRetryIn(retryInterval)
    }
  }, [syncState.syncing, syncState.lastSync, retryInterval])

  useEffect(() => {
    networkManager.registerNetworkListener(online => {
      setIsOnline(online)
      setOfflineReason(networkManager.offlineReason)
      if (!online) setOfflineSince(networkManager.offlineSince)
    })
  }, [])

  useEffect(() => {
    // Run countdown both when online (pending commands) and when server-unreachable (probe interval)
    if (syncState.syncing) return
    if (isOnline && pendingCommands.length === 0) return
    if (!isOnline && offlineReason === 'device') return
    const interval = setInterval(() => {
      setRetryIn(prev => {
        if (prev <= 1) {
          console.debug('[SyncStatusIndicator] Retry timer fired', {
            isOnline,
            offlineReason,
            syncing: syncState.syncing,
            lastSync: syncState.lastSync,
            error: syncState.error,
            pendingCommands: pendingCommands.length,
          })
          return retryInterval
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [
    isOnline,
    offlineReason,
    syncState.syncing,
    syncState.lastSync,
    syncState.error,
    pendingCommands.length,
    retryInterval,
  ])

  useEffect(() => {
    const update = async () => {
      try {
        const [pending, failed] = await Promise.all([
          commandQueue.getPending(),
          commandQueue.getFailed(),
        ])
        setPendingCommands(pending)
        setFailedCommands(failed)
      } catch {
        // OfflineDB may not be initialized yet
      }
    }
    update()
    const interval = setInterval(update, 5000)
    return () => clearInterval(interval)
  }, [syncState])

  const refreshCommands = async () => {
    const [pending, failed] = await Promise.all([
      commandQueue.getPending(),
      commandQueue.getFailed(),
    ])
    setPendingCommands(pending)
    setFailedCommands(failed)
  }

  const handleForceSync = async () => {
    const didSync = await syncEngine.sync()
    if (didSync) queryClient.invalidateQueries()
    await refreshCommands()
  }

  const handleDismissFailed = async id => {
    await commandQueue.cancel(id)
    await refreshCommands()
  }

  const handleCancelAll = async () => {
    const [pending, failed] = await Promise.all([
      commandQueue.getPending(),
      commandQueue.getFailed(),
    ])
    const allCommands = [...pending, ...failed]
    await Promise.all(allCommands.map(cmd => commandQueue.cancel(cmd.id)))
    await refreshCommands()
  }

  const formatTime = timestamp => {
    if (!timestamp) return t('sync.never')
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 10) return t('sync.justNow')
    if (seconds < 60) return t('sync.secondsAgo', { count: seconds })
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t('sync.minutesAgo', { count: minutes })
    return t('sync.hoursAgo', { count: Math.floor(minutes / 60) })
  }

  const formatOfflineDuration = timestamp => {
    if (!timestamp) return ''
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return t('sync.justNow')
    if (minutes < 60) return t('sync.minutesAgo', { count: minutes })
    return t('sync.hoursAgo', { count: Math.floor(minutes / 60) })
  }

  const groupedPending = Object.entries(
    pendingCommands.reduce((acc, cmd) => {
      acc[cmd.commandType] = (acc[cmd.commandType] || 0) + 1
      return acc
    }, {}),
  )

  const pendingCount = pendingCommands.length
  const failedCount = failedCommands.length
  const totalBadge = pendingCount + failedCount

  const getStatusIcon = () => {
    if (syncState.syncing)
      return <CloudSync sx={{ fontSize: 20, color: 'primary.500' }} />
    if (!isOnline) return <WifiOff sx={{ fontSize: 20, color: 'danger.500' }} />
    if (failedCount > 0)
      return <CloudQueue sx={{ fontSize: 20, color: 'danger.400' }} />
    if (pendingCount > 0)
      return <CloudQueue sx={{ fontSize: 20, color: 'warning.500' }} />
    return <CloudDone sx={{ fontSize: 20, color: 'success.500' }} />
  }

  if (!offlineFeatureEnabled) return null

  return (
    <Dropdown>
      <MenuButton
        aria-label={t('sync.aria')}
        variant='plain'
        sx={{
          p: 0.5,
          border: 'none',
          backgroundColor: 'transparent',
          borderRadius: 'var(--joy-radius-sm)',
          '&:hover': {
            backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}
        >
          {syncState.syncing && (
            <CircularProgress
              size='sm'
              sx={{
                position: 'absolute',
                '--CircularProgress-size': '28px',
                '--CircularProgress-trackThickness': '2px',
                '--CircularProgress-progressThickness': '2px',
              }}
            />
          )}
          {totalBadge > 0 ? (
            <Badge
              badgeContent={totalBadge}
              size='sm'
              color={failedCount > 0 ? 'danger' : 'warning'}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: 9,
                  minWidth: 16,
                  height: 16,
                },
              }}
            >
              {getStatusIcon()}
            </Badge>
          ) : (
            getStatusIcon()
          )}
        </Box>
      </MenuButton>

      <Menu
        placement='bottom-end'
        sx={{
          minWidth: 280,
          p: 1,
          '--List-gap': '4px',
          boxShadow: 'var(--joy-shadow-lg)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: 'var(--joy-radius-md)',
        }}
      >
        {/* Header */}
        <Sheet sx={{ p: 1.5, borderRadius: 'var(--joy-radius-sm)', mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isOnline
                    ? 'var(--joy-palette-success-500)'
                    : 'var(--joy-palette-danger-500)',
                }}
              />
              <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                {isOnline ? t('sync.online') : t('sync.offline')}
              </Typography>
            </Box>
            {syncState.syncing && (
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-primary-500)' }}
              >
                {t('sync.syncing')}
              </Typography>
            )}
          </Box>

          <Typography
            level='body-xs'
            sx={{ color: 'var(--joy-palette-text-tertiary)' }}
          >
            {t('sync.lastSync', { time: formatTime(syncState.lastSync) })}
          </Typography>

          {!isOnline && offlineSince && (
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-danger-400)', mt: 0.25 }}
            >
              {t('sync.offlineSince', {
                duration: formatOfflineDuration(offlineSince),
              })}
            </Typography>
          )}

          {syncState.error && (
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-danger-500)', mt: 0.25 }}
            >
              {t('sync.errorPrefix', { message: syncState.error })}
            </Typography>
          )}
        </Sheet>

        {/* Pending actions */}
        {groupedPending.length > 0 && (
          <>
            <Box sx={{ px: 1, py: 0.5 }}>
              <Typography
                level='body-xs'
                sx={{
                  fontWeight: 600,
                  color: 'var(--joy-palette-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('sync.pending', { count: pendingCount })}
              </Typography>
            </Box>
            {groupedPending.map(([type, count]) => (
              <Box
                key={type}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.5,
                  borderRadius: 'var(--joy-radius-sm)',
                }}
              >
                <Typography level='body-sm'>
                  {formatCommandLabel(type, t)}
                </Typography>
                <Chip size='sm' color='warning' variant='soft'>
                  {count}
                </Chip>
              </Box>
            ))}
            <Divider sx={{ my: 0.5 }} />
          </>
        )}

        {/* Failed actions */}
        {failedCommands.length > 0 && (
          <>
            <Box sx={{ px: 1, py: 0.5 }}>
              <Typography
                level='body-xs'
                sx={{
                  fontWeight: 600,
                  color: 'var(--joy-palette-danger-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('sync.failed', { count: failedCount })}
              </Typography>
            </Box>
            {failedCommands.map(cmd => (
              <Box
                key={cmd.id}
                sx={{
                  px: 1,
                  py: 0.75,
                  mb: 0.5,
                  borderRadius: 'var(--joy-radius-sm)',
                  backgroundColor: 'var(--joy-palette-danger-softBg)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-danger-700)',
                      fontWeight: 500,
                    }}
                  >
                    {formatCommandLabel(cmd.commandType, t)}
                  </Typography>
                  <Button
                    size='sm'
                    variant='plain'
                    color='danger'
                    sx={{ fontSize: 11, py: 0, minHeight: 'unset', px: 0.5 }}
                    onClick={() => handleDismissFailed(cmd.id)}
                  >
                    {t('sync.dismiss')}
                  </Button>
                </Box>
                {cmd.error && (
                  <Typography
                    level='body-xs'
                    sx={{ color: 'var(--joy-palette-danger-500)', mt: 0.25 }}
                  >
                    {cmd.error}
                  </Typography>
                )}
              </Box>
            ))}
            <Divider sx={{ my: 0.5 }} />
          </>
        )}

        {/* All clear */}
        {pendingCount === 0 && failedCount === 0 && (
          <Box
            sx={{
              px: 1,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CheckCircleOutline
              sx={{ fontSize: 16, color: 'var(--joy-palette-success-500)' }}
            />
            <Typography
              level='body-sm'
              sx={{ color: 'var(--joy-palette-text-secondary)' }}
            >
              {t('sync.allSynced')}
            </Typography>
          </Box>
        )}

        {/* Next retry / offline hint */}
        {isOnline && !syncState.syncing && pendingCount > 0 && (
          <Box sx={{ px: 1, pb: 0.5 }}>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              {t('sync.nextAutoSync', { seconds: retryIn })}
            </Typography>
          </Box>
        )}
        {!isOnline && offlineReason === 'server' && (
          <Box sx={{ px: 1, pb: 0.5 }}>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              {syncState.syncing
                ? t('sync.checkingServer')
                : t('sync.retryingIn', { seconds: retryIn })}
            </Typography>
          </Box>
        )}
        {!isOnline && offlineReason !== 'server' && (
          <Box sx={{ px: 1, pb: 0.5 }}>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              {t('sync.willSync')}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          disabled={syncState.syncing || totalBadge === 0}
          onClick={handleCancelAll}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
            },
          }}
        >
          <ListItemDecorator>
            <ClearAll sx={{ fontSize: 18 }} />
          </ListItemDecorator>
          <Typography level='body-sm' sx={{ fontWeight: 500 }}>
            {t('sync.cancelAll')}
          </Typography>
        </MenuItem>

        {/* Sync Now — must be a MenuItem so Menu doesn't swallow the click */}
        <MenuItem
          disabled={syncState.syncing}
          onClick={handleForceSync}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
            },
          }}
        >
          <ListItemDecorator>
            {syncState.syncing ? (
              <CircularProgress size='sm' />
            ) : (
              <Refresh sx={{ fontSize: 18 }} />
            )}
          </ListItemDecorator>
          <Typography level='body-sm' sx={{ fontWeight: 500 }}>
            {syncState.syncing ? t('sync.syncing') : t('sync.syncNow')}
          </Typography>
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default SyncStatusIndicator
