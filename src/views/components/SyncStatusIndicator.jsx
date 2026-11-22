import {
  ClearAll,
  CloudOff,
  InfoOutlined,
  MonitorHeart,
  OpenInNew,
  Refresh,
  Sync,
  SyncDisabled,
  SyncProblem,
  Troubleshoot,
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
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'

import { networkManager } from '../../hooks/NetworkManager'
import { commandQueue } from '../../utils/CommandQueue'
import { openExternalLink } from '../../utils/ExternalLinks'
import {
  isOfflineFeatureEnabled,
  subscribeToOfflineFeature,
} from '../../utils/OfflineFeatureToggle'
import {
  getServerHealth,
  probeServer,
  SERVER_STATUS,
  subscribeToServerHealth,
} from '../../utils/ServerHealth'
import {
  DONETICK_STATUS_URL,
  getServerBaseUrl,
  isOfficialServer,
} from '../../utils/ServerInfo'
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

const SectionLabel = ({ children, color }) => (
  <Box sx={{ px: 1, py: 0.5 }}>
    <Typography
      level='body-xs'
      sx={{
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </Typography>
  </Box>
)

SectionLabel.propTypes = {
  children: PropTypes.node,
  color: PropTypes.string,
}

// Every row in the menu footer has to be a MenuItem — Joy's Menu swallows
// clicks on anything else — so they all share one shape.
const ActionItem = ({ disabled, icon, label, onClick, to, trailing }) => (
  <MenuItem
    component={to ? RouterLink : undefined}
    to={to}
    disabled={disabled}
    onClick={onClick}
    sx={{
      borderRadius: 'var(--joy-radius-sm)',
      '&:hover': {
        backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
      },
    }}
  >
    <ListItemDecorator sx={{ flex: '0 0 auto' }}>{icon}</ListItemDecorator>
    {/* Translations run long — "Troubleshoot connection" is nearly twice the
        length in German — so labels wrap onto a second line. */}
    <Typography
      level='body-sm'
      sx={{ fontWeight: 500, minWidth: 0, whiteSpace: 'normal' }}
    >
      {label}
    </Typography>
    {trailing}
  </MenuItem>
)

ActionItem.propTypes = {
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  to: PropTypes.string,
  trailing: PropTypes.node,
}

/**
 * One headline, one meta line, at most one sentence of explanation — in that
 * order and never more. Every timestamp, countdown and "still trying" note is
 * an attribute of the status, so they ride on the meta line instead of each
 * claiming a row and restating what the headline already said.
 */
const StatusHeader = ({ detail, detailColor, dotColor, meta, title }) => (
  <Sheet sx={{ p: 1.5, borderRadius: 'var(--joy-radius-sm)', mb: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flex: '0 0 auto',
          backgroundColor: dotColor,
        }}
      />
      <Typography level='title-sm' sx={{ fontWeight: 600, minWidth: 0 }}>
        {title}
      </Typography>
    </Box>

    {meta && (
      <Typography
        level='body-xs'
        sx={{ color: 'var(--joy-palette-text-tertiary)', mt: 0.25 }}
      >
        {meta}
      </Typography>
    )}

    {detail && (
      <Typography
        level='body-xs'
        sx={{ color: detailColor, mt: 0.75, overflowWrap: 'anywhere' }}
      >
        {detail}
      </Typography>
    )}
  </Sheet>
)

StatusHeader.propTypes = {
  detail: PropTypes.string,
  detailColor: PropTypes.string,
  dotColor: PropTypes.string.isRequired,
  meta: PropTypes.string,
  title: PropTypes.string.isRequired,
}

const PendingSection = ({ groupedPending, t }) => {
  if (groupedPending.length === 0) return null
  const pendingCount = groupedPending.reduce(
    (total, [, count]) => total + count,
    0,
  )
  return (
    <>
      <SectionLabel color='var(--joy-palette-text-secondary)'>
        {t('sync.pending', { count: pendingCount })}
      </SectionLabel>
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
          <Typography level='body-sm' sx={{ minWidth: 0 }}>
            {formatCommandLabel(type, t)}
          </Typography>
          <Chip
            size='sm'
            color='warning'
            variant='soft'
            sx={{ flex: '0 0 auto' }}
          >
            {count}
          </Chip>
        </Box>
      ))}
      <Divider sx={{ my: 0.5 }} />
    </>
  )
}

PendingSection.propTypes = {
  groupedPending: PropTypes.array.isRequired,
  t: PropTypes.func.isRequired,
}

