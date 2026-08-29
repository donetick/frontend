import { Alert, Box, Input, Link, Stack, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('auth')
  const [verificationCode, setVerificationCode] = useState('')
  const [isBackupCode, setIsBackupCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { ResponsiveModal } = useResponsiveModal()

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError(t('mfaModal.codeRequired'))
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
        const message = errorData.message || t('mfaModal.invalidCode')
        setError(message)
        onError?.(message)
      }
    } catch (error) {
      // A wrong code is shown inline; a failed request is escalated to the
      // caller so it can surface a toast instead of looking like a bad code.
      const message = t('mfaModal.verifyFailed')
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
      title={t('mfaModal.title')}
      description={
        isBackupCode ? t('mfaModal.backupHint') : t('mfaModal.codeHint')
      }
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <ModalActions
          secondary={{
            label: t('common:cancel'),
            onClick: handleClose,
            disabled: loading,
          }}
          primary={{
            label: t('mfaModal.verify'),
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
            {isBackupCode ? t('mfaModal.backupLabel') : t('mfaModal.codeLabel')}
          </Typography>
          <Input
            id='mfa-code'
            size='lg'
            placeholder={
              isBackupCode ? t('mfaModal.backupPlaceholder') : '000000'
            }
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
              ? t('mfaModal.useAuthenticator')
              : t('mfaModal.useBackup')}
          </Link>
        </Box>

        {isBackupCode && (
          <Typography
            level='body-xs'
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          >
            {t('mfaModal.backupOnce')}
          </Typography>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default MFAVerificationModal
