// create boilerplate for ResetPasswordView:
import Logo from '../../Logo'
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
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../service/NotificationProvider'
import { ResetPassword } from '../../utils/Fetcher'

const ForgotPasswordView = () => {
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
      return setEmailError('Email is required')
    }

    // validate email:
    if (validateEmail(email)) {
      setEmailError('Please enter a valid email address')
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
          title: 'Reset Email Sent',
          message: 'Check your email for password reset instructions',
        })
      } else {
        setResetStatusOk(false)
        showError({
          title: 'Reset Failed',
          message: 'Failed to send reset email, please try again later',
        })
      }
    } catch (error) {
      setResetStatusOk(false)
      showError({
        title: 'Reset Failed',
        message: 'Failed to send reset email, please try again later',
      })
    }
  }

  const handleEmailChange = e => {
    setEmail(e.target.value)
    if (validateEmail(e.target.value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError(null)
    }
  }

  return (
    <Container
      component='main'
      maxWidth='xs'
    >
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
              <Typography level='body2' sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
                Enter your email, and we'll send you a link to get into your
                account.
              </Typography>
              <FormControl error={emailError !== null} sx={{ width: '100%', mb: 2 }}>
                <Input
                  placeholder='Email'
                  type='email'
                  variant='soft'
                  fullWidth
                  size='lg'
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
                variant='solid'
                size='lg'
                fullWidth
                sx={{ mb: 2 }}
                onClick={handleSubmit}
              >
                Reset Password
              </Button>

              <Button
                fullWidth
                size='lg'
                variant='plain'
                sx={{
                  width: '100%',
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={() => {
                  navigate('/login')
                }}
                color='neutral'
              >
                Back to Login
              </Button>
            </>
          )}
          {resetStatusOk != null && (
            <>
              <Typography level='body-md' sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
                If there is an account associated with the email you entered,
                you will receive an email with instructions on how to reset
                your password.
              </Typography>
              
              <Button
                variant='solid'
                size='lg'
                fullWidth
                onClick={() => {
                  navigate('/login')
                }}
              >
                Go to Login
              </Button>
            </>
          )}
        </Sheet>
      </Box>
    </Container>
  )
}

export default ForgotPasswordView
