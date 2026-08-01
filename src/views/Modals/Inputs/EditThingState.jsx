import { FormControl, FormHelperText, Input, Typography } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function EditThingStateModal({ isOpen, onClose, onSave, currentThing }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [state, setState] = useState(currentThing?.state || '')
  const [errors, setErrors] = useState({})

  const isValid = () => {
    const newErrors = {}

    if (state.trim() === '') {
      newErrors.state = 'State is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!isValid()) {
      return
    }
    onSave({
      name: currentThing?.name,
      type: currentThing?.type,
      id: currentThing?.id,
      state: state || null,
    })
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='sm'
      title='Update state'
      footer={
        <ModalActions
          secondary={{ label: 'Cancel', onClick: onClose }}
          primary={{ label: 'Update', onClick: handleSave }}
        />
      }
    >
      <FormControl>
        <Typography>Value</Typography>
        <Input
          placeholder='Thing value'
          value={state || ''}
          onChange={e => setState(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormHelperText color='danger'>{errors.state}</FormHelperText>
      </FormControl>
    </ResponsiveModal>
  )
}
export default EditThingStateModal
