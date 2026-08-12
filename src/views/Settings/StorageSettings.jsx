import { Capacitor } from '@capacitor/core'
import { Button, Card, Chip, LinearProgress, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useUserProfile } from '../../queries/UserQueries'
import { GetStorageUsage } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const StorageSettings = () => {
  const { t } = useTranslation('settings')
  const Navigate = useNavigate()
  const { data: userProfile } = useUserProfile()
  const [usage, setUsage] = useState({ used: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('common.confirm'),
    cancelText = t('common.cancel'),
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
    <SettingsLayout title={t('storage.title')}>
      <div className='grid gap-4 py-4' id='storage'>
        <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('storage.serverTitle')}
            {!isPlusAccount(userProfile) && (
              <Chip variant='soft' color='warning' sx={{ ml: 1 }}>
                {t('common.plusFeature')}
              </Chip>
            )}
          </Typography>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('storage.serverDescription')}
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
                {t('storage.usagePlaceholder')}
              </Typography>
              <Typography level='body-sm' color='warning'>
                {t('storage.basicPlanNotice')}
              </Typography>
            </>
          ) : loading ? (
            <>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography level='body-xs'>{t('common.loading')}</Typography>
            </>
          ) : (
            <>
              <LinearProgress determinate value={percent} sx={{ mb: 1 }} />
              <Typography level='body-xs'>
                {t('storage.usage', {
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
            {Capacitor.isNativePlatform()
              ? t('storage.localTitleApp')
              : t('storage.localTitleBrowser')}
          </Typography>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('storage.localDescription')}
          </Typography>
          <Button
            variant='soft'
            color='danger'
            onClick={() => {
              showConfirmation(
                t('storage.clearLocalMessage'),
                t('storage.clearLocalTitle'),
                () => {
                  localStorage.clear()
                  Navigate('/login')
                },
                t('storage.clearAll'),
                t('common.cancel'),
                'danger',
              )
            }}
          >
            {t('storage.clearLocal')}
          </Button>
        </Card>

        {Capacitor.isNativePlatform() && (
          <Card className='p-4' sx={{ maxWidth: 500, mb: 2 }}>
            <Typography level='title-md' sx={{ mb: 1 }}>
              {t('storage.appPreferences')}
              <Chip variant='soft' color='info' sx={{ ml: 1 }}>
                {t('storage.deviceOnly')}
              </Chip>
            </Typography>
            <Typography level='body-sm' sx={{ mb: 1 }}>
              {t('storage.appPreferencesDescription')}
            </Typography>
            <Button
              variant='soft'
              color='danger'
              onClick={() => {
                showConfirmation(
                  t('storage.clearPreferencesMessage'),
                  t('storage.clearPreferencesTitle'),
                  async () => {
                    try {
                      const { Preferences } =
                        await import('@capacitor/preferences')
                      await Preferences.clear()
                      Navigate('/login')
                    } catch (e) {
                      // Optionally show error feedback
                    }
                  },
                  t('storage.clearPreferences'),
                  t('common.cancel'),
                  'danger',
                )
              }}
            >
              {t('storage.clearPreferences')}
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
