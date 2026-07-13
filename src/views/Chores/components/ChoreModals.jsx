import DateModal from '../../Modals/Inputs/DateModal'
import NudgeModal from '../../Modals/Inputs/NudgeModal'
import SelectModal from '../../Modals/Inputs/SelectModal'
import TextModal from '../../Modals/Inputs/TextModal'
import WriteNFCModal from '../../Modals/Inputs/WriteNFCModal'

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
        <DateModal
          isOpen={true}
          key={'changeDueDate' + modalChore.id}
          current={modalChore.nextDueDate}
          title='Change due date'
          onClose={onClose}
          onSave={onChangeDueDate}
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
            url: `${window.location.origin}/chores/${modalChore.id}`,
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
