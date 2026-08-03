import { Input } from '@mui/joy'
import { useState } from 'react'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function DateModal({ current, isOpen, onClose, onSave, title }) {
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
          secondary={{ label: 'Cancel', onClick: onClose }}
          primary={{ label: 'Save', onClick: handleSave, disabled: !date }}
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
