import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined'
import { Box, Button, Link, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { useNotification } from '../../service/NotificationProvider'
import { ResetPassword } from '../../utils/Fetcher'
import { AuthSubmitButton, AuthTextField, LegalLinks } from './AuthFields'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'

const isInvalidEmail = email =>
  !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)

const ForgotPasswordView = () => {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const [resetStatusOk, setResetStatusOk] = useState(null)
  // Account settings sends signed-in users here, so skip retyping the address
  // and send them back where they came from instead of to the sign-in form.
  const [email, setEmail] = useState(location.state?.email ?? '')
  const returnTo = location.state?.returnTo
  const backLabel = returnTo ? t('goBack') : t('backToSignIn')
  const [emailError, setEmailError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showError, showNotification } = useNotification()

  const handleSubmit = async e => {
    e?.preventDefault()

    if (!email) {
      setEmailError(t('emailRequired'))
      return
    }

    if (isInvalidEmail(email)) {
      setEmailError(t('validEmailRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ResetPassword(email)

      if (response.ok) {
        setResetStatusOk(true)
        showNotification({
          type: 'success',
          title: t('resetEmailSent'),
          message: t('resetEmailSentMsg'),
        })
      } else {
        setResetStatusOk(false)
        showError({
          title: t('resetFailed'),
          message: t('resetFailedMsg'),
        })
      }
    } catch (error) {
      setResetStatusOk(false)
      showError({
        title: t('resetFailed'),
        message: t('resetFailedMsg'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validate on blur/submit only; flagging a half-typed address as invalid on
  // every keystroke reads as the form yelling at you mid-word.
  const handleEmailChange = e => {
    setEmail(e.target.value)
    if (emailError) {
      setEmailError(null)
    }
  }

  const handleEmailBlur = () => {
    if (email && isInvalidEmail(email)) {
      setEmailError(t('validEmailRequired'))
    }
  }

  if (resetStatusOk !== null) {
    return (
      <AuthShell
        title={t('checkYourEmail')}
        subtitle={t('resetInstructionsSent', { email })}
        footer={<LegalLinks />}
        logoSize={0}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <MarkEmailReadOutlined
            sx={{ fontSize: 40, color: 'primary.plainColor', mb: 2 }}
          />
          <Button
            fullWidth
            size='lg'
            variant='solid'
            sx={authButtonSx}
            onClick={() => navigate(returnTo ?? '/login')}
          >
            {backLabel}
          </Button>
        </Box>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('resetYourPassword')}
      subtitle={t('enterEmailForReset')}
      footer={<LegalLinks />}
      logoSize={0}
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthTextField
          label={t('emailAddressLabel')}
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          placeholder={t('emailPlaceholder')}
          autoFocus
          value={email}
          error={emailError}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          {t('sendResetLink')}
        </AuthSubmitButton>
      </Box>

      <Typography
        level='body-sm'
        sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        {!returnTo && `${t('rememberedIt')} `}
        <Link
          component='button'
          type='button'
          level='body-sm'
          fontWeight={600}
          underline='hover'
          onClick={() => navigate(returnTo ?? '/login')}
        >
          {backLabel}
        </Link>
      </Typography>
    </AuthShell>
  )
}

export default ForgotPasswordView
