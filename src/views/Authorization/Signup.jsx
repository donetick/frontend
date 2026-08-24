import { Box, Link, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.jsx'
import { useNotification } from '../../service/NotificationProvider'
import { signUp } from '../../utils/Fetcher'
import { getPendingInvite, joinCirclePath } from '../../utils/PendingInvite'
import {
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  LegalLinks,
} from './AuthFields'
import AuthShell from './AuthShell'

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
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { showError } = useNotification()
  const { login: authLogin } = useAuth()
  // Sign-in goes through the auth context, not a bare fetch: it stores the
  // refresh token and updates the provider's own state, so the rest of the app
  // sees the new session without a reload.
  const handleLogin = async (username, password) => {
    const result = await authLogin({ username, password })
    if (!result.success) {
      showError({
        title: t('almostThere'),
        message: t('signupSignInFailed'),
      })
      Navigate('/login')
      return
    }

    // Invalidate user profile queries to ensure fresh data
    queryClient.invalidateQueries(['userProfile'])

    // Someone who signed up from a circle invite is joining an existing
    // circle, so sending them through "name your circle" is both a dead
    // end for the invite and the wrong question.
    const pendingInvite = getPendingInvite()
    if (pendingInvite) {
      Navigate(joinCirclePath(pendingInvite), { replace: true })
      return
    }

    // "How did you hear about us" (cloud) / privacy preferences (self-hosted)
    // that view forwards to '/circle-setup' once the user answers.
    Navigate('/heard-about', { replace: true })
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

    // username should only contain lowercase letters, numbers, dot and dash:
    if (!/^[a-z0-9.-]+$/.test(username)) {
      setUsernameError(t('usernameCharsInvalid'))
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
            title: t('signupFailed'),
            message: t('signupDisabled'),
          })
        } else {
          console.log('Signup failed')
          response.json().then(res => {
            showError({
              title: t('signupFailed'),
              message: res.error || t('signupGenericError'),
            })
          })
        }
      })
      .finally(() => setIsSubmitting(false))
  }

  return (
    <AuthShell
      title={t('createYourAccount')}
      subtitle={
        getPendingInvite()
          ? t('signupSubtitlePendingInvite')
          : t('signupSubtitleDefault')
      }
      footer={<LegalLinks />}
      logoSize={0}
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthTextField
          label={t('displayNameLabel')}
          id='displayName'
          name='displayName'
          autoComplete='name'
          placeholder={t('displayNamePlaceholder')}
          autoFocus
          value={displayName}
          error={displayNameError}
          onChange={e => {
            setDisplayNameError(null)
            setDisplayName(e.target.value)
          }}
        />

        <AuthTextField
          label={t('username')}
          id='username'
          name='username'
          autoComplete='username'
          placeholder={t('usernameHint')}
          value={username}
          error={usernameError}
          onChange={e => {
            setUsernameError(null)
            setUsername(e.target.value.trim())
          }}
        />

        <AuthTextField
          label={t('email')}
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          placeholder={t('emailPlaceholder')}
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
          label={t('passwordLabel')}
          placeholder={t('signupPasswordPlaceholder')}
          value={password}
          error={passwordError}
          helper={t('signupPasswordHelper')}
          onChange={e => {
            setPasswordError(null)
            setPassword(e.target.value)
          }}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          {t('createAccountButton')}
        </AuthSubmitButton>

        <Typography
          level='body-xs'
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          {t('signupTermsNotice')}
        </Typography>
      </Box>

      <Typography
        level='body-sm'
        sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        {t('alreadyHaveAccount')}{' '}
        <Link
          component='button'
          type='button'
          level='body-sm'
          fontWeight={600}
          underline='hover'
          onClick={() => Navigate('/login')}
        >
          {t('signIn')}
        </Link>
      </Typography>
    </AuthShell>
  )
}

export default SignupView
