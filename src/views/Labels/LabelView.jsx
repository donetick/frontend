import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  CircularProgress,
  Container,
  IconButton,
  Table,
  Typography,
} from '@mui/joy'
import React, { useEffect, useState } from 'react'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useLabels } from './LabelQueries'

// import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Add } from '@mui/icons-material'
import { useQueryClient } from 'react-query'
import { DeleteLabel } from '../../utils/Fetcher'

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
      <Table aria-label='Manage Labels' stickyHeader hoverRow>
        <thead>
          <tr>
            <th style={{ textAlign: 'center' }}>Label</th>
            <th style={{ textAlign: 'center' }}>Color</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {userLabels.map(label => (
            <tr key={label.id}>
              <td>{label.name}</td>
              <td
                style={{
                  // center without display flex:
                  textAlign: 'center',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  width={20}
                  height={20}
                  borderRadius='50%'
                  sx={{
                    backgroundColor: label.color,
                  }}
                />
              </td>
              <td
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <IconButton onClick={() => handleEditLabel(label)}>
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleDeleteLabel(label.id)}
                  color='danger'
                >
                  <DeleteIcon />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

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
