import { Textarea } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function TextModal({
  cancelText,
  current,
  isOpen,
  okText,
  onClose,
  onSave,
  title,
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
