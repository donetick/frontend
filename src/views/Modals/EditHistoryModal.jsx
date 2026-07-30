import { FormLabel, Input } from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'

import ModalActions from '../../components/common/ModalActions'
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
      title='Edit History'
      footer={
        <ModalActions
          secondary={{ label: 'Cancel', onClick: config.onClose }}
          primary={{
            label: 'Save',
            onClick: () =>
              config.onSave({
                id: historyRecord.id,
                performedAt: moment(completedDate).toISOString(),
                dueDate: moment(dueDate).toISOString(),
                notes,
              }),
          }}
        />
      }
    >
      <FormLabel>Due Date</FormLabel>
      <Input
        type='datetime-local'
        value={dueDate}
        onChange={e => {
          setDueDate(e.target.value)
        }}
        sx={{ mb: 2 }}
      />
      <FormLabel>Completed Date</FormLabel>
      <Input
        type='datetime-local'
        value={completedDate}
        onChange={e => {
          setCompletedDate(e.target.value)
        }}
        sx={{ mb: 2 }}
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
          mb: 2,
        }}
      />

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
          color: 'danger',
        }}
      />
    </ResponsiveModal>
  )
}
export default EditHistoryModal
