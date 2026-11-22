import { MOTION } from '../constants/motion'

/** Individual scale leaves Popper's inline positioning transform untouched.
 * Starting styles also replay when a keepMounted listbox returns from display:none.
 * Older webviews gracefully fall back to an instant, fully usable popup.
 */
export const popupMotionStyles = {
  opacity: 1,
  scale: '1',
  transformOrigin: 'top center',
  transition: `opacity ${MOTION.popup}ms ${MOTION.easeOut}, scale ${MOTION.popup}ms ${MOTION.easeOut}`,
  '&[data-popper-placement^="top"]': { transformOrigin: 'bottom center' },
  '&[data-popper-placement="bottom-start"]': { transformOrigin: '0% 0%' },
  '&[data-popper-placement="bottom-end"]': { transformOrigin: '100% 0%' },
  '&[data-popper-placement="top-start"]': { transformOrigin: '0% 100%' },
  '&[data-popper-placement="top-end"]': { transformOrigin: '100% 100%' },
  '&[data-popper-placement^="left"]': { transformOrigin: '100% 50%' },
  '&[data-popper-placement^="right"]': { transformOrigin: '0% 50%' },
  '@starting-style': { opacity: 0, scale: '0.97' },
  '@media (prefers-reduced-motion: reduce)': {
    scale: 'none',
    transition: `opacity ${MOTION.reduced}ms ${MOTION.easeOut}`,
    '@starting-style': { opacity: 0, scale: 'none' },
  },
}
