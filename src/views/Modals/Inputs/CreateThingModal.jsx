import {
  FormControl,
  FormHelperText,
  Input,
  Option,
  Select,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function CreateThingModal({ currentThing, isOpen, onClose, onSave }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [name, setName] = useState(currentThing?.name || '')
  const [type, setType] = useState(currentThing?.type || 'number')
  const [state, setState] = useState(currentThing?.state || '')
  const [errors, setErrors] = useState({})
  useEffect(() => {
    if (type === 'boolean') {
      if (state !== 'true' && state !== 'false') {
        setState('false')
      }
    } else if (type === 'number') {
      if (isNaN(state)) {
        setState(0)
      }
    }
  }, [type, state])

  const isValid = () => {
    const newErrors = {}
    if (!name || name.trim() === '') {
      newErrors.name = 'Name is required'
    }

    if (type === 'number' && isNaN(state)) {
      newErrors.state = 'State must be a number'
    }
    if (type === 'boolean' && !['true', 'false'].includes(state)) {
      newErrors.state = 'State must be true or false'
    }
    if ((type === 'text' && !state) || state.trim() === '') {
      newErrors.state = 'State is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!isValid()) {
      return
    }
    onSave({ name, type, id: currentThing?.id, state: state || null })
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='md'
      title={`${currentThing?.id ? 'Edit' : 'Create'} Thing`}
      footer={
        <ModalActions
          secondary={{
            label: 'Cancel',
            onClick: onClose,
          }}
          primary={{
            label: currentThing?.id ? 'Update' : 'Create',
            onClick: handleSave,
          }}
        />
      }
    >
      <FormControl>
        <Typography>Name</Typography>
        <Textarea
          placeholder='Thing name'
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormHelperText color='danger'>{errors.name}</FormHelperText>
      </FormControl>
      <FormControl>
        <Typography>Type</Typography>
        <Select value={type} onChange={(_, value) => setType(value)}>
          {['text', 'number', 'boolean'].map(type => (
            <Option value={type} key={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Option>
          ))}
        </Select>

        <FormHelperText color='danger'>{errors.type}</FormHelperText>
      </FormControl>
      {type === 'text' && (
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
      )}
      {type === 'number' && (
        <FormControl>
          <Typography>Value</Typography>
          <Input
            placeholder='Thing value'
            type='number'
            value={state || ''}
            onChange={e => {
              setState(e.target.value)
            }}
            sx={{ minWidth: 300 }}
          />
        </FormControl>
      )}
      {type === 'boolean' && (
        <FormControl>
          <Typography>Value</Typography>
          <Select value={state} onChange={(_, value) => setState(value)}>
            {['true', 'false'].map(value => (
              <Option value={value} key={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Option>
            ))}
          </Select>
        </FormControl>
      )}
    </ResponsiveModal>
  )
}
export default CreateThingModal
