import {
  ArrowForwardRounded,
  NotificationsActiveRounded,
} from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../../Logo'
import {
  haptic,
  markOnboardingSeen,
  requestNotificationPermission,
} from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'
import {
  CaptureVignette,
  ProblemVignette,
  RemindersVignette,
  ScheduleVignette,
  TakesTurnsVignette,
} from './OnboardingVignettes'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SWIPE_THRESHOLD = 56

/**
 * Five messages, in the order that sells: the problem first, then the two
 * things Donetick does better than a reminders app, then the reasons to come
 * back. Every title is an outcome — nobody buys "reschedule from completion
 * date", they buy never arguing about trash day again.
 */
const SLIDES = [
  {
    key: 'problem',
    title: 'Stop forgetting the little things',
    body: "Bills. Filters. Trash day. The dog's medicine. Whose turn it is to cook. Donetick remembers them so nobody in the house has to.",
    Visual: ProblemVignette,
  },
  {
    key: 'capture',
    title: 'Add it before you forget it',
    body: 'Say it out loud, snap the bill or the school form, or just type. The date, the labels and the points come with it — photos are read right on your phone.',
    Visual: CaptureVignette,
  },
  {
    key: 'schedule',
    title: 'It comes back exactly when it should',
    body: "Every week, every 3 months, or a month after you actually did it. Finishing late doesn't throw the rest of the year off.",
    Visual: ScheduleVignette,
  },
  {
    key: 'circle',
    title: 'Nobody has to be the nag',
    body: 'Invite the family, let chores rotate on their own, and see who did what. Tap an NFC tag on the washer to finish one on the spot.',
    Visual: TakesTurnsVignette,
  },
  {
    key: 'reminders',
    title: 'A nudge at the right moment',
    body: "A reminder before something's due, a heads-up when someone else finishes theirs, and today's list right on your home screen.",
    Visual: RemindersVignette,
    permission: true,
  },
]

