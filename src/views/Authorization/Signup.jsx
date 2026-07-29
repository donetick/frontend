import { Box, Link, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../service/NotificationProvider'
import { login, signUp } from '../../utils/Fetcher'
import {
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  LegalLinks,
} from './AuthFields'
import AuthShell from './AuthShell'

const SignupView = () => {
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
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { showError } = useNotification()
  const handleLogin = (username, password) => {
    login(username, password).then(response => {
      if (response.status === 200) {
        response.json().then(res => {
          localStorage.setItem('token', res.token)
          localStorage.setItem('token_expiry', res.expire)

          // Invalidate user profile queries to ensure fresh data
          queryClient.invalidateQueries(['userProfile'])

          // New accounts land on the "you're all set" screen, which closes the
          // loop from onboarding and shows the upgrade offer once. Returning
          // users signing in go straight to their tasks.
          Navigate('/ready', { replace: true })
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
      setUsernameError('Username is required')
      isValid = false
    }
    if (username.length < 4) {
      setUsernameError('Username must be at least 4 characters')
      isValid = false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email address')
      isValid = false
    }

    if (password.length < 8) {
      setPasswordError('Password must be between 8 and 64 characters')
      isValid = false
    }

    if (password.length > 64) {
      setPasswordError('Password must be between 8 and 64 characters')
      isValid = false
    }

    if (!displayName.trim()) {
      setDisplayNameError('Display name is required')
      isValid = false
    }

    // display name should only contain letters and spaces and numbers:
    if (!/^[a-zA-Z0-9 ]+$/.test(displayName)) {
      setDisplayNameError('Display name can only contain letters and numbers')
      isValid = false
    }

    // username should only contain lowercase letters, numbers, dot and dash:
    if (!/^[a-z0-9.-]+$/.test(username)) {
      setUsernameError(
        'Username can only contain lowercase letters, numbers, dot and dash',
      )
      isValid = false
    }

    return isValid
  }
  const handleSubmit = async e => {
    e.preventDefault()
    if (!handleSignUpValidation()) {
      return
    }
    setIsSubmitting(true)
    signUp(username, password, displayName, email)
      .then(response => {
        if (response.status === 201) {
          handleLogin(username, password)
        } else if (response.status === 403) {
          showError({
            title: 'Signup Failed',
            message: 'Signup disabled, please contact admin',
          })
        } else {
          console.log('Signup failed')
          response.json().then(res => {
            showError({
              title: 'Signup Failed',
              message: res.error || 'An error occurred during signup',
            })
          })
        }
      })
      .finally(() => setIsSubmitting(false))
  }

  return (
    <AuthShell
      title='Create your account'
      subtitle='Track chores and tasks together, in one shared place.'
      footer={<LegalLinks />}
      logoSize={0}
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthTextField
          label='Display name'
          id='displayName'
          name='displayName'
          autoComplete='name'
          placeholder='How others see your name'
          autoFocus
          value={displayName}
          error={displayNameError}
          onChange={e => {
            setDisplayNameError(null)
            setDisplayName(e.target.value)
          }}
        />

        <AuthTextField
          label='Username'
          id='username'
          name='username'
          autoComplete='username'
          placeholder='lowercase letters, numbers, dot and dash'
          value={username}
          error={usernameError}
          onChange={e => {
            setUsernameError(null)
            setUsername(e.target.value.trim())
          }}
        />

        <AuthTextField
          label='Email'
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          placeholder='you@example.com'
          value={email}
          error={emailError}
          onChange={e => {
            setEmailError(null)
            setEmail(e.target.value.trim())
          }}
        />

        <AuthPasswordField
          id='password'
          name='password'
          autoComplete='new-password'
          placeholder='At least 8 characters'
          value={password}
          error={passwordError}
          helper='Use 8 to 64 characters.'
          onChange={e => {
            setPasswordError(null)
            setPassword(e.target.value)
          }}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          Create account
        </AuthSubmitButton>

        <Typography
          level='body-xs'
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          By creating an account you agree to our Terms of Service and Privacy
          Policy.
        </Typography>
      </Box>

      <Typography
        level='body-sm'
        sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        Already have an account?{' '}
        <Link
          component='button'
          type='button'
          level='body-sm'
          fontWeight={600}
          underline='hover'
          onClick={() => Navigate('/login')}
        >
          Sign in
        </Link>
      </Typography>
    </AuthShell>
  )
}

export default SignupView
