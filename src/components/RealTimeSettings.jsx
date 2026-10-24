import { Circle } from '@mui/icons-material'
import { Box, Chip, Divider, Sheet, Switch, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PAYWALL_REASON, usePaywall } from '../contexts/PaywallContext'
import { useSSEContext } from '../hooks/useSSEContext'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'

const REALTIME_TYPES = {
  DISABLED: 'disabled',
  SSE: 'sse',
}

const RealTimeSettings = ({ embedded = false }) => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()
  const sseContext = useSSEContext()
  const toggleId = useId()
  const descriptionId = useId()

  const getCurrentRealtimeType = () => {
    const sseEnabled = localStorage.getItem('sse_enabled') === 'true'
    return sseEnabled ? REALTIME_TYPES.SSE : REALTIME_TYPES.DISABLED
  }
  const [realtimeType, setRealtimeType] = useState(getCurrentRealtimeType)

  const handleRealtimeTypeChange = newValue => {
    if (!isPlusAccount(userProfile)) {
      showPaywall(PAYWALL_REASON.REALTIME_SYNC)
      return
    }

    setRealtimeType(newValue)
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

  const enabled = realtimeType !== REALTIME_TYPES.DISABLED
  const getStatus = () => {
    if (!enabled) return 'off'
    if (sseContext.isConnected) return 'connected'
    if (sseContext.isConnecting) return 'connecting'
    if (sseContext.error) return 'error'
    return 'disconnected'
  }
  const status = getStatus()
  const statusColor = {
    off: 'neutral',
    connected: 'success',
    connecting: 'warning',
    error: 'danger',
    disconnected: 'warning',
  }[status]
  const getStatusDescription = () => {
    if (!enabled) return t('advanced.realtime.disabled')
    if (sseContext.isConnected) return t('advanced.realtime.connected')
    if (sseContext.isConnecting) return t('advanced.realtime.connecting')
    if (sseContext.error) {
      return t('advanced.realtime.errored', { error: sseContext.error })
    }
    return t('advanced.realtime.notConnected')
  }
  const Container = embedded ? Box : Sheet

  return (
    <Container
      sx={
        embedded
          ? { minWidth: 0 }
          : {
              bgcolor: 'background.surface',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 'xl',
              p: { xs: 2, sm: 2.5 },
              minWidth: 0,
            }
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component='label'
            htmlFor={toggleId}
            level='title-sm'
            sx={{ cursor: 'pointer' }}
          >
            {t('advanced.realtime.toggleLabel')}
          </Typography>
          <Typography
            id={descriptionId}
            level='body-sm'
            textColor='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {t('advanced.realtime.subtitle')}
          </Typography>
        </Box>
        <Switch
          checked={enabled}
          onChange={event =>
            handleRealtimeTypeChange(
              event.target.checked
                ? REALTIME_TYPES.SSE
                : REALTIME_TYPES.DISABLED,
            )
          }
          color={enabled ? 'primary' : 'neutral'}
          slotProps={{
            input: { id: toggleId, 'aria-describedby': descriptionId },
          }}
          sx={{ flexShrink: 0, minHeight: 44 }}
        />
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box role='status' aria-atomic='true'>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography level='body-xs' textColor='text.secondary'>
            {t('advanced.realtime.statusLabel')}
          </Typography>
          <Chip
            size='sm'
            variant='soft'
            color={statusColor}
            startDecorator={<Circle sx={{ fontSize: 8 }} />}
          >
            {t(`advanced.realtime.status.${status}`)}
          </Chip>
        </Box>
        <Typography
          level='body-sm'
          textColor='text.secondary'
          sx={{ mt: 1, overflowWrap: 'anywhere' }}
        >
          {getStatusDescription()}
        </Typography>
      </Box>
      {!isPlusAccount(userProfile) && (
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 1.5 }}>
          {t('advanced.realtime.basicPlanNotice')}
        </Typography>
      )}
    </Container>
  )
}

RealTimeSettings.propTypes = {
  embedded: PropTypes.bool,
}

export default RealTimeSettings
