// create boilerplate for ResetPasswordView:
import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Input,
  Sheet,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Logo from '../../Logo'
import { useNotification } from '../../service/NotificationProvider'
import { ResetPassword } from '../../utils/Fetcher'

const ForgotPasswordView = () => {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [resetStatusOk, setResetStatusOk] = useState(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const { showError, showNotification } = useNotification()

  const validateEmail = email => {
    return !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)
  }

  const handleSubmit = async () => {
    if (!email) {
      return setEmailError(t('emailRequired'))
    }

    // validate email:
    if (validateEmail(email)) {
      setEmailError(t('invalidEmailAddress'))
      return
    }

    if (emailError) {
      return
    }

    try {
      const response = await ResetPassword(email)

      if (response.ok) {
        setResetStatusOk(true)
        showNotification({
          type: 'success',
          title: t('resetEmailSent'),
          message: t('resetEmailSentMsg'),
        })
      } else {
        setResetStatusOk(false)
        showError({
          title: t('resetFailed'),
          message: t('resetFailedMsg'),
        })
      }
    } catch (error) {
      setResetStatusOk(false)
      showError({
        title: t('resetFailed'),
        message: t('resetFailedMsg'),
      })
    }
  }

  const handleEmailChange = e => {
    setEmail(e.target.value)
    if (validateEmail(e.target.value)) {
      setEmailError(t('invalidEmailAddress'))
    } else {
      setEmailError(null)
    }
  }

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
          component='form'
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

          <Typography level='h2'>
            Done
            <span style={{ color: '#06b6d4' }}>tick</span>
          </Typography>
          {resetStatusOk === null && (
            <>
              <Typography level='body2' sx={{ mb: 3 }}>
                {t('forgotPrompt')}
              </Typography>

              <Typography level='body2' alignSelf={'start'} mb={1}>
                {t('emailAddress')}
              </Typography>
              <FormControl
                error={emailError !== null}
                sx={{ width: '100%', mb: 2 }}
              >
                <Input
                  margin='normal'
                  required
                  fullWidth
                  id='email'
                  placeholder={t('emailPlaceholder')}
                  type='email'
                  name='email'
                  autoComplete='email'
                  autoFocus
                  value={email}
                  onChange={handleEmailChange}
                  error={emailError !== null}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                />
                <FormHelperText>{emailError}</FormHelperText>
              </FormControl>

              <Button
                fullWidth
                size='lg'
                variant='solid'
                sx={{
                  width: '100%',
                  mt: 3,
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={handleSubmit}
              >
                {t('resetPassword')}
              </Button>

              <Button
                type='submit'
                fullWidth
                size='lg'
                variant='plain'
                sx={{
                  width: '100%',
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={() => {
                  navigate('/login')
                }}
                color='neutral'
              >
                {t('backToLogin')}
              </Button>
            </>
          )}
          {resetStatusOk != null && (
            <>
              <Typography
                level='body-md'
                sx={{ textAlign: 'center', mt: 2, mb: 3 }}
              >
                {t('resetSentInfo')}
              </Typography>

              <Button
                variant='solid'
                size='lg'
                fullWidth
                onClick={() => {
                  navigate('/login')
                }}
              >
                {t('goToLogin')}
              </Button>
            </>
          )}
        </Sheet>
      </Box>
    </Container>
  )
}

export default ForgotPasswordView
