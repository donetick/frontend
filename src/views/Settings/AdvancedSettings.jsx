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
        message: 'Offline mode turned off and local data was cleared',
      })
    } catch {
      setOfflineFeatureEnabled(false)
      queryClient.removeQueries({ queryKey: ['pendingCommands'] })
      queryClient.removeQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries()
      showNotification({
        type: 'warning',
        message:
          'Offline mode was turned off, but some local data may still be stored',
      })
    } finally {
      setOfflineLoading(false)
    }
  }

  const showDisableOfflineConfirmation = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Turn Off Offline Mode',
      message:
        'Turning off offline mode will remove unsynced offline changes and saved offline data on this device/browser. Do you want to continue?',
      confirmText: 'Turn Off & Clear Data',
      cancelText: 'Cancel',
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
        message: 'Offline mode turned on for this device/browser',
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
    <SettingsLayout title='Advanced Settings'>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          Configure advanced features like webhooks and real-time updates for
          enhanced productivity.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <Typography level='title-lg'>Offline Support</Typography>
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
            Early Access
          </Chip>
        </Box>
        <Typography level='body-md' mt={-1}>
          Keep using Donetick when you're offline on this device/browser. Your
          changes are saved locally and synced when you're back online.
        </Typography>
        <FormControl sx={{ mt: 1 }}>
          <Checkbox
            checked={offlineEnabled}
            onChange={handleOfflineToggle}
            variant='soft'
            label='Enable Offline Support'
            disabled={offlineLoading}
            overlay
          />
          <FormHelperText>
            Turning this off removes unsynced offline changes and saved offline
            data from this device/browser.
          </FormHelperText>
        </FormControl>

        {/* Webhook Settings - Only show for admins */}
        {isAdmin && (
          <>
            <Typography level='title-lg' mt={2}>
              Webhook Integration
            </Typography>
            <Typography level='body-md' mt={-1}>
              Webhooks allow you to send real-time notifications to other
              services when events happen in your Circle. Configure a webhook
              URL to receive real-time updates.
            </Typography>
            {!isPlusAccount(userProfile) && (
              <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
                Webhook notifications are not available in the Basic plan.
                Upgrade to Plus to receive real-time updates via webhooks.
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
                label='Enable Webhook'
                disabled={!isPlusAccount(userProfile)}
                overlay
              />
              <FormHelperText
                sx={{
                  opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
                }}
              >
                Enable webhook notifications for tasks and things updates.{' '}
                {userProfile && !isPlusAccount(userProfile) && (
                  <Chip variant='soft' color='warning'>
                    Plus Feature
                  </Chip>
                )}
              </FormHelperText>
            </FormControl>

            {webhookURL !== null && (
              <Box>
                <Typography level='title-sm'>Webhook URL</Typography>
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
                          message: 'Webhook URL updated successfully',
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: 'Failed to update webhook URL',
                        })
                      }
                    })
                  }}
                  disabled={!isPlusAccount(userProfile)}
                >
                  Save
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Real-time Settings */}
        <Typography level='title-lg' mt={2}>
          Real-time Updates
        </Typography>
        <Typography level='body-md' mt={-1}>
          Configure how you receive live updates when tasks and activities
          change in your circle.
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
