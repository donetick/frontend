import { Person } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import BaseOptionPicker from './BaseOptionPicker'

const ANYONE = 'anyone'

const AssigneePickerField = ({
  currentUserId = null,
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

  // An implicit self-assignment is shown as "unset" so the chip stays empty
  // until the user picks someone explicitly.
  const isImplicitSelf =
    !isAnyone &&
    currentUserId &&
    values.length === 1 &&
    values[0] === currentUserId

  const displayValues = isAnyone ? [ANYONE] : isImplicitSelf ? [] : values

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
      renderItemStart={() => <Person sx={{ fontSize: '18px' }} />}
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
