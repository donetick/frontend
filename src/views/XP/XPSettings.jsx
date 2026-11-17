import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Switch,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRefreshXP, useXP, xpRequest } from '../../queries/XPQueries'

export default function XPSettings({ canManage }) {
  const { t } = useTranslation('points')
  const { categories, settings, xpMode } = useXP()
  const refresh = useRefreshXP()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async operation => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await operation()
      await refresh()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Box
      component='section'
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'lg',
        p: 2,
        mb: 3,
      }}
    >
      <Typography level='title-lg'>{t('xp.settingsTitle')}</Typography>
      {(error || settings.error || categories.error) && (
        <Alert color='danger' sx={{ my: 1 }}>
          {error || settings.error?.message || categories.error?.message}
        </Alert>
      )}
      <FormControl
        orientation='horizontal'
        sx={{ my: 2, justifyContent: 'space-between' }}
      >
        <FormLabel>{t('xp.useXP')}</FormLabel>
        <Switch
          checked={xpMode}
          onChange={event =>
            save(() =>
              xpRequest('/xp/settings', 'PUT', {
                xpMode: event.target.checked,
              }),
            )
          }
          disabled={
            !canManage || busy || settings.isLoading || Boolean(settings.error)
          }
          slotProps={{ input: { 'aria-label': t('xp.useXP') } }}
        />
      </FormControl>
      <Typography level='body-sm'>{t('xp.historyHelp')}</Typography>
      <Stack spacing={1} sx={{ my: 2 }}>
        {(categories.data || []).map(category => (
          <Stack
            key={category.id}
            direction='row'
            spacing={1}
            alignItems='center'
            useFlexGap
            flexWrap='wrap'
          >
            <Typography sx={{ flex: 1, minWidth: 100 }}>
              {category.name}
              {category.archived ? ` (${t('xp.archived')})` : ''}
            </Typography>
            {canManage && (
              <>
                <Button
                  size='sm'
                  variant='plain'
                  disabled={busy}
                  onClick={() => {
                    setEditing(category)
                    setName(category.name)
                  }}
                >
                  {t('xp.rename')}
                </Button>
                <Button
                  size='sm'
                  variant='plain'
                  disabled={busy}
                  onClick={() =>
                    save(() =>
                      xpRequest(`/xp/categories/${category.id}`, 'PUT', {
                        name: category.name,
                        archived: !category.archived,
                      }),
                    )
                  }
                >
                  {t(category.archived ? 'xp.restore' : 'xp.archive')}
                </Button>
              </>
            )}
          </Stack>
        ))}
      </Stack>
      {canManage && (
        <Stack
          component='form'
          direction='row'
          spacing={1}
          onSubmit={event => {
            event.preventDefault()
            save(async () => {
              await xpRequest(
                editing ? `/xp/categories/${editing.id}` : '/xp/categories',
                editing ? 'PUT' : 'POST',
                { name: name.trim(), archived: editing?.archived || false },
              )
              setName('')
              setEditing(null)
            })
          }}
        >
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder={t('xp.categoryName')}
            slotProps={{
              input: { maxLength: 80, 'aria-label': t('xp.categoryName') },
            }}
            disabled={busy}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button
            type='submit'
            disabled={busy || !name.trim() || Boolean(categories.error)}
          >
            {t(editing ? 'xp.save' : 'xp.addCategory')}
          </Button>
          {editing && (
            <Button
              variant='plain'
              disabled={busy}
              onClick={() => {
                setEditing(null)
                setName('')
              }}
            >
              {t('common:cancel')}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  )
}

XPSettings.propTypes = { canManage: PropTypes.bool }
