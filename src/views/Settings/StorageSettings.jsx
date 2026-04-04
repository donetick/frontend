import { Capacitor } from '@capacitor/core'
import {
  Button,
  Card,
  Chip,
  LinearProgress,
  Switch,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUserProfile } from '../../queries/UserQueries'
import {
  FEATURES,
  isFeatureEnabled,
  setFeatureEnabled,
} from '../../utils/FeatureToggle'
import { GetStorageUsage } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const StorageSettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const Navigate = useNavigate()
  const { data: userProfile } = useUserProfile()
  const [usage, setUsage] = useState({ used: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})
  const [offlineModeEnabled, setOfflineModeEnabledState] = useState(
    isFeatureEnabled(FEATURES.OFFLINE_MODE),
  )

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('common:actions.continue'),
    cancelText = t('common:actions.cancel'),
    color = 'primary',
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText,
      color,
      onClose: isConfirmed => {
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }

  const handleOfflineModeToggle = enabled => {
    setOfflineModeEnabledState(enabled)
    setFeatureEnabled(FEATURES.OFFLINE_MODE, enabled)
  }

  useEffect(() => {
    if (isPlusAccount(userProfile)) {
      GetStorageUsage().then(resp => {
        resp.json().then(data => {
          setUsage(data.res)
          setLoading(false)
        })
      })
    }
  }, [userProfile])

  const percent =
    usage.total > 0 ? Math.round((usage.used / usage.total) * 100) : 0
  const usedMB = (usage.used / (1024 * 1024)).toFixed(2)
  const totalMB = (usage.total / (1024 * 1024)).toFixed(2)

  return (
    <SettingsLayout title={t('settings:storage.title')}>
      <div className='grid gap-4 py-4' id='storage'>
        <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('settings:storage.serverUsageTitle')}
            {!isPlusAccount(userProfile) && (
              <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
                {t('settings:storage.plusFeature')}
              </Chip>
            )}
          </Typography>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('settings:storage.serverUsageDescription')}
          </Typography>
          {!isPlusAccount(userProfile) ? (
            <>
              <LinearProgress
                determinate
                value={0}
                sx={{
                  mb: 1,
                  opacity: 0.4,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'var(--joy-palette-neutral-400)',
                  },
                }}
              />
              <Typography level='body-xs' sx={{ opacity: 0.6, mb: 1 }}>
                -- MB used / -- MB total (--)
              </Typography>
              <Typography level='body-sm' color='warning'>
                {t('settings:storage.basicPlanUnavailable')}
              </Typography>
            </>
          ) : loading ? (
            <>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography level='body-xs'>
                {t('settings:storage.loading')}
              </Typography>
            </>
          ) : (
            <>
              <LinearProgress determinate value={percent} sx={{ mb: 1 }} />
              <Typography level='body-xs'>
                {t('settings:storage.usedOfTotal', {
                  used: usedMB,
                  total: totalMB,
                  percent,
                })}
              </Typography>
            </>
          )}
        </Card>

        <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('settings:storage.experimentalTitle')}
            <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
              {t('settings:storage.comingSoon')}
            </Chip>
          </Typography>
          <div className='mb-2 flex items-center justify-between'>
            <div className='flex-1'>
              <Typography level='body-md' sx={{ mb: 0.5 }}>
                {t('settings:storage.offlineModeTitle')}
              </Typography>
              <Typography level='body-sm' color='neutral'>
                {t('settings:storage.offlineModeDescription')}
              </Typography>
            </div>
            <Switch
              checked={offlineModeEnabled}
              disabled={true}
              onChange={event => handleOfflineModeToggle(event.target.checked)}
              sx={{ ml: 2 }}
            />
          </div>
          {offlineModeEnabled && (
            <Typography level='body-xs' color='warning' sx={{ mt: 1 }}>
              {t('settings:storage.offlineModeWarning')}
            </Typography>
          )}
        </Card>

        <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('settings:storage.localStorageTitle', {
              platform: Capacitor.isNativePlatform()
                ? t('settings:storage.appPlatform')
                : t('settings:storage.browserPlatform'),
            })}
          </Typography>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('settings:storage.localStorageDescription')}
          </Typography>
          <Button
            variant='soft'
            color='danger'
            onClick={() => {
              showConfirmation(
                t('settings:storage.clearAllMessage'),
                t('settings:storage.clearAllTitle'),
                () => {
                  localStorage.clear()
                  Navigate('/login')
                },
                t('settings:storage.clearAllAction'),
                t('common:actions.cancel'),
                'danger',
              )
            }}
          >
            {t('settings:storage.clearAllButton')}
          </Button>
          <Button
            variant='outlined'
            color='danger'
            onClick={() => {
              showConfirmation(
                t('settings:storage.clearOfflineMessage'),
                t('settings:storage.clearOfflineTitle'),
                () => {
                  localStorage.removeItem('offline_cache')
                  localStorage.removeItem('offline_request_queue')
                  localStorage.removeItem('offlineTasks')
                },
                t('settings:storage.clearOfflineAction'),
                t('common:actions.cancel'),
                'danger',
              )
            }}
            sx={{ mt: 1 }}
          >
            {t('settings:storage.clearOfflineButton')}
          </Button>
        </Card>

        {Capacitor.isNativePlatform() && (
          <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
            <Typography level='title-md' sx={{ mb: 1 }}>
              {t('settings:storage.appPreferencesTitle')}
              <Chip variant='soft' color='info' sx={{ ml: 1 }}>
                {t('settings:storage.deviceOnly')}
              </Chip>
            </Typography>
            <Typography level='body-sm' sx={{ mb: 1 }}>
              {t('settings:storage.appPreferencesDescription')}
            </Typography>
            <Button
              variant='soft'
              color='danger'
              onClick={() => {
                showConfirmation(
                  t('settings:storage.clearPreferencesMessage'),
                  t('settings:storage.clearPreferencesTitle'),
                  async () => {
                    try {
                      const { Preferences } = await import(
                        '@capacitor/preferences'
                      )
                      await Preferences.clear()
                      Navigate('/login')
                    } catch (e) {
                      // Optionally show error feedback
                    }
                  },
                  t('settings:storage.clearPreferencesAction'),
                  t('common:actions.cancel'),
                  'danger',
                )
              }}
            >
              {t('settings:storage.clearPreferencesButton')}
            </Button>
          </Card>
        )}

        {/* Modals */}
        {confirmModalConfig?.isOpen && (
          <ConfirmationModal config={confirmModalConfig} />
        )}
      </div>
    </SettingsLayout>
  )
}

export default StorageSettings
