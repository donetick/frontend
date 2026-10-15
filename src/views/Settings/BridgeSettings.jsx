import {
  ArrowForwardRounded,
  CheckCircleRounded,
  CloudDoneRounded,
  CloudOffRounded,
  FavoriteRounded,
  KeyRounded,
  LaunchRounded,
  NotificationsActiveRounded,
  RefreshRounded,
  SecurityRounded,
  SyncRounded,
  WarningRounded,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  LinearProgress,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
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
const BRIDGE_WEB_URL =
  import.meta.env.VITE_BRIDGE_WEB_URL || 'https://connect.donetick.com'

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

const heroBackground =
  'linear-gradient(145deg, var(--joy-palette-background-surface) 30%, var(--joy-palette-primary-softBg) 140%)'

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const benefitItems = [
  {
    key: 'native',
    icon: NotificationsActiveRounded,
  },
  {
    key: 'support',
    icon: FavoriteRounded,
  },
  {
    key: 'simple',
    icon: SecurityRounded,
  },
]

const BenefitCard = ({ benefitKey, icon: Icon, t }) => (
  <Box
    sx={{
      display: 'flex',
      flex: 1,
      gap: 1.25,
      minWidth: { sm: 0 },
      p: { xs: 1.5, sm: 0 },
      borderRadius: { xs: 'lg', sm: 0 },
      bgcolor: { xs: 'background.level1', sm: 'transparent' },
    }}
  >
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'primary.softBg',
        borderRadius: '50%',
        color: 'primary.plainColor',
        display: 'flex',
        flex: '0 0 auto',
        height: 36,
        justifyContent: 'center',
        width: 36,
        '& svg': { fontSize: 19 },
      }}
    >
      <Icon />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography level='title-sm'>
        {t(`bridge.benefits.${benefitKey}.title`)}
      </Typography>
      <Typography level='body-xs' textColor='text.secondary' sx={{ mt: 0.25 }}>
        {t(`bridge.benefits.${benefitKey}.description`)}
      </Typography>
    </Box>
  </Box>
)

BenefitCard.propTypes = {
  benefitKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  t: PropTypes.func.isRequired,
}

const UsageMeter = ({ label, limit, used }) => {
  const percentage = Math.min(100, (used / (limit || 1)) * 100)
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{
          alignItems: 'baseline',
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.75,
        }}
      >
        <Typography level='body-xs' textColor='text.secondary'>
          {label}
        </Typography>
        <Typography level='title-sm'>
          {used}
          <Typography level='body-xs' textColor='text.tertiary'>
            {' '}
            / {limit}
          </Typography>
        </Typography>
      </Box>
      <LinearProgress
        determinate
        value={percentage}
        color={percentage >= 90 ? 'warning' : 'primary'}
        sx={{ borderRadius: 'sm', height: 6 }}
      />
    </Box>
  )
}

UsageMeter.propTypes = {
  label: PropTypes.string.isRequired,
  limit: PropTypes.number,
  used: PropTypes.number,
}

const ConnectForm = ({
  form,
  onSubmit,
  setForm,
  submitLabel,
  submitting,
  t,
}) => (
  <Stack spacing={2}>
    {/* <FormControl required>
      <FormLabel>{t('bridge.connectForm.baseUrl')}</FormLabel>
      <Input
        value={form.baseUrl}
        onChange={event =>
          setForm(current => ({ ...current, baseUrl: event.target.value }))
        }
        placeholder={DEFAULT_BASE_URL}
      />
    </FormControl> */}
    <FormControl required>
      <FormLabel>{t('bridge.connectForm.instanceId')}</FormLabel>
      <Input
        value={form.instanceId}
        onChange={event =>
          setForm(current => ({ ...current, instanceId: event.target.value }))
        }
        placeholder={t('bridge.connectForm.instanceIdPlaceholder')}
      />
    </FormControl>
    <FormControl required>
      <FormLabel>{t('bridge.connectForm.instanceToken')}</FormLabel>
      <Input
        type='password'
        value={form.instanceToken}
        onChange={event =>
          setForm(current => ({
            ...current,
            instanceToken: event.target.value,
          }))
        }
        placeholder={t('bridge.connectForm.instanceTokenPlaceholder')}
        startDecorator={<KeyRounded fontSize='small' />}
      />
      <FormHelperText>
        {t('bridge.connectForm.instanceTokenHint')}
      </FormHelperText>
    </FormControl>
    <Button
      size='lg'
      loading={submitting}
      onClick={onSubmit}
      endDecorator={<ArrowForwardRounded />}
      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, px: 3 }}
    >
      {submitLabel}
    </Button>
  </Stack>
)

