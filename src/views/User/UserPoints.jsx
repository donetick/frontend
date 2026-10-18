import {
  AssignmentTurnedInRounded,
  EmojiEventsRounded,
  KeyboardArrowDownRounded,
  MilitaryTechRounded,
  RedeemRounded,
  TollRounded,
  TrendingUpRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Option,
  Select,
  Sheet,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext.jsx'
import { useChoresHistory } from '../../queries/ChoreQueries.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { isPlusHistoryWindow } from '../../utils/entitlements.js'
import { RedeemPoints } from '../../utils/Fetcher.jsx'
import { resolvePhotoURL } from '../../utils/Helpers.jsx'
import LoadingComponent from '../components/Loading.jsx'
import RedeemPointsModal from '../Modals/RedeemPointsModal'
import { useRedemptions } from '../Rewards/RewardQueries.jsx'
import RewardsView from '../Rewards/RewardsView.jsx'

const PERIODS = [
  { shortKey: 'tabs.short7d', value: 7 },
  { shortKey: 'tabs.short30d', value: 30 },
  { shortKey: 'tabs.short6m', value: 6 * 30, plus: true },
  { shortKey: 'tabs.shortAll', value: 24 * 30, plus: true },
]

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const buildHistorySummary = (history, userId, period) => {
  let count
  let unit
  let keyFormat
  let labelFormat

  if (period === 7) {
    count = 7
    unit = 'day'
    keyFormat = 'YYYY-MM-DD'
    labelFormat = 'ddd'
  } else if (period === 30) {
    count = 30
    unit = 'day'
    keyFormat = 'YYYY-MM-DD'
    labelFormat = 'D'
  } else if (period === 6 * 30) {
    count = 6
    unit = 'month'
    keyFormat = 'YYYY-MM'
    labelFormat = 'MMM'
  } else {
    count = 12
    unit = 'year'
    keyFormat = 'YYYY'
    labelFormat = 'YYYY'
  }

  const buckets = Array.from({ length: count }, (_, index) => {
    const date = moment().subtract(count - index - 1, unit)
    return {
      key: date.format(keyFormat),
      label: date.format(labelFormat),
      points: 0,
      tasks: 0,
    }
  })
  const bucketByKey = new Map(buckets.map(bucket => [bucket.key, bucket]))

  history.forEach(entry => {
    if (userId && entry.completedBy !== userId) return
    const bucket = bucketByKey.get(moment(entry.performedAt).format(keyFormat))
    if (!bucket) return
    bucket.points += entry.points || 0
    bucket.tasks += 1
  })

  return buckets
}

const getRankIcon = rank => {
  if (rank === 1)
    return <EmojiEventsRounded sx={{ color: '#D99B16', fontSize: 21 }} />
  if (rank === 2)
    return <WorkspacePremiumRounded sx={{ color: '#8B95A5', fontSize: 21 }} />
  if (rank === 3)
    return <MilitaryTechRounded sx={{ color: '#B87345', fontSize: 21 }} />
  return (
    <Typography
      level='body-sm'
      textColor='text.tertiary'
      sx={{ fontWeight: 650 }}
    >
      {rank}
    </Typography>
  )
}

const getPeriodLabel = (period, t) => {
  if (period === 24 * 30) return t('summary.allTime')
  if (period === 6 * 30) return t('summary.last6Months')
  return t('summary.lastDays', { count: period })
}

const UserPoints = () => {
  const { t } = useTranslation('points')
  const [period, setPeriod] = useState(7)
  const [selectedUser, setSelectedUser] = useState(null)
  const [leaderboardMode, setLeaderboardMode] = useState('points')
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = searchParams.get('tab')

  const {
    data: circleMembersData,
    handleRefetch: refetchCircleMembers,
    isLoading: isCircleMembersLoading,
  } = useCircleMembers()
  const {
    data: choresHistoryData,
    handleLimitChange: changeHistoryLimit,
    isLoading: isChoresHistoryLoading,
  } = useChoresHistory(7, true)
  const { data: userProfile } = useUserProfile()
  const { data: pendingRedemptions = [] } = useRedemptions('pending')
  const { isPlus, showPaywall } = usePaywall()

  const circleUsers = useMemo(
    () => circleMembersData?.res || [],
    [circleMembersData?.res],
  )
  const history = useMemo(() => choresHistoryData || [], [choresHistoryData])
  const activeSelectedUser = selectedUser || userProfile?.id
  const currentMembership = circleUsers.find(
    user => user.userId === userProfile?.id,
  )
  const canManageRewards =
    currentMembership?.role === 'admin' || currentMembership?.role === 'manager'
  const activeSection =
    requestedSection === 'requests' && canManageRewards
      ? 'requests'
      : requestedSection === 'rewards' || requestedSection === 'requests'
        ? 'rewards'
        : 'overview'

  const handlePeriodChange = nextPeriod => {
    if (!isPlus && isPlusHistoryWindow(nextPeriod)) {
      showPaywall(PAYWALL_REASON.HISTORY_WINDOW)
      return
    }
    setPeriod(nextPeriod)
    changeHistoryLimit(nextPeriod)
  }

  const selectedHistory = useMemo(
    () => buildHistorySummary(history, activeSelectedUser, period),
    [activeSelectedUser, history, period],
  )

  const leaderboardData = useMemo(() => {
    const stats = new Map(
      circleUsers.map(user => [
        user.userId,
        {
          ...user,
          availablePoints: (user.points || 0) - (user.pointsRedeemed || 0),
          periodPoints: 0,
          periodTasks: 0,
        },
      ]),
    )

    history.forEach(entry => {
      const user = stats.get(entry.completedBy)
      if (!user) return
      user.periodPoints += entry.points || 0
      user.periodTasks += 1
    })

    const sortField =
      leaderboardMode === 'points' ? 'periodPoints' : 'periodTasks'
    return [...stats.values()]
      .sort((a, b) => b[sortField] - a[sortField])
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        avgPointsPerTask:
          user.periodTasks > 0
            ? (user.periodPoints / user.periodTasks).toFixed(1)
            : 0,
      }))
  }, [circleUsers, history, leaderboardMode])

  const pageTabs = (
    <Tabs
      value={activeSection}
      onChange={(event, value) => {
        setSearchParams(
          previous => {
            const next = new URLSearchParams(previous)
            if (value === 'overview') next.delete('tab')
            else next.set('tab', value)
            return next
          },
          { replace: true },
        )
      }}
      sx={{
        bgcolor: 'background.level1',
        borderRadius: 'lg',
        mb: 3,
        p: 0.5,
        width: { xs: '100%', sm: canManageRewards ? 430 : 320 },
      }}
    >
      <TabList disableUnderline sx={{ gap: 0.5 }}>
        <Tab
          value='overview'
          disableIndicator
          sx={{
            borderRadius: 'md',
            flex: 1,
            fontWeight: 600,
            '&.Mui-selected': {
              bgcolor: 'background.surface',
              boxShadow: 'sm',
            },
          }}
        >
          {t('sections.overview')}
        </Tab>
        <Tab
          value='rewards'
          disableIndicator
          sx={{
            borderRadius: 'md',
            flex: 1,
            fontWeight: 600,
            '&.Mui-selected': {
              bgcolor: 'background.surface',
              boxShadow: 'sm',
            },
          }}
        >
          {t('common:navigation.rewards')}
        </Tab>
        {canManageRewards && (
          <Tab
            value='requests'
            disableIndicator
            sx={{
              borderRadius: 'md',
              flex: 1,
              fontWeight: 600,
              '&.Mui-selected': {
                bgcolor: 'background.surface',
                boxShadow: 'sm',
              },
            }}
          >
            {t('rewards:tabs.requests')}
            {pendingRedemptions.length > 0 && (
              <Chip
                size='sm'
                variant='solid'
                color='warning'
                sx={{
                  '--Chip-paddingInline': '0px',
                  borderRadius: '50%',
                  height: 20,
                  ml: 0.75,
                  minHeight: 20,
                  minWidth: 20,
                  width: 20,
                  '& .MuiChip-label': {
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    lineHeight: 1,
                    p: 0,
                    width: '100%',
                  },
                }}
              >
                {pendingRedemptions.length}
              </Chip>
            )}
          </Tab>
        )}
      </TabList>
    </Tabs>
  )

  if (
    requestedSection === 'requests' &&
    (isCircleMembersLoading || !userProfile)
  ) {
    return <LoadingComponent />
  }

  if (activeSection === 'rewards' || activeSection === 'requests') {
    return (
      <Container
        maxWidth='md'
        sx={{ px: { xs: 2, sm: 3 }, pb: 6, pt: { xs: 1, sm: 2 } }}
      >
        {pageTabs}
        <RewardsView
          embedded
          view={activeSection === 'requests' ? 'requests' : 'store'}
        />
      </Container>
    )
  }

  if (isChoresHistoryLoading || isCircleMembersLoading || !userProfile) {
    return <LoadingComponent />
  }

  const selectedUserData = circleUsers.find(
    user => user.userId === activeSelectedUser,
  )
  const totalPoints = selectedUserData?.points || 0
  const redeemedPoints = selectedUserData?.pointsRedeemed || 0
  const availablePoints = totalPoints - redeemedPoints
  const periodPoints = selectedHistory.reduce(
    (sum, bucket) => sum + bucket.points,
    0,
  )
  const isAdmin = currentMembership?.role === 'admin'
  const periodLabel = getPeriodLabel(period, t)

  return (
    <Container
      maxWidth='md'
      sx={{ px: { xs: 2, sm: 3 }, pb: 6, pt: { xs: 1, sm: 2 } }}
    >
      {pageTabs}

      <Box
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            level='h2'
            sx={{
              fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
              letterSpacing: '-0.028em',
              lineHeight: 1.15,
            }}
          >
            {t(
              `leaderboard.title${leaderboardMode === 'points' ? 'Points' : 'Tasks'}`,
            )}
          </Typography>
          <Typography
            level='body-sm'
            textColor='text.secondary'
            sx={{ mt: 0.5, maxWidth: 520, textWrap: 'pretty' }}
          >
            {t(
              `leaderboard.subtitle${leaderboardMode === 'points' ? 'Points' : 'Tasks'}`,
            )}
          </Typography>
        </Box>

        <Tabs
          value={period}
          onChange={(event, value) => handlePeriodChange(value)}
          size='sm'
          sx={{ bgcolor: 'background.level1', borderRadius: 'lg', p: 0.5 }}
        >
          <TabList disableUnderline sx={{ gap: 0.25 }}>
            {PERIODS.map(item => (
              <Tab
                key={item.value}
                value={item.value}
                disableIndicator
                sx={{
                  borderRadius: 'md',
                  minWidth: 0,
                  px: { xs: 1.25, sm: 1.75 },
                  '&.Mui-selected': {
                    bgcolor: 'background.surface',
                    boxShadow: 'sm',
                  },
                }}
              >
                {t(item.shortKey)}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </Box>

      <Sheet sx={{ ...surfaceSx, overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'space-between',
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Avatar
              size='lg'
              src={resolvePhotoURL(selectedUserData?.image)}
              sx={{ bgcolor: 'primary.softBg', color: 'primary.softColor' }}
            >
              {selectedUserData?.displayName?.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              {circleUsers.length > 1 ? (
                <Select
                  value={activeSelectedUser}
                  onChange={(event, value) => value && setSelectedUser(value)}
                  variant='plain'
                  size='sm'
                  indicator={<KeyboardArrowDownRounded />}
                  aria-label={t('summary.selectUser')}
                  renderValue={() => (
                    <Typography
                      level='body-sm'
                      textColor='text.secondary'
                      sx={{ fontWeight: 650 }}
                      noWrap
                    >
                      {selectedUserData?.displayName ||
                        t('summary.unknownUser')}
                    </Typography>
                  )}
                  sx={{
                    ml: -0.75,
                    minHeight: 0,
                    px: 0.75,
                    py: 0.25,
                    '&:hover': { bgcolor: 'background.level1' },
                  }}
                >
                  {circleUsers.map(user => (
                    <Option key={user.userId} value={user.userId}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          gap: 1,
                          width: '100%',
                        }}
                      >
                        <Avatar
                          size='sm'
                          src={resolvePhotoURL(user.image)}
                          sx={{ '--Avatar-size': '22px' }}
                        >
                          {user.displayName?.charAt(0)}
                        </Avatar>
                        <Typography level='body-sm' sx={{ flex: 1 }} noWrap>
                          {user.displayName}
                        </Typography>
                        {user.userId === userProfile.id && (
                          <Chip size='sm' variant='soft' color='primary'>
                            {t('leaderboard.you')}
                          </Chip>
                        )}
                      </Box>
                    </Option>
                  ))}
                </Select>
              ) : (
                <Typography level='body-sm' textColor='text.secondary' noWrap>
                  {selectedUserData?.displayName || t('summary.unknownUser')}
                </Typography>
              )}
              <Box sx={{ alignItems: 'baseline', display: 'flex', gap: 0.75 }}>
                <Typography
                  sx={{
                    fontSize: 'clamp(2rem, 9vw, 2.75rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.045em',
                    lineHeight: 1.05,
                  }}
                >
                  {availablePoints}
                </Typography>
                <Typography level='title-sm' textColor='text.secondary'>
                  {t('cards.available.title')}
                </Typography>
              </Box>
              <Typography level='body-xs' textColor='text.tertiary'>
                {t('cards.available.subtext')}
              </Typography>
            </Box>
          </Box>

          {isAdmin && (
            <Button
              variant='soft'
              startDecorator={<RedeemRounded />}
              onClick={() => setIsRedeemModalOpen(true)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {t('redeem')}
            </Button>
          )}
        </Box>

        <Divider />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            bgcolor: 'background.level1',
          }}
        >
          {[
            { label: t('cards.period.title'), value: periodPoints },
            { label: t('cards.total.title'), value: totalPoints },
            { label: t('cards.redeemed.title'), value: redeemedPoints },
          ].map((stat, index) => (
            <Box
              key={stat.label}
              sx={{
                borderLeft: index ? '1px solid' : 0,
                borderColor: 'divider',
                minWidth: 0,
                px: { xs: 1.25, sm: 2.5 },
                py: 1.5,
              }}
            >
              <Typography level='title-md' sx={{ fontWeight: 650 }}>
                {stat.value}
              </Typography>
              <Typography level='body-xs' textColor='text.secondary' noWrap>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Sheet>

      <Box component='section' sx={{ mb: 3.5 }}>
        <Box
          sx={{
            alignItems: 'flex-end',
            display: 'flex',
            justifyContent: 'space-between',
            mb: 1.25,
          }}
        >
          <Box>
            <Typography level='title-md' sx={{ fontWeight: 650 }}>
              {t('trend.title')}
            </Typography>
            <Typography level='body-xs' textColor='text.tertiary'>
              {periodLabel}
            </Typography>
          </Box>
          <Chip
            size='sm'
            variant='soft'
            color='primary'
            startDecorator={<TrendingUpRounded />}
          >
            {t('leaderboard.points', { count: periodPoints })}
          </Chip>
        </Box>
        <Sheet sx={{ ...surfaceSx, height: 260, p: { xs: 1, sm: 2 } }}>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={selectedHistory}
              margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke='var(--joy-palette-divider)'
              />
              <XAxis
                dataKey='label'
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'var(--joy-palette-text-tertiary)',
                  fontSize: 11,
                }}
                interval={period === 30 ? 4 : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{
                  fill: 'var(--joy-palette-text-tertiary)',
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ fill: 'var(--joy-palette-background-level1)' }}
                contentStyle={{
                  background: 'var(--joy-palette-background-surface)',
                  border: '1px solid var(--joy-palette-divider)',
                  borderRadius: 10,
                  boxShadow: 'var(--joy-shadow-md)',
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey='points'
                fill='var(--joy-palette-primary-500)'
                maxBarSize={32}
                radius={[6, 6, 2, 2]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Sheet>
      </Box>

      <Box component='section'>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            gap: 1.5,
            justifyContent: 'space-between',
            mb: 1.25,
          }}
        >
          <Typography level='title-md' sx={{ fontWeight: 650 }}>
            {t(
              `leaderboard.title${leaderboardMode === 'points' ? 'Points' : 'Tasks'}`,
            )}
          </Typography>
          <Tabs
            value={leaderboardMode}
            onChange={(event, value) => setLeaderboardMode(value)}
            size='sm'
            sx={{ bgcolor: 'background.level1', borderRadius: 'lg', p: 0.375 }}
          >
            <TabList disableUnderline>
              <Tab
                value='points'
                disableIndicator
                sx={{ borderRadius: 'md', px: 1.25 }}
              >
                {t('leaderboard.modePoints')}
              </Tab>
              <Tab
                value='tasks'
                disableIndicator
                sx={{ borderRadius: 'md', px: 1.25 }}
              >
                {t('leaderboard.modeTasks')}
              </Tab>
            </TabList>
          </Tabs>
        </Box>

        <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
          {leaderboardData.map((user, index) => {
            const isSelected = user.userId === activeSelectedUser
            const isCurrentUser = user.userId === userProfile.id
            return (
              <Box key={user.userId}>
                {index > 0 && <Divider sx={{ ml: 7.5 }} />}
                <Box
                  component='button'
                  type='button'
                  onClick={() => setSelectedUser(user.userId)}
                  aria-pressed={isSelected}
                  sx={{
                    alignItems: 'center',
                    appearance: 'none',
                    bgcolor: isSelected ? 'primary.softBg' : 'transparent',
                    border: 0,
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    font: 'inherit',
                    gap: 1.25,
                    p: { xs: 1.25, sm: 1.5 },
                    textAlign: 'start',
                    transition: 'background-color 150ms ease',
                    width: '100%',
                    '&:hover': {
                      bgcolor: isSelected
                        ? 'primary.softHoverBg'
                        : 'background.level1',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.500',
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Box
                    sx={{ display: 'grid', placeItems: 'center', width: 28 }}
                  >
                    {getRankIcon(user.rank)}
                  </Box>
                  <Avatar size='sm' src={resolvePhotoURL(user.image)}>
                    {user.displayName?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{ alignItems: 'center', display: 'flex', gap: 0.75 }}
                    >
                      <Typography level='title-sm' noWrap>
                        {user.displayName}
                      </Typography>
                      {isCurrentUser && (
                        <Chip size='sm' variant='soft' color='primary'>
                          {t('leaderboard.you')}
                        </Chip>
                      )}
                    </Box>
                    <Typography
                      level='body-xs'
                      textColor='text.secondary'
                      noWrap
                    >
                      {t('leaderboard.tasksAndAvg', {
                        tasks: user.periodTasks,
                        avg: user.avgPointsPerTask,
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'end', flex: '0 0 auto' }}>
                    <Typography
                      level='title-md'
                      startDecorator={
                        leaderboardMode === 'points' ? (
                          <TollRounded sx={{ fontSize: 16 }} />
                        ) : (
                          <AssignmentTurnedInRounded sx={{ fontSize: 16 }} />
                        )
                      }
                      sx={{ color: 'primary.plainColor', fontWeight: 700 }}
                    >
                      {leaderboardMode === 'points'
                        ? user.periodPoints
                        : user.periodTasks}
                    </Typography>
                    <Typography level='body-xs' textColor='text.tertiary'>
                      {leaderboardMode === 'points'
                        ? t('leaderboard.available', {
                            count: user.availablePoints,
                          })
                        : t('leaderboard.points', { count: user.periodPoints })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Sheet>
      </Box>

      <RedeemPointsModal
        config={{
          isOpen: isRedeemModalOpen,
          available: availablePoints,
          user: selectedUserData,
          onClose: () => setIsRedeemModalOpen(false),
          onSave: ({ points, userId }) => {
            RedeemPoints(userId, points, userProfile.circleID)
              .then(() => {
                setIsRedeemModalOpen(false)
                refetchCircleMembers()
              })
              .catch(error => console.error(error))
          },
        }}
      />
    </Container>
  )
}

export default UserPoints
