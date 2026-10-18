import {
  AddRounded,
  CardGiftcardRounded,
  CheckRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
  MoreVertRounded,
  RedeemRounded,
  StarsRounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dropdown,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import EmptyState from '../../components/common/EmptyState'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import {
  ApproveRedemption,
  DeleteReward,
  RedeemReward,
  RejectRedemption,
} from '../../utils/Fetcher'
import { getSafeBottom, getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ScrollHideFab from '../components/ScrollHideFab'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import RewardModal from '../Modals/Inputs/RewardModal'
import { useRedemptions, useRewards } from './RewardQueries'

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const RewardCard = ({
  availablePoints,
  isAdmin,
  onDelete,
  onEdit,
  onRedeem,
  reward,
}) => {
  const { t } = useTranslation('rewards')
  const canAfford = availablePoints >= reward.pointsCost

  return (
    <Sheet
      component='article'
      variant='soft'
      color='neutral'
      sx={{
        borderRadius: 'lg',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        p: 1.25,
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: 0.25,
          gridTemplateColumns: isAdmin
            ? '32px minmax(0, 1fr) 28px'
            : '32px minmax(0, 1fr)',
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            alignSelf: 'center',
            bgcolor: 'background.surface',
            borderRadius: 'sm',
            color: 'primary.plainColor',
            display: 'flex',
            gridRow: 'span 2',
            height: 32,
            justifyContent: 'center',
            width: 32,
          }}
        >
          <CardGiftcardRounded sx={{ fontSize: 18 }} />
        </Box>
        <Typography
          level='body-sm'
          fontWeight={650}
          noWrap
          textColor='text.primary'
          sx={{ ml: 0.75, width: '100%' }}
        >
          {reward.name}
        </Typography>
        {isAdmin && (
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{
                root: { color: 'neutral', size: 'sm', variant: 'plain' },
              }}
              aria-label={t('actions.menu', { name: reward.name })}
              sx={{ gridRow: 'span 2', minHeight: 28, minWidth: 28 }}
            >
              <MoreVertRounded sx={{ fontSize: 18 }} />
            </MenuButton>
            <Menu placement='bottom-end' size='sm'>
              <MenuItem onClick={() => onEdit(reward)}>
                <EditRounded sx={{ fontSize: 18 }} />
                {t('common:edit')}
              </MenuItem>
              <Divider />
              <MenuItem color='danger' onClick={() => onDelete(reward)}>
                <DeleteOutlineRounded sx={{ fontSize: 18 }} />
                {t('common:delete')}
              </MenuItem>
            </Menu>
          </Dropdown>
        )}
        <Typography
          level='body-xs'
          noWrap
          textColor='text.secondary'
          sx={{ alignItems: 'center', display: 'flex', gap: 0.375, ml: 0.75 }}
        >
          <StarsRounded
            sx={{ color: 'warning.500', fontSize: 13 }}
            aria-hidden='true'
          />
          {t('pointsCost', { count: reward.pointsCost })}
        </Typography>
      </Box>

      <Typography
        level='body-xs'
        noWrap
        textColor='text.tertiary'
        sx={{ mt: 1, minHeight: '1.25em' }}
      >
        {reward.description || t('view.rewardFallbackDescription')}
      </Typography>

      <Button
        size='sm'
        variant={canAfford ? 'solid' : 'soft'}
        color={canAfford ? 'primary' : 'neutral'}
        disabled={!canAfford}
        onClick={() => onRedeem(reward)}
        fullWidth
        sx={{ mt: 1, minHeight: 30 }}
      >
        {canAfford ? t('redeem') : t('notEnoughPoints')}
      </Button>
    </Sheet>
  )
}

RewardCard.propTypes = {
  availablePoints: PropTypes.number.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRedeem: PropTypes.func.isRequired,
  reward: PropTypes.shape({
    description: PropTypes.string,
    name: PropTypes.string.isRequired,
    pointsCost: PropTypes.number.isRequired,
  }).isRequired,
}

const RedemptionRow = ({ isAdmin, onApprove, onReject, redemption }) => {
  const { t } = useTranslation('rewards')
  const statusColor =
    redemption.status === 1
      ? 'success'
      : redemption.status === 2
        ? 'danger'
        : 'warning'
  const statusLabel =
    redemption.status === 1
      ? t('status.approved')
      : redemption.status === 2
        ? t('status.rejected')
        : t('status.pending')

  return (
    <Sheet
      component='article'
      sx={{
        ...surfaceSx,
        alignItems: { xs: 'stretch', sm: 'center' },
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5,
        p: 1.5,
      }}
    >
      <Box sx={{ alignItems: 'center', display: 'flex', flex: 1, gap: 1.25 }}>
        <Box
          sx={{
            bgcolor: `${statusColor}.softBg`,
            borderRadius: '50%',
            color: `${statusColor}.plainColor`,
            display: 'grid',
            flex: '0 0 auto',
            height: 40,
            placeItems: 'center',
            width: 40,
          }}
        >
          <RedeemRounded sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography level='title-sm' noWrap>
            {redemption.rewardName}
          </Typography>
          <Typography level='body-xs' textColor='text.secondary'>
            {t('pointsCost', { count: redemption.pointsCost })}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 0.75,
          justifyContent: 'space-between',
          pl: { xs: 5.25, sm: 0 },
        }}
      >
        <Chip size='sm' variant='soft' color={statusColor}>
          {statusLabel}
        </Chip>
        {isAdmin && redemption.status === 0 && (
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button
              size='sm'
              color='success'
              variant='soft'
              startDecorator={<CheckRounded />}
              onClick={() => onApprove(redemption)}
            >
              {t('approve')}
            </Button>
            <Button
              size='sm'
              color='danger'
              variant='plain'
              startDecorator={<CloseRounded />}
              onClick={() => onReject(redemption)}
            >
              {t('reject')}
            </Button>
          </Box>
        )}
      </Box>
    </Sheet>
  )
}

