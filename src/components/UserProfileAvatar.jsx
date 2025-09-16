import {
  AdminPanelSettings,
  DarkModeOutlined,
  GroupAdd,
  LightModeOutlined,
  Logout,
  Person,
  Settings,
  SwapHoriz,
  Tune,
  WorkspacePremium,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Divider,
  Dropdown,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
  useColorScheme,
} from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import moment from 'moment'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImpersonateUser } from '../contexts/ImpersonateUserContext'
import useStickyState from '../hooks/useStickyState'
import { useCircleMembers, useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import UserModal from '../views/Modals/Inputs/UserModal'
import SubscriptionModal from './SubscriptionModal'

const UserProfileAvatar = () => {
  const navigate = useNavigate()
  const { mode, setMode } = useColorScheme()
  const { data: userProfile } = useUserProfile()
  const {
    isImpersonating,
    startImpersonation,
    stopImpersonation,
    canImpersonate,
    getEffectiveUser,
  } = useImpersonateUser()
  const { data: circleMembersData } = useCircleMembers()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [themeMode, setThemeMode] = useStickyState(mode, 'themeMode')
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('lg'))

  if (!userProfile) return null

  const currentUser = getEffectiveUser(userProfile)
  const isAdmin = canImpersonate(userProfile, circleMembersData?.res)
  const isPlusUser = isPlusAccount(userProfile)

  const getSubscriptionStatus = () => {
    if (!userProfile) return 'Free'

    if (userProfile.subscription === 'active') {
      return 'Plus'
    }

    if (
      userProfile.subscription === 'cancelled' &&
      moment().isBefore(userProfile.expiration)
    ) {
      return 'Plus (expires soon)'
    }

    return 'Free'
  }

  const handleLogout = () => {
    localStorage.removeItem('ca_token')
    localStorage.removeItem('ca_expiration')
    window.location.href = '/login'
  }

  const handleSupportEmail = () => {
    window.location.href = 'mailto:support@donetick.com'
  }

  const isDarkMode = themeMode === 'dark'

  const handleThemeToggle = () => {
    const newThemeMode = isDarkMode ? 'light' : 'dark'
    setThemeMode(newThemeMode)
    setMode(newThemeMode)
  }

  return (
    <>
      <Dropdown>
        <MenuButton
          variant='plain'
          sx={{
            p: 0,
            border: 'none',
            backgroundColor: 'transparent',
            borderRadius: '50%',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              // transform: 'scale(1.05)',
              // transition: 'all 0.2s ease',
            },
            '&:active': {
              // transform: 'scale(0.95)',
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            {isImpersonating ? (
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={currentUser?.image || currentUser?.avatar}
                  alt={currentUser?.displayName || currentUser?.name}
                  size='md'
                  sx={{
                    width: 36,
                    height: 36,
                    border: '2px solid var(--joy-palette-background-surface)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Avatar
                  src={userProfile?.image || userProfile?.avatar}
                  alt={userProfile?.displayName || userProfile?.name}
                  size='sm'
                  sx={{
                    position: 'absolute',
                    bottom: -2,
                    left: -2,
                    width: 18,
                    height: 18,
                    border: '2px solid var(--joy-palette-background-surface)',
                    backgroundColor: 'var(--joy-palette-background-surface)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: 'var(--joy-palette-primary-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--joy-palette-background-surface)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  <SwapHoriz sx={{ fontSize: 8, color: 'white' }} />
                </Box>
              </Box>
            ) : (
              <Avatar
                src={currentUser?.image || currentUser?.avatar}
                alt={currentUser?.displayName || currentUser?.name}
                size='md'
                sx={{
                  width: 36,
                  height: 36,
                  border: '2px solid var(--joy-palette-background-surface)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
            )}
          </Box>
        </MenuButton>
        <Menu
          placement='bottom-end'
          sx={{
            minWidth: 280,
            p: 1,
            '--List-gap': '4px',
            boxShadow: 'var(--joy-shadow-lg)',
            border: '1px solid var(--joy-palette-divider)',
            borderRadius: 'var(--joy-radius-md)',
          }}
        >
          <Sheet sx={{ p: 2, borderRadius: 'var(--joy-radius-sm)', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={currentUser?.image || currentUser?.avatar}
                alt={currentUser?.displayName || currentUser?.name}
                size='lg'
                sx={{
                  width: 48,
                  height: 48,
                  border: '2px solid var(--joy-palette-background-surface)',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  level='title-md'
                  sx={{
                    fontWeight: 600,
                    color: 'var(--joy-palette-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.25,
                  }}
                >
                  {currentUser?.displayName || currentUser?.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {currentUser?.email}
                  </Typography>
                  {isPlusUser && (
                    <Typography
                      level='body-xs'
                      sx={{
                        color: 'var(--joy-palette-warning-600)',
                        fontWeight: 500,
                        fontSize: '11px',
                      }}
                    >
                      {getSubscriptionStatus()}
                    </Typography>
                  )}
                </Box>
                {isImpersonating && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                      px: 1,
                      py: 0.25,
                      backgroundColor: 'var(--joy-palette-primary-softBg)',
                      borderRadius: 'var(--joy-radius-sm)',
                      width: 'fit-content',
                    }}
                  >
                    <SwapHoriz
                      sx={{
                        fontSize: 12,
                        color: 'var(--joy-palette-primary-600)',
                      }}
                    />
                    <Typography
                      level='body-xs'
                      sx={{
                        color: 'var(--joy-palette-primary-600)',
                        fontWeight: 500,
                      }}
                    >
                      Impersonating
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Sheet>

          {isAdmin && (
            <>
              <MenuItem
                onClick={() => setIsModalOpen(true)}
                sx={{
                  borderRadius: 'var(--joy-radius-sm)',
                  '&:hover': {
                    backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                  },
                }}
              >
                <ListItemDecorator
                  sx={{ color: 'var(--joy-palette-primary-500)' }}
                >
                  <AdminPanelSettings />
                </ListItemDecorator>
                <ListItemContent>
                  <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                    {isImpersonating ? 'Switch User' : 'Impersonate User'}
                  </Typography>
                  <Typography
                    level='body-xs'
                    sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                  >
                    Act as another user
                  </Typography>
                </ListItemContent>
              </MenuItem>

              {isImpersonating && (
                <MenuItem
                  onClick={() => stopImpersonation()}
                  sx={{
                    borderRadius: 'var(--joy-radius-sm)',
                    '&:hover': {
                      backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                    },
                  }}
                >
                  <ListItemDecorator
                    sx={{ color: 'var(--joy-palette-success-500)' }}
                  >
                    <Person />
                  </ListItemDecorator>
                  <ListItemContent>
                    <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                      Stop Impersonating
                    </Typography>
                    <Typography
                      level='body-xs'
                      sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                    >
                      Return to your account
                    </Typography>
                  </ListItemContent>
                </MenuItem>
              )}

              <Divider sx={{ my: 1 }} />
            </>
          )}

          <MenuItem
            onClick={() => navigate('/settings')}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
              <Settings />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                Settings
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                Account & preferences
              </Typography>
            </ListItemContent>
          </MenuItem>

          <MenuItem
            onClick={() => navigate('/settings/circle')}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-primary-500)' }}>
              <GroupAdd />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                Invite People
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                Add members to your circle
              </Typography>
            </ListItemContent>
          </MenuItem>
          {isLargeScreen && (
            <MenuItem
              onClick={() => navigate('/settings/detailed#sidepanel')}
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator
                sx={{ color: 'var(--joy-palette-neutral-500)' }}
              >
                <Tune />
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                  Side Panel Settings
                </Typography>
                <Typography
                  level='body-xs'
                  sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                >
                  Customize layout & cards
                </Typography>
              </ListItemContent>
            </MenuItem>
          )}

          <MenuItem
            onClick={handleThemeToggle}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
              {isDarkMode ? <LightModeOutlined /> : <DarkModeOutlined />}
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                Toggle theme appearance
              </Typography>
            </ListItemContent>
          </MenuItem>

          {!isPlusUser && (
            <MenuItem
              onClick={() => setIsSubscriptionModalOpen(true)}
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-warning-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator
                sx={{ color: 'var(--joy-palette-warning-500)' }}
              >
                <WorkspacePremium />
              </ListItemDecorator>
              <ListItemContent>
                <Typography
                  level='body-sm'
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  Upgrade to Plus
                </Typography>
                <Typography level='body-xs'>Unlock premium features</Typography>
              </ListItemContent>
            </MenuItem>
          )}

          {/* <MenuItem
            onClick={handleSupportEmail}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-info-500)' }}>
              <Email />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                Support
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                support@donetick.com
              </Typography>
            </ListItemContent>
          </MenuItem> */}

          <Divider sx={{ my: 1 }} />

          <MenuItem
            onClick={handleLogout}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-danger-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-danger-500)' }}>
              <Logout />
            </ListItemDecorator>
            <ListItemContent>
              <Typography
                level='body-sm'
                sx={{ fontWeight: 500, color: 'var(--joy-palette-danger-500)' }}
              >
                Logout
              </Typography>
            </ListItemContent>
          </MenuItem>
        </Menu>
      </Dropdown>

      <UserModal
        isOpen={isModalOpen}
        performers={circleMembersData?.res}
        onSelect={user => {
          startImpersonation(user, userProfile)
          setIsModalOpen(false)
        }}
        onClose={() => setIsModalOpen(false)}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </>
  )
}

export default UserProfileAvatar