const Dots = ({ count, activeIndex, onSelect }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
    {Array.from({ length: count }, (_, index) => {
      const active = index === activeIndex
      return (
        <Box
          key={index}
          component='button'
          type='button'
          aria-label={`Go to step ${index + 1}`}
          aria-current={active ? 'step' : undefined}
          onClick={() => onSelect(index)}
          sx={{
            border: 'none',
            p: 0,
            cursor: 'pointer',
            height: 6,
            width: active ? 22 : 6,
            borderRadius: '999px',
            bgcolor: active ? 'primary.500' : 'neutral.softBg',
            transition: `width 280ms ${EASE}, background-color 280ms ease`,
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.500',
              outlineOffset: '3px',
            },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      )
    })}
  </Box>
)

const OnboardingView = () => {
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [asking, setAsking] = useState(false)
  const pointerRef = useRef(null)
  const viewportRef = useRef(null)

  const isLast = activeIndex === SLIDES.length - 1
  const asksPermission = Boolean(SLIDES[activeIndex].permission)

  const finish = useCallback(() => {
    markOnboardingSeen()
    navigate('/get-started', { replace: true })
  }, [navigate])

  const goTo = useCallback(index => {
    setActiveIndex(current => {
      const next = Math.min(Math.max(index, 0), SLIDES.length - 1)
      if (next !== current) haptic()
      return next
    })
  }, [])

  const enableNotifications = async () => {
    setAsking(true)
    try {
      await requestNotificationPermission()
    } finally {
      setAsking(false)
    }
    haptic('medium')
    finish()
  }

  const handleNext = () => {
    if (isLast) {
      haptic('medium')
      finish()
      return
    }
    goTo(activeIndex + 1)
  }

  // Arrow keys for keyboard/desktop parity with swiping.
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'ArrowRight') goTo(activeIndex + 1)
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, goTo])

  const onPointerDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerRef.current = { id: event.pointerId, startX: event.clientX }
  }

  const onPointerMove = event => {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return

    const delta = event.clientX - pointer.startX
    const atEdge = (activeIndex === 0 && delta > 0) || (isLast && delta < 0)
    // Rubber-band past the first and last slide instead of hard-stopping.
    setDrag(atEdge ? delta * 0.35 : delta)
  }

  const endDrag = event => {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return

    const delta = event.clientX - pointer.startX
    pointerRef.current = null
    setDrag(0)

    if (delta <= -SWIPE_THRESHOLD) goTo(activeIndex + 1)
    else if (delta >= SWIPE_THRESHOLD) goTo(activeIndex - 1)
  }

  const width = viewportRef.current?.offsetWidth || 1
  const dragPercent = (drag / width) * 100

  return (
    <Box
      component='main'
      sx={{
        minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.body',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Logo size='26px' />
          <Typography
            level='title-md'
            sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Done
            <Box component='span' sx={{ color: 'primary.500' }}>
              tick
            </Box>
          </Typography>
        </Box>

        <Button
          variant='plain'
          color='neutral'
          size='sm'
          onClick={finish}
          sx={{ fontWeight: 600, borderRadius: '999px' }}
        >
          Skip
        </Button>
      </Box>

      <Box
        ref={viewportRef}
        role='group'
        aria-roledescription='carousel'
        aria-label='What you can do with Donetick'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
          touchAction: 'pan-y',
          userSelect: 'none',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            // Without an explicit min-width the 300%-wide track would size to
            // its content and push the slides past the viewport.
            minWidth: 0,
            minHeight: 0,
            transform: `translate3d(calc(${-activeIndex * 100}% + ${dragPercent}%), 0, 0)`,
            transition: pointerRef.current ? 'none' : `transform 360ms ${EASE}`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        >
          {SLIDES.map((slide, index) => {
            const active = index === activeIndex
            const { Visual } = slide
            return (
              <Box
                key={slide.key}
                role='group'
                aria-roledescription='slide'
                aria-label={`${index + 1} of ${SLIDES.length}`}
                aria-hidden={!active}
                sx={{
                  flex: '0 0 100%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  // Visual and copy travel together as one centred group;
                  // pinning the copy to the bottom leaves them disconnected.
                  justifyContent: 'center',
                  gap: 4,
                  px: 3,
                  py: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Remounting on activation replays the vignette's
                      entrance instead of it playing off-screen once. */}
                  <Visual key={active ? 'active' : 'idle'} />
                </Box>

                <Box
                  key={active ? 'copy-active' : 'copy-idle'}
                  sx={{
                    textAlign: 'center',
                    '@media (prefers-reduced-motion: reduce)': {
                      '& > *': { animation: 'none' },
                    },
                  }}
                >
                  <Typography
                    level='h2'
                    sx={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      textWrap: 'balance',
                      animation: `slideCopyIn 460ms ${EASE} 60ms both`,
                      '@keyframes slideCopyIn': {
                        from: { opacity: 0, transform: 'translateY(10px)' },
                        to: { opacity: 1, transform: 'none' },
                      },
                    }}
                  >
                    {slide.title}
                  </Typography>
                  <Typography
                    level='body-md'
                    sx={{
                      mt: 1,
                      mx: 'auto',
                      maxWidth: '34ch',
                      color: 'text.secondary',
                      textWrap: 'pretty',
                      animation: `slideCopyIn 460ms ${EASE} 140ms both`,
                    }}
                  >
                    {slide.body}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>

      <Box
        sx={{
          px: 3,
          pt: 1,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Dots count={SLIDES.length} activeIndex={activeIndex} onSelect={goTo} />

        {asksPermission ? (
          // The permission ask gets its own pair of choices: a system prompt
          // is a decision, not a "Next".
          <>
            <Button
              size='lg'
              fullWidth
              loading={asking}
              onClick={enableNotifications}
              startDecorator={<NotificationsActiveRounded />}
              sx={authButtonSx}
            >
              Turn on reminders
            </Button>
            <Button
              variant='plain'
              color='neutral'
              size='lg'
              fullWidth
              disabled={asking}
              // Deliberately not recorded as an opt-out: the in-app prompt can
              // still ask once the user has tasks that would benefit from it.
              onClick={finish}
              sx={{ ...authButtonSx, mt: -1.5 }}
            >
              Not now
            </Button>
          </>
        ) : (
          <Button
            size='lg'
            fullWidth
            onClick={handleNext}
            endDecorator={!isLast ? <ArrowForwardRounded /> : null}
            sx={authButtonSx}
          >
            {isLast ? 'Get started' : 'Next'}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default OnboardingView
