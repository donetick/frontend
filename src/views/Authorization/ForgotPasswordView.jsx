// create boilerplate for ResetPasswordView:
import LogoSVG from '@/assets/logo.svg'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Input,
  Sheet,
  Snackbar,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from './../../Config'
import {  ResetPassword } from '../../utils/Fetcher'

const ForgotPasswordView = () => {
  const navigate = useNavigate()
  // const [showLoginSnackbar, setShowLoginSnackbar] = useState(false)
  // const [snackbarMessage, setSnackbarMessage] = useState('')
  const [resetStatusOk, setResetStatusOk] = useState(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)

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
        //  wait 3 seconds and then redirect to login:
      } else {
        setResetStatusOk(false)
      }
    } catch (error) {
      setResetStatusOk(false)
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

      // make content center in the middle of the page:
    >
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',

          justifyContent: 'space-between',
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
            minHeight: '70vh',
            justifyContent: 'space-between',
            justifyItems: 'center',
          }}
        >
          <Box>
            <img src={LogoSVG} alt='logo' width='128px' height='128px' />
            {/* <Logo /> */}
            <Typography level='h2'>
              Done
              <span
                style={{
                  color: '#06b6d4',
                }}
              >
                tick
              </span>
            </Typography>
          </Box>
          {/* HERE */}
          <Box sx={{ textAlign: 'center' }}></Box>
          {resetStatusOk === null && (
            <form onSubmit={handleSubmit}>
              <div className='grid gap-6'>
                <Typography level='body2' gutterBottom>
                  Enter your email, and we'll send you a link to get into your
                  account.
                </Typography>
                <FormControl error={emailError !== null}>
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
                <Box>
                  <Button
                    variant='solid'
                    size='lg'
                    fullWidth
                    sx={{
                      mb: 1,
                    }}
                    onClick={handleSubmit}
                  >
                    Reset Password
                  </Button>
                  <Button
                    fullWidth
                    size='lg'
                    variant='soft'
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
                </Box>
              </div>
            </form>
          )}
          {resetStatusOk != null && (
            <>
              <Box mt={-30}>
                <Typography level='body-md'>
                  if there is an account associated with the email you entered,
                  you will receive an email with instructions on how to reset
                  your
                </Typography>
              </Box>
              <Button
                variant='soft'
                size='lg'
                sx={{ position: 'relative', bottom: '0' }}
                onClick={() => {
                  navigate('/login')
                }}
                fullWidth
              >
                Go to Login
              </Button>
            </>
          )}
          <Snackbar
            open={resetStatusOk ? resetStatusOk : resetStatusOk === false}
            autoHideDuration={5000}
            onClose={() => {
              if (resetStatusOk) {
                navigate('/login')
              }
            }}
          >
            {resetStatusOk
              ? 'Reset email sent, check your email'
              : 'Reset email failed, try again later'}
          </Snackbar>
        </Sheet>
      </Box>
    </Container>
  )
}

export default ForgotPasswordView
