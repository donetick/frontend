import {
  CalendarMonth,
  ContentCopy,
  DeleteOutline,
  Refresh,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Input,
  Stack,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { useNotification } from '../../service/NotificationProvider'
import {
  CreateCalendarURL,
  GetCalendarURL,
  RevokeCalendarURL,
  RotateCalendarURL,
} from '../../utils/Fetcher'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const CalendarSettings = () => {
  const { t } = useTranslation('settings')
  const { fmt } = useLocalization()
  const { isPlanKnown, isPlus, showPaywall } = usePaywall()
  const { showNotification } = useNotification()
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const loadCalendar = useCallback(async () => {
    if (!isPlanKnown) return
    if (!isPlus) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(false)
    try {
      const response = await GetCalendarURL()
      if (response?.status === 404) {
        setCalendar(null)
      } else if (response?.ok) {
        setCalendar(await response.json())
      } else {
        setLoadError(true)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [isPlanKnown, isPlus])

  useEffect(() => {
    // Fetch when the account plan becomes available or changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendar()
  }, [loadCalendar])

  const runAction = async (name, request, successMessage) => {
    setAction(name)
    try {
      const response = await request()
      if (!response?.ok) throw new Error('Calendar request failed')
      if (response.status === 204) {
        setCalendar(null)
      } else {
        setCalendar(await response.json())
      }
      showNotification({ type: 'success', message: successMessage })
    } catch {
      showNotification({
        type: 'error',
        title: t('calendar.errorTitle'),
        message: t('calendar.actionFailed'),
      })
    } finally {
      setAction(null)
    }
  }

  const copyURL = async () => {
    try {
      await navigator.clipboard.writeText(calendar.url)
      showNotification({
        type: 'success',
        message: t('calendar.copied'),
      })
    } catch {
      showNotification({
        type: 'error',
        message: t('calendar.copyFailed'),
      })
    }
  }

  const showConfirmation = ({
    color,
    confirmText,
    message,
    onConfirm,
    title,
  }) =>
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText: t('common.cancel'),
      color,
      onClose: confirmed => {
        setConfirmModalConfig({})
        if (confirmed) onConfirm()
      },
    })

  // webcal:// hands the URL straight to the OS calendar app, but Apple's
  // Calendar resolves webcal to https and never falls back to http. Rewriting a
  // plain-http instance URL (local dev, self-hosted without TLS) would hand the
  // user a link that fails to connect, so only https URLs get the webcal form.
  const subscribeURL = calendar?.url?.startsWith('https://')
    ? calendar.url.replace(/^https:\/\//, 'webcal://')
    : calendar?.url

  return (
    <SettingsLayout title={t('calendar.title')}>
      <Stack spacing={3} sx={{ maxWidth: 720, pb: 4 }}>
        <Typography level='body-md'>{t('calendar.description')}</Typography>

        {!isPlus && isPlanKnown ? (
          <Card variant='outlined'>
            <Stack spacing={2} alignItems='flex-start'>
              <Chip variant='soft' color='warning'>
                {t('common.plusFeature')}
              </Chip>
              <Typography level='title-md'>
                {t('calendar.plusTitle')}
              </Typography>
              <Typography level='body-sm'>
                {t('calendar.plusNotice')}
              </Typography>
              <Button
                variant='soft'
                color='primary'
                onClick={() => showPaywall(PAYWALL_REASON.CALENDAR_SYNC)}
              >
                {t('calendar.upgrade')}
              </Button>
            </Stack>
          </Card>
        ) : loading || !isPlanKnown ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
            <CircularProgress size='sm' />
            <Typography level='body-sm'>{t('common.loading')}</Typography>
          </Box>
        ) : loadError ? (
          <Alert
            color='danger'
            variant='soft'
            endDecorator={
              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={loadCalendar}
              >
                {t('common.refresh')}
              </Button>
            }
          >
            {t('calendar.loadFailed')}
          </Alert>
        ) : calendar ? (
          <>
            <Card variant='outlined'>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CalendarMonth color='primary' />
                  <Box sx={{ flex: 1 }}>
                    <Typography level='title-md'>
                      {t('calendar.activeTitle')}
                    </Typography>
                    <Typography level='body-sm' color='success'>
                      {t('calendar.activeStatus')}
                    </Typography>
                  </Box>
                </Box>

                <Input
                  value={calendar.url || ''}
                  readOnly
                  aria-label={t('calendar.urlLabel')}
                  endDecorator={
                    <IconButton
                      variant='plain'
                      color='primary'
                      aria-label={t('calendar.copy')}
                      onClick={copyURL}
                    >
                      <ContentCopy />
                    </IconButton>
                  }
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button startDecorator={<ContentCopy />} onClick={copyURL}>
                    {t('calendar.copy')}
                  </Button>
                </Stack>

                <Divider />
                <Stack spacing={0.5}>
                  {calendar.createdAt && (
                    <Typography level='body-xs' color='neutral'>
                      {t('calendar.createdAt', {
                        date: fmt.dateTime(calendar.createdAt),
                      })}
                    </Typography>
                  )}
                  <Typography level='body-xs' color='neutral'>
                    {calendar.lastUsedAt
                      ? t('calendar.lastUsedAt', {
                          date: fmt.dateTime(calendar.lastUsedAt),
                        })
                      : t('calendar.neverUsed')}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card variant='soft' color='warning'>
              <Typography level='title-sm'>
                {t('calendar.keepPrivateTitle')}
              </Typography>
              <Typography level='body-sm'>
                {t('calendar.keepPrivateDescription')}
              </Typography>
            </Card>

            <Box>
              <Typography level='title-md' sx={{ mb: 1 }}>
                {t('calendar.manageTitle')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant='outlined'
                  startDecorator={<Refresh />}
                  loading={action === 'rotate'}
                  disabled={Boolean(action)}
                  onClick={() =>
                    showConfirmation({
                      title: t('calendar.rotateTitle'),
                      message: t('calendar.rotateMessage'),
                      confirmText: t('calendar.rotate'),
                      color: 'warning',
                      onConfirm: () =>
                        runAction(
                          'rotate',
                          RotateCalendarURL,
                          t('calendar.rotated'),
                        ),
                    })
                  }
                >
                  {t('calendar.rotate')}
                </Button>
                <Button
                  variant='outlined'
                  color='danger'
                  startDecorator={<DeleteOutline />}
                  loading={action === 'revoke'}
                  disabled={Boolean(action)}
                  onClick={() =>
                    showConfirmation({
                      title: t('calendar.revokeTitle'),
                      message: t('calendar.revokeMessage'),
                      confirmText: t('calendar.revoke'),
                      color: 'danger',
                      onConfirm: () =>
                        runAction(
                          'revoke',
                          RevokeCalendarURL,
                          t('calendar.revoked'),
                        ),
                    })
                  }
                >
                  {t('calendar.revoke')}
                </Button>
              </Stack>
            </Box>
          </>
        ) : (
          <Card variant='outlined'>
            <Stack spacing={2} alignItems='flex-start'>
              <CalendarMonth sx={{ fontSize: 36 }} color='primary' />
              <Typography level='title-lg'>
                {t('calendar.inactiveTitle')}
              </Typography>
              <Typography level='body-sm'>
                {t('calendar.inactiveDescription')}
              </Typography>
              <Button
                loading={action === 'create'}
                disabled={Boolean(action)}
                onClick={() =>
                  runAction(
                    'create',
                    CreateCalendarURL,
                    t('calendar.generated'),
                  )
                }
              >
                {t('calendar.generate')}
              </Button>
            </Stack>
          </Card>
        )}

        <Card variant='soft'>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('calendar.howToTitle')}
          </Typography>
          <Typography level='body-sm'>
            {t('calendar.howToDescription')}
          </Typography>
        </Card>
      </Stack>

      {confirmModalConfig.isOpen && (
        <ConfirmationModal config={confirmModalConfig} />
      )}
    </SettingsLayout>
  )
}

export default CalendarSettings
