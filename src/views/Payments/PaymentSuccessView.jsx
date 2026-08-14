import { Box, Container, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../../Logo'

const PaymentSuccessView = () => {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/settings')
    }, 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <Container component='main' maxWidth='xs'>
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Sheet
          sx={{
            mt: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 2,
            borderRadius: '8px',
            boxShadow: 'md',
          }}
        >
          <Logo />
          <Typography level='h2' sx={{ mt: 2, mb: 1 }}>
            {t('payment.successTitle')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('payment.successRedirect')}
          </Typography>
        </Sheet>
      </Box>
    </Container>
  )
}

export default PaymentSuccessView
