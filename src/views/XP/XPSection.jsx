import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Switch,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserProfile } from '../../queries/UserQueries'
import {
  useXPCategories,
  useXPLeaderboard,
  xpRequest,
} from '../../queries/XPQueries'

export default function XPSection({ canManage, members, selectedUser }) {
  const { t } = useTranslation('points')
  const { data: profile } = useUserProfile()
  const categories = useXPCategories()
  const leaderboard = useXPLeaderboard()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const mutate = async action => {
    setBusy(true)
    setError(false)
    try {
      await action()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['xpCategories'] }),
        queryClient.invalidateQueries({ queryKey: ['xpLeaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
      ])
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const stats = leaderboard.data?.leaderboard.find(
    row => row.user_id === selectedUser,
  )
  const names = Object.fromEntries(
    (categories.data || []).map(category => [
      `category_${category.id}`,
      category.name,
    ]),
  )
  const categoryName = key =>
    key === 'uncategorized' ? t('xp.uncategorized') : names[key] || key
  const ranking = [...(leaderboard.data?.leaderboard || [])].sort(
    (a, b) =>
      (filter === 'all'
        ? b.total_xp - a.total_xp
        : (b.categories[filter] || 0) - (a.categories[filter] || 0)) ||
      a.user_id - b.user_id,
  )
  return (
    <Box sx={{ mb: 3, display: 'grid', gap: 1.5 }}>
      <Typography level='title-lg'>{t('xp.title')}</Typography>
      <FormControl orientation='horizontal'>
        <FormLabel>{t('xp.mode')}</FormLabel>
        <Switch
          checked={!!profile?.xpMode}
          disabled={busy}
          onChange={event => {
            const xpMode = event.target.checked
            mutate(() => xpRequest('/xp/preference', 'PUT', { xpMode }))
          }}
        />
      </FormControl>
      {error && <Alert color='danger'>{t('xp.saveError')}</Alert>}
      {categories.isError || leaderboard.isError ? (
        <Alert color='danger'>{t('xp.loadError')}</Alert>
      ) : categories.isPending || leaderboard.isPending ? (
        <Typography>{t('xp.loading')}</Typography>
      ) : (
        <>
          <Typography level='body-sm'>{t('xp.lifetimeHelp')}</Typography>
          {stats && (
            <Box>
              <Typography>
                {t('xp.total', {
                  count: stats.total_xp,
                  unit: profile?.xpMode ? 'XP' : t('xp.points'),
                })}
              </Typography>
              {Object.entries(stats.categories).map(([key, amount]) => (
                <Typography key={key} level='body-sm'>
                  {categoryName(key)}: {amount}
                </Typography>
              ))}
            </Box>
          )}
          <FormControl>
            <FormLabel>{t('xp.leaderboard')}</FormLabel>
            <Select value={filter} onChange={(_, value) => setFilter(value)}>
              <Option value='all'>{t('xp.all')}</Option>
              <Option value='uncategorized'>{t('xp.uncategorized')}</Option>
              {categories.data.map(category => (
                <Option key={category.id} value={`category_${category.id}`}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </FormControl>
          {ranking.map(row => (
            <Typography key={row.user_id} level='body-sm'>
              {members.find(member => member.userId === row.user_id)
                ?.displayName ||
                members.find(member => member.userId === row.user_id)
                  ?.username ||
                row.user_id}
              : {filter === 'all' ? row.total_xp : row.categories[filter] || 0}
            </Typography>
          ))}
          {canManage && (
            <>
              <Typography level='title-md'>{t('xp.manage')}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Input
                  aria-label={t('xp.name')}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  slotProps={{ input: { maxLength: 80 } }}
                  disabled={busy}
                />
                <Button
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    mutate(async () => {
                      await xpRequest(
                        editing
                          ? `/xp/categories/${editing.id}`
                          : '/xp/categories',
                        editing ? 'PUT' : 'POST',
                        {
                          name: name.trim(),
                          archived: editing?.archived || false,
                        },
                      )
                      setName('')
                      setEditing(null)
                    })
                  }
                >
                  {editing ? t('xp.save') : t('xp.add')}
                </Button>
                {editing && (
                  <Button
                    disabled={busy}
                    variant='plain'
                    onClick={() => {
                      setEditing(null)
                      setName('')
                    }}
                  >
                    {t('xp.cancel')}
                  </Button>
                )}
              </Box>
              {categories.data.map(category => (
                <Box
                  key={category.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Typography sx={{ flex: 1 }}>
                    {category.name}
                    {category.archived ? ` (${t('xp.archived')})` : ''}
                  </Typography>
                  <Button
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
                    variant='plain'
                    disabled={busy}
                    onClick={() =>
                      mutate(() =>
                        xpRequest(`/xp/categories/${category.id}`, 'PUT', {
                          name: category.name,
                          archived: !category.archived,
                        }),
                      )
                    }
                  >
                    {category.archived ? t('xp.restore') : t('xp.archive')}
                  </Button>
                </Box>
              ))}
            </>
          )}
        </>
      )}
    </Box>
  )
}
XPSection.propTypes = {
  canManage: PropTypes.bool.isRequired,
  members: PropTypes.array.isRequired,
  selectedUser: PropTypes.number.isRequired,
}
