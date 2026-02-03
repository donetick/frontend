import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import {
  AccountBalanceWallet,
  Analytics,
  AssignmentTurnedIn,
  CreditCard,
  EmojiEvents,
  MilitaryTech,
  Redeem,
  Star,
  SwapHoriz,
  Timeline,
  Toll,
  TrendingUp,
  WorkspacePremium,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Option,
  Select,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import LoadingComponent from '../components/Loading.jsx'

import { useChoresHistory } from '../../queries/ChoreQueries.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { RedeemPoints } from '../../utils/Fetcher.jsx'
import { resolvePhotoURL } from '../../utils/Helpers.jsx'
import RedeemPointsModal from '../Modals/RedeemPointsModal'
const UserPoints = () => {
  const [tabValue, setTabValue] = useState(7)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [leaderboardMode, setLeaderboardMode] = useState('points') // 'points' or 'tasks'

  const {
    data: circleMembersData,
    isLoading: isCircleMembersLoading,
    handleRefetch: handleCircleMembersRefetch,
  } = useCircleMembers()

  const {
    data: choresHistoryData,
    isLoading: isChoresHistoryLoading,
    handleLimitChange: handleChoresHistoryLimitChange,
  } = useChoresHistory(7)

  const { data: userProfile } = useUserProfile()
  const [selectedUser, setSelectedUser] = useState(userProfile?.id)
  const [circleUsers, setCircleUsers] = useState([])
  const [selectedHistory, setSelectedHistory] = useState([])

  useEffect(() => {
    if (circleMembersData && choresHistoryData && userProfile) {
      setCircleUsers(circleMembersData.res)
      setSelectedHistory(
        generateWeeklySummary(choresHistoryData, userProfile?.id),
      )
    }
  }, [circleMembersData, choresHistoryData, userProfile])

  useEffect(() => {
    if (choresHistoryData) {
      var history
      if (tabValue === 7) {
        history = generateWeeklySummary(choresHistoryData, selectedUser)
      } else if (tabValue === 30) {
        history = generateMonthSummary(choresHistoryData, selectedUser)
      } else if (tabValue === 6 * 30) {
        history = generateMonthlySummary(choresHistoryData, selectedUser)
      } else {
        history = generateYearlySummary(choresHistoryData, selectedUser)
      }
      setSelectedHistory(history)
    }
  }, [selectedUser, choresHistoryData, tabValue])

  useEffect(() => {
    setSelectedUser(userProfile?.id)
  }, [userProfile])

  const generateWeeklySummary = (history, userId) => {
    const daysAggregated = []
    for (let i = 6; i > -1; i--) {
      const currentDate = new Date()
      currentDate.setDate(currentDate.getDate() - i)
      daysAggregated.push({
        label: currentDate.toLocaleString('en-US', { weekday: 'short' }),
        points: 0,
        tasks: 0,
      })
    }
    history.forEach(chore => {
      const dayName = new Date(chore.performedAt).toLocaleString('en-US', {
        weekday: 'short',
      })

      const dayIndex = daysAggregated.findIndex(dayData => {
        if (userId)
          return dayData.label === dayName && chore.completedBy === userId
        return dayData.label === dayName
      })
      if (dayIndex !== -1) {
        if (chore.points) daysAggregated[dayIndex].points += chore.points
        daysAggregated[dayIndex].tasks += 1
      }
    })
    return daysAggregated
  }

  const generateMonthSummary = (history, userId) => {
    const daysAggregated = []
    for (let i = 29; i > -1; i--) {
      const currentDate = new Date()
      currentDate.setDate(currentDate.getDate() - i)
      daysAggregated.push({
        label: currentDate.toLocaleString('en-US', { day: 'numeric' }),
        points: 0,
        tasks: 0,
      })
    }
    history.forEach(chore => {
      const dayName = new Date(chore.performedAt).toLocaleString('en-US', {
        day: 'numeric',
      })

      const dayIndex = daysAggregated.findIndex(dayData => {
        if (userId)
          return dayData.label === dayName && chore.completedBy === userId
        return dayData.label === dayName
      })

      if (dayIndex !== -1) {
        if (chore.points) daysAggregated[dayIndex].points += chore.points
        daysAggregated[dayIndex].tasks += 1
      }
    })

    return daysAggregated
  }

  const generateMonthlySummary = (history, userId) => {
    const monthlyAggregated = []
    for (let i = 5; i > -1; i--) {
      const currentMonth = new Date()
      currentMonth.setMonth(currentMonth.getMonth() - i)
      monthlyAggregated.push({
        label: currentMonth.toLocaleString('en-US', { month: 'short' }),
        points: 0,
        tasks: 0,
      })
    }
    history.forEach(chore => {
      const monthName = new Date(chore.performedAt).toLocaleString('en-US', {
        month: 'short',
      })

      const monthIndex = monthlyAggregated.findIndex(monthData => {
        if (userId)
          return monthData.label === monthName && chore.completedBy === userId
        return monthData.label === monthName
      })

      if (monthIndex !== -1) {
        if (chore.points) monthlyAggregated[monthIndex].points += chore.points
        monthlyAggregated[monthIndex].tasks += 1
      }
    })
    return monthlyAggregated
  }

  const generateYearlySummary = (history, userId) => {
    const yearlyAggregated = []

    for (let i = 11; i > -1; i--) {
      const currentYear = new Date()
      currentYear.setFullYear(currentYear.getFullYear() - i)
      yearlyAggregated.push({
        label: currentYear.toLocaleString('en-US', { year: 'numeric' }),
        points: 0,
        tasks: 0,
      })
    }
    history.forEach(chore => {
      const yearName = new Date(chore.performedAt).toLocaleString('en-US', {
        year: 'numeric',
      })

      const yearIndex = yearlyAggregated.findIndex(yearData => {
        if (userId)
          return yearData.label === yearName && chore.completedBy === userId
        return yearData.label === yearName
      })

      if (yearIndex !== -1) {
        if (chore.points) yearlyAggregated[yearIndex].points += chore.points
        yearlyAggregated[yearIndex].tasks += 1
      }
    })
    return yearlyAggregated
  }

  if (isChoresHistoryLoading || isCircleMembersLoading || !userProfile) {
    return <LoadingComponent />
  }

  // Calculate leaderboard data for the current time period
  const calculateLeaderboard = () => {
    if (!choresHistoryData || !circleUsers.length) return []

    // Calculate points for each user in the current time period
    const userPeriodStats = {}

    // Initialize stats for all users
    circleUsers.forEach(user => {
      userPeriodStats[user.userId] = {
        userId: user.userId,
        displayName: user.displayName,
        image: user.image,
        totalPoints: user.points || 0,
        availablePoints: (user.points || 0) - (user.pointsRedeemed || 0),
        periodPoints: 0,
        periodTasks: 0,
      }
    })

    // Calculate period-specific stats from history
    choresHistoryData.forEach(historyEntry => {
      const userId = historyEntry.completedBy
      if (userPeriodStats[userId]) {
        userPeriodStats[userId].periodPoints += historyEntry.points || 0
        userPeriodStats[userId].periodTasks += 1
      }
    })

    // Convert to array and sort by selected mode
    const sortField =
      leaderboardMode === 'points' ? 'periodPoints' : 'periodTasks'
    return Object.values(userPeriodStats)
      .sort((a, b) => b[sortField] - a[sortField])
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        avgPointsPerTask:
          user.periodTasks > 0
            ? (user.periodPoints / user.periodTasks).toFixed(1)
            : 0,
      }))
  }

  const leaderboardData = calculateLeaderboard()

  // Get trophy icons for top 3
  const getTrophyIcon = rank => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: '#FFD700', fontSize: '1.2rem' }} /> // Gold
      case 2:
        return (
          <WorkspacePremium sx={{ color: '#C0C0C0', fontSize: '1.2rem' }} />
        ) // Silver
      case 3:
        return <MilitaryTech sx={{ color: '#CD7F32', fontSize: '1.2rem' }} /> // Bronze
      default:
        return <Star sx={{ color: 'text.secondary', fontSize: '1rem' }} />
    }
  }

  return (
    <Container
      maxWidth='md'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Enhanced Leaderboard Header Section */}
      <Box sx={{ mb: 4 }}>
        <Stack spacing={2}>
          {/* Title Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} />
            <Stack sx={{ flex: 1 }}>
              <Typography
                level='h3'
                sx={{ fontWeight: 'lg', color: 'text.primary' }}
              >
                {leaderboardMode === 'points' ? 'Points' : 'Tasks'} Leaderboard
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                Rankings based on{' '}
                {leaderboardMode === 'points'
                  ? 'points earned'
                  : 'tasks completed'}{' '}
                during the selected time period
              </Typography>
            </Stack>
          </Box>

          {/* Filters Row - Responsive */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: { xs: 'flex-start', sm: 'space-between' },
            }}
          >
            {/* Time Period Filter */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              <Tabs
                onChange={(e, tabValue) => {
                  setTabValue(tabValue)
                  handleChoresHistoryLimitChange(tabValue)
                }}
                value={tabValue}
                size='sm'
                sx={{
                  borderRadius: 6,
                  backgroundColor: 'background.surface',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TabList
                  disableUnderline
                  sx={{
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    p: 0.3,
                    gap: 0.3,
                  }}
                >
                  {[
                    { label: '7D', value: 7 },
                    { label: '6M', value: 6 * 30 },
                    { label: 'All', value: 24 * 30 },
                  ].map((tab, index) => (
                    <Tab
                      key={index}
                      sx={{
                        borderRadius: 4,
                        minWidth: 'auto',
                        px: 1.5,
                        py: 0.5,
                        fontSize: 'xs',
                        fontWeight: 500,
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          color: 'primary.plainColor',
                          backgroundColor: 'primary.softBg',
                          fontWeight: 600,
                        },
                        '&:hover': {
                          backgroundColor: 'neutral.softHoverBg',
                        },
                      }}
                      disableIndicator
                      value={tab.value}
                    >
                      {tab.label}
                    </Tab>
                  ))}
                </TabList>
              </Tabs>
            </Box>

            {/* Toggle between points and tasks */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'flex-end' },
                gap: 1,
                mb: 1,
              }}
            >
              <Chip
                variant={leaderboardMode === 'points' ? 'solid' : 'outlined'}
                color='primary'
                size='sm'
                sx={{ cursor: 'pointer' }}
                onClick={() => setLeaderboardMode('points')}
              >
                Points
              </Chip>
              <SwapHoriz
                sx={{ fontSize: '0.875rem', color: 'text.tertiary' }}
              />
              <Chip
                variant={leaderboardMode === 'tasks' ? 'solid' : 'outlined'}
                color='primary'
                size='sm'
                sx={{ cursor: 'pointer' }}
                onClick={() => setLeaderboardMode('tasks')}
              >
                Tasks
              </Chip>
            </Box>
          </Box>
        </Stack>

        {/* Leaderboard Cards */}
        <Card
          variant='outlined'
          sx={{ borderRadius: 'lg', overflow: 'hidden' }}
        >
          <Stack spacing={0}>
            {leaderboardData.map((user, index) => (
              <Box key={user.userId}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2.5,
                    backgroundColor:
                      user.userId === userProfile.id
                        ? 'primary.softBg'
                        : 'transparent',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor:
                        user.userId === userProfile.id
                          ? 'primary.softHoverBg'
                          : 'neutral.softHoverBg',
                    },
                    cursor:
                      user.userId === selectedUser ? 'default' : 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                  onClick={() => {
                    if (user.userId !== selectedUser) {
                      setSelectedUser(user.userId)
                      setSelectedHistory(
                        generateWeeklySummary(choresHistoryData, user.userId),
                      )
                    }
                  }}
                >
                  {/* Rank Badge */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 40,
                      mr: 2,
                    }}
                  >
                    {getTrophyIcon(user.rank)}
                    <Typography
                      level='body-sm'
                      sx={{
                        ml: 0.5,
                        fontWeight: user.rank <= 3 ? 'bold' : 'normal',
                        color:
                          user.rank <= 3 ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      #{user.rank}
                    </Typography>
                  </Box>

                  {/* User Avatar and Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Avatar
                      src={user.image ? resolvePhotoURL(user.image) : undefined}
                      sx={{ width: 40, height: 40, mr: 2 }}
                    >
                      {user.displayName?.charAt(0)}
                    </Avatar>
                    <Stack sx={{ flex: 1 }}>
                      <Typography
                        level='body-md'
                        sx={{
                          fontWeight:
                            user.userId === userProfile.id ? 'bold' : 'normal',
                          color: 'text.primary',
                        }}
                      >
                        {user.displayName}
                        {user.userId === userProfile.id && (
                          <Chip
                            size='sm'
                            variant='soft'
                            color='primary'
                            sx={{ ml: 1 }}
                          >
                            You
                          </Chip>
                        )}
                      </Typography>
                      <Typography
                        level='body-xs'
                        sx={{ color: 'text.secondary' }}
                      >
                        {user.periodTasks} tasks • {user.avgPointsPerTask} avg
                        per task
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Metric Display */}
                  <Stack alignItems='flex-end' spacing={0.5}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      {leaderboardMode === 'points' ? (
                        <Toll sx={{ fontSize: '1rem', color: 'success.500' }} />
                      ) : (
                        <AssignmentTurnedIn
                          sx={{ fontSize: '1rem', color: 'success.500' }}
                        />
                      )}
                      <Typography
                        level='title-md'
                        sx={{
                          fontWeight: 'bold',
                          color: 'success.600',
                        }}
                      >
                        {leaderboardMode === 'points'
                          ? user.periodPoints
                          : user.periodTasks}
                      </Typography>
                    </Box>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {leaderboardMode === 'points'
                        ? `${user.availablePoints} available`
                        : `${user.periodPoints} points`}
                    </Typography>
                  </Stack>

                  {/* Selection Indicator */}
                  {user.userId === selectedUser && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        backgroundColor: 'primary.500',
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  )}
                </Box>
                {index < leaderboardData.length - 1 && (
                  <Box
                    sx={{
                      height: 1,
                      backgroundColor: 'divider',
                      mx: 2.5,
                    }}
                  />
                )}
              </Box>
            ))}
          </Stack>
        </Card>
      </Box>

      {/* Filters Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Analytics sx={{ fontSize: '1.5rem', color: 'primary.500' }} />
        <Typography level='h4' sx={{ fontWeight: 'lg', color: 'text.primary' }}>
          Filter & Analysis
        </Typography>
      </Box>

      {/* Improved Filter Bar */}
      <Card
        variant='outlined'
        sx={{
          width: '100%',
          p: 2,
          mb: 3,
          borderRadius: 12,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack spacing={2}>
          <Typography level='title-sm' sx={{ color: 'text.secondary' }}>
            Filter Points
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            {/* User Filter */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography level='body-sm' sx={{ mb: 1, fontWeight: 500 }}>
                Show points for:
              </Typography>
              <Select
                sx={{
                  width: '100%',
                }}
                variant='outlined'
                value={selectedUser}
                onChange={(e, selected) => {
                  setSelectedUser(selected)
                  setSelectedHistory(
                    generateWeeklySummary(choresHistoryData, selected),
                  )
                }}
                renderValue={() => {
                  return (
                    <Typography
                      startDecorator={
                        <Avatar
                          color='primary'
                          size='sm'
                          src={resolvePhotoURL(
                            circleUsers.find(
                              user => user.userId === selectedUser,
                            )?.image,
                          )}
                        >
                          {circleUsers
                            .find(user => user.userId === selectedUser)
                            ?.displayName?.charAt(0)}
                        </Avatar>
                      }
                    >
                      {
                        circleUsers.find(user => user.userId === selectedUser)
                          ?.displayName
                      }
                    </Typography>
                  )
                }}
              >
                {circleUsers.map(user => (
                  <Option key={user.userId} value={user.userId}>
                    <Avatar
                      color='primary'
                      size='sm'
                      src={resolvePhotoURL(user.image)}
                    >
                      {user.displayName?.charAt(0)}
                    </Avatar>
                    <Typography>{user.displayName}</Typography>
                    <Chip
                      color='success'
                      size='sm'
                      variant='soft'
                      startDecorator={<Toll />}
                    >
                      {user.points - user.pointsRedeemed}
                    </Chip>
                  </Option>
                ))}
              </Select>
            </Box>

            {/* Time Period Filter */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography level='body-sm' sx={{ mb: 1, fontWeight: 500 }}>
                Time period:
              </Typography>
              <Tabs
                onChange={(e, tabValue) => {
                  setTabValue(tabValue)
                  handleChoresHistoryLimitChange(tabValue)
                }}
                value={tabValue}
                sx={{
                  borderRadius: 8,
                  backgroundColor: 'background.surface',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TabList
                  disableUnderline
                  sx={{
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    p: 0.5,
                    gap: 0.5,
                  }}
                >
                  {[
                    { label: '7 Days', value: 7 },
                    { label: '6 Months', value: 6 * 30 },
                    { label: 'All Time', value: 24 * 30 },
                  ].map((tab, index) => (
                    <Tab
                      key={index}
                      sx={{
                        borderRadius: 6,
                        minWidth: 'auto',
                        px: 2,
                        py: 1,
                        fontSize: 'sm',
                        fontWeight: 500,
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          color: 'primary.plainColor',
                          backgroundColor: 'primary.softBg',
                          fontWeight: 600,
                        },
                        '&:hover': {
                          backgroundColor: 'neutral.softHoverBg',
                        },
                      }}
                      disableIndicator
                      value={tab.value}
                    >
                      {tab.label}
                    </Tab>
                  ))}
                </TabList>
              </Tabs>
            </Box>

            {/* Redeem Points Button */}
            {circleUsers.find(user => user.userId === userProfile.id)?.role ===
              'admin' && (
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant='soft'
                  size='md'
                  startDecorator={<CreditCard />}
                  onClick={() => {
                    setIsRedeemModalOpen(true)
                  }}
                  sx={{ mt: 'auto' }}
                >
                  Redeem Points
                </Button>
              </Box>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Points Status Cards */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        {(() => {
          const selectedUserData = circleUsers.find(
            user => user.userId === selectedUser,
          )
          const totalPoints = selectedUserData?.points || 0
          const redeemedPoints = selectedUserData?.pointsRedeemed || 0
          const availablePoints = totalPoints - redeemedPoints

          const periodStats = leaderboardData.find(
            user => user.userId === selectedUser,
          )
          const periodPoints = selectedHistory.reduce(
            (sum, item) => sum + (item.points || 0),
            0,
          )

          const pointsCards = [
            {
              icon: <Toll />,
              title: 'Available',
              text: `${availablePoints} points`,
              subtext: 'Ready to redeem',
            },
            {
              icon: <Redeem />,
              title: 'Redeemed',
              text: `${redeemedPoints} points`,
              subtext: 'Previously used',
            },
            {
              icon: <AccountBalanceWallet />,
              title: 'Total',
              text: `${totalPoints} points`,
              subtext: 'All time earned',
            },
            {
              icon: <TrendingUp />,
              title: 'Period Points',
              text: `${periodPoints} points`,
              subtext: `${tabValue === 24 * 30 ? 'All time' : tabValue === 6 * 30 ? 'Last 6 months' : `Last ${tabValue} days`}`,
            },
          ]

          return pointsCards.map((card, index) => (
            <Grid item xs={6} sm={6} key={index}>
              <Card
                variant='soft'
                sx={{
                  borderRadius: 'md',
                  boxShadow: 1,
                  px: 2,
                  py: 1,
                  minHeight: 90,
                  height: '100%',
                  justifyContent: 'start',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'start',
                      mb: 0.5,
                    }}
                  >
                    {card.icon}
                    <Typography
                      level='body-md'
                      sx={{
                        ml: 1,
                        fontWeight: '500',
                        color: 'text.primary',
                      }}
                    >
                      {card.title}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      level='body-sm'
                      sx={{ color: 'text.secondary', lineHeight: 1.5 }}
                    >
                      {card.text}
                    </Typography>
                    <Typography
                      level='body-sm'
                      sx={{ color: 'text.secondary', lineHeight: 1.5 }}
                    >
                      {card.subtext}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        })()}
      </Grid>

      {/* Current Filter Summary */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          Showing points for{' '}
          <Typography
            component='span'
            sx={{ fontWeight: 600, color: 'primary.500' }}
          >
            {circleUsers.find(user => user.userId === selectedUser)
              ?.displayName || 'Unknown User'}
          </Typography>{' '}
          over the{' '}
          <Typography
            component='span'
            sx={{ fontWeight: 600, color: 'primary.500' }}
          >
            {tabValue === 24 * 30
              ? 'All Time'
              : tabValue === 6 * 30
                ? 'Last 6 Months'
                : `Last ${tabValue} Days`}
          </Typography>
        </Typography>
      </Box>

      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Chart Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Timeline sx={{ fontSize: '1.5rem', color: 'primary.500' }} />
          <Typography
            level='h4'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            Points Trend
          </Typography>
        </Box>

        {/* Bar Chart for points overtime */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <ResponsiveContainer height={300}>
            <BarChart
              data={selectedHistory}
              margin={{ top: 5, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray={'3 3'} />
              <XAxis dataKey='label' axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Bar
                fill='#4183F2'
                dataKey='points'
                barSize={30}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <RedeemPointsModal
        config={(() => {
          const user = circleUsers.find(u => u.userId === selectedUser)
          const availablePoints = user
            ? (user.points || 0) - (user.pointsRedeemed || 0)
            : 0

          return {
            onClose: () => {
              setIsRedeemModalOpen(false)
            },
            isOpen: isRedeemModalOpen,
            available: availablePoints,
            user: user,
            onSave: ({ userId, points }) => {
              RedeemPoints(userId, points, userProfile.circleID)
                .then(() => {
                  setIsRedeemModalOpen(false)
                  handleCircleMembersRefetch()
                })
                .catch(err => {
                  console.log(err)
                })
            },
          }
        })()}
      />
    </Container>
  )
}

export default UserPoints
