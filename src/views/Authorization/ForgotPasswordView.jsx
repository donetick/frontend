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
  const { t } = useTranslation(['auth', 'common'])
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
      return setEmailError(t('auth:errors.emailRequired'))
    }

    // validate email:
    if (validateEmail(email)) {
      setEmailError(t('auth:errors.validEmail'))
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
          title: t('auth:errors.resetEmailSentTitle'),
          message: t('auth:errors.resetEmailSentMessage'),
        })
      } else {
        setResetStatusOk(false)
        showError({
          title: t('auth:errors.resetFailedTitle'),
          message: t('auth:errors.resetFailedMessage'),
        })
      }
    } catch (error) {
      setResetStatusOk(false)
      showError({
        title: t('auth:errors.resetFailedTitle'),
        message: t('auth:errors.resetFailedMessage'),
      })
    }
  }

  const handleEmailChange = e => {
    setEmail(e.target.value)
    if (validateEmail(e.target.value)) {
      setEmailError(t('auth:errors.validEmail'))
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
                {t('auth:forgotPasswordSubtitle')}
              </Typography>

              <Typography level='body2' alignSelf={'start'} mb={1}>
                {t('common:labels.emailAddress')}
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
                  placeholder={t('auth:placeholders.enterEmailAddress')}
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
                {t('auth:actions.resetPassword')}
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
                {t('common:actions.backToLogin')}
              </Button>
            </>
          )}
          {resetStatusOk != null && (
            <>
              <Typography
                level='body-md'
                sx={{ textAlign: 'center', mt: 2, mb: 3 }}
              >
                {t('auth:forgotPasswordConfirmation')}
              </Typography>

              <Button
                variant='solid'
                size='lg'
                fullWidth
                onClick={() => {
                  navigate('/login')
                }}
              >
                {t('auth:actions.goToLogin')}
              </Button>
            </>
          )}
        </Sheet>
      </Box>
    </Container>
  )
}

export default ForgotPasswordView
