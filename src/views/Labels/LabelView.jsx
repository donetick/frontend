import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useLabels } from './LabelQueries'

// import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Add } from '@mui/icons-material'
import { useQueryClient } from 'react-query'
import { DeleteLabel } from '../../utils/Fetcher'
import { getTextColorFromBackgroundColor } from '../../utils/LabelColors'

const LabelView = () => {
  const { data: labels, isLabelsLoading, isError } = useLabels()

  const [userLabels, setUserLabels] = useState([labels])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentLabel, setCurrentLabel] = useState(null) // Label being edited or null for new label

  const queryClient = useQueryClient()

  const handleAddLabel = () => {
    setCurrentLabel(null) // Adding a new label
    setModalOpen(true)
  }

  const handleEditLabel = label => {
    setCurrentLabel(label) // Editing an existing label
    setModalOpen(true)
  }

  const handleDeleteLabel = id => {
    DeleteLabel(id).then(res => {
      // Invalidate and refetch labels after deleting a label
      const updatedLabels = userLabels.filter(label => label.id !== id)
      setUserLabels(updatedLabels)

      queryClient.invalidateQueries('labels')
    })
    // Implement deletion logic here
  }

  const handleSaveLabel = newOrUpdatedLabel => {
    queryClient.invalidateQueries('labels')
    setModalOpen(false)
    const updatedLabels = userLabels.map(label =>
      label.id === newOrUpdatedLabel.id ? newOrUpdatedLabel : label,
    )
    setUserLabels(updatedLabels)
  }

  useEffect(() => {
    if (labels) {
      setUserLabels(labels)
    }
  }, [labels])

  if (isLabelsLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography color='danger' textAlign='center'>
        Failed to load labels. Please try again.
      </Typography>
    )
  }

  return (
    <Container maxWidth='md'>
      <Typography level='h2' sx={{ my: 2 }}>
        Labels
      </Typography>
      <div className='flex flex-col gap-2'>
        {userLabels.map(label => (
          <div
            key={label}
            className='grid w-full grid-cols-[1fr,auto,auto] rounded-lg border border-zinc-200/80 p-4 shadow-sm dark:bg-zinc-900'
          >
            <Chip
              variant='outlined'
              color='primary'
              size='lg'
              sx={{
                background: label.color,
                borderColor: label.color,
                color: getTextColorFromBackgroundColor(label.color),
              }}
            >
              {label.name}
            </Chip>

            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                onClick={() => handleEditLabel(label)}
                startDecorator={<EditIcon />}
              >
                Edit
              </Button>
              <IconButton
                size='sm'
                variant='soft'
                onClick={() => handleDeleteLabel(label.id)}
                color='danger'
              >
                <DeleteIcon />
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      {userLabels.length === 0 && (
        <Typography textAlign='center' mt={2}>
          No labels available. Add a new label to get started.
        </Typography>
      )}

      {modalOpen && (
        <LabelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveLabel}
          label={currentLabel}
        />
      )}

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 10,
          p: 2, // padding
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
        }}
      >
        <IconButton
          color='primary'
          variant='solid'
          sx={{
            borderRadius: '50%',
            width: 50,
            height: 50,
          }}
          onClick={handleAddLabel}
        >
          <Add />
        </IconButton>
      </Box>
    </Container>
  )
}

export default LabelView
