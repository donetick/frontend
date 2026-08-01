import {
  AddRounded,
  CheckRounded,
  ContactlessRounded,
  HourglassEmptyRounded,
  KeyboardRounded,
  MicNoneRounded,
  NotificationsActiveRounded,
  PeopleAltRounded,
  PhoneIphoneRounded,
  PhotoCameraOutlined,
  PlayArrowRounded,
  Repeat,
  SwitchAccessShortcutRounded,
  ThumbDownRounded,
  ThumbUpRounded,
} from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'
import {
  getPriorityColor,
  getTextColorFromBackgroundColor,
} from '../../utils/Colors.jsx'

/**
 * Small living previews of the real product, one per onboarding slide.
 *
 * The task cards deliberately mirror ChoreCard's visual grammar (floating due
 * date + frequency chips overlapping a radius-20 surface card, avatar initial,
 * assignee chip) without using the component itself: ChoreCard pulls
 * usePendingCommands and useUserProfile, and neither belongs on a pre-auth
 * screen.
 *
 * Motion rule used throughout: the *base* style is always the finished state,
 * and the keyframes describe how it got there. That way `prefers-reduced-motion`
 * can switch every animation off and each vignette still reads correctly
 * instead of collapsing to an invisible element.
 */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
// One shared cycle length so the pills, the card and the caption of a vignette
// all change on the same beat.
const CYCLE_MS = 5400

const reducedMotion = {
  '@media (prefers-reduced-motion: reduce)': {
    '&, & *': { animation: 'none !important' },
  },
}

const cardSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 20,
  boxShadow: 'sm',
}

const Stage = ({ children }) => (
  <Box
    aria-hidden='true'
    sx={{
      position: 'relative',
      width: '100%',
      maxWidth: 320,
      mx: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: '-16% -12%',
        borderRadius: '50%',
        bgcolor: 'primary.softBg',
        opacity: 0.55,
        filter: 'blur(28px)',
        zIndex: 0,
      },
      '& > *': { position: 'relative', zIndex: 1 },
      ...reducedMotion,
    }}
  >
    {children}
  </Box>
)

const Chip = ({ icon, children, color = 'primary', sx }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 0.875,
      py: 0.25,
      borderRadius: '999px',
      bgcolor: `${color}.softBg`,
      color: color === 'neutral' ? 'text.secondary' : `${color}.softColor`,
      fontSize: '0.6875rem',
      fontWeight: 600,
      lineHeight: 1.6,
      whiteSpace: 'nowrap',
      '& svg': { fontSize: '0.875rem' },
      ...sx,
    }}
  >
    {icon}
    {children}
  </Box>
)

// Mirrors CompactChoreCard's solid, label-coloured chip (not the soft-tinted
// `Chip` above) so a MiniChoreCard can fake a real label instead of a generic tag.
const LabelChip = ({ label, color, sx }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      alignSelf: 'flex-start',
      px: 0.75,
      py: 0.125,
      borderRadius: '999px',
      fontSize: '0.625rem',
      fontWeight: 700,
      lineHeight: 1.6,
      whiteSpace: 'nowrap',
      bgcolor: color,
      color: getTextColorFromBackgroundColor(color),
      ...sx,
    }}
  >
    {label}
  </Box>
)

const getName = name => {
  const split = Array.from(name)
  // if the first character is emoji then remove it from the name
  if (isNaN(Number(split[0])) && /\p{Emoji}/u.test(split[0])) {
    return split.slice(1).join('').trim()
  }
  return name
}

/**
 * ChoreCard in miniature: the chips ride on top of the card's edge exactly as
 * they do in the task list.
 */
const MiniChoreCard = ({
  title,
  due,
  dueColor = 'primary',
  repeat,
  label,
  labelColor = '#5c6bc0',
  footer,
}) => (
  <Box>
    <Box sx={{ display: 'flex', gap: 0.5, ml: 1.25, mb: -1.25, zIndex: 2 }}>
      <Chip color={dueColor}>{due}</Chip>
      {repeat && (
        <Chip color='neutral' icon={<Repeat />}>
          {repeat}
        </Chip>
      )}
    </Box>

    <Box sx={{ ...cardSx, p: 1.75, display: 'flex', gap: 1.25 }}>
      <Box
        sx={{
          flex: '0 0 auto',
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'neutral.softBg',
          color: 'text.primary',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        {Array.from(title)[0]}
      </Box>
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography level='title-sm' noWrap sx={{ fontWeight: 600 }}>
          {getName(title)}
        </Typography>
        {label && (
          <LabelChip label={label} color={labelColor} sx={{ mt: 0.375 }} />
        )}
        {footer}
      </Box>
    </Box>
  </Box>
)

const AssigneeChip = ({ name, color = 'primary', sx }) => (
  <Box
    sx={{
      mt: 0.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.625,
      alignSelf: 'flex-start',
      pl: 0.25,
      pr: 1,
      py: 0.25,
      borderRadius: '999px',
      border: '1px solid',
      borderColor: 'divider',
      fontSize: '0.6875rem',
      fontWeight: 500,
      color: 'text.secondary',
      ...sx,
    }}
  >
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontSize: '0.625rem',
        fontWeight: 700,
        bgcolor: `${color}.softBg`,
        color: 'text.primary',
      }}
    >
      {Array.from(name)[0]}
    </Box>
    {name}
  </Box>
)

