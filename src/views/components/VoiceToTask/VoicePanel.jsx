import './VoicePanel.css'

import {
  CalendarMonth,
  Check,
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
import { useEffect, useMemo, useRef, useState } from 'react'

import { TASK_COLOR } from '../../../utils/Colors'
import AssigneePickerField from '../AssigneePickerField'
import DueDatePickerField from '../DueDatePickerField'
import LabelsPickerField from '../LabelsPickerField'
import PriorityPickerField from '../PriorityPickerField'
import RepeatPickerField from '../RepeatPickerField'
import { parseVoiceTask } from './parseVoiceTask'
import { useVoiceToTask } from './useVoiceToTask'

const HIGHLIGHT_CLASS = {
  repeat: 'highlight-repeat',
  priority: 'highlight-priority',
  points: 'highlight-points',
  assignee: 'highlight-assignee',
  label: 'highlight-label',
  dueDate: 'highlight-date',
}

const PRIORITY_COLORS = {
  0: TASK_COLOR.NO_PRIORITY,
  1: TASK_COLOR.PRIORITY_1,
  2: TASK_COLOR.PRIORITY_2,
  3: TASK_COLOR.PRIORITY_3,
  4: TASK_COLOR.PRIORITY_4,
}

const PRIORITY_LABELS = {
  0: '--',
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
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

// Compact description for picker-overridden frequencies where the parser's
// human name no longer applies
const describeFrequency = f => {
  if (!f) return null
  if (f.frequencyType === 'interval') {
    const unit = f.frequencyMetadata?.unit || 'days'
    return f.frequency > 1
      ? `Every ${f.frequency} ${unit}`
      : `Every ${unit.replace(/s$/, '')}`
  }
  const names = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    days_of_the_week: 'Custom days',
    day_of_the_month: 'Monthly',
  }
  return names[f.frequencyType] || 'Repeats'
}

const buildChips = (effective, frequencyLabel, { currentUserId, members }) => {
  const chips = []
  if (effective.dueDate) {
    chips.push({
      key: 'due',
      color: 'warning',
      icon: <CalendarMonth sx={{ fontSize: 12 }} />,
      label: formatDue(effective.dueDate),
    })
  }
  if (frequencyLabel) {
    chips.push({
      key: 'repeat',
      color: 'success',
      icon: <Repeat sx={{ fontSize: 12 }} />,
      label: frequencyLabel,
    })
  }
  if (effective.priority > 0) {
    chips.push({
      key: 'priority',
      color: 'danger',
      icon: <Flag sx={{ fontSize: 12 }} />,
      label: `P${effective.priority}`,
    })
  }
  if (effective.points != null) {
    chips.push({
      key: 'points',
      color: 'primary',
      icon: <Toll sx={{ fontSize: 12 }} />,
      label: `${effective.points} pts`,
    })
  }
  effective.labelNames.forEach(name => {
    chips.push({
      key: `label-${name}`,
      color: 'primary',
      icon: <Sell sx={{ fontSize: 12 }} />,
      label: name,
    })
  })
  if (effective.isAnyone) {
    chips.push({
      key: 'assignee',
      color: 'neutral',
      icon: <Person sx={{ fontSize: 12 }} />,
      label: 'Anyone',
    })
  } else if (
    effective.assignees.length > 0 &&
    effective.assignees[0].userId !== currentUserId
  ) {
    const member = members.find(m => m.userId === effective.assignees[0].userId)
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

const TaskPreviewCard = ({
  onPatch,
  onRemove,
  onUpdate,
  parseCtx,
  segment,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(segment.text)
  const dueEditRef = useRef(null)

  const parsed = useMemo(
    () => parseVoiceTask(segment.text, parseCtx),
    [segment.text, parseCtx],
  )
  const overrides = useMemo(() => segment.overrides || {}, [segment.overrides])
  const effective = useMemo(
    () => ({ ...parsed, ...overrides }),
    [parsed, overrides],
  )

  const frequencyLabel =
    'frequency' in overrides
      ? describeFrequency(effective.frequency)
      : parsed.frequencyName
  const chips = useMemo(
    () => buildChips(effective, frequencyLabel, parseCtx),
    [effective, frequencyLabel, parseCtx],
  )

  const due = effective.dueDate ? moment(effective.dueDate) : null
  const dueDateOnly = due ? due.format('YYYY-MM-DD') : null
  const hasCustomTime = !!due && due.format('HH:mm') !== '23:59'
  const dueTime = hasCustomTime ? due.format('HH:mm') : null

  // DueDatePickerField's Apply fires date/custom-time/time callbacks in
  // sequence; collect them in one microtask so they land as a single patch
  const queueDuePatch = patch => {
    if (!dueEditRef.current) {
      dueEditRef.current = {
        date: dueDateOnly,
        time: dueTime,
        custom: hasCustomTime,
      }
      queueMicrotask(() => {
        const { custom, date, time } = dueEditRef.current
        dueEditRef.current = null
        if (!date) {
          onPatch({ dueDate: null })
        } else {
          onPatch({
            dueDate:
              custom && time
                ? moment(`${date}T${time}`).format('YYYY-MM-DDTHH:mm:00')
                : moment(date).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
          })
        }
      })
    }
    Object.assign(dueEditRef.current, patch)
  }

  const commitText = () => {
    if (draft.trim() !== segment.text) onUpdate(draft)
  }

  return (
    <Box
      className='voice-task-card'
      sx={{
        borderRadius: 'md',
        border: '1px solid',
        borderColor: expanded ? 'primary.outlinedBorder' : 'divider',
        bgcolor: 'background.surface',
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {expanded ? (
          <Input
            size='sm'
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText()
              if (e.key === 'Escape') setDraft(segment.text)
            }}
            onBlur={commitText}
            sx={{ flex: 1 }}
          />
        ) : (
          <Typography
            level='title-sm'
            sx={{ flex: 1, cursor: 'pointer', wordBreak: 'break-word' }}
            onClick={() => {
              setDraft(segment.text)
              setExpanded(true)
            }}
          >
            {parsed.title || segment.text}
          </Typography>
        )}
        {expanded && (
          <IconButton
            size='sm'
            variant='soft'
            color='primary'
            onClick={() => {
              commitText()
              setExpanded(false)
            }}
            sx={{ '--IconButton-size': '28px' }}
          >
            <Check fontSize='small' />
          </IconButton>
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

      {!expanded && chips.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            cursor: 'pointer',
          }}
          onClick={() => {
            setDraft(segment.text)
            setExpanded(true)
          }}
        >
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

      {expanded && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            overflowX: 'auto',
            pt: 0.5,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <DueDatePickerField
            emptyDisplay='icon'
            dueDateOnly={dueDateOnly}
            dueTime={dueTime}
            useCustomTime={hasCustomTime}
            onDueDateChange={e =>
              queueDuePatch({ date: e.target.value || null })
            }
            onDueTimeChange={e =>
              queueDuePatch({ time: e.target.value || null })
            }
            onUseCustomTimeChange={checked =>
              queueDuePatch({ custom: checked })
            }
            onClear={() => onPatch({ dueDate: null })}
          />
          <RepeatPickerField
            emptyDisplay='icon'
            value={effective.frequency}
            onChange={f => onPatch({ frequency: f })}
            onClear={() => onPatch({ frequency: null })}
          />
          <PriorityPickerField
            emptyDisplay='icon'
            value={effective.priority}
            onChange={p => onPatch({ priority: p })}
            onClear={() => onPatch({ priority: 0 })}
            priorityColors={PRIORITY_COLORS}
            priorityLabels={PRIORITY_LABELS}
          />
          <AssigneePickerField
            emptyDisplay='icon'
            values={effective.assignees.map(a => a.userId)}
            isAnyone={effective.isAnyone}
            onChange={userIds => {
              if (userIds.includes('anyone')) {
                onPatch({ isAnyone: true, assignees: [] })
              } else {
                onPatch({
                  isAnyone: false,
                  assignees: userIds.map(userId => ({ userId })),
                })
              }
            }}
            onClear={() => onPatch({ isAnyone: false, assignees: [] })}
            currentUserId={parseCtx.currentUserId}
            members={parseCtx.members}
          />
          <LabelsPickerField
            emptyDisplay='icon'
            values={effective.labelIds}
            onChange={ids => onPatch({ labelIds: ids })}
            onClear={() => onPatch({ labelIds: [] })}
            labels={parseCtx.userLabels}
          />
        </Box>
      )}
    </Box>
  )
}

/**
 * Inline voice-to-task panel. Mounts inside AddTaskModal — no second modal.
 *
 * Mounted only while voice capture is active, and opens straight into
 * hands-free listening. Pauses and spoken separators ("also") split the
 * transcript into task cards; tapping a card opens inline pickers whose edits
 * override the parsed values. The confirm action lives in the modal footer
 * alongside Cancel — this panel only reports its state up through
 * onStateChange so the modal can label and enable that button.
 */
const VoicePanel = ({
  members = [],
  onStateChange,
  userLabels = [],
  userProfile,
}) => {
  const {
    isLocked,
    isNative,
    micPressDown,
    micPressUp,
    partialText,
    patchSegment,
    phase,
    removeSegment,
    segments,
    startHandsFree,
    updateSegment,
  } = useVoiceToTask({ members, userLabels })
  const segmentsScrollRef = useRef(null)

  const parseCtx = useMemo(
    () => ({ userLabels, members, currentUserId: userProfile?.id }),
    [userLabels, members, userProfile?.id],
  )

  const partialParsed = useMemo(
    () => (partialText ? parseVoiceTask(partialText, parseCtx) : null),
    [partialText, parseCtx],
  )

  // Start capturing the moment the panel mounts — the mic tap that opened it
  // is the only tap needed. startHandsFree no-ops if already listening.
  useEffect(() => {
    startHandsFree()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the newest captured task visible as more are added
  useEffect(() => {
    const el = segmentsScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [segments.length])

  const isListening = phase === 'listening'

  // The confirm action lives in the modal footer, so report the raw segments
  // and whether the mic is live — that's all it needs to label and enable the
  // button. It parses the segments itself when the user confirms.
  useEffect(() => {
    onStateChange?.({ segments, isListening })
  }, [segments, isListening, onStateChange])

  const micCaption = isListening
    ? isLocked
      ? 'Listening — tap to stop'
      : 'Release to finish · quick tap locks hands-free'
    : segments.length > 0
      ? 'Hold to add another task'
      : 'Hold to speak · quick tap for hands-free'

  return (
    <Box>
      {/* ── Header ── */}
      <Box
        sx={{
          pt: 0.5,
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
        <Box sx={{ py: 2 }}>
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
            onClick={startHandsFree}
          >
            Try Again
          </Button>
        </Box>
      )}

      {/* ── Captured task cards ── */}
      {segments.length > 0 && (
        <Box
          ref={segmentsScrollRef}
          sx={{
            pt: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            maxHeight: 300,
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
              onPatch={patch => patchSegment(segment.id, patch)}
            />
          ))}
        </Box>
      )}

      {/* ── Live transcript ── */}
      {isListening && (
        <Box sx={{ pt: 1.25 }}>
          <Box
            sx={{
              minHeight: 44,
              borderRadius: 'md',
              border: '1px dashed',
              borderColor: 'neutral.outlinedBorder',
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
            Pause between tasks &middot; say &ldquo;scratch that&rdquo; to
            remove the last one
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default VoicePanel
