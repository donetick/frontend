import {
  CalendarMonth,
  Close,
  Flag,
  GraphicEq,
  Lock,
  Mic,
  Person,
  Repeat,
  Sell,
  Toll,
  WarningAmber,
} from '@mui/icons-material'
import { Box, Button, Chip, IconButton, Input, Typography } from '@mui/joy'
import moment from 'moment'
import { useMemo, useState } from 'react'
import { parseVoiceTask } from './parseVoiceTask'
import { useVoiceToTask } from './useVoiceToTask'
import './VoicePanel.css'

const HIGHLIGHT_CLASS = {
  repeat: 'highlight-repeat',
  priority: 'highlight-priority',
  points: 'highlight-points',
  assignee: 'highlight-assignee',
  label: 'highlight-label',
  dueDate: 'highlight-date',
}

const renderTranscript = (text, highlights) => {
  const parts = []
  let lastIndex = 0
  for (const h of highlights) {
    if (h.start > lastIndex) parts.push(text.substring(lastIndex, h.start))
    parts.push(
      <span
        key={h.start}
        className={HIGHLIGHT_CLASS[h.type]}
        style={{
          textDecoration: 'underline',
          textDecorationThickness: '2px',
          textDecorationStyle: 'dashed',
        }}
      >
        {text.substring(h.start, h.end)}
      </span>,
    )
    lastIndex = h.end
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex))
  return parts
}

const formatDue = dueDate => {
  const m = moment(dueDate)
  return m.format('HH:mm') === '23:59'
    ? m.format('MMM D')
    : m.format('MMM D, h:mm A')
}

const buildChips = (parsed, { members, currentUserId }) => {
  const chips = []
  if (parsed.dueDate) {
    chips.push({
      key: 'due',
      color: 'warning',
      icon: <CalendarMonth sx={{ fontSize: 12 }} />,
      label: formatDue(parsed.dueDate),
    })
  }
  if (parsed.frequencyName) {
    chips.push({
      key: 'repeat',
      color: 'success',
      icon: <Repeat sx={{ fontSize: 12 }} />,
      label: parsed.frequencyName,
    })
  }
  if (parsed.priority > 0) {
    chips.push({
      key: 'priority',
      color: 'danger',
      icon: <Flag sx={{ fontSize: 12 }} />,
      label: `P${parsed.priority}`,
    })
  }
  if (parsed.points != null) {
    chips.push({
      key: 'points',
      color: 'primary',
      icon: <Toll sx={{ fontSize: 12 }} />,
      label: `${parsed.points} pts`,
    })
  }
  parsed.labelNames.forEach(name => {
    chips.push({
      key: `label-${name}`,
      color: 'primary',
      icon: <Sell sx={{ fontSize: 12 }} />,
      label: name,
    })
  })
  if (parsed.isAnyone) {
    chips.push({
      key: 'assignee',
      color: 'neutral',
      icon: <Person sx={{ fontSize: 12 }} />,
      label: 'Anyone',
    })
  } else if (
    parsed.assignees.length > 0 &&
    parsed.assignees[0].userId !== currentUserId
  ) {
    const member = members.find(m => m.userId === parsed.assignees[0].userId)
    if (member) {
      chips.push({
        key: 'assignee',
        color: 'neutral',
        icon: <Person sx={{ fontSize: 12 }} />,
        label: member.displayName,
      })
    }
  }
  return chips
}

const TaskPreviewCard = ({ segment, parseCtx, onRemove, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(segment.text)

  const parsed = useMemo(
    () => parseVoiceTask(segment.text, parseCtx),
    [segment.text, parseCtx],
  )
  const chips = useMemo(() => buildChips(parsed, parseCtx), [parsed, parseCtx])

  const commitEdit = () => {
    setEditing(false)
    if (draft.trim() !== segment.text) onUpdate(draft)
  }

  return (
    <Box
      className='voice-task-card'
      sx={{
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {editing ? (
          <Input
            size='sm'
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') {
                setDraft(segment.text)
                setEditing(false)
              }
            }}
            onBlur={commitEdit}
            sx={{ flex: 1 }}
          />
        ) : (
          <Typography
            level='title-sm'
            sx={{ flex: 1, cursor: 'text', wordBreak: 'break-word' }}
            onClick={() => {
              setDraft(segment.text)
              setEditing(true)
            }}
          >
            {parsed.title || segment.text}
          </Typography>
        )}
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          onClick={onRemove}
          sx={{ '--IconButton-size': '28px' }}
        >
          <Close fontSize='small' />
        </IconButton>
      </Box>
      {chips.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {chips.map(chip => (
            <Chip
              key={chip.key}
              size='sm'
              variant='soft'
              color={chip.color}
              startDecorator={chip.icon}
            >
              {chip.label}
            </Chip>
          ))}
        </Box>
      )}
    </Box>
  )
}

/**
 * Inline voice-to-task panel. Mounts inside AddTaskModal — no second modal.
 *
 * Hold the mic to speak, or tap once for hands-free. Pauses and spoken
 * separators ("also") split the transcript into task cards. A single captured
 * task lands in the smart input for review; multiple tasks are created
 * directly from the review list.
 */
