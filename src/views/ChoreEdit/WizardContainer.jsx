import { Container, Modal } from '@mui/joy'
import { useMediaQuery } from '@mui/material'

export default function WizardContainer({ children, onClose, sx, ...props }) {
  const mobile = useMediaQuery('(max-width:599px)')
  const content = (
    <Container
      {...props}
      role={mobile ? 'dialog' : undefined}
      aria-modal={mobile ? true : undefined}
      aria-label={mobile ? 'Task editor' : undefined}
      tabIndex={mobile ? -1 : undefined}
      sx={{
        ...sx,
        ...(mobile
          ? {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              p: 0,
              outline: 0,
            }
          : {}),
      }}
    >
      {children}
    </Container>
  )
  return mobile ? (
    <Modal
      open
      onClose={(event, reason) => {
        if (
          reason === 'escapeKeyDown' &&
          (event.defaultPrevented ||
            event.target?.closest?.(
              '[role="menu"], [role="listbox"], [aria-haspopup="menu"][aria-expanded="true"], [role="combobox"][aria-expanded="true"]',
            ))
        )
          return
        onClose?.(event, reason)
      }}
      sx={{
        '--Modal-backdropBackground': 'rgba(0, 0, 0, 0.6)',
        // Joy's built-in modal rule only raises portaled listboxes. Menus use
        // role="menu", so without this they render behind the mobile editor.
        '& ~ [role="menu"]': {
          '--unstable_popup-zIndex': 'calc(var(--joy-zIndex-modal) + 1)',
        },
      }}
    >
      {content}
    </Modal>
  ) : (
    content
  )
}
