import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { CreditCard, Toll } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Option,
  Select,
  Tab,
  TabList,
  Tabs,
  Typography,
} from '@mui/joy'
import { useContext, useEffect, useState } from 'react'
import { UserContext } from '../../contexts/UserContext.js'
import LoadingComponent from '../components/Loading.jsx'

import { useChoresHistory } from '../../queries/ChoreQueries.jsx'
import { useCircleMembers } from '../../queries/UserQueries.jsx'
import { RedeemPoints } from '../../utils/Fetcher.jsx'
import RedeemPointsModal from '../Modals/RedeemPointsModal'
const UserPoints = () => {
  const [tabValue, setTabValue] = useState(7)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)

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

  const { userProfile } = useContext(UserContext)
  const [selectedUser, setSelectedUser] = useState(userProfile?.id)
  const [circleUsers, setCircleUsers] = useState([])
  const [selectedHistory, setSelectedHistory] = useState([])
  const [userPointsBarChartData, setUserPointsBarChartData] = useState([])

  const [choresHistory, setChoresHistory] = useState([])

  useEffect(() => {
    if (circleMembersData && choresHistoryData && userProfile) {
      setCircleUsers(circleMembersData.res)
      setSelectedHistory(generateWeeklySummary(choresHistory, userProfile?.id))
    }
  }, [circleMembersData, choresHistoryData])

  useEffect(() => {
    if (choresHistoryData) {
      var history
      if (tabValue === 7) {
        history = generateWeeklySummary(choresHistoryData.res, selectedUser)
      } else if (tabValue === 30) {
        history = generateMonthSummary(choresHistoryData.res, selectedUser)
      } else if (tabValue === 6 * 30) {
        history = generateMonthlySummary(choresHistoryData.res, selectedUser)
      } else {
        history = generateYearlySummary(choresHistoryData.res, selectedUser)
      }
      setSelectedHistory(history)
    }
  }, [selectedUser, choresHistoryData])

  useEffect(() => {
    setSelectedUser(userProfile?.id)
  }, [userProfile])

  const generateUserPointsHistory = history => {
    const userPoints = {}
    for (let i = 0; i < history.length; i++) {
      const chore = history[i]
      if (!userPoints[chore.completedBy]) {
        userPoints[chore.completedBy] = chore.points ? chore.points : 0
      } else {
        userPoints[chore.completedBy] += chore.points ? chore.points : 0
      }
    }
    return userPoints
  }

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
      const dayName = new Date(chore.completedAt).toLocaleString('en-US', {
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
      const dayName = new Date(chore.completedAt).toLocaleString('en-US', {
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
      const monthName = new Date(chore.completedAt).toLocaleString('en-US', {
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
      const yearName = new Date(chore.completedAt).toLocaleString('en-US', {
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

  return (
    <Container
      maxWidth='md'
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Typography level='h4'>Points Overview</Typography>
        <Box
          sx={{
            gap: 1,
            my: 2,
            display: 'flex',
            justifyContent: 'start',
          }}
        >
          <Select
            sx={{
              width: 200,
            }}
            variant='soft'
            label='User'
            value={selectedUser}
            onChange={(e, selected) => {
              setSelectedUser(selected)
              setSelectedHistory(generateWeeklySummary(choresHistory, selected))
            }}
            renderValue={selected => (
              <Typography
                startDecorator={
                  <Avatar color='primary' m={0} size='sm'>
                    {
                      circleUsers.find(user => user.userId === selectedUser)
                        ?.displayName[0]
                    }
                  </Avatar>
                }
              >
                {
                  circleUsers.find(user => user.userId === selectedUser)
                    ?.displayName
                }
              </Typography>
            )}
          >
            {circleUsers.map(user => (
              <Option key={user.userId} value={user.userId}>
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
          {circleUsers.find(user => user.userId === userProfile.id)?.role ===
            'admin' && (
            <Button
              variant='soft'
              size='md'
              startDecorator={<CreditCard />}
              onClick={() => {
                setIsRedeemModalOpen(true)
              }}
            >
              Redeem Points
            </Button>
          )}
        </Box>

        <Box
          sx={{
            // resposive width based on parent available space:
            width: '100%',
            display: 'flex',
            justifyContent: 'space-evenly',
            gap: 1,
          }}
        >
          {[
            {
              title: 'Total',
              value: circleMembersData.res.find(
                user => user.userId === selectedUser,
              )?.points,
              color: 'primary',
            },
            {
              title: 'Available',
              value: (function () {
                const user = circleMembersData.res.find(
                  user => user.userId === selectedUser,
                )
                if (!user) return 0
                return user.points - user.pointsRedeemed
              })(),

              color: 'success',
            },
            {
              title: 'Redeemed',
              value: circleMembersData.res.find(
                user => user.userId === selectedUser,
              )?.pointsRedeemed,
              color: 'warning',
            },
          ].map(card => (
            <Card
              key={card.title}
              sx={{
                p: 2,
                mb: 1,
                minWidth: 80,
                width: '100%',
              }}
              variant='soft'
            >
              <Typography level='body-xs' textAlign='center' mb={-1}>
                {card.title}
              </Typography>
              <Typography level='title-md' textAlign='center'>
                {card.value}
              </Typography>
            </Card>
          ))}
        </Box>
        <Typography level='h4'>Points History</Typography>

        <Box
          sx={{
            // center vertically:
            display: 'flex',
            justifyContent: 'left',
            gap: 1,
          }}
        >
          <Tabs
            onChange={(e, tabValue) => {
              setTabValue(tabValue)
              handleChoresHistoryLimitChange(tabValue)
            }}
            defaultValue={tabValue}
            sx={{
              py: 0.5,
              borderRadius: 16,
              maxWidth: 400,
              mb: 1,
            }}
          >
            <TabList
              disableUnderline
              sx={{
                borderRadius: 16,
                backgroundColor: 'background.paper',
                boxShadow: 1,
                justifyContent: 'space-evenly',
              }}
            >
              {[
                { label: '7 Days', value: 7 },
                // { label: '3 Month', value: 30 },
                { label: '6 Months', value: 6 * 30 },
                { label: 'All Time', value: 90 },
              ].map((tab, index) => (
                <Tab
                  key={index}
                  sx={{
                    borderRadius: 16,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: 'text.primary',
                      backgroundColor: 'primary.light',
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

        <Box
          sx={{
            // resposive width based on parent available space:
            width: '100%',
            display: 'flex',
            justifyContent: 'left',
            gap: 1,
          }}
        >
          {[
            {
              title: 'Points',
              value: selectedHistory.reduce((acc, cur) => acc + cur.points, 0),
              color: 'success',
            },
            {
              title: 'Tasks',
              value: selectedHistory.reduce((acc, cur) => acc + cur.tasks, 0),
              color: 'primary',
            },
          ].map(card => (
            <Card
              key={card.title}
              sx={{
                p: 2,
                mb: 1,
                width: 250,
              }}
              variant='soft'
            >
              <Typography level='body-xs' textAlign='center' mb={-1}>
                {card.title}
              </Typography>
              <Typography level='title-md' textAlign='center'>
                {card.value}
              </Typography>
            </Card>
          ))}
        </Box>
        {/* Bar Chart for points overtime : */}
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
              >
                {/* Rounded top corners, blue fill, set bar width */}
                {/* Add a slightly darker top section to the 'Jul' bar */}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
      <RedeemPointsModal
        config={{
          onClose: () => {
            setIsRedeemModalOpen(false)
          },
          isOpen: isRedeemModalOpen,
          available: circleUsers.find(user => user.userId === selectedUser)
            ?.points,
          user: circleUsers.find(user => user.userId === selectedUser),
          onSave: ({ userId, points }) => {
            RedeemPoints(userId, points, userProfile.circleID)
              .then(res => {
                setIsRedeemModalOpen(false)
                handleCircleMembersRefetch()
              })
              .catch(err => {
                console.log(err)
              })
          },
        }}
      />
    </Container>
  )
}

export default UserPoints
