import { Check } from '@mui/icons-material'
import { Box, Button, Card, Typography } from '@mui/joy'
import * as chrono from 'chrono-node'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AssigneePickerField from '../components/AssigneePickerField'
import {
  parseAssignees,
  parseDueDate,
  parseLabels,
  parsePriority,
  parseRepeatV2,
} from '../components/CustomParsers'
import DueDatePickerField from '../components/DueDatePickerField'
import LabelsPickerField from '../components/LabelsPickerField'
import PriorityPickerField from '../components/PriorityPickerField'
import RepeatPickerField from '../components/RepeatPickerField'

// Fake circle/labels so the real parsers + picker fields have something to
// match against, without hitting any API.
const DEMO_LABELS = [
  { id: 'house', name: 'House', color: '#3b82f6' },
  { id: 'garage', name: 'Garage', color: '#f59e0b' },
  { id: 'car', name: 'Car', color: '#10b981' },
  { id: 'maintenance', name: 'Maintenance', color: '#8b5cf6' },
]
const DEMO_MEMBERS = [{ userId: 'sarah', displayName: 'Sarah' }, { userId: 'ryan', displayName: 'Ryan' }]

const EXAMPLES = [
  '🗑️ Take out the trash every Tuesday and Thursday #house @anyone',
  // '💰 Pay rent on the 1st of every month !p1',
  '🚗 Schedule car oil change !p2 on the 1st of Jan, April, July and October #car #maintenance',
  // '🛒 Buy groceries on Saturday #house @anyone',
  '🌱 Water the plants tomorrow @sarah',
  ' Change HVAC filter every 12 weeks !p3 #house @ryan',
  // '🧹 Clean the garage next Friday at 3pm #garage #cleaning',
]

const TYPE_SPEED_MS = 38
const HOLD_AFTER_TYPED_MS = 1400
const SUBMITTING_MS = 500
const CREATED_MS = 700

const highlightClassFor = type => {
  switch (type) {
    case 'repeat':
      return 'highlight-repeat'
    case 'priority':
      return 'highlight-priority'
    case 'label':
      return 'highlight-label'
    case 'dueDate':
      return 'highlight-date'
    default:
      return ''
  }
}

const renderHighlighted = (
  sentence,
  { repeatHighlight, priorityHighlight, labelsHighlight, dueDateHighlight },
) => {
  const allHighlights = []
  if (repeatHighlight)
    allHighlights.push(
      ...repeatHighlight.map(h => ({ ...h, type: 'repeat', priority: 60 })),
    )
  if (priorityHighlight)
    allHighlights.push(
      ...priorityHighlight.map(h => ({ ...h, type: 'priority', priority: 50 })),
    )
  if (labelsHighlight)
    allHighlights.push(
      ...labelsHighlight.map(h => ({ ...h, type: 'label', priority: 30 })),
    )
  if (dueDateHighlight)
    allHighlights.push({ ...dueDateHighlight, type: 'dueDate', priority: 20 })

  allHighlights.sort((a, b) => a.start - b.start)
  const resolved = []
  for (const current of allHighlights) {
    const previous = resolved[resolved.length - 1]
    if (previous && current.start < previous.end) {
      if (current.priority > previous.priority) {
        resolved.pop()
        resolved.push(current)
      }
    } else {
      resolved.push(current)
    }
  }

  const parts = []
  let lastIndex = 0
  for (const h of resolved) {
    if (h.start > lastIndex) parts.push(sentence.slice(lastIndex, h.start))
    parts.push(
      <span
        key={h.start}
        className={highlightClassFor(h.type)}
        style={{
          textDecoration: 'underline',
          textDecorationThickness: '2px',
          textDecorationStyle: 'dashed',
        }}
      >
        {sentence.slice(h.start, h.end)}
      </span>,
    )
    lastIndex = h.end
  }
  if (lastIndex < sentence.length) parts.push(sentence.slice(lastIndex))
  return parts
}

const useLiveParse = sentence =>
  useMemo(() => {
    const priority = parsePriority(sentence)
    const labels = parseLabels(sentence, DEMO_LABELS)
    const assignees = parseAssignees(sentence, DEMO_MEMBERS)
    const repeat = parseRepeatV2(sentence)
    const dueDate = parseDueDate(sentence, chrono)

    const parts = renderHighlighted(sentence, {
      repeatHighlight: repeat.highlight,
      priorityHighlight: priority.highlight,
      labelsHighlight: labels.highlight,
      dueDateHighlight: dueDate.highlight?.[0],
    })

    return { priority, labels, assignees, repeat, dueDate, parts }
  }, [sentence])

