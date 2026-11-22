import { Box } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getTaskPaneSize,
  parseTaskPaneWidth,
  TASK_PANE_WIDTH_KEY,
} from '../utils/taskPaneSize'

function readPreferredWidth() {
  try {
    return parseTaskPaneWidth(localStorage.getItem(TASK_PANE_WIDTH_KEY))
  } catch {
    return null
  }
}

function savePreferredWidth(width) {
  try {
    if (width === null) localStorage.removeItem(TASK_PANE_WIDTH_KEY)
    else localStorage.setItem(TASK_PANE_WIDTH_KEY, String(width))
  } catch {
    // Resizing still works when browser storage is unavailable.
  }
}

export default function ResizableTaskPane({ children }) {
  const { t } = useTranslation()
  const root = useRef(null)
  const drag = useRef(null)
  const [availableWidth, setAvailableWidth] = useState(null)
  const [preferredWidth, setPreferredWidth] = useState(readPreferredWidth)
  const [dragWidth, setDragWidth] = useState(null)

  useEffect(() => {
    const parent = root.current?.parentElement
    if (!parent) return
    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width)
    })
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  const size = getTaskPaneSize(
    availableWidth ?? 1200,
    dragWidth ?? preferredWidth,
  )
  const commit = width => {
    setPreferredWidth(width)
    savePreferredWidth(width)
  }
  const reset = () => commit(null)
  const finishDrag = event => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    commit(current.width)
    drag.current = null
    setDragWidth(null)
  }

  return (
    <Box
      ref={root}
      component='aside'
      aria-label={t('taskDetails', { defaultValue: 'Task details' })}
      sx={{
        width:
          availableWidth === null ? 'clamp(400px, 42%, 640px)' : size.width,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100dvh',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.body',
      }}
    >
      <Box
        role='separator'
        tabIndex={0}
        aria-label={t('resizeTaskPane', { defaultValue: 'Resize task pane' })}
        aria-orientation='vertical'
        aria-valuemin={Math.round(size.min)}
        aria-valuemax={Math.round(size.max)}
        aria-valuenow={Math.round(size.width)}
        title={t('resizeTaskPaneHint', {
          defaultValue:
            'Drag or use arrow keys to resize. Double-click or press Enter to reset.',
        })}
        onDoubleClick={reset}
        onKeyDown={event => {
          let next
          if (event.key === 'ArrowLeft')
            next = size.width + (event.shiftKey ? 50 : 10)
          else if (event.key === 'ArrowRight')
            next = size.width - (event.shiftKey ? 50 : 10)
          else if (event.key === 'Home') next = size.min
          else if (event.key === 'End') next = size.max
          else if (event.key === 'Enter') {
            event.preventDefault()
            reset()
            return
          } else return
          event.preventDefault()
          commit(Math.max(size.min, Math.min(size.max, next)))
        }}
        onPointerDown={event => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.focus()
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: size.width,
            width: size.width,
          }
          setDragWidth(size.width)
        }}
        onPointerMove={event => {
          const current = drag.current
          if (!current || current.pointerId !== event.pointerId) return
          current.width = Math.max(
            size.min,
            Math.min(
              size.max,
              current.startWidth + current.startX - event.clientX,
            ),
          )
          setDragWidth(current.width)
        }}
        onPointerUp={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerCancel={() => {
          drag.current = null
          setDragWidth(null)
        }}
        sx={{
          position: 'absolute',
          left: -5,
          top: 0,
          bottom: 0,
          width: 10,
          zIndex: 2,
          cursor: 'col-resize',
          touchAction: 'none',
          userSelect: 'none',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 4,
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: dragWidth === null ? 'transparent' : 'primary.500',
          },
          '&:hover::after, &:focus-visible::after': { bgcolor: 'primary.500' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.500',
          },
        }}
      />
      <Box sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </Box>
    </Box>
  )
}
