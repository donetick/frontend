import { CopyAll } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Input,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { copyText } from '../../utils/Clipboard'
import {
  CreateLongLiveToken,
  DeleteLongLiveToken,
  GetLongLiveTokens,
  UpdateAPIToken,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import APITokenEditor from './APITokenEditor'
import SettingsLayout from './SettingsLayout'

const APITokenSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()
  const { showNotification } = useNotification()
  const { fmt } = useLocalization()
  const [tokens, setTokens] = useState([])
  const [isGetTokenNameModalOpen, setIsGetTokenNameModalOpen] = useState(false)
  const [newToken, setNewToken] = useState(null)
  const [editingToken, setEditingToken] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('common.confirm'),
    cancelText = t('common.cancel'),
    color = 'primary',
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText,
      color,
      onClose: isConfirmed => {
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }
  const fetchTokens = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await GetLongLiveTokens()
      if (!response.ok) throw new Error()
      const data = await response.json()
      setTokens(data.res || [])
    } catch {
      setError(t('apiTokens.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleSaveToken = async payload => {
    const response = editingToken
      ? await UpdateAPIToken(editingToken.id, payload)
      : await CreateLongLiveToken(payload)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || t('apiTokens.saveFailed'))
    if (!editingToken) setNewToken(data.res)
    setIsGetTokenNameModalOpen(false)
    setEditingToken(null)
    await fetchTokens()
  }

  return (
    <SettingsLayout title={t('apiTokens.title')}>
      <div className='grid gap-4 py-4' id='apitokens'>
        <Typography level='h3'>{t('apiTokens.accessToken')}</Typography>
        <Divider />
        <Typography level='body-sm'>{t('apiTokens.description')}</Typography>
        {newToken && (
          <Alert
            color='warning'
            variant='soft'
            sx={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <Typography level='title-sm'>
              {t('apiTokens.tokenCreatedTitle')}
            </Typography>
            <Typography level='body-xs' sx={{ mb: 1 }}>
              {t('apiTokens.tokenCreatedWarning')}
            </Typography>
            <Input
              value={newToken.token}
              sx={{ width: '100%' }}
              readOnly
              endDecorator={
                <IconButton
                  aria-label={t('apiTokens.copyToken')}
                  variant='outlined'
                  color='primary'
                  onClick={async () => {
                    if (!(await copyText(newToken.token))) return
                    showNotification({
                      type: 'success',
                      message: t('apiTokens.tokenCopied'),
                    })
                    setNewToken(null)
                  }}
                >
                  <CopyAll />
                </IconButton>
              }
            />
          </Alert>
        )}

        {error && (
          <Alert color='danger'>
            {error}
            <Button onClick={fetchTokens}>{t('apiTokens.retry')}</Button>
          </Alert>
        )}
        {loading && <Typography>{t('apiTokens.loading')}</Typography>}
        {!loading && !error && tokens.length === 0 && (
          <Typography>{t('apiTokens.empty')}</Typography>
        )}
        {tokens.map(token => {
          const expired =
            token.expiresAt && new Date(token.expiresAt) <= new Date()
          return (
            <Card key={token.id} sx={{ p: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography level='title-sm'>{token.name}</Typography>
                    <Chip
                      size='sm'
                      color={
                        token.revokedAt
                          ? 'neutral'
                          : expired
                            ? 'danger'
                            : token.legacyUnrestricted
                              ? 'warning'
                              : 'success'
                      }
                    >
                      {t(
                        token.revokedAt
                          ? 'apiTokens.revoked'
                          : expired
                            ? 'apiTokens.expired'
                            : token.legacyUnrestricted
                              ? 'apiTokens.legacy'
                              : token.scopes?.length
                                ? 'apiTokens.scoped'
                                : 'apiTokens.needsPermissions',
                      )}
                    </Chip>
                  </Box>
                  {token.legacyUnrestricted && !token.revokedAt && (
                    <Typography level='body-xs'>
                      {t('apiTokens.legacyHelp')}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                    }}
                  >
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {t('apiTokens.expiration', {
                        value: token.expiresAt
                          ? fmt.dateTime(token.expiresAt)
                          : t('apiTokens.noExpiration'),
                      })}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {t('apiTokens.lastUsed', {
                        value: token.lastUsedAt
                          ? fmt.dateTime(token.lastUsedAt)
                          : t('apiTokens.never'),
                      })}
                    </Typography>
                    {token.circleId != null && (
                      <Typography
                        level='body-xs'
                        sx={{ color: 'text.tertiary' }}
                      >
                        {t('apiTokens.circleBinding', { id: token.circleId })}
                      </Typography>
                    )}
                  </Box>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {moment(token.createdAt).fromNow()} (
                    {fmt.dateTime(token.createdAt)})
                    {token.maskedToken && ` · ${token.maskedToken}`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', sm: 'column' },
                    gap: 1,
                    flexShrink: 0,
                  }}
                >
                  {!token.revokedAt && (
                    <Button
                      size='sm'
                      variant='soft'
                      sx={{ flex: { xs: 1, sm: 'initial' } }}
                      onClick={() => {
                        setEditingToken(token)
                        setIsGetTokenNameModalOpen(true)
                      }}
                    >
                      {t('apiTokens.editPermissions')}
                    </Button>
                  )}
                  <Button
                    size='sm'
                    disabled={!!token.revokedAt}
                    variant='outlined'
                    color='danger'
                    sx={{ flex: { xs: 1, sm: 'initial' } }}
                    onClick={() => {
                      showConfirmation(
                        t('apiTokens.removeMessage', { name: token.name }),
                        t('apiTokens.removeTitle'),
                        () => {
                          DeleteLongLiveToken(token.id)
                            .then(resp => {
                              if (resp.ok) {
                                showNotification({
                                  type: 'success',
                                  title: t('apiTokens.removedTitle'),
                                  message: t('apiTokens.removedMessage'),
                                })
                                const newTokens = tokens.filter(
                                  t => t.id !== token.id,
                                )
                                setTokens(newTokens)
                              } else {
                                setError(t('apiTokens.saveFailed'))
                              }
                            })
                            .catch(() => setError(t('apiTokens.saveFailed')))
                        },
                        t('common.remove'),
                        t('common.cancel'),
                        'danger',
                      )
                    }}
                  >
                    {t('common.remove')}
                  </Button>
                </Box>
              </Box>
            </Card>
          )
        })}

        <Button
          variant='soft'
          color='primary'
          sx={{
            width: '210px',
            mb: 1,
          }}
          onClick={() => {
            if (!isPlusAccount(userProfile)) {
              showPaywall(PAYWALL_REASON.API_TOKENS)
              return
            }
            setIsGetTokenNameModalOpen(true)
          }}
        >
          {t('apiTokens.generateNew')}
        </Button>
        {isGetTokenNameModalOpen && (
          <APITokenEditor
            token={editingToken}
            onClose={() => {
              setIsGetTokenNameModalOpen(false)
              setEditingToken(null)
            }}
            onSave={handleSaveToken}
          />
        )}

        {/* Modals */}
        {confirmModalConfig?.isOpen && (
          <ConfirmationModal config={confirmModalConfig} />
        )}
      </div>
    </SettingsLayout>
  )
}

export default APITokenSettings
