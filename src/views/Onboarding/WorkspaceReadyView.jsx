import { Capacitor } from '@capacitor/core'
import { CheckRounded } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { track } from '../../analytics'
import Logo from '../../Logo'
import { useUserProfile } from '../../queries/UserQueries'
import { isOfficialDonetickInstance } from '../../utils/FeatureToggle'
import { haptic } from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const READY = [
  'Shared chores for the whole house',
  'Recurring schedules that survive real life',
  'Capture by voice, photo or text',
  'Reminders and home-screen widgets',
]

/**
 * The beat between signing up and landing in an empty task list: the account is
 * made, so say so. Everything listed here is already switched on for a free
 * account — the upgrade offer comes after, never in place of it.
 */
const WorkspaceReadyView = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: userProfile } = useUserProfile()
  const [busy, setBusy] = useState(false)

  const enterApp = () => navigate('/chores', { replace: true })

  /**
   * Shows the configured RevenueCat offering, then continues into the app
   * whatever the outcome — dismissing the paywall is the "continue free" path,
   * and a missing offering or a store hiccup must never trap a new user here.
   */
  const showPaywall = async () => {
    const isDonetickDotCom = await isOfficialDonetickInstance()
    if (!isDonetickDotCom || !Capacitor.isNativePlatform() || !userProfile?.id)
      return

    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui')

    await Purchases.configure({
      apiKey:
        Capacitor.getPlatform() === 'ios'
          ? import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_IOS
          : import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_ANDROID,
      appUserID: String(userProfile.id),
    })

    const offerings = await Purchases.getOfferings()
    if (!offerings?.current) return

    await RevenueCatUI.presentPaywall({ offering: offerings.current })

    const { customerInfo } = await Purchases.getCustomerInfo()
    if (customerInfo.entitlements.active['Donetick Plus']) {
      queryClient.invalidateQueries(['userProfile'])
    }
  }

  const handleContinue = async () => {
    setBusy(true)
    haptic('medium')
    try {
      await showPaywall()
    } catch (error) {
      console.log('Paywall skipped:', error)
    } finally {
      setBusy(false)
      track('onboarding_completed')
      enterApp()
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            mb: 4,
            animation: `readyIn 520ms ${EASE} both`,
            '@keyframes readyIn': {
              from: { opacity: 0, transform: 'translateY(12px)' },
              to: { opacity: 1, transform: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: 170,
                height: 170,
                borderRadius: '50%',
                bgcolor: 'primary.softBg',
                opacity: 0.6,
                filter: 'blur(30px)',
              },
              '& > *': { position: 'relative' },
            }}
          >
            <Logo size='84px' />
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
            {userProfile?.displayName
              ? `You're all set, ${userProfile.displayName.split(' ')[0]}`
              : "You're all set"}
          </Typography>
          <Typography
            level='body-md'
            sx={{ color: 'text.secondary', maxWidth: '30ch' }}
          >
            Your workspace is ready. Here&apos;s what&apos;s waiting inside.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {READY.map((item, index) => (
            <Box
              key={item}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.75,
                py: 1.25,
                borderRadius: '14px',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
                // Each line checks itself off in turn: the small "it's done"
                // beat this screen exists for.
                animation: `readyTick 460ms ${EASE} ${180 + index * 120}ms both`,
                '@keyframes readyTick': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'none' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                },
              }}
            >
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'success.500',
                  color: 'common.white',
                  '& svg': { fontSize: '1rem' },
                }}
              >
                <CheckRounded />
              </Box>
              <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Button
          size='lg'
          fullWidth
          loading={busy}
          onClick={handleContinue}
          sx={authButtonSx}
        >
          Continue
        </Button>
      </Box>
    </Box>
  )
}

export default WorkspaceReadyView
