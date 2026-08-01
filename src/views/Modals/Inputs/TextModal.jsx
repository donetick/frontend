import { Textarea } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
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
      size='md'
      title={title}
      footer={
        <ModalActions
          secondary={{ label: cancelText || 'Cancel', onClick: onClose }}
          primary={{ label: okText || 'Save', onClick: handleSave }}
        />
      }
    >
      <Textarea
        autoFocus
        placeholder='Type in here…'
        value={text}
        onChange={event => setText(event.target.value)}
        minRows={3}
        maxRows={8}
      />
    </ResponsiveModal>
  )
}

export default TextModal
