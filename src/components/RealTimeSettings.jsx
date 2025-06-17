import { Sync, SyncDisabled } from '@mui/icons-material'
import {
  Box,
  Card,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import { useSSEContext } from '../hooks/useSSEContext'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import SSEConnectionStatus from './SSEConnectionStatus'
import WebSocketConnectionStatus from './WebSocketConnectionStatus'

const REALTIME_TYPES = {
  DISABLED: 'disabled',
  WEBSOCKET: 'websocket',
  SSE: 'sse',
}

const RealTimeSettings = () => {
  const { data: userProfile } = useUserProfile()

  // WebSocket context
  const webSocketContext = useWebSocketContext()

  // SSE context
  const sseContext = useSSEContext()

  // Get current realtime type from localStorage
  const getCurrentRealtimeType = () => {
    const wsEnabled = localStorage.getItem('websocket_enabled') !== 'false'
    const sseEnabled = localStorage.getItem('sse_enabled') === 'true'

    if (sseEnabled) return REALTIME_TYPES.SSE
    if (wsEnabled) return REALTIME_TYPES.WEBSOCKET
    return REALTIME_TYPES.DISABLED
  }

  const [realtimeType, setRealtimeType] = useState(getCurrentRealtimeType())

  const handleRealtimeTypeChange = (event, newValue) => {
    if (!isPlusAccount(userProfile)) {
      return // Don't allow changes for non-Plus users
    }

    setRealtimeType(newValue)

    // Update localStorage and toggle connections
    switch (newValue) {
      case REALTIME_TYPES.DISABLED:
        localStorage.setItem('websocket_enabled', 'false')
        localStorage.setItem('sse_enabled', 'false')
        webSocketContext.disconnect()
        sseContext.disconnect()
        break
      case REALTIME_TYPES.WEBSOCKET:
        localStorage.setItem('websocket_enabled', 'true')
        localStorage.setItem('sse_enabled', 'false')
        sseContext.disconnect()
        webSocketContext.connect()
        break
      case REALTIME_TYPES.SSE:
        localStorage.setItem('websocket_enabled', 'false')
        localStorage.setItem('sse_enabled', 'true')
        webSocketContext.disconnect()
        sseContext.connect()
        break
    }
  }

  const getCurrentContext = () => {
    switch (realtimeType) {
      case REALTIME_TYPES.WEBSOCKET:
        return webSocketContext
      case REALTIME_TYPES.SSE:
        return sseContext
      default:
        return {
          isConnected: false,
          isConnecting: false,
          error: null,
          getConnectionStatus: () => 'disabled',
        }
    }
  }

  const context = getCurrentContext()

  const getStatusDescription = () => {
    if (!isPlusAccount(userProfile)) {
      return 'Real-time updates are not available in the Basic plan. Upgrade to Plus to receive instant notifications when chores are updated.'
    }

    if (realtimeType === REALTIME_TYPES.DISABLED) {
      return 'Real-time updates are disabled. Enable WebSocket or SSE to see live changes when you or other circle members complete, skip, or modify chores.'
    }

    const typeLabel =
      realtimeType === REALTIME_TYPES.WEBSOCKET ? 'WebSocket' : 'SSE'

    if (context.isConnected) {
      return `Real-time updates (${typeLabel}) are working. You'll see live changes when you or other circle members complete, skip, or modify chores.`
    }

    if (context.isConnecting) {
      return `Connecting to real-time updates (${typeLabel})...`
    }

    if (context.error) {
      return `Real-time updates (${typeLabel}) are enabled but not working: ${context.error}`
    }

    return `Real-time updates (${typeLabel}) are enabled but not currently connected.`
  }

  const getConnectionStatusComponent = () => {
    switch (realtimeType) {
      case REALTIME_TYPES.WEBSOCKET:
        return <WebSocketConnectionStatus variant='chip' />
      case REALTIME_TYPES.SSE:
        return <SSEConnectionStatus variant='chip' />
      default:
        return null
    }
  }

  return (
    <Card sx={{ mt: 2, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {realtimeType !== REALTIME_TYPES.DISABLED &&
        isPlusAccount(userProfile) ? (
          <Sync color={context.isConnected ? 'success' : 'disabled'} />
        ) : (
          <SyncDisabled color='disabled' />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography level='title-md'>
            Real-time Updates
            {!isPlusAccount(userProfile) && (
              <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
                Plus Feature
              </Chip>
            )}
          </Typography>
          <Typography level='body-sm' color='neutral'>
            Get instant notifications when chores are updated
          </Typography>
        </Box>
        {realtimeType !== REALTIME_TYPES.DISABLED &&
          isPlusAccount(userProfile) &&
          getConnectionStatusComponent()}
      </Box>

      <FormControl orientation='horizontal' sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>Real-time Connection Type</FormLabel>
          <FormHelperText sx={{ mt: 0 }}>
            Choose how to receive real-time updates
          </FormHelperText>
        </Box>
        <Select
          value={realtimeType}
          onChange={handleRealtimeTypeChange}
          disabled={!isPlusAccount(userProfile)}
          sx={{ minWidth: 140 }}
        >
          <Option value={REALTIME_TYPES.DISABLED}>Disabled</Option>
          <Option value={REALTIME_TYPES.WEBSOCKET}>WebSocket</Option>
          <Option value={REALTIME_TYPES.SSE}>SSE</Option>
        </Select>
      </FormControl>

      <FormHelperText sx={{ mb: 2 }}>{getStatusDescription()}</FormHelperText>

      {realtimeType !== REALTIME_TYPES.DISABLED &&
        isPlusAccount(userProfile) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography level='body-xs' color='neutral'>
              Status:
            </Typography>
            <Chip
              size='sm'
              variant='soft'
              color={
                context.isConnected
                  ? 'success'
                  : context.isConnecting
                    ? 'warning'
                    : 'danger'
              }
            >
              {context.getConnectionStatus()}
            </Chip>
            {context.error && (
              <Typography level='body-xs' color='danger'>
                {context.error}
              </Typography>
            )}
          </Box>
        )}

      {!isPlusAccount(userProfile) && (
        <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
          Real-time updates are not available in the Basic plan. Upgrade to Plus
          to receive instant notifications when you or other circle members
          complete, skip, or modify chores.
        </Typography>
      )}

      {realtimeType !== REALTIME_TYPES.DISABLED &&
        isPlusAccount(userProfile) && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.level1',
              borderRadius: 'sm',
            }}
          >
            <Typography level='body-sm' sx={{ fontWeight: 'bold', mb: 1 }}>
              Connection Types:
            </Typography>
            <Typography level='body-xs' sx={{ mb: 1 }}>
              • <strong>WebSocket:</strong> Traditional bi-directional real-time
              connection
            </Typography>
            <Typography level='body-xs'>
              • <strong>SSE:</strong> Server-Sent Events - lighter weight,
              one-way updates from server
            </Typography>
          </Box>
        )}
    </Card>
  )
}

export default RealTimeSettings