// Stacks its children in one grid cell and cross-fades between them, so the
// container never resizes as the content changes. The keyframes are derived
// from the child count so a two-up cycler holds each state twice as long
// instead of leaving a third of the cycle blank.
const Cycler = ({ children, sx, cycleMs = CYCLE_MS }) => {
  const items = Array.isArray(children) ? children : [children]
  const count = items.length
  const step = cycleMs / count
  const hold = 100 / count
  // Emotion emits inline @keyframes under the literal name, so each arity
  // needs its own or the two definitions collide.
  const name = `cycleSwap${count}`

  return (
    <Box sx={{ display: 'grid', ...sx }}>
      {items.map((child, index) => (
        <Box
          key={index}
          sx={{
            gridArea: '1 / 1',
            opacity: index === 0 ? 1 : 0,
            animation: `${name} ${cycleMs}ms ${EASE} ${index * step}ms infinite both`,
            [`@keyframes ${name}`]: {
              '0%': { opacity: 0, transform: 'translateY(6px)' },
              '4%': { opacity: 1, transform: 'none' },
              [`${hold - 4}%`]: { opacity: 1, transform: 'none' },
              [`${hold + 1}%`]: { opacity: 0, transform: 'translateY(-6px)' },
              '100%': { opacity: 0, transform: 'translateY(-6px)' },
            },
            ...sx?.item,
          }}
        >
          {child}
        </Box>
      ))}
    </Box>
  )
}

/* ------------------------------------------- slide 1: three ways to capture */

// This vignette runs slower than the shared CYCLE_MS: each capture method
// gets a full 3s on screen so the input-to-task morph has room to read.
const CAPTURE_STEP_MS = 3000
const CAPTURE_CYCLE_MS = CAPTURE_STEP_MS * 3

const SOURCES = [
  { icon: <MicNoneRounded />, label: 'Speak' },
  { icon: <PhotoCameraOutlined />, label: 'Snap' },
  { icon: <KeyboardRounded />, label: 'Type' },
]

const SourcePill = ({ icon, label, index }) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.375,
      py: 1,
      borderRadius: '14px',
      border: '1px solid',
      fontSize: '0.6875rem',
      fontWeight: 600,
      // Base state is the active one so reduced motion leaves the first
      // pill lit rather than every pill lit.
      borderColor: index === 0 ? 'primary.500' : 'divider',
      bgcolor: index === 0 ? 'primary.softBg' : 'background.surface',
      color: index === 0 ? 'primary.plainColor' : 'text.secondary',
      // `forwards`, not `both`: a backwards fill would paint the lit 0%
      // keyframe during each pill's delay, lighting all three at once.
      animation: `sourcePulse ${CAPTURE_CYCLE_MS}ms ${EASE} ${index * CAPTURE_STEP_MS}ms infinite forwards`,
      '@keyframes sourcePulse': {
        '0%, 33%': {
          borderColor: 'var(--joy-palette-primary-500)',
          backgroundColor: 'var(--joy-palette-primary-softBg)',
          color: 'var(--joy-palette-primary-plainColor)',
          transform: 'translateY(-2px)',
        },
        '38%, 100%': {
          borderColor: 'var(--joy-palette-divider)',
          backgroundColor: 'var(--joy-palette-background-surface)',
          color: 'var(--joy-palette-text-secondary)',
          transform: 'none',
        },
      },
      '& svg': { fontSize: '1.25rem' },
    }}
  >
    {icon}
    {label}
  </Box>
)

/**
 * Each capture method gets its own caption rather than one blanket badge: the
 * on-device claim is only unambiguously true for the photo path (native OCR
 * plus a local model, nothing uploaded), while speech-to-text still goes
 * through the OS speech recognizer.
 */
const CaptureVariant = ({ card, caption, icon }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {card}
    <Chip icon={icon} sx={{ alignSelf: 'flex-start' }}>
      {caption}
    </Chip>
  </Box>
)

