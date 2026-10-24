import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
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
      <div className='grid gap-4'>
        <Typography level='body-md'>{t('advanced.description')}</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <Typography level='title-lg'>{t('advanced.offlineTitle')}</Typography>
          <Chip
            variant='outlined'
            size='sm'
            sx={{
              height: '20px',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              color: 'warning.main',
              borderColor: 'warning.main',
            }}
          >
            {t('common.earlyAccess')}
          </Chip>
        </Box>
        <Typography level='body-md' mt={-1}>
          {t('advanced.offlineDescription')}
        </Typography>
        <FormControl sx={{ mt: 1 }}>
          <Checkbox
            checked={offlineEnabled}
            onChange={handleOfflineToggle}
            variant='soft'
            label={t('advanced.offlineToggle')}
            disabled={offlineLoading}
            overlay
          />
          <FormHelperText>{t('advanced.offlineHelper')}</FormHelperText>
        </FormControl>

        {/* Real-time Settings */}
        <Typography level='title-lg' mt={2}>
          {t('advanced.realtimeTitle')}
        </Typography>
        <Typography level='body-md' mt={-1}>
          {t('advanced.realtimeDescription')}
        </Typography>
        <RealTimeSettings />

        {confirmModalConfig?.isOpen && (
          <ConfirmationModal config={confirmModalConfig} />
        )}
      </div>
    </SettingsLayout>
  )
}

export default AdvancedSettings
