import { DnsOutlined } from '@mui/icons-material'
import { Box, Button, Link, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import Logo from '../../Logo'
import { useResource } from '../../queries/ResourceQueries'
import { haptic, isNativeApp, markOnboardingSeen } from '../../utils/Onboarding'
import { LegalLinks } from '../Authorization/AuthFields'
import { authButtonSx } from '../Authorization/authStyles'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `getStartedIn 520ms ${EASE} ${delay}ms both`,
  '@keyframes getStartedIn': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

/**
 * The fork at the end of onboarding: create an account or sign in. Kept
 * deliberately thin — one decision, no form — so the actual auth screens stay
 * the only place credentials are handled.
 */
const GetStartedView = () => {
  const navigate = useNavigate()
  const { data: resource } = useResource()
  const signupDisabled = Boolean(resource?.is_user_creation_disabled)

  const go = path => {
    // Reaching this screen means onboarding is done, even if the user came
    // here from a deep link rather than the carousel.
    markOnboardingSeen()
    haptic()
    navigate(path)
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            mb: 4,
            ...enter(0),
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              // Same primary wash the onboarding vignettes sit on.
              '&::before': {
                content: '""',
                position: 'absolute',
                width: 190,
                height: 190,
                borderRadius: '50%',
                bgcolor: 'primary.softBg',
                opacity: 0.6,
                filter: 'blur(30px)',
              },
              '& > *': { position: 'relative' },
            }}
          >
            <Logo size='96px' />
          </Box>
          <Typography
            level='h1'
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            Done
            <Box component='span' sx={{ color: 'primary.500' }}>
              tick
            </Box>
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              maxWidth: '30ch',
              textWrap: 'pretty',
            }}
          >
            {signupDisabled
              ? 'Sign in to your account to pick up where you left off.'
              : 'Create an account to sync everywhere, or sign in and pick up where you left off.'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            ...enter(90),
          }}
        >
          {!signupDisabled && (
            <Button
              size='lg'
              fullWidth
              onClick={() => go('/signup')}
              sx={authButtonSx}
            >
              Create an account
            </Button>
          )}
          <Button
            size='lg'
            fullWidth
            variant={signupDisabled ? 'solid' : 'outlined'}
            color={signupDisabled ? 'primary' : 'neutral'}
            onClick={() => go('/login')}
            sx={authButtonSx}
          >
            {signupDisabled ? 'Sign in' : 'I already have an account'}
          </Button>
        </Box>

        {isNativeApp() && (
          <Box sx={{ mt: 2.5, textAlign: 'center', ...enter(160) }}>
            <Link
              component='button'
              type='button'
              level='body-sm'
              color='neutral'
              underline='hover'
              startDecorator={<DnsOutlined fontSize='small' />}
              onClick={() => navigate('/login/settings')}
            >
              Connect to a self-hosted server
            </Link>
          </Box>
        )}
      </Box>

      <Box sx={{ width: '100%', maxWidth: 420, ...enter(220) }}>
        <LegalLinks />
      </Box>
    </Box>
  )
}

export default GetStartedView
