import Logo from '@/assets/logo.svg'
import {
  Archive,
  ArrowBack,
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

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { version } from '../../../package.json'
import UserProfileAvatar from '../../components/UserProfileAvatar'
import ThemeToggleButton from '../Settings/ThemeToggleButton'
import NavBarLink from './NavBarLink'
const links = [
  {
    to: '/chores',
    label: 'All Tasks',
    icon: <Inbox />,
  },
  {
    to: '/archived',
    label: 'Archived',
    icon: <Archive />,
  },

  // {
  //   to: '/chores',
  //   label: 'Desktop View',
  //   icon: <ListAltRounded />,
  // },
  {
    to: '/things',
    label: 'Things',
    icon: <Widgets />,
  },
  {
    to: 'labels',
    label: 'Labels',
    icon: <ListAlt />,
  },
  {
    to: 'activities',
    label: 'Activities',
    icon: <History />,
  },
  {
    to: 'points',
    label: 'Points',
    icon: <Toll />,
  },
  // {
  //   to: '/settings#sharing',
  //   label: 'Sharing',
  //   icon: <ShareOutlined />,
  // },
  // {
  //   to: '/settings#notifications',
  //   label: 'Notifications',
  //   icon: <Message />,
  // },
  // {
  //   to: '/settings#account',
  //   label: 'Account',
  //   icon: <AccountBox />,
  // },
  {
    to: '/settings',
    label: 'Settings',
    icon: <SettingsOutlined />,
  },
]

import Z_INDEX from '../../constants/zIndex'

const NavBar = () => {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openDrawer, closeDrawer] = [
    () => setDrawerOpen(true),
    () => setDrawerOpen(false),
  ]
  const location = useLocation()
  // if url has /landing then remove the navbar:
  if (
    ['/signup', '/login', '/landing', '/forgot-password'].includes(
      location.pathname,
    )
  ) {
    return null
  }
  if (
    location.pathname === '/' &&
    import.meta.env.VITE_IS_LANDING_DEFAULT === 'true'
  ) {
    return null
  }

  return (
    <nav
      className='flex gap-2 p-3'
      style={{
        paddingTop: `calc(var(--safe-area-inset-top, 0px) + 12px)`,
        position: 'sticky',
        zIndex: Z_INDEX.NAVBAR,
        top: 0,
        minHeight: '45px',
        backgroundColor: 'var(--joy-palette-background-body)',
      }}
    >
      {['/chores', '/'].includes(location.pathname) ? (
        <IconButton
          size='md'
          variant='plain'
          onClick={() => setDrawerOpen(true)}
        >
          <MenuRounded />
        </IconButton>
      ) : (
        <IconButton size='md' variant='plain' onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
      )}
      <Box className='flex-1' />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UserProfileAvatar />
        <ThemeToggleButton />
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
            sx={{ borderRadius: 4, width: '100%', padding: 1 }}
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
                localStorage.removeItem('ca_token')
                localStorage.removeItem('ca_expiration')
                // go to login page:
                window.location.href = '/login'
              }}
              sx={{
                py: 1.2,
              }}
            >
              <ListItemDecorator>
                <Logout />
              </ListItemDecorator>
              <ListItemContent>Logout</ListItemContent>
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
              V{version}
            </Typography>
          </List>
        </div>
      </Drawer>
    </nav>
  )
}

export default NavBar
