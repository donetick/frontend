import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import {
  AccessTime,
  Add,
  BrowseGallery,
  Delete,
  Edit,
  MoreVert,
  PauseCircle,
  Person,
  PlayArrow,
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  Input,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useLocalization } from '../../contexts/LocalizationContext'
import {
  useChoreTimer,
  usePauseChore,
  useStartChore,
  useUpdateTimeSession,
} from '../../queries/TimeQueries'
import { useCircleMembers } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { resolvePhotoURL } from '../../utils/Helpers'
import { getSafeBottom } from '../../utils/SafeAreaUtils'
import LoadingComponent from '../components/Loading'

const TimerDetails = () => {
  const { t } = useTranslation(['timer', 'common'])
  const { choreId } = useParams()
  const { fmt } = useLocalization()
  const [timerData, setTimerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editingSessions, setEditingSessions] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timerActionLoading, setTimerActionLoading] = useState(false)
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const { showError, showSuccess } = useNotification()

  // Fetch circle members data
  const { data: circleMembersData, isLoading: isCircleMembersLoading } =
    useCircleMembers()

  // Timer hooks
  const { data: choreTimer, refetch: refetchTimer } = useChoreTimer(choreId)
  const startChore = useStartChore()
  const pauseChore = usePauseChore()
  const updateTimeSession = useUpdateTimeSession()

  const members = circleMembersData?.res || []

  // Helper function to find member by user ID
  const getMemberById = userId => {
    return members?.find(member => member.userId === userId)
  }

  // Update timerData when choreTimer data changes
  useEffect(() => {
    if (choreTimer?.res) {
      setTimerData(choreTimer.res)
    }
  }, [choreTimer])

  // Real-time update interval for active timers
  useEffect(() => {
    let interval
    if (timerData && !timerData.endTime) {
      // Update every second if timer is active
      interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerData])

  const formatTime = seconds => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = seconds => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const startEditingSession = () => {
    if (timerData) {
      setEditingSessions(prev => ({
        ...prev,
        [timerData.id]: {
          startTime: moment(timerData.startTime).format('YYYY-MM-DDTHH:mm:ss'),
          endTime: timerData.endTime
            ? moment(timerData.endTime).format('YYYY-MM-DDTHH:mm:ss')
            : '',
          duration: timerData.duration,
          formattedDuration: formatTime(timerData.duration),
          pauseLog: timerData.pauseLog || [],
        },
      }))
    }
  }

  const addPauseLogEntry = sessionId => {
    setEditingSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        pauseLog: [
          ...prev[sessionId].pauseLog,
          {
            start: new Date().toISOString(),
            end: null,
            duration: 0,
            updatedBy: 0, // This should be current user ID
          },
        ],
      },
    }))
  }

  const updatePauseLogEntry = (sessionId, pauseIndex, field, value) => {
    setEditingSessions(prev => {
      const updatedPauseLog = prev[sessionId].pauseLog.map((pause, index) => {
        if (index === pauseIndex) {
          const updatedPause = { ...pause, [field]: value }

          // Auto-calculate duration if both start and end are present
          if (updatedPause.start && updatedPause.end) {
            const startTime = new Date(updatedPause.start)
            const endTime = new Date(updatedPause.end)
            updatedPause.duration = Math.floor((endTime - startTime) / 1000)
          }

          return updatedPause
        }
        return pause
      })

      return {
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          pauseLog: updatedPauseLog,
        },
      }
    })
  }

  const deletePauseLogEntry = (sessionId, pauseIndex) => {
    setEditingSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        pauseLog: prev[sessionId].pauseLog.filter(
          (_, index) => index !== pauseIndex,
        ),
      },
    }))
  }

  const cancelEditingSession = sessionId => {
    setEditingSessions(prev => {
      // eslint-disable-next-line no-unused-vars
      const { [sessionId]: removed, ...rest } = prev
      return rest
    })
  }

  const saveSession = async sessionId => {
    const editingData = editingSessions[sessionId]
    if (!editingData) return

    setLoading(true)
    try {
      // Use the auto-calculated duration from the editing session
      const updateData = {
        startTime: new Date(editingData.startTime).toISOString(),
        endTime: editingData.endTime
          ? new Date(editingData.endTime).toISOString()
          : null,
        duration: editingData.duration,
        pauseLog: editingData.pauseLog,
      }

      updateTimeSession.mutate(
        { choreId, sessionId, sessionData: updateData },
        {
          onSuccess: () => {
            showSuccess({
              title: t('timer:details.updatedTitle'),
              message: t('timer:details.updatedMessage'),
            })
            refetchTimer()
            cancelEditingSession(sessionId)
          },
          onError: () => {
            showError({
              title: t('timer:details.updateFailedTitle'),
              message: t('timer:details.tryAgain'),
            })
          },
        },
      )
    } catch (error) {
      showError({
        title: t('timer:details.errorUpdatingTitle'),
        message: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  // Timer control functions
  const handleStartTimer = () => {
    setTimerActionLoading(true)
    startChore.mutate(choreId, {
      onSuccess: () => {
        showSuccess({
          title: t('timer:details.startTitle'),
          message: t('timer:details.startMessage'),
        })
        refetchTimer()
      },
      onError: () => {
        showError({
          title: t('timer:details.startFailedTitle'),
          message: t('timer:details.tryAgain'),
        })
      },
      onSettled: () => {
        setTimerActionLoading(false)
      },
    })
  }

  const handlePauseTimer = () => {
    setTimerActionLoading(true)
    pauseChore.mutate(choreId, {
      onSuccess: () => {
        showSuccess({
          title: t('timer:details.pauseTitle'),
          message: t('timer:details.pauseMessage'),
        })
        refetchTimer()
      },
      onError: () => {
        showError({
          title: t('timer:details.pauseFailedTitle'),
          message: t('timer:details.tryAgain'),
        })
      },
      onSettled: () => {
        setTimerActionLoading(false)
      },
    })
  }

  // Determine if timer is currently running
  const isTimerRunning = () => {
    if (!timerData || !timerData.pauseLog) return false
    return timerData.pauseLog.some(session => session.start && !session.end)
  }

  // Calculate total duration from start to now/end (real-time)
  const calculateTotalDuration = () => {
    if (!timerData) return 0

    const startTime = new Date(timerData.startTime)
    const endTime = timerData.endTime
      ? new Date(timerData.endTime)
      : currentTime

    return Math.floor((endTime - startTime) / 1000) // in seconds
  }

  // Calculate current active duration (including ongoing session) (real-time)
  const calculateCurrentActiveDuration = () => {
    if (!timerData || !timerData.pauseLog) return 0

    let totalActive = 0
    const now = currentTime

    timerData.pauseLog.forEach(session => {
      if (session.start && session.end) {
        // Completed session
        totalActive += Math.floor(
          (new Date(session.end) - new Date(session.start)) / 1000,
        )
      } else if (session.start && !session.end) {
        // Ongoing session - real-time calculation
        totalActive += Math.floor((now - new Date(session.start)) / 1000)
      }
    })

    return totalActive
  }

  // Calculate idle time (total time minus active time) (real-time)
  const calculateIdleTime = () => {
    const totalDuration = calculateTotalDuration()
    const activeDuration = calculateCurrentActiveDuration()

    return Math.max(0, totalDuration - activeDuration)
  }

  const handleEditSession = () => {
    startEditingSession()
  }

  const handleDeleteSession = sessionIndex => {
    // For now, just show an alert since we'd need to implement session deletion API
    showError({
      title: t('timer:details.deleteSessionTitle'),
      message: t('timer:details.deleteSessionMessage', {
        index: sessionIndex + 1,
      }),
    })
  }

  if (loading || isCircleMembersLoading) {
    return <LoadingComponent />
  }

  return (
    <Container maxWidth='lg' sx={{ py: 2 }}>
      {/* Header */}

      {loading && (
        <Alert color='neutral' sx={{ mb: 2 }}>
          {t('timer:details.loading')}
        </Alert>
      )}

      {!loading && !timerData && (
        <Alert color='warning' sx={{ mb: 2 }}>
          {t('timer:details.notFound')}
        </Alert>
      )}

      {!loading && timerData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Timer Summary */}
          <Card
            variant='plain'
            sx={{
              p: 0,
            }}
          >
            {/* Stats Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Active Time */}
              <Grid item xs={6} sm={6} md={3}>
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
                      <PlayArrow
                        sx={{
                          fontSize: 16,
                          mr: 1,
                        }}
                      />
                      <Typography
                        level='body-md'
                        sx={{
                          fontWeight: '500',
                          color: 'text.primary',
                        }}
                      >
                        {t('timer:details.activeWork')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        level='h4'
                        color='success'
                        sx={{
                          fontWeight: 'bold',
                          lineHeight: 1.5,
                        }}
                      >
                        {formatDuration(calculateCurrentActiveDuration())}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Idle Time */}
              <Grid item xs={6} sm={6} md={3}>
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
                      <PauseCircle
                        sx={{
                          fontSize: 16,
                          mr: 1,
                        }}
                      />
                      <Typography
                        level='body-md'
                        sx={{
                          fontWeight: '500',
                          color: 'text.primary',
                        }}
                      >
                        {t('timer:details.breakTime')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        level='h4'
                        color='warning'
                        sx={{
                          fontWeight: 'bold',
                          lineHeight: 1.5,
                        }}
                      >
                        {formatDuration(calculateIdleTime())}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Total Sessions */}
              <Grid item xs={6} sm={6} md={3}>
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
                      <BrowseGallery
                        sx={{
                          fontSize: 16,
                          mr: 1,
                        }}
                      />
                      <Typography
                        level='body-md'
                        sx={{
                          fontWeight: '500',
                          color: 'text.primary',
                        }}
                      >
                        {t('timer:details.sessions')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        level='h4'
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 'bold',
                          lineHeight: 1.5,
                        }}
                      >
                        {timerData.pauseLog?.length || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Total Session Time */}
              <Grid item xs={6} sm={6} md={3}>
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
                      <AccessTime
                        sx={{
                          fontSize: 16,
                          mr: 1,
                        }}
                      />
                      <Typography
                        level='body-md'
                        sx={{
                          fontWeight: '500',
                          color: 'text.primary',
                        }}
                      >
                        {t('timer:details.totalTime')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        level='h4'
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 'bold',
                          lineHeight: 1.5,
                        }}
                      >
                        {formatTime(calculateTotalDuration())}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Progress Bar */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{ color: 'text.secondary', fontWeight: 'medium' }}
                >
                  {t('timer:details.workVsBreak')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  {calculateCurrentActiveDuration() > 0
                    ? t('timer:details.activePercent', {
                        percent: Math.round(
                          (calculateCurrentActiveDuration() /
                            calculateTotalDuration()) *
                            100,
                        ),
                      })
                    : t('timer:details.noActiveTime')}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 8,
                  backgroundColor: 'neutral.200',
                  borderRadius: 'sm',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${Math.round((calculateCurrentActiveDuration() / Math.max(calculateTotalDuration(), 1)) * 100)}%`,
                    backgroundColor: 'success.400',
                    borderRadius: 'sm',
                    transition: 'width 0.3s ease-in-out',
                  }}
                />
              </Box>

              {/* Timeline Graph */}
              <Box sx={{ mt: 3 }}>
                <Typography
                  level='body-sm'
                  sx={{ color: 'text.secondary', fontWeight: 'medium', mb: 2 }}
                >
                  {t('timer:details.activityTimeline')}
                </Typography>

                {timerData &&
                timerData.pauseLog &&
                timerData.pauseLog.length > 0 ? (
                  <Box>
                    {/* Timeline visualization */}
                    <Box
                      sx={{
                        height: 40,
                        backgroundColor: 'neutral.100',
                        borderRadius: 'sm',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 2,
                      }}
                    >
                      {(() => {
                        const totalDuration = calculateTotalDuration()
                        const startTime = new Date(timerData.startTime)

                        return timerData.pauseLog.map((session, index) => {
                          const sessionStart = new Date(session.start)
                          const sessionEnd = session.end
                            ? new Date(session.end)
                            : currentTime

                          // Calculate position and width as percentages
                          const startOffset = Math.max(
                            0,
                            (sessionStart - startTime) / 1000,
                          )
                          const sessionDuration = Math.max(
                            0,
                            (sessionEnd - sessionStart) / 1000,
                          )

                          const leftPercent =
                            (startOffset / Math.max(totalDuration, 1)) * 100
                          const widthPercent =
                            (sessionDuration / Math.max(totalDuration, 1)) * 100

                          const isOngoing = !session.end

                          return (
                            <Box
                              key={index}
                              sx={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                height: '100%',
                                backgroundColor: isOngoing
                                  ? 'success.500'
                                  : 'success.400',
                                borderRight: isOngoing ? '2px solid' : 'none',
                                borderRightColor: 'success.600',
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  backgroundColor: isOngoing
                                    ? 'success.600'
                                    : 'success.500',
                                  zIndex: 1,
                                },
                              }}
                              title={t('timer:details.sessionTooltip', {
                                index: index + 1,
                                duration: formatDuration(sessionDuration),
                                status: isOngoing
                                  ? t('timer:details.ongoing')
                                  : '',
                              })}
                            />
                          )
                        })
                      })()}
                    </Box>

                    {/* Legend and time markers */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
                      {/* Legend */}
                      <Box
                        sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              backgroundColor: 'success.400',
                              borderRadius: 'xs',
                            }}
                          />
                          <Typography
                            level='body-xs'
                            sx={{ color: 'text.tertiary' }}
                          >
                            {t('timer:details.activeWork')}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              backgroundColor: 'neutral.100',
                              borderRadius: 'xs',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                          <Typography
                            level='body-xs'
                            sx={{ color: 'text.tertiary' }}
                          >
                            {t('timer:details.breakTime')}
                          </Typography>
                        </Box>
                        {isTimerRunning() && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: 'success.500',
                                borderRadius: 'xs',
                                border: '2px solid',
                                borderColor: 'success.600',
                              }}
                            />
                            <Typography
                              level='body-xs'
                              sx={{ color: 'text.tertiary' }}
                            >
                              {t('timer:details.liveSession')}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Time markers */}
                      <Box
                        sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
                      >
                        <Typography
                          level='body-xs'
                          sx={{ color: 'text.tertiary' }}
                        >
                          Started: {fmt.time(timerData.startTime)}
                        </Typography>
                        {timerData.endTime && (
                          <Typography
                            level='body-xs'
                            sx={{ color: 'text.tertiary' }}
                          >
                            Ended: {fmt.time(timerData.endTime)}
                          </Typography>
                        )}
                        {!timerData.endTime && (
                          <Typography
                            level='body-xs'
                            sx={{ color: 'success.500' }}
                          >
                            Now: {fmt.time(currentTime)}
                          </Typography>
                        )}
                        <Typography
                          level='body-xs'
                          sx={{ color: 'text.tertiary' }}
                        >
                          {t('timer:details.activeShort', {
                            percent:
                              calculateCurrentActiveDuration() > 0
                                ? `${Math.round((calculateCurrentActiveDuration() / calculateTotalDuration()) * 100)}%`
                                : '0%',
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Alert color='neutral' variant='soft' sx={{ py: 2 }}>
                    <Typography level='body-sm'>
                      {t('timer:details.noTimeline')}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Box>
          </Card>

          {/* Session Breakdown */}
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography level='h4'>
                {t('timer:details.sessionBreakdown')}
              </Typography>
              {!editingSessions[timerData.id] && (
                <Button
                  variant='outlined'
                  color='primary'
                  startDecorator={<Edit />}
                  onClick={() => startEditingSession()}
                  size='sm'
                >
                  {t('common:actions.edit')}
                </Button>
              )}
              {editingSessions[timerData.id] && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='outlined'
                    onClick={() => cancelEditingSession(timerData.id)}
                    size='sm'
                  >
                    {t('common:actions.cancel')}
                  </Button>
                  <Button
                    variant='solid'
                    color='primary'
                    onClick={() => saveSession(timerData.id)}
                    loading={loading}
                    size='sm'
                  >
                    {t('timer:details.saveChanges')}
                  </Button>
                </Box>
              )}
            </Box>

            {!editingSessions[timerData.id] ? (
              <Box>
                {/* Read-only view */}
                {timerData.pauseLog && timerData.pauseLog.length > 0 && (
                  <Box>
                    <Typography
                      level='body-md'
                      sx={{ fontWeight: 'bold', mb: 2 }}
                    >
                      {t('timer:details.workSessions', {
                        count: timerData.pauseLog.length,
                      })}
                    </Typography>

                    <SwipeableList type={ListType.IOS} fullSwipe={false}>
                      {timerData.pauseLog
                        .sort((a, b) => moment(b.start) - moment(a.start))
                        .map((pause, pauseIndex) => {
                          const isOngoing = !pause.end
                          const sessionDate = moment(pause.start).format(
                            'MMM DD',
                          )
                          const startTime = fmt.time(pause.start)
                          const endTime = pause.end
                            ? fmt.time(pause.end)
                            : null

                          const realTimeDuration = isOngoing
                            ? Math.max(
                                0,
                                Math.floor(
                                  (currentTime - new Date(pause.start)) / 1000,
                                ),
                              )
                            : pause.duration

                          return (
                            <SwipeableListItem
                              key={pauseIndex}
                              swipeActionOpen={
                                showMoreInfoId === pauseIndex
                                  ? 'trailing'
                                  : null
                              }
                              trailingActions={
                                <TrailingActions>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      boxShadow:
                                        'inset 2px 0 4px rgba(0,0,0,0.06)',
                                      zIndex: 0,
                                    }}
                                  >
                                    <SwipeAction
                                      onClick={() => handleEditSession()}
                                    >
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: 'neutral.softBg',
                                          color: 'neutral.700',
                                          px: 3,
                                          height: '100%',
                                        }}
                                      >
                                        <EditIcon sx={{ fontSize: 20 }} />
                                        <Typography
                                          level='body-xs'
                                          sx={{ mt: 0.5 }}
                                        >
                                          {t('common:actions.edit')}
                                        </Typography>
                                      </Box>
                                    </SwipeAction>
                                    <SwipeAction
                                      onClick={() =>
                                        handleDeleteSession(pauseIndex)
                                      }
                                    >
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: 'danger.softBg',
                                          color: 'danger.700',
                                          px: 3,
                                          height: '100%',
                                        }}
                                      >
                                        <DeleteIcon sx={{ fontSize: 20 }} />
                                        <Typography
                                          level='body-xs'
                                          sx={{ mt: 0.5 }}
                                        >
                                          {t('common:actions.delete')}
                                        </Typography>
                                      </Box>
                                    </SwipeAction>
                                  </Box>
                                </TrailingActions>
                              }
                            >
                              {/* Session Card Content */}
                              <Card
                                variant='soft'
                                sx={{
                                  p: 2,
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 2,
                                  minHeight: 'auto',
                                  borderColor: isOngoing
                                    ? 'success.300'
                                    : 'divider',
                                  borderRadius: 0,
                                  borderBottom: '1px solid',
                                  minWidth: '100%',
                                }}
                              >
                                {/* Session indicator */}
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: isOngoing
                                      ? 'success.500'
                                      : 'neutral.400',
                                    flexShrink: 0,
                                  }}
                                />

                                {/* Duration - Main focus */}
                                <Box sx={{ flexShrink: 0 }}>
                                  <Typography
                                    level='h4'
                                    sx={{
                                      fontWeight: 'bold',
                                      color: isOngoing
                                        ? 'success.600'
                                        : 'text.primary',
                                      lineHeight: 1,
                                      mb: 0.3,
                                    }}
                                  >
                                    {formatDuration(realTimeDuration)}
                                  </Typography>
                                  <Box
                                    sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}
                                  >
                                    {isOngoing && (
                                      <Chip
                                        size='sm'
                                        color='success'
                                        variant='soft'
                                        sx={{ fontSize: '0.7rem' }}
                                      >
                                        {t('timer:details.live')}
                                      </Chip>
                                    )}
                                    {/* User chip showing who started the session */}
                                    {pause.updatedBy &&
                                      pause.updatedBy !== 0 &&
                                      (() => {
                                        const sessionUser = getMemberById(
                                          pause.updatedBy,
                                        )
                                        return sessionUser ? (
                                          <Chip
                                            size='sm'
                                            variant='outlined'
                                            color='neutral'
                                            startDecorator={
                                              <Avatar
                                                size='sm'
                                                src={resolvePhotoURL(
                                                  sessionUser?.image,
                                                )}
                                                sx={{ width: 16, height: 16 }}
                                              >
                                                {sessionUser?.displayName?.charAt(
                                                  0,
                                                ) ||
                                                  sessionUser?.name?.charAt(
                                                    0,
                                                  ) || <Person />}
                                              </Avatar>
                                            }
                                            sx={{ fontSize: '0.7rem' }}
                                          >
                                            {sessionUser?.displayName ||
                                              sessionUser?.name ||
                                              t('timer:details.unknownUser')}
                                          </Chip>
                                        ) : null
                                      })()}
                                  </Box>
                                </Box>

                                {/* Session details */}
                                <Box
                                  sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    textAlign: 'right',
                                  }}
                                >
                                  <Typography
                                    level='body-sm'
                                    sx={{
                                      fontWeight: 'medium',
                                      color: 'text.secondary',
                                      mb: 0.2,
                                    }}
                                  >
                                    {t('timer:details.sessionLabel', {
                                      index: pauseIndex + 1,
                                      date: sessionDate,
                                    })}
                                  </Typography>
                                  <Typography
                                    level='body-xs'
                                    sx={{
                                      color: 'text.tertiary',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {startTime}{' '}
                                    {endTime
                                      ? `→ ${endTime}`
                                      : t('timer:details.ongoingArrow')}
                                  </Typography>
                                </Box>

                                <IconButton
                                  color='neutral'
                                  variant='plain'
                                  size='sm'
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (showMoreInfoId === pauseIndex) {
                                      setShowMoreInfoId(null)
                                    } else {
                                      setShowMoreInfoId(pauseIndex)
                                    }
                                  }}
                                >
                                  <MoreVert sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Card>
                            </SwipeableListItem>
                          )
                        })}
                    </SwipeableList>
                  </Box>
                )}

                {(!timerData.pauseLog || timerData.pauseLog.length === 0) && (
                  <Alert color='neutral'>
                    {t('timer:details.noSessions')}
                  </Alert>
                )}
              </Box>
            ) : (
              <Box>
                {/* Editing view */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {/* Session Editor */}
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography level='body-md' sx={{ fontWeight: 'bold' }}>
                        {t('timer:details.editSessions')}
                      </Typography>
                      <Button
                        size='sm'
                        variant='outlined'
                        startDecorator={<Add />}
                        onClick={() => addPauseLogEntry(timerData.id)}
                      >
                        {t('timer:details.addSession')}
                      </Button>
                    </Box>

                    {editingSessions[timerData.id].pauseLog.map(
                      (pause, pauseIndex) => (
                        <Card
                          key={pauseIndex}
                          variant='soft'
                          sx={{ mb: 2, p: 2 }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 2,
                            }}
                          >
                            <Typography
                              level='body-md'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('timer:details.sessionLabel', {
                                index: pauseIndex + 1,
                                date: '',
                              }).replace(' • ', '')}
                            </Typography>
                            <Button
                              size='sm'
                              variant='outlined'
                              color='danger'
                              onClick={() =>
                                deletePauseLogEntry(timerData.id, pauseIndex)
                              }
                            >
                              <Delete />
                            </Button>
                          </Box>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(auto-fit, minmax(250px, 1fr))',
                              gap: 2,
                            }}
                          >
                            <FormControl size='sm'>
                              <Typography
                                level='body-sm'
                                sx={{ fontWeight: 'bold', mb: 1 }}
                              >
                                {t('timer:details.startTime')}
                              </Typography>
                              <Input
                                type='datetime-local'
                                value={moment(pause.start).format(
                                  'YYYY-MM-DDTHH:mm:ss',
                                )}
                                onChange={e =>
                                  updatePauseLogEntry(
                                    timerData.id,
                                    pauseIndex,
                                    'start',
                                    new Date(e.target.value).toISOString(),
                                  )
                                }
                              />
                            </FormControl>

                            <FormControl size='sm'>
                              <Typography
                                level='body-sm'
                                sx={{ fontWeight: 'bold', mb: 1 }}
                              >
                                {t('timer:details.endTime')}
                              </Typography>
                              <Input
                                type='datetime-local'
                                value={
                                  pause.end
                                    ? moment(pause.end).format(
                                        'YYYY-MM-DDTHH:mm:ss',
                                      )
                                    : ''
                                }
                                onChange={e =>
                                  updatePauseLogEntry(
                                    timerData.id,
                                    pauseIndex,
                                    'end',
                                    e.target.value
                                      ? new Date(e.target.value).toISOString()
                                      : null,
                                  )
                                }
                              />
                              <FormHelperText>
                                {t('timer:details.leaveEmptyOngoing')}
                              </FormHelperText>
                            </FormControl>

                            <Box>
                              <Typography
                                level='body-sm'
                                sx={{ fontWeight: 'bold', mb: 1 }}
                              >
                                {t('timer:details.durationAuto')}
                              </Typography>
                              <Typography
                                level='body-sm'
                                sx={{
                                  p: 1.5,
                                  bgcolor: 'background.surface',
                                  borderRadius: 'sm',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                {formatDuration(pause.duration)} (
                                {pause.duration}s)
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      ),
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Floating Timer Control Button */}
      {!loading && timerData && (
        <IconButton
          color={isTimerRunning() ? 'warning' : 'success'}
          variant='solid'
          onClick={isTimerRunning() ? handlePauseTimer : handleStartTimer}
          loading={timerActionLoading}
          disabled={loading}
          sx={{
            position: 'fixed',
            bottom: getSafeBottom(16, 16),
            left: 16,
            width: 56,
            height: 56,
            borderRadius: '50%',
            zIndex: 1000,
            boxShadow: 'lg',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: timerActionLoading ? 'scale(0.95)' : 'scale(1)',
            animation: isTimerRunning()
              ? 'pulse-warning 2s infinite'
              : 'pulse-success 2s infinite',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: 'xl',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
            '@keyframes pulse-success': {
              '0%': {
                boxShadow:
                  '0 4px 12px rgba(76, 175, 80, 0.3), 0 0 0 0 rgba(76, 175, 80, 0.7)',
              },
              '70%': {
                boxShadow:
                  '0 4px 12px rgba(76, 175, 80, 0.3), 0 0 0 10px rgba(76, 175, 80, 0)',
              },
              '100%': {
                boxShadow:
                  '0 4px 12px rgba(76, 175, 80, 0.3), 0 0 0 0 rgba(76, 175, 80, 0)',
              },
            },
            '@keyframes pulse-warning': {
              '0%': {
                boxShadow:
                  '0 4px 12px rgba(255, 152, 0, 0.3), 0 0 0 0 rgba(255, 152, 0, 0.7)',
              },
              '70%': {
                boxShadow:
                  '0 4px 12px rgba(255, 152, 0, 0.3), 0 0 0 10px rgba(255, 152, 0, 0)',
              },
              '100%': {
                boxShadow:
                  '0 4px 12px rgba(255, 152, 0, 0.3), 0 0 0 0 rgba(255, 152, 0, 0)',
              },
            },
          }}
          title={
            isTimerRunning()
              ? t('timer:details.pauseButton')
              : t('timer:details.startButton')
          }
        >
          {isTimerRunning() ? (
            <PauseCircle sx={{ fontSize: 24 }} />
          ) : (
            <PlayArrow sx={{ fontSize: 24 }} />
          )}
        </IconButton>
      )}
    </Container>
  )
}

export default TimerDetails
