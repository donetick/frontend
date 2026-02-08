import {
  AddHome,
  Android,
  Apple,
  AutoAwesome,
  Cloud,
  GitHub,
  InstallMobile,
  Storage,
} from '@mui/icons-material'
import { Box, Button, Card, Container, Grid, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'

function StartOptionCard({ icon: Icon, title, description, button, index }) {
  return (
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
        minHeight: { xs: 300, sm: 320 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          textAlign: 'center',
          mb: 3,
        }}
      >
        <Box
          className='option-icon'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 60, sm: 80 },
            height: { xs: 60, sm: 80 },
            borderRadius: { xs: 16, sm: 20 },
            background:
              'linear-gradient(135deg, var(--joy-palette-primary-50) 0%, var(--joy-palette-primary-100) 100%)',
            color: 'primary.500',
            mb: 3,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '& svg': {
              fontSize: { xs: 32, sm: 40 },
            },
          }}
        >
          {Icon}
        </Box>

        <Typography
          className='option-title'
          level='title-lg'
          sx={{
            fontSize: { xs: 20, sm: 24 },
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.3,
            transition: 'color 0.3s ease',
          }}
        >
          {title}
        </Typography>
      </Box>

      <Typography
        level='body-md'
        sx={{
          color: 'text.secondary',
          lineHeight: 1.6,
          fontSize: { xs: 14, sm: 15 },
          textAlign: 'center',
          mb: 3,
          flex: 1,
        }}
      >
        {description}
      </Typography>

      <Box sx={{ mt: 'auto' }}>{button}</Box>
    </Card>
  )
}

const GettingStarted = () => {
  const navigate = useNavigate()
  const information = [
    {
      title: 'Donetick Web',
      icon: <Cloud />,
      description:
        'The easiest way! Just create account and start using Donetick',
      button: (
        <Button
          size='lg'
          fullWidth
          startDecorator={<AutoAwesome />}
          onClick={() => {
            navigate('/chores')
          }}
        >
          Start Now!
        </Button>
      ),
    },
    {
      title: 'Selfhosted',
      icon: <Storage />,
      description: 'Download the binary and manage your own Donetick instance',
      button: (
        <Button
          size='lg'
          fullWidth
          startDecorator={<GitHub />}
          onClick={() => {
            window.open(
              'https://github.com/donetick/donetick/releases',
              '_blank',
            )
          }}
        >
          Github Releases
        </Button>
      ),
    },
    {
      title: 'Hassio Addon',
      icon: <AddHome />,
      description:
        'Have Home Assistant? Install Donetick as a Home Assistant Addon with single click',
      button: (
        <Button
          size='lg'
          fullWidth
          startDecorator={<InstallMobile />}
          onClick={() => {
            window.open(
              'https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdonetick%2Fhassio-addons',
            )
          }}
        >
          Add Addon
        </Button>
      ),
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
          Get Started Today
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
          Ready to transform your household management? Start with our mobile
          app for the best experience, or choose from our other convenient
          options.
        </Typography>
      </Box>

      {/* Mobile App CTA Section - Primary */}
      <Box
        textAlign='center'
        mb={{ xs: 8, sm: 10, md: 12 }}
        data-aos='fade-up'
        data-aos-duration='800'
      >
        <Box
          sx={{
            p: { xs: 5, sm: 6, md: 7 },
            borderRadius: { xs: 20, md: 24 },
            background:
              'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.12) 100%)',
            border: '2px solid rgba(6, 182, 212, 0.2)',
            maxWidth: { xs: '100%', sm: 650, md: 700 },
            mx: 'auto',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,

              pointerEvents: 'none',
            },
          }}
        >
          <Typography
            level='body-lg'
            sx={{
              color: 'text.secondary',
              mb: { xs: 4, sm: 5 },
              lineHeight: 1.6,
              fontSize: { xs: 16, sm: 17 },
              position: 'relative',
              zIndex: 1,
              px: { xs: 0, sm: 2 },
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Get the full Donetick experience with notifications, realtime
            updates, and seamless task management on the go
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 3, sm: 4 },
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* App Store Badge */}
            <Box
              onClick={() => {
                window.open(
                  'https://apps.apple.com/app/apple-store/id6742807441?pt=127258663&ct=website&mt=8',
                  '_blank',
                )
              }}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#000000',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  minWidth: { xs: 200, sm: 180 },
                  height: 60,
                  border: '1px solid #333',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Apple sx={{ color: 'white', fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography
                    level='body-xs'
                    sx={{
                      color: 'white',
                      fontSize: 11,
                      lineHeight: 1,
                      mb: 0.5,
                      fontWeight: 400,
                    }}
                  >
                    Download on the
                  </Typography>
                  <Typography
                    level='title-md'
                    sx={{
                      color: 'white',
                      fontSize: 18,
                      lineHeight: 1,
                      fontWeight: 600,
                    }}
                  >
                    App Store
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Google Play Badge */}
            <Box
              onClick={() => {
                window.open(
                  'https://play.google.com/store/apps/details?id=com.donetick.app',
                  '_blank',
                )
              }}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  background:
                    'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  minWidth: { xs: 200, sm: 180 },
                  height: 60,
                  border: '1px solid #333',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Box
                  sx={{
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                  }}
                >
                  <Android sx={{ color: 'white', fontSize: 40 }} />
                </Box>
                <Box>
                  <Typography
                    level='body-xs'
                    sx={{
                      color: 'white',
                      fontSize: 11,
                      lineHeight: 1,
                      mb: 0.5,
                      fontWeight: 400,
                    }}
                  >
                    Download for
                  </Typography>
                  <Typography
                    level='title-md'
                    sx={{
                      color: 'white',
                      fontSize: 18,
                      lineHeight: 1,
                      fontWeight: 600,
                    }}
                  >
                    Android
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Alternative Options Section */}
      <Box textAlign='center' mb={{ xs: 4, md: 6 }} data-aos='fade-up'>
        <Typography
          level='h4'
          sx={{
            fontSize: { xs: 20, sm: 22, md: 24 },
            fontWeight: 600,
            mb: { xs: 1, md: 1.5 },
            color: 'text.primary',
          }}
        >
          Other Ways to Get Started
        </Typography>
        <Typography
          level='body-md'
          sx={{
            color: 'text.secondary',
            maxWidth: 500,
            mx: 'auto',
            fontSize: { xs: 14, sm: 15 },
          }}
        >
          Prefer a different setup? Choose from these alternatives
        </Typography>
      </Box>

      {/* Options Grid */}
      <Grid container spacing={{ xs: 3, sm: 4, md: 4 }}>
        {information.map((info, index) => (
          <Grid item xs={12} md={4} key={index}>
            <StartOptionCard
              icon={info.icon}
              title={info.title}
              description={info.description}
              button={info.button}
              index={index}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

export default GettingStarted
