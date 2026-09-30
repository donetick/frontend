import {
  CheckCircle,
  CloudOff,
  CloudQueue,
  ContentCopy,
  OpenInNew,
  Sync,
  Warning,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Input,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  ConnectBridge,
  DisconnectBridge,
  GetBridgeStatus,
  RotateBridgeCredential,
} from '../../utils/Fetcher'
import { canAccessAdminSettings } from '../../utils/UserHelpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const DEFAULT_BASE_URL = 'https://bridge.donetick.com'

// Maps Core's internal/bridge.Handler error `code` field (see
// donetick-core internal/bridge/handler.go errorStatusCode) to a
// translation key under settings.bridge.errors.*. Kept as an explicit
// allow-list so an unrecognized code always falls back to a generic
// message rather than silently showing nothing.
const ERROR_CODE_KEYS = {
  REVOKED_TOKEN: 'revokedToken',
  SERVICE_UNAVAILABLE: 'serviceUnavailable',
  RATE_LIMITED: 'rateLimited',
  QUOTA_EXCEEDED: 'quotaExceeded',
  DEVICE_LIMIT_REACHED: 'deviceLimitReached',
  VALIDATION_ERROR: 'validationError',
}

const emptyForm = {
  baseUrl: DEFAULT_BASE_URL,
  instanceId: '',
  instanceToken: '',
}

/**
 * Administrator-only settings for connecting this self-hosted Donetick
 * instance to Donetick Bridge, the hosted push-notification relay. Core
 * proxies every call here through its own /api/v1/bridge/* endpoints --
 * this page never talks to Bridge directly and never persists the
 * instance token in the browser (it is submitted once per
 * connect/rotate action and never stored client-side; Core is the only
 * place that holds it, encrypted-at-rest is a known gap noted in
 * donetick-bridge/work-log.md Phase 5).
 */
const BridgeSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showNotification } = useNotification()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null) // { connected, ... } | null
  const [errorCode, setErrorCode] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})
  const [showRotateForm, setShowRotateForm] = useState(false)

  const isAdmin = canAccessAdminSettings(userProfile)

  const refreshStatus = () => {
    setLoading(true)
    GetBridgeStatus()
      .then(async resp => {
        const data = await resp.json().catch(() => null)
        if (resp.ok) {
          setStatus(data)
          setErrorCode(null)
        } else {
          setStatus(data?.connected ? data : { connected: false })
          setErrorCode(data?.code || 'INTERNAL')
        }
      })
      .catch(() => {
        setStatus({ connected: false })
        setErrorCode('SERVICE_UNAVAILABLE')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isAdmin) refreshStatus()
    else setLoading(false)
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <SettingsLayout title={t('bridge.title')}>
        <Alert color='warning' sx={{ mt: 2 }}>
          {t('bridge.adminOnly')}
        </Alert>
      </SettingsLayout>
    )
  }

  const submitConnect = async (endpointFn, successMessage) => {
    if (!form.baseUrl || !form.instanceId || !form.instanceToken) {
      showNotification({
        type: 'danger',
        title: t('bridge.errors.validationError'),
        message: t('bridge.connectForm.required'),
      })
      return
    }
    setSubmitting(true)
    try {
      const resp = await endpointFn(form)
      const data = await resp.json().catch(() => null)
      if (resp.ok) {
        setStatus(data)
        setErrorCode(null)
        setForm(emptyForm)
        setShowRotateForm(false)
        showNotification({ type: 'success', title: successMessage })
      } else {
        const code = data?.code || 'INTERNAL'
        setErrorCode(code)
        showNotification({
          type: 'danger',
          title: t('bridge.errors.title'),
          message: t(`bridge.errors.${ERROR_CODE_KEYS[code] || 'generic'}`),
        })
      }
    } catch {
      setErrorCode('SERVICE_UNAVAILABLE')
      showNotification({
        type: 'danger',
        title: t('bridge.errors.title'),
        message: t('bridge.errors.serviceUnavailable'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisconnect = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: t('bridge.disconnectTitle'),
      message: t('bridge.disconnectMessage'),
      confirmText: t('bridge.disconnect'),
      cancelText: t('common.cancel'),
      color: 'danger',
      onClose: async isConfirmed => {
        setConfirmModalConfig({})
        if (!isConfirmed) return
        try {
          const resp = await DisconnectBridge()
          if (resp.ok) {
            setStatus({ connected: false })
            setErrorCode(null)
            showNotification({
              type: 'success',
              title: t('bridge.disconnectedTitle'),
            })
          }
        } catch {
          showNotification({
            type: 'danger',
            title: t('bridge.errors.title'),
            message: t('bridge.errors.serviceUnavailable'),
          })
        }
      },
    })
  }

  const connected = Boolean(status?.connected)
  const usage = status?.usage

  return (
    <SettingsLayout title={t('bridge.title')}>
      <Box className='grid gap-4 py-4' id='bridge'>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('bridge.description')}
        </Typography>
        <Alert color='neutral' variant='soft' startDecorator={<CloudQueue />}>
          {t('bridge.privacyNotice')}
        </Alert>

        {loading ? (
          <LinearProgress sx={{ maxWidth: 400 }} />
        ) : connected ? (
          <Card sx={{ maxWidth: 560, p: 2 }}>
            <Stack
              direction='row'
              alignItems='center'
              spacing={1}
              sx={{ mb: 1 }}
            >
              <CheckCircle color='success' />
              <Typography level='title-md'>
                {status.instanceName || t('bridge.unnamedInstance')}
              </Typography>
              <Chip
                size='sm'
                color={status.plan === 'free' ? 'neutral' : 'success'}
                variant='soft'
              >
                {status.plan === 'free'
                  ? t('bridge.planFree')
                  : t('bridge.planPlus')}
              </Chip>
              {!status.ownerEmailVerified && (
                <Chip size='sm' color='warning' variant='soft'>
                  {t('bridge.emailUnverified')}
                </Chip>
              )}
            </Stack>
            <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 1 }}>
              {t('bridge.connectedAs', { email: status.ownerEmailMasked })}
            </Typography>

            {usage && (
              <Box sx={{ my: 2 }}>
                <Typography level='body-xs' sx={{ mb: 0.5 }}>
                  {t('bridge.usage.notifications', {
                    used: usage.notificationsUsed,
                    limit: usage.notificationsLimit,
                  })}
                </Typography>
                <LinearProgress
                  determinate
                  value={Math.min(
                    100,
                    (usage.notificationsUsed /
                      (usage.notificationsLimit || 1)) *
                      100,
                  )}
                  sx={{ mb: 1.5 }}
                />
                <Typography level='body-xs' sx={{ mb: 0.5 }}>
                  {t('bridge.usage.devices', {
                    used: usage.activeDevices,
                    limit: usage.deviceLimit,
                  })}
                </Typography>
                <LinearProgress
                  determinate
                  value={Math.min(
                    100,
                    (usage.activeDevices / (usage.deviceLimit || 1)) * 100,
                  )}
                />
              </Box>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {status.plan === 'free' && (
                <Button
                  size='sm'
                  variant='solid'
                  color='primary'
                  endDecorator={<OpenInNew fontSize='small' />}
                  component='a'
                  href={form.baseUrl || DEFAULT_BASE_URL}
                  target='_blank'
                  rel='noreferrer'
                >
                  {t('bridge.upgrade')}
                </Button>
              )}
              <Button
                size='sm'
                variant='outlined'
                endDecorator={<OpenInNew fontSize='small' />}
                component='a'
                href={form.baseUrl || DEFAULT_BASE_URL}
                target='_blank'
                rel='noreferrer'
              >
                {t('bridge.manageBilling')}
              </Button>
              <Button
                size='sm'
                variant='outlined'
                startDecorator={<Sync fontSize='small' />}
                onClick={refreshStatus}
              >
                {t('bridge.refresh')}
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                onClick={() => setShowRotateForm(v => !v)}
              >
                {t('bridge.rotateCredential')}
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='danger'
                onClick={handleDisconnect}
              >
                {t('bridge.disconnect')}
              </Button>
            </Stack>

            <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1 }}>
              {t('bridge.upgradeBillingNote')}
            </Typography>

            {showRotateForm && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography level='body-sm' sx={{ mb: 1 }}>
                  {t('bridge.rotateInstructions')}
                </Typography>
                <ConnectForm
                  t={t}
                  form={form}
                  setForm={setForm}
                  submitting={submitting}
                  onSubmit={() =>
                    submitConnect(
                      RotateBridgeCredential,
                      t('bridge.rotatedTitle'),
                    )
                  }
                  submitLabel={t('bridge.rotateCredential')}
                />
              </Box>
            )}
          </Card>
        ) : (
          <Card sx={{ maxWidth: 560, p: 2 }}>
            <Stack
              direction='row'
              alignItems='center'
              spacing={1}
              sx={{ mb: 1 }}
            >
              <CloudOff color='neutral' />
              <Typography level='title-md'>
                {t('bridge.notConnected')}
              </Typography>
            </Stack>

            {errorCode && errorCode !== 'DISABLED' && (
              <Alert
                color='warning'
                variant='soft'
                startDecorator={<Warning />}
                sx={{ mb: 1.5 }}
              >
                {t(`bridge.errors.${ERROR_CODE_KEYS[errorCode] || 'generic'}`)}
              </Alert>
            )}

            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mb: 1.5 }}
            >
              {t('bridge.connectIntro')}
            </Typography>
            <ConnectForm
              t={t}
              form={form}
              setForm={setForm}
              submitting={submitting}
              onSubmit={() =>
                submitConnect(ConnectBridge, t('bridge.connectedTitle'))
              }
              submitLabel={t('bridge.connect')}
            />
          </Card>
        )}
      </Box>
      <ConfirmationModal config={confirmModalConfig} />
    </SettingsLayout>
  )
}

