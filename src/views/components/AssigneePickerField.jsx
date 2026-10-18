import { CheckCircle, Person } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import BaseOptionPicker from './BaseOptionPicker'

const ANYONE = 'anyone'

const AssigneePickerField = ({
  emptyDisplay,
  includeAnyone = true,
  isAnyone = false,
  members = [],
  onChange,
  onClear,
  values = [],
}) => {
  const { t } = useTranslation('chores')

  const options = [
    ...(includeAnyone
      ? [{ userId: ANYONE, displayName: t('assignee.anyone') }]
      : []),
    ...members.map(member => ({
      userId: member.userId,
      displayName:
        member.displayName || member.username || t('assignee.unknown'),
    })),
  ]

  // Only an empty value is unassigned. In particular, keep the current user
  // visible: hiding self-assignment made both the menu and trigger appear
  // unchanged after selecting yourself.
  const displayValues = isAnyone ? [ANYONE] : values

  const handleValuesChange = nextValues => {
    const wasAnyone = displayValues.includes(ANYONE)
    const hasAnyone = nextValues.includes(ANYONE)

    if (hasAnyone && !wasAnyone) {
      onChange?.([ANYONE])
      return
    }

    onChange?.(nextValues.filter(userId => userId !== ANYONE))
  }

  return (
    <BaseOptionPicker
      items={options}
      multiple
      values={displayValues}
      onValuesChange={handleValuesChange}
      onClear={onClear}
      emptyDisplay={emptyDisplay}
      emptyLabel={t('assignee.label')}
      getItemValue={item => item.userId}
      getItemLabel={item => item.displayName}
      renderTriggerIcon={() => <Person sx={{ fontSize: '20px' }} />}
      renderItemStart={({ selected }) =>
        selected ? (
          <CheckCircle color='primary' sx={{ fontSize: '18px' }} />
        ) : (
          <Person sx={{ fontSize: '18px' }} />
        )
      }
      getTriggerText={({ isEmpty, selectedItems }) => {
        if (isEmpty) return t('assignee.label')
        if (selectedItems.length === 1) return selectedItems[0].displayName
        return t('assignee.selectedCount', { count: selectedItems.length })
      }}
      menuMinWidth={220}
    />
  )
}

export default AssigneePickerField
