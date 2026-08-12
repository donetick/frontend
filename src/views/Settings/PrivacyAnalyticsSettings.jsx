import { Box, FormControl, FormHelperText, Switch, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getConsent, initialize, setConsent } from '../../analytics'
import SettingsLayout from './SettingsLayout'

const TOGGLES = [
  {
    kind: 'analytics',
    labelKey: 'analyticsToggle',
    helperKey: 'analyticsHelper',
  },
  { kind: 'crash', labelKey: 'crashToggle', helperKey: 'crashHelper' },
]

const PrivacyAnalyticsSettings = () => {
  const { t } = useTranslation('settings')
  const [consent, setConsentState] = useState({
    analytics: 'disabled',
    crash: 'disabled',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    initialize().then(() => {
      if (cancelled) return
      setConsentState({
        analytics: getConsent('analytics'),
        crash: getConsent('crash'),
      })
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = kind => async event => {
    const next = event.target.checked ? 'enabled' : 'disabled'
    setConsentState(current => ({ ...current, [kind]: next }))
    await setConsent(kind, next, { source: 'settings' })
  }

  return (
    <SettingsLayout title={t('privacyAnalytics.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('privacyAnalytics.description')}
        </Typography>

        {TOGGLES.map(({ helperKey, kind, labelKey }) => (
          <FormControl key={kind} sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                {t(`privacyAnalytics.${labelKey}`)}
              </Typography>
              <Switch
                checked={consent[kind] === 'enabled'}
                onChange={handleToggle(kind)}
                disabled={loading}
              />
            </Box>
            <FormHelperText>
              {t(`privacyAnalytics.${helperKey}`)}
            </FormHelperText>
          </FormControl>
        ))}

        <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 1 }}>
          {t('privacyAnalytics.footnote')}
        </Typography>
      </div>
    </SettingsLayout>
  )
}

export default PrivacyAnalyticsSettings
