import { Box, CircularProgress, Typography } from '@mui/joy'
import { styled } from '@mui/joy/styles'

// Styled components with keyframe animations
const LoadingContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: theme.vars.palette.background.body,
  color: theme.vars.palette.text.primary,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  animation: 'fadeIn 0.3s ease-out',
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
}))

const LoadingContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '24px',
  animation: 'slideUp 0.5s ease-out 0.2s both',
  '@keyframes slideUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
})

const PulsingText = styled(Typography)({
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
  },
})

const LogoContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '24px',
})

import { useTranslation } from 'react-i18next'

const LoadingScreen = ({ message = null, showLogo = true, size = 'lg' }) => {
  const { t } = useTranslation('common')
  return (
    <LoadingContainer>
      <LoadingContent>
        {showLogo && (
          <LogoContainer>
            <Typography
              level='h1'
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 700,
                color: 'text.primary',
                mb: 1,
              }}
            >
              {t('done')}
              <Box component='span' sx={{ color: 'primary.plainColor' }}>
                tick
              </Box>
            </Typography>
          </LogoContainer>
        )}

        <CircularProgress
          color='primary'
          size={size}
          sx={{
            '--CircularProgress-size': size === 'lg' ? '60px' : '40px',
            mb: 2,
          }}
        />

        <PulsingText level='body-md'>{message ?? t('loading')}</PulsingText>
      </LoadingContent>
    </LoadingContainer>
  )
}

export default LoadingScreen
