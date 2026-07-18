import { AutoAwesome, Check, PhotoCamera } from '@mui/icons-material'
import { Box, Button, Card, Typography } from '@mui/joy'
import * as chrono from 'chrono-node'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AssigneePickerField from '../components/AssigneePickerField'
import {
  parseAssignees,
  parseDueDate,
  parseLabels,
  parsePriority,
} from '../components/CustomParsers'
import DueDatePickerField from '../components/DueDatePickerField'
import LabelsPickerField from '../components/LabelsPickerField'
import PriorityPickerField from '../components/PriorityPickerField'

// Fake circle/labels so the real parsers + picker fields have something to
// match against, without hitting any API or vision model.
const DEMO_LABELS = [
  { id: 'house', name: 'House', color: '#3b82f6' },
  { id: 'car', name: 'Car', color: '#10b981' },
  { id: 'bills', name: 'Bills', color: '#ec4899' },
]
const DEMO_MEMBERS = [{ userId: 'ryan', displayName: 'Ryan' }]

// Each "photo" is drawn with CSS only (no image assets) so the demo stays
// fast, deterministic and self-contained. `extracted` is fed through the
// real parsers, same as the typing demo.
const EXAMPLES = [
  {
    photo: {
      kind: 'sticky',
      rotate: -3,
      bg: '#fde68a',
      lines: ['Fix leaky faucet', 'ASAP!! tell Ryan', 'do it Friday'],
      font: '"Comic Sans MS", "Segoe Print", cursive',
    },
    extracted: '🔧 Fix leaky faucet !p1 @ryan Friday #house',
  },
  {
    photo: {
      kind: 'bill',
      rotate: 2,
      bg: '#ffffff',
      header: 'CityLight Electric',
      rows: [
        ['Account', '00219-4471'],
        ['Amount due', '$142.30'],
        ['Due date', 'Aug 15'],
      ],
    },
    extracted: '💡 Pay electric bill $142.30 due Aug 15 #bills !p2',
  },
  {
    photo: {
      kind: 'dmv',
      rotate: -1.5,
      bg: '#e5e7eb',
      header: 'VEHICLE REGISTRATION RENEWAL',
      rows: [
        ['Plate', '8HJK392'],
        ['Expires', 'Sep 30'],
      ],
    },
    extracted: '🚗 Renew car registration due Sep 30 #car !p2',
  },
]

const SCAN_MS = 1500
const EXTRACT_MS = 900
const HOLD_AFTER_REVEAL_MS = 2000
const SUBMITTING_MS = 500
const CREATED_MS = 700