const ConnectForm = ({
  form,
  onSubmit,
  setForm,
  submitLabel,
  submitting,
  t,
}) => (
  <Stack spacing={1.5} sx={{ maxWidth: 420 }}>
    <Box>
      <Typography level='body-xs' sx={{ mb: 0.5 }}>
        {t('bridge.connectForm.baseUrl')}
      </Typography>
      <Input
        value={form.baseUrl}
        onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
        placeholder={DEFAULT_BASE_URL}
      />
    </Box>
    <Box>
      <Typography level='body-xs' sx={{ mb: 0.5 }}>
        {t('bridge.connectForm.instanceId')}
      </Typography>
      <Input
        value={form.instanceId}
        onChange={e => setForm(f => ({ ...f, instanceId: e.target.value }))}
        placeholder={t('bridge.connectForm.instanceIdPlaceholder')}
      />
    </Box>
    <Box>
      <Typography level='body-xs' sx={{ mb: 0.5 }}>
        {t('bridge.connectForm.instanceToken')}
      </Typography>
      <Input
        type='password'
        value={form.instanceToken}
        onChange={e => setForm(f => ({ ...f, instanceToken: e.target.value }))}
        placeholder={t('bridge.connectForm.instanceTokenPlaceholder')}
        startDecorator={<ContentCopy fontSize='small' sx={{ opacity: 0.4 }} />}
      />
      <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
        {t('bridge.connectForm.instanceTokenHint')}
      </Typography>
    </Box>
    <Button
      loading={submitting}
      onClick={onSubmit}
      sx={{ alignSelf: 'flex-start' }}
    >
      {submitLabel}
    </Button>
  </Stack>
)

export default BridgeSettings
