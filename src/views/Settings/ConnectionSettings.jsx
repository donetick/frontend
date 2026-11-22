import {
  CheckCircleRounded,
  CloudDoneRounded,
  CloudOffRounded,
  DnsRounded,
  HelpOutlineRounded,
  LaunchRounded,
  MonitorHeartRounded,
  RefreshRounded,
  WarningRounded,
  WifiOffRounded,
} from '@mui/icons-material'
import { Alert, Box, Button, Chip, Divider, Sheet, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'

import { networkManager } from '../../hooks/NetworkManager'
import {
  getApiFailures,
  getServerVersion,
} from '../../service/DiagnosticsSession'
import { useNotification } from '../../service/NotificationProvider'
import { openExternalLink } from '../../utils/ExternalLinks'
import { isOfflineFeatureEnabled } from '../../utils/OfflineFeatureToggle'
import {
  getServerHealth,
  probeServer,
  SERVER_STATUS,
  subscribeToServerHealth,
} from '../../utils/ServerHealth'
import {
  DONETICK_STATUS_URL,
  getServerBaseUrl,
  getServerHost,
  isOfficialServer,
} from '../../utils/ServerInfo'
import { syncEngine } from '../../utils/SyncEngine'
import SettingsLayout from './SettingsLayout'

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const heroBackground = color =>
  `linear-gradient(145deg, var(--joy-palette-background-surface) 30%, var(--joy-palette-${color}-softBg) 140%)`

// The device having no network is a different problem from the server being
// down, and it is the one worth naming first — nothing else can be diagnosed
// until it is fixed.
const DEVICE_OFFLINE = 'deviceOffline'

const STATE_META = {
  [DEVICE_OFFLINE]: { color: 'danger', icon: WifiOffRounded },
  [SERVER_STATUS.unreachable]: { color: 'danger', icon: CloudOffRounded },
  [SERVER_STATUS.degraded]: { color: 'warning', icon: WarningRounded },
  [SERVER_STATUS.healthy]: { color: 'success', icon: CloudDoneRounded },
  [SERVER_STATUS.unknown]: { color: 'neutral', icon: HelpOutlineRounded },
}

const ConnectionSettings = () => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { showNotification } = useNotification()

  const [health, setHealth] = useState(getServerHealth)
  const [deviceOnline, setDeviceOnline] = useState(networkManager.deviceOnline)
  // null until Preferences answers, so the page doesn't flash "self-hosted" at
  // cloud users for a frame.
  const [serverUrl, setServerUrl] = useState(null)
  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const offlineEnabled = isOfflineFeatureEnabled()

  useEffect(() => subscribeToServerHealth(setHealth), [])

  useEffect(() => {
    const handleNetworkChange = () =>
      setDeviceOnline(networkManager.deviceOnline)
    networkManager.registerNetworkListener(handleNetworkChange)
    return () => networkManager.unregisterNetworkListener(handleNetworkChange)
  }, [])

  useEffect(() => {
    // The configured server lives in Preferences, so it has to be read async.

    getServerBaseUrl().then(setServerUrl)
  }, [])

  // ServerHealth only announces status changes; the timestamps on this page
  // move on their own, so re-read them on a slow tick while it is open.
  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(getServerHealth())
      setNow(Date.now())
    }, 15_000)
    return () => clearInterval(interval)
  }, [])

  const formatAgo = timestamp => {
    if (!timestamp) return t('connection.never')
    const seconds = Math.floor((now - timestamp) / 1000)
    if (seconds < 10) return tCommon('sync.justNow')
    if (seconds < 60) return tCommon('sync.secondsAgo', { count: seconds })
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return tCommon('sync.minutesAgo', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return tCommon('sync.hoursAgo', { count: hours })
    return new Date(timestamp).toLocaleString()
  }

  const handleCheck = async () => {
    setChecking(true)
    try {
      const result = await probeServer()
      const reachable = result.status !== SERVER_STATUS.unreachable
      // A healthy server after an outage should also clear the offline state,
      // and only a successful sync is allowed to do that (see SyncEngine).
      if (reachable && offlineEnabled) syncEngine.sync().catch(() => {})
      setHealth(getServerHealth())
      setNow(Date.now())
      showNotification({
        type: reachable ? 'success' : 'danger',
        message: reachable
          ? t('connection.checkReachable')
          : t('connection.checkUnreachable'),
      })
    } finally {
      setChecking(false)
    }
  }

  const state = deviceOnline ? health.status : DEVICE_OFFLINE
  const { color, icon: StateIcon } = STATE_META[state] ?? STATE_META.unknown
  const serverKnown = serverUrl !== null
  const official = serverKnown && isOfficialServer(serverUrl)
  const host = serverKnown ? getServerHost(serverUrl) : ''
  const serverVersion = getServerVersion()
  const failures = getApiFailures()

  return (
    <SettingsLayout title={t('connection.title')}>
      <Box id='connection' sx={{ maxWidth: 760, pb: 4 }}>
        <Sheet
          sx={{
            ...surfaceSx,
            background: heroBackground(color),
            overflow: 'hidden',
            p: { xs: 2.25, sm: 3 },
            position: 'relative',
          }}
        >
          <Box
            sx={{
              bgcolor: `${color}.softBg`,
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
            <Chip
              size='sm'
              variant='soft'
              color={color}
              startDecorator={<StateIcon />}
            >
              {t(`connection.states.${state}.badge`)}
            </Chip>
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
              {t(`connection.states.${state}.title`)}
            </Typography>
            <Typography
              level='body-md'
              textColor='text.secondary'
              sx={{ maxWidth: '58ch', mt: 1, textWrap: 'pretty' }}
            >
              {t(`connection.states.${state}.description`)}
            </Typography>
            <Button
              loading={checking}
              onClick={handleCheck}
              startDecorator={<RefreshRounded />}
              sx={{ mt: 2.25 }}
            >
              {checking ? t('connection.checking') : t('connection.checkNow')}
            </Button>
          </Box>
        </Sheet>

        <Box component='section' sx={{ mt: 3 }}>
          <Typography level='title-md' sx={{ fontWeight: 650, mb: 1.25 }}>
            {t('connection.serverTitle')}
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
                      bgcolor: `${color}.softBg`,
                      borderRadius: '50%',
                      color: `${color}.plainColor`,
                      display: 'grid',
                      flex: '0 0 auto',
                      height: 44,
                      placeItems: 'center',
                      width: 44,
                    }}
                  >
                    <DnsRounded />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      level='title-lg'
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {serverKnown
                        ? host || t('connection.unknownServer')
                        : '…'}
                    </Typography>
                    <Typography level='body-xs' textColor='text.secondary'>
                      {serverVersion
                        ? t('connection.serverVersion', {
                            version: serverVersion,
                          })
                        : t('connection.versionUnknown')}
                    </Typography>
                  </Box>
                </Box>
                {serverKnown && (
                  <Chip
                    size='sm'
                    variant='soft'
                    color={official ? 'primary' : 'neutral'}
                  >
                    {official
                      ? t('connection.officialServer')
                      : t('connection.selfHostedServer')}
                  </Chip>
                )}
              </Box>

              <Box
                sx={{
                  bgcolor: 'background.level1',
                  borderRadius: 'lg',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 2.5 },
                  mt: 2.5,
                  p: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='body-xs' textColor='text.secondary'>
                    {t('connection.lastContact')}
                  </Typography>
                  <Typography level='title-sm'>
                    {formatAgo(health.lastSuccessAt)}
                  </Typography>
                </Box>
                <Divider
                  orientation='vertical'
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='body-xs' textColor='text.secondary'>
                    {t('connection.lastFailure')}
                  </Typography>
                  <Typography level='title-sm'>
                    {formatAgo(health.lastFailureAt)}
                    {health.lastStatusCode && health.lastFailureAt ? (
                      <Typography level='body-xs' textColor='text.tertiary'>
                        {' '}
                        ·{' '}
                        {health.lastStatusCode === 'network'
                          ? t('connection.networkError')
                          : t('connection.httpStatus', {
                              status: health.lastStatusCode,
                            })}
                      </Typography>
                    ) : null}
                  </Typography>
                </Box>
              </Box>
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
              {official && (
                <Button
                  size='sm'
                  endDecorator={<LaunchRounded />}
                  onClick={() => openExternalLink(DONETICK_STATUS_URL)}
                >
                  {t('connection.statusPageAction')}
                </Button>
              )}
              <Button
                size='sm'
                variant='plain'
                color='neutral'
                component={RouterLink}
                to='/settings/advanced'
              >
                {t('connection.offlineSettings')}
              </Button>
            </Box>
          </Sheet>
        </Box>

        {!serverKnown ? null : official ? (
          <Alert
            color='primary'
            variant='soft'
            startDecorator={<MonitorHeartRounded />}
            sx={{ mt: 2 }}
          >
            <Box>
              <Typography level='title-sm'>
                {t('connection.statusPageTitle')}
              </Typography>
              <Typography level='body-xs' textColor='text.secondary'>
                {t('connection.statusPageDescription')}
              </Typography>
            </Box>
          </Alert>
        ) : (
          <Alert
            color='neutral'
            variant='soft'
            startDecorator={<DnsRounded />}
            sx={{ mt: 2 }}
          >
            <Box>
              <Typography level='title-sm'>
                {t('connection.selfHostedTitle')}
              </Typography>
              <Typography level='body-xs' textColor='text.secondary'>
                {t('connection.selfHostedDescription')}
              </Typography>
            </Box>
          </Alert>
        )}

        <Box component='section' sx={{ mt: 3 }}>
          <Typography level='title-md' sx={{ fontWeight: 650, mb: 1.25 }}>
            {t('connection.recentFailuresTitle')}
          </Typography>
          <Sheet sx={{ ...surfaceSx, p: { xs: 2, sm: 2.5 } }}>
            {failures.length === 0 ? (
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <CheckCircleRounded
                  color='success'
                  sx={{ flex: '0 0 auto', fontSize: 18 }}
                />
                <Typography level='body-sm' textColor='text.secondary'>
                  {t('connection.noFailures')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography level='body-xs' textColor='text.secondary'>
                  {t('connection.recentFailuresDescription')}
                </Typography>
                {failures
                  .slice()
                  .reverse()
                  .map((failure, index) => (
                    <Box
                      key={`${failure.endpoint}-${failure.msAgo}-${index}`}
                      sx={{
                        alignItems: 'center',
                        borderTop: index ? '1px solid' : 'none',
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'space-between',
                        pt: index ? 1 : 0,
                      }}
                    >
                      <Typography
                        level='body-sm'
                        sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                      >
                        <Typography level='body-xs' textColor='text.tertiary'>
                          {failure.method}{' '}
                        </Typography>
                        {failure.endpoint}
                      </Typography>
                      <Chip
                        size='sm'
                        variant='soft'
                        color={
                          failure.status === 'network' ? 'danger' : 'warning'
                        }
                      >
                        {failure.status === 'network'
                          ? t('connection.networkError')
                          : failure.status}
                      </Chip>
                    </Box>
                  ))}
              </Box>
            )}
          </Sheet>
          <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 1 }}>
            {t('connection.sessionOnlyNote')}
          </Typography>
        </Box>
      </Box>
    </SettingsLayout>
  )
}

export default ConnectionSettings
