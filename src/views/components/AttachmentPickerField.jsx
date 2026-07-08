import { AttachFile, Close, DeleteOutline, Image } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Sheet,
  Typography,
} from '@mui/joy'
import { ClickAwayListener, Popper } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Z_INDEX } from '../../constants/zIndex'
import { useFileUpload } from '../../hooks/useFileUpload'

const AttachmentPickerField = ({
  attachments = [],
  onChange,
  onClear,
  emptyDisplay = 'icon-text',
  entityType = 'chore_attachment',
  entityId,
  draftId,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const buttonRef = useRef(null)
  const { uploadFile } = useFileUpload({ entityType, entityId, draftId })

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = e => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleAddFile = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setIsUploading(true)
      try {
        const url = await uploadFile(file)
        if (url) {
          onChange([...attachments, { url, name: file.name }])
        }
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleRemove = index => {
    const updated = attachments.filter((_, i) => i !== index)
    onChange(updated)
    if (updated.length === 0) setIsOpen(false)
  }

  const handleClear = e => {
    e.stopPropagation()
    onClear?.()
    setIsOpen(false)
  }

  const isEmpty = attachments.length === 0
  const shouldShowLabel = !isEmpty || emptyDisplay === 'icon-text'

  return (
    <>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Button
          ref={buttonRef}
          size='sm'
          variant={isEmpty ? 'outlined' : 'soft'}
          color='neutral'
          onClick={() => setIsOpen(prev => !prev)}
          sx={{
            borderRadius: '128px',
            minHeight: 40,
            minWidth: 'min-content',
            px: shouldShowLabel ? 1.25 : 0.75,
            gap: shouldShowLabel ? 1 : 0,
            justifyContent: 'flex-start',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s ease-in-out',
          }}
        >
          {isUploading ? (
            <CircularProgress size='sm' sx={{ '--CircularProgress-size': '16px' }} />
          ) : (
            <AttachFile sx={{ fontSize: '20px' }} />
          )}
          <Typography
            level='body-sm'
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: shouldShowLabel ? 180 : 0,
              opacity: shouldShowLabel ? 1 : 0,
              transform: shouldShowLabel ? 'translateX(0)' : 'translateX(-4px)',
              transition:
                'max-width 0.25s ease-in-out, opacity 0.2s ease-in-out, transform 0.25s ease-in-out',
            }}
          >
            {isEmpty
              ? 'Attachments'
              : `${attachments.length} file${attachments.length !== 1 ? 's' : ''}`}
          </Typography>
        </Button>
        {!isEmpty && onClear && (
          <IconButton
            size='sm'
            variant='soft'
            color='danger'
            onClick={handleClear}
            sx={{
              position: 'absolute',
              top: -12,
              right: -16,
              zIndex: 10,
              maxHeight: 18,
              maxWidth: 18,
              borderRadius: '50%',
              '&:hover': { bgcolor: 'danger.softBg' },
            }}
          >
            <Close sx={{ fontSize: '18px' }} />
          </IconButton>
        )}
      </Box>

      {isOpen && (
        <Popper
          open={isOpen}
          anchorEl={buttonRef.current}
          placement='top-start'
          modifiers={[
            { name: 'offset', options: { offset: [0, 8] } },
            {
              name: 'flip',
              options: { fallbackPlacements: ['bottom-start', 'top-start'] },
            },
          ]}
          sx={{ zIndex: Z_INDEX.MODAL_CLOSE_BUTTON + 1 }}
        >
          <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Sheet
              variant='outlined'
              sx={{
                minWidth: 240,
                maxWidth: 320,
                p: 1,
                borderRadius: 'md',
                boxShadow: 'lg',
                bgcolor: 'background.popup',
              }}
            >
              {attachments.length > 0 && (
                <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {attachments.map((attachment, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.5,
                        borderRadius: 'sm',
                        '&:hover': { bgcolor: 'background.level1' },
                      }}
                    >
                      <Box
                        component='img'
                        src={attachment.url}
                        alt={attachment.name}
                        sx={{
                          width: 36,
                          height: 36,
                          objectFit: 'cover',
                          borderRadius: 'sm',
                          flexShrink: 0,
                          bgcolor: 'background.level2',
                        }}
                        onError={e => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                      <Box
                        sx={{
                          display: 'none',
                          width: 36,
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'sm',
                          bgcolor: 'background.level2',
                          flexShrink: 0,
                        }}
                      >
                        <Image sx={{ fontSize: 20, color: 'text.tertiary' }} />
                      </Box>
                      <Typography
                        level='body-xs'
                        sx={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {attachment.name}
                      </Typography>
                      <IconButton
                        size='sm'
                        variant='plain'
                        color='danger'
                        onClick={() => handleRemove(index)}
                        sx={{ flexShrink: 0 }}
                      >
                        <DeleteOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                fullWidth
                size='sm'
                variant='outlined'
                color='neutral'
                startDecorator={
                  isUploading ? (
                    <CircularProgress size='sm' sx={{ '--CircularProgress-size': '14px' }} />
                  ) : (
                    <AttachFile sx={{ fontSize: 16 }} />
                  )
                }
                onClick={handleAddFile}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading…' : 'Add image'}
              </Button>
            </Sheet>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  )
}

export default AttachmentPickerField
