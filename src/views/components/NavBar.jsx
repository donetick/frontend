import { Capacitor } from '@capacitor/core'
import {
  Archive,
  ArrowBack,
  Checklist,
  FilterAlt,
  FolderOpen,
  History,
  ListAlt,
  Logout,
  MenuRounded,
  ReportProblem,
  SearchRounded,
  SettingsOutlined,
  SpaceDashboard,
  Toll,
  Widgets,
} from '@mui/icons-material'
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemDecorator,
  Sheet,
  Tooltip,
  Typography,
} from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { version } from '../../../package.json'
import UserProfileAvatar from '../../components/UserProfileAvatar'
import { useScrollDirection } from '../../hooks/useScrollDirection'
import { useResource } from '../../queries/ResourceQueries'
import { useGlobalSearch } from '../../search/GlobalSearchContext'
import { apiClient } from '../../utils/ApiClient'
import ErrorReportModal from '../Modals/ErrorReportModal'
import NavBarLink from './NavBarLink'
import { OPEN_NAVIGATION_DRAWER_EVENT } from './navigationEvents'
import SyncStatusIndicator from './SyncStatusIndicator'

const COMPACT_NAV_WIDTH = 60
const EXPANDED_NAV_WIDTH = 232
const PUBLIC_PAGES = ['/landing', '/privacy', '/terms']
const SHELL_FREE_PAGES = [
  '/signup',
  '/login',
  '/auth/oauth2',
  '/forgot-password',
  '/password/update',
  '/login/settings',
  '/welcome',
  '/onboarding',
  '/get-started',
  '/ready',
  '/circle/join',
]

