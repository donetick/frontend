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
  Timer,
} from '@mui/icons-material'
import { Box, Card, Container, Grid, Typography, useTheme } from '@mui/joy'

const FeaturesSection = () => {
  const theme = useTheme()

  const features = [
    {
      icon: <Schedule />,
      title: 'Smart Scheduling',
      description:
        'Flexible recurring tasks: daily, weekly, monthly, or custom intervals. Choose rolling or fixed schedules and set completion windows to fit any routine.',
    },
    {
      icon: <Groups />,
      title: 'Collaboration',
      description:
        'Create groups for family, friends, or teams. Share, assign, and manage tasks together.',
    },
    {
      icon: <EmojiEvents />,
      title: 'Motivating Gamification',
      description:
        'Earn points, climb leaderboards, and unlock achievements for completing tasks. Make productivity fun and rewarding.',
    },
    {
      icon: <Assignment />,
      title: 'Automatic Task Assignment',
      description:
        'Distribute tasks fairly using smart algorithms: round-robin, least busy, random, or custom rules. No more manual juggling.',
    },
    {
      icon: <Analytics />,
      title: 'Insightful Analytics',
      description:
        'Track progress, view completion history, and spot trends with clear reports and visualizations. Understand your productivity at a glance.',
    },
    {
      icon: <AutoAwesome />,
      title: 'Advanced Organization',
      description:
        'Break down tasks with subtasks, set priorities, add labels and tags, and use templates for quick setup. Stay organized your way.',
    },
    {
      icon: <Notifications />,
      title: 'Smart Notifications',
      description:
        'Get timely reminders via email, Telegram, push, or webhooks. Customize alerts so you never miss what matters.',
    },
    {
      icon: <Api />,
      title: 'Seamless Integrations',
      description:
        'Connect with REST API, webhooks, and automation tools. Import, export, and trigger actions to fit your workflow.',
    },
    {
      icon: <Security />,
      title: 'Privacy & Security',
      description:
        'Open-source and secure by design. Choose cloud or self-hosting for full control over your data.',
    },
    {
      icon: <Timer />,
      title: 'Built-in Time Tracking',
      description:
        'Track work sessions with a timer, review detailed logs, and analyze productivity patterns for every task.',
    },
    {
      icon: <Psychology />,
      title: 'Natural Language Input',
      description:
        'Add tasks just by typing. Our AI understands dates, priorities, labels, and more—no forms needed.',
    },
    {
      icon: <CalendarMonth />,
      title: 'Visual Calendar View',
      description:
        'See all your tasks in a color-coded calendar. Filter by assignee, view daily agendas, and plan with ease.',
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
                '&:hover': {
                  transform: { xs: 'translateY(-4px)', sm: 'translateY(-8px)' },
                  boxShadow: {
                    xs: '0 15px 30px rgba(0, 0, 0, 0.08)',
                    sm: '0 25px 50px rgba(0, 0, 0, 0.1)',
                  },
                  borderColor: 'primary.200',
                  '&::before': {
                    transform: 'scaleX(1)',
                  },
                  '&::after': {
                    opacity: 1,
                  },
                  '& .feature-icon': {
                    transform: {
                      xs: 'scale(1.05)',
                      sm: 'scale(1.1) rotate(5deg)',
                    },
                    background:
                      'linear-gradient(135deg, var(--joy-palette-primary-500) 0%, var(--joy-palette-primary-600) 100%)',
                    color: 'primary.50',
                    boxShadow: '0 8px 20px rgba(6, 182, 212, 0.3)',
                  },
                  '& .feature-title': {
                    color: 'primary.600',
                  },
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
      >
        <Box
          sx={{
            p: { xs: 4, sm: 5, md: 6 },
            borderRadius: { xs: 20, md: 24 },
            background:
              'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(8, 145, 178, 0.08) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            maxWidth: { xs: '100%', sm: 550, md: 600 },
            mx: 'auto',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Typography
            level='h3'
            sx={{
              fontSize: { xs: 22, sm: 26, md: 28 },
              fontWeight: 700,
              mb: { xs: 1.5, sm: 2 },
              color: 'text.primary',
              lineHeight: 1.2,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Ready to Transform Your Task Management?
          </Typography>
          <Typography
            level='body-lg'
            sx={{
              color: 'text.secondary',
              mb: { xs: 3, sm: 4 },
              lineHeight: 1.6,
              fontSize: { xs: 15, sm: 16 },
              position: 'relative',
              zIndex: 1,
              px: { xs: 0, sm: 2 },
            }}
          >
            Join thousands who have streamlined their workflows with Donetick's
            powerful features
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}

export default FeaturesSection
