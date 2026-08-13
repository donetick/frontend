import { FormControl, FormHelperText, Input, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { useTranslation } from 'react-i18next'

function PasswordChangeModal({ isOpen, onClose }) {
  const { t } = useTranslation('settings')
  const { ResponsiveModal } = useResponsiveModal()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)

  useEffect(() => {
    if (!passwordTouched || !confirmPasswordTouched) return

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
    } else if (password.length < 8) {
      setPasswordError(t('passwordChange.minLength'))
    } else if (password.length > 64) {
      setPasswordError(t('passwordChange.maxLength'))
    } else {
      setPasswordError(null)
    }
  }, [password, confirmPassword, passwordTouched, confirmPasswordTouched, t])

  const handleAction = isConfirmed => onClose(isConfirmed ? password : null)
  const canSubmit =
    passwordTouched &&
    confirmPasswordTouched &&
    password.length >= 8 &&
    password === confirmPassword &&
    passwordError == null

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={() => handleAction(false)}
      size='sm'
      title={t('accountSettings.changePassword')}
      description='Choose a password between 8 and 64 characters.'
      footer={
        <ModalActions
          secondary={{ label: t('accountSettings.cancel'), onClick: () => handleAction(false) }}
          primary={{
            label: t('accountSettings.changePassword'),
            disabled: !canSubmit,
            onClick: () => handleAction(true),
          }}
        />
      }
    >
      <FormControl sx={{ mb: 2 }}>
        <Typography level='body-sm'>New password</Typography>
        <Input
          required
          name='password'
          type='password'
          autoComplete='new-password'
          placeholder='Enter password'
          value={password}
          onChange={event => {
            setPasswordTouched(true)
            setPassword(event.target.value)
          }}
        />
      </FormControl>

      <FormControl error={Boolean(passwordError)}>
        <Typography level='body-sm'>Confirm password</Typography>
        <Input
          required
          name='confirmPassword'
          type='password'
          autoComplete='new-password'
          placeholder='Repeat password'
          value={confirmPassword}
          onChange={event => {
            setConfirmPasswordTouched(true)
            setConfirmPassword(event.target.value)
          }}
        />
        {passwordError && <FormHelperText>{passwordError}</FormHelperText>}
      </FormControl>
    </ResponsiveModal>
  )
}

export default PasswordChangeModal
