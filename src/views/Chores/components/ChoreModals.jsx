import DateModal from '../../Modals/Inputs/DateModal'
import NudgeModal from '../../Modals/Inputs/NudgeModal'
import SelectModal from '../../Modals/Inputs/SelectModal'
import TextModal from '../../Modals/Inputs/TextModal'
import WriteNFCModal from '../../Modals/Inputs/WriteNFCModal'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['chores', 'common'])
  return (
    <>
      {activeModal === 'changeDueDate' && modalChore && (
        <DateModal
          isOpen={true}
          key={'changeDueDate' + modalChore.id}
          current={modalChore.nextDueDate}
          title={t('chores:actions.changeDueDate')}
          onClose={onClose}
          onSave={onChangeDueDate}
        />
      )}

      {activeModal === 'completeWithPastDate' && modalChore && (
        <DateModal
          isOpen={true}
          key={'completedInPast' + modalChore.id}
          current={modalChore.nextDueDate}
          title={t('chores:actions.completeInPast')}
          onClose={onClose}
          onSave={onCompleteWithPastDate}
        />
      )}

      {activeModal === 'changeAssignee' && modalChore && (
        <SelectModal
          isOpen={true}
          options={membersData?.res || []}
          displayKey='displayName'
          title={t('chores:actions.delegate')}
          placeholder={t('chores:actions.selectPerformer')}
          onClose={onClose}
          onSave={selected => onAssigneeChange(selected.id)}
        />
      )}

      {activeModal === 'completeWithNote' && modalChore && (
        <TextModal
          isOpen={true}
          title={t('chores:actions.addCompletionNote')}
          onClose={onClose}
          okText={t('common:actions.complete')}
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
