import {
  Checklist,
  DashboardRounded,
  InboxRounded,
  MenuRounded,
  SearchRounded,
  SpaceDashboard,
} from '@mui/icons-material'
import { Box, Sheet, Typography } from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useScrollDirection } from '../../hooks/useScrollDirection'
import { OPEN_NAVIGATION_DRAWER_EVENT } from './navigationEvents'

const HIDDEN_ROUTES = [
  '/signup',
  '/login',
  '/auth',
  '/forgot-password',
  '/password/update',
  '/welcome',
  '/onboarding',
  '/get-started',
  '/ready',
  '/circle/join',
  '/landing',
  '/privacy',
  '/terms',
  '/search',
]

const isTaskDetailRoute = pathname =>
  /^\/chores\/(create|[^/]+\/(?:edit|timer))$/.test(pathname)

const NavItem = ({ active, icon, label, onClick, to }) => {
  const content = (
    <>
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: active ? 'primary.softBg' : 'transparent',
          borderRadius: 999,
          color: active ? 'primary.softColor' : 'text.secondary',
          display: 'flex',
          height: 30,
          justifyContent: 'center',
          transition:
            'background-color 180ms ease, color 180ms ease, transform 180ms ease',
          width: 48,
          '& svg': { fontSize: 23 },
        }}
      >
        {icon}
      </Box>
      <Typography
        level='body-xs'
        sx={{
          color: active ? 'primary.plainColor' : 'text.secondary',
          fontSize: 11,
          fontWeight: active ? 700 : 550,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </>
  )

  return (
    <Box
      {...(to ? { component: Link, to } : { component: 'button', onClick })}
      aria-current={active ? 'page' : undefined}
      type={to ? undefined : 'button'}
      sx={{
        alignItems: 'center',
        background: 'none',
        border: 0,
        color: 'inherit',
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: 0.5,
        justifyContent: 'center',
        minHeight: 58,
        minWidth: 0,
        p: 0,
        textDecoration: 'none',
        WebkitTapHighlightColor: 'transparent',
        '&:active > div:first-of-type': { transform: 'scale(.92)' },
      }}
    >
      {content}
    </Box>
  )
}

NavItem.propTypes = {
  active: PropTypes.bool.isRequired,
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  to: PropTypes.string,
}

const MobileBottomNav = () => {
  const { t } = useTranslation('common')
  const isMobile = useMediaQuery('(max-width:768px)')
  const location = useLocation()
  const navigate = useNavigate()

  const hidden =
    !isMobile ||
    HIDDEN_ROUTES.some(route => location.pathname.startsWith(route)) ||
    isTaskDetailRoute(location.pathname) ||
    ['www.donetick.com', 'donetick.com'].includes(window.location.hostname)

  const scrolledAway = useScrollDirection({ enabled: isMobile && !hidden })

  if (hidden) return null

  const tasksActive =
    location.pathname === '/chores' || location.pathname === '/my/chores'

  return (
    <>
      <Sheet
        component='nav'
        aria-label={t('navigation.mobileNavigation', {
          defaultValue: 'Primary navigation',
        })}
        variant='plain'
        sx={{
          alignItems: 'flex-start',
          borderTop: '1px solid',
          borderColor: 'divider',
          bottom: 0,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, .06)',
          display: 'flex',
          height: 'calc(56px + var(--safe-area-inset-bottom, 0px))',
          insetInline: 0,
          pb: 'var(--safe-area-inset-bottom, 0px)',
          position: 'fixed',
          transform: scrolledAway ? 'translateY(100%)' : 'translateY(0)',
          transition: 'transform 220ms ease',
          zIndex: 'var(--joy-zIndex-popup)',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <NavItem
          active={location.pathname === '/'}
          icon={<SpaceDashboard />}
          label={t('navigation.home')}
          to='/'
        />
        <NavItem
          active={tasksActive}
          icon={<Checklist />}
          label={t('navigation.tasks', { defaultValue: 'Tasks' })}
          to='/chores'
        />
        <NavItem
          active={location.pathname === '/search'}
          icon={<SearchRounded />}
          label={t('navigation.search')}
          onClick={() => navigate('/search')}
        />
        <NavItem
          active={false}
          icon={<MenuRounded />}
          label={t('navigation.more', { defaultValue: 'More' })}
          onClick={() =>
            window.dispatchEvent(new Event(OPEN_NAVIGATION_DRAWER_EVENT))
          }
        />
      </Sheet>

      <Box
        aria-hidden='true'
        sx={{
          height: 'calc(56px + var(--safe-area-inset-bottom, 0px))',
        }}
      />
    </>
  )
}

export default MobileBottomNav