const FailedSection = ({ failedCommands, onDismiss, t }) => {
  if (failedCommands.length === 0) return null
  return (
    <>
      <SectionLabel color='var(--joy-palette-danger-500)'>
        {t('sync.failed', { count: failedCommands.length })}
      </SectionLabel>
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
                minWidth: 0,
              }}
            >
              {formatCommandLabel(cmd.commandType, t)}
            </Typography>
            <Button
              size='sm'
              variant='plain'
              color='danger'
              sx={{
                fontSize: 11,
                py: 0,
                minHeight: 'unset',
                px: 0.5,
                flex: '0 0 auto',
              }}
              onClick={() => onDismiss(cmd.id)}
            >
              {t('sync.dismiss')}
            </Button>
          </Box>
          {cmd.error && (
            <Typography
              level='body-xs'
              sx={{
                color: 'var(--joy-palette-danger-500)',
                mt: 0.25,
                // Server errors arrive with URLs and ids in them, which have
                // no break opportunities of their own.
                overflowWrap: 'anywhere',
              }}
            >
              {cmd.error}
            </Typography>
          )}
        </Box>
      ))}
      <Divider sx={{ my: 0.5 }} />
    </>
  )
}

FailedSection.propTypes = {
  failedCommands: PropTypes.array.isRequired,
  onDismiss: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function SyncStatusIndicator({ showLabel = false }) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [pendingCommands, setPendingCommands] = useState([])
  const [failedCommands, setFailedCommands] = useState([])
  const [syncState, setSyncState] = useState({
    syncing: false,
    lastSync: null,
    error: null,
    nextRetryAt: syncEngine.nextRetryAt,
  })
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)
  const [deviceOnline, setDeviceOnline] = useState(networkManager.deviceOnline)
  const [offlineSince, setOfflineSince] = useState(networkManager.offlineSince)
  const [offlineReason, setOfflineReason] = useState(
    networkManager.offlineReason,
  )
  // Server reachability is tracked for everyone, not just offline-mode users,
  // so a server outage can be named even when nothing is being queued.
  const [serverHealth, setServerHealth] = useState(getServerHealth)
  // null until the configured server has been read; only Donetick Cloud users
  // get offered our status page.
  const [officialServer, setOfficialServer] = useState(null)

  const [offlineFeatureEnabled, setOfflineFeatureEnabled] = useState(
    isOfflineFeatureEnabled(),
  )
  // Ticks only while there is a scheduled attempt to count down to.
  const [now, setNow] = useState(() => Date.now())

  // The scheduler in useSyncOnReconnect publishes when the next attempt will
  // actually happen, so this is a readout rather than a second clock. The old
  // local countdown was guesswork — it reset on its own events and drifted out
  // of phase with the timers, which is why it fired at 11s instead of 15s.
  const retryIn = useMemo(() => {
    if (!syncState.nextRetryAt) return null
    return Math.max(0, Math.ceil((syncState.nextRetryAt - now) / 1000))
  }, [syncState.nextRetryAt, now])

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
    const handleNetworkChange = online => {
      setIsOnline(online)
      setDeviceOnline(networkManager.deviceOnline)
      setOfflineReason(networkManager.offlineReason)
      if (!online) setOfflineSince(networkManager.offlineSince)
    }
    networkManager.registerNetworkListener(handleNetworkChange)
    return () => networkManager.unregisterNetworkListener(handleNetworkChange)
  }, [])

  useEffect(() => subscribeToServerHealth(setServerHealth), [])

  // Which server this is only matters once it stops answering, so the
  // Preferences read waits for a problem instead of running on every mount.
  const serverTrouble =
    serverHealth.status === SERVER_STATUS.unreachable ||
    serverHealth.status === SERVER_STATUS.degraded

  useEffect(() => {
    if (!serverTrouble || officialServer !== null) return
    getServerBaseUrl().then(url => setOfficialServer(isOfficialServer(url)))
  }, [serverTrouble, officialServer])

  // Only tick while a countdown is on screen — the schedule exists at all
  // times (the cache refresh is always pending), and re-rendering the nav bar
  // every second to animate a number nobody is looking at is pure waste.
  const showsCountdown =
    (isOnline && pendingCommands.length > 0) ||
    (!isOnline && offlineReason === 'server')

  useEffect(() => {
    if (!syncState.nextRetryAt || syncState.syncing || !showsCountdown) {
      return undefined
    }
    // `now` may be stale from the last time a countdown was visible, so take a
    // fresh reading before the first tick lands a second from now.
    const initialRead = setTimeout(() => setNow(Date.now()), 0)
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(initialRead)
      clearInterval(interval)
    }
  }, [syncState.nextRetryAt, syncState.syncing, showsCountdown])

  useEffect(() => {
    // Nothing is queued with offline mode off, so there is no queue to poll.
    if (!offlineFeatureEnabled) return undefined
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
  }, [syncState, offlineFeatureEnabled])

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

  // Device first: with no network on the device, "the server is down" is a
  // guess, and the only useful thing to say is that this device is offline.
  const serverUnreachable =
    deviceOnline && serverHealth.status === SERVER_STATUS.unreachable
  const serverDegraded =
    deviceOnline && serverHealth.status === SERVER_STATUS.degraded
  // Offline mode drops the whole app to offline when the server stops
  // answering; that case is already named more precisely by serverUnreachable.
  const offlineOnDevice = !deviceOnline || (!isOnline && !serverUnreachable)
  const hasConnectionIssue =
    offlineOnDevice || serverUnreachable || serverDegraded

  const handleCheckServer = async () => {
    const health = await probeServer()
    if (health.status === SERVER_STATUS.unreachable) return
    // Only a successful sync restores the offline state (see SyncEngine), so a
    // healthy answer hands off to the sync rather than flipping the flag here.
    if (offlineFeatureEnabled) {
      await handleForceSync()
      return
    }
    // Without the queue there is nothing to replay — just refetch what the
    // screens failed to load while the server was away.
    queryClient.invalidateQueries()
  }

  // One sync glyph across every state, so the icon never changes shape — only
  // its colour and whether it spins. "All synced" is deliberately the quietest
  // of them: it is the state nobody needs to look at, so it shouldn't shout.
  const getStatusIcon = () => {
    const iconSize = showLabel ? 21 : 20
    const sx = { fontSize: iconSize }

    if (syncState.syncing)
      return (
        <Sync
          sx={{
            ...sx,
            color: 'primary.500',
            animation: 'spin 1.4s linear infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
      )
    if (offlineOnDevice)
      return <SyncDisabled sx={{ ...sx, color: 'danger.500' }} />
    // The cloud glyph is the one exception to the single-sync-glyph rule: a
    // server that is down is not a sync problem the user can do anything about.
    if (serverUnreachable)
      return <CloudOff sx={{ ...sx, color: 'danger.500' }} />
    if (failedCount > 0)
      return <SyncProblem sx={{ ...sx, color: 'danger.400' }} />
    if (serverDegraded)
      return <SyncProblem sx={{ ...sx, color: 'warning.500' }} />
    if (pendingCount > 0) return <Sync sx={{ ...sx, color: 'warning.500' }} />
    return <Sync sx={{ ...sx, color: 'text.tertiary' }} />
  }

  // The nav bar and the menu read the same headline, so the indicator can never
  // describe the connection two different ways. "Syncing" is deliberately not a
  // headline of its own: the glyph already spins, and the meta line says it in
  // words — a title that flips every poll is harder to read, not more informed.
  const statusTitle = offlineOnDevice
    ? t('sync.offline')
    : serverUnreachable
      ? t('sync.serverUnreachable')
      : failedCount > 0
        ? t('sync.changesFailed', { count: failedCount })
        : serverDegraded
          ? t('sync.serverDegraded')
          : pendingCount > 0
            ? t('sync.changesWaiting', { count: pendingCount })
            : syncState.error
              ? t('sync.lastSyncFailed')
              : t('sync.allSynced')

  const statusTone =
    offlineOnDevice || serverUnreachable || failedCount > 0
      ? 'danger'
      : serverDegraded || pendingCount > 0 || syncState.error
        ? 'warning'
        : 'success'

  // One time fact, not two: while the device is offline the offline duration is
  // the more useful reading, and otherwise "when did this last work" covers it.
  const timeMeta =
    offlineOnDevice && offlineSince
      ? t('sync.metaOfflineFor', {
          duration: formatOfflineDuration(offlineSince),
        })
      : syncState.lastSync
        ? t('sync.metaSynced', { time: formatTime(syncState.lastSync) })
        : t('sync.metaNeverSynced')

  const activityMeta = syncState.syncing
    ? t('sync.metaChecking')
    : showsCountdown && retryIn !== null
      ? hasConnectionIssue
        ? t('sync.metaRetrying', { seconds: retryIn })
        : t('sync.metaNextTry', { seconds: retryIn })
      : null

  // At most one sentence, and only when it says something the headline didn't.
  // The raw sync error is last in line because during an outage it is always
  // the same "Failed to fetch" that the hint above already explains in words,
  // and a failed command carries its own error next to the command itself.
  const [detailText, detailColor] = offlineOnDevice
    ? [
        offlineFeatureEnabled ? t('sync.willSync') : t('sync.noQueueHint'),
        'var(--joy-palette-text-secondary)',
      ]
    : serverUnreachable
      ? [t('sync.serverUnreachableHint'), 'var(--joy-palette-danger-500)']
      : serverDegraded
        ? [t('sync.serverDegradedHint'), 'var(--joy-palette-warning-600)']
        : failedCount === 0 && syncState.error
          ? [
              t('sync.errorPrefix', { message: syncState.error }),
              'var(--joy-palette-warning-600)',
            ]
          : [null, undefined]

  // With offline mode off there is no queue to report on, so the indicator only
  // earns its place in the nav bar when something is actually wrong.
  if (!offlineFeatureEnabled && !hasConnectionIssue) return null

  return (
    <Dropdown>
      <MenuButton
        aria-label={t('sync.aria')}
        variant='plain'
        sx={{
          minHeight: showLabel ? 48 : 'auto',
          p: showLabel ? '8px 12px' : 0.5,
          width: showLabel ? '100%' : 'auto',
          justifyContent: showLabel ? 'flex-start' : 'center',
          border: 'none',
          backgroundColor: 'transparent',
          borderRadius: 'var(--joy-radius-sm)',
          '&:hover': {
            backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
            position: 'relative',
          }}
        >
          {/* No ring here: the sync glyph spins on its own while syncing. */}
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
          {showLabel && (
            <Typography
              level='body-sm'
              sx={{
                fontWeight: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {statusTitle}
            </Typography>
          )}
        </Box>
      </MenuButton>

      <Menu
        placement='bottom-end'
        sx={{
          minWidth: 280,
          // Without a cap the menu widens to fit the longest sentence — the
          // server hint alone stretched it past 900px on desktop. Bounded, the
          // text wraps instead; on a phone it stays inside the viewport.
          maxWidth: 'min(340px, calc(100vw - 24px))',
          p: 1,
          '--List-gap': '4px',
          boxShadow: 'var(--joy-shadow-lg)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: 'var(--joy-radius-md)',
        }}
      >
        <StatusHeader
          detail={detailText}
          detailColor={detailColor}
          dotColor={`var(--joy-palette-${statusTone}-500)`}
          meta={[timeMeta, activityMeta].filter(Boolean).join(' · ')}
          title={statusTitle}
        />

        <PendingSection groupedPending={groupedPending} t={t} />

        <FailedSection
          failedCommands={failedCommands}
          onDismiss={handleDismissFailed}
          t={t}
        />

        {/* No "all clear" row: an empty queue is the assumption, and a green
            check under a red headline reads as the panel arguing with itself.
            When everything is fine, the headline already says so. */}

        <Divider sx={{ my: 0.5 }} />

        {/* Hidden rather than greyed out — a permanently disabled row is noise
            in a menu this short. */}
        {offlineFeatureEnabled && totalBadge > 0 && (
          <ActionItem
            disabled={syncState.syncing}
            icon={<ClearAll sx={{ fontSize: 18 }} />}
            label={t('sync.cancelAll')}
            onClick={handleCancelAll}
          />
        )}

        {/* Sync Now — must be a MenuItem so Menu doesn't swallow the click */}
        <ActionItem
          disabled={syncState.syncing}
          icon={
            syncState.syncing ? (
              <CircularProgress size='sm' />
            ) : (
              <Refresh sx={{ fontSize: 18 }} />
            )
          }
          label={
            offlineFeatureEnabled
              ? syncState.syncing
                ? t('sync.syncing')
                : t('sync.syncNow')
              : t('sync.checkConnection')
          }
          onClick={offlineFeatureEnabled ? handleForceSync : handleCheckServer}
        />

        {/* Donetick Cloud is ours, so when it is the thing that is down we can
            point at the status page that says whether it is known and why. */}
        {serverTrouble && officialServer && (
          <ActionItem
            icon={<MonitorHeart sx={{ fontSize: 18 }} />}
            label={t('sync.donetickStatus')}
            onClick={() => openExternalLink(DONETICK_STATUS_URL)}
            trailing={
              <OpenInNew
                sx={{
                  fontSize: 14,
                  ml: 'auto',
                  color: 'var(--joy-palette-text-tertiary)',
                }}
              />
            }
          />
        )}

        {/* The way out of the dropdown: which server, is it up, what failed.
            While something is wrong this is the next step rather than a
            reference page, so it says so. */}
        <ActionItem
          icon={
            hasConnectionIssue ? (
              <Troubleshoot sx={{ fontSize: 18 }} />
            ) : (
              <InfoOutlined sx={{ fontSize: 18 }} />
            )
          }
          label={
            hasConnectionIssue
              ? t('sync.troubleshoot')
              : t('sync.connectionDetails')
          }
          to='/settings/connection'
        />
      </Menu>
    </Dropdown>
  )
}

SyncStatusIndicator.propTypes = {
  showLabel: PropTypes.bool,
}

export default SyncStatusIndicator
