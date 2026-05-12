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
import { useEffect, useState } from 'react'
import { networkManager } from '../../hooks/NetworkManager'
import { commandQueue } from '../../utils/CommandQueue'
import {
  isOfflineFeatureEnabled,
  subscribeToOfflineFeature,
} from '../../utils/OfflineFeatureToggle'
import { syncEngine } from '../../utils/SyncEngine'

const COMMAND_LABELS = {
  create_chore: 'Create chore',
  update_chore: 'Update chore',
  update_chore_history: 'Edit history',
  complete_chore: 'Complete chore',
  skip_chore: 'Skip chore',
  start_chore: 'Start chore',
  pause_chore: 'Pause chore',
  delete_chore: 'Delete chore',
  delete_chore_history: 'Delete history',
  reschedule_chore: 'Reschedule chore',
  archive_chore: 'Archive chore',
  unarchive_chore: 'Restore chore',
}

const formatCommandLabel = commandType => {
  return (
    COMMAND_LABELS[commandType] ||
    commandType
      ?.replace(/_/g, ' ')
      ?.replace(/\b\w/g, letter => letter.toUpperCase()) ||
    'Pending action'
  )
}

const RETRY_INTERVAL = 30

function SyncStatusIndicator() {
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
  const [retryIn, setRetryIn] = useState(RETRY_INTERVAL)
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
      setRetryIn(RETRY_INTERVAL)
    }
  }, [syncState.syncing, syncState.lastSync])

  useEffect(() => {
    networkManager.registerNetworkListener(online => {
      setIsOnline(online)
      if (!online) setOfflineSince(networkManager.offlineSince)
    })
  }, [])

  useEffect(() => {
    if (!isOnline || syncState.syncing) return
    const interval = setInterval(() => {
      setRetryIn(prev => (prev <= 1 ? RETRY_INTERVAL : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isOnline, syncState.syncing, syncState.lastSync])

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
    if (!timestamp) return 'Never'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 10) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  const formatOfflineDuration = timestamp => {
    if (!timestamp) return ''
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
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
                {isOnline ? 'Online' : 'Offline'}
              </Typography>
            </Box>
            {syncState.syncing && (
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-primary-500)' }}
              >
                Syncing...
              </Typography>
            )}
          </Box>

          <Typography
            level='body-xs'
            sx={{ color: 'var(--joy-palette-text-tertiary)' }}
          >
            Last sync: {formatTime(syncState.lastSync)}
          </Typography>

          {!isOnline && offlineSince && (
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-danger-400)', mt: 0.25 }}
            >
              Offline since {formatOfflineDuration(offlineSince)}
            </Typography>
          )}

          {syncState.error && (
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-danger-500)', mt: 0.25 }}
            >
              Error: {syncState.error}
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
                Pending ({pendingCount})
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
                  {formatCommandLabel(type)}
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
                Failed ({failedCount})
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
                    {formatCommandLabel(cmd.commandType)}
                  </Typography>
                  <Button
                    size='sm'
                    variant='plain'
                    color='danger'
                    sx={{ fontSize: 11, py: 0, minHeight: 'unset', px: 0.5 }}
                    onClick={() => handleDismissFailed(cmd.id)}
                  >
                    Dismiss
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
              All changes synced
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
              Next auto-sync in {retryIn}s
            </Typography>
          </Box>
        )}
        {!isOnline && (
          <Box sx={{ px: 1, pb: 0.5 }}>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              Will sync when back online
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
            Cancel All
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
            {syncState.syncing ? 'Syncing...' : 'Sync Now'}
          </Typography>
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default SyncStatusIndicator
