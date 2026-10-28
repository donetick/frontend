import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import {
  AccessTimeRounded,
  Android,
  Apple,
  ExpandMoreRounded,
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
  Option,
  Select,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  registerPushNotifications,
  unregisterPushNotifications,
} from '../../CapacitorListener'
import { useLocalization } from '../../contexts/LocalizationContext'
import {
  useDeviceTokens,
  useNotificationPreferences,
} from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { getAppVersion, getStableDeviceId } from '../../utils/DeviceInfo'
import { isOfficialDonetickInstanceSync } from '../../utils/FeatureToggle'
import {
  UnregisterDeviceToken,
  UpdateNotificationPreferences,
} from '../../utils/Fetcher'
import SettingsLayout from './SettingsLayout'
import SettingsLinks from './SettingsLinks'

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
// Adding an event type means adding it to the group it belongs to, and nowhere
// else: the toggle list, the `events` label map and the profile summary line
// are all derived from this.
const eventGroups = [
  {
    label: 'taskReminders',
    events: [
      ['on_assignment', 'eventOnAssignment'],
      ['pre_due', 'eventPreDue'],
      ['due', 'eventDue'],
      // Only ever gates after-due reminders the user added to a task directly
      // (the backend has no standalone recurring overdue job) -- any priority.
      ['overdue_followup', 'eventOverdueFollowup'],
    ],
  },
  {
    label: 'approvals',
    events: [
      ['on_pending_approval', 'eventOnPendingApproval'],
      ['on_redemption_request', 'eventOnRedemptionRequest'],
    ],
  },
  {
    label: 'summaries',
    events: [
      ['daily_digest', 'eventDailyDigest'],
      ['weekly_digest', 'eventWeeklyDigest'],
    ],
  },
]
const events = Object.fromEntries(eventGroups.flatMap(group => group.events))
// The send-hour only means something while one of these is on.
const digestEvents = ['daily_digest', 'weekly_digest']

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
        component='h3'
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

const groupLabelSx = {
  fontWeight: 650,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

// A labelled run of toggles. The label is what ties the rows together, so it is
// wired to the group for screen readers instead of being visual-only.
const EventGroup = ({ children, label }) => {
  const labelId = useId()
  return (
    <Box role='group' aria-labelledby={labelId}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2 }}>
        <Typography
          id={labelId}
          level='body-xs'
          textColor='text.tertiary'
          sx={groupLabelSx}
        >
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}
EventGroup.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
}

const readPreference = async key => {
  const { value } = await Preferences.get({ key })
  return value ? JSON.parse(value) : {}
}

