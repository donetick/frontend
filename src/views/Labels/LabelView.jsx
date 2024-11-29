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
import { useNavigate } from 'react-router-dom'
import { DeleteLabel } from '../../utils/Fetcher'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'

const LabelView = () => {
  const { data: labels, isLabelsLoading, isError } = useLabels()
  const [userLabels, setUserLabels] = useState([labels])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentLabel, setCurrentLabel] = useState(null)
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})
  const Navigate = useNavigate()
  const handleAddLabel = () => {
    setCurrentLabel(null)
    setModalOpen(true)
  }

  const handleEditLabel = label => {
    setCurrentLabel(label)
    setModalOpen(true)
  }

  const handleDeleteClicked = id => {
    setConfirmationModel({
      isOpen: true,
      title: 'Delete Label',

      message:
        'Are you sure you want to delete this label? This will remove the label from all tasks.',

      confirmText: 'Delete',
      color: 'danger',
      cancelText: 'Cancel',
      onClose: confirmed => {
        if (confirmed) {
          handleDeleteLabel(id)
        }
        setConfirmationModel({})
      },
    })
  }

  const handleDeleteLabel = id => {
    DeleteLabel(id).then(res => {
      const updatedLabels = userLabels.filter(label => label.id !== id)
      setUserLabels(updatedLabels)

      queryClient.invalidateQueries('labels')
    })
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
              <td
                onClick={() => {
                  Navigate('/my/chores', { state: { label: label.id } })
                }}
              >
                {label.name}
              </td>
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
                  onClick={() => handleDeleteClicked(label.id)}
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
          p: 2,
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
      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default LabelView
