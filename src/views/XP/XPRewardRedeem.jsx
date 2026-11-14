import { Alert, Button, Input, Stack, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useUserXP, useXP, xpRequest } from '../../queries/XPQueries'
import XPCategorySelect from './XPCategorySelect'

export default function XPRewardRedeem({ onClose, onSuccess, reward }) {
  const { t } = useTranslation('points')
  const { ResponsiveModal } = useResponsiveModal()
  const { user, xpMode } = useXP()
  const stats = useUserXP(user?.id)
  const [category, setCategory] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const balance = stats.data?.categories?.[String(category)] || 0
  const valid =
    category !== null && balance >= reward.pointsCost && !stats.error
  const submit = async () => {
    if (!valid || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await xpRequest(`/rewards/${reward.id}/redeem`, 'POST', {
        categoryId: category,
        note: note || null,
      })
      await onSuccess()
      onClose()
    } catch (failure) {
      setError(failure.message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return (
    <ResponsiveModal
      open
      onClose={busy ? undefined : onClose}
      size='sm'
      title={t('xp.redeemReward')}
      footer={
        <Button disabled={!valid || busy || stats.isLoading} onClick={submit}>
          {t('xp.request')}
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography>
          {reward.name} · {reward.pointsCost} {xpMode ? 'XP' : t('xp.points')}
        </Typography>
        {(error || stats.error) && (
          <Alert color='danger'>{error || stats.error.message}</Alert>
        )}
        <XPCategorySelect
          value={category}
          onChange={setCategory}
          balances={stats.data?.category_details || []}
          disabled={busy || stats.isLoading}
        />
        <Input
          value={note}
          onChange={event => setNote(event.target.value)}
          disabled={busy}
          slotProps={{ input: { maxLength: 1000, 'aria-label': t('xp.note') } }}
          placeholder={t('xp.note')}
        />
      </Stack>
    </ResponsiveModal>
  )
}

XPRewardRedeem.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  reward: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    pointsCost: PropTypes.number.isRequired,
  }).isRequired,
}
