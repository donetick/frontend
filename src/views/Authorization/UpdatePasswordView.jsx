import { Box, Button } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useNotification } from '../../service/NotificationProvider'
import { ChangePassword } from '../../utils/Fetcher'
import { AuthPasswordField, AuthSubmitButton, LegalLinks } from './AuthFields'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'

const UpdatePasswordView = () => {
  const { t } = useTranslation('auth')
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
          title: t('passwordUpdated'),
          message: t('passwordUpdatedMsg'),
        })
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        showError({
          title: t('passwordUpdateFailed'),
          message: t('passwordUpdateFailedMsg'),
        })
      }
    } catch (error) {
      showError({
        title: t('passwordUpdateFailed'),
        message: t('passwordUpdateFailedMsg'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!verificationCode) {
    return (
      <AuthShell
        title={t('linkInvalid')}
        subtitle='The password reset link is incomplete or has already been used. Request a new one to continue.'
        footer={<LegalLinks />}
        showLogo
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            fullWidth
            size='lg'
            variant='solid'
            sx={authButtonSx}
            onClick={() => navigate('/forgot-password')}
          >
            {t('requestNewLink')}
          </Button>
          <Button
            fullWidth
            size='lg'
            variant='plain'
            color='neutral'
            sx={authButtonSx}
            onClick={() => navigate('/login')}
          >
            {t('backToSignIn')}
          </Button>
        </Box>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('setNewPassword')}
      subtitle='Choose a password you have not used on this account before.'
      footer={<LegalLinks />}
      // Reached from an emailed link, usually in a browser: an unbranded page
      // asking for a new password is the exact shape of a phishing screen.
      showLogo
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthPasswordField
          label={t('newPassword')}
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
          label={t('confirmNewPassword')}
          id='passwordConfirm'
          name='passwordConfirm'
          autoComplete='new-password'
          placeholder={t('reenterPassword')}
          value={passwordConfirm}
          error={passwordConfirmationError}
          onChange={handlePasswordConfirmChange}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          {t('savePassword')}
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
          {t('common:cancel')}
        </Button>
      </Box>
    </AuthShell>
  )
}

export default UpdatePasswordView
