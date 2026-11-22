import '@meauxt/react-swipeable-list/dist/styles.css'

import { SwipeableList, Type as ListType } from '@meauxt/react-swipeable-list'
import {
  Delete,
  Edit,
  MoreVert,
  Pause,
  Person,
  PlayArrow,
  Timer as TimerIcon,
} from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import ModalActions from '../../components/common/ModalActions'
import SwipeActionButton from '../../components/common/SwipeActionButton'
import { TrailingSwipeActions as TrailingActions } from '../../components/common/SwipeActionTray'
import SwipeListItem, {
  SWIPE_COMMIT_THRESHOLD,
} from '../../components/common/SwipeListItem'
import { viewportMedia } from '../../constants/responsive'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useChorePermissions } from '../../hooks/useChorePermissions'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useChore } from '../../queries/ChoreQueries'
import {
  useChoreTimer,
  usePauseChore,
  useStartChore,
  useUpdateTimeSession,
} from '../../queries/TimeQueries'
import { useCircleMembers } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { notInCompletionWindow } from '../../utils/Chores'
import { commandQueue, CommandType } from '../../utils/CommandQueue'
import { hapticMedium } from '../../utils/Haptics'
import { resolvePhotoURL } from '../../utils/Helpers'
import { isOfflineFeatureEnabled } from '../../utils/OfflineFeatureToggle'
import { getSafeBottomPadding } from '../../utils/SafeAreaUtils'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'

// Effectively "can this action be queued offline?" — requires the offline
// feature, otherwise there is no command queue to replay it later.
const isNetworkError = err =>
  isOfflineFeatureEnabled() &&
  err instanceof TypeError &&
  err.message === 'Failed to fetch'

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const heroBackground =
  'linear-gradient(145deg, var(--joy-palette-background-surface) 30%, var(--joy-palette-primary-softBg) 140%)'

const formatClock = seconds => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs].map(part => part.toString().padStart(2, '0'))
}

const formatTime = seconds => formatClock(seconds).join(':')

const formatDuration = seconds => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// A breathing dot is the cheapest way to say "this number is still moving"
// without animating the digits themselves.
const LiveDot = ({ color = 'primary' }) => (
  <Box
    sx={{
      bgcolor: `${color}.solidBg`,
      borderRadius: '50%',
      flex: '0 0 auto',
      height: 8,
      width: 8,
      animation: 'timerPulse 1.8s ease-in-out infinite',
      '@keyframes timerPulse': {
        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
        '50%': { opacity: 0.3, transform: 'scale(0.65)' },
      },
    }}
  />
)

LiveDot.propTypes = {
  color: PropTypes.string,
}

const StatCell = ({ label, value, valueColor }) => (
  <Box sx={{ flex: 1, minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
    <Typography
      level='body-xs'
      textColor='text.tertiary'
      sx={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </Typography>
    <Typography
      level='title-md'
      textColor={valueColor}
      sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.25 }}
    >
      {value}
    </Typography>
  </Box>
)

StatCell.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  valueColor: PropTypes.string,
}

const LegendKey = ({ label, sx }) => (
  <Box sx={{ alignItems: 'center', display: 'flex', gap: 0.625 }}>
    <Box sx={{ borderRadius: 'xs', height: 8, width: 8, ...sx }} />
    <Typography level='body-xs' textColor='text.tertiary'>
      {label}
    </Typography>
  </Box>
)

LegendKey.propTypes = {
  label: PropTypes.string.isRequired,
  sx: PropTypes.object,
}

