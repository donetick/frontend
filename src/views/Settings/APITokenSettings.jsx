import { CopyAll } from '@mui/icons-material'
import {
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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  CreateLongLiveToken,
  DeleteLongLiveToken,
  GetLongLiveTokens,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import TextModal from '../Modals/Inputs/TextModal'
import SettingsLayout from './SettingsLayout'

const APITokenSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const { showNotification } = useNotification()
  const { fmt } = useLocalization()
  const [tokens, setTokens] = useState([])
  const [isGetTokenNameModalOpen, setIsGetTokenNameModalOpen] = useState(false)
  const [showTokenId, setShowTokenId] = useState(null)
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
  useEffect(() => {
    GetLongLiveTokens().then(resp => {
      resp.json().then(data => {
        setTokens(data.res)
      })
    })
  }, [])

  const handleSaveToken = name => {
    CreateLongLiveToken(name).then(resp => {
      if (resp.ok) {
        resp.json().then(data => {
          // add the token to the list:
          console.log(data)
          const newTokens = [...tokens]
          newTokens.push(data.res)
          setTokens(newTokens)
        })
      }
    })
  }

  return (
    <SettingsLayout title={t('apiTokens.title')}>
      <div className='grid gap-4 py-4' id='apitokens'>
        <Typography level='h3'>{t('apiTokens.accessToken')}</Typography>
        <Divider />
        <Typography level='body-sm'>{t('apiTokens.description')}</Typography>
        {!isPlusAccount(userProfile) && (
          <>
            <Chip variant='soft' color='warning'>
              {t('common.plusFeature')}
            </Chip>
            <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
              {t('apiTokens.plusNotice')}
            </Typography>
          </>
        )}

        {tokens.map(token => (
          <Card key={token.token} className='p-4'>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography level='body-md'>{token.name}</Typography>
                <Typography level='body-xs'>
                  {moment(token.createdAt).fromNow()}(
                  {fmt.dateTime(token.createdAt)})
                </Typography>
              </Box>
              <Box>
                <Button
                  variant='outlined'
                  color='primary'
                  sx={{ mr: 1 }}
                  onClick={() => {
                    if (showTokenId === token.id) {
                      setShowTokenId(null)
                      return
                    }

                    setShowTokenId(token.id)
                  }}
                >
                  {showTokenId === token?.id
                    ? t('apiTokens.hideToken')
                    : t('apiTokens.showToken')}
                </Button>

                <Button
                  variant='outlined'
                  color='danger'
                  onClick={() => {
                    showConfirmation(
                      t('apiTokens.removeMessage', { name: token.name }),
                      t('apiTokens.removeTitle'),
                      () => {
                        DeleteLongLiveToken(token.id).then(resp => {
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
                          }
                        })
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
            {showTokenId === token?.id && (
              <Box>
                <Input
                  value={token.token}
                  sx={{ width: '100%', mt: 2 }}
                  readOnly
                  endDecorator={
                    <IconButton
                      variant='outlined'
                      color='primary'
                      onClick={() => {
                        navigator.clipboard.writeText(token.token)
                        showNotification({
                          type: 'success',
                          message: t('apiTokens.tokenCopied'),
                        })
                        setShowTokenId(null)
                      }}
                    >
                      <CopyAll />
                    </IconButton>
                  }
                />
              </Box>
            )}
          </Card>
        ))}

        <Button
          variant='soft'
          color='primary'
          disabled={!isPlusAccount(userProfile)}
          sx={{
            width: '210px',
            mb: 1,
          }}
          onClick={() => {
            setIsGetTokenNameModalOpen(true)
          }}
        >
          {t('apiTokens.generateNew')}
        </Button>
        <TextModal
          isOpen={isGetTokenNameModalOpen}
          title={t('apiTokens.nameModalTitle')}
          onClose={() => {
            setIsGetTokenNameModalOpen(false)
          }}
          okText={t('apiTokens.generateToken')}
          onSave={handleSaveToken}
        />

        {/* Modals */}
        {confirmModalConfig?.isOpen && (
          <ConfirmationModal config={confirmModalConfig} />
        )}
      </div>
    </SettingsLayout>
  )
}

export default APITokenSettings
