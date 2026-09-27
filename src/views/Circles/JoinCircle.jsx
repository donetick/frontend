import { Box, Button, CircularProgress, Input, Typography } from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import useAcknowledgmentModal from '../../hooks/useAcknowledgmentModal'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { JoinCircle } from '../../utils/Fetcher'
import { clearPendingInvite, setPendingInvite } from '../../utils/PendingInvite'
import { authButtonSx } from '../Authorization/authStyles'
import AcknowledgmentModal from '../Modals/Inputs/AcknowledgmentModal'
import { CircleVignette } from '../Onboarding/OnboardingVignettes'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `joinCircleIn 520ms ${EASE} ${delay}ms both`,
  '@keyframes joinCircleIn': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

const JoinCircleView = () => {
  const { t } = useTranslation()
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile()
  // Read the token rather than useAuth(): the provider's copy only updates
  // through its own login(), so signup and the OAuth callback — which save
  // tokens directly — would still look signed out here. The query hooks read
  // storage the same way.
  const isAuthenticated = !!localStorage.getItem('token')
  const { showError } = useNotification()
  const { ackModalConfig, showAcknowledgment } = useAcknowledgmentModal()
  const [isJoining, setIsJoining] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')
  // `auto=1` is on the link we send the user back to after they authenticate,
  // and only there — someone who opens an invite while already signed in gets
  // asked, not auto-joined.
  const isReturningFromAuth = searchParams.get('auto') === '1'
  const autoJoinAttempted = useRef(false)

  const submitJoin = useCallback(() => {
    setIsJoining(true)
    JoinCircle(code)
      .then(resp => {
        clearPendingInvite()
        if (resp.ok) {
          showAcknowledgment(
            t('joinCircle.requestSentBody'),
            t('joinCircle.requestSentTitle'),
            () => navigate('/chores'),
            t('joinCircle.gotIt'),
            'success',
          )
        } else {
          setIsJoining(false)
          if (resp.status === 409) {
            showError(t('joinCircle.alreadyMember'))
          } else {
            showError(t('joinCircle.joinFailed'))
          }
          navigate('/chores')
        }
      })
      .catch(() => {
        setIsJoining(false)
        clearPendingInvite()
        showError(t('joinCircle.requestError'))
      })
  }, [code, navigate, showAcknowledgment, showError, t])

  // Coming back from login/signup the user already said yes by opening the
  // link, so send the request instead of asking a second time. This step used
  // to be missing entirely: the login page was a dead end.
  useEffect(() => {
    if (autoJoinAttempted.current) return
    if (!code || !isReturningFromAuth) return
    if (!isAuthenticated || !userProfile) return

    autoJoinAttempted.current = true
    submitJoin()
  }, [code, isReturningFromAuth, isAuthenticated, userProfile, submitJoin])

  // Park the code so it survives the round-trip, including OAuth flows that
  // leave the app entirely.
  const goToAuth = destination => {
    setPendingInvite(code)
    navigate(destination)
  }

  const inviteCodeField = (
    <Input
      value={code || ''}
      readOnly
      size='lg'
      slotProps={{ input: { style: { textAlign: 'center', fontWeight: 600 } } }}
    />
  )

  let title = t('joinCircle.title')
  let subtitle = null
  let body = null

  if (!code) {
    title = t('joinCircle.incompleteTitle')
    subtitle = t('joinCircle.incompleteSubtitle')
    body = (
      <Button
        fullWidth
        size='lg'
        sx={authButtonSx}
        onClick={() => navigate('/chores')}
      >
        {t('joinCircle.goToDonetick')}
      </Button>
    )
    // A token that no longer resolves to a profile is as good as signed out —
    // better to offer sign-in than to spin forever.
  } else if (!isAuthenticated || (!isProfileLoading && !userProfile)) {
    subtitle = t('joinCircle.signedOutSubtitle')
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {inviteCodeField}
        <Button
          fullWidth
          size='lg'
          sx={authButtonSx}
          onClick={() => goToAuth('/login')}
        >
          {t('joinCircle.signIn')}
        </Button>
        <Button
          fullWidth
          size='lg'
          variant='soft'
          color='neutral'
          sx={authButtonSx}
          onClick={() => goToAuth('/signup')}
        >
          {t('joinCircle.createAccount')}
        </Button>
      </Box>
    )
  } else if (isProfileLoading || isJoining) {
    title = t('joinCircle.sendingTitle')
    subtitle = t('joinCircle.sendingSubtitle')
    body = (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress />
      </Box>
    )
  } else {
    subtitle = t('joinCircle.greetingSubtitle', {
      name: userProfile?.displayName || userProfile?.username,
    })
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography
          level='body-sm'
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          {t('joinCircle.adminReviewNote')}
        </Typography>
        <Button fullWidth size='lg' sx={authButtonSx} onClick={submitJoin}>
          {t('joinCircle.sendRequest')}
        </Button>
        <Button
          fullWidth
          size='lg'
          variant='plain'
          color='neutral'
          sx={authButtonSx}
          onClick={() => {
            clearPendingInvite()
            navigate('/chores')
          }}
        >
          {t('common:cancel')}
        </Button>
      </Box>
    )
  }

  return (
    <Box
      component='main'
      sx={{
        minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 3,
        pb: 'calc(var(--safe-area-inset-bottom, 0px) + 24px)',
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
        <Box sx={{ mb: 2, ...enter(0) }}>
          <CircleVignette />
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
            {title}
          </Typography>
          {subtitle && (
            <Typography
              level='body-md'
              sx={{
                color: 'text.secondary',
                maxWidth: '34ch',
                textWrap: 'pretty',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ ...enter(120) }}>{body}</Box>
      </Box>

      <AcknowledgmentModal config={ackModalConfig} />
    </Box>
  )
}

export default JoinCircleView
