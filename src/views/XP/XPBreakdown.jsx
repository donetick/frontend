import {
  Alert,
  Box,
  Button,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useRefreshXP,
  useUserXP,
  useXP,
  xpRequest,
} from '../../queries/XPQueries'
import { generateUUID } from '../../utils/UUID'
import XPCategorySelect from './XPCategorySelect'

export default function XPBreakdown({ canAdjust, userID }) {
  const { t } = useTranslation('points')
  const { xpMode } = useXP()
  const stats = useUserXP(userID)
  const refresh = useRefreshXP()
  const [action, setAction] = useState('add')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const requestKey = useMemo(
    () => generateUUID(),
    [userID, action, amount, category],
  )
  const valid =
    Number.isSafeInteger(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= 1000000000 &&
    category !== null &&
    (action !== 'add' || category > 0)
  if (stats.isLoading) return <Typography>{t('xp.loading')}</Typography>
  if (stats.error)
    return (
      <Alert color='danger'>
        {stats.error.message}
        <Button variant='plain' onClick={() => stats.refetch()}>
          {t('xp.retry')}
        </Button>
      </Alert>
    )
  if (!stats.data) return null
  return (
    <Box
      component='section'
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'lg',
        p: 2,
        mb: 2,
      }}
    >
      <Typography level='title-lg'>
        {t('xp.breakdownTitle', { unit: xpMode ? 'XP' : t('xp.points') })}
      </Typography>
      <Typography level='body-sm'>
        {t('xp.totals', {
          available: stats.data.total_xp,
          earned: stats.data.lifetime_xp,
          spent: stats.data.redeemed_xp,
        })}
      </Typography>
      {stats.data.category_details.map(item => (
        <Stack
          key={item.id}
          direction='row'
          sx={{ justifyContent: 'space-between', gap: 2, mt: 1 }}
        >
          <Typography>
            {item.id === 0 ? t('xp.uncategorized') : item.name}
            {item.archived ? ` (${t('xp.archived')})` : ''}
          </Typography>
          <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {item.balance}
          </Typography>
        </Stack>
      ))}
      {error && (
        <Alert color='danger' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {canAdjust && (
        <Stack
          component='form'
          spacing={1.5}
          sx={{ mt: 2 }}
          onSubmit={async event => {
            event.preventDefault()
            if (!valid || submitting.current) return
            submitting.current = true
            setBusy(true)
            setError('')
            try {
              await xpRequest(
                `/users/${userID}/xp/adjust`,
                'POST',
                { points: Number(amount), action, categoryId: category },
                requestKey,
              )
              await refresh()
              setAmount('')
            } catch (failure) {
              setError(failure.message)
            } finally {
              submitting.current = false
              setBusy(false)
            }
          }}
        >
          <Select
            value={action}
            onChange={(_, value) => {
              setAction(value)
              setCategory(null)
            }}
            disabled={busy}
            aria-label={t('xp.adjustment')}
          >
            <Option value='add'>{t('xp.add')}</Option>
            <Option value='remove'>{t('xp.deduct')}</Option>
          </Select>
          <XPCategorySelect
            value={category}
            onChange={setCategory}
            includeUncategorized={action === 'remove'}
            disabled={busy}
            balances={
              action === 'remove' ? stats.data.category_details : undefined
            }
          />
          <Input
            type='number'
            value={amount}
            onChange={event => setAmount(event.target.value)}
            disabled={busy}
            slotProps={{
              input: {
                min: 1,
                max: 1000000000,
                step: 1,
                'aria-label': t('xp.amount'),
              },
            }}
          />
          <Button type='submit' disabled={!valid || busy}>
            {t('xp.apply')}
          </Button>
        </Stack>
      )}
    </Box>
  )
}

XPBreakdown.propTypes = {
  canAdjust: PropTypes.bool,
  userID: PropTypes.number,
}
