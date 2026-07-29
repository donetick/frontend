import { Box, Button } from '@mui/joy'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useNotification } from '../../service/NotificationProvider'
import { ChangePassword } from '../../utils/Fetcher'
import { AuthPasswordField, AuthSubmitButton, LegalLinks } from './AuthFields'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'

const UpdatePasswordView = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordConfirmationError, setPasswordConfirmationError] =
    useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchParams] = useSearchParams()
  const { showError, showNotification } = useNotification()

  const verificationCode = searchParams.get('c')

  const handlePasswordChange = e => {
    setPassword(e.target.value)
    if (passwordError) {
      setPasswordError(null)
    }
  }

  const handlePasswordConfirmChange = e => {
    setPasswordConfirm(e.target.value)
    if (passwordConfirmationError) {
      setPasswordConfirmationError(null)
    }
  }

  const validate = () => {
    let isValid = true

    if (password.length < 8 || password.length > 64) {
      setPasswordError('Password must be between 8 and 64 characters')
      isValid = false
    }

    if (passwordConfirm !== password) {
      setPasswordConfirmationError('Passwords do not match')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async e => {
    e?.preventDefault()

    // The old version only bailed when an error was already set, so an
    // untouched form submitted an empty password.
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ChangePassword(verificationCode, password)

      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Password Updated',
          message:
            'Your password has been updated successfully. Redirecting to login...',
        })
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        showError({
          title: 'Password Update Failed',
          message: 'Failed to update password, please try again later',
        })
      }
    } catch (error) {
      showError({
        title: 'Password Update Failed',
        message: 'Failed to update password, please try again later',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!verificationCode) {
    return (
      <AuthShell
        title='This link is not valid'
        subtitle='The password reset link is incomplete or has already been used. Request a new one to continue.'
        footer={<LegalLinks />}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            fullWidth
            size='lg'
            variant='solid'
            sx={authButtonSx}
            onClick={() => navigate('/forgot-password')}
          >
            Request a new link
          </Button>
          <Button
            fullWidth
            size='lg'
            variant='plain'
            color='neutral'
            sx={authButtonSx}
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </Button>
        </Box>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title='Set a new password'
      subtitle='Choose a password you have not used on this account before.'
      footer={<LegalLinks />}
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthPasswordField
          label='New password'
          id='password'
          name='password'
          autoComplete='new-password'
          placeholder='At least 8 characters'
          autoFocus
          value={password}
          error={passwordError}
          helper='Use 8 to 64 characters.'
          onChange={handlePasswordChange}
        />

        <AuthPasswordField
          label='Confirm new password'
          id='passwordConfirm'
          name='passwordConfirm'
          autoComplete='new-password'
          placeholder='Re-enter your password'
          value={passwordConfirm}
          error={passwordConfirmationError}
          onChange={handlePasswordConfirmChange}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          Save password
        </AuthSubmitButton>

        <Button
          type='button'
          fullWidth
          size='lg'
          variant='plain'
          color='neutral'
          sx={authButtonSx}
          onClick={() => navigate('/login')}
        >
          Cancel
        </Button>
      </Box>
    </AuthShell>
  )
}

export default UpdatePasswordView
