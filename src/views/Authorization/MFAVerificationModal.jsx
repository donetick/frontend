import { Security } from '@mui/icons-material'
import { Alert, Box, Button, Input, Link, Stack, Typography } from '@mui/joy'
import { useState } from 'react'

import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { VerifyMFA } from '../../utils/Fetcher'
import { authButtonSx, authInputSx } from './authStyles'

const MFAVerificationModal = ({
  open,
  onClose,
  sessionToken,
  onSuccess,
  onError,
}) => {
  const [verificationCode, setVerificationCode] = useState('')
  const [isBackupCode, setIsBackupCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { ResponsiveModal } = useResponsiveModal()

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter a verification code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await VerifyMFA(sessionToken, verificationCode)

      if (response.ok) {
        const data = await response.json()
        onSuccess(data)
      } else {
        const errorData = await response.json()
        setError(
          errorData.message || 'Invalid verification code. Please try again.',
        )
      }
    } catch (error) {
      // A wrong code is shown inline; a failed request is escalated to the
      // caller so it can surface a toast instead of looking like a bad code.
      const message = 'Failed to verify code. Please try again.'
      setError(message)
      onError?.(message)
      console.error('MFA verification error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setVerificationCode('')
    setIsBackupCode(false)
    setError('')
    setLoading(false)
    onClose()
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      handleVerify()
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={handleClose}
      size='lg'
      // fullWidth would force a 90%-of-viewport dialog, stretching a 6-digit
      // code field across the whole desktop screen.
      fullWidth={false}
      title='Two-factor authentication'
    >
      <Stack spacing={2.5} sx={{ width: { xs: '100%', sm: 380 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '12px',
              bgcolor: 'primary.softBg',
              color: 'primary.plainColor',
            }}
          >
            <Security fontSize='small' />
          </Box>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {isBackupCode
              ? 'Enter one of the backup codes you saved when setting up two-factor authentication.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </Typography>
        </Box>

        <Box>
          <Typography
            component='label'
            htmlFor='mfa-code'
            level='body-sm'
            sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}
          >
            {isBackupCode ? 'Backup code' : 'Verification code'}
          </Typography>
          <Input
            id='mfa-code'
            size='lg'
            placeholder={isBackupCode ? 'Enter backup code' : '000000'}
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            onKeyDown={handleKeyDown}
            error={Boolean(error)}
            autoFocus
            sx={{
              ...authInputSx,
              // Targets the inner <input>; styling the root leaves the text
              // itself unaligned.
              '& input': {
                textAlign: 'center',
                letterSpacing: isBackupCode ? 'normal' : '0.4em',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '1.125rem',
              },
            }}
            slotProps={{
              input: {
                maxLength: isBackupCode ? 50 : 6,
                inputMode: isBackupCode ? 'text' : 'numeric',
                pattern: isBackupCode ? undefined : '[0-9]*',
                autoComplete: isBackupCode ? 'off' : 'one-time-code',
              },
            }}
          />
        </Box>

        {error && (
          <Alert color='danger' variant='soft' sx={{ borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Button
          color='primary'
          loading={loading}
          onClick={handleVerify}
          disabled={!verificationCode.trim()}
          size='lg'
          fullWidth
          sx={authButtonSx}
        >
          Verify and sign in
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Link
            component='button'
            type='button'
            level='body-sm'
            underline='hover'
            onClick={() => {
              setIsBackupCode(!isBackupCode)
              setVerificationCode('')
              setError('')
            }}
          >
            {isBackupCode
              ? 'Use authenticator app instead'
              : 'Use a backup code instead'}
          </Link>
        </Box>

        {isBackupCode && (
          <Typography
            level='body-xs'
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          >
            Each backup code can only be used once.
          </Typography>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default MFAVerificationModal
