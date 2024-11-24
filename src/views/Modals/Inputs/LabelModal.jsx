import {
  Box,
  Button,
  FormControl,
  Input,
  Modal,
  ModalDialog,
  Option,
  Select,
  Typography,
} from '@mui/joy'

import React, { useEffect } from 'react'
import { useQueryClient } from 'react-query'
import { CreateLabel, UpdateLabel } from '../../../utils/Fetcher'
import LABEL_COLORS from '../../../utils/LabelColors'
import { useLabels } from '../../Labels/LabelQueries'

function LabelModal({ isOpen, onClose, onSave, label }) {
  const [labelName, setLabelName] = React.useState('')
  const [color, setColor] = React.useState('')
  const [error, setError] = React.useState('')
  const { data: userLabels, isLoadingLabels } = useLabels()
  const queryClient = useQueryClient()

  // Populate the form fields when editing
  useEffect(() => {
    if (label) {
      setLabelName(label.name)
      setColor(label.color)
    } else {
      setLabelName('')
      setColor('')
    }
    setError('')
  }, [label])

  const validateLabel = () => {
    if (!labelName || labelName.trim() === '') {
      setError('Name cannot be empty')
      return false
    } else if (
      userLabels.some(
        userLabel => userLabel.name === labelName && userLabel.id !== label.id,
      )
    ) {
      setError('Label with this name already exists')
      return false
    } else if (color === '') {
      setError('Please select a color')
      return false
    }
    return true
  }

  const handleSave = () => {
    if (!validateLabel()) {
      return
    }

    const saveAction = label
      ? UpdateLabel({ id: label.id, name: labelName, color })
      : CreateLabel({ name: labelName, color })

    saveAction.then(res => {
      if (res.error) {
        console.log(res.error)
        setError('Failed to save label. Please try again.')
        return
      }
      res.json().then(data => {
        if (data.error) {
          setError('Failed to save label. Please try again.')
          return
        }
        onSave({ id: data?.res?.id, name: labelName, color })
        onClose()
      })
    })
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalDialog>
        <Typography level='title-md' mb={1}>
          {label ? 'Edit Label' : 'Add Label'}
        </Typography>
        <FormControl>
          <Typography level='body-sm' alignSelf={'start'}>
            Name
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            name='labelName'
            type='text'
            id='labelName'
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
          />
        </FormControl>

        {/* Color Selection */}
        <FormControl>
          <Typography level='body-sm' alignSelf={'start'}>
            Color:
          </Typography>

          <Select
            label='Color'
            value={color}
            renderValue={selected => (
              <Typography
                key={selected.value}
                startDecorator={
                  <Box
                    className='h-4 w-4'
                    borderRadius={10}
                    sx={{
                      background: selected.value,
                      shadow: { xs: 1 },
                    }}
                  />
                }
              >
                {selected.label}
              </Typography>
            )}
            onChange={(e, value) => {
              value && setColor(value)
            }}
          >
            {LABEL_COLORS.map(val => (
              <Option key={val.value} value={val.value}>
                <Box className='flex items-center justify-between'>
                  <Box
                    width={20}
                    height={20}
                    borderRadius={10}
                    sx={{
                      background: val.value,
                    }}
                  />
                  <Typography
                    sx={{
                      ml: 1,
                      color: 'text.secondary',
                    }}
                    variant='caption'
                  >
                    {val.name}
                  </Typography>
                </Box>
              </Option>
            ))}
          </Select>
          {error && (
            <Typography color='warning' level='body-sm'>
              {error}
            </Typography>
          )}
        </FormControl>

        <Box display={'flex'} justifyContent={'space-around'} mt={1}>
          <Button onClick={handleSave} fullWidth sx={{ mr: 1 }}>
            {label ? 'Save Changes' : 'Add Label'}
          </Button>
          <Button onClick={onClose} variant='outlined'>
            Cancel
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default LabelModal
