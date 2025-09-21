import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { Android, Apple } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Option,
  Select,
  Switch,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'

import { PushNotifications } from '@capacitor/push-notifications'
import { registerPushNotifications } from '../../CapacitorListener'
import { useDeviceTokens, useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import {
  UnregisterDeviceToken,
  UpdateNotificationTarget,
} from '../../utils/Fetcher'
import SettingsLayout from './SettingsLayout'

const NotificationSetting = () => {
  const { showWarning } = useNotification()
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile()
  const { data: deviceTokens, refetch: refetchDevices } = useDeviceTokens()

  const getNotificationPreferences = async () => {
    const ret = await Preferences.get({ key: 'notificationPreferences' })
    return JSON.parse(ret.value)
  }
  const setNotificationPreferences = async value => {
    if (value.granted === false) {
      await Preferences.set({
        key: 'notificationPreferences',
        value: JSON.stringify({ granted: false }),
      })
      return
    }
    const currentSettings = await getNotificationPreferences()
    await Preferences.set({
      key: 'notificationPreferences',
      value: JSON.stringify({ ...currentSettings, ...value }),
    })
  }

  const getPushNotificationPreferences = async () => {
    const ret = await Preferences.get({ key: 'pushNotificationPreferences' })
    return JSON.parse(ret.value)
  }

  const setPushNotificationPreferences = async value => {
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify(value),
    })
  }

  const [deviceNotification, setDeviceNotification] = useState(false)

  const [dueNotification, setDueNotification] = useState(true)
  const [preDueNotification, setPreDueNotification] = useState(false)
  const [naggingNotification, setNaggingNotification] = useState(false)
  const [pushNotification, setPushNotification] = useState(false)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)
  const [currentDevice, setCurrentDevice] = useState(null)
  const [isCurrentDeviceRegistered, setIsCurrentDeviceRegistered] =
    useState(true)

  useEffect(() => {
    getNotificationPreferences().then(resp => {
      if (resp) {
        setDeviceNotification(Boolean(resp.granted))
        setDueNotification(Boolean(resp.dueNotification ?? true))
        setPreDueNotification(Boolean(resp.preDueNotification))
        setNaggingNotification(Boolean(resp.naggingNotification))
      }
    })
    getPushNotificationPreferences().then(resp => {
      if (resp) {
        setPushNotification(Boolean(resp.granted))
      }
    })

    // Check if this is the official donetick.com instance
    try {
      setIsOfficialInstance(isOfficialDonetickInstanceSync())
    } catch (error) {
      console.warn('Error checking instance type:', error)
      setIsOfficialInstance(false)
    }

    // Get current device info if on native platform
    if (Capacitor.isNativePlatform()) {
      const getCurrentDeviceInfo = async () => {
        try {
          const deviceInfo = await Device.getInfo()
          const deviceId = await Device.getId()
          const platform =
            Capacitor.getPlatform() === 'android' ? 'android' : 'ios'

          setCurrentDevice({
            id: deviceId.identifier,
            platform,
            model: deviceInfo.model,
            appVersion: deviceInfo.appVersion,
          })
        } catch (error) {
          console.error('Error getting device info:', error)
        }
      }
      getCurrentDeviceInfo()
    }
  }, [])

  const [notificationTarget, setNotificationTarget] = useState(
    userProfile?.notification_target
      ? String(userProfile.notification_target.type)
      : '0',
  )

  const [chatID, setChatID] = useState(
    userProfile?.notification_target?.target_id ?? 0,
  )
  const [error, setError] = useState('')

  // Check if current device is registered whenever deviceTokens or currentDevice changes
  useEffect(() => {
    if (currentDevice && deviceTokens && isOfficialInstance) {
      const isRegistered = deviceTokens.some(
        device => device.deviceId === currentDevice.id,
      )
      setIsCurrentDeviceRegistered(isRegistered)
    }
  }, [currentDevice, deviceTokens, isOfficialInstance])

  // Listen for device registration events from CapacitorListener
  useEffect(() => {
    const handleDeviceRegistered = () => {
      refetchDevices()
      showWarning({
        title: 'Success',
        message: 'Device registered successfully for push notifications.',
      })
    }

    const handleDeviceRegistrationFailed = event => {
      const { status, error } = event.detail || {}

      if (status === 409) {
        showWarning({
          title: 'Device Limit Reached',
          message:
            'You have reached the maximum limit of 5 registered devices. Please remove a device before registering this one.',
        })
      } else {
        showWarning({
          title: 'Registration Failed',
          message:
            error ||
            'Failed to register device automatically. Please try again.',
        })
      }
    }

    // Listen for the custom events that CapacitorListener might emit
    window.addEventListener('deviceTokenRegistered', handleDeviceRegistered)
    window.addEventListener(
      'deviceTokenRegistrationFailed',
      handleDeviceRegistrationFailed,
    )

    return () => {
      window.removeEventListener(
        'deviceTokenRegistered',
        handleDeviceRegistered,
      )
      window.removeEventListener(
        'deviceTokenRegistrationFailed',
        handleDeviceRegistrationFailed,
      )
    }
  }, [refetchDevices, showWarning])
  const SaveValidation = () => {
    switch (notificationTarget) {
      case '1':
        if (chatID === '') {
          setError('Chat ID is required')
          return false
        } else if (isNaN(chatID) || chatID === '0') {
          setError('Invalid Chat ID')
          return false
        }
        break
      case '2':
        if (chatID === '') {
          setError('User key is required')
          return false
        }
        break
      default:
        break
    }
    setError('')
    return true
  }
  const handleSave = () => {
    if (!SaveValidation()) return

    UpdateNotificationTarget({
      target: chatID,
      type: Number(notificationTarget),
    }).then(resp => {
      if (resp.status != 200) {
        alert(`Error while updating notification target: ${resp.statusText}`)
        return
      }

      refetchUserProfile()
      alert('Notification target updated')
    })
  }

  const handleRegisterCurrentDevice = async () => {
    if (!currentDevice) return

    // Check device limit before attempting registration
    const currentDeviceCount = deviceTokens ? deviceTokens.length : 0
    if (currentDeviceCount >= 5) {
      showWarning({
        title: 'Device Limit Reached',
        message:
          'You have reached the maximum limit of 5 registered devices. Please remove a device before registering this one.',
      })
      return
    }

    try {
      // First request push notification permission
      const permStatus = await PushNotifications.requestPermissions()

      if (permStatus.receive !== 'granted') {
        showWarning({
          title: 'Permission Required',
          message:
            'Push notification permission is required to register this device.',
        })
        return
      }

      // Ensure push notification listeners are set up before registration

      await registerPushNotifications()

      // Store registration preferences immediately since permission was granted
      await setPushNotificationPreferences({ granted: true })
      setPushNotification(true)

      showWarning({
        title: 'Registration Initiated',
        message:
          'Push notification registration has been initiated. The device will be registered automatically.',
      })
    } catch (error) {
      console.error('Error registering device:', error)
      showWarning({
        title: 'Error',
        message: 'Failed to register device. Please try again.',
      })
    }
  }
  return (
    <SettingsLayout title='Notification Settings'>
      <div className='grid gap-4 py-4' id='notifications'>
        <Typography level='h3'>Device Notification</Typography>
        <Divider />
        <Typography level='body-md'>Manage your Device Notificaiton</Typography>

        <FormControl orientation='horizontal'>
          <Switch
            disabled={!Capacitor.isNativePlatform()}
            checked={deviceNotification}
            onClick={event => {
              event.preventDefault()
              if (deviceNotification === false) {
                LocalNotifications.requestPermissions().then(resp => {
                  if (resp.display === 'granted') {
                    setDeviceNotification(true)
                    setNotificationPreferences({ granted: true })
                  } else if (resp.display === 'denied') {
                    showWarning({
                      title: 'Notification Permission Denied',
                      message:
                        'You have denied notification permissions. You can enable them later in your device settings.',
                    })
                    setDeviceNotification(false)
                    setNotificationPreferences({ granted: false })
                  }
                })
              } else {
                setDeviceNotification(false)
              }
            }}
            color={deviceNotification ? 'success' : 'neutral'}
            variant={deviceNotification ? 'solid' : 'outlined'}
            slotProps={{
              endDecorator: {
                sx: {
                  minWidth: 24,
                },
              },
            }}
            sx={{ mr: 2 }}
          />
          <div>
            <FormLabel>Device Notification</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {Capacitor.isNativePlatform()
                ? 'Receive notification on your device when a task is due'
                : 'This feature is only available on mobile devices'}{' '}
            </FormHelperText>
          </div>
        </FormControl>
        <Button
          variant='soft'
          color='primary'
          disabled={!deviceNotification}
          sx={{
            width: '210px',
            mb: 1,
          }}
          onClick={() => {
            // schedule a local notification in 5 seconds
            LocalNotifications.schedule({
              notifications: [
                {
                  title: 'Test Notification',
                  body: 'You have a task due soon',
                  id: 1,
                  schedule: { at: new Date(Date.now() + 2000) },
                  sound: null,
                  attachments: null,
                  actionTypeId: '',
                  extra: null,
                },
              ],
            })
          }}
        >
          Test Notification{' '}
        </Button>
        {deviceNotification && (
          <Card>
            {[
              {
                title: 'Due Date Notification',
                checked: dueNotification,
                set: setDueNotification,
                label: 'Notification when the task is due',
                property: 'dueNotification',
                disabled: false,
              },
              {
                title: 'Pre-Due Date Notification',
                checked: preDueNotification,
                set: setPreDueNotification,
                label: 'Notification a few hours before the task is due',
                property: 'preDueNotification',
                disabled: false,
              },
              {
                title: 'Overdue Notification',
                checked: naggingNotification,
                set: setNaggingNotification,
                label: 'Notification when the task is overdue',
                property: 'naggingNotification',
                disabled: false,
              },
            ].map(item => (
              <FormControl
                key={item.property}
                orientation='horizontal'
                sx={{ width: 385, justifyContent: 'space-between' }}
              >
                <div>
                  <FormLabel>{item.title}</FormLabel>
                  <FormHelperText sx={{ mt: 0 }}>{item.label} </FormHelperText>
                </div>

                <Switch
                  checked={item.checked}
                  disabled={item.disabled}
                  onClick={() => {
                    setNotificationPreferences({
                      [item.property]: !item.checked,
                    })
                    item.set(!item.checked)
                  }}
                  color={item.checked ? 'success' : ''}
                  variant='solid'
                  endDecorator={item.checked ? 'On' : 'Off'}
                  slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
                />
              </FormControl>
            ))}
          </Card>
        )}
        {isOfficialInstance && (
          <FormControl
            orientation='horizontal'
            sx={{ width: 400, justifyContent: 'space-between' }}
          >
            <div>
              <FormLabel>Push Notifications</FormLabel>
              <FormHelperText sx={{ mt: 0 }}>
                {Capacitor.isNativePlatform()
                  ? 'Receive Nudges, Announcements, and Chore Assignments via Push Notifications'
                  : 'This feature is only available on mobile devices'}{' '}
              </FormHelperText>
            </div>
            <Switch
              disabled={!Capacitor.isNativePlatform()}
              checked={pushNotification}
              onClick={async event => {
                event.preventDefault()
                if (pushNotification === false) {
                  try {
                    const resp = await PushNotifications.requestPermissions()
                    console.log('user PushNotifications permission', resp)
                    if (resp.receive === 'granted') {
                      setPushNotification(true)
                      setPushNotificationPreferences({ granted: true })
                      // Register push notifications after permission is granted
                      await registerPushNotifications()
                    }
                    if (resp.receive !== 'granted') {
                      showWarning({
                        title: 'Push Notification Permission Denied',
                        message:
                          'Push notifications have been disabled. You can enable them in your device settings if needed.',
                      })
                      setPushNotification(false)
                      setPushNotificationPreferences({ granted: false })
                      console.log('User denied permission', resp)
                    }
                  } catch (error) {
                    console.error('Error setting up push notifications:', error)
                  }
                } else {
                  setPushNotification(false)
                }
              }}
              color={pushNotification ? 'success' : 'neutral'}
              variant={pushNotification ? 'solid' : 'outlined'}
              endDecorator={pushNotification ? 'On' : 'Off'}
              slotProps={{
                endDecorator: {
                  sx: {
                    minWidth: 24,
                  },
                },
              }}
            />
          </FormControl>
        )}

        {isOfficialInstance && (
          <>
            <Typography level='h4' sx={{ mt: 2 }}>
              Registered Devices ({deviceTokens ? deviceTokens.length : 0}/5)
            </Typography>
            <Divider />
            <Typography level='body-md' sx={{ mb: 2 }}>
              Devices registered to receive push notifications for your account
            </Typography>

            {/* Show register current device option if not registered */}
            {Capacitor.isNativePlatform() &&
              currentDevice &&
              !isCurrentDeviceRegistered && (
                <Card
                  variant='outlined'
                  sx={{ p: 2, mb: 2, bgcolor: 'background.level1' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {currentDevice.platform === 'ios' ? (
                        <Apple sx={{ fontSize: 24, color: '#007AFF' }} />
                      ) : (
                        <Android sx={{ fontSize: 24, color: '#3DDC84' }} />
                      )}
                      <Box>
                        <Typography level='body-md' sx={{ fontWeight: 'bold' }}>
                          Current Device:{' '}
                          {currentDevice.platform === 'ios' ? 'iOS' : 'Android'}{' '}
                          {currentDevice.model}
                        </Typography>
                        <Typography level='body-sm' color='neutral'>
                          This device is not registered for push notifications
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant='solid'
                      color='primary'
                      size='sm'
                      disabled={deviceTokens && deviceTokens.length >= 5}
                      onClick={handleRegisterCurrentDevice}
                    >
                      {deviceTokens && deviceTokens.length >= 5
                        ? 'Limit Reached'
                        : 'Register Device'}
                    </Button>
                  </Box>
                </Card>
              )}

            {deviceTokens && deviceTokens.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {deviceTokens.map(device => (
                  <Card key={device.id} variant='outlined' sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        {device.platform === 'ios' ? (
                          <Apple sx={{ fontSize: 24, color: '#007AFF' }} />
                        ) : (
                          <Android sx={{ fontSize: 24, color: '#3DDC84' }} />
                        )}
                        <Box>
                          <Typography
                            level='body-md'
                            sx={{ fontWeight: 'bold' }}
                          >
                            {device.platform === 'ios' ? 'iOS' : 'Android'}{' '}
                            {device.deviceModel || 'Unknown Device'}
                          </Typography>

                          {device.createdAt && (
                            <Typography level='body-sm' color='neutral'>
                              Created At:{' '}
                              {new Date(device.createdAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant='outlined'
                        color='danger'
                        size='sm'
                        onClick={async () => {
                          try {
                            const resp = await UnregisterDeviceToken(
                              device.deviceId,
                              null,
                            )
                            if (resp.ok) {
                              refetchDevices()
                            } else {
                              showWarning({
                                title: 'Error',
                                message: 'Failed to unregister device',
                              })
                            }
                          } catch (error) {
                            showWarning({
                              title: 'Error',
                              message: 'Failed to unregister device',
                            })
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography level='body-md' color='neutral'>
                No devices registered for push notifications
              </Typography>
            )}
          </>
        )}

        <Typography level='h3'>Custom Notification</Typography>
        <Divider />
        <Typography level='body-md'>
          Notificaiton through other platform like Telegram or Pushover
        </Typography>

        <FormControl orientation='horizontal'>
          <Switch
            checked={Boolean(chatID !== 0)}
            onClick={event => {
              event.preventDefault()
              if (chatID !== 0) {
                // Turning off custom notification - call API to disable
                setChatID(0)
                setNotificationTarget('0')
                UpdateNotificationTarget({
                  target: '',
                  type: 0,
                }).then(resp => {
                  if (resp.status === 200) {
                    refetchUserProfile()
                  }
                })
              } else {
                // Turning on custom notification - just set state, user will use Save button
                setChatID('')
                setNotificationTarget('1') // Default to Telegram
              }
            }}
            color={chatID !== 0 ? 'success' : 'neutral'}
            variant={chatID !== 0 ? 'solid' : 'outlined'}
            slotProps={{
              endDecorator: {
                sx: {
                  minWidth: 24,
                },
              },
            }}
            sx={{ mr: 2 }}
          />
          <div>
            <FormLabel>Custom Notification</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              Receive notification on other platform
            </FormHelperText>
          </div>
        </FormControl>
        {chatID !== 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Select
              value={notificationTarget}
              sx={{ maxWidth: '200px' }}
              onChange={(e, selected) => setNotificationTarget(selected)}
            >
              <Option value='0'>None</Option>
              <Option value='1'>Telegram</Option>
              <Option value='2'>Pushover</Option>
              <Option value='3'>Webhooks</Option>
            </Select>
            {notificationTarget === '1' && (
              <>
                <Typography level='body-xs'>
                  You need to initiate a message to the bot in order for the
                  Telegram notification to work{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/DonetickBot'
                  >
                    Click here
                  </a>{' '}
                  to start a chat
                </Typography>

                <Typography level='body-sm'>Chat ID</Typography>

                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder='User ID / Chat ID'
                  sx={{
                    width: '200px',
                  }}
                />
                <Typography mt={0} level='body-xs'>
                  If you don't know your Chat ID, start chat with userinfobot
                  and it will send you your Chat ID.{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/userinfobot'
                  >
                    Click here
                  </a>{' '}
                  to start chat with userinfobot{' '}
                </Typography>
              </>
            )}
            {notificationTarget === '2' && (
              <>
                <Typography level='body-sm'>User key</Typography>
                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder='User ID'
                  sx={{
                    width: '200px',
                  }}
                />
              </>
            )}
            {error && (
              <Typography color='warning' level='body-sm'>
                {error}
              </Typography>
            )}

            <Button
              sx={{
                width: '110px',
                mb: 1,
              }}
              onClick={handleSave}
            >
              Save
            </Button>
          </Box>
        )}
      </div>
    </SettingsLayout>
  )
}

export default NotificationSetting
