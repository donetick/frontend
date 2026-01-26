import ipad_screenshot from '@/assets/ipad_dashbard_calendar.png'
import { Box, Container, Typography } from '@mui/joy'
const TabletInstallationSection = () => {
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
          Perfect for Tablet Installations
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
          Mount Donetick on your tablet for easy family task management. Perfect
          for kitchens, offices, or any shared space.
        </Typography>
      </Box>

      {/* Tablet Image Section */}
      <Box
        data-aos='fade-up'
        data-aos-duration='1000'
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: { xs: 4, md: 6 },
        }}
      >
        <img
          src={ipad_screenshot}
          alt='DoneTick dashboard with calendar view showing task management interface'
          style={{
            maxWidth: '90%',
            height: 'auto',
            borderRadius: '24px',
            border: '12px solid #2a2a2a',
            boxShadow:
              '0 25px 50px rgba(0, 0, 0, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)',
          }}
        />
      </Box>

      {/* Features Grid */}
      <Box
        data-aos='fade-up'
        data-aos-delay='200'
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 3, md: 4 },
          mt: { xs: 6, md: 8 },
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            background: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            level='title-lg'
            sx={{
              mb: 2,
              color: 'text.primary',
              fontWeight: 600,
            }}
          >
            Kitchen Ready
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
            }}
          >
            Perfect for family chore tracking. Mount it in your kitchen for
            everyone to see and update tasks easily.
          </Typography>
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            background: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            level='title-lg'
            sx={{
              mb: 2,
              color: 'text.primary',
              fontWeight: 600,
            }}
          >
            Office Dashboard
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
            }}
          >
            Transform any workspace with a dedicated task management display.
            Great for team collaboration and productivity.
          </Typography>
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            background: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            level='title-lg'
            sx={{
              mb: 2,
              color: 'text.primary',
              fontWeight: 600,
            }}
          >
            Always Accessible
          </Typography>
          <Typography
            level='body-md'
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
            }}
          >
            No need to reach for phones. With a mounted tablet, your task
            management is always visible and touchable.
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}

export default TabletInstallationSection
