import { Capacitor } from '@capacitor/core'
import {
  Archive,
  ArrowBack,
  FilterAlt,
  FolderOpen,
  History,
  Inbox,
  ListAlt,
  Logout,
  MenuRounded,
  SettingsOutlined,
  Toll,
  Widgets,
} from '@mui/icons-material'
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Typography,
} from '@mui/joy'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { version } from '../../../package.json'
import UserProfileAvatar from '../../components/UserProfileAvatar'
import NavBarLink from './NavBarLink'

import { SafeArea } from 'capacitor-plugin-safe-area'
import Z_INDEX from '../../constants/zIndex'
import { useResource } from '../../queries/ResourceQueries'
import { apiClient } from '../../utils/ApiClient'

const publicPages = ['/landing', '/privacy', '/terms']
const NavBar = () => {
  const { t } = useTranslation('common')
  const { data: resource } = useResource()

  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  const links = [
    {
      to: '/chores',
      label: t('navigation.allTasks'),
      icon: <Inbox />,
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
      to: 'labels',
      label: t('navigation.labels'),
      icon: <ListAlt />,
    },
    {
      to: 'projects',
      label: t('navigation.projects'),
      icon: <FolderOpen />,
    },
    {
      to: 'filters',
      label: t('navigation.filters'),
      icon: <FilterAlt />,
    },
    {
      to: 'activities',
      label: t('navigation.activities'),
      icon: <History />,
    },
    {
      to: 'points',
      label: t('navigation.points'),
      icon: <Toll />,
    },
    {
      to: '/settings',
      label: t('navigation.settings'),
      icon: <SettingsOutlined />,
    },
  ]
  const [openDrawer, closeDrawer] = [
    () => setDrawerOpen(true),
    () => setDrawerOpen(false),
  ]
  const location = useLocation()
  const [searchParams] = useSearchParams()
  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(data => {
      const { insets } = data
      const drawerContent = document.querySelector('.drawer-content')
      if (drawerContent) {
        drawerContent.style.paddingTop = `${insets.top}px`
        drawerContent.style.paddingRight = `${insets.right}px`
        drawerContent.style.paddingBottom = `${insets.bottom}px`
        drawerContent.style.paddingLeft = `${insets.left}px`
      }
    })
  }, [])

  const getMenuIcon = () => {
    const menuRounded = (
      <IconButton size='md' variant='plain' onClick={() => setDrawerOpen(true)}>
        <MenuRounded />
      </IconButton>
    )
    if (!Capacitor.isNativePlatform()) {
      return menuRounded
    }
    if (
      ['/chores', '/'].includes(location.pathname) &&
      !searchParams.get('filter')
    ) {
      return menuRounded
    }
    return (
      <IconButton
        size='md'
        variant='plain'
        onClick={() => {
          if (location.pathname === '/chores') {
            // Navigate back to calendar view
            navigate('/')
          } else {
            // Default back navigation
            navigate(-1)
          }
        }}
        title={
          searchParams.get('from') === 'calendar' ? t('backToCalendar') : t('back')
        }
      >
        <ArrowBack />
      </IconButton>
    )
  }

  if (
    [
      '/signup',
      '/login',
      '/auth/oauth2',
      '/forgot-password',
      '/login/settings',
      '/welcome',
    ].includes(location.pathname)
  ) {
    return (
      // no navbar but show the safe area padding
      <div
        style={{
          paddingTop: `calc(var(--safe-area-inset-top, 0px))`,
          top: 0,
        }}
      />
    )
  }
  // if url has /landing then remove the navbar:
  if (publicPages.includes(location.pathname)) {
    return null
  }
  if (
    window.location.hostname === 'www.donetick.com' ||
    window.location.hostname === 'donetick.com'
  ) {
    return null
  }

  return (
    <nav
      className='flex gap-2 p-3'
      style={{
        paddingTop:
          Capacitor.getPlatform() === 'android'
            ? `calc(var(--safe-area-inset-top, 0px))`
            : '',
        position: 'sticky',
        zIndex: Z_INDEX.NAVBAR,
        top: 0,
        minHeight: '35px',
        backgroundColor: 'var(--joy-palette-background-body)',
      }}
    >
      {getMenuIcon()}
      <Box className='flex-1' />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UserProfileAvatar />
        {/* <ThemeToggleButton /> */}
      </Box>
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        size='sm'
        onClick={closeDrawer}
        sx={{
          '& .MuiDrawer-content': {
            position: 'fixed',
            // pt: 'calc(var(--safe-area-inset-top, 0px))',
            left: 0,
            // pb: 'calc(var(--safe-area-inset-bottom, 0px))',
            // height:
            //   'calc(100vh - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))',
            overflow: 'auto',
            zIndex: Z_INDEX.DRAWER,
          },
        }}
      >
        <div>
          {/* <div className='align-center flex px-5 pt-4'>
            <ModalClose size='sm' sx={{ top: 'unset', right: 20 }} />
          </div> */}
          <List
            // sx={{ p: 2, height: 'min-content' }}

            size='md'
            onClick={openDrawer}
            sx={{
              borderRadius: 4,
              width: '100%',
              padding: 1,
              paddingTop:
                Capacitor.getPlatform() === 'android'
                  ? `calc(var(--safe-area-inset-top, 0px))`
                  : '',
            }}
          >
            {links.map((link, index) => (
              <NavBarLink key={index} link={link} />
            ))}
          </List>
        </div>
        <div>
          <List
            sx={{
              p: 2,
              height: 'min-content',
              position: 'absolute',
              bottom: 0,
              borderRadius: 4,
              width: '100%',
              padding: 2,
            }}
            size='md'
            onClick={openDrawer}
          >
            {/*  Add List item to invite the user to upgrade to Plus: */}
            {/* <ListItemButton
              onClick={() => navigate('/settings#subscription')}
              sx={{
                py: 1.2,
              }}
            >
              <ListItemDecorator>
                <SwitchAccessShortcutAdd />
              </ListItemDecorator>
              <ListItemContent>Upgrade to Plus</ListItemContent>
            </ListItemButton> */}
            <ListItemButton
              onClick={() => {
                apiClient.handleLogout()
              }}
              sx={{
                py: 1.2,
              }}
            >
              <ListItemDecorator>
                <Logout />
              </ListItemDecorator>
              <ListItemContent>{t('logout')}</ListItemContent>
            </ListItemButton>
            <Typography
              onClick={
                // force service worker to update:
                () => window.location.reload(true)
              }
              level='body-xs'
              sx={{
                // p: 2,
                p: 1,
                color: 'text.tertiary',
                textAlign: 'center',
                mb: 'calc(var(--safe-area-inset-bottom, 0px) )',
                // mb: -2,
              }}
            >
              V{version} (API: {resource?.api_version || 'unavailable'})
            </Typography>
          </List>
        </div>
      </Drawer>
    </nav>
  )
}

export default NavBar
