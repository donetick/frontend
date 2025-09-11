import {
  AccountCircle,
  Api,
  ChevronRight,
  Circle,
  Notifications,
  Palette,
  Person,
  Security,
  Settings,
  Star,
  Storage,
  ViewSidebar,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Typography,
} from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'

const SettingsOverview = () => {
  const navigate = useNavigate()
  const { data: userProfile } = useUserProfile()

  const settingsCards = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description:
        'Update your profile information, photo, display name, and timezone preferences.',
      icon: <Person />,
    },
    {
      id: 'circle',
      title: 'Circle Settings',
      description:
        'Manage your circle, invite members, and handle join requests.',
      icon: <Circle />,
    },
    {
      id: 'account',
      title: 'Account Settings',
      description:
        'Manage your subscription, change password, and account deletion options.',
      icon: <AccountCircle />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description:
        'Configure push notifications, email alerts, and notification targets for tasks.',
      icon: <Notifications />,
    },
    {
      id: 'mfa',
      title: 'Multi-Factor Authentication',
      description:
        'Add an extra layer of security with MFA using authenticator apps.',
      icon: <Security />,
    },
    {
      id: 'apitokens',
      title: 'API Tokens',
      description:
        'Generate and manage access tokens for third-party integrations and API access.',
      icon: <Api />,
    },
    {
      id: 'storage',
      title: 'Storage Settings',
      description:
        'Backup and restore your data, manage local storage and sync preferences.',
      icon: <Storage />,
    },
    {
      id: 'sidepanel',
      title: 'Sidepanel Customization',
      description:
        'Customize the layout and visibility of cards in the sidepanel interface.',
      icon: <ViewSidebar />,
    },
    {
      id: 'theme',
      title: 'Theme Preferences',
      description:
        'Choose your preferred theme and configure dark/light mode settings.',
      icon: <Palette />,
    },
    {
      id: 'advanced',
      title: 'Advanced Settings',
      description:
        'Configure webhooks, real-time updates, and other advanced features for enhanced productivity.',
      icon: <Settings />,
    },
  ]

  const handleCardClick = settingId => {
    navigate(`/settings/${settingId}`)
  }

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {/* <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} /> */}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            Settings
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Customize your experience and manage your account preferences
          </Typography>
        </Stack>
      </Box>

      {/* Upgrade Card - Only show if user is not a Plus member */}
      {userProfile && !isPlusAccount(userProfile) && (
        <Box sx={{ mb: 3 }}>
          <Card
            variant='outlined'
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              border: 'none',
              color: 'white',
              '&:hover': {
                boxShadow: 'xl',
                transform: 'translateY(-3px)',
              },
            }}
            onClick={() => navigate('/settings/account')}
          >
            <CardContent sx={{ p: { xs: 1.5, md: 3 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: { xs: 1.5, md: 2 },
                  textAlign: { xs: 'center', md: 'left' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: 1, md: 3 },
                    width: { xs: '100%', md: 'auto' },
                  }}
                >
                  <Avatar
                    sx={{
                      '--Avatar-size': { xs: '36px', md: '60px' },
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Star
                      sx={{ fontSize: { xs: 18, md: 30 }, color: 'white' }}
                    />
                  </Avatar>
                  <Box>
                    <Typography
                      level='title-lg'
                      sx={{
                        color: 'white',
                        mb: { xs: 0.25, md: 0.5 },
                        fontWeight: 'bold',
                        fontSize: { xs: '0.95rem', md: '1.25rem' },
                      }}
                    >
                      Upgrade to Plus
                    </Typography>
                    <Typography
                      level='body-md'
                      sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        mb: { xs: 0.5, md: 1 },
                        fontSize: { xs: '0.75rem', md: '1rem' },
                        lineHeight: { xs: 1.3, md: 1.5 },
                      }}
                    >
                      Unlock powerful features to enhance your productivity
                    </Typography>
                    <Box
                      sx={{
                        display: { xs: 'none', sm: 'flex' },
                        flexWrap: 'wrap',
                        gap: 1,
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      <span>• Rich text descriptions</span>
                      <span>• Task notifications</span>
                      <span>• API integrations</span>
                      <span>• Advanced automation</span>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant='solid'
                  size='sm'
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(10px)',
                    px: { xs: 1.5, md: 3 },
                    py: { xs: 0.5, md: 1.5 },
                    fontWeight: 'bold',
                    minWidth: { xs: '80px', md: '120px' },
                    width: { xs: '100%', md: 'auto' },
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                      transform: 'scale(1.05)',
                    },
                  }}
                  onClick={e => {
                    e.stopPropagation()
                    navigate('/settings/account')
                  }}
                >
                  Upgrade Now
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{ mx: 'auto' }}>
        <List
          sx={{
            '--List-gap': '0px',
            '--ListItem-paddingY': '16px',
            '--ListItem-paddingX': '20px',
          }}
        >
          {settingsCards.map((setting, index) => (
            <ListItem key={setting.id} sx={{ p: 0 }}>
              <ListItemButton
                onClick={() => handleCardClick(setting.id)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'background.level1',
                  },
                  py: 2.5,
                  px: 3,
                  borderRadius: 'lg',
                  mb: 1,
                }}
              >
                <ListItemDecorator>
                  <Avatar
                    variant='soft'
                    color='neutral'
                    sx={{ '--Avatar-size': '48px' }}
                  >
                    {setting.icon}
                  </Avatar>
                </ListItemDecorator>
                <ListItemContent sx={{ ml: 2 }}>
                  <Typography
                    level='title-md'
                    sx={{ mb: 0.5, fontWeight: 'lg' }}
                  >
                    {setting.title}
                  </Typography>
                  <Typography
                    level='body-sm'
                    color='neutral'
                    sx={{ lineHeight: 1.4 }}
                  >
                    {setting.description}
                  </Typography>
                </ListItemContent>
                <ChevronRight
                  sx={{ color: 'text.tertiary', fontSize: '20px' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  )
}

export default SettingsOverview
