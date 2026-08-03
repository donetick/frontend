import { Option, Select } from '@mui/joy'
import { useState } from 'react'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function SelectModal({
  displayKey,
  isOpen,
  onClose,
  onSave,
  options,
  placeholder,
  title,
}) {
  const { ResponsiveModal } = useResponsiveModal()
  const [selected, setSelected] = useState(null)

  const handleSave = () => {
    onSave(options.find(item => item.id === selected))
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
          primary={{
            label: 'Save',
            onClick: handleSave,
            disabled: selected == null,
          }}
        />
      }
    >
      <Select
        autoFocus
        placeholder={placeholder}
        value={selected}
        onChange={(_, value) => setSelected(value)}
      >
        {options.map(item => (
          <Option value={item.id} key={item[displayKey]}>
            {item[displayKey]}
          </Option>
        ))}
      </Select>
    </ResponsiveModal>
  )
}

export default SelectModal