RedemptionRow.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  redemption: PropTypes.shape({
    pointsCost: PropTypes.number.isRequired,
    rewardName: PropTypes.string.isRequired,
    status: PropTypes.number.isRequired,
  }).isRequired,
}

const RewardsView = ({ embedded = false, view = 'store' }) => {
  const { t } = useTranslation('rewards')
  const queryClient = useQueryClient()

  const { data: rewards = [], isLoading: rewardsLoading } = useRewards()
  const { data: userProfile } = useUserProfile()
  const { data: circleMembersData } = useCircleMembers()
  const { data: pendingRedemptions = [], isLoading: redemptionsLoading } =
    useRedemptions('pending')

  const [modalOpen, setModalOpen] = useState(false)
  const [currentReward, setCurrentReward] = useState(null)
  const [confirmationModel, setConfirmationModel] = useState({})

  const currentMember = useMemo(
    () => circleMembersData?.res?.find(m => m.userId === userProfile?.id),
    [circleMembersData, userProfile],
  )
  const isAdmin =
    currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const availablePoints = currentMember
    ? Math.max(
        0,
        (currentMember.points || 0) - (currentMember.pointsRedeemed || 0),
      )
    : 0

  const activeRewards = useMemo(
    () => rewards.filter(reward => reward.isActive),
    [rewards],
  )

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    queryClient.invalidateQueries({ queryKey: ['redemptions'] })
    queryClient.invalidateQueries({ queryKey: ['allCircleMembers'] })
  }

  const handleAdd = () => {
    setCurrentReward(null)
    setModalOpen(true)
  }
  const handleEdit = reward => {
    setCurrentReward(reward)
    setModalOpen(true)
  }
  const handleDelete = reward => {
    setConfirmationModel({
      isOpen: true,
      title: t('delete.title'),
      message: t('delete.message'),
      confirmText: t('common:delete'),
      color: 'danger',
      cancelText: t('common:cancel'),
      onClose: confirmed => {
        if (confirmed) DeleteReward(reward.id).then(invalidateAll)
        setConfirmationModel({})
      },
    })
  }
  const handleRedeem = reward => {
    setConfirmationModel({
      isOpen: true,
      title: t('redeemConfirm.title'),
      message: t('redeemConfirm.message', {
        name: reward.name,
        cost: reward.pointsCost,
      }),
      confirmText: t('redeem'),
      color: 'primary',
      cancelText: t('common:cancel'),
      onClose: confirmed => {
        if (confirmed) RedeemReward(reward.id).then(invalidateAll)
        setConfirmationModel({})
      },
    })
  }
  const handleApprove = redemption => {
    ApproveRedemption(redemption.id).then(invalidateAll)
  }
  const handleReject = redemption => {
    RejectRedemption(redemption.id).then(invalidateAll)
  }

  if (
    (view === 'store' && rewardsLoading) ||
    (view === 'requests' && redemptionsLoading)
  ) {
    return (
      <Box sx={{ display: 'grid', minHeight: '50dvh', placeItems: 'center' }}>
        <CircularProgress size='sm' />
      </Box>
    )
  }

  return (
    <Container
      maxWidth='md'
      sx={{
        px: embedded ? 0 : { xs: 2, sm: 3 },
        pb: embedded ? 0 : 4,
        pt: embedded ? 0 : { xs: 1, sm: 2 },
      }}
    >
      {!embedded && (
        <Box component='header' sx={{ mb: 2.5 }}>
          <Typography
            level='h2'
            sx={{
              fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
              letterSpacing: '-0.028em',
              lineHeight: 1.15,
            }}
          >
            {t('common:navigation.rewards')}
          </Typography>
          <Typography
            level='body-sm'
            textColor='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {t('view.subtitle')}
          </Typography>
        </Box>
      )}

      {view === 'store' && (
        <Sheet
          sx={{
            ...surfaceSx,
            alignItems: 'center',
            bgcolor: 'primary.softBg',
            borderColor: 'primary.softColor',
            display: 'flex',
            gap: 2,
            mb: 2.5,
            overflow: 'hidden',
            p: { xs: 2, sm: 2.5 },
            position: 'relative',
            '&::after': {
              border: '18px solid',
              borderColor: 'primary.softColor',
              borderRadius: '50%',
              content: '""',
              height: 112,
              opacity: 0.08,
              position: 'absolute',
              right: -38,
              top: -46,
              width: 112,
            },
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.surface',
              borderRadius: '50%',
              color: 'warning.500',
              display: 'grid',
              flex: '0 0 auto',
              height: 52,
              placeItems: 'center',
              width: 52,
            }}
          >
            <StarsRounded />
          </Box>
          <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
            <Typography
              level='body-xs'
              textColor='text.secondary'
              sx={{ mb: 0.25 }}
            >
              {t('view.availableBalance')}
            </Typography>
            <Typography
              level='h2'
              sx={{
                fontSize: '1.75rem',
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              {availablePoints.toLocaleString()}
              <Typography
                component='span'
                level='title-sm'
                textColor='text.secondary'
                sx={{ ml: 0.75 }}
              >
                {t('view.pointsLabel')}
              </Typography>
            </Typography>
          </Box>
        </Sheet>
      )}

      {view === 'store' ? (
        activeRewards.length === 0 ? (
          <Sheet sx={{ ...surfaceSx, py: 4 }}>
            <EmptyState
              icon={<CardGiftcardRounded />}
              title={t('view.emptyTitle')}
              description={t('view.emptyDescription')}
              primaryAction={
                isAdmin
                  ? {
                      label: t('view.createReward'),
                      startDecorator: <AddRounded />,
                      onClick: handleAdd,
                    }
                  : undefined
              }
            />
          </Sheet>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
            }}
          >
            {activeRewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                availablePoints={availablePoints}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRedeem={handleRedeem}
              />
            ))}
          </Box>
        )
      ) : pendingRedemptions.length === 0 ? (
        <Sheet sx={{ ...surfaceSx, py: 4 }}>
          <EmptyState
            icon={<RedeemRounded />}
            title={t('requests.emptyTitle')}
            description={t('requests.emptyDescription')}
          />
        </Sheet>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pendingRedemptions.map(redemption => (
            <RedemptionRow
              key={redemption.id}
              redemption={redemption}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </Box>
      )}

      {modalOpen && (
        <RewardModal
          isOpen={modalOpen}
          reward={currentReward}
          onClose={() => {
            setModalOpen(false)
            invalidateAll()
          }}
        />
      )}
      {isAdmin && view === 'store' && (
        <ScrollHideFab
          sx={{
            ...getSafeBottomStyles({ bottom: 0, padding: 16 }),
            '@media (max-width: 768px)': {
              bottom: getSafeBottom(56, 16),
            },
          }}
        >
          <IconButton
            data-testid='open-add-reward-modal'
            color='primary'
            variant='solid'
            aria-label={t('view.createReward')}
            onClick={handleAdd}
            sx={{ borderRadius: '50%', height: 50, width: 50 }}
          >
            <AddRounded />
          </IconButton>
        </ScrollHideFab>
      )}

      {confirmationModel?.isOpen && (
        <ConfirmationModal config={confirmationModel} />
      )}
      <Box sx={getSafeBottomStyles({ bottom: 0, padding: 16 })} />
    </Container>
  )
}

RewardsView.propTypes = {
  embedded: PropTypes.bool,
  view: PropTypes.oneOf(['requests', 'store']),
}

export default RewardsView
