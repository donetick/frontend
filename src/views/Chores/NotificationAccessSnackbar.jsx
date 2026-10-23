import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { Button, Snackbar, Stack, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { registerPushNotifications } from '../../CapacitorListener'

const NotificationAccessSnackbar = () => {
  const { t } = useTranslation('chores')
  const [open, setOpen] = useState(false)

  // Define the function outside of useEffect
  const readPreferences = async key => {
    const ret = await Preferences.get({ key })
    try {
      return JSON.parse(ret.value) || {}
    } catch {
      return {}
    }
  }

  useEffect(() => {
    // Only run the effect on native platforms
    if (!Capacitor.isNativePlatform()) return

    const run = async () => {
      const [localPrefs, pushPrefs] = await Promise.all([
        readPreferences('notificationPreferences'),
        readPreferences('pushNotificationPreferences'),
      ])

      // This is the only launch-time path that re-attaches the native push
      // listeners, and it must key off the *push* preference: FCM tokens
      // rotate (reinstall, cleared data, backup restore, FCM's own refresh)
      // and a rotation is only observed while a `registration` listener is
      // attached. Gating this on `notificationPreferences` — the separate
      // local-notification grant — meant push users who never answered the
      // snackbar below silently stopped receiving pushes after their first
      // rotation, and signed-out users whose local grant was still true got
      // re-registered against their wishes.
      // Migrate pre-push-preference installs without overriding an explicit opt-out.
      if (pushPrefs.granted === undefined && localPrefs.granted === true) {
        pushPrefs.granted = true
        await Preferences.set({
          key: 'pushNotificationPreferences',
          value: JSON.stringify(pushPrefs),
        })
      }
      if (pushPrefs?.granted === true) {
        await registerPushNotifications().catch(error =>
          console.error('Error registering push notifications:', error),
        )
      }

      // if optOut is true then don't show the snackbar
      if (localPrefs?.optOut === true || localPrefs?.granted === true) return
      setOpen(true)
    }

    run()
  }, [])

  // Return early if not on a native platform
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  return (
    <Snackbar
      // autoHideDuration={5000}
      variant='solid'
      color='primary'
      size='lg'
      invertedColors
      open={open}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={theme => ({
        background: `linear-gradient(45deg, ${theme.palette.primary[600]} 30%, ${theme.palette.primary[500]} 90%})`,
        maxWidth: 360,
      })}
    >
      <div>
        <Typography level='title-lg'>{t('notifications.needTitle')}</Typography>
        <Typography sx={{ mt: 1, mb: 2 }}>
          {t('notifications.needBody')}
        </Typography>
        <Stack direction='row' spacing={1}>
          <Button
            variant='solid'
            color='primary'
            onClick={async () => {
              const notificationPreferences = { optOut: false }
              try {
                const resp = await LocalNotifications.requestPermissions()
                if (resp.display === 'granted') {
                  notificationPreferences['granted'] = true
                  // Register for push notifications after local permission is
                  // granted, and record it under the push key too — the
                  // launch-time re-registration above reads that key, so
                  // leaving it unset here meant opting in through this
                  // snackbar never survived a token rotation.
                  await registerPushNotifications({ force: true })
                  await Preferences.set({
                    key: 'pushNotificationPreferences',
                    value: JSON.stringify({ granted: true }),
                  })
                }
              } catch (error) {
                console.error('Error setting up notifications:', error)
              }

              await Preferences.set({
                key: 'notificationPreferences',
                value: JSON.stringify(notificationPreferences),
              })
              setOpen(false)
            }}
          >
            {t('common:yes')}
          </Button>
          <Button
            variant='outlined'
            color='primary'
            onClick={() => {
              const notificationPreferences = { optOut: true }
              Preferences.set({
                key: 'notificationPreferences',
                value: JSON.stringify(notificationPreferences),
              })
              setOpen(false)
            }}
          >
            {t('notifications.keepDisabled')}
          </Button>
        </Stack>
      </div>
    </Snackbar>
  )
}

export default NotificationAccessSnackbar
