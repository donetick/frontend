import { Person } from '@mui/icons-material'
import BaseOptionPicker from './BaseOptionPicker'

const AssigneePickerPreview = ({
  value = null,
  onChange,
  onClear,
  members = [],
  includeAnyone = true,
  emptyDisplay,
}) => {
  const options = [
    ...(includeAnyone ? [{ userId: 'anyone', displayName: 'Anyone' }] : []),
    ...members.map(member => ({
      userId: member.userId,
      displayName: member.displayName || member.username || 'Unknown',
    })),
  ]

  return (
    <BaseOptionPicker
      items={options}
      value={value}
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

export default AssigneePickerPreview
