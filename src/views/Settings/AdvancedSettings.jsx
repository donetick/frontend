import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  Input,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RealTimeSettings from '../../components/RealTimeSettings'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { GetUserCircle, PutWebhookURL } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import SettingsLayout from './SettingsLayout'

const AdvancedSettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const { data: userProfile } = useUserProfile()
  const { showNotification } = useNotification()

  const [userCircles, setUserCircles] = useState([])
  const [webhookURL, setWebhookURL] = useState(null)
  const [webhookError, setWebhookError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

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

  if (!userProfile) {
    return (
      <SettingsLayout title={t('settings:advanced.title')}>
        <div>{t('settings:advanced.loading')}</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title={t('settings:advanced.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('settings:advanced.description')}
        </Typography>

        {/* Webhook Settings - Only show for admins */}
        {isAdmin && (
          <>
            <Typography level='title-lg' mt={2}>
              {t('settings:advanced.webhookIntegration')}
            </Typography>
            <Typography level='body-md' mt={-1}>
              {t('settings:advanced.webhookDescription')}
            </Typography>
            {!isPlusAccount(userProfile) && (
              <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
                {t('settings:advanced.webhookPlanWarning')}
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
                label={t('settings:advanced.enableWebhook')}
                disabled={!isPlusAccount(userProfile)}
                overlay
              />
              <FormHelperText
                sx={{
                  opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
                }}
              >
                {t('settings:advanced.enableWebhookHelper')}{' '}
                {userProfile && !isPlusAccount(userProfile) && (
                  <Chip variant='soft' color='warning'>
                    {t('common:labels.plusFeature')}
                  </Chip>
                )}
              </FormHelperText>
            </FormControl>

            {webhookURL !== null && (
              <Box>
                <Typography level='title-sm'>
                  {t('settings:advanced.webhookUrl')}
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
                          message: t('settings:advanced.webhookSaved'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('settings:advanced.webhookSaveFailed'),
                        })
                      }
                    })
                  }}
                  disabled={!isPlusAccount(userProfile)}
                >
                  {t('common:actions.save')}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Real-time Settings */}
        <Typography level='title-lg' mt={2}>
          {t('settings:advanced.realtimeTitle')}
        </Typography>
        <Typography level='body-md' mt={-1}>
          {t('settings:advanced.realtimeSectionDescription')}
        </Typography>
        <RealTimeSettings />
      </div>
    </SettingsLayout>
  )
}

export default AdvancedSettings