const highlightClassFor = type => {
  switch (type) {
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
  { priorityHighlight, labelsHighlight, dueDateHighlight },
) => {
  const allHighlights = []
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

const useParsedTask = sentence =>
  useMemo(() => {
    const priority = parsePriority(sentence)
    const labels = parseLabels(sentence, DEMO_LABELS)
    const assignees = parseAssignees(sentence, DEMO_MEMBERS)
    const dueDate = parseDueDate(sentence, chrono)
    const parts = renderHighlighted(sentence, {
      priorityHighlight: priority.highlight,
      labelsHighlight: labels.highlight,
      dueDateHighlight: dueDate.highlight?.[0],
    })
    return { priority, labels, assignees, dueDate, parts }
  }, [sentence])

const PhotoMock = ({ photo, scanning, extracting }) => {
  const { kind, rotate, bg } = photo
  return (
    <Box
      sx={{
        position: 'relative',
        width: 260,
        mx: 'auto',
        borderRadius: 'sm',
        overflow: 'hidden',
        bgcolor: bg,
        color: kind === 'sticky' ? '#3f2d00' : 'text.primary',
        boxShadow: 'lg',
        transform: `rotate(${rotate}deg)`,
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        p: 2.5,
        minHeight: 180,
      }}
    >
      {kind === 'sticky' && (
        <Typography
          component='div'
          sx={{
            fontFamily: photo.font,
            fontSize: 20,
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {photo.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </Typography>
      )}

      {(kind === 'bill' || kind === 'dmv') && (
        <>
          <Typography
            level='title-sm'
            sx={{
              mb: 1.5,
              pb: 1,
              borderBottom: '2px solid',
              borderColor: 'neutral.300',
              letterSpacing: kind === 'dmv' ? '0.05em' : 0,
              fontSize: kind === 'dmv' ? 13 : 16,
            }}
          >
            {photo.header}
          </Typography>
          {photo.rows.map(([label, value]) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.75,
              }}
            >
              <Typography
                level='body-sm'
                sx={{ color: 'inherit', opacity: 0.65 }}
              >
                {label}
              </Typography>
              <Typography
                level='body-sm'
                sx={{ color: 'inherit', fontWeight: 600 }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </>
      )}

      {/* Viewfinder corner brackets */}
      {[
        'top-4 left-4',
        'top-4 right-4',
        'bottom-4 left-4',
        'bottom-4 right-4',
      ].map(pos => {
        const isTop = pos.startsWith('top')
        const isLeft = pos.includes('left')
        return (
          <Box
            key={pos}
            sx={{
              position: 'absolute',
              width: 18,
              height: 18,
              top: isTop ? 8 : 'auto',
              bottom: isTop ? 'auto' : 8,
              left: isLeft ? 8 : 'auto',
              right: isLeft ? 'auto' : 8,
              borderTop: isTop ? '2px solid' : 'none',
              borderBottom: !isTop ? '2px solid' : 'none',
              borderLeft: isLeft ? '2px solid' : 'none',
              borderRight: !isLeft ? '2px solid' : 'none',
              borderColor: 'primary.400',
              opacity: scanning || extracting ? 1 : 0,
              transition: 'opacity 0.25s ease',
            }}
          />
        )
      })}

      {/* Scan line sweep */}
      {scanning && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '3px',
            bgcolor: 'primary.400',
            boxShadow: '0 0 12px 2px var(--joy-palette-primary-400)',
            animation: 'donetick-scan-sweep 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Extracting overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          bgcolor: 'rgba(15, 23, 42, 0.72)',
          opacity: extracting ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.25s ease',
        }}
      >
        <AutoAwesome
          sx={{
            color: '#fff',
            fontSize: 26,
            animation: extracting
              ? 'donetick-pulse 0.9s ease-in-out infinite'
              : 'none',
          }}
        />
        <Typography level='body-sm' sx={{ color: '#fff', fontWeight: 600 }}>
          Extracting task…
        </Typography>
      </Box>
    </Box>
  )
}

const DemoPhotoTaskCreation = () => {
  const [exampleIndex, setExampleIndex] = useState(0)
  // 'scanning' -> 'extracting' -> 'reviewing' -> 'submitting' -> 'created'
  const [phase, setPhase] = useState('scanning')

  useEffect(() => {
    let cancelled = false
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

    const run = async () => {
      setPhase('scanning')
      await sleep(SCAN_MS)
      if (cancelled) return

      setPhase('extracting')
      await sleep(EXTRACT_MS)
      if (cancelled) return

      setPhase('reviewing')
      await sleep(HOLD_AFTER_REVEAL_MS)
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

  const example = EXAMPLES[exampleIndex % EXAMPLES.length]
  const revealed = ['reviewing', 'submitting', 'created'].includes(phase)
  const sentence = revealed && phase !== 'created' ? example.extracted : ''
  const { priority, labels, assignees, dueDate, parts } =
    useParsedTask(sentence)

  const noop = useCallback(() => {}, [])
  const isSubmitting = phase === 'submitting' || phase === 'created'
  const showPhoto = phase === 'scanning' || phase === 'extracting'

  const dueDateOnly = dueDate.result
    ? new Date(dueDate.result).toISOString().slice(0, 10)
    : null

  return (
    <Box
      sx={{ my: { xs: 6, md: 10 }, width: '100%' }}
      data-aos-photo-demo
      data-aos-anchor='[data-aos-photo-demo]'
      data-aos='fade-up'
    >
      <Typography level='h2' textAlign='center' sx={{ mb: 1 }}>
        Or just snap a photo.
      </Typography>
      <Typography
        level='body-lg'
        textAlign='center'
        className='opacity-70'
        sx={{ mb: 4, maxWidth: 640, mx: 'auto' }}
      >
        Point your camera at a sticky note, a bill, or a renewal notice —
        Donetick reads it and builds the task for you.
      </Typography>

      <Card
        variant='outlined'
        sx={{
          maxWidth: 720,
          mx: 'auto',
          borderRadius: 'lg',
          boxShadow: 'md',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PhotoCamera sx={{ fontSize: 20 }} />
          <Typography level='title-md'>
            {showPhoto ? 'Scanning photo…' : 'Create new task'}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: showPhoto ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: showPhoto ? 'auto' : 'none',
            }}
          >
            <PhotoMock
              photo={example.photo}
              scanning={phase === 'scanning'}
              extracting={phase === 'extracting'}
            />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              opacity: phase === 'created' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.500',
                transform: phase === 'created' ? 'scale(1)' : 'scale(0.6)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Check sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography level='body-sm' sx={{ fontWeight: 600 }}>
              Task created
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: showPhoto || phase === 'created' ? 0 : 1,
              transition: 'opacity 0.3s ease',
              pointerEvents: showPhoto || phase === 'created' ? 'none' : 'auto',
            }}
          >
            <Typography
              component='div'
              sx={{ fontSize: { xs: 16, sm: 20 }, lineHeight: 1.4, mb: 2 }}
            >
              {parts}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1.5,
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
              <PriorityPickerField
                emptyDisplay='icon'
                value={Number(priority.result) || 0}
                onChange={noop}
                onClear={noop}
              />
              <AssigneePickerField
                emptyDisplay='icon'
                value={
                  assignees.isAnyone
                    ? 'anyone'
                    : assignees.result?.[0]?.userId || null
                }
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
                color={isSubmitting ? 'success' : 'primary'}
                startDecorator={
                  isSubmitting ? <Check sx={{ fontSize: 18 }} /> : null
                }
                sx={{
                  ml: 'auto',
                  borderRadius: '128px',
                  minHeight: 40,
                  transition: 'all 0.2s ease',
                  transform:
                    phase === 'submitting' ? 'scale(0.94)' : 'scale(1)',
                  pointerEvents: 'none',
                }}
              >
                {isSubmitting ? 'Created' : 'Create'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      <style>{`
        @keyframes donetick-scan-sweep {
          0% { top: 4%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 92%; opacity: 0; }
        }
        @keyframes donetick-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
    </Box>
  )
}

export default DemoPhotoTaskCreation
