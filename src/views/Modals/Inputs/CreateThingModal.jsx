import {
  Box,
  Button,
  FormLabel,
  Input,
  Modal,
  ModalDialog,
  Option,
  Select,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'

function CreateThingModal({ isOpen, onClose, onSave, currentThing }) {
  const [name, setName] = useState(currentThing?.name || '')
  const [type, setType] = useState(currentThing?.type || 'numeric')
  const [state, setState] = useState(currentThing?.state || '')
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
  }, [type])
  const handleSave = () => {
    onSave({ name, type, id: currentThing?.id, state: state || null })
    onClose()
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalDialog>
        {/* <ModalClose /> */}
        <Typography variant='h4'>P;lease add info</Typography>
        <FormLabel>Name</FormLabel>

        <Textarea
          placeholder='Thing name'
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormLabel>Type</FormLabel>
        <Select value={type} sx={{ minWidth: 300 }}>
          {['text', 'number', 'boolean'].map(type => (
            <Option value={type} key={type} onClick={() => setType(type)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Option>
          ))}
        </Select>

        {type === 'text' && (
          <>
            <FormLabel>Value</FormLabel>
            <Input
              placeholder='Thing value'
              value={state || ''}
              onChange={e => setState(e.target.value)}
              sx={{ minWidth: 300 }}
            />
          </>
        )}
        {type === 'number' && (
          <>
            <FormLabel>Value</FormLabel>
            <Input
              placeholder='Thing value'
              type='number'
              value={state || ''}
              onChange={e => {
                setState(e.target.value)
              }}
              sx={{ minWidth: 300 }}
            />
          </>
        )}
        {type === 'boolean' && (
          <>
            <FormLabel>Value</FormLabel>
            <Select sx={{ minWidth: 300 }} value={state}>
              {['true', 'false'].map(value => (
                <Option
                  value={value}
                  key={value}
                  onClick={() => setState(value)}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Option>
              ))}
            </Select>
          </>
        )}

        <Box display={'flex'} justifyContent={'space-around'} mt={1}>
          <Button onClick={handleSave} fullWidth sx={{ mr: 1 }}>
            {currentThing?.id ? 'Update' : 'Create'}
          </Button>
          <Button onClick={onClose} variant='outlined'>
            {currentThing?.id ? 'Cancel' : 'Close'}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default CreateThingModal
