import { Box, Button, CircularProgress, Input, Typography } from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import useAcknowledgmentModal from '../../hooks/useAcknowledgmentModal'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { JoinCircle } from '../../utils/Fetcher'
import { clearPendingInvite, setPendingInvite } from '../../utils/PendingInvite'
import AuthShell from '../Authorization/AuthShell'
import { authButtonSx } from '../Authorization/authStyles'
import AcknowledgmentModal from '../Modals/Inputs/AcknowledgmentModal'

const JoinCircleView = () => {
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
            'Your join request has been sent successfully! The circle admin will need to approve your request before you can access the circle and its chores. You will receive a notification once your request is approved.',
            'Join Request Sent!',
            () => navigate('/chores'),
            'Got it',
            'success',
          )
        } else {
          setIsJoining(false)
          if (resp.status === 409) {
            showError('You are already a member of this circle')
          } else {
            showError('Failed to join circle')
          }
          navigate('/chores')
        }
      })
      .catch(() => {
        setIsJoining(false)
        clearPendingInvite()
        showError('Failed to join circle, please try again')
      })
  }, [code, navigate, showAcknowledgment, showError])

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

  let title = "You've been invited to a circle"
  let subtitle = null
  let body = null

  if (!code) {
    title = 'Invite link is incomplete'
    subtitle =
      "This link doesn't include an invite code. Ask whoever invited you to send the link again."
    body = (
      <Button
        fullWidth
        size='lg'
        sx={authButtonSx}
        onClick={() => navigate('/chores')}
      >
        Go to Donetick
      </Button>
    )
    // A token that no longer resolves to a profile is as good as signed out —
    // better to offer sign-in than to spin forever.
  } else if (!isAuthenticated || (!isProfileLoading && !userProfile)) {
    subtitle =
      'You need a Donetick account to join. Sign in or create one — we’ll send your join request as soon as you’re in.'
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {inviteCodeField}
        <Button
          fullWidth
          size='lg'
          sx={authButtonSx}
          onClick={() => goToAuth('/login')}
        >
          Sign in
        </Button>
        <Button
          fullWidth
          size='lg'
          variant='soft'
          color='neutral'
          sx={authButtonSx}
          onClick={() => goToAuth('/signup')}
        >
          Create an account
        </Button>
      </Box>
    )
  } else if (isProfileLoading || isJoining) {
    title = 'Joining circle'
    subtitle = 'Sending your request…'
    body = (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress />
      </Box>
    )
  } else {
    subtitle = `Hi ${
      userProfile?.displayName || userProfile?.username
    }, joining gives you access to this circle's tasks and members.`
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography
          level='body-sm'
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          A circle admin approves your request before you get access.
        </Typography>
        <Button fullWidth size='lg' sx={authButtonSx} onClick={submitJoin}>
          Join circle
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
          Cancel
        </Button>
      </Box>
    )
  }

  return (
    <AuthShell title={title} subtitle={subtitle} showLogo>
      {body}
      <AcknowledgmentModal config={ackModalConfig} />
    </AuthShell>
  )
}

export default JoinCircleView
