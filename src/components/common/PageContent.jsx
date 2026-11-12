import { Box } from '@mui/joy'
import PropTypes from 'prop-types'
import { matchPath, useLocation } from 'react-router-dom'

// Normal pages share outer spacing; full-screen shells use the same token
// within their own viewport layout.
const pageRoutes = [
  '/home',
  '/privacy',
  '/terms',
  '/welcome',
  '/chores',
  '/my/chores',
  '/archived',
  '/things',
  '/things/:id',
  '/labels',
  '/labels/:id',
  '/projects',
  '/projects/:id',
  '/filters',
  '/activities',
  '/points',
  '/settings/*',
  '/chores/:id',
  '/chores/:id/history',
  '/chores/:id/timer',
]

const PageContent = ({ children }) => {
  const { pathname } = useLocation()
  const isWizard = pathname === '/chores/create' || pathname.endsWith('/edit')
  const ownsSafeArea = [
    '/login',
    '/signup',
    '/forgot-password',
    '/password/update',
    '/get-started',
    '/ready',
    '/circle-setup',
    '/heard-about',
    '/onboarding',
    '/search',
  ].includes(pathname)
  const spaced = !isWizard && pageRoutes.some(path => matchPath(path, pathname))

  return (
    <Box
      data-testid={spaced ? 'page-content' : undefined}
      sx={{
        display: 'flow-root',
        width: '100%',
        maxWidth: spaced ? 1200 : 'none',
        mx: 'auto',
        px: spaced ? 'var(--page-spacing)' : 0,
        ...(spaced && {
          // Page width and gutters belong here, rather than varying by route.
          '& > .MuiContainer-root, & > div > .MuiContainer-root': {
            maxWidth: '100%',
            px: 0,
          },
        }),
        '--page-spacing': { xs: '16px', md: '24px' },
        pt: spaced ? 'var(--page-spacing)' : 0,
        pb: spaced
          ? 'calc(var(--page-spacing) + var(--safe-area-inset-bottom, 0px))'
          : ownsSafeArea
            ? 0
            : 'var(--safe-area-inset-bottom, 0px)',
      }}
    >
      {children}
    </Box>
  )
}

PageContent.propTypes = { children: PropTypes.node }

export default PageContent