const NavBar = () => {
  const { t } = useTranslation('common')
  const { data: resource } = useResource()
  const { openSearch } = useGlobalSearch()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [desktopExpanded, setDesktopExpanded] = useState(
    () => window.localStorage.getItem('desktopNavExpanded') === 'true',
  )
  const isMobile = useMediaQuery('(max-width:768px)')
  const isDesktop = useMediaQuery('(min-width:1024px)')
  const headerHidden = useScrollDirection({ enabled: !isDesktop })

  useEffect(() => {
    const handleOpenDrawer = () => setDrawerOpen(true)
    window.addEventListener(OPEN_NAVIGATION_DRAWER_EVENT, handleOpenDrawer)
    return () =>
      window.removeEventListener(OPEN_NAVIGATION_DRAWER_EVENT, handleOpenDrawer)
  }, [])

  useEffect(() => {
    const width = isDesktop ? `${COMPACT_NAV_WIDTH}px` : '0px'
    document.documentElement.style.setProperty('--app-navigation-width', width)
    return () =>
      document.documentElement.style.removeProperty('--app-navigation-width')
  }, [isDesktop])

  const links = [
    {
      label: t('navigation.search'),
      icon: <SearchRounded />,
      onClick: () => openSearch(),
    },
    {
      to: '/home',
      label: t('navigation.home'),
      icon: <SpaceDashboard />,
      exact: true,
    },
    {
      to: '/chores',
      label: t('navigation.allTasks'),
      icon: <Checklist />,
    },
    {
      to: '/archived',
      label: t('navigation.archived'),
      icon: <Archive />,
    },
    {
      to: '/things',
      label: t('navigation.things'),
      icon: <Widgets />,
    },
    {
      to: '/labels',
      label: t('navigation.labels'),
      icon: <ListAlt />,
    },
    {
      to: '/projects',
      label: t('navigation.projects'),
      icon: <FolderOpen />,
    },
    {
      to: '/filters',
      label: t('navigation.filters'),
      icon: <FilterAlt />,
    },
    {
      to: '/activities',
      label: t('navigation.activities'),
      icon: <History />,
    },
    {
      to: '/points',
      label: t('navigation.points'),
      icon: <Toll />,
    },
    {
      to: '/settings',
      label: t('navigation.settings'),
      icon: <SettingsOutlined />,
    },
  ]

  const getMenuIcon = () => {
    const menuButton = (
      <IconButton
        aria-label={t('navigation.openMenu', { defaultValue: 'Open menu' })}
        size='md'
        variant='plain'
        onClick={() => setDrawerOpen(true)}
        sx={{ borderRadius: 'md', minHeight: 44, minWidth: 44 }}
      >
        <MenuRounded />
      </IconButton>
    )

    if (location.pathname === '/search') {
      return (
        <IconButton
          size='md'
          variant='plain'
          onClick={() => {
            if (window.history.state?.idx > 0) navigate(-1)
            else navigate('/chores', { replace: true })
          }}
          aria-label={t('backFromSearch')}
          title={t('back')}
          sx={{ borderRadius: 'md', minHeight: 44, minWidth: 44 }}
        >
          <ArrowBack className='rtl-flip' />
        </IconButton>
      )
    }

    if (!Capacitor.isNativePlatform()) return menuButton

    if (
      ['/', '/home', '/chores'].includes(location.pathname) &&
      !searchParams.get('filterId')
    ) {
      return isMobile ? null : menuButton
    }

    return (
      <IconButton
        size='md'
        variant='plain'
        onClick={() =>
          location.pathname === '/chores' ? navigate('/') : navigate(-1)
        }
        aria-label={
          searchParams.get('from') === 'calendar'
            ? t('backToCalendar')
            : t('back')
        }
        title={
          searchParams.get('from') === 'calendar'
            ? t('backToCalendar')
            : t('back')
        }
        sx={{ borderRadius: 'md', minHeight: 44, minWidth: 44 }}
      >
        <ArrowBack className='rtl-flip' />
      </IconButton>
    )
  }

  const navigation = (closeOnSelect, compact = false) => (
    <List
      aria-label={t('navigation.primaryNavigation', {
        defaultValue: 'Primary navigation',
      })}
      size='md'
      sx={{ gap: 0.25, p: compact ? 0.5 : 1 }}
      onClick={closeOnSelect ? () => setDrawerOpen(false) : undefined}
    >
      {links.map((link, index) => (
        <Box key={link.to || link.label} sx={{ width: '100%' }}>
          {index === 3 && <Divider sx={{ my: 1 }} />}
          <NavBarLink compact={compact} link={link} />
        </Box>
      ))}
    </List>
  )

  const footer = (compact = false, showAccountRow = true) => (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        p: compact ? 0.5 : 1,
      }}
    >
      {showAccountRow && (
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: compact ? 'column' : 'row',
            gap: compact ? 0.5 : 1,
            minHeight: 48,
            px: compact ? 0 : 1,
            py: compact ? 0.5 : 0,
          }}
        >
          <Tooltip
            title={
              compact
                ? t('navigation.profile', { defaultValue: 'Profile' })
                : ''
            }
            placement='right'
          >
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                height: compact ? 48 : 'auto',
                justifyContent: 'center',
                width: compact ? 48 : 'auto',
              }}
            >
              <UserProfileAvatar />
            </Box>
          </Tooltip>
          {!compact && <Box sx={{ flex: 1 }} />}
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              height: compact ? 48 : 'auto',
              justifyContent: 'center',
              width: compact ? 48 : 'auto',
            }}
          >
            <SyncStatusIndicator />
          </Box>
        </Box>
      )}
      <List size='sm' sx={{ gap: 0.25, p: 0 }}>
        <Tooltip
          title={compact ? t('navigation.reportBug') : ''}
          placement='right'
        >
          <ListItemButton
            aria-label={t('navigation.reportBug')}
            onClick={() => {
              setDrawerOpen(false)
              setBugReportOpen(true)
            }}
            sx={{
              borderRadius: 'md',
              gap: compact ? 0 : undefined,
              justifyContent: compact ? 'center' : 'flex-start',
              minHeight: 48,
              mx: compact ? 'auto' : 0,
              px: compact ? 0 : 1.5,
              width: compact ? 48 : '100%',
            }}
          >
            <ListItemDecorator
              sx={
                compact
                  ? { marginInlineEnd: '0 !important', minInlineSize: 0 }
                  : undefined
              }
            >
              <ReportProblem />
            </ListItemDecorator>
            {!compact && (
              <Typography level='body-sm' sx={{ fontWeight: 400 }}>
                {t('navigation.reportBug')}
              </Typography>
            )}
          </ListItemButton>
        </Tooltip>
        <Tooltip title={compact ? t('logout') : ''} placement='right'>
          <ListItemButton
            aria-label={t('logout')}
            onClick={() => apiClient.handleLogout()}
            sx={{
              borderRadius: 'md',
              gap: compact ? 0 : undefined,
              justifyContent: compact ? 'center' : 'flex-start',
              minHeight: 48,
              mx: compact ? 'auto' : 0,
              px: compact ? 0 : 1.5,
              width: compact ? 48 : '100%',
            }}
          >
            <ListItemDecorator
              sx={
                compact
                  ? { marginInlineEnd: '0 !important', minInlineSize: 0 }
                  : undefined
              }
            >
              <Logout />
            </ListItemDecorator>
            {!compact && (
              <Typography level='body-sm' sx={{ fontWeight: 400 }}>
                {t('logout')}
              </Typography>
            )}
          </ListItemButton>
        </Tooltip>
      </List>
      {!compact && (
        <Typography
          level='body-xs'
          onClick={() => window.location.reload()}
          sx={{ color: 'text.tertiary', cursor: 'pointer', px: 1, py: 0.75 }}
        >
          {t('versionInfo', {
            version,
            apiVersion: resource?.api_version || t('apiVersionUnavailable'),
          })}
        </Typography>
      )}
    </Box>
  )

  if (SHELL_FREE_PAGES.includes(location.pathname)) {
    return (
      <Box aria-hidden='true' sx={{ pt: 'var(--safe-area-inset-top, 0px)' }} />
    )
  }
  if (PUBLIC_PAGES.includes(location.pathname)) return null
  if (isMobile && location.pathname === '/search') return null
  if (['www.donetick.com', 'donetick.com'].includes(window.location.hostname)) {
    return null
  }

  return (
    <>
      {isDesktop ? (
        <>
          <Box
            aria-hidden='true'
            sx={{
              flexShrink: 0,
              width: COMPACT_NAV_WIDTH,
            }}
          />
          <Sheet
            component='aside'
            variant='plain'
            sx={{
              bgcolor: 'background.surface',
              borderInlineEnd: '1px solid',
              borderColor: 'divider',
              boxShadow: desktopExpanded ? 'lg' : 'none',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              fontFamily: 'var(--joy-fontFamily-body)',
              height: '100dvh',
              insetInlineStart: 0,
              overflow: 'hidden',
              position: 'fixed',
              top: 0,
              transition: 'width 200ms ease',
              width: desktopExpanded ? EXPANDED_NAV_WIDTH : COMPACT_NAV_WIDTH,
              zIndex: 'var(--joy-zIndex-popup)',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                gap: 1,
                justifyContent: desktopExpanded ? 'flex-start' : 'center',
                minHeight: 56,
                overflow: 'hidden',
                px: desktopExpanded ? 1.5 : 0,
                pt: 'var(--safe-area-inset-top, 0px)',
                whiteSpace: 'nowrap',
              }}
            >
              <Tooltip
                title={
                  desktopExpanded
                    ? t('navigation.collapseMenu', {
                        defaultValue: 'Collapse menu',
                      })
                    : t('navigation.expandMenu', {
                        defaultValue: 'Expand menu',
                      })
                }
                placement='right'
              >
                <IconButton
                  aria-label={
                    desktopExpanded
                      ? t('navigation.collapseMenu', {
                          defaultValue: 'Collapse menu',
                        })
                      : t('navigation.expandMenu', {
                          defaultValue: 'Expand menu',
                        })
                  }
                  onClick={() => {
                    const expanded = !desktopExpanded
                    setDesktopExpanded(expanded)
                    window.localStorage.setItem(
                      'desktopNavExpanded',
                      String(expanded),
                    )
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  <MenuRounded />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {navigation(false, !desktopExpanded)}
            </Box>
            <Box sx={{ pb: 'var(--safe-area-inset-bottom, 0px)' }}>
              {footer(!desktopExpanded)}
            </Box>
          </Sheet>
        </>
      ) : (
        <>
          <Sheet
            component='header'
            variant='plain'
            sx={{
              alignItems: 'center',
              backdropFilter: 'blur(16px)',
              bgcolor:
                'rgba(var(--joy-palette-background-surfaceChannel) / 0.88)',
              borderBottom: 'none',
              borderColor: 'divider',
              '@media (min-width: 769px)': { borderBottom: '1px solid' },
              display: 'flex',
              gap: 1,
              minHeight: 56,
              px: { xs: 1, sm: 2 },
              pb: 0.375,
              pt:
                Capacitor.getPlatform() === 'android'
                  ? 'calc(var(--safe-area-inset-top, 0px) + 3px)'
                  : 0.375,
              position: 'sticky',
              top: 0,
              transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)',
              transition: 'transform 220ms ease',
              zIndex: 'var(--joy-zIndex-popup)',
              '@media (min-width: 1024px)': { display: 'none' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            {getMenuIcon()}
            <Box sx={{ flex: 1 }} />
            <SyncStatusIndicator />
            <UserProfileAvatar />
          </Sheet>

          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            anchor='left'
            size='sm'
            sx={{
              '--Drawer-horizontalSize': 'min(72vw, 248px)',
              '@media (min-width: 1024px)': { display: 'none' },
              '& .MuiDrawer-content': {
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'var(--joy-fontFamily-body)',
                overflow: 'hidden',
              },
            }}
          >
            <Box
              className='safe-area-x'
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                pt: 'calc(var(--safe-area-inset-top, 0px) + 4px)',
              }}
            >
              {navigation(true)}
            </Box>
            <Box className='safe-area-x safe-area-bottom'>
              {footer(false, false)}
            </Box>
          </Drawer>
        </>
      )}

      <ErrorReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </>
  )
}

export default NavBar
