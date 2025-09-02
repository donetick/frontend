import {
  AccountCircle,
  Api,
  Circle,
  Notifications,
  Palette,
  Person,
  Security,
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
  Grid,
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
      color: 'primary',
    },
    {
      id: 'circle',
      title: 'Circle Settings',
      description:
        'Manage your circle, invite members, handle join requests, and configure webhooks.',
      icon: <Circle />,
      color: 'success',
    },
    {
      id: 'account',
      title: 'Account Settings',
      description:
        'Manage your subscription, change password, and account deletion options.',
      icon: <AccountCircle />,
      color: 'warning',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description:
        'Configure push notifications, email alerts, and notification targets for tasks.',
      icon: <Notifications />,
      color: 'info',
    },
    {
      id: 'mfa',
      title: 'Multi-Factor Authentication',
      description:
        'Add an extra layer of security with MFA using authenticator apps.',
      icon: <Security />,
      color: 'danger',
    },
    {
      id: 'apitokens',
      title: 'API Tokens',
      description:
        'Generate and manage access tokens for third-party integrations and API access.',
      icon: <Api />,
      color: 'neutral',
    },
    {
      id: 'storage',
      title: 'Storage Settings',
      description:
        'Backup and restore your data, manage local storage and sync preferences.',
      icon: <Storage />,
      color: 'primary',
    },
    {
      id: 'sidepanel',
      title: 'Sidepanel Customization',
      description:
        'Customize the layout and visibility of cards in the sidepanel interface.',
      icon: <ViewSidebar />,
      color: 'success',
    },
    {
      id: 'theme',
      title: 'Theme Preferences',
      description:
        'Choose your preferred theme and configure dark/light mode settings.',
      icon: <Palette />,
      color: 'warning',
    },
  ]

  const handleCardClick = settingId => {
    navigate(`/settings/detailed#${settingId}`)
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
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid xs={12}>
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
              onClick={() => navigate('/settings/detailed#account')}
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
                      navigate('/settings/detailed#account')
                    }}
                  >
                    Upgrade Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        {settingsCards.map(setting => (
          <Grid key={setting.id} xs={4} sm={4} md={4}>
            <Card
              variant='outlined'
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: 'md',
                  transform: 'translateY(-2px)',
                  borderColor: `${setting.color}.500`,
                },
              }}
              onClick={() => handleCardClick(setting.id)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    mb: 1.5,
                  }}
                >
                  <Avatar
                    variant='soft'
                    color={setting.color}
                    sx={{ mb: 1, '--Avatar-size': '40px' }}
                  >
                    {setting.icon}
                  </Avatar>
                  <Typography level='title-sm' component='h3' sx={{ mb: 1 }}>
                    {setting.title}
                  </Typography>
                  <Typography
                    level='body-xs'
                    color='neutral'
                    sx={{
                      lineHeight: 1.4,
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    {setting.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

export default SettingsOverview
