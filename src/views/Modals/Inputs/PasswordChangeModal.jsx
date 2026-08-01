import { FormControl, FormHelperText, Input, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function PasswordChangeModal({ isOpen, onClose }) {
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
      setPasswordError('Password must be at least 8 characters')
    } else if (password.length > 64) {
      setPasswordError('Password must be less than 64 characters')
    } else {
      setPasswordError(null)
    }
  }, [password, confirmPassword, passwordTouched, confirmPasswordTouched])

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
      title='Change Password'
      description='Choose a password between 8 and 64 characters.'
      footer={
        <ModalActions
          secondary={{ label: 'Cancel', onClick: () => handleAction(false) }}
          primary={{
            label: 'Change Password',
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
