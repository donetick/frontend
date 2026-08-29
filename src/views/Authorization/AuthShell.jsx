import { Capacitor } from '@capacitor/core'
import { Box, Sheet, Typography } from '@mui/joy'

import Logo from '../../Logo'

/**
 * Full-height auth layout: edge-to-edge on phones, a centered surface card from
 * the `sm` breakpoint up. The route renders without a navbar, so the shell owns
 * its own safe-area padding (the top inset is already reserved by NavBar).
 */
const AuthShell = ({
  action,
  children,
  footer,
  logoSize = 48,
  showLogo = !Capacitor.isNativePlatform(),
  subtitle,
  // In the app the user already came through the app icon and the Get Started
  // mark, so repeating it here is noise. On the web these routes are the first
  // thing a visitor sees — often on a self-hosted domain, and with no navbar —
  // so the mark is the only thing identifying the app. Views reached from an
  // emailed link override this to always show it.
  title,
}) => {
  return (
    <Box
      component='main'
      sx={{
        minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        pt: { xs: 3, sm: 5 },
        pb: 'calc(var(--safe-area-inset-bottom, 0px) + 24px)',
        bgcolor: 'background.body',
      }}
    >
      {/* my:auto centers the column without the top-clipping that
          justify-content:center causes once the form outgrows the viewport. */}
      <Box sx={{ width: '100%', maxWidth: 420, my: 'auto' }}>
        <Sheet
          variant='plain'
          sx={{
            position: 'relative',
            borderRadius: { xs: 0, sm: '20px' },
            bgcolor: { xs: 'transparent', sm: 'background.surface' },
            border: { xs: 'none', sm: '1px solid' },
            borderColor: { sm: 'divider' },
            boxShadow: { xs: 'none', sm: 'sm' },
            p: { xs: 0, sm: 3.5 },
            animation: 'authPanelIn 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
            '@keyframes authPanelIn': {
              from: { opacity: 0, transform: 'translateY(8px)' },
              to: { opacity: 1, transform: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
          {action && (
            <Box sx={{ position: 'absolute', top: 0, right: 0 }}>{action}</Box>
          )}

          {/* Mark only: the wordmark sat at nearly the same size and weight as
              the title below it, so the two competed instead of forming a
              hierarchy. */}
          {showLogo && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Logo size={`${logoSize}px`} />
            </Box>
          )}

          {title && (
            <Typography
              level='h2'
              sx={{
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textAlign: 'center',
                textWrap: 'balance',
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              level='body-sm'
              sx={{
                mt: 0.75,
                textAlign: 'center',
                color: 'text.secondary',
                textWrap: 'pretty',
              }}
            >
              {subtitle}
            </Typography>
          )}

          <Box sx={{ mt: title || subtitle ? 3 : 0 }}>{children}</Box>
        </Sheet>

        {footer && <Box sx={{ mt: 2.5 }}>{footer}</Box>}
      </Box>
    </Box>
  )
}

export default AuthShell
