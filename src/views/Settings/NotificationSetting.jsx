import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import {
  AccessTimeRounded,
  Android,
  Apple,
  LinkRounded,
  NotificationsNoneRounded,
  SendRounded,
  SmartphoneRounded,
  TuneRounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Link,
  Option,
  Select,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
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

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
  overflow: 'hidden',
}
const rowSx = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 2,
  p: { xs: 2, sm: 2.5 },
}
const profiles = {
  balanced: 'profileBalanced',
  planner: 'profilePlanner',
  just_in_time: 'profileJustInTime',
  persistent: 'profilePersistent',
  quiet: 'profileQuiet',
  custom: 'profileCustom',
}
const events = {
  pre_due: 'eventPreDue',
  due: 'eventDue',
  overdue_followup: 'eventOverdueFollowup',
  escalation: 'eventEscalation',
  daily_digest: 'eventDailyDigest',
  weekly_digest: 'eventWeeklyDigest',
}

const ToggleRow = ({ checked, description, disabled, onChange, title }) => (
  <Box sx={rowSx}>
    <Box sx={{ minWidth: 0 }}>
      <Typography level='title-sm'>{title}</Typography>
      <Typography level='body-sm' textColor='text.secondary' sx={{ mt: 0.5 }}>
        {description}
      </Typography>
    </Box>
    <Switch
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      color={checked ? 'primary' : 'neutral'}
      slotProps={{ input: { 'aria-label': title } }}
      sx={{ flexShrink: 0 }}
    />
  </Box>
)
ToggleRow.propTypes = {
  checked: PropTypes.bool.isRequired,
  description: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
}

const SectionHeading = ({ description, icon, title }) => (
  <Box sx={{ display: 'flex', gap: 1.25, mb: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ color: 'text.tertiary', display: 'flex', pt: 0.25 }}>{icon}</Box>
    <Box>
      <Typography
        level='title-md'
        sx={{ fontWeight: 650, letterSpacing: '-0.01em' }}
      >
        {title}
      </Typography>
      <Typography level='body-sm' textColor='text.secondary' sx={{ mt: 0.5 }}>
        {description}
      </Typography>
    </Box>
  </Box>
)
SectionHeading.propTypes = {
  description: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
}

const readPreference = async key => {
  const { value } = await Preferences.get({ key })
  return value ? JSON.parse(value) : {}
}

