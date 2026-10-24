import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Typography,
} from '@mui/joy'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { GetUserCircle, PutWebhookURL } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import { isParentUser } from '../../utils/UserHelpers'
import SettingsLayout from './SettingsLayout'

const WebhookSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()
  const { showError, showSuccess } = useNotification()
  const {
    data: circle,
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['settings', 'webhook-circle'],
    enabled: isParentUser(userProfile),
    queryFn: async () => {
      const response = await GetUserCircle()
      if (!response.ok) throw new Error('Unable to load circle')
      const data = await response.json()
      return data.res?.[0] ?? null
    },
  })
  const [draft, setDraft] = useState(undefined)
  const [saving, setSaving] = useState(false)
  const url = draft === undefined ? (circle?.webhook_url ?? null) : draft
  const isAdmin = isParentUser(userProfile) && circle?.userRole === 'admin'

  const save = async event => {
    event.preventDefault()
    if (!isAdmin) return
    if (!isPlusAccount(userProfile)) {
      showPaywall(PAYWALL_REASON.WEBHOOKS)
      return
    }
    setSaving(true)
    try {
      const response = await PutWebhookURL(url)
      if (!response.ok) throw new Error('Unable to save webhook')
      await refetch()
      setDraft(undefined)
      showSuccess({ message: t('advanced.webhookUpdated') })
    } catch {
      showError({ message: t('advanced.webhookUpdateFailed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsLayout title={t('overview.sections.webhooks.title')}>
      <Typography sx={{ mb: 3 }}>{t('advanced.webhookDescription')}</Typography>
      {isError ? (
        <Alert
          color='danger'
          endDecorator={
            <Button size='sm' onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
          }
        >
          {t('integrations.loadFailed')}
        </Alert>
      ) : isPending && isParentUser(userProfile) ? (
        <Typography>{t('common.loading')}</Typography>
      ) : !isAdmin ? (
        <Alert>{t('integrations.adminOnly')}</Alert>
      ) : (
        <Box
          component='form'
          onSubmit={save}
          sx={{
            maxWidth: 760,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <FormControl
            orientation='horizontal'
            sx={{ justifyContent: 'space-between', gap: 2 }}
          >
            <FormLabel>{t('advanced.webhookToggle')}</FormLabel>
            <Switch
              checked={url !== null}
              disabled={saving}
              onChange={() => {
                if (!isPlusAccount(userProfile)) {
                  showPaywall(PAYWALL_REASON.WEBHOOKS)
                  return
                }
                setDraft(url === null ? '' : null)
              }}
              slotProps={{
                input: { 'aria-label': t('advanced.webhookToggle') },
              }}
            />
          </FormControl>
          <Typography level='body-sm' textColor='text.secondary'>
            {t('advanced.webhookHelper')}
          </Typography>
          {url !== null && (
            <FormControl disabled={saving} required>
              <FormLabel>{t('advanced.webhookURL')}</FormLabel>
              <Input
                type='url'
                value={url}
                onChange={event => setDraft(event.target.value)}
              />
            </FormControl>
          )}
          <Button
            type='submit'
            loading={saving}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('common.save')}
          </Button>
        </Box>
      )}
    </SettingsLayout>
  )
}
export default WebhookSettings
