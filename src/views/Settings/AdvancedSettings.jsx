import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  Input,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import RealTimeSettings from '../../components/RealTimeSettings'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { GetUserCircle, PutWebhookURL } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
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
  const { data: userProfile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const [userCircles, setUserCircles] = useState([])
  const [webhookURL, setWebhookURL] = useState(null)
  const [webhookError, setWebhookError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [offlineEnabled, setOfflineEnabled] = useState(
    isOfflineFeatureEnabled(),
  )
  const [offlineLoading, setOfflineLoading] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  useEffect(() => {
    const unsubscribe = subscribeToOfflineFeature(setOfflineEnabled)
    return unsubscribe
  }, [])

  useEffect(() => {
    GetUserCircle().then(resp => {
      resp.json().then(data => {
        setUserCircles(data.res ? data.res : [])
        setWebhookURL(data.res ? data.res[0].webhook_url : null)
      })
    })
  }, [])

  // Check if user is admin based on userRole from the circle data
  useEffect(() => {
    if (userCircles.length > 0) {
      setIsAdmin(userCircles[0]?.userRole === 'admin')
    }
  }, [userCircles])

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

  // if (!userProfile) {
  //   return (
  //     <SettingsLayout title="Advanced Settings">
  //       <div>Loading...</div>
  //     </SettingsLayout>
  //   )
  // }

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

        {/* Webhook Settings - Only show for admins */}
        {isAdmin && (
          <>
            <Typography level='title-lg' mt={2}>
              {t('advanced.webhookTitle')}
            </Typography>
            <Typography level='body-md' mt={-1}>
              {t('advanced.webhookDescription')}
            </Typography>
            {!isPlusAccount(userProfile) && (
              <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
                {t('advanced.webhookPlusNotice')}
              </Typography>
            )}
            <FormControl sx={{ mt: 1 }}>
              <Checkbox
                checked={webhookURL !== null}
                onClick={() => {
                  if (webhookURL === null) {
                    setWebhookURL('')
                  } else {
                    setWebhookURL(null)
                  }
                }}
                variant='soft'
                label={t('advanced.webhookToggle')}
                disabled={!isPlusAccount(userProfile)}
                overlay
              />
              <FormHelperText
                sx={{
                  opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
                }}
              >
                {t('advanced.webhookHelper')}{' '}
                {userProfile && !isPlusAccount(userProfile) && (
                  <Chip variant='soft' color='warning'>
                    {t('common.plusFeature')}
                  </Chip>
                )}
              </FormHelperText>
            </FormControl>

            {webhookURL !== null && (
              <Box>
                <Typography level='title-sm'>
                  {t('advanced.webhookURL')}
                </Typography>
                <Input
                  value={webhookURL ? webhookURL : ''}
                  onChange={e => setWebhookURL(e.target.value)}
                  size='lg'
                  sx={{
                    width: '220px',
                    mb: 1,
                  }}
                />
                {webhookError && (
                  <Typography level='body-sm' color='danger'>
                    {webhookError}
                  </Typography>
                )}
                <Button
                  variant='soft'
                  sx={{ width: '110px', mt: 1 }}
                  onClick={() => {
                    PutWebhookURL(webhookURL).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('advanced.webhookUpdated'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('advanced.webhookUpdateFailed'),
                        })
                      }
                    })
                  }}
                  disabled={!isPlusAccount(userProfile)}
                >
                  {t('common.save')}
                </Button>
              </Box>
            )}
          </>
        )}

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