const NotificationSetting = () => {
  const { t } = useTranslation('settings')
  const { fmt } = useLocalization()
  const { showError, showSuccess, showWarning } = useNotification()
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile()
  const { data: deviceTokens, refetch: refetchDevices } = useDeviceTokens()
  const {
    data: notificationPreference,
    refetch: refetchNotificationPreference,
  } = useNotificationPreferences()
  const native = Capacitor.isNativePlatform()
  const [official] = useState(() => {
    try {
      return isOfficialDonetickInstanceSync()
    } catch {
      return false
    }
  })
  const [local, setLocal] = useState({ granted: false, dueNotification: true })
  const [push, setPush] = useState(false)
  const [currentDevice, setCurrentDevice] = useState(null)
  const [targetDraft, setTarget] = useState(null)
  const [chatIDDraft, setChatID] = useState(null)
  const target =
    targetDraft ?? String(userProfile?.notification_target?.type ?? 0)
  const chatID =
    chatIDDraft ?? String(userProfile?.notification_target?.target_id ?? '')
  const [error, setError] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [savingPreference, setSavingPreference] = useState(false)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [removingDevice, setRemovingDevice] = useState(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    readPreference('notificationPreferences')
      .then(value => setLocal(previous => ({ ...previous, ...value })))
      .catch(console.error)
    readPreference('pushNotificationPreferences')
      .then(value => setPush(Boolean(value.granted)))
      .catch(console.error)
    if (native) {
      Promise.all([Device.getInfo(), Device.getId()])
        .then(([info, id]) => {
          setCurrentDevice({
            id: id.identifier,
            model: info.model,
            platform: Capacitor.getPlatform(),
          })
        })
        .catch(console.error)
    }
  }, [native])

  useEffect(() => {
    const registered = () => {
      refetchDevices()
      showSuccess({ message: t('notifications.deviceRegistered') })
    }
    const failed = event => {
      const { error, status } = event.detail || {}
      showWarning({
        title: t(
          status === 409
            ? 'notifications.deviceLimitTitle'
            : 'notifications.registrationFailedTitle',
        ),
        message:
          status === 409
            ? t('notifications.deviceLimitMessage')
            : error || t('notifications.registrationFailedMessage'),
      })
    }
    window.addEventListener('deviceTokenRegistered', registered)
    window.addEventListener('deviceTokenRegistrationFailed', failed)
    return () => {
      window.removeEventListener('deviceTokenRegistered', registered)
      window.removeEventListener('deviceTokenRegistrationFailed', failed)
    }
  }, [refetchDevices, showSuccess, showWarning, t])

  const updateLocal = async changes => {
    const next = { ...local, ...changes }
    await Preferences.set({
      key: 'notificationPreferences',
      value: JSON.stringify(next),
    })
    setLocal(next)
  }

  const toggleLocal = async () => {
    setDeviceBusy(true)
    try {
      if (!local.granted) {
        const permission = await LocalNotifications.requestPermissions()
        if (permission.display !== 'granted') {
          showWarning({
            title: t('notifications.permissionDeniedTitle'),
            message: t('notifications.permissionDeniedMessage'),
          })
          return
        }
      }
      await updateLocal({ granted: !local.granted })
    } catch {
      showError({ message: t('notifications.preferenceUpdateFailed') })
    } finally {
      setDeviceBusy(false)
    }
  }

  const enablePush = async () => {
    if (
      (deviceTokens?.length ?? 0) >= 5 &&
      !deviceTokens?.some(device => device.deviceId === currentDevice?.id)
    ) {
      showWarning({
        title: t('notifications.deviceLimitTitle'),
        message: t('notifications.deviceLimitMessage'),
      })
      return
    }
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') {
      showWarning({
        title: t('notifications.permissionRequiredTitle'),
        message: t('notifications.permissionRequiredMessage'),
      })
      return
    }
    await registerPushNotifications()
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify({ granted: true }),
    })
    setPush(true)
  }

  const changePush = async (enabled = !push) => {
    setDeviceBusy(true)
    try {
      if (enabled) {
        await enablePush()
      } else {
        // Stop server delivery to this device as well as saving the local preference.
        if (
          deviceTokens?.some(device => device.deviceId === currentDevice?.id)
        ) {
          const response = await UnregisterDeviceToken(currentDevice.id, null)
          if (!response.ok) throw new Error('Unable to unregister device')
          await refetchDevices()
        }
        await Preferences.set({
          key: 'pushNotificationPreferences',
          value: JSON.stringify({ granted: false }),
        })
        setPush(false)
      }
    } catch {
      showError({
        message: t(
          enabled
            ? 'notifications.registerDeviceFailed'
            : 'notifications.unregisterFailed',
        ),
      })
    } finally {
      setDeviceBusy(false)
    }
  }

  const savePreference = async changes => {
    setSavingPreference(true)
    try {
      const response = await UpdateNotificationPreferences({
        profile: notificationPreference?.profile ?? 'balanced',
        overrides: notificationPreference?.overrides ?? {},
        digestHour: notificationPreference?.digestHour ?? 8,
        ...changes,
      })
      if (response.status !== 200) throw new Error('Unable to save preferences')
      await refetchNotificationPreference()
    } catch {
      showError({ message: t('notifications.preferenceUpdateFailed') })
    } finally {
      setSavingPreference(false)
    }
  }

  const saveTarget = async (disable = false) => {
    if (
      !disable &&
      target === '1' &&
      (!chatID.trim() || isNaN(chatID) || Number(chatID) === 0)
    ) {
      setError(
        t(
          chatID.trim()
            ? 'notifications.chatIdInvalid'
            : 'notifications.chatIdRequired',
        ),
      )
      return
    }
    if (!disable && target === '2' && !chatID.trim()) {
      setError(t('notifications.userKeyRequired'))
      return
    }
    setError('')
    setSavingTarget(true)
    try {
      const response = await UpdateNotificationTarget({
        target: disable ? '' : chatID.trim(),
        type: disable ? 0 : Number(target),
      })
      if (response.status !== 200) throw new Error(response.statusText)
      if (disable) {
        setTarget('0')
        setChatID('')
      }
      await refetchUserProfile()
      showSuccess({ message: t('notifications.targetUpdated') })
    } catch (error) {
      showError({
        message: t('notifications.targetUpdateFailed', {
          error: error.message,
        }),
      })
    } finally {
      setSavingTarget(false)
    }
  }

  const removeDevice = async device => {
    setRemovingDevice(device.deviceId)
    try {
      const response = await UnregisterDeviceToken(device.deviceId, null)
      if (!response.ok) throw new Error('Unable to unregister device')
      if (device.deviceId === currentDevice?.id) {
        await Preferences.set({
          key: 'pushNotificationPreferences',
          value: JSON.stringify({ granted: false }),
        })
        setPush(false)
      }
      await refetchDevices()
    } catch {
      showError({ message: t('notifications.unregisterFailed') })
    } finally {
      setRemovingDevice(null)
    }
  }

  const renderEvent = eventType => (
    <ToggleRow
      key={eventType}
      title={t(`notifications.${events[eventType]}Title`)}
      description={t(`notifications.${events[eventType]}Label`)}
      checked={Boolean(notificationPreference?.effective?.[eventType])}
      disabled={savingPreference || !notificationPreference}
      onChange={() =>
        savePreference({
          overrides: {
            ...notificationPreference?.overrides,
            [eventType]: !notificationPreference?.effective?.[eventType],
          },
        })
      }
    />
  )
  const registered = deviceTokens?.some(
    device => device.deviceId === currentDevice?.id,
  )

  return (
    <SettingsLayout title={t('notifications.title')}>
      <Box id='notifications' sx={{ maxWidth: 720, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ mt: -1, mb: 3, maxWidth: 600, textWrap: 'pretty' }}
        >
          {t('notifications.description')}
        </Typography>

        <Box component='section' sx={{ mb: 3.5 }}>
          <SectionHeading
            icon={<TuneRounded />}
            title={t('notifications.preferenceSection')}
            description={t('notifications.preferenceSectionDescription')}
          />
          <Sheet sx={{ ...surfaceSx, mb: 2 }}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'primary.softBg' }}>
              <FormControl
                disabled={savingPreference || !notificationPreference}
              >
                <FormLabel>{t('notifications.profileLabel')}</FormLabel>
                <Select
                  value={notificationPreference?.profile ?? 'balanced'}
                  onChange={(_, profile) =>
                    profile && savePreference({ profile })
                  }
                  sx={{ bgcolor: 'background.surface', mt: 0.5 }}
                >
                  {Object.entries(profiles).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {t(`notifications.${label}`)}
                    </Option>
                  ))}
                </Select>
                <FormHelperText sx={{ mt: 1 }}>
                  {t('notifications.profileHelper')}
                </FormHelperText>
              </FormControl>
            </Box>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2 }}>
              <Typography
                level='body-xs'
                textColor='text.tertiary'
                sx={{
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t('notifications.taskReminders')}
              </Typography>
            </Box>
            {['pre_due', 'due', 'overdue_followup', 'escalation'].map(
              (eventType, index) => (
                <Box key={eventType}>
                  {index > 0 && <Divider sx={{ mx: { xs: 2, sm: 2.5 } }} />}
                  {renderEvent(eventType)}
                </Box>
              ),
            )}
          </Sheet>
          <Sheet sx={surfaceSx}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2 }}>
              <Typography
                level='body-xs'
                textColor='text.tertiary'
                sx={{
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t('notifications.summaries')}
              </Typography>
            </Box>
            {renderEvent('daily_digest')}
            <Divider sx={{ mx: { xs: 2, sm: 2.5 } }} />
            {renderEvent('weekly_digest')}
            <Divider />
            <Box
              sx={{ ...rowSx, bgcolor: 'background.level1', flexWrap: 'wrap' }}
            >
              <Box sx={{ display: 'flex', gap: 1.25, flex: '1 1 220px' }}>
                <AccessTimeRounded
                  sx={{ fontSize: 20, color: 'text.tertiary', mt: 0.25 }}
                />
                <Box>
                  <Typography level='title-sm' id='digest-time-label'>
                    {t('notifications.digestHourLabel')}
                  </Typography>
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    sx={{ mt: 0.5 }}
                  >
                    {t('notifications.digestHourHelper')}
                  </Typography>
                </Box>
              </Box>
              <Select
                aria-labelledby='digest-time-label'
                value={notificationPreference?.digestHour ?? 8}
                disabled={savingPreference || !notificationPreference}
                onChange={(_, hour) =>
                  hour !== null && savePreference({ digestHour: Number(hour) })
                }
                sx={{ minWidth: 112 }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <Option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </Option>
                ))}
              </Select>
            </Box>
          </Sheet>
        </Box>

        <Box component='section' sx={{ mb: 3.5 }}>
          <SectionHeading
            icon={<NotificationsNoneRounded />}
            title={t('notifications.deliveryTitle')}
            description={t('notifications.deliveryDescription')}
          />
          <Sheet sx={surfaceSx}>
            <ToggleRow
              title={t('notifications.deviceLabel')}
              description={t(
                native
                  ? 'notifications.deviceHelper'
                  : 'notifications.mobileOnly',
              )}
              checked={Boolean(local.granted)}
              disabled={!native || deviceBusy}
              onChange={toggleLocal}
            />
            {local.granted && native && (
              <Box
                sx={{
                  mx: { xs: 2, sm: 2.5 },
                  mb: 2,
                  borderRadius: 'lg',
                  bgcolor: 'background.level1',
                }}
              >
                {[
                  ['dueNotification', 'due'],
                  ['preDueNotification', 'preDue'],
                  ['naggingNotification', 'overdue'],
                ].map(([property, label]) => (
                  <ToggleRow
                    key={property}
                    title={t(`notifications.${label}Title`)}
                    description={t(`notifications.${label}Label`)}
                    checked={Boolean(local[property])}
                    onChange={() =>
                      updateLocal({ [property]: !local[property] }).catch(() =>
                        showError({
                          message: t('notifications.preferenceUpdateFailed'),
                        }),
                      )
                    }
                  />
                ))}
              </Box>
            )}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
              <Button
                variant='outlined'
                color='neutral'
                size='sm'
                startDecorator={<SendRounded />}
                disabled={!native || !local.granted}
                loading={testing}
                onClick={async () => {
                  setTesting(true)
                  try {
                    await LocalNotifications.schedule({
                      notifications: [
                        {
                          title: t('notifications.testNotification'),
                          body: t('notifications.testNotificationBody'),
                          id: 1,
                          schedule: { at: new Date(Date.now() + 2000) },
                        },
                      ],
                    })
                  } catch {
                    showError({ message: t('notifications.testFailed') })
                  } finally {
                    setTesting(false)
                  }
                }}
              >
                {t('notifications.testNotification')}
              </Button>
            </Box>
            {official && (
              <>
                <Divider />
                <ToggleRow
                  title={t('notifications.pushLabel')}
                  description={t(
                    native
                      ? 'notifications.pushHelper'
                      : 'notifications.mobileOnly',
                  )}
                  checked={push}
                  disabled={!native || deviceBusy}
                  onChange={() => changePush()}
                />
              </>
            )}
          </Sheet>
        </Box>

        <Box component='section' sx={{ mb: 3.5 }}>
          <SectionHeading
            icon={<LinkRounded />}
            title={t('notifications.customSection')}
            description={t('notifications.customSectionDescription')}
          />
          <Sheet sx={surfaceSx}>
            <ToggleRow
              title={t('notifications.customLabel')}
              description={t('notifications.customHelper')}
              checked={target !== '0'}
              disabled={savingTarget || !userProfile}
              onChange={() =>
                target !== '0' ? saveTarget(true) : setTarget('1')
              }
            />
            {target !== '0' && (
              <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
                <Divider sx={{ mb: 2 }} />
                <Box
                  component='form'
                  onSubmit={event => {
                    event.preventDefault()
                    saveTarget()
                  }}
                  sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  <FormControl disabled={savingTarget}>
                    <FormLabel>{t('notifications.serviceLabel')}</FormLabel>
                    <Select
                      value={target}
                      onChange={(_, value) => {
                        if (value) {
                          setTarget(value)
                          setChatID('')
                          setError('')
                        }
                      }}
                    >
                      <Option value='1'>
                        {t('notifications.targetTelegram')}
                      </Option>
                      <Option value='2'>
                        {t('notifications.targetPushover')}
                      </Option>
                      <Option value='3'>
                        {t('notifications.targetWebhooks')}
                      </Option>
                    </Select>
                  </FormControl>
                  {target === '1' && (
                    <Typography level='body-sm' textColor='text.secondary'>
                      {t('notifications.telegramBotHelpBefore')}{' '}
                      <Link
                        href='https://t.me/DonetickBot'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {t('notifications.clickHere')}
                      </Link>{' '}
                      {t('notifications.telegramBotHelpAfter')}
                    </Typography>
                  )}
                  {(target === '1' || target === '2') && (
                    <FormControl error={Boolean(error)} disabled={savingTarget}>
                      <FormLabel>
                        {t(
                          target === '1'
                            ? 'notifications.chatId'
                            : 'notifications.userKey',
                        )}
                      </FormLabel>
                      <Input
                        value={chatID}
                        onChange={event => {
                          setChatID(event.target.value)
                          setError('')
                        }}
                        placeholder={t(
                          target === '1'
                            ? 'notifications.chatIdPlaceholder'
                            : 'notifications.userKeyPlaceholder',
                        )}
                      />
                      {error && <FormHelperText>{error}</FormHelperText>}
                      {target === '1' && (
                        <FormHelperText sx={{ display: 'block' }}>
                          {t('notifications.telegramChatIdHelpBefore')}{' '}
                          <Link
                            href='https://t.me/userinfobot'
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {t('notifications.clickHere')}
                          </Link>{' '}
                          {t('notifications.telegramChatIdHelpAfter')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                  <Button
                    type='submit'
                    loading={savingTarget}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
                  >
                    {t('common.save')}
                  </Button>
                </Box>
              </Box>
            )}
          </Sheet>
        </Box>

        {official && (
          <Box component='section'>
            <SectionHeading
              icon={<SmartphoneRounded />}
              title={t('notifications.registeredDevices', {
                count: deviceTokens?.length ?? 0,
              })}
              description={t('notifications.registeredDevicesDescription')}
            />
            <Sheet sx={surfaceSx}>
              {native && currentDevice && deviceTokens && !registered && (
                <Box
                  sx={{ ...rowSx, bgcolor: 'primary.softBg', flexWrap: 'wrap' }}
                >
                  <Box sx={{ flex: '1 1 200px' }}>
                    <Typography level='title-sm'>
                      {t('notifications.currentDevice', {
                        platform:
                          currentDevice.platform === 'ios' ? 'iOS' : 'Android',
                        model: currentDevice.model,
                      })}
                    </Typography>
                    <Typography
                      level='body-sm'
                      textColor='text.secondary'
                      sx={{ mt: 0.5 }}
                    >
                      {t('notifications.currentDeviceNotRegistered')}
                    </Typography>
                  </Box>
                  <Button
                    size='sm'
                    loading={deviceBusy}
                    disabled={deviceTokens.length >= 5}
                    onClick={() => changePush(true)}
                  >
                    {t(
                      deviceTokens.length >= 5
                        ? 'notifications.limitReached'
                        : 'notifications.registerDevice',
                    )}
                  </Button>
                </Box>
              )}
              {deviceTokens?.length ? (
                deviceTokens.map((device, index) => (
                  <Box key={device.id}>
                    {index > 0 && <Divider sx={{ mx: { xs: 2, sm: 2.5 } }} />}
                    <Box sx={{ ...rowSx, flexWrap: 'wrap' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          minWidth: 0,
                          flex: '1 1 200px',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: 'lg',
                            bgcolor: 'background.level1',
                            color: 'text.secondary',
                          }}
                        >
                          {device.platform === 'ios' ? <Apple /> : <Android />}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            level='title-sm'
                            sx={{ overflowWrap: 'anywhere' }}
                          >
                            {device.deviceModel ||
                              `${device.platform === 'ios' ? 'iOS' : 'Android'} ${t('notifications.unknownDevice')}`}
                          </Typography>
                          {device.deviceId === currentDevice?.id && (
                            <Chip
                              size='sm'
                              variant='soft'
                              color='primary'
                              sx={{ mt: 0.5 }}
                            >
                              {t('notifications.thisDevice')}
                            </Chip>
                          )}
                          {device.createdAt && (
                            <Typography
                              level='body-xs'
                              textColor='text.tertiary'
                              sx={{ mt: 0.5 }}
                            >
                              {t('notifications.deviceCreatedAt', {
                                date: fmt.date(device.createdAt),
                              })}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant='plain'
                        color='danger'
                        size='sm'
                        loading={removingDevice === device.deviceId}
                        disabled={removingDevice !== null}
                        onClick={() => removeDevice(device)}
                        aria-label={`${t('common.remove')} ${device.deviceModel || device.platform}`}
                      >
                        {t('common.remove')}
                      </Button>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <SmartphoneRounded
                    sx={{ fontSize: 32, color: 'text.tertiary', mb: 1 }}
                  />
                  <Typography level='body-sm' textColor='text.secondary'>
                    {t('notifications.noDevices')}
                  </Typography>
                </Box>
              )}
            </Sheet>
          </Box>
        )}
      </Box>
    </SettingsLayout>
  )
}

export default NotificationSetting
