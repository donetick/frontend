import { Refresh, Token } from '@mui/icons-material'
import { Box, Button, Card, Chip, Divider, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useSSEContext } from '../../hooks/useSSEContext'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { RefreshToken } from '../../utils/Fetcher'
import { getRefreshTokenExpiry, isNative } from '../../utils/TokenStorage'

const DeveloperSettings = () => {
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

    loadTokenData()
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
                Refresh tokens are managed via HTTP-only cookies on web
                platform
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
                  isConnected
                    ? 'success'
                    : isConnecting
                      ? 'warning'
                      : 'neutral'
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
              Debug Information
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography level='body-sm'>
                  Reconnect Attempts:{' '}
                  <Chip variant='soft' size='sm'>
                    {sseDebugInfo.reconnectAttempts}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  Circuit Breaker:{' '}
                  <Chip
                    variant='soft'
                    size='sm'
                    color={sseDebugInfo.isCircuitBreakerOpen ? 'danger' : 'success'}
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
