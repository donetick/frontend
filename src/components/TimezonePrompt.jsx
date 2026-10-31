import { AccessTimeRounded, CheckCircleRounded } from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormLabel,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useUserProfile } from '../queries/UserQueries'
import { useNotification } from '../service/NotificationProvider'
import { UpdateUserDetails } from '../utils/Fetcher'
import {
  detectTimezone,
  getTimezones,
  needsTimezoneUpdate,
  TIMEZONE_SNOOZE_MS,
  timezoneLabel,
  timezonePromptKey,
} from '../utils/timezone'
import { authButtonSx } from '../views/Authorization/authStyles'
import AppModal from './common/AppModal'

// Do not interrupt sign-in, onboarding, or someone already editing their profile.
const excludedRoute = pathname =>
  /^\/(onboarding|get-started|login|signup|auth|circle-setup|ready|heard-about|settings)(\/|$)/.test(
    pathname,
  )

const TimezonePrompt = () => {
  const { t } = useTranslation('settings')
  const { pathname } = useLocation()
  const { data: profile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showSuccess } = useNotification()
  const [detected, setDetected] = useState(detectTimezone)
  const [selection, setSelection] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [dismissed, setDismissed] = useState({})
  const savingRef = useRef(false)
  const [checkTime, setCheckTime] = useState(Date.now)

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'hidden' || savingRef.current) return
      setDetected(detectTimezone())
      setCheckTime(Date.now())
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    const interval = window.setInterval(check, 60_000)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(interval)
    }
  }, [])

  const key = timezonePromptKey(profile?.id, profile?.timezone, detected)
  const selected = selection?.key === key ? selection.value : detected

  let snoozedUntil = dismissed[key] || 0
  try {
    snoozedUntil = Math.max(
      snoozedUntil,
      Number(localStorage.getItem(key)) || 0,
    )
  } catch {
    // The in-memory snooze still works if browser storage is unavailable.
  }
  const open = Boolean(
    localStorage.getItem('token') &&
    profile?.id &&
    !excludedRoute(pathname) &&
    needsTimezoneUpdate(profile.timezone, detected) &&
    checkTime >= snoozedUntil,
  )

  const dismiss = () => {
    if (savingRef.current) return
    const until = Date.now() + TIMEZONE_SNOOZE_MS
    setDismissed(previous => ({ ...previous, [key]: until }))
    try {
      localStorage.setItem(key, String(until))
    } catch {
      // Storage is optional.
    }
  }

  const save = async () => {
    if (!selected || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(false)
    try {
      // Match ProfileSettings' payload, preserving the existing display name.
      const response = await UpdateUserDetails({
        displayName: profile.displayName,
        timezone: selected,
      })
      if (!response.ok) throw new Error('Timezone update failed')
      // Update immediately, including when a subsequent refetch is offline.
      queryClient.setQueryData(
        ['userProfile', localStorage.getItem('token')],
        previous => (previous ? { ...previous, timezone: selected } : previous),
      )
      setDismissed(previous => ({
        ...previous,
        [key]: Date.now() + TIMEZONE_SNOOZE_MS,
      }))
      void queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      showSuccess({
        title: t('timezonePrompt.success'),
        message: t('timezonePrompt.successMessage'),
      })
    } catch {
      setError(key)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={dismiss}
      size='sm'
      showCloseButton={false}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      aria-label={t(
        profile?.timezone
          ? 'timezonePrompt.title'
          : 'timezonePrompt.missingTitle',
      )}
      aria-describedby='timezone-prompt-description'
      contentSx={{ pt: 4, textAlign: 'center' }}
    >
      <Box
        aria-hidden='true'
        sx={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 3,
          borderRadius: '50%',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          color: 'primary.plainColor',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: 'primary.softBg',
            opacity: 0.6,
            filter: 'blur(28px)',
            zIndex: -1,
          },
        }}
      >
        <AccessTimeRounded sx={{ fontSize: 34 }} />
      </Box>
      <Typography
        level='h2'
        sx={{
          fontSize: '1.75rem',
          letterSpacing: '-0.02em',
          textWrap: 'balance',
          mb: 1.5,
        }}
      >
        {t(
          profile?.timezone
            ? 'timezonePrompt.title'
            : 'timezonePrompt.missingTitle',
        )}
      </Typography>
      <Typography
        id='timezone-prompt-description'
        level='body-md'
        textColor='text.secondary'
        sx={{ textWrap: 'pretty', mb: 3 }}
      >
        {t(
          profile?.timezone
            ? 'timezonePrompt.description'
            : 'timezonePrompt.missingDescription',
        )}
      </Typography>
      {profile?.timezone && (
        <Typography level='body-sm' textColor='text.secondary' sx={{ mb: 2 }}>
          {t('timezonePrompt.current', {
            timezone: profile.timezone.replace(/_/g, ' '),
          })}
        </Typography>
      )}
      <FormControl sx={{ textAlign: 'start', mb: 2 }}>
        <FormLabel>{t('profile.timezone')}</FormLabel>
        <Autocomplete
          value={selected}
          onChange={(_, value) => setSelection({ key, value })}
          options={getTimezones(detected, profile?.timezone)}
          getOptionLabel={timezoneLabel}
          disabled={saving}
          disableClearable
          size='lg'
          startDecorator={<AccessTimeRounded />}
        />
      </FormControl>
      <Typography level='body-xs' textColor='text.tertiary' sx={{ mb: 3 }}>
        {t('timezonePrompt.detected', {
          timezone: detected?.replace(/_/g, ' '),
        })}
      </Typography>
      {error === key && (
        <Alert color='danger' role='alert' sx={{ mb: 2, textAlign: 'start' }}>
          {t('timezonePrompt.error')}
        </Alert>
      )}
      <Button
        fullWidth
        size='lg'
        sx={authButtonSx}
        loading={saving}
        disabled={!selected}
        onClick={save}
      >
        {t(
          profile?.timezone
            ? 'timezonePrompt.update'
            : 'timezonePrompt.confirm',
        )}
      </Button>
      <Button
        fullWidth
        variant='plain'
        color='neutral'
        disabled={saving}
        onClick={dismiss}
        sx={{ mt: 1 }}
      >
        {t('timezonePrompt.later')}
      </Button>
      <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 1 }}>
        {t('timezonePrompt.settingsHint')}
      </Typography>
    </AppModal>
  )
}

export default TimezonePrompt
