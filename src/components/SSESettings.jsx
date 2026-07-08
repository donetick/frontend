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
import { useSSEContext } from '../hooks/useSSEContext'
import { useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import SSEConnectionStatus from './SSEConnectionStatus'

const SSESettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const { data: userProfile } = useUserProfile()
  const {
    isConnected,
    isConnecting,
    error,
    getConnectionStatus,
    toggleSSEEnabled,
    isSSEEnabled,
  } = useSSEContext()

  const handleToggle = () => {
    console.log('=== TOGGLE CLICKED ===')
    if (!isPlusAccount(userProfile)) {
      console.log('Not a Plus account, returning early')
      return // Don't allow toggle for non-Plus users
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
    if (!isPlusAccount(userProfile)) {
      return t('settings:advanced.sseUnavailable')
    }

    if (!isSSEEnabled()) {
      return t('settings:advanced.sseDisabled')
    }

    if (isConnected) {
      return t('settings:advanced.sseConnected')
    }

    if (isConnecting) {
      return t('settings:advanced.sseConnecting')
    }

    if (error) {
      return t('settings:advanced.sseError', { error })
    }

    return t('settings:advanced.sseEnabledNotConnected')
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
          <Typography level='title-md'>
            {t('settings:advanced.sseTitle')}
            {!isPlusAccount(userProfile) && (
              <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
                {t('common:labels.plusFeature')}
              </Chip>
            )}
          </Typography>
          <Typography level='body-sm' color='neutral'>
            {t('settings:advanced.sseSummary')}
          </Typography>
        </Box>
        {isSSEEnabled() && isPlusAccount(userProfile) && (
          <SSEConnectionStatus variant='chip' />
        )}
      </Box>

      <FormControl orientation='horizontal' sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>{t('settings:advanced.enableSse')}</FormLabel>
          <FormHelperText sx={{ mt: 0 }}>
            {getStatusDescription()}
          </FormHelperText>
        </Box>
        <Switch
          checked={isSSEEnabled() && isPlusAccount(userProfile)}
          onChange={handleToggle}
          disabled={!isPlusAccount(userProfile)}
          color={
            isSSEEnabled() && isPlusAccount(userProfile) ? 'success' : 'neutral'
          }
          variant='solid'
          endDecorator={
            isSSEEnabled() && isPlusAccount(userProfile)
              ? t('settings:advanced.on')
              : t('settings:advanced.off')
          }
          slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
        />
      </FormControl>

      {isSSEEnabled() && isPlusAccount(userProfile) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography level='body-xs' color='neutral'>
            {t('settings:advanced.status')}
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

      {!isPlusAccount(userProfile) && (
        <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
          {t('settings:advanced.sseUnavailable')}
        </Typography>
      )}
    </Card>
  )
}

export default SSESettings
