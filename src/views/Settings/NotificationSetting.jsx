import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
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

import { registerPushNotifications } from '../../CapacitorListener'
import { useLocalization } from '../../contexts/LocalizationContext'
import {
  useDeviceTokens,
  useNotificationPreferences,
  useUserProfile,
} from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import {
  UnregisterDeviceToken,
  UpdateNotificationPreferences,
  UpdateNotificationTarget,
} from '../../utils/Fetcher'
import SettingsLayout from './SettingsLayout'

const NOTIFICATION_PROFILE_LABEL_KEYS = {
  balanced: 'profileBalanced',
  planner: 'profilePlanner',
  just_in_time: 'profileJustInTime',
  persistent: 'profilePersistent',
  quiet: 'profileQuiet',
  custom: 'profileCustom',
}

const NOTIFICATION_EVENT_LABEL_KEYS = {
  pre_due: { title: 'eventPreDueTitle', label: 'eventPreDueLabel' },
  due: { title: 'eventDueTitle', label: 'eventDueLabel' },
  overdue_followup: {
    title: 'eventOverdueFollowupTitle',
    label: 'eventOverdueFollowupLabel',
  },
  escalation: {
    title: 'eventEscalationTitle',
    label: 'eventEscalationLabel',
  },
  daily_digest: {
    title: 'eventDailyDigestTitle',
    label: 'eventDailyDigestLabel',
  },
  weekly_digest: {
    title: 'eventWeeklyDigestTitle',
    label: 'eventWeeklyDigestLabel',
  },
}

