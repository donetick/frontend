import { CreditCard, Person, Toll } from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
  FormControl,
  FormLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/joy'
import { useEffect, useMemo, useRef, useState } from 'react'

import ModalActions from '../../components/common/ModalActions.jsx'
import NumberInput from '../../components/common/NumberInput.jsx'
import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'
import {
  useUserXP,
  useXPTranslation as useTranslation,
} from '../../queries/XPQueries'
import { resolvePhotoURL } from '../../utils/Helpers.jsx'
import { generateUUID } from '../../utils/UUID'
import XPCategorySelect from '../XP/XPCategorySelect'

function RedeemPointsModal({ config }) {
  const { t, xpMode } = useTranslation('points')
  const { ResponsiveModal } = useResponsiveModal()

  const [points, setPoints] = useState(0)
  const [category, setCategory] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const balances = useUserXP(config?.user?.userId)
  const available = balances.data?.categories?.[String(category)] || 0
  const requestKey = useMemo(
    () => generateUUID(),
    [config?.isOpen, config?.user?.userId, points, category],
  )
  const predefinedPoints = [1, 5, 10, 25, 50]

  useEffect(() => {
    setPoints(0)
    setCategory(null)
    setError('')
  }, [config?.isOpen, config?.user?.userId])

  const addPredefinedPoints = point => {
    const newPoints = points + point
    if (newPoints > Math.min(available, 1000000000)) {
      setPoints(Math.min(available, 1000000000))
      return
    }
    setPoints(newPoints)
  }

  const canRedeem =
    Number.isSafeInteger(points) &&
    points > 0 &&
    points <= 1000000000 &&
    points <= available &&
    category !== null &&
    !balances.error &&
    !balances.isLoading
  const save = async () => {
    if (!canRedeem || submitting.current) return
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      await config?.onSave({
        points: Number(points),
        userId: config?.user?.userId,
        categoryId: category,
        requestKey,
      })
    } catch (failure) {
      setError(failure.message)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={saving ? undefined : config?.onClose}
      size='md'
      title={t('redeem')}
      footer={
        <ModalActions
          secondary={{
            label: t('common:cancel'),
            onClick: config?.onClose,
            disabled: saving,
          }}
          primary={{
            label: t('redeemModal.redeemButton'),
            startDecorator: <CreditCard />,
            disabled: !canRedeem || saving,
            onClick: save,
          }}
        />
      }
    >
      <Stack spacing={2}>
        {(error || balances.error) && (
          <Alert color='danger'>{error || balances.error.message}</Alert>
        )}
        <XPCategorySelect
          value={category}
          onChange={setCategory}
          balances={balances.data?.category_details || []}
          disabled={saving || balances.isLoading}
        />
        {/* User Info Card */}
        <Card
          variant='soft'
          sx={{
            p: 2,
          }}
        >
          <Stack direction='row' spacing={2} alignItems='center'>
            <Avatar
              size='md'
              src={resolvePhotoURL(config?.user?.image)}
              sx={{
                border: '2px solid',
                borderColor: 'warning.200',
              }}
            >
              <Person />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                {config?.user?.displayName || 'User'}
              </Typography>
              <Chip
                size='sm'
                variant='soft'
                color='success'
                startDecorator={<Toll />}
                sx={{ mt: 0.5 }}
              >
                {t('redeemModal.pointsAvailable', {
                  count: config?.available || 0,
                })}
              </Chip>
            </Box>
          </Stack>
        </Card>

        {/* Points Input Section */}
        <FormControl>
          <FormLabel sx={{ fontWeight: 600, mb: 1 }}>
            {t('redeemModal.pointsToRedeem')}
          </FormLabel>
          <NumberInput
            value={points}
            min={0}
            max={Math.min(available, 1000000000)}
            disabled={saving}
            size='lg'
            variant='outlined'
            startDecorator={<Toll />}
            placeholder={t('redeemModal.placeholder')}
            onValueChange={setPoints}
            sx={{
              '--Input-decoratorChildHeight': '45px',
              fontSize: 'lg',
              fontWeight: 500,
              '&:focus-within': {
                borderColor: 'warning.500',
                boxShadow: '0 0 0 2px rgba(255, 193, 7, 0.2)',
              },
            }}
          />
          {points > available && (
            <Typography level='body-xs' sx={{ color: 'danger.500', mt: 0.5 }}>
              {t('redeemModal.cannotExceed')}
            </Typography>
          )}
        </FormControl>

        {/* Quick Selection Buttons */}
        <Box>
          <Typography level='body-sm' sx={{ fontWeight: 600, mb: 1.5 }}>
            {t('redeemModal.quickAdd')}
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            justifyContent='center'
            flexWrap='wrap'
            useFlexGap
          >
            {predefinedPoints.map(point => (
              <IconButton
                key={point}
                aria-label={t('xp.quickAddAmount', {
                  count: point,
                  unit: xpMode ? 'XP' : t('xp.points'),
                })}
                variant='outlined'
                disabled={
                  saving || points + point > Math.min(available, 1000000000)
                }
                onClick={() => addPredefinedPoints(point)}
                sx={{
                  borderRadius: '50%',
                  minWidth: 45,
                  minHeight: 45,
                  fontWeight: 600,
                  fontSize: 'sm',
                  '&:hover:not(:disabled)': {
                    transform: 'scale(1.05)',
                    boxShadow: 'sm',
                  },
                  '&:disabled': {
                    opacity: 0.3,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                +{point}
              </IconButton>
            ))}
          </Stack>
        </Box>

        {/* Summary Section */}
        {points > 0 && (
          <Card
            variant='soft'
            color='primary'
            sx={{
              p: 2,
              textAlign: 'center',
              background:
                'linear-gradient(135deg, rgba(25,118,210,0.1) 0%, rgba(25,118,210,0.05) 100%)',
            }}
          >
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('redeemModal.aboutToRedeem')}
            </Typography>
            <Typography
              level='h4'
              sx={{ color: 'primary.600', fontWeight: 700 }}
            >
              {t('redeemModal.amount', { count: points })}
            </Typography>
            <Typography
              level='body-xs'
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {t('redeemModal.remaining', {
                count: available - points,
              })}
            </Typography>
          </Card>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default RedeemPointsModal
