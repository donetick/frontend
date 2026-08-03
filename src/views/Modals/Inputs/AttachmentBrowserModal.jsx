import { AttachFile, Image } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import EmptyState from '../../../components/common/EmptyState'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { GetChoreAttachments } from '../../../utils/Fetcher'
import { resolvePhotoURL } from '../../../utils/Helpers'
import { cacheChoreImages, getImageSrc } from '../../../utils/ImageCache'
import AttachmentViewerModal from './AttachmentViewerModal'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

const isImageFile = fileName => {
  if (!fileName) return false
  const ext = fileName.split('.').pop().toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

const downloadFile = (url, fileName) => {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'attachment'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function AttachmentBrowserModal({ choreId, isOpen, onClose }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [attachments, setAttachments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewerConfig, setViewerConfig] = useState({ isOpen: false })

  useEffect(() => {
    if (!isOpen || !choreId) return
    setIsLoading(true)
    GetChoreAttachments(choreId)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to fetch attachments')
        return res.json()
      })
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setAttachments(list)
        // Fire-and-forget: store attachments so they open offline later
        cacheChoreImages({ id: choreId, attachments: list })
      })
      .catch(() => setAttachments([]))
      .finally(() => setIsLoading(false))
  }, [isOpen, choreId])

  const handleClose = () => {
    setAttachments([])
    onClose?.()
  }

  const handleAttachmentClick = async attachment => {
    const url = await getImageSrc(
      attachment.file_path,
      attachment.sign ? resolvePhotoURL(attachment.sign) : null,
      { choreId: String(choreId), kind: 'attachment' },
    ).catch(() => resolvePhotoURL(attachment.sign))
    if (isImageFile(attachment.file_name)) {
      setViewerConfig({
        isOpen: true,
        url,
        fileName: attachment.file_name,
        onClose: () => setViewerConfig({ isOpen: false }),
      })
    } else {
      downloadFile(url, attachment.file_name)
    }
  }

  return (
    <>
      <ResponsiveModal
        open={!!isOpen}
        onClose={handleClose}
        title='Attachments'
        footer={
          <ModalActions primary={{ label: 'Done', onClick: handleClose }} />
        }
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size='md' />
          </Box>
        ) : attachments.length === 0 ? (
          <EmptyState
            size='sm'
            icon={<AttachFile />}
            title='No attachments'
            description='Photos and files added to this task will show up here.'
          />
        ) : (
          <List sx={{ '--ListItem-paddingX': '0px' }}>
            {attachments.map((attachment, index) => (
              <ListItem
                key={
                  attachment.id ||
                  attachment.file_path ||
                  attachment.sign ||
                  attachment.file_name ||
                  index
                }
                sx={{ p: 0 }}
              >
                <ListItemButton
                  onClick={() => handleAttachmentClick(attachment)}
                  sx={{ borderRadius: 'sm', gap: 1.5, py: 1 }}
                >
                  {isImageFile(attachment.file_name) ? (
                    <Image fontSize='small' />
                  ) : (
                    <AttachFile fontSize='small' />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography level='body-sm' noWrap>
                      {attachment.file_name || `File ${index + 1}`}
                    </Typography>
                    {attachment.size_bytes > 0 && (
                      <Typography
                        level='body-xs'
                        sx={{ color: 'text.tertiary' }}
                      >
                        {(attachment.size_bytes / 1024).toFixed(1)} KB
                      </Typography>
                    )}
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </ResponsiveModal>
      <AttachmentViewerModal config={viewerConfig} />
    </>
  )
}

export default AttachmentBrowserModal
