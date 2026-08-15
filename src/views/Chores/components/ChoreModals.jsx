import { Capacitor } from '@capacitor/core'
import { useTranslation } from 'react-i18next'
import DateModal from '../../Modals/Inputs/DateModal'
import DueDatePickerModal, {
  combineDueDate,
  splitDueDate,
} from '../../components/DueDatePickerModal'
import NudgeModal from '../../Modals/Inputs/NudgeModal'
import SelectModal from '../../Modals/Inputs/SelectModal'
import TextModal from '../../Modals/Inputs/TextModal'
import WriteNFCModal from '../../Modals/Inputs/WriteNFCModal'

const getNFCUrl = choreId =>
  Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'
    ? `donetick://chores/${choreId}`
    : `${window.location.origin}/chores/${choreId}`

const ChoreModals = ({
  activeModal,
  modalChore,
  membersData,
  onChangeDueDate,
  onCompleteWithPastDate,
  onAssigneeChange,
  onCompleteWithNote,
  onNudge,
  onClose,
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
        <SelectModal
          isOpen={true}
          options={membersData?.res || []}
          displayKey='displayName'
          title={t('modals.delegate')}
          placeholder={t('modals.selectPerformer')}
          onClose={onClose}
          onSave={selected => onAssigneeChange(selected.id)}
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
