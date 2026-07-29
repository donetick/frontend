import { LocalNotifications } from '@capacitor/local-notifications'
import { Refresh, Star, Token } from '@mui/icons-material'
import { Box, Button, Card, Chip, Divider, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { networkManager } from '../../hooks/NetworkManager'
import useConfirmationModal from '../../hooks/useConfirmationModal'
import { useSSEContext } from '../../hooks/useSSEContext'
import { useUserProfile } from '../../queries/UserQueries'
import {
  evaluatePromptEligibility,
  isFeedbackSubmissionConfigured,
  isRawChatWebhookConfigured,
  requestStoreReview,
  resetFeedbackState,
  setDevForcedPrompt,
} from '../../service/FeedbackService'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { commandQueue } from '../../utils/CommandQueue'
import { RefreshToken } from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'
import { syncEngine } from '../../utils/SyncEngine'
import { getRefreshTokenExpiry, isNative } from '../../utils/TokenStorage'
import FeedbackModal from '../Modals/FeedbackModal'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'

const DeveloperSettings = () => {
  const queryClient = useQueryClient()
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()
  const { data: userProfile } = useUserProfile()
  const {
    isConnected,
    isConnecting,
    lastEvent,
    error: sseError,
    getConnectionStatus,
    getDebugInfo,
  } = useSSEContext()

  const [accessTokenExpiry, setAccessTokenExpiry] = useState(null)
  const [refreshTokenExpiry, setRefreshTokenExpiry] = useState(null)
  const [timeLeft, setTimeLeft] = useState({
    access: null,
    refresh: null,
  })
  const [isNativePlatform, setIsNativePlatform] = useState(false)
  const [sseDebugInfo, setSSEDebugInfo] = useState(null)
  const [timeSinceLastHeartbeat, setTimeSinceLastHeartbeat] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshingDirect, setIsRefreshingDirect] = useState(false)
  const [scheduledNotifications, setScheduledNotifications] = useState([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isResettingSync, setIsResettingSync] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackEligibility, setFeedbackEligibility] = useState(null)
  const [syncDiagnostics, setSyncDiagnostics] = useState({
    cursor: null,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
    syncing: false,
    syncError: null,
    isOnline: networkManager.isOnline,
    isNetworkOn: networkManager.isNetworkOn,
    offlineSince: networkManager.offlineSince,
    lastChecked: networkManager.lastChecked,
  })

  const { showNotification } = useNotification()

  const refreshSyncDiagnostics = useCallback(async () => {
    try {
      const [cursor, lastSync, pendingCommands, failedCommands] =
        await Promise.all([
          offlineDB.getSyncCursor(),
          offlineDB.getLastSyncTime(),
          commandQueue.getPending(),
          commandQueue.getFailed(),
        ])

      setSyncDiagnostics(prev => ({
        ...prev,
        cursor,
        lastSync,
        pendingCount: pendingCommands.length,
        failedCount: failedCommands.length,
        isOnline: networkManager.isOnline,
        isNetworkOn: networkManager.isNetworkOn,
        offlineSince: networkManager.offlineSince,
        lastChecked: networkManager.lastChecked,
      }))
    } catch (error) {
      console.error('Failed to load sync diagnostics:', error)
    }
  }, [])

  useEffect(() => {
    setIsNativePlatform(isNative())

    const loadTokenData = async () => {
      const accessExpiry = localStorage.getItem('token_expiry')
      setAccessTokenExpiry(accessExpiry)

      if (isNative()) {
        const refreshExpiry = await getRefreshTokenExpiry()
        setRefreshTokenExpiry(refreshExpiry)
      }
    }

    const loadScheduledNotifications = async () => {
      if (isNative()) {
        setIsLoadingNotifications(true)
        try {
          const pending = await LocalNotifications.getPending()
          // Sort by schedule time (earliest first)
          const sorted = pending.notifications.sort((a, b) => {
            const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0
            const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0
            return timeA - timeB
          })
          setScheduledNotifications(sorted)
        } catch (error) {
          console.error('Error loading scheduled notifications:', error)
        } finally {
          setIsLoadingNotifications(false)
        }
      }
    }

    loadTokenData()
    loadScheduledNotifications()
    refreshSyncDiagnostics()
  }, [refreshSyncDiagnostics])

  useEffect(() => {
    const unsubscribeSync = syncEngine.onSyncStateChange(state => {
      setSyncDiagnostics(prev => ({
        ...prev,
        syncing:
          typeof state.syncing === 'boolean' ? state.syncing : prev.syncing,
        syncError: Object.prototype.hasOwnProperty.call(state, 'error')
          ? state.error
          : prev.syncError,
        lastSync: state.lastSync ?? prev.lastSync,
      }))
    })

    networkManager.registerNetworkListener(() => {
      setSyncDiagnostics(prev => ({
        ...prev,
        isOnline: networkManager.isOnline,
        isNetworkOn: networkManager.isNetworkOn,
        offlineSince: networkManager.offlineSince,
        lastChecked: networkManager.lastChecked,
      }))
    })

    const interval = setInterval(() => {
      refreshSyncDiagnostics()
    }, 5000)

    return () => {
      unsubscribeSync()
      clearInterval(interval)
    }
  }, [refreshSyncDiagnostics])

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()

      let accessTime = null
      if (accessTokenExpiry) {
        const accessExpiryDate = new Date(accessTokenExpiry)
        const diff = accessExpiryDate - now
        accessTime = diff > 0 ? diff : 0
      }

      let refreshTime = null
      if (refreshTokenExpiry) {
        const refreshExpiryDate = new Date(refreshTokenExpiry)
        const diff = refreshExpiryDate - now
        refreshTime = diff > 0 ? diff : 0
      }

      setTimeLeft({
        access: accessTime,
        refresh: refreshTime,
      })

      if (getDebugInfo) {
        const debugInfo = getDebugInfo()
        setSSEDebugInfo(debugInfo)
        setTimeSinceLastHeartbeat(debugInfo.timeSinceLastHeartbeat)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [accessTokenExpiry, refreshTokenExpiry, getDebugInfo])

  const formatTimeLeft = milliseconds => {
    if (milliseconds === null) return 'N/A'
    if (milliseconds === 0) return 'Expired'

    const totalSeconds = Math.floor(milliseconds / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

    return parts.join(' ')
  }

  const getExpiryStatus = milliseconds => {
    if (milliseconds === null) return 'neutral'
    if (milliseconds === 0) return 'danger'
    if (milliseconds < 5 * 60 * 1000) return 'warning' // Less than 5 minutes
    return 'success'
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    try {
      const result = await apiClient.refreshToken()

      if (result.success) {
        showNotification({
          type: 'success',
          message: 'Token refreshed successfully',
        })

        // Reload token expiry data
        const accessExpiry = localStorage.getItem('token_expiry')
        setAccessTokenExpiry(accessExpiry)

        if (isNativePlatform) {
          const refreshExpiry = await getRefreshTokenExpiry()
          setRefreshTokenExpiry(refreshExpiry)
        }
      } else {
        showNotification({
          type: 'error',
          message: `Token refresh failed: ${result.error}`,
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: `Token refresh error: ${error.message}`,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDirectRefreshToken = async () => {
    setIsRefreshingDirect(true)
    try {
      const response = await RefreshToken()

      if (response.ok) {
        const data = await response.json()
        showNotification({
          type: 'success',
          message: 'Refresh token endpoint called successfully',
        })

        // Reload token expiry data
        const accessExpiry = localStorage.getItem('token_expiry')
        setAccessTokenExpiry(accessExpiry)

        if (isNativePlatform) {
          const refreshExpiry = await getRefreshTokenExpiry()
          setRefreshTokenExpiry(refreshExpiry)
        }

        console.log('Refresh token response:', data)
      } else {
        const error = await response.text()
        showNotification({
          type: 'error',
          message: `Refresh token endpoint failed: ${response.status} ${error}`,
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: `Refresh token endpoint error: ${error.message}`,
      })
    } finally {
      setIsRefreshingDirect(false)
    }
  }

  const handleRefreshNotifications = async () => {
    if (!isNativePlatform) return

    setIsLoadingNotifications(true)
    try {
      const pending = await LocalNotifications.getPending()
      // Sort by schedule time (earliest first)
      const sorted = pending.notifications.sort((a, b) => {
        const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0
        const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0
        return timeA - timeB
      })
      setScheduledNotifications(sorted)
      showNotification({
        type: 'success',
        message: `Loaded ${sorted.length} scheduled notifications`,
      })
    } catch (error) {
      console.error('Error loading scheduled notifications:', error)
      showNotification({
        type: 'error',
        message: `Error loading notifications: ${error.message}`,
      })
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  const handleResetDatabaseAndResync = async () => {
    showConfirmation(
      'This will clear local offline data and pending commands, then start a full sync from the beginning. Continue?',
      'Clear Local DB & Re-Sync',
      async () => {
        setIsResettingSync(true)
        try {
          await offlineDB.clearAll()

          showNotification({
            type: 'success',
            message: 'Local offline database cleared. Starting full sync...',
          })

          const didSync = await syncEngine.sync()
          if (didSync) {
            await queryClient.invalidateQueries()
            showNotification({
              type: 'success',
              message: 'Full sync completed from the beginning',
            })
          } else {
            showNotification({
              type: 'warning',
              message:
                'Database cleared. Full sync did not run (likely offline or already syncing).',
            })
          }
        } catch (error) {
          console.error('Failed to reset database and resync:', error)
          showNotification({
            type: 'error',
            message: `Reset/resync failed: ${error.message}`,
          })
        } finally {
          await refreshSyncDiagnostics()
          setIsResettingSync(false)
        }
      },
      'Clear & Re-Sync',
      'Cancel',
      'danger',
    )
  }

  const refreshFeedbackEligibility = useCallback(async () => {
    const result = await evaluatePromptEligibility({ userProfile })
    setFeedbackEligibility(result)
    return result
  }, [userProfile])

  useEffect(() => {
    refreshFeedbackEligibility()
  }, [refreshFeedbackEligibility])

  const handleForceFeedbackPrompt = async () => {
    await setDevForcedPrompt(true)
    await refreshFeedbackEligibility()
    showNotification({
      type: 'success',
      message: 'Next visit to My Chores will show the prompt after ~4s',
    })
  }

  const handleResetFeedbackState = async () => {
    await resetFeedbackState()
    await refreshFeedbackEligibility()
    showNotification({
      type: 'success',
      message: 'Feedback state cleared (completions, cooldown, opt-out)',
    })
  }

  const handleRequestStoreReview = async () => {
    const requested = await requestStoreReview()
    await refreshFeedbackEligibility()
    showNotification({
      type: requested ? 'success' : 'warning',
      message: requested
        ? 'Review requested. The OS decides whether to actually show it.'
        : 'Not available — native platform only.',
    })
  }

  const getNotificationStatusColor = scheduleTime => {
    if (!scheduleTime) return 'neutral'

    const now = new Date()
    const scheduledDate = new Date(scheduleTime)
    const diffMs = scheduledDate - now

    if (diffMs < 0) return 'danger' // Past due
    if (diffMs < 5 * 60 * 1000) return 'warning' // Less than 5 minutes
    if (diffMs < 60 * 60 * 1000) return 'primary' // Less than 1 hour
    return 'success' // More than 1 hour
  }

  const formatDateTime = timestamp => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className='grid gap-4 py-4' id='developer'>
      <Typography level='h3'>Developer Settings</Typography>
      <Divider />
      <Typography level='body-md'>
        View technical information about your authentication tokens and session
        state. This information is useful for debugging and development
        purposes.
      </Typography>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>Authentication Tokens</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshToken}
                loading={isRefreshing}
                disabled={isRefreshing || isRefreshingDirect}
              >
                Refresh Token
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                startDecorator={<Token />}
                onClick={handleDirectRefreshToken}
                loading={isRefreshingDirect}
                disabled={isRefreshing || isRefreshingDirect}
              >
                Call Refresh Endpoint
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography level='title-sm' mb={1}>
              Access Token
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Typography level='body-sm'>Time Left:</Typography>
              <Chip color={getExpiryStatus(timeLeft.access)} variant='soft'>
                {formatTimeLeft(timeLeft.access)}
              </Chip>
            </Box>
            {accessTokenExpiry && (
              <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                Expires: {new Date(accessTokenExpiry).toLocaleString()}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Refresh Token
            </Typography>
            {isNativePlatform ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography level='body-sm'>Time Left:</Typography>
                  <Chip
                    color={getExpiryStatus(timeLeft.refresh)}
                    variant='soft'
                  >
                    {formatTimeLeft(timeLeft.refresh)}
                  </Chip>
                </Box>
                {refreshTokenExpiry && (
                  <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                    Expires: {new Date(refreshTokenExpiry).toLocaleString()}
                  </Typography>
                )}
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                Refresh tokens are managed via HTTP-only cookies on web platform
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>Platform Information</Typography>

          <Box>
            <Typography level='body-sm'>
              Platform:{' '}
              <Chip variant='soft' size='sm'>
                {isNativePlatform ? 'Native' : 'Web'}
              </Chip>
            </Typography>
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>Sync & Network Diagnostics</Typography>
            <Button
              size='sm'
              variant='soft'
              startDecorator={<Refresh />}
              onClick={refreshSyncDiagnostics}
            >
              Refresh
            </Button>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>Network Status</Typography>
            <Typography level='body-sm'>
              Connection:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.isOnline ? 'success' : 'danger'}
              >
                {syncDiagnostics.isOnline ? 'Online' : 'Offline'}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Device Network:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={
                  syncDiagnostics.isNetworkOn === false
                    ? 'danger'
                    : syncDiagnostics.isNetworkOn === true
                      ? 'success'
                      : 'neutral'
                }
              >
                {syncDiagnostics.isNetworkOn === false
                  ? 'Disconnected'
                  : syncDiagnostics.isNetworkOn === true
                    ? 'Connected'
                    : 'Unknown'}
              </Chip>
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Offline Since: {formatDateTime(syncDiagnostics.offlineSince)}
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Last Network Check: {formatDateTime(syncDiagnostics.lastChecked)}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>Sync Offset Information</Typography>
            <Typography level='body-sm'>
              Sync Cursor:{' '}
              <Chip size='sm' variant='soft'>
                {syncDiagnostics.cursor ?? 'N/A'}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Last Sync:{' '}
              <Chip size='sm' variant='soft' color='primary'>
                {formatDateTime(syncDiagnostics.lastSync)}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Sync State:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.syncing ? 'warning' : 'success'}
              >
                {syncDiagnostics.syncing ? 'Syncing' : 'Idle'}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Pending Commands:{' '}
              <Chip size='sm' variant='soft' color='warning'>
                {syncDiagnostics.pendingCount}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Failed Commands:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.failedCount > 0 ? 'danger' : 'success'}
              >
                {syncDiagnostics.failedCount}
              </Chip>
            </Typography>
            {syncDiagnostics.syncError && (
              <Typography level='body-sm' color='danger'>
                Sync Error: {syncDiagnostics.syncError}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>Recovery Actions</Typography>
            <Typography level='body-xs' color='warning'>
              Clears local offline cache, sync cursor, and queued commands, then
              re-syncs from the beginning.
            </Typography>
            <Box>
              <Button
                size='sm'
                color='danger'
                variant='soft'
                onClick={handleResetDatabaseAndResync}
                loading={isResettingSync}
                disabled={isResettingSync || syncDiagnostics.syncing}
              >
                Clear DB & Full Re-Sync
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>Feedback & Review Prompt</Typography>
            <Button
              size='sm'
              variant='soft'
              startDecorator={<Refresh />}
              onClick={refreshFeedbackEligibility}
            >
              Refresh
            </Button>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>Prompt Eligibility</Typography>
            <Typography level='body-sm'>
              Would auto-show:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={feedbackEligibility?.eligible ? 'success' : 'neutral'}
              >
                {feedbackEligibility?.eligible ? 'Yes' : 'No'}
              </Chip>
              {feedbackEligibility?.forced && (
                <Chip size='sm' variant='soft' color='warning' sx={{ ml: 1 }}>
                  Forced
                </Chip>
              )}
            </Typography>
            {feedbackEligibility?.blockers?.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {feedbackEligibility.blockers.map(blocker => (
                  <Typography key={blocker} level='body-xs' color='neutral'>
                    • {blocker}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>State</Typography>
            <Typography level='body-sm'>
              Completions counted:{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.completions ?? 'N/A'}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Last sentiment:{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.lastSentiment ?? 'None'}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Dismissals:{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.dismissCount ?? 0}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              Opted out:{' '}
              <Chip
                size='sm'
                variant='soft'
                color={
                  feedbackEligibility?.state?.optedOut ? 'danger' : 'success'
                }
              >
                {feedbackEligibility?.state?.optedOut ? 'Yes' : 'No'}
              </Chip>
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Last prompted:{' '}
              {formatDateTime(feedbackEligibility?.state?.lastPromptedAt)}
              {feedbackEligibility?.state?.lastPromptedVersion
                ? ` on ${feedbackEligibility.state.lastPromptedVersion}`
                : ''}
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Review requested:{' '}
              {formatDateTime(feedbackEligibility?.state?.reviewRequestedAt)}
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Current version: {feedbackEligibility?.version ?? 'N/A'} · Webhook{' '}
              {isFeedbackSubmissionConfigured()
                ? 'configured'
                : 'NOT configured (submissions log to console)'}
            </Typography>
            {isRawChatWebhookConfigured() && (
              <Typography level='body-xs' color='danger'>
                VITE_FEEDBACK_WEBHOOK_URL points straight at a Discord/Slack
                webhook. Discord rejects that with 50006, and the URL ships
                inside the public bundle — deploy workers/feedback and point the
                variable at the Worker.
              </Typography>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>Actions</Typography>
            <Typography level='body-xs' color='neutral'>
              &quot;Force next prompt&quot; bypasses every gate, then open My
              Chores to see the automatic trigger.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='sm'
                variant='soft'
                onClick={() => setFeedbackModalOpen(true)}
              >
                Open Flow
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                onClick={handleForceFeedbackPrompt}
              >
                Force Next Prompt
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                startDecorator={<Star />}
                onClick={handleRequestStoreReview}
                disabled={!isNativePlatform}
              >
                Request Store Review
              </Button>
              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={handleResetFeedbackState}
              >
                Reset State
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      {isNativePlatform && (
        <Card variant='outlined'>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography level='title-lg'>
                Scheduled Local Notifications
              </Typography>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshNotifications}
                loading={isLoadingNotifications}
                disabled={isLoadingNotifications}
              >
                Refresh
              </Button>
            </Box>

            <Divider />

            {scheduledNotifications.length === 0 ? (
              <Typography level='body-sm' color='neutral'>
                No scheduled notifications
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography level='body-sm'>
                  Total scheduled:{' '}
                  <Chip variant='soft' size='sm'>
                    {scheduledNotifications.length}
                  </Chip>
                </Typography>

                <Divider />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {scheduledNotifications.map((notification, index) => {
                    const scheduleTime = notification.schedule?.at
                    const scheduledDate = scheduleTime
                      ? new Date(scheduleTime)
                      : null
                    const now = new Date()
                    const timeUntil = scheduledDate ? scheduledDate - now : null

                    return (
                      <Card
                        key={notification.id || index}
                        variant='soft'
                        size='sm'
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          <Typography level='title-sm'>
                            {notification.title || 'No title'}
                          </Typography>
                          <Typography level='body-xs' color='neutral'>
                            {notification.body || 'No body'}
                          </Typography>

                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              mt: 0.5,
                            }}
                          >
                            {scheduledDate && (
                              <>
                                <Chip
                                  size='sm'
                                  variant='soft'
                                  color={getNotificationStatusColor(
                                    scheduleTime,
                                  )}
                                >
                                  {timeUntil && timeUntil > 0
                                    ? formatTimeLeft(timeUntil)
                                    : 'Past due'}
                                </Chip>
                                <Typography level='body-xs' color='neutral'>
                                  {scheduledDate.toLocaleString()}
                                </Typography>
                              </>
                            )}
                            {notification.extra?.choreId && (
                              <Chip size='sm' variant='outlined'>
                                Chore ID: {notification.extra.choreId}
                              </Chip>
                            )}
                          </Box>
                        </Box>
                      </Card>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      )}

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>Server-Sent Events (SSE)</Typography>

          <Box>
            <Typography level='title-sm' mb={1}>
              Connection Status
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Chip
                color={
                  isConnected ? 'success' : isConnecting ? 'warning' : 'neutral'
                }
                variant='soft'
              >
                {getConnectionStatus
                  ? getConnectionStatus().toUpperCase()
                  : 'Unknown'}
              </Chip>
            </Box>
            {sseError && (
              <Typography level='body-sm' color='danger' sx={{ mt: 0.5 }}>
                Error: {sseError}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Last Event Received
            </Typography>
            {lastEvent ? (
              <>
                <Typography level='body-sm'>
                  Type:{' '}
                  <Chip variant='soft' size='sm'>
                    {lastEvent.type}
                  </Chip>
                </Typography>
                <Typography level='body-xs' color='neutral' sx={{ mt: 0.5 }}>
                  Received:{' '}
                  {lastEvent.timestamp
                    ? new Date(lastEvent.timestamp).toLocaleString()
                    : 'N/A'}
                </Typography>
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                No events received yet
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Heartbeat Status
            </Typography>
            {sseDebugInfo?.lastHeartbeat ? (
              <>
                <Typography level='body-sm'>
                  Last Heartbeat:{' '}
                  {new Date(sseDebugInfo.lastHeartbeat).toLocaleString()}
                </Typography>
                <Typography level='body-sm' sx={{ mt: 0.5 }}>
                  Time Since Last Heartbeat:{' '}
                  <Chip
                    variant='soft'
                    size='sm'
                    color={
                      timeSinceLastHeartbeat > 120000 ? 'warning' : 'success'
                    }
                  >
                    {formatTimeLeft(timeSinceLastHeartbeat)}
                  </Chip>
                </Typography>
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                No heartbeat received yet
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Reconnection Schedule
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {sseDebugInfo.nextReconnectTime ? (
                  <>
                    <Typography level='body-sm'>
                      Next Reconnect:{' '}
                      {new Date(
                        sseDebugInfo.nextReconnectTime,
                      ).toLocaleString()}
                    </Typography>
                    <Typography level='body-sm'>
                      Time Until Reconnect:{' '}
                      <Chip variant='soft' size='sm' color='warning'>
                        {formatTimeLeft(sseDebugInfo.timeUntilReconnect)}
                      </Chip>
                    </Typography>
                    <Typography level='body-sm'>
                      Current Delay:{' '}
                      <Chip variant='soft' size='sm'>
                        {formatTimeLeft(sseDebugInfo.currentReconnectDelay)}
                      </Chip>
                    </Typography>
                  </>
                ) : (
                  <Typography level='body-sm' color='neutral'>
                    No reconnection scheduled
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                No reconnection information available
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Timeout Configuration
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography level='body-sm'>
                  Heartbeat Timeout:{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatTimeout)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Monitor Interval:{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatMonitorInterval)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Monitor Timeout:{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatMonitorTimeout)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Circuit Breaker Reset:{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.circuitBreakerResetTime)}
                  </Chip>
                </Typography>
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                No timeout information available
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              Debug Information
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography level='body-sm'>
                  Reconnect Attempts:{' '}
                  <Chip variant='soft' size='sm'>
                    {sseDebugInfo.reconnectAttempts} /{' '}
                    {sseDebugInfo.maxReconnectAttempts}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Circuit Breaker:{' '}
                  <Chip
                    variant='soft'
                    size='sm'
                    color={
                      sseDebugInfo.isCircuitBreakerOpen ? 'danger' : 'success'
                    }
                  >
                    {sseDebugInfo.isCircuitBreakerOpen ? 'OPEN' : 'CLOSED'}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Connection State:{' '}
                  <Chip variant='soft' size='sm'>
                    {sseDebugInfo.connectionState === 0
                      ? 'CONNECTING'
                      : sseDebugInfo.connectionState === 1
                        ? 'OPEN'
                        : 'CLOSED'}
                  </Chip>
                </Typography>
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                No debug information available
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false)
          refreshFeedbackEligibility()
        }}
      />

      <ConfirmationModal config={confirmModalConfig} />
    </div>
  )
}

export default DeveloperSettings
