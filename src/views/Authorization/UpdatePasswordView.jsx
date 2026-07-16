// create boilerplate for ResetPasswordView:
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
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Logo from '../../Logo'
import { useNotification } from '../../service/NotificationProvider'
import { ChangePassword } from '../../utils/Fetcher'

const UpdatePasswordView = () => {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passworConfirmationError, setPasswordConfirmationError] =
    useState(null)
  const [searchParams] = useSearchParams()
  const { showError, showNotification } = useNotification()

  const verifiticationCode = searchParams.get('c')

  const handlePasswordChange = e => {
    const password = e.target.value
    setPassword(password)
    if (password.length < 8 || password.length > 64) {
      setPasswordError(t('passwordLength'))
    } else {
      setPasswordError(null)
    }
  }
  const handlePasswordConfirmChange = e => {
    setPasswordConfirm(e.target.value)
    if (e.target.value !== password) {
      setPasswordConfirmationError(t('passwordsNoMatch'))
    } else {
      setPasswordConfirmationError(null)
    }
  }

  const handleSubmit = async () => {
    if (passwordError != null || passworConfirmationError != null) {
      return
    }
    try {
      const response = await ChangePassword(verifiticationCode, password)

      if (response.ok) {
        showNotification({
          type: 'success',
          title: t('passwordUpdated'),
          message: t('passwordUpdatedMsg'),
        })
        //  wait 3 seconds and then redirect to login:
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
        title: 'Password Update Failed',
        message: 'Failed to update password, please try again later',
      })
    }
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
            <Typography level='body2' mb={4}>
              {t('newPasswordPrompt')}
            </Typography>
          </Box>

          <FormControl error>
            <Input
              placeholder={t('passwordFieldPlaceholder')}
              type='password'
              value={password}
              onChange={handlePasswordChange}
              error={passwordError !== null}
              // onKeyDown={e => {
              //   if (e.key === 'Enter' && validateForm(validateFormInput)) {
              //     handleSubmit(e)
              //   }
              // }}
            />
            <FormHelperText>{passwordError}</FormHelperText>
          </FormControl>

          <FormControl error>
            <Input
              placeholder={t('confirmPassword')}
              type='password'
              value={passwordConfirm}
              onChange={handlePasswordConfirmChange}
              error={passworConfirmationError !== null}
              // onKeyDown={e => {
              //   if (e.key === 'Enter' && validateForm(validateFormInput)) {
              //     handleSubmit(e)
              //   }
              // }}
            />
            <FormHelperText>{passworConfirmationError}</FormHelperText>
          </FormControl>
          {/* helper to show password not matching : */}

          <Button
            fullWidth
            size='lg'
            sx={{
              mt: 5,
              mb: 1,
            }}
            onClick={handleSubmit}
          >
            {t('savePassword')}
          </Button>
          <Button
            fullWidth
            size='lg'
            variant='soft'
            onClick={() => {
              navigate('/login')
            }}
          >
            {t('common:cancel')}
          </Button>
        </Sheet>
      </Box>
    </Container>
  )
}

export default UpdatePasswordView
