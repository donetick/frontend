import { Box, Button, FormLabel, Input, Typography } from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'

import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import ConfirmationModal from './Inputs/ConfirmationModal'

function EditHistoryModal({ config, historyRecord }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [completedDate, setCompletedDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (config?.isOpen && historyRecord?.performedAt) {
      setCompletedDate(
        moment(historyRecord.performedAt).format('YYYY-MM-DDTHH:mm'),
      )
      setDueDate(
        historyRecord.dueDate
          ? moment(historyRecord.dueDate).format('YYYY-MM-DDTHH:mm')
          : '',
      )
      setNotes(historyRecord.notes || '')
    }
  }, [config?.isOpen, historyRecord])

  // Don't render modal content if no valid historyRecord
  if (!historyRecord?.performedAt) {
    return null
  }

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      size='lg'
      // fullWidth={true}
    >
      <Typography level='h4' mb={1}>
        Edit History
      </Typography>
      <FormLabel>Due Date</FormLabel>
      <Input
        type='datetime-local'
        value={dueDate}
        onChange={e => {
          setDueDate(e.target.value)
        }}
      />
      <FormLabel>Completed Date</FormLabel>
      <Input
        type='datetime-local'
        value={completedDate}
        onChange={e => {
          setCompletedDate(e.target.value)
        }}
      />
      <FormLabel>Note</FormLabel>
      <Input
        fullWidth
        multiline
        label='Additional Notes'
        placeholder='Additional Notes'
        value={notes}
        onChange={e => {
          if (e.target.value.trim() === '') {
            setNotes(null)
            return
          }
          setNotes(e.target.value)
        }}
        size='md'
        sx={{
          mb: 1,
        }}
      />

      {/* 3 button save , cancel and delete */}
      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button
          size='lg'
          onClick={() =>
            config.onSave({
              id: historyRecord.id,
              performedAt: moment(completedDate).toISOString(),
              dueDate: moment(dueDate).toISOString(),
              notes,
            })
          }
          fullWidth
          sx={{ mr: 1 }}
        >
          Save
        </Button>
        <Button fullWidth size='lg' onClick={config.onClose} variant='outlined'>
          Cancel
        </Button>
      </Box>
      <ConfirmationModal
        config={{
          isOpen: isDeleteModalOpen,
          onClose: isConfirm => {
            if (isConfirm) {
              config.onDelete(historyRecord.id)
            }
            setIsDeleteModalOpen(false)
          },
          title: 'Delete History',
          message: 'Are you sure you want to delete this history?',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        }}
      />
    </ResponsiveModal>
  )
}
export default EditHistoryModal
