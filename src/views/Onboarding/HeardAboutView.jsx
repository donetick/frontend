import { CheckRounded } from '@mui/icons-material'
import { Box, Button, Input, Link, Switch, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { track } from '../../analytics'
import { isOfficialDonetickInstance } from '../../utils/FeatureToggle'
import {
  haptic,
  recordAcquisitionSource,
  recordPrivacyPreferences,
} from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `heardAboutIn 520ms ${EASE} ${delay}ms both`,
  '@keyframes heardAboutIn': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

// Keys, not labels: the selected value is recorded as the acquisition source,
// so it has to stay stable across locales. Display copy lives in
// `common:onboarding.heardAbout.sources.*`.
const SOURCES = ['appStore', 'reddit', 'friend', 'video', 'search', 'other']

const OTHER = 'other'

const Shell = ({ children }) => (
  <Box
    component='main'
    sx={{
      minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      px: 3,
      pb: 3,
      bgcolor: 'background.body',
    }}
  >
    <Box
      sx={{
        width: '100%',
        maxWidth: 420,
        my: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </Box>
  </Box>
)

/**
 * A one-question attribution survey dropped right after account creation,
 * while the "why did I click install" is still fresh. Answering is optional
 * blocking a brand-new user on a marketing question would cost more than the
 * data is worth so Continue is always enabled. Shown only on the official
 * donetick.com instance: a self-hosted server has no marketing funnel to
 * attribute, so it gets the privacy prompt below instead.
 */
const AcquisitionSurvey = ({ onDone }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState('')

  const select = source => {
    haptic()
    setSelected(current => (current === source ? null : source))
  }

  const finish = () => {
    const answer = selected === OTHER ? detail.trim() || null : selected
    if (answer) {
      recordAcquisitionSource(answer)
      track('onboarding_option_selected', {
        step: 'heard_about',
        option: answer,
      })
    }
    onDone()
  }

  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 3, ...enter(0) }}>
        <Typography
          level='h1'
          sx={{
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textWrap: 'balance',
          }}
        >
          {t('onboarding.heardAbout.title')}
        </Typography>
        <Typography
          level='body-md'
          sx={{ mt: 1, color: 'text.secondary', textWrap: 'pretty' }}
        >
          {t('onboarding.heardAbout.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...enter(60) }}
      >
        {SOURCES.map(source => {
          const active = selected === source
          return (
            <Box
              key={source}
              component='button'
              type='button'
              onClick={() => select(source)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 2,
                py: 1.25,
                borderRadius: '14px',
                border: '1px solid',
                borderColor: active ? 'primary.500' : 'divider',
                bgcolor: active ? 'primary.softBg' : 'background.surface',
                color: 'text.primary',
                font: 'inherit',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: `border-color 200ms ${EASE}, background-color 200ms ${EASE}`,
              }}
            >
              {t(`onboarding.heardAbout.sources.${source}`)}
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1.5px solid',
                  borderColor: active
                    ? 'primary.500'
                    : 'neutral.outlinedBorder',
                  bgcolor: active ? 'primary.500' : 'transparent',
                  color: 'common.white',
                  '& svg': { fontSize: '0.9rem' },
                }}
              >
                {active && <CheckRounded />}
              </Box>
            </Box>
          )
        })}

        {selected === OTHER && (
          <Box sx={{ mt: 0.5, ...enter(0) }}>
            <Input
              placeholder={t('onboarding.heardAbout.detailPlaceholder')}
              value={detail}
              onChange={e => setDetail(e.target.value)}
              size='lg'
              fullWidth
              autoFocus
            />
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 3, ...enter(120) }}>
        <Button size='lg' fullWidth onClick={finish} sx={authButtonSx}>
          {t('onboarding.heardAbout.continue')}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1.5, ...enter(150) }}>
        <Link
          component='button'
          type='button'
          level='body-sm'
          color='neutral'
          underline='hover'
          onClick={finish}
        >
          {t('onboarding.heardAbout.skip')}
        </Link>
      </Box>
    </>
  )
}

// Copy lives in `common:onboarding.privacy.*`, keyed off `key`.
const PRIVACY_TOGGLES = ['crashReports', 'analytics']

/**
 * The self-hosted counterpart to the attribution survey: since a self-hosted
 * server is its own data boundary, what to share back to us is a consent
 * question, not a marketing one. Both toggles default off this screen is
 * an opt-in, not an opt-out.
 */
const PrivacyPreferences = ({ onDone }) => {
  const { t } = useTranslation()
  const [crashReports, setCrashReports] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  const toggle = key => {
    haptic()
    if (key === 'crashReports') setCrashReports(value => !value)
    if (key === 'analytics') setAnalytics(value => !value)
  }

  const values = { crashReports, analytics }

  const finish = async () => {
    await recordPrivacyPreferences(values)
    onDone()
  }

  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 3, ...enter(0) }}>
        <Typography
          level='h1'
          sx={{
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textWrap: 'balance',
          }}
        >
          {t('onboarding.privacy.title')}
        </Typography>
        <Typography
          level='body-md'
          sx={{ mt: 1, color: 'text.secondary', textWrap: 'pretty' }}
        >
          {t('onboarding.privacy.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          ...enter(60),
        }}
      >
        {PRIVACY_TOGGLES.map(key => (
          <Box
            key={key}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: '14px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                {t(`onboarding.privacy.${key}Label`)}
              </Typography>
              <Typography
                level='body-sm'
                sx={{ mt: 0.25, color: 'text.secondary' }}
              >
                {t(`onboarding.privacy.${key}Description`)}
              </Typography>
            </Box>
            <Switch
              checked={values[key]}
              onClick={() => toggle(key)}
              sx={{ flex: '0 0 auto', mt: 0.25 }}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 3, ...enter(120) }}>
        <Button size='lg' fullWidth onClick={finish} sx={authButtonSx}>
          {t('onboarding.heardAbout.continue')}
        </Button>
      </Box>
    </>
  )
}

const HeardAboutView = () => {
  const navigate = useNavigate()
  const [isOfficial, setIsOfficial] = useState(null)

  useEffect(() => {
    let cancelled = false
    isOfficialDonetickInstance().then(result => {
      if (!cancelled) setIsOfficial(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onDone = () => navigate('/circle-setup', { replace: true })

  // Nothing to render mid-check: the read is a local preferences lookup, so
  // this resolves before the entrance animation would even be noticed.
  if (isOfficial === null) return <Shell />

  return (
    <Shell>
      {isOfficial ? (
        <AcquisitionSurvey onDone={onDone} />
      ) : (
        <PrivacyPreferences onDone={onDone} />
      )}
    </Shell>
  )
}

export default HeardAboutView
