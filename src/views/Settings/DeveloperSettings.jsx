import { Refresh, Token } from '@mui/icons-material'
import { Box, Button, Card, Chip, Divider, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useTranslation } from 'react-i18next'
import { useSSEContext } from '../../hooks/useSSEContext'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { RefreshToken } from '../../utils/Fetcher'
import { getRefreshTokenExpiry, isNative } from '../../utils/TokenStorage'

const DeveloperSettings = () => {
  const { t } = useTranslation(['settings'])
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

  const { showNotification } = useNotification()

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
            const timeA = a.schedule?.at
              ? new Date(a.schedule.at).getTime()
              : 0
            const timeB = b.schedule?.at
              ? new Date(b.schedule.at).getTime()
              : 0
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
  }, [])

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
    if (milliseconds === null) return t('settings:developer.notAvailable')
    if (milliseconds === 0) return t('settings:developer.timeExpired')

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
          message: t('settings:developer.tokenRefreshed'),
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
          message: t('settings:developer.tokenRefreshFailed', {
            message: result.error,
          }),
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('settings:developer.tokenRefreshError', {
          message: error.message,
        }),
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
          message: t('settings:developer.refreshEndpointSuccess'),
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
          message: t('settings:developer.refreshEndpointFailed', {
            status: response.status,
            message: error,
          }),
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('settings:developer.refreshEndpointError', {
          message: error.message,
        }),
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
        message: t('settings:developer.notificationsLoaded', {
          count: sorted.length,
        }),
      })
    } catch (error) {
      console.error('Error loading scheduled notifications:', error)
      showNotification({
        type: 'error',
        message: t('settings:developer.notificationsLoadError', {
          message: error.message,
        }),
      })
    } finally {
      setIsLoadingNotifications(false)
    }
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

  return (
    <div className='grid gap-4 py-4' id='developer'>
      <Typography level='h3'>{t('settings:developer.title')}</Typography>
      <Divider />
      <Typography level='body-md'>
        {t('settings:developer.description')}
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
            <Typography level='title-lg'>
              {t('settings:developer.authTokens')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshToken}
                loading={isRefreshing}
                disabled={isRefreshing || isRefreshingDirect}
              >
                {t('settings:developer.refreshTokenAction')}
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
                {t('settings:developer.callRefreshEndpoint')}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('settings:developer.accessToken')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Typography level='body-sm'>
                {t('settings:developer.timeLeft')}
              </Typography>
              <Chip color={getExpiryStatus(timeLeft.access)} variant='soft'>
                {formatTimeLeft(timeLeft.access)}
              </Chip>
            </Box>
            {accessTokenExpiry && (
              <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                {t('settings:developer.expires', {
                  date: new Date(accessTokenExpiry).toLocaleString(),
                })}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('settings:developer.refreshToken')}
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
                  <Typography level='body-sm'>
                    {t('settings:developer.timeLeft')}
                  </Typography>
                  <Chip
                    color={getExpiryStatus(timeLeft.refresh)}
                    variant='soft'
                  >
                    {formatTimeLeft(timeLeft.refresh)}
                  </Chip>
                </Box>
                {refreshTokenExpiry && (
                  <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                    {t('settings:developer.expires', {
                      date: new Date(refreshTokenExpiry).toLocaleString(),
                    })}
                  </Typography>
                )}
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('settings:developer.refreshTokenCookie')}
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>
            {t('settings:developer.platformInfo')}
          </Typography>

          <Box>
            <Typography level='body-sm'>
              {t('settings:developer.platform')}{' '}
              <Chip variant='soft' size='sm'>
                {isNativePlatform
                  ? t('settings:developer.native')
                  : t('settings:developer.web')}
              </Chip>
            </Typography>
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
                {t('settings:developer.scheduledNotifications')}
              </Typography>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshNotifications}
                loading={isLoadingNotifications}
                disabled={isLoadingNotifications}
              >
                {t('settings:developer.refresh')}
              </Button>
            </Box>

            <Divider />

            {scheduledNotifications.length === 0 ? (
              <Typography level='body-sm' color='neutral'>
                {t('settings:developer.noScheduledNotifications')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography level='body-sm'>
                  {t('settings:developer.totalScheduled')}{' '}
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
                    const timeUntil = scheduledDate
                      ? scheduledDate - now
                      : null

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
                            {notification.title ||
                              t('settings:developer.noTitle')}
                          </Typography>
                          <Typography level='body-xs' color='neutral'>
                            {notification.body ||
                              t('settings:developer.noBody')}
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
                                    : t('settings:developer.pastDue')}
                                </Chip>
                                <Typography level='body-xs' color='neutral'>
                                  {scheduledDate.toLocaleString()}
                                </Typography>
                              </>
                            )}
                            {notification.extra?.choreId && (
                              <Chip size='sm' variant='outlined'>
                                {t('settings:developer.choreId', {
                                  id: notification.extra.choreId,
                                })}
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
          <Typography level='title-lg'>
            {t('settings:developer.sseTitle')}
          </Typography>

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('settings:developer.connectionStatus')}
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
                  : t('settings:developer.unknown')}
              </Chip>
            </Box>
            {sseError && (
              <Typography level='body-sm' color='danger' sx={{ mt: 0.5 }}>
                {t('settings:developer.error', { error: sseError })}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('settings:developer.lastEventReceived')}
            </Typography>
            {lastEvent ? (
              <>
                <Typography level='body-sm'>
                  {t('settings:developer.type')}{' '}
                  <Chip variant='soft' size='sm'>
                    {lastEvent.type}
                  </Chip>
                </Typography>
                <Typography level='body-xs' color='neutral' sx={{ mt: 0.5 }}>
                  {t('settings:developer.received', {
                    date: lastEvent.timestamp
                      ? new Date(lastEvent.timestamp).toLocaleString()
                      : t('settings:developer.notAvailable'),
                  })}
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
    </div>
  )
}

export default DeveloperSettings
