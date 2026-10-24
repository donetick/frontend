import { Add, Close } from '@mui/icons-material'
import { Box, CircularProgress, IconButton, Input } from '@mui/joy'
import moment from 'moment'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AssigneePickerField from '../AssigneePickerField'
import DueDatePickerField from '../DueDatePickerField'
import LabelsPickerField from '../LabelsPickerField'
import PriorityPickerField from '../PriorityPickerField'
import RepeatPickerField from '../RepeatPickerField'
import { parseVoiceTask } from './parseVoiceTask'
import { PRIORITY_COLORS, PRIORITY_LABELS } from './taskPreviewHelpers'

const EMPTY_PARSED = {
  assignees: [],
  dueDate: null,
  frequency: null,
  frequencyName: null,
  isAnyone: false,
  labelIds: [],
  labelNames: [],
  points: null,
  priority: 0,
  title: '',
}

// Typed sibling of VoicePanel's TaskPreviewCard — same parsing and picker
// fields, just driven by a live text field instead of a committed transcript
// segment. The picker row stays visible the whole time (same as AddTaskModal's
// smart field), not behind a toggle. Clears itself after each successful
// submit so adding several tasks in a row is just Enter, Enter, Enter.
const TaskComposerRow = ({
  currentUserId,
  defaultNotificationTemplates = [],
  members = [],
  onCancel,
  onMoreOptions,
  onSubmit,
  placeholder,
  userLabels = [],
}) => {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [overrides, setOverrides] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dueEditRef = useRef(null)

  const parseCtx = useMemo(
    () => ({ currentUserId, members, userLabels }),
    [currentUserId, members, userLabels],
  )

  const parsed = useMemo(
    () => (text.trim() ? parseVoiceTask(text, parseCtx) : EMPTY_PARSED),
    [text, parseCtx],
  )

  const effective = useMemo(
    () => ({
      ...parsed,
      notificationMetadata: { templates: defaultNotificationTemplates },
      ...overrides,
    }),
    [parsed, overrides, defaultNotificationTemplates],
  )

  const due = effective.dueDate ? moment(effective.dueDate) : null
  const dueDateOnly = due ? due.format('YYYY-MM-DD') : null
  const hasCustomTime = !!due && due.format('HH:mm') !== '23:59'
  const dueTime = hasCustomTime ? due.format('HH:mm') : null

  // DueDatePickerField's Apply fires date/custom-time/time callbacks in
  // sequence; collect them in one microtask so they land as a single patch.
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
        setOverrides(o => ({
          ...o,
          dueDate: !date
            ? null
            : custom && time
              ? moment(`${date}T${time}`).format('YYYY-MM-DDTHH:mm:00')
              : moment(date).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        }))
      })
    }
    Object.assign(dueEditRef.current, patch)
  }

  const reset = () => {
    setText('')
    setOverrides({})
  }

  const handleSubmit = async () => {
    const title = parsed.title.trim()
    if (!title || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({ ...effective, title })
      reset()
    } catch {
      // Leave the draft (text + overrides) in place so the user can retry.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mx: 1, mt: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Input
          autoFocus
          size='sm'
          placeholder={placeholder}
          value={text}
          disabled={isSubmitting}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            }
            if (event.key === 'Escape') {
              reset()
              onCancel()
            }
          }}
          startDecorator={
            isSubmitting ? (
              <CircularProgress
                size='sm'
                sx={{ '--CircularProgress-size': '14px' }}
              />
            ) : (
              <Add sx={{ fontSize: 16 }} />
            )
          }
          sx={{ flex: 1 }}
        />
        <IconButton
          aria-label={t('chores:board.closeAddTask')}
          size='sm'
          variant='plain'
          color='neutral'
          onClick={() => {
            reset()
            onCancel()
          }}
        >
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
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
          onDueDateChange={e => queueDuePatch({ date: e.target.value || null })}
          onDueTimeChange={e => queueDuePatch({ time: e.target.value || null })}
          onUseCustomTimeChange={checked => queueDuePatch({ custom: checked })}
          onClear={() => setOverrides(o => ({ ...o, dueDate: null }))}
        />
        <RepeatPickerField
          emptyDisplay='icon'
          value={effective.frequency}
          onChange={f => setOverrides(o => ({ ...o, frequency: f }))}
          onClear={() => setOverrides(o => ({ ...o, frequency: null }))}
        />
        <PriorityPickerField
          emptyDisplay='icon'
          value={effective.priority}
          onChange={p => setOverrides(o => ({ ...o, priority: p }))}
          onClear={() => setOverrides(o => ({ ...o, priority: 0 }))}
          priorityColors={PRIORITY_COLORS}
          priorityLabels={PRIORITY_LABELS}
        />
        <AssigneePickerField
          emptyDisplay='icon'
          values={effective.assignees.map(a => a.userId)}
          isAnyone={effective.isAnyone}
          onChange={userIds => {
            if (userIds.includes('anyone')) {
              setOverrides(o => ({ ...o, assignees: [], isAnyone: true }))
            } else {
              setOverrides(o => ({
                ...o,
                assignees: userIds.map(userId => ({ userId })),
                isAnyone: false,
              }))
            }
          }}
          onClear={() =>
            setOverrides(o => ({ ...o, assignees: [], isAnyone: false }))
          }
          members={members}
        />
        <LabelsPickerField
          emptyDisplay='icon'
          values={effective.labelIds}
          onChange={ids => setOverrides(o => ({ ...o, labelIds: ids }))}
          onClear={() => setOverrides(o => ({ ...o, labelIds: [] }))}
          labels={userLabels}
        />
      </Box>

      {onMoreOptions && (
        <Box
          component='span'
          sx={{
            alignSelf: 'flex-start',
            color: 'text.tertiary',
            cursor: 'pointer',
            fontSize: 'xs',
            '&:hover': { textDecoration: 'underline' },
          }}
          onClick={() => {
            reset()
            onMoreOptions()
          }}
        >
          {t('chores:board.moreOptions')}
        </Box>
      )}
    </Box>
  )
}

export default TaskComposerRow
