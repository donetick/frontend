import { WarningAmberRounded } from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Switch,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import RealTimeSettings from '../../components/RealTimeSettings'
import { useNotification } from '../../service/NotificationProvider'
import { offlineDB } from '../../utils/OfflineDB'
import {
  clearBrowserCacheStorage,
  isOfflineFeatureEnabled,
  setOfflineFeatureEnabled,
  subscribeToOfflineFeature,
} from '../../utils/OfflineFeatureToggle'
import { syncEngine } from '../../utils/SyncEngine'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'
import SettingsSection from './SettingsSection'

const AdvancedSettings = () => {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const [offlineEnabled, setOfflineEnabled] = useState(
    isOfflineFeatureEnabled(),
  )
  const [offlineLoading, setOfflineLoading] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  useEffect(() => {
    const unsubscribe = subscribeToOfflineFeature(setOfflineEnabled)
    return unsubscribe
  }, [])

  const disableOfflineSupport = async () => {
    setOfflineLoading(true)
    try {
      await offlineDB.clearAll()
      await clearBrowserCacheStorage()
      setOfflineFeatureEnabled(false)
      queryClient.removeQueries({ queryKey: ['pendingCommands'] })
      queryClient.removeQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries()
      showNotification({
        type: 'success',
        message: t('advanced.offlineDisabled'),
      })
    } catch {
      setOfflineFeatureEnabled(false)
      queryClient.removeQueries({ queryKey: ['pendingCommands'] })
      queryClient.removeQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries()
      showNotification({
        type: 'warning',
        message: t('advanced.offlineDisabledPartial'),
      })
    } finally {
      setOfflineLoading(false)
    }
  }

  const showDisableOfflineConfirmation = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: t('advanced.offlineDisableTitle'),
      message: t('advanced.offlineDisableMessage'),
      confirmText: t('advanced.offlineDisableConfirm'),
      cancelText: t('common.cancel'),
      color: 'danger',
      onClose: isConfirmed => {
        setConfirmModalConfig({})
        if (isConfirmed) {
          disableOfflineSupport()
        }
      },
    })
  }

  const handleOfflineToggle = async event => {
    const nextEnabled = !!event.target.checked

    if (nextEnabled) {
      setOfflineFeatureEnabled(true)
      await syncEngine.sync()
      queryClient.invalidateQueries()
      showNotification({
        type: 'success',
        message: t('advanced.offlineEnabled'),
      })
      return
    }

    showDisableOfflineConfirmation()
  }

  return (
    <SettingsLayout title={t('advanced.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('advanced.description')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <SettingsSection
            title={t('advanced.offlineTitle')}
            description={t('advanced.offlineDescription')}
            action={
              <Chip size='sm' color='warning' variant='soft'>
                {t('common.earlyAccess')}
              </Chip>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                component='label'
                htmlFor='settings-offline-support'
                level='title-sm'
                sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                {t('advanced.offlineToggle')}
              </Typography>
              <Switch
                checked={offlineEnabled}
                onChange={handleOfflineToggle}
                disabled={offlineLoading}
                color={offlineEnabled ? 'primary' : 'neutral'}
                slotProps={{
                  input: {
                    id: 'settings-offline-support',
                    'aria-describedby': 'settings-offline-warning',
                    'aria-busy': offlineLoading,
                  },
                }}
                sx={{ flexShrink: 0, minHeight: 44 }}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                borderRadius: 'lg',
                bgcolor: 'warning.softBg',
                color: 'text.secondary',
              }}
            >
              <WarningAmberRounded
                sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }}
              />
              <Typography
                id='settings-offline-warning'
                level='body-sm'
                textColor='text.primary'
              >
                {t('advanced.offlineHelper')}
              </Typography>
            </Box>
            {offlineLoading && (
              <Box
                role='status'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}
              >
                <CircularProgress size='sm' />
                <Typography level='body-sm' textColor='text.secondary'>
                  {t('advanced.clearingOffline')}
                </Typography>
              </Box>
            )}
          </SettingsSection>

          <SettingsSection
            title={t('advanced.realtimeTitle')}
            description={t('advanced.realtimeDescription')}
            action={
              <Chip size='sm' color='primary' variant='soft'>
                Donetick Plus
              </Chip>
            }
          >
            <RealTimeSettings embedded />
          </SettingsSection>
        </Box>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 2 }}>
          {t('layout.savedOnDevice')}
        </Typography>
        {confirmModalConfig?.isOpen && (
          <ConfirmationModal config={confirmModalConfig} />
        )}
      </Box>
    </SettingsLayout>
  )
}

export default AdvancedSettings
