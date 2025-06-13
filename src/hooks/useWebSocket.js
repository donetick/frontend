import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import { apiManager, isTokenValid } from '../utils/TokenManager'

const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000, 30000] // Progressive backoff

export const useWebSocket = () => {
  const [connectionState, setConnectionState] = useState(
    WEBSOCKET_STATES.CLOSED,
  )
  const [lastEvent, setLastEvent] = useState(null)
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const isManuallyClosedRef = useRef(false)

  const queryClient = useQueryClient()
  const { data: userProfile } = useUserProfile()

  const getWebSocketUrl = useCallback(() => {
    if (!userProfile?.circleID) {
      console.log(
        'WebSocket: User not part of any circle - real-time features unavailable',
      )
      return null
    }

    const token = localStorage.getItem('ca_token')
    if (!token || !isTokenValid()) {
      console.log('WebSocket: No valid authentication token')
      return null
    }

    // Get the API URL from apiManager and convert to WebSocket URL
    const apiUrl = apiManager.getApiURL() // e.g., "http://localhost:8080/api/v1"

    // Convert HTTP/HTTPS to WebSocket protocol and remove /api/v1 suffix
    let wsUrl = apiUrl.replace(/\/api\/v1$/, '') // Remove /api/v1 suffix
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://')
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://')
    } else {
      // If no protocol specified, use the current page's protocol
      const isHttps = window.location.protocol === 'https:'
      wsUrl = `${isHttps ? 'wss:' : 'ws:'}//${wsUrl}`
    }

    // Add the WebSocket endpoint path
    wsUrl = `${wsUrl}/api/v1/realtime/ws?token=${token}&circleId=${userProfile.circleID}`

    console.log('WebSocket: Generated URL:', wsUrl)
    return wsUrl
  }, [userProfile])

  const handleWebSocketMessage = useCallback(
    event => {
      try {
        const eventData = JSON.parse(event.data)
        setLastEvent(eventData)

        console.log('WebSocket event received:', eventData.type, eventData)

        // Handle different event types and update React Query cache accordingly
        switch (eventData.type) {
          case 'chore.created':
          case 'chore.updated':
          case 'chore.completed':
            queryClient.invalidateQueries(['choresHistory', 7])
          case 'chore.skipped':
            queryClient.invalidateQueries(['choresHistory', 7])
          case 'chore.deleted':
            // Invalidate chores queries to refetch data
            queryClient.invalidateQueries(['chores'])

            // If it's a specific chore event, also invalidate that chore's details
            if (eventData.data.chore?.id) {
              queryClient.invalidateQueries(['chore', eventData.data.chore.id])
              queryClient.invalidateQueries([
                'choreDetails',
                eventData.data.chore.id,
              ])
            }
            break

          case 'subtask.updated':
          case 'subtask.completed':
            // Invalidate the specific chore that contains this subtask
            if (eventData.data.choreId) {
              queryClient.invalidateQueries(['chore', eventData.data.choreId])
              queryClient.invalidateQueries([
                'choreDetails',
                eventData.data.choreId,
              ])
            }
            // Also invalidate general chores list
            queryClient.invalidateQueries(['chores'])
            break

          case 'heartbeat':
            // Heartbeat events don't need cache invalidation
            console.debug('Heartbeat received')
            break

          case 'connection.established':
            console.log('WebSocket connection established')
            setError(null)
            break

          case 'error':
            console.error('WebSocket error event:', eventData.data)
            setError(eventData.data.message || 'WebSocket error occurred')
            break

          default:
            console.log('Unknown WebSocket event type:', eventData.type)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
        setError('Failed to parse server message')
      }
    },
    [queryClient],
  )

  const createWebSocketConnection = useCallback(
    wsUrl => {
      const token = localStorage.getItem('ca_token')

      try {
        console.log('Connecting to WebSocket:', wsUrl)
        setConnectionState(WEBSOCKET_STATES.CONNECTING)
        isManuallyClosedRef.current = false

        // Use query parameter authentication (token already included in URL)
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          console.log('WebSocket connection opened')
          setConnectionState(WEBSOCKET_STATES.OPEN)
          setError(null)
          reconnectAttemptsRef.current = 0
        }

        wsRef.current.onmessage = handleWebSocketMessage

        wsRef.current.onerror = error => {
          console.error('WebSocket error:', error)
          setError('Connection error occurred')
        }
      } catch (err) {
        console.error('Failed to create WebSocket connection:', err)
        setError('Failed to establish connection')
        setConnectionState(WEBSOCKET_STATES.CLOSED)
      }
    },
    [handleWebSocketMessage],
  )

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const attemptIndex = Math.min(
      reconnectAttemptsRef.current,
      RECONNECT_INTERVALS.length - 1,
    )
    const delay = RECONNECT_INTERVALS[attemptIndex]

    console.log(
      `Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`,
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      // Trigger reconnection
      const wsUrl = getWebSocketUrl()
      if (wsUrl && wsRef.current?.readyState !== WEBSOCKET_STATES.OPEN) {
        createWebSocketConnection(wsUrl)
      }
    }, delay)
  }, [getWebSocketUrl, createWebSocketConnection])

  // Set up the onclose handler separately to avoid circular dependency
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onclose = event => {
        console.log('WebSocket connection closed:', event.code, event.reason)
        setConnectionState(WEBSOCKET_STATES.CLOSED)

        // Handle different close codes
        if (event.code === 4000) {
          setError('Authentication failed - please refresh the page')
          return // Don't attempt to reconnect for auth failures
        } else if (event.code === 4001) {
          setError('Authorization failed - check circle access')
          return // Don't attempt to reconnect for auth failures
        }

        // Attempt to reconnect if not manually closed
        if (!isManuallyClosedRef.current && event.code !== 1000) {
          scheduleReconnect()
        }
      }
    }
  }, [scheduleReconnect])

  const connect = useCallback(() => {
    console.log('WebSocket connect called')
    console.log('WebSocket current state:', wsRef.current?.readyState)

    if (wsRef.current?.readyState === WEBSOCKET_STATES.OPEN) {
      console.log('WebSocket: Already connected')
      return // Already connected
    }

    const wsUrl = getWebSocketUrl()
    console.log('WebSocket connect - URL:', wsUrl)

    if (!wsUrl) {
      console.log(
        'Cannot connect to WebSocket: missing URL, token, or user profile',
      )
      return
    }

    createWebSocketConnection(wsUrl)
  }, [getWebSocketUrl, createWebSocketConnection])

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setConnectionState(WEBSOCKET_STATES.CLOSED)
  }, [])

  const toggleWebSocketEnabled = useCallback(
    enabled => {
      localStorage.setItem('websocket_enabled', enabled.toString())
      if (enabled && userProfile?.circleID && isTokenValid()) {
        connect()
      } else {
        disconnect()
      }
    },
    [connect, disconnect, userProfile],
  )

  const isWebSocketEnabled = useCallback(() => {
    return localStorage.getItem('websocket_enabled') !== 'false'
  }, [])

  // Auto-connect when user profile is available and token is valid
  useEffect(() => {
    console.log('WebSocket auto-connect effect triggered')
    console.log('UserProfile:', userProfile)
    console.log('circleID:', userProfile?.circleID)
    console.log('Token valid:', isTokenValid())
    console.log('Is Plus account:', isPlusAccount(userProfile))

    // Check if WebSocket is enabled in settings
    const isWebSocketEnabledSetting =
      localStorage.getItem('websocket_enabled') !== 'false'
    console.log('WebSocket enabled in settings:', isWebSocketEnabledSetting)

    if (
      userProfile?.circleID &&
      isTokenValid() &&
      isWebSocketEnabledSetting &&
      isPlusAccount(userProfile)
    ) {
      console.log('WebSocket: Conditions met, attempting to connect')
      connect()
    } else {
      console.log('WebSocket: Conditions not met, disconnecting')
      if (!isPlusAccount(userProfile)) {
        console.log('WebSocket: Not a Plus account - feature unavailable')
      }
      disconnect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [userProfile, connect, disconnect])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    connectionState,
    isConnected: connectionState === WEBSOCKET_STATES.OPEN,
    isConnecting: connectionState === WEBSOCKET_STATES.CONNECTING,
    lastEvent,
    error,
    connect,
    disconnect,
    toggleWebSocketEnabled,
    isWebSocketEnabled,
    // Helper function to check connection status
    getConnectionStatus: () => {
      switch (connectionState) {
        case WEBSOCKET_STATES.CONNECTING:
          return 'connecting'
        case WEBSOCKET_STATES.OPEN:
          return 'connected'
        case WEBSOCKET_STATES.CLOSING:
          return 'disconnecting'
        case WEBSOCKET_STATES.CLOSED:
        default:
          return 'disconnected'
      }
    },
  }
}
