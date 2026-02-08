import { Box, Button, Textarea } from '@mui/joy'
import { useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function TextModal({
  isOpen,
  onClose,
  onSave,
  current,
  title,
  okText,
  cancelText,
}) {
  const { ResponsiveModal } = useResponsiveModal()

  const [text, setText] = useState(current)

  const handleSave = () => {
    onSave(text)
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={title}
    >
      <Textarea
        placeholder='Type in here…'
        value={text}
        onChange={e => setText(e.target.value)}
        minRows={2}
        maxRows={4}
        sx={{ minWidth: 300 }}
      />

      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button size='lg' onClick={handleSave} fullWidth sx={{ mr: 1 }}>
          {okText ? okText : 'Save'}
        </Button>
        <Button size='lg' onClick={onClose} variant='outlined'>
          {cancelText ? cancelText : 'Cancel'}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default TextModal
