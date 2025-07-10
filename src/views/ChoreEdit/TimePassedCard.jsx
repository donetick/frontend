import { Flag, Schedule } from '@mui/icons-material'
import { Box, Card, Chip, Typography } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

const TimePassedCard = ({ chore }) => {
  const [time, setTime] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [prevStatus, setPrevStatus] = useState(null) // Initialize as null
  const intervalRef = useRef(null)

  // Track status changes to trigger animation
  useEffect(() => {
    // Only trigger animation if we have a previous status and it changed from 0 to 1
    if (prevStatus !== null && prevStatus === 0 && chore.status === 1) {
      setShouldAnimate(true)
      // Reset animation after it completes
      const timer = setTimeout(() => setShouldAnimate(false), 300)
      return () => clearTimeout(timer)
    }
    setPrevStatus(chore.status)
  }, [chore.status, prevStatus])

  // Single effect to handle both time calculation and timer
  useEffect(() => {
    // Calculate current time based on chore data
    const calculateCurrentTime = () => {
      if (chore.timerUpdatedAt && chore.status === 1) {
        // Active session: base duration + time since start
        return (
          Math.floor(
            (Date.now() - new Date(chore.timerUpdatedAt).getTime()) / 1000,
          ) + (chore.duration || 0)
        )
      }
      // Not active: just return accumulated duration
      return chore.duration || 0
    }

    // Set initial time
    const currentTime = calculateCurrentTime()
    setTime(currentTime)

    // Handle timer based on status
    if (chore.status === 1) {
      // Active: start interval timer
      intervalRef.current = setInterval(() => {
        setTime(calculateCurrentTime())
      }, 1000)
    } else {
      // Not active: clear any existing timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [chore.status, chore.timerUpdatedAt, chore.duration])

  const formatTime = seconds => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card
      variant='soft'
      sx={{
        borderRadius: 'md',
        boxShadow: 1,
        px: 2,
        py: 1,
        alignItems: 'center',
        ...(shouldAnimate && {
          animation: 'slideInUp 0.3s ease-out',
        }),
        '@keyframes slideInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px) scale(0.95)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0) scale(1)',
          },
        },
        transition: 'all 0.3s ease',
      }}
    >
      <Typography
        level='h4'
        sx={{
          fontWeight: 600,
          pt: 1,
          color: chore.status === 1 ? 'success.main' : 'text.primary',
          mb: 0.5,
          transition: 'all 0.3s ease',
          transform: chore.status === 1 ? 'scale(1.40)' : 'scale(1)',
        }}
      >
        {formatTime(time)}
      </Typography>

      {/* Status and info section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        {/* <Chip
          variant='solid'
          color={
            chore.status === 1
              ? 'success'
              : chore.status === 2
                ? 'warning'
                : 'neutral'
          }
          size='sm'
          startDecorator={
            chore.status === 1 ? (
              <PlayArrow sx={{ fontSize: 14 }} />
            ) : chore.status === 2 ? (
              <Pause sx={{ fontSize: 14 }} />
            ) : (
              <AccessTime sx={{ fontSize: 14 }} />
            )
          }
        >
          {chore.status === 1
            ? 'Active'
            : chore.status === 2
              ? 'Paused'
              : 'Idle'}
        </Chip> */}

        {/* Show start time and user if active */}
        {chore.status === 1 && chore.timerUpdatedAt && (
          <>
            {/* Original start time */}
            {chore.startTime && (
              <Chip
                variant='plain'
                color='primary'
                size='sm'
                startDecorator={<Flag sx={{ fontSize: 14 }} />}
              >
                {'Started '}
                {new Date(chore.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Chip>
            )}

            {/* Current session start time */}
            {chore.timerUpdatedAt !== chore.startTime && (
              <Chip
                variant='plain'
                color='neutral'
                size='sm'
                startDecorator={<Schedule sx={{ fontSize: 14 }} />}
              >
                {'Session '}
                {new Date(chore.timerUpdatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Chip>
            )}
          </>
        )}

        {/* Chips  FOr paused : */}
        {chore.status === 2 && (
          <>
            <Chip
              variant='solid'
              color='warning'
              size='sm'
              startDecorator={<Schedule sx={{ fontSize: 14 }} />}
            >
              Paused
            </Chip>
            <Chip
              variant='plain'
              color='neutral'
              size='sm'
              startDecorator={<Flag sx={{ fontSize: 14 }} />}
            >
              {new Date(chore.timerUpdatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Chip>
          </>
        )}
      </Box>
    </Card>
  )
}

export default TimePassedCard
