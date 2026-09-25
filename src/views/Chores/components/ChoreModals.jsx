import { Capacitor } from '@capacitor/core'
import { useTranslation } from 'react-i18next'

import { BASE_PATH } from '../../../Config'

import DueDatePickerModal, {
  combineDueDate,
  splitDueDate,
} from '../../components/DueDatePickerModal'
import AssigneeModal from '../../Modals/Inputs/AssigneeModal'
import DateModal from '../../Modals/Inputs/DateModal'
import NudgeModal from '../../Modals/Inputs/NudgeModal'
import TextModal from '../../Modals/Inputs/TextModal'
import WriteNFCModal from '../../Modals/Inputs/WriteNFCModal'

const getNFCUrl = choreId =>
  Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'
    ? `donetick://chores/${choreId}`
    : `${window.location.origin}${BASE_PATH}/chores/${choreId}`

const ChoreModals = ({
  activeModal,
  membersData,
  modalChore,
  onAssigneeChange,
  onChangeDueDate,
  onClose,
  onCompleteWithNote,
  onCompleteWithPastDate,
  onNudge,
}) => {
  const { t } = useTranslation('chores')
  return (
    <>
      {activeModal === 'changeDueDate' && modalChore && (
        <DueDatePickerModal
          open={true}
          key={'changeDueDate' + modalChore.id}
          title={t('modals.changeDueDate')}
          {...splitDueDate(modalChore.nextDueDate)}
          onClose={onClose}
          onApply={parts =>
            onChangeDueDate(combineDueDate(parts)?.toISOString() ?? null)
          }
          onRemove={() => onChangeDueDate(null)}
        />
      )}

      {activeModal === 'completeWithPastDate' && modalChore && (
        <DateModal
          isOpen={true}
          key={'completedInPast' + modalChore.id}
          current={modalChore.nextDueDate}
          title={t('modals.completePast')}
          onClose={onClose}
          onSave={onCompleteWithPastDate}
        />
      )}

      {activeModal === 'changeAssignee' && modalChore && (
        <AssigneeModal
          isOpen={true}
          members={membersData?.res || []}
          assignedTo={modalChore.assignedTo}
          title={t('modals.delegate')}
          onClose={onClose}
          onSave={onAssigneeChange}
        />
      )}

      {activeModal === 'completeWithNote' && modalChore && (
        <TextModal
          isOpen={true}
          title={t('modals.addNote')}
          onClose={onClose}
          okText={t('modals.complete')}
          onSave={onCompleteWithNote}
        />
      )}

      {activeModal === 'writeNFC' && modalChore && (
        <WriteNFCModal
          config={{
            isOpen: true,
            url: getNFCUrl(modalChore.id),
            onClose: onClose,
          }}
        />
      )}

      {activeModal === 'nudge' && modalChore && (
        <NudgeModal
          config={{
            isOpen: true,
            choreId: modalChore.id,
            onClose: onClose,
            onConfirm: onNudge,
          }}
        />
      )}
    </>
  )
}

export default ChoreModals