// Crossfades a "capturing" moment into the task it produces. Both layers sit
// in the same grid cell on one shared clock (delay = this variant's slot in
// the outer Cycler) so the morph always lands while the variant is on screen:
// ~0-38% holds the raw input, ~46-60% is the handoff, the rest holds the card.
const CaptureMorph = ({ before, after, delay = 0 }) => (
  <Box sx={{ display: 'grid' }}>
    <Box
      sx={{
        gridArea: '1 / 1',
        animation: `captureMorphOut ${CAPTURE_STEP_MS}ms ${EASE} ${delay}ms infinite both`,
        '@keyframes captureMorphOut': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '10%': { opacity: 1, transform: 'none' },
          '38%': { opacity: 1, transform: 'none' },
          '48%': { opacity: 0, transform: 'translateY(-6px)' },
          '100%': { opacity: 0, transform: 'translateY(-6px)' },
        },
      }}
    >
      {before}
    </Box>
    <Box
      sx={{
        gridArea: '1 / 1',
        animation: `captureMorphIn ${CAPTURE_STEP_MS}ms ${EASE} ${delay}ms infinite both`,
        '@keyframes captureMorphIn': {
          '0%, 46%': { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
          '60%': { opacity: 1, transform: 'none' },
          '100%': { opacity: 1, transform: 'none' },
        },
      }}
    >
      {after}
    </Box>
  </Box>
)

const WAVE_BARS = [10, 18, 24, 14, 20, 11, 16]

/** The "before": a live waveform standing in for on-device speech capture. */
const VoiceWave = ({ delay = 0 }) => (
  <Box
    sx={{
      ...cardSx,
      height: 68,
      px: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
    }}
  >
    <Box
      sx={{
        flex: '0 0 auto',
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: 'danger.500',
        animation: `recDotPulse 1000ms ease-in-out ${delay}ms infinite`,
        '@keyframes recDotPulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      }}
    />
    <Box
      sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 24 }}
    >
      {WAVE_BARS.map((height, index) => (
        <Box
          key={index}
          sx={{
            width: 3,
            height,
            borderRadius: '2px',
            bgcolor: 'primary.500',
            transformOrigin: 'bottom',
            animation: `waveBounce 900ms ease-in-out ${delay + index * 90}ms infinite`,
            '@keyframes waveBounce': {
              '0%, 100%': { transform: 'scaleY(0.4)' },
              '50%': { transform: 'scaleY(1)' },
            },
          }}
        />
      ))}
    </Box>
    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
      Listening…
    </Typography>
  </Box>
)

const CORNER_MARKS = [
  { top: 6, left: 6, borderWidth: '2px 0 0 2px' },
  { top: 6, right: 6, borderWidth: '2px 2px 0 0' },
  { bottom: 6, left: 6, borderWidth: '0 0 2px 2px' },
  { bottom: 6, right: 6, borderWidth: '0 2px 2px 0' },
]

/** The "before": a viewfinder with a shutter flash timed to the handoff. */
const CameraFrame = ({ delay = 0 }) => (
  <Box
    sx={{
      ...cardSx,
      height: 68,
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    {CORNER_MARKS.map((mark, index) => (
      <Box
        key={index}
        sx={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderStyle: 'solid',
          borderColor: 'primary.500',
          ...mark,
        }}
      />
    ))}
    <PhotoCameraOutlined sx={{ fontSize: 22, color: 'text.tertiary' }} />
    <Box
      aria-hidden='true'
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'common.white',
        animation: `shutterFlash ${CAPTURE_STEP_MS}ms ${EASE} ${delay}ms infinite`,
        '@keyframes shutterFlash': {
          '0%, 36%': { opacity: 0 },
          '40%': { opacity: 0.9 },
          '46%, 100%': { opacity: 0 },
        },
      }}
    />
  </Box>
)

const TYPE_TEXT = 'change ac filter friday @ryan'

/** The "before": a live-typed line, revealed a character at a time. */
const TypingField = ({ delay = 0 }) => (
  <Box
    sx={{
      ...cardSx,
      height: 68,
      px: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    <KeyboardRounded
      sx={{ fontSize: 18, color: 'text.tertiary', flex: '0 0 auto' }}
    />
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <Box
        sx={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          width: 0,
          // One pass per appearance, not a fast standalone loop: the reveal
          // itself only takes the first 40% of the visible window (steps()
          // applies to that first segment), then holds at full width for the
          // rest so it doesn't replay mid-view before the morph hands off.
          animation: `typeReveal ${CAPTURE_STEP_MS}ms ${EASE} ${delay}ms infinite`,
          '@keyframes typeReveal': {
            '0%': {
              width: 0,
              animationTimingFunction: `steps(${TYPE_TEXT.length}, end)`,
            },
            '40%': { width: `${TYPE_TEXT.length}ch` },
            '100%': { width: `${TYPE_TEXT.length}ch` },
          },
        }}
      >
        <Typography
          level='body-sm'
          noWrap
          sx={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.8125rem',
          }}
        >
          {TYPE_TEXT}
        </Typography>
      </Box>
      <Box
        sx={{
          width: '2px',
          height: '1.1em',
          ml: 0.25,
          bgcolor: 'primary.500',
          animation: 'caretBlink 500ms step-end infinite',
          '@keyframes caretBlink': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0 },
          },
        }}
      />
    </Box>
  </Box>
)

