import { Security, Smartphone } from '@mui/icons-material'
import { Alert, Box, Input, Link, Stack, Typography } from '@mui/joy'
import { useState } from 'react'

import ModalActions from '../../components/common/ModalActions'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { VerifyMFA } from '../../utils/Fetcher'

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
        const message =
          errorData.message || 'Invalid verification code. Please try again.'
        setError(message)
        onError?.(message)
      }
    } catch (error) {
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

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !loading) {
      handleVerify()
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={handleClose}
      size='md'
      title='Two-Factor Authentication'
      description='Enter the verification code from your authenticator app.'
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
      <Box className='mb-4 text-center'>
        <Security sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      </Box>

      <Stack spacing={3}>
        <Box>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {isBackupCode ? 'Backup Code' : 'Verification Code'}
          </Typography>
          <Input
            placeholder={
              isBackupCode ? 'Enter backup code' : 'Enter 6-digit code'
            }
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              textAlign: 'center',
              fontSize: '1.1em',
              letterSpacing: isBackupCode ? 'normal' : '0.1em',
            }}
            slotProps={{
              input: {
                maxLength: isBackupCode ? 50 : 6,
                pattern: isBackupCode ? undefined : '[0-9]*',
              },
            }}
            startDecorator={<Smartphone />}
            autoFocus
          />
        </Box>

        {error && (
          <Alert color='danger' size='sm'>
            {error}
          </Alert>
        )}

        <Box className='text-center'>
          <Link
            component='button'
            type='button'
            onClick={() => {
              setIsBackupCode(!isBackupCode)
              setVerificationCode('')
              setError('')
            }}
            sx={{ fontSize: 'sm' }}
          >
            {isBackupCode
              ? 'Use authenticator app instead'
              : "Can't access your authenticator? Use a backup code"}
          </Link>
        </Box>

        <Alert color='neutral' size='sm'>
          <Typography level='body-xs'>
            Having trouble? Make sure your authenticator app is synced and try
            again. Each backup code can only be used once.
          </Typography>
        </Alert>
      </Stack>
    </ResponsiveModal>
  )
}

export default MFAVerificationModal
