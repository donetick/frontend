import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    Input,
    Typography,
} from '@mui/joy'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function PassowrdChangeModal({ isOpen, onClose }) {
  const { t } = useTranslation(['settings', 'auth', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState(false)
  const [passwordTouched, setPasswordTouched] = React.useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] =
    React.useState(false)
  useEffect(() => {
    if (!passwordTouched || !confirmPasswordTouched) {
      return
    } else if (password !== confirmPassword) {
      setPasswordError(t('settings:modals.passwordChange.mismatch'))
    } else if (password.length < 8) {
      setPasswordError(t('settings:modals.passwordChange.min'))
    } else if (password.length > 64) {
      setPasswordError(t('settings:modals.passwordChange.max'))
    } else {
      setPasswordError(null)
    }
  }, [password, confirmPassword, passwordTouched, confirmPasswordTouched, t])

  const handleAction = isConfirmed => {
    if (!isConfirmed) {
      onClose(null)
      return
    }
    onClose(password)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={t('settings:modals.passwordChange.title')}
    >
      <Typography level='body-md' gutterBottom>
        {t('settings:modals.passwordChange.intro')}
      </Typography>
      <FormControl>
        <Typography level='body2' alignSelf={'start'}>
          {t('settings:modals.passwordChange.newPassword')}
        </Typography>
        <Input
          margin='normal'
          required
          fullWidth
          name='password'
          label={t('common:labels.password')}
          type='password'
          id='password'
          placeholder={t('auth:placeholders.passwordRange')}
          value={password}
          onChange={e => {
            setPasswordTouched(true)
            setPassword(e.target.value)
          }}
        />
      </FormControl>

      <FormControl>
        <Typography level='body2' alignSelf={'start'}>
          {t('settings:modals.passwordChange.confirmPassword')}
        </Typography>
        <Input
          margin='normal'
          required
          fullWidth
          name='confirmPassword'
          label={t('settings:modals.passwordChange.confirmPassword')}
          type='password'
          id='confirmPassword'
          value={confirmPassword}
          onChange={e => {
            setConfirmPasswordTouched(true)
            setConfirmPassword(e.target.value)
          }}
        />

        <FormHelperText>{passwordError}</FormHelperText>
      </FormControl>
      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button
          size='lg'
          disabled={passwordError != null}
          onClick={() => {
            handleAction(true)
          }}
          fullWidth
          sx={{ mr: 1 }}
        >
          {t('settings:modals.passwordChange.title')}
        </Button>
        <Button
          size='lg'
          onClick={() => {
            handleAction(false)
          }}
          variant='outlined'
        >
          {t('common:actions.cancel')}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default PassowrdChangeModal
