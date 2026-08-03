import { Alert, Box, Input, Link, Stack, Typography } from '@mui/joy'
import { useState } from 'react'

import ModalActions from '../../components/common/ModalActions'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { VerifyMFA } from '../../utils/Fetcher'
import { authInputSx } from './authStyles'

const MFAVerificationModal = ({
  onClose,
  onError,
  onSuccess,
  open,
  sessionToken,
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
        const message =
          errorData.message || 'Invalid verification code. Please try again.'
        setError(message)
        onError?.(message)
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
      size='md'
      title='Two-factor authentication'
      description={
        isBackupCode
          ? 'Enter one of the backup codes you saved when setting up two-factor authentication.'
          : 'Enter the 6-digit code from your authenticator app.'
      }
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <ModalActions
          secondary={{
            label: 'Cancel',
            onClick: handleClose,
            disabled: loading,
          }}
          primary={{
            label: 'Verify & Sign In',
            onClick: handleVerify,
            loading,
            disabled: !verificationCode.trim(),
          }}
        />
      }
    >
      <Stack spacing={2.5}>
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
