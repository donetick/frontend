import { CheckCircle, Security, Smartphone } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Stack,
  Typography,
} from '@mui/joy'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ConfirmMFA,
  DisableMFA,
  GetMFAStatus,
  RegenerateBackupCodes,
  SetupMFA,
} from '../../utils/Fetcher'
import LoadingComponent from '../components/Loading'
import SettingsLayout from './SettingsLayout'

const MFASettings = () => {
  const { t } = useTranslation(['settings', 'common', 'auth'])
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
      setError(t('settings:mfaPage.failedQr'))
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
          setError(t('settings:mfaPage.invalidResponse'))
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
          setError(t('settings:mfaPage.endpointMissing'))
        } else if (response.status === 401) {
          setError(t('settings:mfaPage.unauthorized'))
        } else if (response.status === 500) {
          setError(t('settings:mfaPage.serverError'))
        } else {
          const errorData = await response.json().catch(() => ({}))
          setError(
            errorData.message ||
              t('settings:mfaPage.setupFailed', { status: response.status }),
          )
        }
      }
    } catch (error) {
      console.error('Error setting up MFA:', error)
      setError(t('settings:mfaPage.networkError'))
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
        setSuccess(t('settings:mfaPage.enabledToast'))
      } else {
        setError(t('settings:mfaPage.invalidCode'))
      }
    } catch (error) {
      setError(t('settings:mfaPage.confirmFailed'))
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
        setSuccess(t('settings:mfaPage.disabledToast'))
      } else {
        setError(t('settings:mfaPage.invalidCode'))
      }
    } catch (error) {
      setError(t('settings:mfaPage.disableFailed'))
      console.error('Error disabling MFA:', error)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    try {
      setError('')
      const response = await RegenerateBackupCodes()
      if (response.ok) {
        const data = await response.json()
        setBackupCodes(data.backupCodes)
        setBackupCodesModalOpen(true)
        setSuccess(t('settings:mfaPage.backupRegenerated'))
      } else {
        setError(t('settings:mfaPage.regenerateFailed'))
      }
    } catch (error) {
      setError(t('settings:mfaPage.regenerateFailed'))
      console.error('Error regenerating backup codes:', error)
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
    <SettingsLayout title={t('settings:pages.mfa.title')}>
      <div className='grid gap-4 py-4' id='mfa'>
        <Typography level='body-md'>
          {t('settings:mfaPage.description')}
        </Typography>

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
                <Typography level='title-md'>
                  {t('settings:mfaPage.title')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {mfaEnabled
                    ? t('settings:mfaPage.enabled')
                    : t('settings:mfaPage.disabled')}
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
                  {t('settings:mfaPage.disable')}
                </Button>
              ) : (
                <Button
                  color='primary'
                  variant='solid'
                  onClick={handleSetupMFA}
                >
                  {t('settings:mfaPage.enable')}
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
              Generate New Codes
            </Button>
          </Box>
        </Card>
      )} */}

        {/* Setup MFA Modal */}
        <Modal open={setupModalOpen} onClose={closeSetupModal}>
          <ModalDialog size='md' sx={{ maxWidth: 500 }}>
            <ModalClose />
            <Typography level='h4' sx={{ mb: 2 }}>
              {t('settings:mfaPage.setupTitle')}
            </Typography>

            {setupStep === 1 && setupData && (
              <Stack spacing={3}>
                <Typography level='body-md'>
                  {t('settings:mfaPage.step1')}
                </Typography>

                <Box className='flex justify-center rounded bg-white p-4'>
                  {qrCodeDataUrl || setupData.qrCode ? (
                    <img
                      src={
                        qrCodeDataUrl ||
                        `data:image/png;base64,${setupData.qrCode}`
                      }
                      alt='MFA QR Code'
                      style={{ maxWidth: '200px', maxHeight: '200px' }}
                    />
                  ) : (
                    <Alert color='danger'>
                      {t('settings:mfaPage.failedQr')}
                    </Alert>
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
                    <strong>{t('settings:mfaPage.manualKey')}</strong>
                  </Typography>
                  <Typography
                    level='body-sm'
                    sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
                  >
                    {setupData.secret}
                  </Typography>
                </Alert>

                <Button
                  color='primary'
                  onClick={() => setSetupStep(2)}
                  startDecorator={<Smartphone />}
                >
                  {t('settings:mfaPage.addedToApp')}
                </Button>
              </Stack>
            )}

            {setupStep === 2 && (
              <Stack spacing={3}>
                <Typography level='body-md'>
                  {t('settings:mfaPage.step2')}
                </Typography>

                <Input
                  placeholder={t('auth:placeholders.verificationCode')}
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

                <Box className='flex gap-2'>
                  <Button
                    variant='outlined'
                    onClick={() => setSetupStep(1)}
                    sx={{ flex: 1 }}
                  >
                    {t('navigation:back', { defaultValue: 'Back' })}
                  </Button>
                  <Button
                    color='primary'
                    onClick={handleConfirmMFA}
                    disabled={verificationCode.length !== 6}
                    sx={{ flex: 1 }}
                  >
                    {t('settings:mfaPage.verifyEnable')}
                  </Button>
                </Box>
              </Stack>
            )}

            {setupStep === 3 && (
              <Stack spacing={3}>
                <Box className='text-center'>
                  <CheckCircle color='success' sx={{ fontSize: 48, mb: 2 }} />
                  <Typography level='h4' color='success'>
                    {t('settings:mfaPage.enabledSuccess')}
                  </Typography>
                </Box>

                <Alert color='warning'>
                  <Typography level='title-sm' sx={{ mb: 1 }}>
                    {t('settings:mfaPage.backupSaveTitle')}
                  </Typography>
                  <Typography level='body-sm'>
                    {t('settings:mfaPage.backupSaveDescription')}
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

                <Button color='primary' onClick={closeSetupModal}>
                  {t('settings:mfaPage.savedBackupCodes')}
                </Button>
              </Stack>
            )}
          </ModalDialog>
        </Modal>

        {/* Disable MFA Modal */}
        <Modal open={disableModalOpen} onClose={closeDisableModal}>
          <ModalDialog size='sm'>
            <ModalClose />
            <Typography level='h4' sx={{ mb: 2 }}>
              {t('settings:mfaPage.disableTitle')}
            </Typography>

            <Stack spacing={3}>
              <Alert color='warning'>
                <Typography level='body-sm'>
                  {t('settings:mfaPage.disableWarning')}
                </Typography>
              </Alert>

              <Typography level='body-md'>
                {t('settings:mfaPage.disablePrompt')}
              </Typography>

              <Input
                placeholder={t('auth:placeholders.verificationCode')}
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

              <Box className='flex gap-2'>
                <Button
                  variant='outlined'
                  onClick={closeDisableModal}
                  sx={{ flex: 1 }}
                >
                  {t('common:actions.cancel')}
                </Button>
                <Button
                  color='danger'
                  onClick={handleDisableMFA}
                  disabled={disableCode.length !== 6}
                  sx={{ flex: 1 }}
                >
                  {t('settings:mfaPage.disableTitle')}
                </Button>
              </Box>
            </Stack>
          </ModalDialog>
        </Modal>

        {/* Backup Codes Modal */}
        <Modal
          open={backupCodesModalOpen}
          onClose={() => setBackupCodesModalOpen(false)}
        >
          <ModalDialog size='sm'>
            <ModalClose />
            <Typography level='h4' sx={{ mb: 2 }}>
              {t('settings:mfaPage.backupCodesTitle')}
            </Typography>

            <Stack spacing={3}>
              <Alert color='warning'>
                <Typography level='body-sm'>
                  {t('settings:mfaPage.backupCodesWarning')}
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

              <Button
                color='primary'
                onClick={() => setBackupCodesModalOpen(false)}
              >
                {t('settings:mfaPage.savedBackupCodes')}
              </Button>
            </Stack>
          </ModalDialog>
        </Modal>
      </div>
    </SettingsLayout>
  )
}

export default MFASettings
