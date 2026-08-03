import {
  ContentCopyRounded,
  GroupAddRounded,
  LinkRounded,
} from '@mui/icons-material'
import { Box, Button, IconButton, Input, Link, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useAcknowledgmentModal from '../../hooks/useAcknowledgmentModal'
import { useNotification } from '../../service/NotificationProvider'
import { GetUserCircle, JoinCircle } from '../../utils/Fetcher'
import { haptic } from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'
import AcknowledgmentModal from '../Modals/Inputs/AcknowledgmentModal'
import { CircleVignette } from './OnboardingVignettes'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `circleSetupIn 520ms ${EASE} ${delay}ms both`,
  '@keyframes circleSetupIn': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

/**
 * A halo'd icon standing in for the vignette on the join path — that side has
 * no living preview to show (there's nothing to illustrate about someone
 * else's circle yet), so it borrows the same glow treatment WorkspaceReadyView
 * puts behind its logo instead of inventing a third visual language.
 */
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

/**
 * Right after the account (and its solo Circle) is created: the moment to
 * either bring the household in or hop into one that already exists. Skipping
 * via Continue is always valid — chores work fine solo, this is an offer, not
 * a gate.
 */
const CircleSetupView = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { ackModalConfig, showAcknowledgment } = useAcknowledgmentModal()

  const [mode, setMode] = useState('invite')
  const [inviteCode, setInviteCode] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    GetUserCircle()
      .then(resp => resp.json())
      .then(data => setInviteCode(data.res?.[0]?.invite_code ?? null))
      .catch(() => setInviteCode(null))
  }, [])

  const finish = () => navigate('/ready', { replace: true })

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    showNotification({ type: 'success', message: 'Code copied to clipboard' })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.protocol}//${window.location.host}/circle/join?code=${inviteCode}`,
    )
    showNotification({ type: 'success', message: 'Link copied to clipboard' })
  }

  const joinCircle = async () => {
    if (!joinCode.trim()) return
    setIsJoining(true)
    haptic()
    try {
      const resp = await JoinCircle(joinCode.trim())
      if (resp.ok) {
        showAcknowledgment(
          "Your join request has been sent! The circle owner will need to approve it before you can see their chores. You'll get a notification once you're in.",
          'Request Sent',
          finish,
        )
      } else {
        showNotification({
          type: 'error',
          message:
            resp.status === 409
              ? 'You are already a member of this circle'
              : 'Failed to join circle',
        })
      }
    } finally {
      setIsJoining(false)
    }
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
        <Box sx={{ mb: 2, ...enter(0) }}>
          {mode === 'invite' ? (
            <CircleVignette />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconHalo icon={<GroupAddRounded />} />
            </Box>
          )}
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
            {mode === 'invite' ? 'Bring your squad in' : 'Join a circle'}
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              maxWidth: '32ch',
              textWrap: 'pretty',
            }}
          >
            {mode === 'invite'
              ? 'Everyone who joins your Circle sees the same chores, takes their own turn, and stays in sync automatically.'
              : "Enter the code you were given and we'll send a request to join — the circle owner just needs to approve it."}
          </Typography>
        </Box>

        {mode === 'invite' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
              sx={{
                ...enter(120),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: '16px',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: inviteCode ? 'text.primary' : 'text.tertiary',
                }}
              >
                {inviteCode ?? 'Loading…'}
              </Typography>
              <IconButton
                variant='soft'
                color='primary'
                disabled={!inviteCode}
                onClick={copyCode}
                aria-label='Copy circle code'
              >
                <ContentCopyRounded />
              </IconButton>
            </Box>

            <Box sx={{ textAlign: 'center', ...enter(150) }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                startDecorator={<LinkRounded fontSize='small' />}
                disabled={!inviteCode}
                onClick={copyLink}
              >
                Copy invite link instead
              </Link>
            </Box>

            <Box sx={{ mt: 1, ...enter(190) }}>
              <Button size='lg' fullWidth onClick={finish} sx={authButtonSx}>
                Continue
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', ...enter(230) }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                startDecorator={<GroupAddRounded fontSize='small' />}
                onClick={() => setMode('join')}
              >
                Join an existing circle instead
              </Link>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ ...enter(120) }}>
              <Input
                placeholder='Enter code'
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                size='lg'
                fullWidth
                autoFocus
              />
            </Box>
            <Box sx={{ ...enter(160) }}>
              <Button
                size='lg'
                fullWidth
                loading={isJoining}
                disabled={!joinCode.trim()}
                onClick={joinCircle}
                sx={authButtonSx}
              >
                Join Circle
              </Button>
            </Box>
            <Box sx={{ textAlign: 'center', ...enter(200) }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                onClick={() => setMode('invite')}
              >
                Back
              </Link>
            </Box>
          </Box>
        )}
      </Box>

      <AcknowledgmentModal config={ackModalConfig} />
    </Box>
  )
}

export default CircleSetupView
