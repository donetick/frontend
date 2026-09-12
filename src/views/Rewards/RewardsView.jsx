import { Add, Delete, Edit, Redeem } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
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
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import RewardModal from '../Modals/Inputs/RewardModal'
import { useRedemptions, useRewards } from './RewardQueries'

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
    <Card variant='outlined' sx={{ gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Typography level='title-md'>{reward.name}</Typography>
        {isAdmin && (
          <Stack direction='row' gap={0.5}>
            <IconButton
              size='sm'
              variant='plain'
              onClick={() => onEdit(reward)}
            >
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size='sm'
              variant='plain'
              color='danger'
              onClick={() => onDelete(reward)}
            >
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        )}
      </Box>
      {reward.description && (
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {reward.description}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Chip variant='soft' color='primary'>
          {t('pointsCost', { count: reward.pointsCost })}
        </Chip>
        <Button
          size='sm'
          startDecorator={<Redeem />}
          disabled={!canAfford}
          onClick={() => onRedeem(reward)}
        >
          {canAfford ? t('redeem') : t('notEnoughPoints')}
        </Button>
      </Box>
    </Card>
  )
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
    <Card variant='outlined' sx={{ p: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography level='title-sm'>{redemption.rewardName}</Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {t('pointsCost', { count: redemption.pointsCost })}
          </Typography>
        </Box>
        <Stack direction='row' gap={1} alignItems='center'>
          <Chip size='sm' variant='soft' color={statusColor}>
            {statusLabel}
          </Chip>
          {isAdmin && redemption.status === 0 && (
            <>
              <Button
                size='sm'
                color='success'
                onClick={() => onApprove(redemption)}
              >
                {t('approve')}
              </Button>
              <Button
                size='sm'
                color='danger'
                variant='soft'
                onClick={() => onReject(redemption)}
              >
                {t('reject')}
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Card>
  )
}

const RewardsView = () => {
  const { t } = useTranslation('rewards')
  const queryClient = useQueryClient()

  const { data: rewards = [], isLoading: rewardsLoading } = useRewards()
  const { data: userProfile } = useUserProfile()
  const { data: circleMembersData } = useCircleMembers()
  const { data: myRedemptions = [] } = useRedemptions()
  const { data: pendingRedemptions = [] } = useRedemptions('pending')

  const [modalOpen, setModalOpen] = useState(false)
  const [currentReward, setCurrentReward] = useState(null)
  const [confirmationModel, setConfirmationModel] = useState({})
  const [tab, setTab] = useState('store')

  const currentMember = useMemo(
    () => circleMembersData?.res?.find(m => m.userId === userProfile?.id),
    [circleMembersData, userProfile],
  )
  const isAdmin =
    currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const availablePoints = currentMember
    ? (currentMember.points || 0) - (currentMember.pointsRedeemed || 0)
    : 0

  const activeRewards = useMemo(
    () => rewards.filter(r => r.isActive),
    [rewards],
  )

  const invalidateAll = () => {
    queryClient.invalidateQueries('rewards')
    queryClient.invalidateQueries('redemptions')
    queryClient.invalidateQueries('allCircleMembers')
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
        if (confirmed) {
          DeleteReward(reward.id).then(invalidateAll)
        }
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
        if (confirmed) {
          RedeemReward(reward.id).then(invalidateAll)
        }
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

  if (rewardsLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('common:navigation.rewards')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('blurb', { points: availablePoints })}
          </Typography>
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
        <TabList>
          <Tab value='store'>{t('tabs.store')}</Tab>
          <Tab value='requests'>
            {t('tabs.requests')}
            {isAdmin && pendingRedemptions.length > 0 && (
              <Chip size='sm' variant='solid' color='warning' sx={{ ml: 1 }}>
                {pendingRedemptions.length}
              </Chip>
            )}
          </Tab>
        </TabList>

        <TabPanel value='store' sx={{ px: 0 }}>
          <Box sx={{ px: 2, py: 2 }}>
            {activeRewards.length === 0 ? (
              <EmptyState
                fullHeight
                icon={<Redeem />}
                title={t('view.emptyTitle')}
                description={t('view.emptyDescription')}
                primaryAction={
                  isAdmin
                    ? {
                        label: t('view.createReward'),
                        startDecorator: <Add />,
                        onClick: handleAdd,
                      }
                    : undefined
                }
              />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
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
            )}
            {isAdmin && activeRewards.length > 0 && (
              <Button
                sx={{ mt: 2 }}
                startDecorator={<Add />}
                variant='soft'
                onClick={handleAdd}
              >
                {t('view.createReward')}
              </Button>
            )}
          </Box>
        </TabPanel>

        <TabPanel value='requests' sx={{ px: 0 }}>
          <Box
            sx={{
              px: 2,
              py: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {(isAdmin ? pendingRedemptions : myRedemptions).length === 0 ? (
              <EmptyState
                fullHeight
                icon={<Redeem />}
                title={t('requests.emptyTitle')}
                description={t('requests.emptyDescription')}
              />
            ) : (
              (isAdmin ? pendingRedemptions : myRedemptions).map(redemption => (
                <RedemptionRow
                  key={redemption.id}
                  redemption={redemption}
                  isAdmin={isAdmin}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </Box>
        </TabPanel>
      </Tabs>

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
      <ConfirmationModal config={confirmationModel} />
      <Box sx={getSafeBottomStyles({ bottom: 0, padding: 16 })} />
    </Container>
  )
}

export default RewardsView
