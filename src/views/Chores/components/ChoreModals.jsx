import { Capacitor } from '@capacitor/core'
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
  return (
    <>
      {activeModal === 'changeDueDate' && modalChore && (
        <DueDatePickerModal
          open={true}
          key={'changeDueDate' + modalChore.id}
          title='Change due date'
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
          title='Save Chore that you completed in the past'
          onClose={onClose}
          onSave={onCompleteWithPastDate}
        />
      )}

      {activeModal === 'changeAssignee' && modalChore && (
        <SelectModal
          isOpen={true}
          options={membersData?.res || []}
          displayKey='displayName'
          title='Delegate to someone else'
          placeholder='Select a performer'
          onClose={onClose}
          onSave={selected => onAssigneeChange(selected.id)}
        />
      )}

      {activeModal === 'completeWithNote' && modalChore && (
        <TextModal
          isOpen={true}
          title='Add note to attach to this completion:'
          onClose={onClose}
          okText='Complete'
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
