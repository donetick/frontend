import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Input,
  Sheet,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Logo from '../../Logo'
import { useNotification } from '../../service/NotificationProvider'
import { login, signUp } from '../../utils/Fetcher'

const SignupView = () => {
  const { t } = useTranslation('auth')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const Navigate = useNavigate()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [usernameError, setUsernameError] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')
  const [emailError, setEmailError] = React.useState('')
  const [displayNameError, setDisplayNameError] = React.useState('')
  const { showError } = useNotification()
  const handleLogin = (username, password) => {
    login(username, password).then(response => {
      if (response.status === 200) {
        response.json().then(res => {
          localStorage.setItem('token', res.token)
          localStorage.setItem('token_expiry', res.expire)

          // Invalidate user profile queries to ensure fresh data
          queryClient.invalidateQueries(['userProfile'])

          Navigate('/chores')
        })
      } else {
        console.log('Login failed', response)

        // Navigate('/login')
      }
    })
  }
  const handleSignUpValidation = () => {
    // Reset errors before validation
    setUsernameError(null)
    setPasswordError(null)
    setDisplayNameError(null)
    setEmailError(null)

    let isValid = true

    if (!username.trim()) {
      setUsernameError(t('usernameRequired'))
      isValid = false
    }
    if (username.length < 4) {
      setUsernameError(t('usernameMinLength'))
      isValid = false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('invalidEmail'))
      isValid = false
    }

    if (password.length < 8) {
      setPasswordError(t('passwordLength'))
      isValid = false
    }

    if (password.length > 64) {
      setPasswordError(t('passwordLength'))
      isValid = false
    }

    if (!displayName.trim()) {
      setDisplayNameError(t('displayNameRequired'))
      isValid = false
    }

    // display name should only contain letters and spaces and numbers:
    if (!/^[a-zA-Z0-9 ]+$/.test(displayName)) {
      setDisplayNameError(t('displayNameChars'))
      isValid = false
    }

    // username should only contain lowercase letters, dot and dash:
    if (!/^[a-z.-]+$/.test(username)) {
      setUsernameError(t('usernameChars'))
      isValid = false
    }

    return isValid
  }
  const handleSubmit = async e => {
    e.preventDefault()
    if (!handleSignUpValidation()) {
      return
    }
    signUp(username, password, displayName, email).then(response => {
      if (response.status === 201) {
        handleLogin(username, password)
      } else if (response.status === 403) {
        showError({
          title: t('signupFailed'),
          message: t('signupDisabled'),
        })
      } else {
        console.log('Signup failed')
        response.json().then(res => {
          showError({
            title: t('signupFailed'),
            message: res.error || t('signupError'),
          })
        })
      }
    })
  }

  return (
    <Container component='main' maxWidth='xs'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <Sheet
          component='form'
          sx={{
            mt: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            // alignItems: 'center',
            padding: 2,
            borderRadius: '8px',
            boxShadow: 'md',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            <Logo />
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
            <Typography level='body2'>
              {t('signupPrompt')}
            </Typography>
          </Box>
          <Typography level='body2' alignSelf={'start'} mt={4}>
            {t('username')}
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            id='username'
            label='Username'
            name='username'
            autoComplete='username'
            autoFocus
            value={username}
            onChange={e => {
              setUsernameError(null)
              setUsername(e.target.value.trim())
            }}
          />
          <FormControl error={usernameError}>
            <FormHelperText c>{usernameError}</FormHelperText>
          </FormControl>
          {/* Error message display */}
          <Typography level='body2' alignSelf={'start'}>
            {t('email')}
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            id='email'
            label='email'
            name='email'
            autoComplete='email'
            value={email}
            onChange={e => {
              setEmailError(null)
              setEmail(e.target.value.trim())
            }}
          />
          <FormControl error={emailError}>
            <FormHelperText c>{emailError}</FormHelperText>
          </FormControl>
          <Typography level='body2' alignSelf={'start'}>
            {t('password')}
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password'
            type='password'
            id='password'
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={e => {
              setPasswordError(null)
              setPassword(e.target.value)
            }}
          />
          <FormControl error={passwordError}>
            <FormHelperText>{passwordError}</FormHelperText>
          </FormControl>
          <Typography level='body2' alignSelf={'start'}>
            {t('displayName')}
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            name='displayName'
            label='Display Name'
            id='displayName'
            placeholder={t('displayNamePlaceholder')}
            value={displayName}
            onChange={e => {
              setDisplayNameError(null)
              setDisplayName(e.target.value)
            }}
          />
          <FormControl error={displayNameError}>
            <FormHelperText>{displayNameError}</FormHelperText>
          </FormControl>
          <Typography
            level='body2'
            sx={{ mt: 2, mb: 1, textAlign: 'center', color: 'text.secondary' }}
          >
            {t('terms')}
          </Typography>
          <Button
            // type='submit'
            size='lg'
            fullWidth
            variant='solid'
            sx={{ mt: 1, mb: 1 }}
            onClick={handleSubmit}
          >
            {t('signUp')}
          </Button>
          <Divider> {t('or')} </Divider>
          <Button
            size='lg'
            onClick={() => {
              Navigate('/login')
            }}
            fullWidth
            variant='soft'
            // sx={{ mt: 3, mb: 2 }}
          >
            {t('login')}
          </Button>

          <Box
            sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}
          >
            <Button
              variant='plain'
              size='sm'
              onClick={() => {
                window.open('https://donetick.com/privacy-policy', '_blank')
              }}
            >
              {t('privacyPolicy')}
            </Button>
            <Button
              variant='plain'
              size='sm'
              onClick={() => {
                window.open('https://donetick.com/terms', '_blank')
              }}
            >
              {t('termsOfUse')}
            </Button>
          </Box>
        </Sheet>
      </Box>
    </Container>
  )
}

export default SignupView
