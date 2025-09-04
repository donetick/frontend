import {
  Analytics,
  Api,
  Assignment,
  AutoAwesome,
  CalendarMonth,
  EmojiEvents,
  Groups,
  Notifications,
  Psychology,
  Schedule,
  Security,
  Settings,
  Timer,
} from '@mui/icons-material'
import { Box, Card, Container, Grid, Typography, useTheme } from '@mui/joy'

const FeaturesSection = () => {
  const theme = useTheme()

  const features = [
    {
      icon: <Psychology />,
      title: 'Natural Language Input',
      description:
        'Add tasks just by typing. Donetick understands dates, priorities, labels. you can have quickest way to add tasks.',
    },
    {
      icon: <Groups />,
      title: 'Collaboration',
      description:
        'Create groups for family, friends, or teams. Share, assign, and manage tasks together.',
    },
    {
      icon: <EmojiEvents />,
      title: 'Gamification and Points',
      description:
        'Earn points, climb leaderboards for completing tasks. You can even require admin approval for points!',
    },
    {
      icon: <CalendarMonth />,
      title: 'Visual Calendar View',
      description:
        'See all your tasks in a color-coded calendar. Filter by assignee, view daily agendas, and plan with ease.',
    },
    {
      icon: <Schedule />,
      title: 'Smart Scheduling',
      description:
        'Flexible recurring tasks: daily, weekly, monthly, or custom intervals. Choose rolling or fixed schedules and set completion windows to fit any routine.',
    },
    {
      icon: <Assignment />,
      title: 'Automatic Task Assignment',
      description:
        'Distribute tasks fairly using smart algorithms: round-robin, least busy, random, or custom rules. No more manual juggling.',
    },
    {
      icon: <Timer />,
      title: 'Built-in Time Tracking',
      description:
        'Track work sessions with a timer, review detailed logs, and analyze productivity patterns for every task.',
    },
    {
      icon: <AutoAwesome />,
      title: 'Advanced Organization',
      description:
        'Break down tasks with subtasks, set priorities, add labels and tags, and use templates for quick setup.',
    },
    {
      icon: <Settings />,
      title: 'Advanced Task Settings',
      description:
        'Configure task-specific settings like completion windows, custom point values, and require admin approval for tasks.',
    },
    {
      icon: <Analytics />,
      title: 'Insightful Analytics',
      description:
        'Track progress, view completion history, and spot trends with clear reports and visualizations.',
    },
    {
      icon: <Notifications />,
      title: 'Smart Notifications',
      description:
        'Get timely reminders via Donetick app or other way like Telegram, push, or webhooks.',
    },
    {
      icon: <Api />,
      title: 'Seamless Integrations',
      description:
        'Connect with REST API, webhooks, and automation tools. Import, export, and trigger actions to fit your workflows.',
    },
    {
      icon: <Security />,
      title: 'Privacy & Security',
      description:
        'Open-source and transparent. For security, you can secure your account with 2FA.',
    },
  ]

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 6, sm: 8, md: 12 } }}>
      {/* Section Header */}
      <Box textAlign='center' mb={{ xs: 6, md: 8 }} data-aos='fade-up'>
        <Typography
          level='h2'
          sx={{
            fontSize: { xs: 28, sm: 36, md: 42, lg: 48 },
            fontWeight: 700,
            mb: { xs: 2, md: 3 },
            color: 'text.primary',
            lineHeight: { xs: 1.2, md: 1.1 },
            background:
              'linear-gradient(135deg, var(--joy-palette-primary-500) 0%, var(--joy-palette-primary-600) 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
          }}
        >
          Simple Yet Powerful Features
        </Typography>
        <Typography
          level='body-lg'
          sx={{
            fontSize: { xs: 16, sm: 17, md: 18, lg: 19 },
            color: 'text.secondary',
            maxWidth: { xs: '100%', sm: 600, md: 700 },
            mx: 'auto',
            lineHeight: 1.6,
            px: { xs: 1, sm: 0 },
          }}
        >
          Donetick helps you stay organized, motivated, and productive with a
          suite of powerful features designed for individuals and groups.
        </Typography>
      </Box>

      {/* Features Grid */}
      <Grid container spacing={{ xs: 3, sm: 4, md: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card
              data-aos='fade-up'
              data-aos-delay={index * 100}
              data-aos-duration='800'
              variant='outlined'
              sx={{
                p: { xs: 3, sm: 4, md: 4 },
                height: '100%',
                borderRadius: { xs: 16, md: 20 },
                border: '1px solid',
                borderColor: 'divider',
                background: 'background.surface',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                minHeight: { xs: 200, sm: 220 },
                display: 'flex',
                flexDirection: 'column',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background:
                    'linear-gradient(90deg, var(--joy-palette-primary-400) 0%, var(--joy-palette-primary-600) 100%)',
                  transform: 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 0.4s ease',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    'linear-gradient(135deg, rgba(6, 182, 212, 0.02) 0%, rgba(8, 145, 178, 0.04) 100%)',
                  opacity: 0,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: 'none',
                },
                '@media (max-width: 600px)': {
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                },
              }}
            >
              {/* Icon and Title Row (mobile) / Separate (desktop) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'center', sm: 'flex-start' },
                  flexDirection: { xs: 'row', sm: 'column' },
                  gap: { xs: 2, sm: 0 },
                  mb: { xs: 1.5, sm: 0 },
                }}
              >
                <Box
                  className='feature-icon'
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: { xs: 40, sm: 60 },
                    height: { xs: 40, sm: 60 },
                    borderRadius: { xs: 10, sm: 16 },
                    background:
                      'linear-gradient(135deg, var(--joy-palette-primary-50) 0%, var(--joy-palette-primary-100) 100%)',
                    color: 'primary.500',
                    mb: { xs: 0, sm: 3 },
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                    '& svg': {
                      fontSize: { xs: 20, sm: 28 },
                    },
                  }}
                >
                  {feature.icon}
                </Box>

                <Typography
                  className='feature-title'
                  level='title-lg'
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 700,
                    mb: { xs: 0, sm: 2 },
                    color: 'text.primary',
                    lineHeight: 1.3,
                    transition: 'color 0.3s ease',
                    flex: 1,
                  }}
                >
                  {feature.title}
                </Typography>
              </Box>

              {/* Description */}
              <Typography
                level='body-md'
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  fontSize: { xs: 14, sm: 15 },
                  flex: 1,
                }}
              >
                {feature.description}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bottom CTA Section */}
      <Box
        textAlign='center'
        mt={{ xs: 8, sm: 10, md: 12 }}
        data-aos='fade-up'
        data-aos-duration='800'
      ></Box>
    </Container>
  )
}

export default FeaturesSection
