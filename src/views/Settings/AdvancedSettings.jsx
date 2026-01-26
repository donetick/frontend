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
import RealTimeSettings from '../../components/RealTimeSettings'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { GetUserCircle, PutWebhookURL } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import SettingsLayout from './SettingsLayout'

const AdvancedSettings = () => {
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
      <SettingsLayout title="Advanced Settings">
        <div>Loading...</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title="Advanced Settings">
      <div className='grid gap-4'>
        <Typography level='body-md'>
          Configure advanced features like webhooks and real-time updates for enhanced productivity.
        </Typography>

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
          Configure how you receive live updates when tasks and activities change in your circle.
        </Typography>
        <RealTimeSettings />
      </div>
    </SettingsLayout>
  )
}

export default AdvancedSettings