import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined'
import { Box, Button, Link, Typography } from '@mui/joy'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../service/NotificationProvider'
import { ResetPassword } from '../../utils/Fetcher'
import { AuthSubmitButton, AuthTextField, LegalLinks } from './AuthFields'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'

const isInvalidEmail = email =>
  !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)

const ForgotPasswordView = () => {
  const navigate = useNavigate()
  const [resetStatusOk, setResetStatusOk] = useState(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showError, showNotification } = useNotification()

  const handleSubmit = async e => {
    e?.preventDefault()

    if (!email) {
      setEmailError('Email is required')
      return
    }

    if (isInvalidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ResetPassword(email)

      if (response.ok) {
        setResetStatusOk(true)
        showNotification({
          type: 'success',
          title: 'Reset Email Sent',
          message: 'Check your email for password reset instructions',
        })
      } else {
        setResetStatusOk(false)
        showError({
          title: 'Reset Failed',
          message: 'Failed to send reset email, please try again later',
        })
      }
    } catch (error) {
      setResetStatusOk(false)
      showError({
        title: 'Reset Failed',
        message: 'Failed to send reset email, please try again later',
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
      setEmailError('Please enter a valid email address')
    }
  }

  if (resetStatusOk !== null) {
    return (
      <AuthShell
        title='Check your email'
        subtitle={`If an account exists for ${email}, we've sent instructions for resetting your password.`}
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
      title='Reset your password'
      subtitle="Enter your email and we'll send you a link to get back into your account."
      footer={<LegalLinks />}
      logoSize={0}
    >
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <AuthTextField
          label='Email address'
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          placeholder='you@example.com'
          autoFocus
          value={email}
          error={emailError}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
        />

        <AuthSubmitButton loading={isSubmitting} sx={{ mt: 1 }}>
          Send reset link
        </AuthSubmitButton>
      </Box>

      <Typography
        level='body-sm'
        sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        Remembered it?{' '}
        <Link
          component='button'
          type='button'
          level='body-sm'
          fontWeight={600}
          underline='hover'
          onClick={() => navigate('/login')}
        >
          Back to sign in
        </Link>
      </Typography>
    </AuthShell>
  )
}

export default ForgotPasswordView