export const CaptureVignette = () => (
  <Stage>
    <Box sx={{ display: 'flex', gap: 1 }}>
      {SOURCES.map((source, index) => (
        <SourcePill key={source.label} index={index} {...source} />
      ))}
    </Box>

    <Cycler cycleMs={CAPTURE_CYCLE_MS}>
      <CaptureVariant
        icon={<MicNoneRounded />}
        caption='Dates, labels and points from your words'
        card={
          <CaptureMorph
            delay={0}
            before={<VoiceWave delay={0} />}
            after={
              <MiniChoreCard
                title='♻️ Take out the trash'
                due='Due tomorrow'
                repeat='Every Monday'
                label='Home'
                labelColor='#26a69a'
              />
            }
          />
        }
      />
      <CaptureVariant
        icon={<PhoneIphoneRounded />}
        caption='Read on your device'
        card={
          <CaptureMorph
            delay={CAPTURE_STEP_MS}
            before={<CameraFrame delay={CAPTURE_STEP_MS} />}
            after={
              <MiniChoreCard
                title='🚗 Vehicle Registration Renewal'
                due='Due Aug 3'
                dueColor='warning'
                footer={
                  <Cycler>
                    <AssigneeChip key='amalie' name='Amalie' color='blue' />
                  </Cycler>
                }
              />
            }
          />
        }
      />
      <CaptureVariant
        icon={<KeyboardRounded />}
        caption='#labels @people *points as you type'
        card={
          <CaptureMorph
            delay={2 * CAPTURE_STEP_MS}
            before={<TypingField delay={2 * CAPTURE_STEP_MS} />}
            after={
              <MiniChoreCard
                title='💨 Change the AC filter'
                due='Due Fri'
                repeat='Every 3 months'
                footer={
                  <Cycler>
                    <AssigneeChip key='ryan' name='Ryan' color='green' />
                  </Cycler>
                }
              />
            }
          />
        }
      />
    </Cycler>
  </Stage>
)

/* --------------------------------- slide 2: due date vs. completion date */

