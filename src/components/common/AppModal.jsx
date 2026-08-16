import { Close } from '@mui/icons-material'
import { Box, Divider, IconButton, Modal, Sheet, Typography } from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import { forwardRef, useId } from 'react'

const WIDTH_BY_SIZE = {
  sm: 400,
  md: 520,
  lg: 680,
  xl: 840,
}

/**
 * The app's modal primitive. It owns modal layout, spacing, accessibility,
 * responsive presentation, and motion so feature components only own content.
 */
const AppModal = forwardRef(
  (
    {
      open,
      onClose,
      children,
      title,
      description,
      footer,
      size = 'md',
      fullWidth = true,
      isMobile: isMobileProp,
      keepMounted = false,
      mobilePresentation = 'sheet',
      role = 'dialog',
      showCloseButton = true,
      showHandle = false,
      closeOnBackdrop = true,
      closeOnEscape = true,
      backdropBlur = true,
      maxHeight = '90dvh',
      contentSx,
      footerSx,
      sx,
      unmountDelay = 180,
      ...modalProps
    },
    ref,
  ) => {
    const generatedId = useId()
    const detectedMobile = useMediaQuery('(max-width:768px)')
    const isMobile = isMobileProp ?? detectedMobile
    const titleId = title ? `${generatedId}-title` : undefined
    const descriptionId = description ? `${generatedId}-description` : undefined
    const isSheet = isMobile && mobilePresentation === 'sheet'
    const isFullscreen = isMobile && mobilePresentation === 'fullscreen'

    const handleClose = (event, reason) => {
      if (reason === 'backdropClick' && !closeOnBackdrop) return
      if (reason === 'escapeKeyDown' && !closeOnEscape) return
      onClose?.(event, reason)
    }

    return (
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        keepMounted={keepMounted}
        sx={{
          // Joy raises portaled listboxes above modals, but its selector misses
          // Menu because Menu renders with role="menu". Keep the workaround in
          // the modal primitive so individual menus never need a z-index.
          ...(open && {
            '& ~ [role="menu"]': {
              '--unstable_popup-zIndex': 'calc(var(--joy-zIndex-modal) + 1)',
            },
          }),
          display: 'flex',
          alignItems: isSheet ? 'flex-end' : 'center',
          justifyContent: 'center',
          p: isMobile ? 0 : 2,
          '& .MuiModal-backdrop': {
            backgroundColor: 'rgba(8, 15, 24, 0.52)',
            backdropFilter: backdropBlur ? 'blur(4px)' : 'none',
          },
        }}
        {...modalProps}
      >
        <Sheet
          ref={ref}
          role={role}
          aria-modal='true'
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          variant='outlined'
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: isFullscreen
              ? '100%'
              : isSheet
                ? '100%'
                : fullWidth
                  ? `min(calc(100vw - 32px), ${WIDTH_BY_SIZE[size] || WIDTH_BY_SIZE.md}px)`
                  : 'auto',
            maxWidth: isMobile
              ? 'none'
              : WIDTH_BY_SIZE[size] || WIDTH_BY_SIZE.md,
            height: isFullscreen ? '100dvh' : 'auto',
            maxHeight: isFullscreen ? '100dvh' : maxHeight,
            overflow: 'hidden',
            borderRadius: isFullscreen ? 0 : isSheet ? '16px 16px 0 0' : '16px',
            borderBottom: isSheet ? 0 : undefined,
            boxShadow: 'lg',
            outline: 0,
            pb: isMobile ? 'env(safe-area-inset-bottom)' : 0,
            animation: open
              ? `${isSheet ? 'appSheetEnter' : 'appModalEnter'} ${Math.min(unmountDelay, 300)}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
              : undefined,
            '@keyframes appModalEnter': {
              from: { opacity: 0, transform: 'translateY(8px) scale(0.99)' },
              to: { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
            '@keyframes appSheetEnter': {
              from: { transform: 'translateY(24px)' },
              to: { transform: 'translateY(0)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
            ...sx,
          }}
        >
          {isSheet && showHandle && (
            <Box
              aria-hidden='true'
              sx={{ display: 'flex', justifyContent: 'center', pt: 1.25 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 4,
                  borderRadius: 999,
                  bgcolor: 'neutral.300',
                }}
              />
            </Box>
          )}

          {(title || description || showCloseButton) && (
            <Box
              component='header'
              sx={{
                position: 'relative',
                flexShrink: 0,
                px: { xs: 2, sm: 3 },
                pt: isSheet && showHandle ? 1.25 : { xs: 2, sm: 2.5 },
                pb: description ? 1.5 : 2,
                pr: showCloseButton ? { xs: 7, sm: 8 } : { xs: 2, sm: 3 },
              }}
            >
              {title && (
                <Typography
                  id={titleId}
                  level='title-lg'
                  sx={{ fontWeight: 650 }}
                >
                  {title}
                </Typography>
              )}
              {description && (
                <Typography
                  id={descriptionId}
                  level='body-sm'
                  sx={{ color: 'text.tertiary', mt: 0.5 }}
                >
                  {description}
                </Typography>
              )}
              {showCloseButton && (
                <IconButton
                  aria-label='Close dialog'
                  variant='plain'
                  color='neutral'
                  onClick={handleClose}
                  sx={{
                    position: 'absolute',
                    zIndex: 1,
                    top: isSheet && showHandle ? 6 : 12,
                    right: { xs: 10, sm: 16 },
                    borderRadius: '50%',
                  }}
                >
                  <Close />
                </IconButton>
              )}
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              px: { xs: 2, sm: 3 },
              pb: { xs: 2.5, sm: 3 },
              ...contentSx,
            }}
          >
            {children}
          </Box>

          {footer && (
            <>
              <Divider />
              <Box
                component='footer'
                sx={{
                  flexShrink: 0,
                  px: { xs: 2, sm: 3 },
                  py: 2,
                  bgcolor: 'background.surface',
                  ...footerSx,
                }}
              >
                {footer}
              </Box>
            </>
          )}
        </Sheet>
      </Modal>
    )
  },
)

AppModal.displayName = 'AppModal'

export default AppModal