const VoicePanel = ({
  open,
  userLabels = [],
  members = [],
  userProfile,
  onClose,
  onUseSingle,
  onCreateMany,
}) => {
  const {
    phase,
    isLocked,
    partialText,
    segments,
    micPressDown,
    micPressUp,
    startListening,
    removeSegment,
    updateSegment,
    reset,
    isNative,
  } = useVoiceToTask({ members })
  const [creating, setCreating] = useState(false)

  const parseCtx = useMemo(
    () => ({ userLabels, members, currentUserId: userProfile?.id }),
    [userLabels, members, userProfile?.id],
  )

  const partialParsed = useMemo(
    () => (partialText ? parseVoiceTask(partialText, parseCtx) : null),
    [partialText, parseCtx],
  )

  if (!open) return null

  const isListening = phase === 'listening'
  const showActions = segments.length > 0 && !isListening && !creating

  const handleCancel = () => {
    reset()
    onClose()
  }

  const handleCreateAll = async () => {
    setCreating(true)
    try {
      await onCreateMany(segments.map(s => parseVoiceTask(s.text, parseCtx)))
    } finally {
      setCreating(false)
    }
  }

  const micCaption = isListening
    ? isLocked
      ? 'Listening — tap to stop'
      : 'Release to finish · quick tap locks hands-free'
    : segments.length > 0
      ? 'Hold to add another task'
      : 'Hold to speak · quick tap for hands-free'

  return (
    <Box
      sx={{
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'primary.outlinedBorder',
        overflow: 'hidden',
        bgcolor: 'background.level1',
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: 1.5,
          pt: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <GraphicEq color='primary' fontSize='small' />
        <Typography level='title-sm'>Speak your tasks</Typography>
        {isNative && (
          <Chip
            size='sm'
            variant='soft'
            color='success'
            startDecorator={<Lock sx={{ fontSize: 12 }} />}
            sx={{ ml: 'auto' }}
          >
            On-device
          </Chip>
        )}
      </Box>

      {/* ── Permission denied ── */}
      {phase === 'denied' && (
        <Box sx={{ p: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}
          >
            <WarningAmber color='warning' sx={{ mt: 0.25, flexShrink: 0 }} />
            <Typography level='body-sm'>
              Microphone access is needed for voice capture. Enable it in your
              device settings and try again.
            </Typography>
          </Box>
          <Button
            size='sm'
            variant='outlined'
            color='neutral'
            onClick={startListening}
          >
            Try Again
          </Button>
        </Box>
      )}

      {/* ── Captured task cards ── */}
      {segments.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            pt: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {segments.map(segment => (
            <TaskPreviewCard
              key={segment.id}
              segment={segment}
              parseCtx={parseCtx}
              onRemove={() => removeSegment(segment.id)}
              onUpdate={text => updateSegment(segment.id, text)}
            />
          ))}
        </Box>
      )}

      {/* ── Live transcript ── */}
      {isListening && (
        <Box sx={{ px: 1.5, pt: 1.25 }}>
          <Box
            sx={{
              minHeight: 44,
              borderRadius: 'md',
              border: '1px dashed',
              borderColor: 'neutral.outlinedBorder',
              bgcolor: 'background.surface',
              px: 1.25,
              py: 1,
            }}
          >
            {partialText ? (
              <Typography level='body-md' sx={{ wordBreak: 'break-word' }}>
                {renderTranscript(partialText, partialParsed?.highlights || [])}
              </Typography>
            ) : (
              <Typography level='body-sm' sx={{ opacity: 0.5 }}>
                Listening…
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* ── Mic stage ── */}
      {phase !== 'denied' && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 1.25,
          }}
        >
          <div className='voice-eq' style={{ opacity: isListening ? 1 : 0 }}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <button
            type='button'
            aria-label={isListening ? 'Stop listening' : 'Start voice capture'}
            className={`voice-mic-btn${isListening ? ' listening' : ''}`}
            onPointerDown={e => {
              e.preventDefault()
              e.currentTarget.setPointerCapture?.(e.pointerId)
              micPressDown()
            }}
            onPointerUp={micPressUp}
            onPointerCancel={micPressUp}
            onContextMenu={e => e.preventDefault()}
          >
            <span className='voice-pulse-ring' />
            <span className='voice-pulse-ring' />
            <Mic sx={{ fontSize: 32 }} />
          </button>
          <Typography level='body-xs' sx={{ opacity: 0.7 }}>
            {micCaption}
          </Typography>
          <Typography
            level='body-xs'
            sx={{ opacity: 0.5, px: 2, textAlign: 'center' }}
          >
            Pause or say &ldquo;also&rdquo; between tasks &middot; say
            &ldquo;scratch that&rdquo; to remove the last one
          </Typography>
        </Box>
      )}

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          size='sm'
          variant='plain'
          color='neutral'
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {creating && (
            <Button size='sm' variant='solid' color='primary' loading>
              Creating…
            </Button>
          )}
          {showActions &&
            (segments.length === 1 ? (
              <Button
                size='sm'
                variant='solid'
                color='primary'
                onClick={() => onUseSingle(segments[0].text)}
              >
                Use Task
              </Button>
            ) : (
              <Button
                size='sm'
                variant='solid'
                color='primary'
                onClick={handleCreateAll}
              >
                Create {segments.length} Tasks
              </Button>
            ))}
        </Box>
      </Box>
    </Box>
  )
}

export default VoicePanel
