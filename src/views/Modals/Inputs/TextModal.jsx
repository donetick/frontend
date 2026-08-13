import { Textarea } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { useTranslation } from 'react-i18next'

function TextModal({
  isOpen,
  onClose,
  onSave,
  current,
  title,
  okText,
  cancelText,
}) {
  const { t } = useTranslation('common')
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
        placeholder={t('typeHere')}
        value={text}
        onChange={event => setText(event.target.value)}
        minRows={3}
        maxRows={8}
      />
    </ResponsiveModal>
  )
}

export default TextModal
