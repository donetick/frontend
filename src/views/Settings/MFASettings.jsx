import { CheckCircle, Security, Smartphone } from '@mui/icons-material'
import { Alert, Box, Button, Card, Input, Stack, Typography } from '@mui/joy'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../components/common/AppModal'
import ModalActions from '../../components/common/ModalActions'
import {
  ConfirmMFA,
  DisableMFA,
  GetMFAStatus,
  SetupMFA,
} from '../../utils/Fetcher'
import LoadingComponent from '../components/Loading'
import SettingsLayout from './SettingsLayout'

const MFASettings = () => {
  const { t } = useTranslation('settings')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const [disableModalOpen, setDisableModalOpen] = useState(false)
  const [backupCodesModalOpen, setBackupCodesModalOpen] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [setupStep, setSetupStep] = useState(1) // 1: QR Code, 2: Verification, 3: Backup Codes
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchMFAStatus()
  }, [])

  const fetchMFAStatus = async () => {
    try {
      setLoading(true)
      const response = await GetMFAStatus()
      if (response.ok) {
        const data = await response.json()
        setMfaEnabled(data.mfaEnabled)
      }
    } catch (error) {
      console.error('Error fetching MFA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async url => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
      })
      setQrCodeDataUrl(qrCodeDataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      setError(t('mfa.errors.qrGenerationFailed'))
    }
  }

  const handleSetupMFA = async () => {
    try {
      setError('')
      const response = await SetupMFA()

      console.log('MFA Setup Response Status:', response.status)
      console.log('MFA Setup Response:', response)

      if (response.ok) {
        const data = await response.json()
        console.log('MFA Setup Data:', data)

        // Check for either qrCode (base64 image) or qrCodeUrl (TOTP URL)
        if (!data.qrCodeUrl || !data.backupCodes || !data.secret) {
          console.error('Missing required MFA data:', {
            hasQrCode: !!data.qrCode,
            hasQrCodeUrl: !!data.qrCodeUrl,
            hasSecret: !!data.secret,
          })
          setError(t('mfa.errors.invalidResponse'))
          return
        }
        if (data.backupCodes) {
          console.log('Backup Codes:', data.backupCodes)

          setBackupCodes(data.backupCodes)
        }
        // If we have a qrCodeUrl, generate the QR code image
        if (data.qrCodeUrl) {
          await generateQRCode(data.qrCodeUrl)
        }

        setSetupData(data)
        setSetupModalOpen(true)
        setSetupStep(1)
      } else {
        // Handle different error status codes
        if (response.status === 404) {
          setError(t('mfa.errors.notFound'))
        } else if (response.status === 401) {
          setError(t('mfa.errors.unauthorized'))
        } else if (response.status === 500) {
          setError(t('mfa.errors.serverError'))
        } else {
          const errorData = await response.json().catch(() => ({}))
          setError(
            errorData.message ||
              t('mfa.errors.setupFailed', { status: response.status }),
          )
        }
      }
    } catch (error) {
      console.error('Error setting up MFA:', error)
      setError(t('mfa.errors.networkError'))
    }
  }

  const handleConfirmMFA = async () => {
    try {
      setError('')
      const response = await ConfirmMFA(
        setupData.secret,
        verificationCode,
        setupData.backupCodes,
      )
      if (response.ok) {
        setSetupStep(3)
        setMfaEnabled(true)
        setSuccess(t('mfa.enabledSuccess'))
      } else {
        setError(t('mfa.errors.invalidCode'))
      }
    } catch (error) {
      setError(t('mfa.errors.confirmFailed'))
      console.error('Error confirming MFA:', error)
    }
  }

  const handleDisableMFA = async () => {
    try {
      setError('')
      const response = await DisableMFA(disableCode)
      if (response.ok) {
        setMfaEnabled(false)
        setDisableModalOpen(false)
        setDisableCode('')
        setSuccess(t('mfa.disabledSuccess'))
      } else {
        setError(t('mfa.errors.invalidCode'))
      }
    } catch (error) {
      setError(t('mfa.errors.disableFailed'))
      console.error('Error disabling MFA:', error)
    }
  }

  const closeSetupModal = () => {
    setSetupModalOpen(false)
    setSetupStep(1)
    setVerificationCode('')
    setSetupData(null)
    setQrCodeDataUrl('')
    setError('')
  }

  const closeDisableModal = () => {
    setDisableModalOpen(false)
    setDisableCode('')
    setError('')
  }

  if (loading) {
    return <LoadingComponent />
  }

  return (
    <SettingsLayout title={t('mfa.title')}>
      <div className='grid gap-4 py-4' id='mfa'>
        <Typography level='body-md'>{t('mfa.description')}</Typography>

        {success && (
          <Alert color='success' onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert color='danger' onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card variant='outlined'>
          <Box className='flex items-center justify-between'>
            <Box className='flex items-center gap-3'>
              <Security color='primary' />
              <Box>
                <Typography level='title-md'>{t('mfa.twoFactor')}</Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {mfaEnabled
                    ? t('mfa.enabledSubtitle')
                    : t('mfa.disabledSubtitle')}
                </Typography>
              </Box>
            </Box>
            <Box className='flex items-center gap-2'>
              {mfaEnabled ? (
                <Button
                  color='danger'
                  variant='outlined'
                  onClick={() => setDisableModalOpen(true)}
                >
                  {t('mfa.disable')}
                </Button>
              ) : (
                <Button
                  color='primary'
                  variant='solid'
                  onClick={handleSetupMFA}
                >
                  {t('mfa.enable')}
                </Button>
              )}
            </Box>
          </Box>
        </Card>
        {/*
      {mfaEnabled && (
        <Card variant='outlined'>
          <Box className='flex items-center justify-between'>
            <Box className='flex items-center gap-3'>
              <Key color='primary' />
              <Box>
                <Typography level='title-md'>Backup Codes</Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  Generate new backup codes in case you lose access to your
                  authenticator
                </Typography>
              </Box>
            </Box>
            <Button
              color='neutral'
              variant='outlined'
              size='sm'
              onClick={handleRegenerateBackupCodes}
            >
              {t('mfa.generateCodes')}
            </Button>
          </Box>
        </Card>
      )} */}

        {/* Setup MFA Modal */}
        <AppModal
          open={setupModalOpen}
          onClose={closeSetupModal}
          title={t('mfa.setup.title')}
          size='md'
          footer={
            setupStep === 1 ? (
              <ModalActions
                secondary={{
                  label: t('common.cancel'),
                  onClick: closeSetupModal,
                }}
                primary={{
                  label: t('mfa.setup.addedAccount'),
                  onClick: () => setSetupStep(2),
                  startDecorator: <Smartphone />,
                }}
              />
            ) : setupStep === 2 ? (
              <ModalActions
                secondary={{
                  label: t('mfa.setup.back'),
                  onClick: () => setSetupStep(1),
                }}
                primary={{
                  label: t('mfa.setup.verifyAndEnable'),
                  onClick: handleConfirmMFA,
                  disabled: verificationCode.length !== 6,
                }}
              />
            ) : (
              <ModalActions
                primary={{
                  label: t('mfa.setup.savedBackupCodes'),
                  onClick: closeSetupModal,
                }}
              />
            )
          }
        >
          {setupStep === 1 && setupData && (
            <Stack spacing={3}>
              <Typography level='body-md'>
                <strong>{t('mfa.setup.step1Label')}</strong>{' '}
                {t('mfa.setup.step1')}
              </Typography>

              <Box className='flex justify-center rounded bg-white p-4'>
                {qrCodeDataUrl || setupData.qrCode ? (
                  <img
                    src={
                      qrCodeDataUrl ||
                      `data:image/png;base64,${setupData.qrCode}`
                    }
                    alt={t('mfa.setup.qrAlt')}
                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                  />
                ) : (
                  <Alert color='danger'>{t('mfa.setup.qrFailed')}</Alert>
                )}
              </Box>

              <Alert
                color='neutral'
                variant='soft'
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Typography level='title-sm'>
                  <strong>{t('mfa.setup.manualKey')}</strong>
                </Typography>
                <Typography
                  level='body-sm'
                  sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
                >
                  {setupData.secret}
                </Typography>
              </Alert>
            </Stack>
          )}

          {setupStep === 2 && (
            <Stack spacing={3}>
              <Typography level='body-md'>
                <strong>{t('mfa.setup.step2Label')}</strong>{' '}
                {t('mfa.setup.step2')}
              </Typography>

              <Input
                placeholder={t('mfa.setup.codePlaceholder')}
                value={verificationCode}
                size='lg'
                //   send on enter:
                onKeyDown={e => {
                  if (e.key === 'Enter' && verificationCode.length === 6) {
                    handleConfirmMFA()
                  }
                }}
                onChange={e => setVerificationCode(e.target.value)}
                sx={{
                  textAlign: 'center',
                  fontSize: '1.2em',
                  letterSpacing: verificationCode.length === 0 ? '' : '0.4em',
                }}
                slotProps={{
                  input: {
                    maxLength: 6,
                    pattern: '[0-9]*',
                  },
                }}
              />

              {error && <Alert color='danger'>{error}</Alert>}
            </Stack>
          )}

          {setupStep === 3 && (
            <Stack spacing={3}>
              <Box className='text-center'>
                <CheckCircle color='success' sx={{ fontSize: 48, mb: 2 }} />
                <Typography level='h4' color='success'>
                  {t('mfa.setup.successTitle')}
                </Typography>
              </Box>

              <Alert color='warning'>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('mfa.setup.backupCodesTitle')}
                </Typography>
                <Typography level='body-sm'>
                  {t('mfa.setup.backupCodesDescription')}
                </Typography>
              </Alert>

              <Card variant='outlined' sx={{ p: 2 }}>
                <Box className='grid grid-cols-2 gap-2 font-mono text-sm'>
                  {backupCodes?.map((code, index) => (
                    <Typography
                      key={index}
                      level='body-sm'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {code}
                    </Typography>
                  ))}
                </Box>
              </Card>
            </Stack>
          )}
        </AppModal>

        {/* Disable MFA Modal */}
        <AppModal
          open={disableModalOpen}
          onClose={closeDisableModal}
          title={t('mfa.disableModal.title')}
          size='sm'
          role='alertdialog'
          closeOnBackdrop={false}
          footer={
            <ModalActions
              secondary={{
                label: t('common.cancel'),
                onClick: closeDisableModal,
              }}
              primary={{
                label: t('mfa.disableModal.confirm'),
                color: 'danger',
                onClick: handleDisableMFA,
                disabled: disableCode.length !== 6,
              }}
            />
          }
        >
          <Stack spacing={3}>
            <Alert color='warning'>
              <Typography level='body-sm'>
                {t('mfa.disableModal.warning')}
              </Typography>
            </Alert>

            <Typography level='body-md'>
              {t('mfa.disableModal.prompt')}
            </Typography>

            <Input
              placeholder={t('mfa.setup.codePlaceholder')}
              value={disableCode}
              size='lg'
              onKeyDown={e => {
                if (e.key === 'Enter' && disableCode.length === 6) {
                  handleDisableMFA()
                }
              }}
              onChange={e => setDisableCode(e.target.value)}
              sx={{
                textAlign: 'center',
                fontSize: '1.2em',
                letterSpacing: verificationCode.length === 0 ? '' : '0.4em',
              }}
              slotProps={{
                input: {
                  maxLength: 6,
                  pattern: '[0-9]*',
                },
              }}
            />

            {error && <Alert color='danger'>{error}</Alert>}
          </Stack>
        </AppModal>

        {/* Backup Codes Modal */}
        <AppModal
          open={backupCodesModalOpen}
          onClose={() => setBackupCodesModalOpen(false)}
          title={t('mfa.backupCodesModal.title')}
          size='sm'
          footer={
            <ModalActions
              primary={{
                label: t('mfa.setup.savedBackupCodes'),
                onClick: () => setBackupCodesModalOpen(false),
              }}
            />
          }
        >
          <Stack spacing={3}>
            <Alert color='warning'>
              <Typography level='body-sm'>
                {t('mfa.backupCodesModal.warning')}
              </Typography>
            </Alert>

            <Card variant='outlined' sx={{ p: 2 }}>
              <Box className='grid grid-cols-2 gap-2 font-mono text-sm'>
                {backupCodes?.map((code, index) => (
                  <Typography
                    key={index}
                    level='body-sm'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {code}
                  </Typography>
                ))}
              </Box>
            </Card>
          </Stack>
        </AppModal>
      </div>
    </SettingsLayout>
  )
}

export default MFASettings
