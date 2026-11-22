import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import { Box, IconButton } from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// How far a mouse press has to travel before it counts as a scroll gesture
// instead of a click on the chip underneath.
const DRAG_THRESHOLD = 6
// Width of the fade behind the chevron. Wider than the chevron itself so chips
// dissolve under it rather than colliding with it.
const FADE = 40
// Fraction of the visible width one chevron click travels.
const PAGE_RATIO = 0.8

const buildMask = (fadeStart, fadeEnd) =>
  `linear-gradient(to right, transparent 0, #000 ${
    fadeStart ? `${FADE}px` : '0px'
  }, #000 calc(100% - ${fadeEnd ? `${FADE}px` : '0px'}), transparent 100%)`

/**
 * A single-line row of picker chips. Overflowing chips stay reachable by
 * dragging, the wheel, or the chevron that appears on the overflowing side —
 * the scrollbar is hidden, so without those the overflow is invisible on
 * desktop. The chevron matters even when the chips happen to end flush with
 * the edge, where a fade alone would land on empty space and signal nothing.
 */
const ScrollableFieldRow = ({ children, rowSx, sx }) => {
  const { t } = useTranslation('chores')
  const scrollerRef = useRef(null)
  const dragRef = useRef(null)
  const draggedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [edges, setEdges] = useState({ end: false, start: false })

  const syncEdges = useCallback(() => {
    const node = scrollerRef.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    setEdges(prev => {
      const start = node.scrollLeft > 1
      const end = node.scrollLeft < max - 1
      return prev.start === start && prev.end === end ? prev : { end, start }
    })
  }, [])

  // No dependency array: the chip set changes with the user's field
  // preferences, and this only touches state when the edges actually flip.
  useEffect(syncEdges)

  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    // A plain vertical wheel should move the row sideways. React's own
    // onWheel is registered passive, so preventDefault needs a native
    // listener here.
    const onWheel = event => {
      if (node.scrollWidth <= node.clientWidth) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      node.scrollLeft += event.deltaY
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    const observer = new ResizeObserver(syncEdges)
    observer.observe(node)
    return () => {
      node.removeEventListener('wheel', onWheel)
      observer.disconnect()
    }
  }, [syncEdges])

  const handlePointerDown = event => {
    const node = scrollerRef.current
    // Touch and pen already pan natively; only the mouse needs the drag.
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if (!node || node.scrollWidth <= node.clientWidth) return
    dragRef.current = {
      dragging: false,
      startScrollLeft: node.scrollLeft,
      startX: event.clientX,
    }
  }

  const handlePointerMove = event => {
    const drag = dragRef.current
    const node = scrollerRef.current
    if (!drag || !node) return
    const dx = event.clientX - drag.startX
    if (!drag.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      drag.dragging = true
      setIsDragging(true)
    }
    node.scrollLeft = drag.startScrollLeft - dx
    syncEdges()
  }

  const endDrag = () => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setIsDragging(false)
    // Survives until the click that follows this release, so a chip doesn't
    // open its picker at the end of a drag.
    draggedRef.current = drag.dragging
  }

  const handleClickCapture = event => {
    if (!draggedRef.current) return
    draggedRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const scrollByPage = direction => {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({
      behavior: 'smooth',
      left: direction * node.clientWidth * PAGE_RATIO,
    })
  }

  const isScrollable = edges.start || edges.end
  const mask = isScrollable ? buildMask(edges.start, edges.end) : undefined

  const chevronSx = {
    '--IconButton-size': '26px',
    alignItems: 'center',
    borderRadius: '50%',
    boxShadow: 'xs',
    display: 'flex',
    position: 'absolute',
    // The row has symmetric vertical padding, so the chips centre on the
    // wrapper and so does the chevron.
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
  }

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <Box
        ref={scrollerRef}
        onClickCapture={handleClickCapture}
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerLeave={endDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onScroll={syncEdges}
        sx={{
          ...rowSx,
          WebkitMaskImage: mask,
          cursor: isDragging ? 'grabbing' : isScrollable ? 'grab' : undefined,
          maskImage: mask,
          userSelect: isDragging ? 'none' : undefined,
        }}
      >
        {children}
      </Box>
      {edges.start && (
        <IconButton
          aria-label={t('addTask.scrollFieldsStart')}
          onClick={() => scrollByPage(-1)}
          size='sm'
          sx={{ ...chevronSx, left: 0 }}
          variant='soft'
        >
          <KeyboardArrowLeft sx={{ fontSize: 18 }} />
        </IconButton>
      )}
      {edges.end && (
        <IconButton
          aria-label={t('addTask.scrollFieldsEnd')}
          onClick={() => scrollByPage(1)}
          size='sm'
          sx={{ ...chevronSx, right: 0 }}
          variant='soft'
        >
          <KeyboardArrowRight sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  )
}

export default ScrollableFieldRow
