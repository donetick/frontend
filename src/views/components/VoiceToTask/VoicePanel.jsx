import './VoicePanel.css'

import {
  Check,
  Close,
  GraphicEq,
  Lock,
  Mic,
  WarningAmber,
} from '@mui/icons-material'
import { Box, Button, Chip, IconButton, Input, Typography } from '@mui/joy'
import moment from 'moment'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AssigneePickerField from '../AssigneePickerField'
import DueDatePickerField from '../DueDatePickerField'
import LabelsPickerField from '../LabelsPickerField'
import NotificationPickerField from '../NotificationPickerField'
import PriorityPickerField from '../PriorityPickerField'
import RepeatPickerField from '../RepeatPickerField'
import { parseVoiceTask } from './parseVoiceTask'
import {
  buildChips,
  describeFrequency,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from './taskPreviewHelpers'
import { useVoiceToTask } from './useVoiceToTask'

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

const TaskPreviewCard = ({
  onPatch,
  onRemove,
  onUpdate,
  parseCtx,
  segment,
}) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(segment.text)
  const dueEditRef = useRef(null)

  const parsed = useMemo(
    () => parseVoiceTask(segment.text, parseCtx),
    [segment.text, parseCtx],
  )
  const overrides = useMemo(() => segment.overrides || {}, [segment.overrides])
  // The parser has no notion of reminders, so the account default stands in
  // until the card overrides it — same fallback buildChorePayload applies
  const effective = useMemo(
    () => ({
      ...parsed,
      notificationMetadata: {
        templates: parseCtx.defaultNotificationTemplates || [],
      },
      ...overrides,
    }),
    [parsed, overrides, parseCtx.defaultNotificationTemplates],
  )

  const frequencyLabel =
    'frequency' in overrides
      ? describeFrequency(effective.frequency, t)
      : parsed.frequencyName
  const chips = useMemo(
    () => buildChips(effective, frequencyLabel, parseCtx, t),
    [effective, frequencyLabel, parseCtx, t],
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
            mt: 1,
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
            members={parseCtx.members}
          />
          <LabelsPickerField
            emptyDisplay='icon'
            values={effective.labelIds}
            onChange={ids => onPatch({ labelIds: ids })}
            onClear={() => onPatch({ labelIds: [] })}
            labels={parseCtx.userLabels}
          />
          <NotificationPickerField
            emptyDisplay='icon'
            value={effective.notificationMetadata}
            onChange={metadata => onPatch({ notificationMetadata: metadata })}
            onClear={() => onPatch({ notificationMetadata: { templates: [] } })}
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
  defaultNotificationTemplates = [],
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
  const { t } = useTranslation()

  const parseCtx = useMemo(
    () => ({
      userLabels,
      members,
      currentUserId: userProfile?.id,
      defaultNotificationTemplates,
    }),
    [userLabels, members, userProfile, defaultNotificationTemplates],
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
      ? t('chores:voiceToTask.captionListeningLocked')
      : t('chores:voiceToTask.captionReleaseToFinish')
    : segments.length > 0
      ? t('chores:voiceToTask.captionHoldToAddAnother')
      : t('chores:voiceToTask.captionHoldToSpeak')

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
        <Typography level='title-sm'>
          {t('chores:voiceToTask.title')}
        </Typography>
        {isNative && (
          <Chip
            size='sm'
            variant='soft'
            color='success'
            startDecorator={<Lock sx={{ fontSize: 12 }} />}
            sx={{ ml: 'auto' }}
          >
            {t('chores:voiceToTask.onDevice')}
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
              {t('chores:voiceToTask.micDeniedMessage')}
            </Typography>
          </Box>
          <Button
            size='sm'
            variant='outlined'
            color='neutral'
            onClick={startHandsFree}
          >
            {t('chores:voiceToTask.tryAgain')}
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
                {t('chores:voiceToTask.listening')}
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
            aria-label={
              isListening
                ? t('chores:voiceToTask.stopListening')
                : t('chores:voiceToTask.startVoiceCapture')
            }
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
            {t('chores:voiceToTask.hint')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default VoicePanel
