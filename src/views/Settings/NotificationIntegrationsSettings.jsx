import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Link,
  Option,
  Select,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { UpdateNotificationTarget } from '../../utils/Fetcher'
import SettingsLayout from './SettingsLayout'
import SettingsLinks from './SettingsLinks'

const NotificationIntegrationsSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile, refetch } = useUserProfile()
  const { showError, showSuccess } = useNotification()
  const [targetDraft, setTarget] = useState(null)
  const [chatIDDraft, setChatID] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const target =
    targetDraft ?? String(userProfile?.notification_target?.type ?? 0)
  const chatID =
    chatIDDraft ?? String(userProfile?.notification_target?.target_id ?? '')

  const save = async (disable = false) => {
    if (
      !disable &&
      target === '1' &&
      (!chatID.trim() || isNaN(chatID) || Number(chatID) === 0)
    ) {
      setError(
        t(
          chatID.trim()
            ? 'notifications.chatIdInvalid'
            : 'notifications.chatIdRequired',
        ),
      )
      return
    }
    if (!disable && target === '2' && !chatID.trim()) {
      setError(t('notifications.userKeyRequired'))
      return
    }
    setError('')
    setSaving(true)
    try {
      const response = await UpdateNotificationTarget({
        target: disable ? '' : chatID.trim(),
        type: disable ? 0 : Number(target),
      })
      if (!response.ok) throw new Error(response.statusText)
      await refetch()
      if (disable) {
        setTarget('0')
        setChatID('')
      }
      showSuccess({ message: t('notifications.targetUpdated') })
    } catch (error) {
      showError({
        message: t('notifications.targetUpdateFailed', {
          error: error.message,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsLayout
      title={t('overview.sections.notification-integrations.title')}
    >
      <Typography sx={{ mb: 3 }} textColor='text.secondary'>
        {t('notifications.customSectionDescription')}
      </Typography>
      <Sheet
        variant='outlined'
        sx={{ borderRadius: 'lg', p: { xs: 2, sm: 3 }, maxWidth: 760 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography level='title-md'>
              {t('notifications.customLabel')}
            </Typography>
            <Typography level='body-sm' textColor='text.secondary'>
              {t('notifications.customHelper')}
            </Typography>
          </Box>
          <Switch
            checked={target !== '0'}
            disabled={saving || !userProfile}
            onChange={() => (target !== '0' ? save(true) : setTarget('1'))}
            slotProps={{
              input: { 'aria-label': t('notifications.customLabel') },
            }}
          />
        </Box>
        {target !== '0' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              component='form'
              onSubmit={event => {
                event.preventDefault()
                save()
              }}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <FormControl disabled={saving || !userProfile}>
                <FormLabel>{t('notifications.serviceLabel')}</FormLabel>
                <Select
                  value={target}
                  onChange={(_, value) => {
                    if (value) {
                      setTarget(value)
                      setChatID('')
                      setError('')
                    }
                  }}
                >
                  <Option value='1'>{t('notifications.targetTelegram')}</Option>
                  <Option value='2'>{t('notifications.targetPushover')}</Option>
                  <Option value='3'>{t('notifications.targetWebhooks')}</Option>
                </Select>
              </FormControl>
              {target === '1' && (
                <Typography level='body-sm'>
                  {t('notifications.telegramBotHelpBefore')}{' '}
                  <Link
                    href='https://t.me/DonetickBot'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {t('notifications.clickHere')}
                  </Link>{' '}
                  {t('notifications.telegramBotHelpAfter')}
                </Typography>
              )}
              {target === '3' && <SettingsLinks ids={['webhooks']} />}
              {(target === '1' || target === '2') && (
                <FormControl error={Boolean(error)} disabled={saving}>
                  <FormLabel>
                    {t(
                      target === '1'
                        ? 'notifications.chatId'
                        : 'notifications.userKey',
                    )}
                  </FormLabel>
                  <Input
                    value={chatID}
                    onChange={event => {
                      setChatID(event.target.value)
                      setError('')
                    }}
                    placeholder={t(
                      target === '1'
                        ? 'notifications.chatIdPlaceholder'
                        : 'notifications.userKeyPlaceholder',
                    )}
                  />
                  {error && <FormHelperText>{error}</FormHelperText>}
                  {target === '1' && (
                    <FormHelperText sx={{ display: 'block' }}>
                      {t('notifications.telegramChatIdHelpBefore')}{' '}
                      <Link
                        href='https://t.me/userinfobot'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {t('notifications.clickHere')}
                      </Link>{' '}
                      {t('notifications.telegramChatIdHelpAfter')}
                    </FormHelperText>
                  )}
                </FormControl>
              )}
              <Button
                type='submit'
                loading={saving}
                disabled={!userProfile}
                sx={{ alignSelf: 'flex-end' }}
              >
                {t('common.save')}
              </Button>
            </Box>
          </>
        )}
      </Sheet>
    </SettingsLayout>
  )
}

export default NotificationIntegrationsSettings
