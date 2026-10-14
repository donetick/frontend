import { Sync, SyncDisabled } from '@mui/icons-material'
import {
  Box,
  Card,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Switch,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { PAYWALL_REASON, usePaywall } from '../contexts/PaywallContext'
import { useSSEContext } from '../hooks/useSSEContext'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import SSEConnectionStatus from './SSEConnectionStatus'

const SSESettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()
  const {
    error,
    getConnectionStatus,
    isConnected,
    isConnecting,
    isSSEEnabled,
    toggleSSEEnabled,
  } = useSSEContext()

  const handleToggle = () => {
    console.log('=== TOGGLE CLICKED ===')
    if (!isPlusAccount(userProfile)) {
      showPaywall(PAYWALL_REASON.REALTIME_SYNC)
      return
    }
    const currentlyEnabled = isSSEEnabled()
    console.log('SSE Settings - Toggle clicked:', {
      currentlyEnabled,
      newState: !currentlyEnabled,
      userProfile,
      isPlusAccount: isPlusAccount(userProfile),
    })
    toggleSSEEnabled(!currentlyEnabled)
  }

  const getStatusDescription = () => {
    if (!isSSEEnabled()) {
      return t('realtime.disabledDescription')
    }

    if (isConnected) {
      return t('realtime.connectedDescription')
    }

    if (isConnecting) {
      return t('realtime.connectingDescription')
    }

    if (error) {
      return t('realtime.errorDescription', { error })
    }

    return t('realtime.disconnectedDescription')
  }

  return (
    <Card sx={{ mt: 2, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {isSSEEnabled() && isPlusAccount(userProfile) ? (
          <Sync color={isConnected ? 'success' : 'disabled'} />
        ) : (
          <SyncDisabled color='disabled' />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography level='title-md'>{t('realtime.titleSse')}</Typography>
          <Typography level='body-sm' color='neutral'>
            {t('realtime.subtitleSse')}
          </Typography>
        </Box>
        {isSSEEnabled() && isPlusAccount(userProfile) && (
          <SSEConnectionStatus variant='chip' />
        )}
      </Box>

      <FormControl orientation='horizontal' sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>{t('realtime.enableLabel')}</FormLabel>
          <FormHelperText sx={{ mt: 0 }}>
            {getStatusDescription()}
          </FormHelperText>
        </Box>
        <Switch
          checked={isSSEEnabled() && isPlusAccount(userProfile)}
          onChange={handleToggle}
          color={
            isSSEEnabled() && isPlusAccount(userProfile) ? 'success' : 'neutral'
          }
          variant='solid'
          endDecorator={
            isSSEEnabled() && isPlusAccount(userProfile)
              ? t('common.on')
              : t('common.off')
          }
          slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
        />
      </FormControl>

      {isSSEEnabled() && isPlusAccount(userProfile) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography level='body-xs' color='neutral'>
            {t('realtime.statusLabel')}
          </Typography>
          <Chip
            size='sm'
            variant='soft'
            color={
              isConnected ? 'success' : isConnecting ? 'warning' : 'danger'
            }
          >
            {getConnectionStatus()}
          </Chip>
          {error && (
            <Typography level='body-xs' color='danger'>
              {error}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  )
}

export default SSESettings
