import {
  AddRounded,
  CheckRounded,
  ContactlessRounded,
  DocumentScannerOutlined,
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
const STEP_MS = CYCLE_MS / 3

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

/**
 * ChoreCard in miniature: the chips ride on top of the card's edge exactly as
 * they do in the task list.
 */
const MiniChoreCard = ({
  title,
  due,
  dueColor = 'primary',
  repeat,
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
          {title}
        </Typography>
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
const Cycler = ({ children, sx }) => {
  const items = Array.isArray(children) ? children : [children]
  const count = items.length
  const step = CYCLE_MS / count
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
            animation: `${name} ${CYCLE_MS}ms ${EASE} ${index * step}ms infinite both`,
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
      animation: `sourcePulse ${CYCLE_MS}ms ${EASE} ${index * STEP_MS}ms infinite forwards`,
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

export const CaptureVignette = () => (
  <Stage>
    <Box sx={{ display: 'flex', gap: 1 }}>
      {SOURCES.map((source, index) => (
        <SourcePill key={source.label} index={index} {...source} />
      ))}
    </Box>

    <Cycler>
      <CaptureVariant
        icon={<MicNoneRounded />}
        caption='Dates, labels and points from your words'
        card={
          <MiniChoreCard
            title='Take out the trash'
            due='Due tomorrow'
            repeat='Every Monday'
          />
        }
      />
      <CaptureVariant
        icon={<PhoneIphoneRounded />}
        caption='Read on your device'
        card={
          <MiniChoreCard
            title='Pay the water bill'
            due='Due Aug 3'
            dueColor='warning'
          />
        }
      />
      <CaptureVariant
        icon={<KeyboardRounded />}
        caption='#labels @people *points as you type'
        card={
          <MiniChoreCard
            title='Change the AC filter'
            due='Due Fri'
            repeat='Every 3 months'
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
const HistoryRow = ({ status, color, icon, note, meta, performer }) => (
  <Box
    sx={{
      display: 'flex',
      bgcolor: 'background.body',
      borderBottom: '1px solid',
      borderColor: 'divider',
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

const CAPTURE_TILES = [
  { icon: <KeyboardRounded />, label: 'Type' },
  { icon: <DocumentScannerOutlined />, label: 'Scan' },
  { icon: <MicNoneRounded />, label: 'Speak' },
]

export const WidgetsVignette = () => (
  <Stage>
    <Box sx={{ ...widgetSx, ...float(3600, 0) }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1.25,
        }}
      >
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

    {/* Quick capture: the same three inputs as slide one, one tap from the
        home screen. Offset so the two widgets read as separate objects. */}
    <Box
      sx={{
        ...widgetSx,
        mx: 2,
        display: 'flex',
        gap: 1,
        ...float(4400, 600),
      }}
    >
      {CAPTURE_TILES.map(tile => (
        <Box
          key={tile.label}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            py: 0.75,
            borderRadius: '12px',
            bgcolor: 'primary.softBg',
            color: 'primary.plainColor',
            fontSize: '0.625rem',
            fontWeight: 600,
            '& svg': { fontSize: '1.125rem' },
          }}
        >
          {tile.icon}
          {tile.label}
        </Box>
      ))}
    </Box>
  </Stage>
)

/* ------------------------------------------------ slide 6: notifications */

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

export const NotificationsVignette = () => (
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
    <NotificationBanner
      color='warning'
      icon={<HourglassEmptyRounded />}
      title='Sam needs your approval'
      body='Vacuum the stairs · marked done'
      delay={880}
    />
  </Stage>
)