const NotificationSetting = () => {
  const { t } = useTranslation('settings')
  const { fmt } = useLocalization()
  const { showWarning } = useNotification()
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile()
  const { data: deviceTokens, refetch: refetchDevices } = useDeviceTokens()
  const {
    data: notificationPreference,
    refetch: refetchNotificationPreference,
  } = useNotificationPreferences()

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
        title: t('common.success'),
        message: t('notifications.deviceRegistered'),
      })
    }

    const handleDeviceRegistrationFailed = event => {
      const { error, status } = event.detail || {}

      if (status === 409) {
        showWarning({
          title: t('notifications.deviceLimitTitle'),
          message: t('notifications.deviceLimitMessage'),
        })
      } else {
        showWarning({
          title: t('notifications.registrationFailedTitle'),
          message: error || t('notifications.registrationFailedMessage'),
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
          setError(t('notifications.chatIdRequired'))
          return false
        } else if (isNaN(chatID) || chatID === '0') {
          setError(t('notifications.chatIdInvalid'))
          return false
        }
        break
      case '2':
        if (chatID === '') {
          setError(t('notifications.userKeyRequired'))
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
        alert(t('notifications.targetUpdateFailed', { error: resp.statusText }))
        return
      }

      refetchUserProfile()
      alert(t('notifications.targetUpdated'))
    })
  }

  const handleRegisterCurrentDevice = async () => {
    if (!currentDevice) return

    // Check device limit before attempting registration
    const currentDeviceCount = deviceTokens ? deviceTokens.length : 0
    if (currentDeviceCount >= 5) {
      showWarning({
        title: t('notifications.deviceLimitTitle'),
        message: t('notifications.deviceLimitMessage'),
      })
      return
    }

    try {
      // First request push notification permission
      const permStatus = await PushNotifications.requestPermissions()

      if (permStatus.receive !== 'granted') {
        showWarning({
          title: t('notifications.permissionRequiredTitle'),
          message: t('notifications.permissionRequiredMessage'),
        })
        return
      }

      // Ensure push notification listeners are set up before registration

      await registerPushNotifications()

      // Store registration preferences immediately since permission was granted
      await setPushNotificationPreferences({ granted: true })
      setPushNotification(true)

      showWarning({
        title: t('notifications.registrationInitiatedTitle'),
        message: t('notifications.registrationInitiatedMessage'),
      })
    } catch (error) {
      console.error('Error registering device:', error)
      showWarning({
        title: t('common.error'),
        message: t('notifications.registerDeviceFailed'),
      })
    }
  }

  const persistNotificationPreference = async ({
    digestHour,
    overrides,
    profile,
  }) => {
    try {
      const resp = await UpdateNotificationPreferences({
        profile,
        overrides,
        digestHour,
      })
      if (resp.status !== 200) {
        showWarning({
          title: t('common.error'),
          message: t('notifications.preferenceUpdateFailed'),
        })
        return
      }
      refetchNotificationPreference()
    } catch (error) {
      console.error('Error updating notification preference:', error)
      showWarning({
        title: t('common.error'),
        message: t('notifications.preferenceUpdateFailed'),
      })
    }
  }

  const handleProfileChange = (event, selected) => {
    if (!selected) return
    persistNotificationPreference({
      profile: selected,
      overrides: notificationPreference?.overrides ?? {},
      digestHour: notificationPreference?.digestHour ?? 8,
    })
  }

  const handleEventToggle = eventType => {
    const effective = notificationPreference?.effective ?? {}
    const overrides = {
      ...(notificationPreference?.overrides ?? {}),
      [eventType]: !effective[eventType],
    }
    persistNotificationPreference({
      profile: notificationPreference?.profile ?? 'balanced',
      overrides,
      digestHour: notificationPreference?.digestHour ?? 8,
    })
  }

  const handleDigestHourChange = (event, selected) => {
    if (selected === null || selected === undefined) return
    persistNotificationPreference({
      profile: notificationPreference?.profile ?? 'balanced',
      overrides: notificationPreference?.overrides ?? {},
      digestHour: Number(selected),
    })
  }

  return (
    <SettingsLayout title={t('notifications.title')}>
      <div className='grid gap-4 py-4' id='notifications'>
        <Typography level='h3'>{t('notifications.deviceSection')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('notifications.deviceSectionDescription')}
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
                      title: t('notifications.permissionDeniedTitle'),
                      message: t('notifications.permissionDeniedMessage'),
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
            <FormLabel>{t('notifications.deviceLabel')}</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {Capacitor.isNativePlatform()
                ? t('notifications.deviceHelper')
                : t('notifications.mobileOnly')}{' '}
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
                  title: t('notifications.testNotification'),
                  body: t('notifications.testNotificationBody'),
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
          {t('notifications.testNotification')}{' '}
        </Button>
        {deviceNotification && (
          <Card>
            {[
              {
                title: t('notifications.dueTitle'),
                checked: dueNotification,
                set: setDueNotification,
                label: t('notifications.dueLabel'),
                property: 'dueNotification',
                disabled: false,
              },
              {
                title: t('notifications.preDueTitle'),
                checked: preDueNotification,
                set: setPreDueNotification,
                label: t('notifications.preDueLabel'),
                property: 'preDueNotification',
                disabled: false,
              },
              {
                title: t('notifications.overdueTitle'),
                checked: naggingNotification,
                set: setNaggingNotification,
                label: t('notifications.overdueLabel'),
                property: 'naggingNotification',
                disabled: false,
              },
            ].map(item => (
              <FormControl
                key={item.property}
                orientation='horizontal'
                sx={{
                  width: '100%',
                  maxWidth: 385,
                  gap: 2,
                  justifyContent: 'space-between',
                }}
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
                  endDecorator={item.checked ? t('common.on') : t('common.off')}
                  slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
                />
              </FormControl>
            ))}
          </Card>
        )}
        {isOfficialInstance && (
          <FormControl
            orientation='horizontal'
            sx={{
              width: '100%',
              maxWidth: 400,
              gap: 2,
              justifyContent: 'space-between',
            }}
          >
            <div>
              <FormLabel>{t('notifications.pushLabel')}</FormLabel>
              <FormHelperText sx={{ mt: 0 }}>
                {Capacitor.isNativePlatform()
                  ? t('notifications.pushHelper')
                  : t('notifications.mobileOnly')}{' '}
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
                        title: t('notifications.pushPermissionDeniedTitle'),
                        message: t('notifications.pushPermissionDeniedMessage'),
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
              endDecorator={pushNotification ? t('common.on') : t('common.off')}
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
              {t('notifications.registeredDevices', {
                count: deviceTokens ? deviceTokens.length : 0,
              })}
            </Typography>
            <Divider />
            <Typography level='body-md' sx={{ mb: 2 }}>
              {t('notifications.registeredDevicesDescription')}
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
                          {t('notifications.currentDevice', {
                            platform:
                              currentDevice.platform === 'ios'
                                ? 'iOS'
                                : 'Android',
                            model: currentDevice.model,
                          })}
                        </Typography>
                        <Typography level='body-sm' color='neutral'>
                          {t('notifications.currentDeviceNotRegistered')}
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
                        ? t('notifications.limitReached')
                        : t('notifications.registerDevice')}
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
                            {device.deviceModel ||
                              t('notifications.unknownDevice')}
                          </Typography>

                          {device.createdAt && (
                            <Typography level='body-sm' color='neutral'>
                              {t('notifications.deviceCreatedAt', {
                                date: fmt.date(device.createdAt),
                              })}
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
                                title: t('common.error'),
                                message: t('notifications.unregisterFailed'),
                              })
                            }
                          } catch (error) {
                            showWarning({
                              title: t('common.error'),
                              message: t('notifications.unregisterFailed'),
                            })
                          }
                        }}
                      >
                        {t('common.remove')}
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography level='body-md' color='neutral'>
                {t('notifications.noDevices')}
              </Typography>
            )}
          </>
        )}

        <Typography level='h3'>{t('notifications.customSection')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('notifications.customSectionDescription')}
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
            <FormLabel>{t('notifications.customLabel')}</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {t('notifications.customHelper')}
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
              <Option value='0'>{t('notifications.targetNone')}</Option>
              <Option value='1'>{t('notifications.targetTelegram')}</Option>
              <Option value='2'>{t('notifications.targetPushover')}</Option>
              <Option value='3'>{t('notifications.targetWebhooks')}</Option>
            </Select>
            {notificationTarget === '1' && (
              <>
                <Typography level='body-xs'>
                  {t('notifications.telegramBotHelpBefore')}{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/DonetickBot'
                  >
                    {t('notifications.clickHere')}
                  </a>{' '}
                  {t('notifications.telegramBotHelpAfter')}
                </Typography>

                <Typography level='body-sm'>
                  {t('notifications.chatId')}
                </Typography>

                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder={t('notifications.chatIdPlaceholder')}
                  sx={{
                    width: '200px',
                  }}
                />
                <Typography mt={0} level='body-xs'>
                  {t('notifications.telegramChatIdHelpBefore')}{' '}
                  <a
                    style={{
                      textDecoration: 'underline',
                      color: '#0891b2',
                    }}
                    href='https://t.me/userinfobot'
                  >
                    {t('notifications.clickHere')}
                  </a>{' '}
                  {t('notifications.telegramChatIdHelpAfter')}{' '}
                </Typography>
              </>
            )}
            {notificationTarget === '2' && (
              <>
                <Typography level='body-sm'>
                  {t('notifications.userKey')}
                </Typography>
                <Input
                  value={chatID}
                  onChange={e => setChatID(e.target.value)}
                  placeholder={t('notifications.userKeyPlaceholder')}
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
              {t('common.save')}
            </Button>
          </Box>
        )}

        <Typography level='h3' sx={{ mt: 2 }}>
          {t('notifications.preferenceSection')}
        </Typography>
        <Divider />
        <Typography level='body-md'>
          {t('notifications.preferenceSectionDescription')}
        </Typography>

        <FormControl sx={{ maxWidth: 260 }}>
          <FormLabel>{t('notifications.profileLabel')}</FormLabel>
          <Select
            value={notificationPreference?.profile ?? 'balanced'}
            onChange={handleProfileChange}
          >
            {Object.entries(NOTIFICATION_PROFILE_LABEL_KEYS).map(
              ([profile, labelKey]) => (
                <Option key={profile} value={profile}>
                  {t(`notifications.${labelKey}`)}
                </Option>
              ),
            )}
          </Select>
          <FormHelperText>{t('notifications.profileHelper')}</FormHelperText>
        </FormControl>

        <Card>
          {Object.entries(NOTIFICATION_EVENT_LABEL_KEYS).map(
            ([eventType, labelKeys]) => (
              <FormControl
                key={eventType}
                orientation='horizontal'
                sx={{
                  width: '100%',
                  maxWidth: 385,
                  gap: 2,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <FormLabel>{t(`notifications.${labelKeys.title}`)}</FormLabel>
                  <FormHelperText sx={{ mt: 0 }}>
                    {t(`notifications.${labelKeys.label}`)}
                  </FormHelperText>
                </div>

                <Switch
                  checked={Boolean(
                    notificationPreference?.effective?.[eventType],
                  )}
                  onClick={() => handleEventToggle(eventType)}
                  color={
                    notificationPreference?.effective?.[eventType]
                      ? 'success'
                      : ''
                  }
                  variant='solid'
                  endDecorator={
                    notificationPreference?.effective?.[eventType]
                      ? t('common.on')
                      : t('common.off')
                  }
                  slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
                />
              </FormControl>
            ),
          )}
        </Card>

        <FormControl orientation='horizontal' sx={{ maxWidth: 300, gap: 2 }}>
          <div>
            <FormLabel>{t('notifications.digestHourLabel')}</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              {t('notifications.digestHourHelper')}
            </FormHelperText>
          </div>
          <Select
            value={notificationPreference?.digestHour ?? 8}
            onChange={handleDigestHourChange}
            sx={{ minWidth: 100 }}
          >
            {Array.from({ length: 24 }, (_, hour) => hour).map(hour => (
              <Option key={hour} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </Option>
            ))}
          </Select>
        </FormControl>
      </div>
    </SettingsLayout>
  )
}

export default NotificationSetting
