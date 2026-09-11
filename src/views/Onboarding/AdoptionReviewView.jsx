import {
  CheckRounded,
  CloudSyncRounded,
  WarningRounded,
} from '@mui/icons-material'
import { Alert, Box, Button, Link, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { APP_MODES, setAppMode } from '../../data/appMode'
import { store } from '../../data/store'
import { adoptLocalData } from '../../sync/adopt'
import { previewAdoption } from '../../sync/adoptionPreview'
import { haptic } from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `adoptionIn 520ms ${EASE} ${delay}ms both`,
  '@keyframes adoptionIn': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

/** Same halo treatment as CircleSetupView's IconHalo — one shared visual language. */
const IconHalo = ({ icon }) => (
  <Box
    sx={{
      position: 'relative',
      display: 'grid',
      placeItems: 'center',
      width: 84,
      height: 84,
      '&::before': {
        content: '""',
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: '50%',
        bgcolor: 'primary.softBg',
        opacity: 0.6,
        filter: 'blur(28px)',
      },
      '& > *': { position: 'relative' },
    }}
  >
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        color: 'primary.plainColor',
        '& svg': { fontSize: '2rem' },
      }}
    >
      {icon}
    </Box>
  </Box>
)

const SummaryRow = ({ label, value }) =>
  value > 0 ? (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography level='body-sm' sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  ) : null

const failureCount = summary =>
  !summary
    ? 0
    : summary.labels.failed.length +
      summary.projects.failed.length +
      summary.chores.failed.length +
      summary.filters.failed.length +
      summary.history.failed.length

/**
 * The interstitial a local-mode user lands on right after signing up or
 * signing in (see `docs/offline-first-plan.md`, §4 Phase 3). Replaces the old
 * silent auto-adoption: signing into an account that already has its own
 * data is a real decision, not something to resolve behind the user's back.
 *
 * Labels and projects that name-match something already in the account are
 * reused rather than duplicated (`adoptionPreview.js`); everything else is
 * appended — nothing on the account is ever changed or removed by this
 * screen, so "add" is always safe to offer as the default action.
 */
const AdoptionReviewView = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ran = useRef(false)

  const [preview, setPreview] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | review | adopting | done
  const [summary, setSummary] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)

  const finish = () => navigate('/chores', { replace: true })

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    previewAdoption()
      .then(result => {
        if (!result.hasLocalData) {
          setAppMode(APP_MODES.ACCOUNT)
          finish()
          return
        }
        setPreview(result)
        setPhase('review')
      })
      .catch(err => {
        // Nothing to show and nothing to lose — proceed into the account as
        // if there were no local data rather than trap the user here.
        console.error('Adoption preview failed', err)
        setAppMode(APP_MODES.ACCOUNT)
        finish()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdopt = async () => {
    setPhase('adopting')
    haptic()
    try {
      const result = await adoptLocalData({ preview })
      setSummary(result)
      setAppMode(APP_MODES.ACCOUNT)
      queryClient.invalidateQueries()
      setPhase('done')
    } catch (err) {
      console.error('Adoption of local data into account failed', err)
      // Nothing has been marked adopted on failure, so it's safe to let the
      // user try again from the same screen.
      setPhase('review')
    }
  }

  const handleDiscard = async () => {
    setIsDiscarding(true)
    try {
      await store.clear()
      setAppMode(APP_MODES.ACCOUNT)
      queryClient.invalidateQueries()
      finish()
    } finally {
      setIsDiscarding(false)
      setConfirmDiscard(false)
    }
  }

  if (phase === 'loading') {
    return (
      <Box
        component='main'
        sx={{
          minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.body',
        }}
      >
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          Checking what&apos;s on this device…
        </Typography>
      </Box>
    )
  }

  const failed = failureCount(summary)

  return (
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
        <Box
          sx={{ mb: 2, display: 'flex', justifyContent: 'center', ...enter(0) }}
        >
          <IconHalo
            icon={phase === 'done' ? <CheckRounded /> : <CloudSyncRounded />}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            mb: 4,
            ...enter(60),
          }}
        >
          <Typography
            level='h1'
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {phase === 'done'
              ? 'Added to your account'
              : 'Bring this device’s tasks along?'}
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              maxWidth: '34ch',
              textWrap: 'pretty',
            }}
          >
            {phase === 'done'
              ? failed > 0
                ? "Most of it made it over — a few items didn't. You can still export a backup of this device from Settings."
                : 'Everything from this device now lives on your account too.'
              : preview.accountHasExistingData
                ? "This account already has its own data. Nothing on it will change — what's on this device gets added alongside it."
                : "Nothing is deleted from this device until it's confirmed on the server."}
          </Typography>
        </Box>

        {phase !== 'done' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
              sx={{
                ...enter(120),
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                px: 2,
                py: 1.5,
                borderRadius: '16px',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <SummaryRow label='Chores' value={preview.chores.total} />
              <SummaryRow
                label={
                  preview.labels.matched > 0
                    ? `Labels (${preview.labels.matched} already on your account)`
                    : 'Labels'
                }
                value={preview.labels.total}
              />
              <SummaryRow
                label={
                  preview.projects.matched > 0
                    ? `Projects (${preview.projects.matched} already on your account)`
                    : 'Projects'
                }
                value={preview.projects.total}
              />
              <SummaryRow
                label='History entries'
                value={preview.history.total}
              />
              <SummaryRow label='Saved filters' value={preview.filters.total} />
            </Box>

            <Box sx={{ mt: 1, ...enter(190) }}>
              <Button
                size='lg'
                fullWidth
                loading={phase === 'adopting'}
                onClick={handleAdopt}
                sx={authButtonSx}
              >
                Add to my account
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', ...enter(230) }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                disabled={phase === 'adopting'}
                onClick={() => setConfirmDiscard(true)}
              >
                Discard this device&apos;s changes instead
              </Link>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {failed > 0 && (
              <Alert
                color='warning'
                startDecorator={<WarningRounded />}
                sx={{ ...enter(0) }}
              >
                {failed} item{failed === 1 ? '' : 's'} couldn&apos;t be added.
              </Alert>
            )}
            <Box sx={{ ...enter(60) }}>
              <Button size='lg' fullWidth onClick={finish} sx={authButtonSx}>
                Continue
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <ConfirmationModal
        config={{
          isOpen: confirmDiscard,
          title: 'Discard this device’s changes?',
          message:
            'The tasks, labels, projects and history created on this device before you signed in will be permanently removed. Your account itself is not affected.',
          confirmText: isDiscarding ? 'Discarding…' : 'Discard',
          cancelText: 'Cancel',
          color: 'danger',
          onClose: confirmed => {
            if (confirmed) handleDiscard()
            else setConfirmDiscard(false)
          },
        }}
      />
    </Box>
  )
}

export default AdoptionReviewView
