import { Typography } from '@mui/joy'

/**
 * The text hierarchy shared by the task editor and the quick-add pickers.
 *
 *   section header   EditorSection `title` ....... 14px/600, icon, own row
 *   FieldGroupTitle  a set of related fields ..... 11px/700 uppercase, tertiary
 *   FormLabel (Joy)  one field ................... 14px/500, bound to its input
 *   FieldHint        explains a group ............ 13px, tertiary
 *   FormHelperText   explains / invalidates one field
 *
 * Headings (`level='h4'`, `level='h5'`) are deliberately absent: a field label
 * is not a document heading, and the editor used to re-style them back down to
 * label size with a CSS override that only applied on the full-page editor —
 * so the same component rendered two different sizes in the editor and in the
 * quick-add modal.
 *
 * `FieldGroupTitle` keeps the look the quick-add repeat picker already used for
 * this tier, so both surfaces now render the same component.
 */
export function FieldGroupTitle({ children, endDecorator, sx, ...props }) {
  return (
    <Typography
      component='h3'
      level='body-xs'
      textColor='text.tertiary'
      endDecorator={endDecorator}
      sx={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        mb: 0.75,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  )
}

export function FieldHint({ children, sx, ...props }) {
  return (
    <Typography
      level='body-sm'
      textColor='text.tertiary'
      sx={{ mb: 1.5, ...sx }}
      {...props}
    >
      {children}
    </Typography>
  )
}
