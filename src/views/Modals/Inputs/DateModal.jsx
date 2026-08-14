import { Input } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { useTranslation } from 'react-i18next'

function DateModal({ isOpen, onClose, onSave, current, title }) {
  const { t } = useTranslation('common')
  const { ResponsiveModal } = useResponsiveModal()
  const [date, setDate] = useState(
    current ? new Date(current).toISOString().split('T')[0] : '',
  )

  const handleSave = () => {
    onSave(date)
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='sm'
      title={title}
      footer={
        <ModalActions
          secondary={{ label: t('cancel'), onClick: onClose }}
          primary={{ label: t('save'), onClick: handleSave, disabled: !date }}
        />
      }
    >
      <Input
        autoFocus
        type='date'
        value={date}
        onChange={event => setDate(event.target.value)}
      />
    </ResponsiveModal>
  )
}

export default DateModal
