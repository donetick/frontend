import { Person } from '@mui/icons-material'
import BaseOptionPicker from './BaseOptionPicker'

const AssigneePickerField = ({
  value = null,
  onChange,
  onClear,
  members = [],
  includeAnyone = true,
  emptyDisplay,
  currentUserId = null,
}) => {
  const options = [
    ...(includeAnyone ? [{ userId: 'anyone', displayName: 'Anyone' }] : []),
    ...members.map(member => ({
      userId: member.userId,
      displayName: member.displayName || member.username || 'Unknown',
    })),
  ]

  const displayValue = currentUserId && value === currentUserId ? null : value

  return (
    <BaseOptionPicker
      items={options}
      value={displayValue}
      onChange={onChange}
      onClear={onClear}
      emptyDisplay={emptyDisplay}
      emptyLabel='Assignee'
      getItemValue={item => item.userId}
      getItemLabel={item => item.displayName}
      renderTriggerIcon={() => <Person sx={{ fontSize: '20px' }} />}
      renderItemStart={() => <Person sx={{ fontSize: '18px' }} />}
      getTriggerText={({ selectedItems, isEmpty }) =>
        isEmpty ? 'Assignee' : selectedItems[0].displayName
      }
      menuMinWidth={220}
    />
  )
}

export default AssigneePickerField