const Milestone = ({ label, date, tone = 'neutral', delay }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.5,
      animation: `milestoneIn 380ms ${EASE} ${delay}ms both`,
      '@keyframes milestoneIn': {
        from: { opacity: 0, transform: 'scale(0.8)' },
        to: { opacity: 1, transform: 'none' },
      },
    }}
  >
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        color: 'common.white',
        bgcolor:
          tone === 'next'
            ? 'primary.500'
            : tone === 'done'
              ? 'success.500'
              : 'background.surface',
        border: '2px solid',
        borderColor:
          tone === 'next'
            ? 'primary.500'
            : tone === 'done'
              ? 'success.500'
              : 'neutral.outlinedBorder',
        '& svg': { fontSize: '0.75rem' },
      }}
    >
      {tone === 'done' && <CheckRounded />}
    </Box>
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        level='body-xs'
        sx={{ fontSize: '0.625rem', color: 'text.tertiary', lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      <Typography
        level='body-xs'
        sx={{
          fontWeight: 600,
          lineHeight: 1.3,
          color: tone === 'next' ? 'primary.plainColor' : 'text.primary',
        }}
      >
        {date}
      </Typography>
    </Box>
  </Box>
)

const ScheduleTrack = ({ mode, next, delay }) => (
  <Box
    sx={{
      ...cardSx,
      px: 1.75,
      py: 1.5,
      animation: `trackIn 460ms ${EASE} ${delay}ms both`,
      '@keyframes trackIn': {
        from: { opacity: 0, transform: 'translateY(12px)' },
        to: { opacity: 1, transform: 'none' },
      },
    }}
  >
    <Typography
      level='body-xs'
      sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.25 }}
    >
      {mode}
    </Typography>

    <Box sx={{ position: 'relative' }}>
      {/* Connector sits behind the milestones and draws itself first. */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: '16%',
          right: '16%',
          height: '2px',
          bgcolor: 'divider',
          transformOrigin: 'left center',
          animation: `trackDraw 520ms ${EASE} ${delay + 120}ms both`,
          '@keyframes trackDraw': {
            from: { transform: 'scaleX(0)' },
            to: { transform: 'scaleX(1)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        <Milestone label='Due' date='Mon 6' delay={delay + 160} />
        <Milestone label='Done' date='Wed 8' tone='done' delay={delay + 320} />
        <Milestone label='Next' date={next} tone='next' delay={delay + 520} />
      </Box>
    </Box>
  </Box>
)

export const ScheduleVignette = () => (
  <Stage>
    <ScheduleTrack mode='Reschedule from due date' next='Mon 13' delay={0} />
    <ScheduleTrack
      mode='Reschedule from completion date'
      next='Wed 15'
      delay={220}
    />
  </Stage>
)

/* ------------------------- slide 3: tap to finish, note, logged in history */

/**
 * A row from the task history, mirroring HistoryCard: coloured left rule,
 * status avatar and label, the note as a soft inline card, then the performer
 * chip and meta strip.
 */
const HistoryRow = ({
  status,
  color,
  icon,
  note,
  meta,
  performer,
  divider = true,
}) => (
  <Box
    sx={{
      display: 'flex',
      bgcolor: 'background.body',
      ...(divider && { borderBottom: '1px solid', borderColor: 'divider' }),
      borderLeft: '3px solid',
      borderLeftColor: `${color}.400`,
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0, px: 1.5, py: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          sx={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}.softBg`,
            color: `${color}.plainColor`,
            '& svg': { fontSize: '11px' },
          }}
        >
          {icon}
        </Box>
        <Typography
          level='body-xs'
          sx={{ fontWeight: 700, color: `${color}.plainColor` }}
        >
          {status}
        </Typography>
      </Box>

      {note && (
        <Box
          sx={{
            mt: 0.75,
            px: 1,
            py: 0.75,
            borderRadius: '8px',
            bgcolor: 'neutral.softBg',
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: 'text.secondary',
              fontStyle: 'italic',
              fontSize: '0.6875rem',
              lineHeight: 1.4,
            }}
          >
            {note}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          mt: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
        }}
      >
        {performer && <AssigneeChip name={performer} sx={{ mt: 0 }} />}
        <Typography
          level='body-xs'
          sx={{ color: 'text.tertiary', fontSize: '0.625rem' }}
        >
          {meta}
        </Typography>
      </Box>
    </Box>
  </Box>
)

/**
 * The action row from ChoreView in miniature. Which buttons show depends on
 * the task's state there — done/skip/start normally, approve/reject when it is
 * waiting on a manager — so the vignette cycles between the two rather than
 * lining all five up in a row that never exists in the app.
 */
const ActionButton = ({
  icon,
  label,
  color = 'neutral',
  variant,
  flex = 1,
}) => (
  <Box
    sx={{
      flex,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.5,
      px: 1,
      py: 0.75,
      borderRadius: '10px',
      fontSize: '0.75rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      ...(variant === 'soft'
        ? { bgcolor: `${color}.softBg`, color: `${color}.plainColor` }
        : variant === 'outlined'
          ? {
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              color: 'text.secondary',
            }
          : { bgcolor: `${color}.500`, color: 'common.white' }),
      '& svg': { fontSize: '1rem' },
    }}
  >
    {icon}
    {label}
  </Box>
)

const ActionState = ({ children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
    {children}
  </Box>
)

const ActionRow = ({ children }) => (
  <Box sx={{ display: 'flex', gap: 0.75 }}>{children}</Box>
)

// Off the deck as of the five-slide cut — NFC now rides along in the "nobody
// has to be the nag" copy. Kept intact so it can be swapped back in as its own
// slide without rebuilding it.
export const NfcVignette = () => (
  <Stage>
    <Box
      sx={{
        ...cardSx,
        px: 1.5,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: '0 0 auto',
          width: 38,
          height: 38,
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'primary.softBg',
          color: 'primary.plainColor',
          '& svg': { fontSize: '1.5rem' },
        }}
      >
        {/* Two rings leaving the tag: the phone reading it. */}
        {[0, 1].map(ring => (
          <Box
            key={ring}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              border: '2px solid',
              borderColor: 'primary.400',
              opacity: 0,
              animation: `nfcPing 2400ms ${EASE} ${ring * 800}ms infinite both`,
              '@keyframes nfcPing': {
                '0%': { opacity: 0.7, transform: 'scale(1)' },
                '70%, 100%': { opacity: 0, transform: 'scale(1.55)' },
              },
            }}
          />
        ))}
        <ContactlessRounded />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={{ fontWeight: 600 }}>
          Tag on the washer
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          Tap to open
        </Typography>
      </Box>
    </Box>

    {/* The task the tag opens, with the action row the app actually shows. */}
    <Box sx={{ ...cardSx, borderRadius: 16, px: 1.5, py: 1.25 }}>
      <Typography level='title-sm' sx={{ fontWeight: 600, mb: 1 }}>
        Swap the washer filter
      </Typography>

      <Cycler>
        <ActionState>
          <ActionRow>
            <ActionButton
              flex={3}
              color='success'
              icon={<CheckRounded />}
              label='Done'
            />
            <ActionButton
              variant='outlined'
              icon={<SwitchAccessShortcutRounded />}
              label='Skip'
            />
          </ActionRow>
          <ActionButton
            variant='soft'
            color='success'
            icon={<PlayArrowRounded />}
            label='Start timer'
          />
        </ActionState>

        <ActionState>
          <Chip color='neutral' icon={<HourglassEmptyRounded />}>
            Amalie marked it done · waiting on you
          </Chip>
          <ActionRow>
            <ActionButton
              color='success'
              icon={<ThumbUpRounded />}
              label='Approve'
            />
            <ActionButton
              color='danger'
              icon={<ThumbDownRounded />}
              label='Reject'
            />
          </ActionRow>
        </ActionState>
      </Cycler>
    </Box>

    {/* A tighter radius than the task cards: at radius 20 the corner clips
        the status rule and it reads as a rendering slip. */}
    <Box sx={{ ...cardSx, borderRadius: 14, overflow: 'hidden' }}>
      {/* grid-template-rows animates the new entry open, pushing the older
          one down the way the real list does — no height thrash. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: '1fr',
          animation: `historyOpen 620ms ${EASE} 900ms both`,
          '@keyframes historyOpen': {
            from: { gridTemplateRows: '0fr' },
            to: { gridTemplateRows: '1fr' },
          },
        }}
      >
        <Box
          sx={{
            minHeight: 0,
            overflow: 'hidden',
            animation: `historyFade 420ms ease 1120ms both`,
            '@keyframes historyFade': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          <HistoryRow
            status='Completed'
            color='success'
            icon={<CheckRounded />}
            performer='Mo'
            note='Used the delicate cycle — filter needs a clean next time.'
            meta='Just now · ★ 5 pts'
          />
        </Box>
      </Box>

      <HistoryRow
        status='Completed'
        color='success'
        icon={<CheckRounded />}
        performer='Amalie'
        meta='Last week · ★ 5 pts'
      />
    </Box>
  </Stage>
)

/* ----------------------------------------------- slide 4: share the load */

const MEMBERS = [
  { initial: 'M', name: 'Mo', color: 'primary' },
  { initial: 'A', name: 'Amalie', color: 'success' },
  { initial: 'S', name: 'Sam', color: 'warning' },
]

const AVATAR = 40
const AVATAR_GAP = 12
const STEP = AVATAR + AVATAR_GAP

export const CircleVignette = () => (
  <Stage>
    <MiniChoreCard
      title='Kitchen deep clean'
      due='Due Sat'
      repeat='Every week'
      footer={
        <Cycler>
          {MEMBERS.map(member => (
            <AssigneeChip
              key={member.name}
              name={member.name}
              color={member.color}
            />
          ))}
        </Cycler>
      }
    />

    <Box
      sx={{
        ...cardSx,
        px: 1.75,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          gap: `${AVATAR_GAP}px`,
        }}
      >
        {/* Selection ring hopping between members: the rotating assignee. */}
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            left: -4,
            width: AVATAR + 8,
            height: AVATAR + 8,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.500',
            animation: `ringHop ${CYCLE_MS}ms ${EASE} infinite both`,
            '@keyframes ringHop': {
              '0%, 28%': { transform: 'translateX(0)' },
              '33%, 61%': { transform: `translateX(${STEP}px)` },
              '66%, 94%': { transform: `translateX(${STEP * 2}px)` },
              '100%': { transform: 'translateX(0)' },
            },
          }}
        />
        {MEMBERS.map(member => (
          <Box
            key={member.name}
            sx={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.9375rem',
              fontWeight: 700,
              bgcolor: `${member.color}.softBg`,
              // The soft palettes' own text colours land near 2:1 on their
              // soft backgrounds; ink keeps the initials legible.
              color: 'text.primary',
            }}
          >
            {member.initial}
          </Box>
        ))}
      </Box>

      <Chip icon={<PeopleAltRounded />} color='neutral'>
        Takes turns
      </Chip>
    </Box>
  </Stage>
)

// One member's turn on the task, and one at a time. Slower than the shared
// CYCLE_MS so each hand-off has room to read.
const NAG_STEP_MS = 3000
const NAG_CYCLE_MS = NAG_STEP_MS * MEMBERS.length

// The history entry shown during any given member's turn is the *previous*
// member's completion — that's the hand-off that put the task on the current
// person's plate — so this is MEMBERS rotated back by one.
const NAG_HISTORY_ORDER = [MEMBERS[MEMBERS.length - 1], ...MEMBERS.slice(0, -1)]

// Each entry cycles through the same three depths — front, middle, back —
// then drops out just before its next lap re-enters at the front. With
// exactly one entry per member, "back" doubles as the cap on how many stay
// visible: a 4th completion would simply be this same motion continuing.
const historyStackKeyframes = {
  '0%': { opacity: 0, transform: 'translateY(-14px) scale(0.94)', zIndex: 3 },
  '6%': { opacity: 1, transform: 'translateY(0) scale(1)', zIndex: 3 },
  '27%': { opacity: 1, transform: 'translateY(0) scale(1)', zIndex: 3 },
  '33%': {
    opacity: 0.75,
    transform: 'translateY(10px) scale(0.94)',
    zIndex: 2,
  },
  '54%': {
    opacity: 0.75,
    transform: 'translateY(10px) scale(0.94)',
    zIndex: 2,
  },
  '60%': {
    opacity: 0.45,
    transform: 'translateY(20px) scale(0.88)',
    zIndex: 1,
  },
  '88%': {
    opacity: 0.45,
    transform: 'translateY(20px) scale(0.88)',
    zIndex: 1,
  },
  '100%': { opacity: 0, transform: 'translateY(30px) scale(0.82)', zIndex: 1 },
}

/**
 * A tighter cut of "share the load": just the task and whose turn it is.
 * The assignee chip and the history stack ride the same clock, offset by one
 * member, so each hand-off both moves the chip and drops that member's
 * completion onto the top of the stack — pushing the older ones back and
 * capping out at three before the oldest cycles away.
 */
export const TakesTurnsVignette = () => (
  <Stage>
    <MiniChoreCard
      title='🗑️ Take bins to the curb'
      due='Due Tomorrow'
      repeat='Every week'
      footer={
        <Cycler cycleMs={NAG_CYCLE_MS}>
          {MEMBERS.map(member => (
            <AssigneeChip
              key={member.name}
              name={member.name}
              color={member.color}
            />
          ))}
        </Cycler>
      }
    />

    <Box sx={{ position: 'relative', height: 88 }}>
      {NAG_HISTORY_ORDER.map((member, index) => (
        <Box
          key={member.name}
          sx={{
            ...cardSx,
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            overflow: 'hidden',
            animation: `historyStack ${NAG_CYCLE_MS}ms ${EASE} ${index * NAG_STEP_MS}ms infinite both`,
            '@keyframes historyStack': historyStackKeyframes,
          }}
        >
          <HistoryRow
            status='Completed'
            color='success'
            icon={<CheckRounded />}
            performer={member.name}
            meta='Just now · ★ 5 pts'
            divider={false}
          />
        </Box>
      ))}
    </Box>
  </Stage>
)

/* ------------------------------------- slide 5: widgets on the home screen */

// Home-screen widgets read as a separate material from in-app cards: rounder
// corners, a heavier shadow, no relationship to the page's own surfaces.
const widgetSx = {
  ...cardSx,
  borderRadius: 18,
  boxShadow: 'md',
  p: 1.5,
}

const float = (duration, delay) => ({
  animation: `widgetFloat ${duration}ms ease-in-out ${delay}ms infinite alternate`,
  '@keyframes widgetFloat': {
    from: { transform: 'translateY(4px)' },
    to: { transform: 'translateY(-6px)' },
  },
})

const WidgetTask = ({ name, time, done }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box
      sx={{
        flex: '0 0 auto',
        width: 15,
        height: 15,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        border: '1.5px solid',
        borderColor: done ? 'success.500' : 'neutral.outlinedBorder',
        bgcolor: done ? 'success.500' : 'transparent',
        color: 'common.white',
        '& svg': { fontSize: '10px' },
      }}
    >
      {done && <CheckRounded />}
    </Box>
    <Typography
      level='body-xs'
      noWrap
      sx={{
        flex: 1,
        minWidth: 0,
        fontWeight: 500,
        color: done ? 'text.tertiary' : 'text.primary',
        textDecoration: done ? 'line-through' : 'none',
      }}
    >
      {name}
    </Typography>
    <Typography
      level='body-xs'
      sx={{ fontSize: '0.625rem', color: 'text.tertiary' }}
    >
      {time}
    </Typography>
  </Box>
)

const TodayWidget = () => (
  <Box sx={{ ...widgetSx, ...float(3600, 0) }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
      <Typography
        level='body-xs'
        sx={{ flex: 1, fontWeight: 700, letterSpacing: '-0.01em' }}
      >
        Today
      </Typography>
      <Chip color='primary'>3 left</Chip>
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'primary.500',
          color: 'common.white',
          '& svg': { fontSize: '0.875rem' },
        }}
      >
        <AddRounded />
      </Box>
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.875 }}>
      <WidgetTask name='School forms' time='8:00' done />
      <WidgetTask name='Take out the trash' time='18:00' />
      <WidgetTask name='Water the plants' time='20:30' />
    </Box>
  </Box>
)

/* ------------------- notification banners, stacked over the Today widget */

const NotificationBanner = ({
  icon,
  color = 'primary',
  title,
  body,
  delay,
}) => (
  <Box
    sx={{
      ...cardSx,
      borderRadius: 16,
      boxShadow: 'md',
      px: 1.5,
      py: 1.25,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.25,
      animation: `bannerIn 560ms ${EASE} ${delay}ms both`,
      '@keyframes bannerIn': {
        from: { opacity: 0, transform: 'translateY(-14px) scale(0.96)' },
        to: { opacity: 1, transform: 'none' },
      },
    }}
  >
    <Box
      sx={{
        flex: '0 0 auto',
        width: 30,
        height: 30,
        borderRadius: '9px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: `${color}.softBg`,
        color: `${color}.plainColor`,
        '& svg': { fontSize: '1.125rem' },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography level='title-sm' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
        {title}
      </Typography>
      <Typography
        level='body-xs'
        sx={{ color: 'text.secondary', lineHeight: 1.4 }}
      >
        {body}
      </Typography>
    </Box>
  </Box>
)

/**
 * Retention in one picture: the two nudges that bring people back (a reminder
 * and a circle update) arriving over the home-screen widget they'll be glancing
 * at all day.
 */
export const RemindersVignette = () => (
  <Stage>
    <NotificationBanner
      icon={<NotificationsActiveRounded />}
      title='Take out the trash'
      body='Due in 30 minutes · Bin night'
      delay={160}
    />
    <NotificationBanner
      color='success'
      icon={<CheckRounded />}
      title='Amalie finished Kitchen deep clean'
      body='Your turn is next Saturday'
      delay={520}
    />
    <TodayWidget />
  </Stage>
)

/* -------------------------------------------- slide 1: the problem itself */

// The mess in your head, in the order it usually arrives: each item flies in
// from its own angle and lands in a tidy column. Base style is the landed
// state, so with reduced motion it's simply a neat list.
//
// Each row now mirrors CompactChoreCard's own grammar: a priority bar on the
// leading edge, an (unchecked, decorative) complete button, a frequency line,
// and a trailing label chip — the same signals, just in a self-contained card
// instead of a full-width list row.
const LITTLE_THINGS = [
  {
    label: 'Water bill',
    priority: 1,
    frequency: 'Monthly',
    tag: 'Bills',
    tagColor: '#5c6bc0',
    from: '-28px, 18px, -6deg',
  },
  {
    label: 'AC filter',
    priority: 2,
    frequency: 'Every 3 months',
    tag: 'Home',
    tagColor: '#26a69a',
    from: '30px, 22px, 5deg',
  },
  {
    label: 'Trash day',
    priority: 2,
    frequency: 'Every Monday',
    tag: 'Home',
    tagColor: '#26a69a',
    from: '-34px, 26px, -4deg',
  },
  {
    label: "Dog's medicine",
    priority: 1,
    frequency: 'Daily',
    tag: 'Pets',
    tagColor: '#ec407a',
    from: '26px, 30px, 6deg',
  },
  {
    label: 'Whose turn to cook',
    priority: 3,
    frequency: 'Weekly',
    tag: 'Cooking',
    tagColor: '#66bb6a',
    from: '-22px, 34px, -5deg',
  },
]

export const ProblemVignette = () => (
  <Stage>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {LITTLE_THINGS.map((thing, index) => (
        <Box
          key={thing.label}
          sx={{
            ...cardSx,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            pl: 1.75,
            pr: 1.25,
            py: 1,
            animation: `thingLand 620ms ${EASE} ${index * 130}ms both`,
            '@keyframes thingLand': {
              from: {
                opacity: 0,
                transform: `translate3d(${thing.from.split(',').slice(0, 2).join(',')}, 0) rotate(${thing.from.split(',')[2]})`,
              },
              to: { opacity: 1, transform: 'none' },
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              bgcolor: getPriorityColor(thing.priority),
            },
          }}
        >
          <Box
            aria-hidden='true'
            sx={{
              flex: '0 0 auto',
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'neutral.outlinedBorder',
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              level='title-sm'
              noWrap
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              {thing.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.375 }}>
              <Repeat sx={{ fontSize: 12, color: 'text.tertiary' }} />
              <Typography
                level='body-xs'
                sx={{ color: 'text.tertiary', fontSize: '0.6875rem' }}
              >
                {thing.frequency}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              flex: '0 0 auto',
              px: 0.875,
              py: 0.125,
              borderRadius: '999px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
              bgcolor: thing.tagColor,
              color: getTextColorFromBackgroundColor(thing.tagColor),
            }}
          >
            {thing.tag}
          </Box>
        </Box>
      ))}
    </Box>
  </Stage>
)