const DemoSmartTaskCreation = () => {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [revealed, setRevealed] = useState(0)
  // 'typing' -> 'reviewing' -> 'submitting' -> 'created' -> next example
  const [phase, setPhase] = useState('typing')

  useEffect(() => {
    let cancelled = false
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

    const run = async () => {
      const fullText = EXAMPLES[exampleIndex % EXAMPLES.length]
      setPhase('typing')
      setRevealed(0)

      for (let i = 1; i <= fullText.length; i++) {
        if (cancelled) return
        setRevealed(i)
        await sleep(TYPE_SPEED_MS)
      }

      if (cancelled) return
      setPhase('reviewing')
      await sleep(HOLD_AFTER_TYPED_MS)

      if (cancelled) return
      setPhase('submitting')
      await sleep(SUBMITTING_MS)

      if (cancelled) return
      setPhase('created')
      await sleep(CREATED_MS)

      if (cancelled) return
      setExampleIndex(idx => idx + 1)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [exampleIndex])

  const fullText = EXAMPLES[exampleIndex % EXAMPLES.length]
  const sentence = phase === 'created' ? '' : fullText.slice(0, revealed)
  const { priority, labels, assignees, repeat, dueDate, parts } =
    useLiveParse(sentence)

  const noop = useCallback(() => {}, [])
  const isSubmitting = phase === 'submitting' || phase === 'created'

  const dueDateOnly = dueDate.result
    ? new Date(dueDate.result).toISOString().slice(0, 10)
    : null

  return (
    <Box
      sx={{ my: { xs: 6, md: 10 }, width: '100%' }}
      data-aos-smart-demo
      data-aos-anchor='[data-aos-smart-demo]'
      data-aos='fade-up'
    >
      <Typography level='h2' textAlign='center' sx={{ mb: 1 }}>
        Just type it. We&apos;ll figure out the rest.
      </Typography>
      <Typography
        level='body-lg'
        textAlign='center'
        className='opacity-70'
        sx={{ mb: 4, maxWidth: 640, mx: 'auto' }}
      >
        Write a task like you&apos;d say it out loud — Donetick detects the
        due date, repeat schedule, priority, labels, and who it&apos;s for.
      </Typography>

      <Card
        variant='outlined'
        sx={{
          maxWidth: 720,
          mx: 'auto',
          borderRadius: 'lg',
          boxShadow: 'md',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          opacity: phase === 'created' ? 0 : 1,
          transform:
            phase === 'created' ? 'scale(0.97) translateY(4px)' : 'none',
        }}
      >
        <Typography level='title-md' sx={{ mb: 1.5 }}>
          Create new task
        </Typography>

        <Box sx={{ minHeight: 64 }}>
          <Typography
            component='div'
            sx={{
              fontSize: { xs: 16, sm: 20 },
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {parts}
            {phase === 'typing' && (
              <Box
                component='span'
                sx={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.1em',
                  bgcolor: 'primary.500',
                  ml: '2px',
                  verticalAlign: 'text-bottom',
                  animation: 'donetick-caret-blink 1s step-start infinite',
                }}
              />
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            pt: 2,
          }}
        >
          <DueDatePickerField
            emptyDisplay='icon'
            dueDateOnly={dueDateOnly}
            dueTime={null}
            useCustomTime={false}
            onDueDateChange={noop}
            onDueTimeChange={noop}
            onUseCustomTimeChange={noop}
            onClear={noop}
          />
          <RepeatPickerField
            emptyDisplay='icon'
            value={repeat.result}
            onChange={noop}
            onClear={noop}
          />
          <PriorityPickerField
            emptyDisplay='icon'
            value={Number(priority.result) || 0}
            onChange={noop}
            onClear={noop}
          />
          <AssigneePickerField
            emptyDisplay='icon'
            value={assignees.isAnyone ? 'anyone' : assignees.result?.[0]?.userId || null}
            onChange={noop}
            onClear={noop}
            members={DEMO_MEMBERS}
          />
          <LabelsPickerField
            emptyDisplay='icon'
            values={(labels.result || []).map(l => l.id).filter(Boolean)}
            onChange={noop}
            onClear={noop}
            labels={DEMO_LABELS}
          />

          <Button
            size='sm'
            variant='solid'
            color={phase === 'submitting' || phase === 'created' ? 'success' : 'primary'}
            startDecorator={isSubmitting ? <Check sx={{ fontSize: 18 }} /> : null}
            sx={{
              ml: 'auto',
              borderRadius: '128px',
              minHeight: 40,
              transition: 'all 0.2s ease',
              transform: phase === 'submitting' ? 'scale(0.94)' : 'scale(1)',
              pointerEvents: 'none',
            }}
          >
            {isSubmitting ? 'Created' : 'Create'}
          </Button>
        </Box>
      </Card>

      <style>{`
        @keyframes donetick-caret-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </Box>
  )
}

export default DemoSmartTaskCreation
