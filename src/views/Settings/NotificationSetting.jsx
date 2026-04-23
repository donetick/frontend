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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['settingsExtras', 'common', 'settings'])
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
        title: t('common:notifications.titles.success'),
        message: t('settingsExtras:notifications.deviceRegisteredMessage'),
      })
    }

    const handleDeviceRegistrationFailed = event => {
      const { status, error } = event.detail || {}

      if (status === 409) {
        showWarning({
          title: t('settingsExtras:notifications.deviceLimitReached'),
          message: t('settingsExtras:notifications.deviceLimitReachedMessage'),
        })
      } else {
        showWarning({
          title: t('settingsExtras:notifications.registrationFailed'),
          message:
            error ||
            t('settingsExtras:notifications.registrationFailedMessage'),
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
          setError(t('settingsExtras:notifications.chatIdRequired'))
          return false
        } else if (isNaN(chatID) || chatID === '0') {
          setError(t('settingsExtras:notifications.invalidChatId'))
          return false
        }
        break
      case '2':
        if (chatID === '') {
          setError(t('settingsExtras:notifications.userKeyRequired'))
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
        alert(
          t('settingsExtras:notifications.updateFailed', {
            status: resp.statusText,
          }),
        )
        return
      }

      refetchUserProfile()
      alert(t('settingsExtras:notifications.targetUpdated'))
    })
  }

  const handleRegisterCurrentDevice = async () => {
    if (!currentDevice) return

    // Check device limit before attempting registration
    const currentDeviceCount = deviceTokens ? deviceTokens.length : 0
    if (currentDeviceCount >= 5) {
      showWarning({
        title: t('settingsExtras:notifications.deviceLimitReached'),
        message: t('settingsExtras:notifications.deviceLimitReachedMessage'),
      })
      return
    }

    try {
      // First request push notification permission
      const permStatus = await PushNotifications.requestPermissions()

      if (permStatus.receive !== 'granted') {
        showWarning({
          title: t('settingsExtras:notifications.permissionRequired'),
          message: t('settingsExtras:notifications.permissionRequiredMessage'),
        })
        return
      }

      // Ensure push notification listeners are set up before registration

      await registerPushNotifications()

      // Store registration preferences immediately since permission was granted
      await setPushNotificationPreferences({ granted: true })
      setPushNotification(true)

      showWarning({
        title: t('settingsExtras:notifications.registrationInitiated'),
        message: t('settingsExtras:notifications.registrationInitiatedMessage'),
      })
    } catch (error) {
      console.error('Error registering device:', error)
      showWarning({
        title: t('common:notifications.titles.error'),
        message: t('settingsExtras:notifications.registrationFailedMessage'),
      })
    }
  }
  return (

    <SettingsLayout title={t('settings:pages.notifications.title')}>
      <div className='grid gap-4 py-4' id='notifications'>
        <Typography level='h3'>{t('settingsExtras:notifications.deviceTitle')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('settingsExtras:notifications.deviceDescription')}
        </Typography>

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
                      title: t(
                        'settingsExtras:notifications.notificationPermissionDenied',
                      ),
                      message: t(
                        'settingsExtras:notifications.notificationPermissionDeniedMessage',
                      ),
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
            <FormLabel>{t('settingsExtras:notifications.deviceLabel')}</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {Capacitor.isNativePlatform()
                ? t('settingsExtras:notifications.deviceNativeHelper')
                : t('settingsExtras:notifications.mobileOnlyHelper')}{' '}
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
                  title: t('settingsExtras:notifications.testTitle'),
                  body: t('settingsExtras:notifications.testBody'),
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
          {t('settingsExtras:notifications.testNotification')}{' '}
        </Button>
        {deviceNotification && (
          <Card>
            {[
              {
                title: t('settingsExtras:notifications.dueDateNotification'),
                checked: dueNotification,
                set: setDueNotification,
                label: t('settingsExtras:notifications.dueDateNotificationHelper'),
                property: 'dueNotification',
                disabled: false,
              },
              {
                title: t('settingsExtras:notifications.preDueNotification'),
                checked: preDueNotification,
                set: setPreDueNotification,
                label: t('settingsExtras:notifications.preDueNotificationHelper'),
                property: 'preDueNotification',
                disabled: false,
              },
              {
                title: t('settingsExtras:notifications.overdueNotification'),
                checked: naggingNotification,
                set: setNaggingNotification,
                label: t('settingsExtras:notifications.overdueNotificationHelper'),
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
                  endDecorator={
                    item.checked
                      ? t('settingsExtras:notifications.on')
                      : t('settingsExtras:notifications.off')
                  }
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
              <FormLabel>{t('settingsExtras:notifications.pushNotifications')}</FormLabel>
              <FormHelperText sx={{ mt: 0 }}>
                {Capacitor.isNativePlatform()
                  ? t('settingsExtras:notifications.pushNotificationsHelper')
                  : t('settingsExtras:notifications.mobileOnlyHelper')}{' '}
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
                        title: t(
                          'settingsExtras:notifications.pushPermissionDenied',
                        ),
                        message: t(
                          'settingsExtras:notifications.pushPermissionDeniedMessage',
                        ),
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
              endDecorator={
                pushNotification
                  ? t('settingsExtras:notifications.on')
                  : t('settingsExtras:notifications.off')
              }
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
              {t('settingsExtras:notifications.registeredDevices', {
                count: deviceTokens ? deviceTokens.length : 0,
              })}
            </Typography>
            <Divider />
            <Typography level='body-md' sx={{ mb: 2 }}>
              {t('settingsExtras:notifications.registeredDevicesDescription')}
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
                          {t('common:labels.currentDevice')}:{' '}
                          {currentDevice.platform === 'ios' ? 'iOS' : 'Android'}{' '}
                          {currentDevice.model}
                        </Typography>
                        <Typography level='body-sm' color='neutral'>
                          {t('settingsExtras:notifications.currentDeviceUnregistered')}
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
                        ? t('settingsExtras:notifications.limitReached')
                        : t('common:actions.registerDevice')}
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
                            {device.deviceModel || t('common:status.unknown')}
                          </Typography>

                          {device.createdAt && (
                            <Typography level='body-sm' color='neutral'>
                              {t('settingsExtras:notifications.createdAt')}:{' '}
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
                                title: t('common:notifications.titles.error'),
                                message: t(
                                  'settingsExtras:notifications.removeDeviceFailed',
                                ),
                              })
                            }
                          } catch (error) {
                            showWarning({
                              title: t('common:notifications.titles.error'),
                              message: t(
                                'settingsExtras:notifications.removeDeviceFailed',
                              ),
                            })
                          }
                        }}
                      >
                        {t('common:actions.remove')}
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography level='body-md' color='neutral'>
                {t('settingsExtras:notifications.noRegisteredDevices')}
              </Typography>
            )}
          </>
        )}

        <Typography level='h3'>{t('settingsExtras:notifications.customTitle')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('settingsExtras:notifications.customDescription')}
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
            <FormLabel>{t('settingsExtras:notifications.customLabel')}</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {t('settingsExtras:notifications.customHelper')}
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
              <Option value='0'>{t('settingsExtras:notifications.none')}</Option>
              <Option value='1'>Telegram</Option>
              <Option value='2'>Pushover</Option>
              <Option value='3'>
                {t('settingsExtras:notifications.webhooks')}
              </Option>
            </Select>
            {notificationTarget === '1' && (
              <>
                <Typography level='body-xs'>
                  {t('settingsExtras:notifications.telegramSetup')}{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/DonetickBot'
                  >
                    {t('settingsExtras:notifications.clickHere')}
                  </a>{' '}
                  {t('settingsExtras:notifications.startChat')}
                </Typography>

                <Typography level='body-sm'>{t('common:labels.chatId')}</Typography>

                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder={t(
                    'settingsExtras:notifications.chatIdPlaceholder',
                  )}
                  sx={{
                    width: '200px',
                  }}
                />
                <Typography mt={0} level='body-xs'>
                  {t('settingsExtras:notifications.chatIdHelp')}{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/userinfobot'
                  >
                    {t('settingsExtras:notifications.clickHere')}
                  </a>{' '}
                  {t('settingsExtras:notifications.userInfoBot')}{' '}
                </Typography>
              </>
            )}
            {notificationTarget === '2' && (
              <>
                <Typography level='body-sm'>{t('common:labels.userKey')}</Typography>
                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder={t(
                    'settingsExtras:notifications.userKeyPlaceholder',
                  )}
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
              {t('common:actions.save')}
            </Button>
          </Box>
        )}
      </div>
    </SettingsLayout>
  )
}

export default NotificationSetting