ConnectForm.propTypes = {
  form: PropTypes.shape({
    baseUrl: PropTypes.string.isRequired,
    instanceId: PropTypes.string.isRequired,
    instanceToken: PropTypes.string.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
}

const BridgeIntro = ({ connected, loading, t }) => (
  <>
    <Sheet
      sx={{
        ...surfaceSx,
        background: heroBackground,
        overflow: 'hidden',
        p: { xs: 2.25, sm: 3 },
        position: 'relative',
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.softBg',
          borderRadius: '50%',
          filter: 'blur(2px)',
          height: 180,
          opacity: 0.55,
          position: 'absolute',
          right: -80,
          top: -90,
          width: 180,
        }}
      />
      <Box sx={{ maxWidth: 560, position: 'relative' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            size='sm'
            variant='soft'
            color={connected ? 'success' : 'primary'}
            startDecorator={
              connected ? <CheckCircleRounded /> : <CloudDoneRounded />
            }
          >
            {connected ? t('bridge.connectedBadge') : t('bridge.heroEyebrow')}
          </Chip>
          {!connected && (
            <Chip size='sm' variant='soft' color='success'>
              {t('bridge.freeToStart')}
            </Chip>
          )}
        </Box>
        <Typography
          level='h2'
          sx={{
            fontSize: { xs: '1.65rem', sm: '2rem' },
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            mt: 1.5,
            textWrap: 'balance',
          }}
        >
          {t('bridge.heroTitle')}
        </Typography>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: '58ch', mt: 1, textWrap: 'pretty' }}
        >
          {t('bridge.description')}
        </Typography>
        {!connected && (
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 0.75,
              mt: 1.5,
            }}
          >
            <CheckCircleRounded
              color='success'
              sx={{ flex: '0 0 auto', fontSize: 18 }}
            />
            <Typography level='body-sm' sx={{ fontWeight: 550 }}>
              {t('bridge.pricingSummary')}
            </Typography>
          </Box>
        )}
        {!connected && !loading && (
          <Button
            component='a'
            href={`${BRIDGE_WEB_URL}/signup`}
            target='_blank'
            rel='noreferrer'
            endDecorator={<LaunchRounded />}
            sx={{ mt: 2.25 }}
          >
            {t('bridge.getStarted')}
          </Button>
        )}
      </Box>
    </Sheet>

    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 2.5 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      {benefitItems.map(item => (
        <BenefitCard
          key={item.key}
          benefitKey={item.key}
          icon={item.icon}
          t={t}
        />
      ))}
    </Box>

    <Alert
      color='neutral'
      variant='soft'
      startDecorator={<SecurityRounded />}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography level='title-sm'>{t('bridge.privacyTitle')}</Typography>
        <Typography level='body-xs' textColor='text.secondary'>
          {t('bridge.privacyNotice')}
        </Typography>
      </Box>
    </Alert>
  </>
)

BridgeIntro.propTypes = {
  connected: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
}

const BridgeSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showNotification } = useNotification()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})
  const [showRotateForm, setShowRotateForm] = useState(false)

  const isAdmin = canAccessAdminSettings(userProfile)

  const refreshStatus = () => {
    setLoading(true)
    GetBridgeStatus()
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (response.ok) {
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
    // Status is remote state; this effect intentionally starts its first fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdmin) refreshStatus()
    else setLoading(false)
  }, [isAdmin])

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
      const response = await endpointFn(form)
      const data = await response.json().catch(() => null)
      if (response.ok) {
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
          const response = await DisconnectBridge()
          if (response.ok) {
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

  if (!isAdmin) {
    return (
      <SettingsLayout title={t('bridge.title')}>
        <Alert color='warning' sx={{ mt: 2, maxWidth: 760 }}>
          {t('bridge.adminOnly')}
        </Alert>
      </SettingsLayout>
    )
  }

  const connected = Boolean(status?.connected)
  const usage = status?.usage

  return (
    <SettingsLayout title={t('bridge.title')}>
      <Box id='bridge' sx={{ maxWidth: 760, pb: 4 }}>
        <BridgeIntro connected={connected} loading={loading} t={t} />

        {loading ? (
          <Sheet sx={{ ...surfaceSx, p: { xs: 2, sm: 2.5 } }}>
            <Typography
              level='body-sm'
              textColor='text.secondary'
              sx={{ mb: 1 }}
            >
              {t('bridge.checkingStatus')}
            </Typography>
            <LinearProgress />
          </Sheet>
        ) : connected ? (
          <Box component='section'>
            <Typography level='title-md' sx={{ fontWeight: 650, mb: 1.25 }}>
              {t('bridge.connectionTitle')}
            </Typography>
            <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5 }}>
                    <Box
                      sx={{
                        bgcolor: 'success.softBg',
                        borderRadius: '50%',
                        color: 'success.plainColor',
                        display: 'grid',
                        flex: '0 0 auto',
                        height: 44,
                        placeItems: 'center',
                        width: 44,
                      }}
                    >
                      <CloudDoneRounded />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography level='title-lg' noWrap>
                        {status.instanceName || t('bridge.unnamedInstance')}
                      </Typography>
                      <Typography level='body-xs' textColor='text.secondary'>
                        {t('bridge.connectedAs', {
                          email: status.ownerEmailMasked,
                        })}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
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
                  </Box>
                </Box>

                {usage && (
                  <Box
                    sx={{
                      bgcolor: 'background.level1',
                      borderRadius: 'lg',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2.5,
                      mt: 2.5,
                      p: 2,
                    }}
                  >
                    <UsageMeter
                      label={t('bridge.usage.notificationsLabel')}
                      used={usage.notificationsUsed}
                      limit={usage.notificationsLimit}
                    />
                    <Divider
                      orientation='vertical'
                      sx={{ display: { xs: 'none', sm: 'block' } }}
                    />
                    <UsageMeter
                      label={t('bridge.usage.devicesLabel')}
                      used={usage.activeDevices}
                      limit={usage.deviceLimit}
                    />
                  </Box>
                )}
              </Box>

              <Divider />
              <Box
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  bgcolor: 'background.level1',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  flexWrap: 'wrap',
                  gap: 1,
                  p: 1.5,
                }}
              >
                {status.plan === 'free' && (
                  <Button
                    size='sm'
                    component='a'
                    href={BRIDGE_WEB_URL}
                    target='_blank'
                    rel='noreferrer'
                    endDecorator={<LaunchRounded />}
                  >
                    {t('bridge.upgrade')}
                  </Button>
                )}
                <Button
                  size='sm'
                  variant='soft'
                  color='neutral'
                  component='a'
                  href={BRIDGE_WEB_URL}
                  target='_blank'
                  rel='noreferrer'
                  endDecorator={<LaunchRounded />}
                >
                  {t('bridge.manageBilling')}
                </Button>
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  startDecorator={<RefreshRounded />}
                  onClick={refreshStatus}
                >
                  {t('bridge.refresh')}
                </Button>
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  startDecorator={<SyncRounded />}
                  onClick={() => setShowRotateForm(value => !value)}
                >
                  {t('bridge.rotateCredential')}
                </Button>
                <Button
                  size='sm'
                  variant='plain'
                  color='danger'
                  onClick={handleDisconnect}
                  sx={{ ml: { sm: 'auto' } }}
                >
                  {t('bridge.disconnect')}
                </Button>
              </Box>

              {showRotateForm && (
                <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Typography level='title-md'>
                    {t('bridge.rotateCredential')}
                  </Typography>
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    sx={{ mb: 2, mt: 0.5 }}
                  >
                    {t('bridge.rotateInstructions')}
                  </Typography>
                  <Box sx={{ maxWidth: 460 }}>
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
                </Box>
              )}
            </Sheet>
            <Typography
              level='body-xs'
              textColor='text.tertiary'
              sx={{ mt: 1 }}
            >
              {t('bridge.upgradeBillingNote')}
            </Typography>
          </Box>
        ) : (
          <Box component='section'>
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                gap: 1.25,
                mb: 1.25,
              }}
            >
              <Box
                sx={{
                  bgcolor: 'neutral.softBg',
                  borderRadius: '50%',
                  color: 'neutral.plainColor',
                  display: 'grid',
                  height: 36,
                  placeItems: 'center',
                  width: 36,
                }}
              >
                <CloudOffRounded fontSize='small' />
              </Box>
              <Box>
                <Typography level='title-md'>
                  {t('bridge.connectTitle')}
                </Typography>
                <Typography level='body-xs' textColor='text.secondary'>
                  {t('bridge.notConnected')}
                </Typography>
              </Box>
            </Box>

            {errorCode && errorCode !== 'DISABLED' && (
              <Alert
                color='warning'
                variant='soft'
                startDecorator={<WarningRounded />}
                sx={{ mb: 1.5 }}
              >
                {t(`bridge.errors.${ERROR_CODE_KEYS[errorCode] || 'generic'}`)}
              </Alert>
            )}

            <Sheet sx={{ ...surfaceSx, p: { xs: 2, sm: 2.5 } }}>
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 2.5, md: 4 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1fr) 180px',
                  },
                }}
              >
                <Box>
                  <Typography level='title-lg'>
                    {t('bridge.credentialsTitle')}
                  </Typography>
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    sx={{ mb: 2.5, mt: 0.5 }}
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
                </Box>

                <Box
                  sx={{
                    borderLeft: { md: '1px solid' },
                    borderColor: { md: 'divider' },
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    gap: 2,
                    pl: { md: 3 },
                    pt: { xs: 0.5, md: 0 },
                  }}
                >
                  {[1, 2, 3].map(step => (
                    <Box
                      key={step}
                      sx={{
                        display: 'flex',
                        flex: { xs: 1, md: 'none' },
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          alignItems: 'center',
                          bgcolor: 'primary.softBg',
                          borderRadius: '50%',
                          color: 'primary.plainColor',
                          display: 'flex',
                          flex: '0 0 auto',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          height: 24,
                          justifyContent: 'center',
                          width: 24,
                        }}
                      >
                        {step}
                      </Box>
                      <Typography level='body-xs' textColor='text.secondary'>
                        {t(`bridge.steps.${step}`)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Sheet>

            <Button
              component='a'
              href={`${BRIDGE_WEB_URL}/signup`}
              target='_blank'
              rel='noreferrer'
              variant='plain'
              size='sm'
              endDecorator={<LaunchRounded />}
              sx={{ mt: 1, ml: -1 }}
            >
              {t('bridge.getStartedHint')}
            </Button>
          </Box>
        )}
      </Box>
      <ConfirmationModal config={confirmModalConfig} />
    </SettingsLayout>
  )
}

export default BridgeSettings
