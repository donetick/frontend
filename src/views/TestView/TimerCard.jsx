import { Pause, PlayArrow, Stop, WatchLater } from '@mui/icons-material'
import { Box, Card, CardContent, IconButton, Typography } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

const TimerCard = ({
  variant = 'standalone', // 'standalone' | 'infoCard' | 'floating'
  sx = {},
  onTimeUpdate = () => {},
  title = 'Timer',
}) => {
  const [time, setTime] = useState(0) // Time in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef(null)

  // Format time as HH:MM:SS
  const formatTime = seconds => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime + 1
          onTimeUpdate(newTime)
          return newTime
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, isPaused, onTimeUpdate])

  const startTimer = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const pauseTimer = () => {
    setIsPaused(true)
  }

  const stopTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setTime(0)
    onTimeUpdate(0)
  }

  const resumeTimer = () => {
    setIsPaused(false)
  }

  // Info Card variant - fits in ChoreView grid
  if (variant === 'infoCard') {
    return (
      <Card
        variant='soft'
        sx={{
          borderRadius: 'md',
          boxShadow: 1,
          px: 2,
          py: 1,
          minHeight: 90,
          justifyContent: 'start',
          ...sx,
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
            <WatchLater />
            <Typography
              level='body-md'
              sx={{
                ml: 1,
                fontWeight: '500',
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              level='title-sm'
              sx={{
                fontWeight: 600,
                color: isRunning && !isPaused ? 'primary.600' : 'text.primary',
                transition: 'color 0.3s ease',
              }}
            >
              {formatTime(time)}
            </Typography>
            {!isRunning ? (
              <IconButton
                variant='soft'
                color='success'
                size='sm'
                onClick={startTimer}
                sx={{ width: 24, height: 24 }}
              >
                <PlayArrow sx={{ fontSize: '1rem' }} />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  variant='soft'
                  color={isPaused ? 'success' : 'warning'}
                  size='sm'
                  onClick={isPaused ? resumeTimer : pauseTimer}
                  sx={{ width: 24, height: 24 }}
                >
                  {isPaused ? (
                    <PlayArrow sx={{ fontSize: '1rem' }} />
                  ) : (
                    <Pause sx={{ fontSize: '1rem' }} />
                  )}
                </IconButton>
                <IconButton
                  variant='soft'
                  color='danger'
                  size='sm'
                  onClick={stopTimer}
                  sx={{ width: 24, height: 24 }}
                >
                  <Stop sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Box>
            )}
          </Box>
          {time > 0 && (
            <Typography level='body-xs' color='text.secondary'>
              {Math.floor(time / 60)}m {time % 60}s
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  }

  // Floating variant - position fixed
  if (variant === 'floating') {
    return (
      <Card
        variant='outlined'
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          p: 2,
          boxShadow: 'lg',
          borderRadius: 16,
          backgroundColor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease-in-out',
          width: 200,
          zIndex: 1000,
          '&:hover': {
            boxShadow: 'xl',
            borderColor: 'primary.200',
          },
          ...sx,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WatchLater sx={{ color: 'primary.600', fontSize: '1rem' }} />
          <Typography level='title-sm' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography
            level='h4'
            sx={{
              fontWeight: 600,
              color: isRunning && !isPaused ? 'primary.600' : 'text.primary',
              transition: 'color 0.3s ease',
            }}
          >
            {formatTime(time)}
          </Typography>
          <Typography level='body-xs' color='text.secondary'>
            {isRunning && !isPaused ? 'Running' : isPaused ? 'Paused' : 'Ready'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          {!isRunning ? (
            <IconButton
              variant='solid'
              color='success'
              size='sm'
              onClick={startTimer}
              sx={{ borderRadius: '50%' }}
            >
              <PlayArrow />
            </IconButton>
          ) : (
            <>
              <IconButton
                variant='soft'
                color={isPaused ? 'success' : 'warning'}
                size='sm'
                onClick={isPaused ? resumeTimer : pauseTimer}
                sx={{ borderRadius: '50%' }}
              >
                {isPaused ? <PlayArrow /> : <Pause />}
              </IconButton>
              <IconButton
                variant='soft'
                color='danger'
                size='sm'
                onClick={stopTimer}
                sx={{ borderRadius: '50%' }}
              >
                <Stop />
              </IconButton>
            </>
          )}
        </Box>
      </Card>
    )
  }

  // Default standalone variant
  return (
    <Card
      variant='outlined'
      sx={{
        p: 4,
        boxShadow: 'lg',
        borderRadius: 24,
        backgroundColor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease-in-out',
        maxWidth: 420,
        mx: 'auto',
        '&:hover': {
          boxShadow: 'xl',
          borderColor: 'primary.200',
          transform: 'translateY(-2px)',
        },
        ...sx,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'primary.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WatchLater sx={{ color: 'primary.600', fontSize: '1.25rem' }} />
          </Box>
          <Typography level='title-lg' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      </Box>

      {/* Timer Display */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
          mb: 3,
        }}
      >
        {/* Circular Background */}
        <Box
          sx={{
            position: 'relative',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background:
              isRunning && !isPaused
                ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05))'
                : 'linear-gradient(135deg, rgba(158, 158, 158, 0.08), rgba(158, 158, 158, 0.03))',
            border: '2px solid',
            borderColor: isRunning && !isPaused ? 'primary.200' : 'neutral.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s ease',
            '&::before':
              isRunning && !isPaused
                ? {
                    content: '""',
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                    zIndex: -1,
                    animation: 'rotate 3s linear infinite',
                    opacity: 0.3,
                  }
                : {},
            '@keyframes rotate': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        >
          {/* Timer Text */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              level='h2'
              sx={{
                fontSize: '1.75rem',
                fontWeight: 600,
                color: isRunning && !isPaused ? 'primary.600' : 'text.primary',
                transition: 'color 0.3s ease',
                lineHeight: 1.1,
                mb: 0.5,
              }}
            >
              {formatTime(time)}
            </Typography>
            <Typography
              level='body-xs'
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 500,
              }}
            >
              {isRunning && !isPaused
                ? 'Running'
                : isPaused
                  ? 'Paused'
                  : 'Ready'}
            </Typography>
          </Box>
        </Box>

        {/* Pulse effect for running state */}
        {isRunning && !isPaused && (
          <Box
            sx={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.300',
              animation: 'pulse-ring 2s ease-out infinite',
              '@keyframes pulse-ring': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 0.8,
                },
                '100%': {
                  transform: 'scale(1.4)',
                  opacity: 0,
                },
              },
            }}
          />
        )}
      </Box>

      {/* Control Buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          alignItems: 'center',
          mt: 1,
        }}
      >
        {!isRunning ? (
          <IconButton
            variant='solid'
            color='success'
            size='lg'
            onClick={startTimer}
            sx={{
              borderRadius: '50%',
              width: 64,
              height: 64,
              boxShadow: 'lg',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 'xl',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <PlayArrow sx={{ fontSize: '2.25rem' }} />
          </IconButton>
        ) : (
          <>
            <IconButton
              variant='soft'
              color={isPaused ? 'success' : 'warning'}
              size='lg'
              onClick={isPaused ? resumeTimer : pauseTimer}
              sx={{
                borderRadius: '50%',
                width: 52,
                height: 52,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              {isPaused ? (
                <PlayArrow sx={{ fontSize: '1.5rem' }} />
              ) : (
                <Pause sx={{ fontSize: '1.5rem' }} />
              )}
            </IconButton>

            <IconButton
              variant='outlined'
              color='danger'
              size='lg'
              onClick={stopTimer}
              sx={{
                borderRadius: '50%',
                width: 52,
                height: 52,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  bgcolor: 'danger.50',
                },
              }}
            >
              <Stop sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </>
        )}
      </Box>

      {/* Session Info */}
      {time > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography level='body-sm' color='text.secondary'>
            Session: {Math.floor(time / 60)}m {time % 60}s
          </Typography>
        </Box>
      )}
    </Card>
  )
}

export default TimerCard
