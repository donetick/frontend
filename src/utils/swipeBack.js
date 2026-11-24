// Require a deliberate horizontal gesture, not a diagonal scroll or a tap.
export const isBackSwipe = ({ direction = 'ltr', dx, dy, elapsed }) =>
  elapsed <= 700 &&
  (direction === 'rtl' ? -dx : dx) >= 64 &&
  Math.abs(dx) > Math.abs(dy) * 1.5
