import { Close } from '@mui/icons-material'
import { IconButton, Modal, Sheet, Typography } from '@mui/joy'
import { forwardRef, useEffect, useState } from 'react'
import { Z_INDEX } from '../../constants/zIndex'

const BottomSheetModal = forwardRef(
  (
    {
      open,
      onClose,
      children,
      title,
      height = 'auto',
      maxHeight = '90vh',
      expandedHeight = '95vh',
      backdropBlur = true,
      showHandle = true,
      showCloseButton = true,
      ...props
    },
    ref,
  ) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [internalOpen, setInternalOpen] = useState(open)

    // Handle opening
    useEffect(() => {
      if (open) {
        setInternalOpen(true)
        setIsClosing(false)
      }
    }, [open])

    // Handle closing with animation
    useEffect(() => {
      if (!open && internalOpen) {
        setIsClosing(true)
        // Wait for animation to complete before hiding modal
        const timer = setTimeout(() => {
          setInternalOpen(false)
          setIsClosing(false)
          setIsExpanded(false)
        }, 250) // Match transition duration

        return () => clearTimeout(timer)
      }
    }, [open, internalOpen])

    // Handle toggle expansion
    const handleToggleExpansion = () => {
      setIsExpanded(prev => !prev)
    }

    // Close on escape key
    useEffect(() => {
      const handleEscape = event => {
        if (event.key === 'Escape' && internalOpen) {
          onClose?.()
        }
      }

      if (internalOpen) {
        document.addEventListener('keydown', handleEscape)
        // Prevent body scroll when modal is open
        // document.body.style.overflow = 'hidden'
      } else {
        // Restore scroll immediately when modal starts closing
        // document.body.style.overflow = 'unset'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }, [internalOpen, onClose])

    // Calculate current height
    const currentHeight = isExpanded ? expandedHeight : height

    return (
      <Modal
        open={internalOpen}
        onClose={onClose}
        sx={{
          '& .MuiModal-backdrop': {
            backdropFilter: backdropBlur ? 'blur(3px)' : 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          },
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
        keepMounted
        {...props}
      >
        <Sheet
          ref={ref}
          sx={{
            zIndex: Z_INDEX.MODAL_CONTENT,
            minHeight: '20%',
            width: '100%',
            height: currentHeight,
            maxHeight: isExpanded ? expandedHeight : maxHeight,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            p: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition:
              'height 0.3s cubic-bezier(0.32, 0.72, 0, 1), max-height 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            transform:
              open && !isClosing ? 'translateY(0)' : 'translateY(100%)',
            // Handle safe area on mobile devices
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Header Section with drag handle, title, and close button */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'inherit',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              position: 'relative',
            }}
          >
            {/* Close button positioned absolutely in top-right */}
            {showCloseButton && (
              <IconButton
                variant='soft'
                color='neutral'
                size='sm'
                onClick={onClose}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 16,
                  zIndex: 1,
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  backgroundColor: 'neutral.softBg',
                  color: 'neutral.softColor',
                  '&:hover': {
                    backgroundColor: 'neutral.softHoverBg',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <Close fontSize='small' />
              </IconButton>
            )}

            {/* Drag Handle */}
            {showHandle && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '12px 0 8px 0',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginBottom: 16,
                }}
                onClick={handleToggleExpansion}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <div
                  style={{
                    width: 30,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'var(--joy-palette-neutral-300)',
                    transition: 'background-color 0.2s ease',
                  }}
                />
              </div>
            )}

            {/* Title Row */}
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: showHandle
                    ? '0 20px 16px 20px'
                    : '16px 20px 16px 20px',
                  paddingRight: showCloseButton ? '60px' : '20px', // Add space for close button
                  minHeight: 24,
                }}
              >
                <Typography
                  level='title-lg'
                  sx={{
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  {title}
                </Typography>
              </div>
            )}
          </div>
          {/* Content area */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 20px 20px 20px',
              minHeight: 0, // Important for flex child with overflow
            }}
          >
            {children}
          </div>
        </Sheet>
      </Modal>
    )
  },
)

BottomSheetModal.displayName = 'BottomSheetModal'

export default BottomSheetModal
