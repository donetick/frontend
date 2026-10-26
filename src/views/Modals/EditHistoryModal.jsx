import { CircularProgress, FormLabel, Input } from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions'
import PermissionDeniedModal from '../../components/common/PermissionDeniedModal'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { canEditChoreHistory } from '../../utils/ChoreAccess'
import ConfirmationModal from './Inputs/ConfirmationModal'

function EditHistoryModal({ config, historyRecord }) {
  const { t } = useTranslation('history')
  const { ResponsiveModal } = useResponsiveModal()
  const { data: userProfile, isLoading: isUserLoading } = useUserProfile()
  const { data: membersData, isLoading: isMembersLoading } = useCircleMembers()
  const canEdit = canEditChoreHistory(
    historyRecord,
    userProfile?.id,
    membersData?.res || [],
    userProfile?.circleID,
  )

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

  if (!config?.isOpen) return null

  if (isUserLoading || isMembersLoading) {
    return (
      <ResponsiveModal
        open
        onClose={config.onClose}
        title={t('common:loading')}
      >
        <CircularProgress aria-label={t('common:loading')} />
      </ResponsiveModal>
    )
  }

  if (!canEdit) {
    return (
      <PermissionDeniedModal
        open
        onClose={config.onClose}
        title={t('common:permissionDenied.historyTitle')}
        description={t('common:permissionDenied.historyDescription')}
      />
    )
  }

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      size='lg'
      // fullWidth={true}
      title={t('edit.title')}
      footer={
        <ModalActions
          secondary={{ label: t('common:cancel'), onClick: config.onClose }}
          primary={{
            label: t('common:save'),
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
      <FormLabel>{t('chores:dueDate')}</FormLabel>
      <Input
        type='datetime-local'
        value={dueDate}
        onChange={e => {
          setDueDate(e.target.value)
        }}
        sx={{ mb: 2 }}
      />
      <FormLabel>{t('edit.completedDate')}</FormLabel>
      <Input
        type='datetime-local'
        value={completedDate}
        onChange={e => {
          setCompletedDate(e.target.value)
        }}
        sx={{ mb: 2 }}
      />
      <FormLabel>{t('edit.note')}</FormLabel>
      <Input
        fullWidth
        multiline
        label={t('edit.additionalNotes')}
        placeholder={t('edit.additionalNotes')}
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
          title: t('edit.deleteTitle'),
          message: t('edit.deleteMessage'),
          confirmText: t('common:delete'),
          cancelText: t('common:cancel'),
          color: 'danger',
        }}
      />
    </ResponsiveModal>
  )
}
export default EditHistoryModal
