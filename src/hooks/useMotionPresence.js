import { useLayoutEffect, useState } from 'react'

/** Keep an overlay mounted through exit; reversals cancel pending removal. */
export function useMotionPresence(open, exitDuration) {
  const [present, setPresent] = useState(open)
  const [entered, setEntered] = useState(false)

  useLayoutEffect(() => {
    let firstFrame
    let secondFrame
    let timeout

    if (open) {
      setPresent(true)
      // Two frames guarantee the closed style paints, including on first mount.
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setEntered(true))
      })
    } else {
      setEntered(false)
      timeout = setTimeout(() => setPresent(false), exitDuration)
    }

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      clearTimeout(timeout)
    }
  }, [open, exitDuration])

  return { present: open || present, entered: open && entered }
}
