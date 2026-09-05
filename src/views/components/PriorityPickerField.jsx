import { Flag } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import BaseOptionPicker from './BaseOptionPicker'

const defaultPriorityColors = {
  0: '#9CA3AF',
  1: '#EF4444',
  2: '#F97316',
  3: '#FBBF24',
  4: '#3B82F6',
}

const defaultPriorityLabels = {
  0: 'No Priority',
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
}

const PriorityPickerField = ({
  emptyDisplay = 'icon-text',
  onChange,
  onClear,
  priorityColors = defaultPriorityColors,
  priorityLabels = defaultPriorityLabels,
  size = 'sm',
  value = 0,
}) => {
  const { t } = useTranslation('chores')

  const options = [1, 2, 3, 4].map(priorityOption => ({
    id: priorityOption,
    label: priorityLabels[priorityOption],
    color: priorityColors[priorityOption],
  }))

  // Don't add the 0 option to the menu - priority 0 is the "empty" state (icon only)

  return (
    <BaseOptionPicker
      items={options}
      value={value}
      onChange={onChange}
      onClear={onClear}
      emptyDisplay={emptyDisplay}
      size={size}
      getItemValue={item => item.id}
      getItemLabel={item => item.label}
      getItemColor={item => item.color}
      getTriggerText={({ isEmpty, selectedItems }) => {
        // For priority 0 (no priority), show empty string (icon only)
        if (value === 0 || isEmpty) return t('priority')
        return selectedItems[0]?.label || ''
      }}
      renderTriggerIcon={({ isEmpty, selectedItems }) => (
        <Flag
          sx={{
            color: isEmpty || value === 0 ? '' : selectedItems[0]?.color,
            fontSize: '20px',
          }}
        />
      )}
      renderItemStart={({ item }) => (
        <Flag
          sx={{
            color: item.color,
            fontSize: '18px',
          }}
        />
      )}
      menuMinWidth={180}
    />
  )
}

export default PriorityPickerField