const TimerDetails = () => {
  const { t } = useTranslation(['timer', 'chores', 'common'])
  const { choreId } = useParams()
  const { data: choreData } = useChore(choreId)
  const permissions = useChorePermissions(choreData?.res)
  const { fmt } = useLocalization()
  const [timerData, setTimerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editingSessions, setEditingSessions] = useState({})
  const [editingPauseIndex, setEditingPauseIndex] = useState(null)
  const { ResponsiveModal } = useResponsiveModal()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timerActionLoading, setTimerActionLoading] = useState(false)
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [confirmConfig, setConfirmConfig] = useState({})
  const { showError, showSuccess } = useNotification()

  // Fetch circle members data
  const { data: circleMembersData, isLoading: isCircleMembersLoading } =
    useCircleMembers()

  // Timer hooks
  const {
    data: choreTimer,
    isLoading: isTimerLoading,
    refetch: refetchTimer,
  } = useChoreTimer(choreId)
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
    if (choreTimer) {
      // A resumed interval may start after the last one-second clock tick.
      // Publish a fresh clock with the new data, not one tick later.
      setCurrentTime(new Date())
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

  const startEditingSession = pause => {
    if (timerData && permissions.editTime) {
      setShowMoreInfoId(null)
      setEditingPauseIndex(timerData.pauseLog.indexOf(pause))
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

  const updatePauseLogEntry = (sessionId, pauseIndex, field, value) => {
    setEditingSessions(prev => {
      const updatedPauseLog = prev[sessionId].pauseLog.map((pause, index) => {
        if (index === pauseIndex) {
          const updatedPause = { ...pause, [field]: value }

          // Auto-calculate duration if both start and end are present
          if (updatedPause.start && updatedPause.end) {
            const startTime = new Date(updatedPause.start)
            const endTime = new Date(updatedPause.end)
            updatedPause.duration = Math.max(
              0,
              Math.floor((endTime - startTime) / 1000),
            )
          } else {
            updatedPause.duration = 0
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

  const cancelEditingSession = sessionId => {
    setEditingSessions(prev => {
      const { [sessionId]: removed, ...rest } = prev
      return rest
    })
  }

  const saveSession = async sessionId => {
    const editingData = editingSessions[sessionId]
    if (!editingData) return

    const editedPause = editingData.pauseLog[editingPauseIndex]
    if (
      !editedPause?.start ||
      (editedPause.end &&
        new Date(editedPause.end) < new Date(editedPause.start))
    ) {
      showError({
        title: t('toast.sessionUpdateFailTitle'),
        message: t('toast.tryAgain'),
      })
      return
    }

    setLoading(true)
    try {
      // Merge only the selected interval into the latest timer data.
      const pauseLog = timerData.pauseLog.map((entry, index) =>
        index === editingPauseIndex ? editedPause : entry,
      )
      const updateData = {
        startTime: new Date(editingData.startTime).toISOString(),
        endTime: editingData.endTime
          ? new Date(editingData.endTime).toISOString()
          : null,
        duration: pauseLog.reduce(
          (total, entry) => total + (entry.duration || 0),
          0,
        ),
        pauseLog,
      }

      await updateTimeSession.mutateAsync(
        { choreId, sessionId, sessionData: updateData },
        {
          onSuccess: () => {
            showSuccess({
              title: t('toast.sessionUpdatedTitle'),
              message: t('toast.sessionUpdatedMessage'),
            })
            refetchTimer()
            cancelEditingSession(sessionId)
          },
          onError: () => {
            showError({
              title: t('toast.sessionUpdateFailTitle'),
              message: t('toast.tryAgain'),
            })
          },
        },
      )
    } catch (error) {
      showError({
        title: t('toast.sessionUpdateErrorTitle'),
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
          title: t('toast.startedTitle'),
          message: t('toast.startedMessage'),
        })
        refetchTimer()
      },
      onError: async error => {
        if (isNetworkError(error)) {
          const cmdId = await commandQueue.enqueue(
            CommandType.START_CHORE,
            choreId,
            { id: choreId },
          )
          showSuccess({
            title: t('toast.startQueuedTitle'),
            message: "You're offline — start will sync when back online",
            undoAction: async () => {
              await commandQueue.cancel(cmdId)
            },
          })
          return
        }

        showError({
          title: t('toast.startFailTitle'),
          message: t('toast.tryAgain'),
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
          title: t('toast.pausedTitle'),
          message: t('toast.pausedMessage'),
        })
        refetchTimer()
      },
      onError: async error => {
        if (isNetworkError(error)) {
          const cmdId = await commandQueue.enqueue(
            CommandType.PAUSE_CHORE,
            choreId,
            { id: choreId },
          )
          showSuccess({
            title: t('toast.pauseQueuedTitle'),
            message: "You're offline — pause will sync when back online",
            undoAction: async () => {
              await commandQueue.cancel(cmdId)
            },
          })
          return
        }

        showError({
          title: t('toast.pauseFailTitle'),
          message: t('toast.tryAgain'),
        })
      },
      onSettled: () => {
        setTimerActionLoading(false)
      },
    })
  }

  // Determine if timer is currently running
  const isTimerRunning = () => {
    if (!timerData || timerData.endTime || !timerData.pauseLog) return false
    return timerData.pauseLog.some(session => session.start && !session.end)
  }

  // Calculate total duration from start to now/end (real-time)
  const calculateTotalDuration = () => {
    if (!timerData) return 0

    const startTime = new Date(timerData.startTime)
    const endTime = timerData.endTime
      ? new Date(timerData.endTime)
      : currentTime

    return Math.max(0, Math.floor((endTime - startTime) / 1000))
  }

  // Calculate current active duration (including ongoing session) (real-time)
  const calculateCurrentActiveDuration = () => {
    if (!timerData || !timerData.pauseLog) return 0

    let totalActive = 0
    const now = timerData.endTime ? new Date(timerData.endTime) : currentTime

    timerData.pauseLog.forEach(session => {
      if (session.start && session.end) {
        // Completed session
        totalActive += Math.floor(
          (new Date(session.end) - new Date(session.start)) / 1000,
        )
      } else if (session.start && !session.end) {
        // Ongoing session - real-time calculation
        // Clamp each interval so a stale clock or clock skew cannot subtract
        // seconds from work already completed before resuming.
        totalActive += Math.max(
          0,
          Math.floor((now - new Date(session.start)) / 1000),
        )
      }
    })

    return Math.max(0, totalActive)
  }

  // Calculate idle time (total time minus active time) (real-time)
  const calculateIdleTime = () => {
    const totalDuration = calculateTotalDuration()
    const activeDuration = calculateCurrentActiveDuration()

    return Math.max(0, totalDuration - activeDuration)
  }

  const handleEditSession = pause => {
    startEditingSession(pause)
  }

  // A row is one work interval inside the timer session, so removing it is an
  // update of the remaining pause log — not a delete of the session record.
  // Identity, never index: the list is sorted newest-first.
  const removePauseEntry = async pause => {
    const remaining = (timerData.pauseLog || []).filter(
      entry => entry !== pause,
    )
    setLoading(true)
    try {
      await updateTimeSession.mutateAsync({
        choreId,
        sessionId: timerData.id,
        sessionData: {
          startTime: timerData.startTime,
          endTime: timerData.endTime || null,
          // The stored duration is total active seconds, so it has to lose the
          // deleted interval with it.
          duration: remaining.reduce(
            (total, entry) => total + (entry.duration || 0),
            0,
          ),
          pauseLog: remaining,
        },
      })
      showSuccess({
        title: t('toast.sessionDeletedTitle'),
        message: t('toast.sessionDeletedMessage'),
      })
      refetchTimer()
    } catch (error) {
      showError({
        title: t('toast.sessionDeleteErrorTitle'),
        message: error?.message || t('toast.tryAgain'),
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmDeletePauseEntry = pause => {
    setShowMoreInfoId(null)
    setConfirmConfig({
      isOpen: true,
      title: t('toast.deleteConfirmTitle'),
      message: t('toast.deleteConfirmMessage'),
      confirmText: t('common:delete'),
      cancelText: t('common:cancel'),
      color: 'danger',
      onClose: isConfirmed => {
        setConfirmConfig({})
        if (isConfirmed) removePauseEntry(pause)
      },
    })
  }

  if (isTimerLoading || isCircleMembersLoading) {
    return <LoadingComponent />
  }

  const timerRestriction =
    choreData?.res?.isActive === false
      ? 'chores:permissions.archived'
      : !permissions.complete
        ? 'chores:permissions.complete'
        : !isTimerRunning() &&
            choreData?.res &&
            notInCompletionWindow(choreData.res)
          ? 'chores:permissions.window'
          : null

  const running = isTimerRunning()
  const finished = Boolean(timerData?.endTime)
  const activeSeconds = calculateCurrentActiveDuration()
  const totalSeconds = calculateTotalDuration()
  const idleSeconds = calculateIdleTime()
  const activePercent = activeSeconds
    ? Math.round((activeSeconds / Math.max(totalSeconds, 1)) * 100)
    : 0
  const [clockHours, clockMinutes, clockSeconds] = formatClock(activeSeconds)
  const sessions = timerData?.pauseLog || []
  const isEditing = Boolean(timerData && editingSessions[timerData.id])

  return (
    <Container
      maxWidth='md'
      sx={{
        pb: getSafeBottomPadding(4),
        pt: 1.5,
        px: { xs: 2, sm: 3 },
        // The mobile bottom bar owns the bottom edge here.
        [viewportMedia.mobile]: { pb: getSafeBottomPadding(11) },
      }}
    >
      {loading && (
        <Alert color='neutral' sx={{ mb: 2 }}>
          {t('loading')}
        </Alert>
      )}

      {!loading && !timerData && (
        <Alert color='warning' sx={{ mb: 2 }}>
          {t('noData')}
        </Alert>
      )}

      {timerData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Hero: the running clock, the one control that matters, and the
              shape of the session — stacked so a glance answers "how long have
              I worked, and is it still counting?" */}
          <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
            <Box
              sx={{
                background: heroBackground,
                p: { xs: 2.25, sm: 3 },
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  bgcolor: 'primary.softBg',
                  borderRadius: '50%',
                  filter: 'blur(2px)',
                  height: 180,
                  opacity: 0.5,
                  position: 'absolute',
                  right: -80,
                  top: -90,
                  width: 180,
                }}
              />
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: 'space-between',
                  }}
                >
                  <Chip
                    size='sm'
                    variant='soft'
                    color={
                      running ? 'primary' : finished ? 'success' : 'warning'
                    }
                    startDecorator={running ? <LiveDot /> : undefined}
                  >
                    {finished
                      ? t('common:done')
                      : running
                        ? t('liveSession')
                        : t('breakTime')}
                  </Chip>
                  <Typography level='body-xs' textColor='text.tertiary'>
                    {finished
                      ? t('timeline.ended', {
                          time: fmt.time(timerData.endTime),
                        })
                      : t('timeline.started', {
                          time: fmt.time(timerData.startTime),
                        })}
                  </Typography>
                </Box>

                {/* Seconds step back visually so the digits that actually
                    matter stay readable while they tick. */}
                <Box
                  sx={{
                    alignItems: 'baseline',
                    display: 'flex',
                    gap: 0.5,
                    mt: 1.5,
                  }}
                >
                  <Typography
                    component='span'
                    sx={{
                      fontSize: 'clamp(2.75rem, 13vw, 4rem)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 650,
                      letterSpacing: '-0.05em',
                      lineHeight: 1,
                    }}
                  >
                    {clockHours}:{clockMinutes}
                  </Typography>
                  <Typography
                    component='span'
                    textColor='text.tertiary'
                    sx={{
                      fontSize: 'clamp(1.25rem, 6vw, 1.75rem)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    :{clockSeconds}
                  </Typography>
                </Box>
                <Typography
                  level='body-sm'
                  textColor='text.secondary'
                  sx={{ mt: 0.75 }}
                >
                  {t('activeWork')}
                </Typography>

                {!finished && (
                  <Button
                    size='lg'
                    color={running ? 'warning' : 'primary'}
                    startDecorator={running ? <Pause /> : <PlayArrow />}
                    onClick={running ? handlePauseTimer : handleStartTimer}
                    loading={timerActionLoading}
                    disabled={
                      loading || timerActionLoading || Boolean(timerRestriction)
                    }
                    sx={{
                      alignSelf: 'flex-start',
                      borderRadius: 'lg',
                      mt: 2.25,
                      minWidth: 170,
                      width: { xs: '100%', sm: 'auto' },
                    }}
                  >
                    {running ? t('pause') : t('resume')}
                  </Button>
                )}
                {timerRestriction && (
                  <Typography
                    level='body-xs'
                    textColor='text.secondary'
                    sx={{ mt: 1 }}
                  >
                    {t(timerRestriction)}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            {/* One bar instead of the old progress bar + separate timeline:
                filled runs are work, the gaps between them are the breaks. */}
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Box
                sx={{
                  alignItems: 'baseline',
                  display: 'flex',
                  gap: 1,
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography level='title-sm'>
                  {t('activityTimeline')}
                </Typography>
                <Typography level='body-xs' textColor='text.tertiary'>
                  {activeSeconds > 0
                    ? t('percentActive', { percent: activePercent })
                    : t('noActiveTime')}
                </Typography>
              </Box>

              {sessions.length > 0 ? (
                <>
                  <Box
                    sx={{
                      bgcolor: 'neutral.softBg',
                      borderRadius: 'sm',
                      height: 10,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {sessions.map((session, index) => {
                      const sessionStart = new Date(session.start)
                      const sessionEnd = session.end
                        ? new Date(session.end)
                        : currentTime
                      const startOffset = Math.max(
                        0,
                        (sessionStart - new Date(timerData.startTime)) / 1000,
                      )
                      const sessionDuration = Math.max(
                        0,
                        (sessionEnd - sessionStart) / 1000,
                      )
                      const isOngoing = !session.end

                      return (
                        <Box
                          key={index}
                          title={`${t('sessionNumberShort', {
                            number: index + 1,
                          })} · ${formatDuration(Math.floor(sessionDuration))}`}
                          sx={{
                            bgcolor: isOngoing
                              ? 'primary.solidHoverBg'
                              : 'primary.solidBg',
                            borderRadius: 'sm',
                            height: '100%',
                            left: `${(startOffset / Math.max(totalSeconds, 1)) * 100}%`,
                            // Sub-minute runs would otherwise vanish entirely.
                            minWidth: 3,
                            position: 'absolute',
                            width: `${(sessionDuration / Math.max(totalSeconds, 1)) * 100}%`,
                          }}
                        />
                      )
                    })}
                  </Box>
                  <Box
                    sx={{
                      alignItems: 'center',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      justifyContent: 'space-between',
                      mt: 1.25,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <LegendKey
                        label={t('activeWork')}
                        sx={{ bgcolor: 'primary.solidBg' }}
                      />
                      <LegendKey
                        label={t('breakTime')}
                        sx={{ bgcolor: 'neutral.softBg' }}
                      />
                    </Box>
                    <Typography
                      level='body-xs'
                      textColor={
                        finished ? 'text.tertiary' : 'primary.plainColor'
                      }
                    >
                      {finished
                        ? t('timeline.ended', {
                            time: fmt.time(timerData.endTime),
                          })
                        : t('timeline.now', { time: fmt.time(currentTime) })}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography level='body-sm' textColor='text.secondary'>
                  {t('timeline.emptyState')}
                </Typography>
              )}
            </Box>

            <Divider />

            {/* The three numbers that used to be three chunky cards. */}
            <Box
              sx={{
                bgcolor: 'background.level1',
                display: 'flex',
                px: { xs: 1.5, sm: 2 },
                py: 1.5,
              }}
            >
              <StatCell
                label={t('totalTime')}
                value={formatTime(totalSeconds)}
              />
              <Divider orientation='vertical' />
              <StatCell
                label={t('breakTime')}
                value={formatDuration(idleSeconds)}
                valueColor={idleSeconds > 0 ? 'warning.plainColor' : undefined}
              />
              <Divider orientation='vertical' />
              <StatCell label={t('sessions')} value={sessions.length} />
            </Box>
          </Sheet>

          {/* Session Breakdown */}
          <Box>
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'space-between',
                mb: 1.25,
                px: 0.5,
              }}
            >
              <Typography level='title-sm'>{t('sessionBreakdown')}</Typography>
            </Box>

            {!permissions.editTime && (
              <Typography
                level='body-xs'
                textColor='text.tertiary'
                sx={{ display: 'block', mb: 1, px: 0.5 }}
              >
                {t('chores:permissions.editTime')}
              </Typography>
            )}

            <>
              {sessions.length > 0 ? (
                <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
                  <SwipeableList
                    type={ListType.IOS}
                    fullSwipe
                    threshold={SWIPE_COMMIT_THRESHOLD}
                  >
                    {[...sessions]
                      .sort((a, b) => moment(b.start) - moment(a.start))
                      .map((pause, pauseIndex) => {
                        const isOngoing = !pause.end
                        const sessionUser =
                          pause.updatedBy && pause.updatedBy !== 0
                            ? getMemberById(pause.updatedBy)
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
                          <SwipeListItem
                            key={pauseIndex}
                            swipeActionOpen={
                              showMoreInfoId === pauseIndex ? 'trailing' : null
                            }
                            trailingActions={
                              <TrailingActions
                                description={t('chores:permissions.editTime')}
                              >
                                <SwipeActionButton
                                  disabled={!permissions.editTime}
                                  onClick={() => {
                                    hapticMedium()
                                    handleEditSession(pause)
                                  }}
                                  bgcolor='primary.solidBg'
                                  color='primary.solidColor'
                                  icon={<Edit />}
                                  label={t('common:edit')}
                                />
                                <SwipeActionButton
                                  disabled={!permissions.editTime}
                                  onClick={() => {
                                    hapticMedium()
                                    confirmDeletePauseEntry(pause)
                                  }}
                                  bgcolor='danger.500'
                                  color='#fff'
                                  icon={<Delete />}
                                  label={t('common:delete')}
                                />
                              </TrailingActions>
                            }
                          >
                            {/* Rows read as a log: the time range leads,
                                  the duration is the number you compare. */}
                            <Box
                              sx={{
                                alignItems: 'center',
                                bgcolor: 'background.surface',
                                borderTop:
                                  pauseIndex === 0 ? 'none' : '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                gap: 1.5,
                                minWidth: 0,
                                px: { xs: 1.5, sm: 2 },
                                py: 1.5,
                                width: '100%',
                              }}
                            >
                              {isOngoing ? (
                                <LiveDot />
                              ) : (
                                <Box
                                  sx={{
                                    bgcolor: 'neutral.softActiveBg',
                                    borderRadius: '50%',
                                    flex: '0 0 auto',
                                    height: 8,
                                    width: 8,
                                  }}
                                />
                              )}

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  level='body-sm'
                                  sx={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 550,
                                  }}
                                >
                                  {fmt.time(pause.start)}
                                  {pause.end
                                    ? ` → ${fmt.time(pause.end)}`
                                    : ` ${t('timeline.ongoing')}`}
                                </Typography>
                                <Box
                                  sx={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 0.75,
                                    mt: 0.25,
                                  }}
                                >
                                  <Typography
                                    level='body-xs'
                                    textColor='text.tertiary'
                                  >
                                    {moment(pause.start).format('MMM DD')}
                                  </Typography>
                                  {sessionUser && (
                                    <Chip
                                      size='sm'
                                      variant='soft'
                                      color='neutral'
                                      startDecorator={
                                        <Avatar
                                          size='sm'
                                          src={resolvePhotoURL(
                                            sessionUser?.image,
                                          )}
                                          sx={{ height: 16, width: 16 }}
                                        >
                                          {sessionUser?.displayName?.charAt(
                                            0,
                                          ) ||
                                            sessionUser?.name?.charAt(0) || (
                                              <Person />
                                            )}
                                        </Avatar>
                                      }
                                      sx={{ fontSize: '0.7rem' }}
                                    >
                                      {sessionUser?.displayName ||
                                        sessionUser?.name ||
                                        'Unknown'}
                                    </Chip>
                                  )}
                                </Box>
                              </Box>

                              <Typography
                                level='title-sm'
                                textColor={
                                  isOngoing
                                    ? 'primary.plainColor'
                                    : 'text.primary'
                                }
                                sx={{
                                  flex: '0 0 auto',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatDuration(realTimeDuration)}
                              </Typography>

                              <IconButton
                                aria-label={t('chores:swipeActionsLabel')}
                                aria-expanded={showMoreInfoId === pauseIndex}
                                color='neutral'
                                variant='plain'
                                size='sm'
                                onClick={e => {
                                  e.stopPropagation()
                                  setShowMoreInfoId(
                                    showMoreInfoId === pauseIndex
                                      ? null
                                      : pauseIndex,
                                  )
                                }}
                              >
                                <MoreVert sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          </SwipeListItem>
                        )
                      })}
                  </SwipeableList>
                </Sheet>
              ) : (
                <Sheet sx={{ ...surfaceSx, p: 2 }}>
                  <EmptyState
                    size='sm'
                    icon={<TimerIcon />}
                    title={t('emptySessionsTitle')}
                    description={t('emptySessionsDescription')}
                  />
                </Sheet>
              )}
            </>
            {isEditing && (
              <ResponsiveModal
                open
                onClose={() => !loading && cancelEditingSession(timerData.id)}
                title={t('common:edit')}
                size='lg'
                footer={
                  <ModalActions
                    secondary={{
                      label: t('common:cancel'),
                      disabled: loading,
                      onClick: () => cancelEditingSession(timerData.id),
                    }}
                    primary={{
                      label: t('saveChanges'),
                      loading,
                      onClick: () => saveSession(timerData.id),
                    }}
                  />
                }
              >
                {editingSessions[timerData.id].pauseLog.map(
                  (pause, pauseIndex) =>
                    pauseIndex === editingPauseIndex && (
                      <Box
                        key={pauseIndex}
                        sx={{
                          borderTop: pauseIndex === 0 ? 'none' : '1px solid',
                          borderColor: 'divider',
                          px: { xs: 2, sm: 2.5 },
                          py: 2,
                        }}
                      >
                        <Box
                          sx={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: 1,
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Typography level='title-sm'>
                            {t('timeline.sessionNumber', {
                              number: pauseIndex + 1,
                            })}
                          </Typography>
                          <Box
                            sx={{
                              alignItems: 'center',
                              display: 'flex',
                              gap: 1,
                            }}
                          >
                            <Chip
                              size='sm'
                              variant='soft'
                              color='neutral'
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {formatDuration(pause.duration)}
                            </Chip>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: {
                              xs: 'minmax(0, 1fr)',
                              sm: 'repeat(2, minmax(0, 1fr))',
                            },
                          }}
                        >
                          <FormControl size='sm'>
                            <FormLabel>{t('startTime')}</FormLabel>
                            <Input
                              type='datetime-local'
                              slotProps={{ input: { step: 1 } }}
                              value={
                                pause.start
                                  ? moment(pause.start).format(
                                      'YYYY-MM-DDTHH:mm:ss',
                                    )
                                  : ''
                              }
                              onChange={e =>
                                updatePauseLogEntry(
                                  timerData.id,
                                  pauseIndex,
                                  'start',
                                  e.target.value
                                    ? new Date(e.target.value).toISOString()
                                    : '',
                                )
                              }
                            />
                          </FormControl>

                          <FormControl size='sm'>
                            <FormLabel>{t('endTime')}</FormLabel>
                            <Input
                              type='datetime-local'
                              slotProps={{ input: { step: 1 } }}
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
                            <FormHelperText>{t('leaveEmpty')}</FormHelperText>
                          </FormControl>
                        </Box>
                      </Box>
                    ),
                )}
              </ResponsiveModal>
            )}
          </Box>
        </Box>
      )}

      {confirmConfig?.isOpen && <ConfirmationModal config={confirmConfig} />}
    </Container>
  )
}

export default TimerDetails
