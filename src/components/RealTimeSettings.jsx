import { Sync, SyncDisabled } from '@mui/icons-material'
import { Box, Card, Chip, FormHelperText, Switch, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useSSEContext } from '../hooks/useSSEContext'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import SSEConnectionStatus from './SSEConnectionStatus'

const REALTIME_TYPES = {
  DISABLED: 'disabled',
  SSE: 'sse',
}

const RealTimeSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()

  // SSE context
  const sseContext = useSSEContext()

  // Get current realtime type from localStorage
  const getCurrentRealtimeType = () => {
    const sseEnabled = localStorage.getItem('sse_enabled') === 'true'
    return sseEnabled ? REALTIME_TYPES.SSE : REALTIME_TYPES.DISABLED
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
        localStorage.setItem('sse_enabled', 'false')
        sseContext.disconnect()
        break
      case REALTIME_TYPES.SSE:
        localStorage.setItem('sse_enabled', 'true')
        sseContext.connect()
        break
    }
  }

  const getCurrentContext = () => {
    switch (realtimeType) {
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
      return t('advanced.realtime.basicPlan')
    }

    if (realtimeType === REALTIME_TYPES.DISABLED) {
      return t('advanced.realtime.disabled')
    }

    if (context.isConnected) {
      return t('advanced.realtime.connected')
    }

    if (context.isConnecting) {
      return t('advanced.realtime.connecting')
    }

    if (context.error) {
      return t('advanced.realtime.errored', { error: context.error })
    }

    return t('advanced.realtime.notConnected')
  }

  const getConnectionStatusComponent = () => {
    switch (realtimeType) {
      case REALTIME_TYPES.SSE:
        return <SSEConnectionStatus variant='chip' />
      default:
        return null
    }
  }

  return (
    <Card sx={{ mt: 2, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Switch
          checked={realtimeType !== REALTIME_TYPES.DISABLED}
          onChange={e => {
            handleRealtimeTypeChange(
              null,
              e.target.checked ? REALTIME_TYPES.SSE : REALTIME_TYPES.DISABLED,
            )
          }}
          color={
            realtimeType !== REALTIME_TYPES.DISABLED ? 'success' : 'neutral'
          }
          disabled={!isPlusAccount(userProfile)}
          inputProps={{ 'aria-label': t('advanced.realtime.toggleLabel') }}
        />
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography level='title-md'>
              {t('advanced.realtime.title')}
              {!isPlusAccount(userProfile) && (
                <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
                  {t('common.plusFeature')}
                </Chip>
              )}
            </Typography>

            {realtimeType !== REALTIME_TYPES.DISABLED &&
            isPlusAccount(userProfile) ? (
              <Sync color={context.isConnected ? 'success' : 'disabled'} />
            ) : (
              <SyncDisabled color='disabled' />
            )}
          </Box>
          <Typography level='body-sm' color='neutral'>
            {t('advanced.realtime.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* <FormControl orientation='horizontal' sx={{ mb: 2 }}>
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
      </FormControl> */}

      <FormHelperText sx={{ mb: 2 }}>{getStatusDescription()}</FormHelperText>

      {realtimeType !== REALTIME_TYPES.DISABLED &&
        isPlusAccount(userProfile) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography level='body-xs' color='neutral'>
              {t('advanced.realtime.statusLabel')}
            </Typography>
            {getConnectionStatusComponent()}
            {context.error && (
              <Typography level='body-xs' color='danger'>
                {context.error}
              </Typography>
            )}
          </Box>
        )}

      {!isPlusAccount(userProfile) && (
        <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
          {t('advanced.realtime.basicPlanNotice')}
        </Typography>
      )}
    </Card>
  )
}

export default RealTimeSettings