const NotificationSetting = () => {
  const { i18n, t } = useTranslation('settings')
  const { fmt } = useLocalization()
  const { showError, showSuccess, showWarning } = useNotification()
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
  const [local, setLocal] = useState({ granted: false })
  const [push, setPush] = useState(false)
  const [currentDevice, setCurrentDevice] = useState(null)
  const [savingPreference, setSavingPreference] = useState(false)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [removingDevice, setRemovingDevice] = useState(null)
  const [testing, setTesting] = useState(false)
  const [fineTuneToggled, setFineTuneToggled] = useState(null)

  useEffect(() => {
    readPreference('notificationPreferences')
      .then(value => setLocal(previous => ({ ...previous, ...value })))
      .catch(console.error)
    readPreference('pushNotificationPreferences')
      .then(value => setPush(Boolean(value.granted)))
      .catch(console.error)
    if (native) {
      // Must be the same helper the registration path uses, or "this
      // device" never matches a row in the registered list.
      Promise.all([Device.getInfo(), getStableDeviceId(), getAppVersion()])
        .then(([info, id, appVersion]) => {
          setCurrentDevice({
            id,
            model: info.model,
            platform: Capacitor.getPlatform(),
            appVersion,
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

  const profile = notificationPreference?.profile ?? 'balanced'
  const effective = notificationPreference?.effective
  const overrideCount = Object.keys(
    notificationPreference?.overrides ?? {},
  ).length
  // Custom *is* the per-event set, so the toggles are the whole point of it and
  // the disclosure starts open there. Derived rather than an effect so an
  // explicit open/close still wins afterwards.
  const fineTuneOpen = fineTuneToggled ?? profile === 'custom'

  const digestOn = digestEvents.some(eventType => effective?.[eventType])
  // The hour is stored as a plain 0-23 local hour; render it through the user's
  // own 12h/24h preference rather than hardcoding "HH:00".
  const digestHourLabel = hour => fmt.time(new Date(2000, 0, 1, hour))
  // Profiles differ in ways a single helper line can't convey, so say what the
  // current mix actually turns on instead of describing the concept.
  const enabledSummary = () => {
    if (!effective) return t('notifications.profileSummaryLoading')
    const enabled = Object.keys(events)
      .filter(eventType => effective[eventType])
      .map(eventType => t(`notifications.${events[eventType]}Short`))
    if (enabled.length === 0) return t('notifications.profileSummaryMuted')
    const list =
      typeof Intl.ListFormat === 'function'
        ? new Intl.ListFormat(i18n.language, {
            style: 'long',
            type: 'conjunction',
          }).format(enabled)
        : enabled.join(', ')
    return digestOn
      ? t('notifications.profileSummaryWithDigest', {
          list,
          time: digestHourLabel(notificationPreference.digestHour ?? 8),
        })
      : t('notifications.profileSummary', { list })
  }

  const updateLocal = async changes => {
    const next = { ...local, ...changes }
    await Preferences.set({
      key: 'notificationPreferences',
      value: JSON.stringify(next),
    })
    setLocal(next)
  }

  // Resolves to whether this device ended up opted in, so the combined switch
  // can tell "the user declined push" apart from "push broke" — a refusal is
  // the user's answer and must not read as a failure.
  const enablePush = async () => {
    if (
      (deviceTokens?.length ?? 0) >= 5 &&
      !deviceTokens?.some(device => device.deviceId === currentDevice?.id)
    ) {
      showWarning({
        title: t('notifications.deviceLimitTitle'),
        message: t('notifications.deviceLimitMessage'),
      })
      return false
    }
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') {
      showWarning({
        title: t('notifications.permissionRequiredTitle'),
        message: t('notifications.permissionRequiredMessage'),
      })
      return false
    }
    // force: explicit opt-in must reach the server even if a stale local
    // registration record still matches the current token.
    await registerPushNotifications({ force: true })
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify({ granted: true }),
    })
    setPush(true)
    return true
  }

  const disablePush = async () => {
    // Stop server delivery to this device as well as saving the local preference.
    if (deviceTokens?.some(device => device.deviceId === currentDevice?.id)) {
      // unregisterPushNotifications also halts the native registration
      // state machine, not just the server row — a direct
      // UnregisterDeviceToken call here left the retry/registration
      // listeners live and the device re-registered itself shortly after.
      const removed = await unregisterPushNotifications()
      if (!removed) throw new Error('Unable to unregister device')
      await refetchDevices()
    }
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify({ granted: false }),
    })
    setPush(false)
  }

  const changePush = async (enabled = !push) => {
    setDeviceBusy(true)
    try {
      if (enabled) {
        await enablePush()
      } else {
        await disablePush()
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

  // One switch for both transports: on-device reminders and (on the official
  // instance) push are the same promise to a user — "tell me about my tasks" —
  // and two toggles only ever asked them to understand our delivery plumbing.
  // The local grant is the master, so push failing or being declined leaves
  // reminders working rather than silently rolling the whole switch back.
  const toggleNotifications = async () => {
    setDeviceBusy(true)
    try {
      if (local.granted) {
        if (official) await disablePush()
        await updateLocal({ granted: false })
        return
      }
      const permission = await LocalNotifications.requestPermissions()
      if (permission.display !== 'granted') {
        showWarning({
          title: t('notifications.permissionDeniedTitle'),
          message: t('notifications.permissionDeniedMessage'),
        })
        return
      }
      // optOut clears the launch-time snackbar too: having answered here is
      // answering the same question it asks.
      await updateLocal({ granted: true, optOut: false })
      if (official) {
        try {
          await enablePush()
        } catch {
          showWarning({
            title: t('notifications.registrationFailedTitle'),
            message: t('notifications.pushOnlyFailed'),
          })
        }
      }
    } catch {
      showError({ message: t('notifications.preferenceUpdateFailed') })
    } finally {
      setDeviceBusy(false)
    }
  }

  const savePreference = async changes => {
    setSavingPreference(true)
    try {
      const response = await UpdateNotificationPreferences({
        profile,
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

  const changeProfile = next => {
    if (!next || next === profile) return
    // Custom has no defaults of its own: the server resolves it from overrides
    // alone, so posting it bare would mute every event type in one tap. Seed it
    // with the mix currently in effect so "Custom" means "start from here".
    savePreference(
      next === 'custom'
        ? { profile: next, overrides: { ...effective } }
        : { profile: next, overrides: {} },
    )
  }

  // Overrides are stored sparsely against the profile's defaults, so clearing
  // them is what puts the user back on the profile they picked.
  const resetToProfile = () => savePreference({ overrides: {} })

  const removeDevice = async device => {
    setRemovingDevice(device.deviceId)
    try {
      const isCurrentDevice = device.deviceId === currentDevice?.id
      // unregisterPushNotifications also halts the native registration state
      // machine and persists the opt-out, which a direct UnregisterDeviceToken
      // call on the current device would not do.
      const removed = isCurrentDevice
        ? await unregisterPushNotifications()
        : (await UnregisterDeviceToken(device.deviceId, null)).ok
      if (!removed) throw new Error('Unable to unregister device')
      if (isCurrentDevice) setPush(false)
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
      checked={Boolean(effective?.[eventType])}
      disabled={savingPreference || !notificationPreference}
      onChange={() =>
        savePreference({
          overrides: {
            ...notificationPreference?.overrides,
            [eventType]: !effective?.[eventType],
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

        {/* The gate comes before the detail: tuning a profile above a switch
            that is off is how a user ends up with carefully chosen silence.
            It stays its own card because it is the only device-scoped control
            here — the preferences below are account-wide and still govern
            Telegram, Pushover and webhooks with this device switched off. */}
        <Box component='section' sx={{ mb: 3.5 }}>
          <SectionHeading
            icon={<NotificationsNoneRounded />}
            title={t('notifications.deliveryTitle')}
            description={t('notifications.deliveryDescription')}
          />
          <Sheet sx={surfaceSx}>
            <ToggleRow
              title={t('notifications.enableLabel')}
              description={t(
                !native
                  ? 'notifications.mobileOnly'
                  : official
                    ? 'notifications.enableHelper'
                    : 'notifications.enableHelperLocal',
              )}
              checked={Boolean(local.granted)}
              disabled={!native || deviceBusy}
              onChange={toggleNotifications}
            />
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
            {/* No push toggle: the master switch above owns it. When it is on
                but this device isn't reachable, the registered-devices section
                below is the one place that says so and offers the fix. */}
          </Sheet>
        </Box>

        <Box component='section' sx={{ mb: 3.5 }}>
          <SectionHeading
            icon={<TuneRounded />}
            title={t('notifications.preferenceSection')}
            description={t('notifications.preferenceSectionDescription')}
          />
          <Sheet sx={surfaceSx}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'primary.softBg' }}>
              <FormControl
                disabled={savingPreference || !notificationPreference}
              >
                <FormLabel>{t('notifications.profileLabel')}</FormLabel>
                <Select
                  value={profile}
                  onChange={(_, next) => changeProfile(next)}
                  sx={{ bgcolor: 'background.surface', mt: 0.5 }}
                >
                  {Object.entries(profiles).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {t(`notifications.${label}`)}
                    </Option>
                  ))}
                </Select>
                <FormHelperText sx={{ mt: 1, display: 'block' }}>
                  {enabledSummary()}
                </FormHelperText>
              </FormControl>
              {/* Overrides live alongside the profile rather than switching it
                  to Custom, so without this the select keeps reading
                  "Balanced" over a mix the user edited themselves. */}
              {overrideCount > 0 && profile !== 'custom' && (
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    mt: 1.5,
                  }}
                >
                  <Chip size='sm' variant='soft' color='primary'>
                    {t('notifications.profileCustomized', {
                      count: overrideCount,
                    })}
                  </Chip>
                  <Button
                    size='sm'
                    variant='plain'
                    disabled={savingPreference}
                    onClick={resetToProfile}
                  >
                    {t('notifications.resetToProfile', {
                      profile: t(`notifications.${profiles[profile]}`),
                    })}
                  </Button>
                </Box>
              )}
            </Box>
            <Divider />
            {/* Nine toggles is the rare case, not the default one: the profile
                above is the answer for most people. */}
            <Button
              variant='plain'
              color='neutral'
              onClick={() => setFineTuneToggled(!fineTuneOpen)}
              aria-expanded={fineTuneOpen}
              aria-controls='notification-fine-tune'
              endDecorator={
                <ExpandMoreRounded
                  sx={{
                    transform: fineTuneOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                    },
                  }}
                />
              }
              sx={{
                borderRadius: 0,
                justifyContent: 'space-between',
                px: { xs: 2, sm: 2.5 },
                py: 1.75,
                width: '100%',
              }}
            >
              {t('notifications.fineTune')}
            </Button>
            {fineTuneOpen && (
              <Box id='notification-fine-tune'>
                {eventGroups.map(group => (
                  <Box key={group.label}>
                    <Divider />
                    {/* Approvals only ever fire for admins and managers, but
                        the preference is per-user and roles change, so the
                        toggles don't appear and disappear with a role. */}
                    <EventGroup label={t(`notifications.${group.label}`)}>
                      {group.events.map(([eventType], index) => (
                        <Box key={eventType}>
                          {index > 0 && (
                            <Divider sx={{ mx: { xs: 2, sm: 2.5 } }} />
                          )}
                          {renderEvent(eventType)}
                        </Box>
                      ))}
                    </EventGroup>
                  </Box>
                ))}
              </Box>
            )}
            {digestOn && (
              <>
                <Divider />
                <Box
                  sx={{
                    ...rowSx,
                    bgcolor: 'background.level1',
                    flexWrap: 'wrap',
                  }}
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
                      hour !== null &&
                      savePreference({ digestHour: Number(hour) })
                    }
                    sx={{ minWidth: 112 }}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <Option key={hour} value={hour}>
                        {digestHourLabel(hour)}
                      </Option>
                    ))}
                  </Select>
                </Box>
              </>
            )}
          </Sheet>
        </Box>

        <Box sx={{ mb: 3.5 }}>
          <SettingsLinks ids={['notification-integrations']} />
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
