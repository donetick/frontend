import { Label } from '@mui/icons-material'
import BaseOptionPicker from './BaseOptionPicker'

const LabelsPickerField = ({
  values = [],
  onChange,
  onClear,
  labels = [],
  emptyDisplay = 'icon-text',
}) => {
  const options = labels.map(label => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }))

  return (
    <BaseOptionPicker
      items={options}
      multiple
      values={values}
      onValuesChange={onChange}
      onClear={onClear}
      emptyDisplay={emptyDisplay}
      emptyLabel='Labels'
      getItemValue={item => item.id}
      getItemLabel={item => item.name}
      getItemColor={item => item.color}
      renderTriggerIcon={() => <Label sx={{ fontSize: '20px' }} />}
      renderItemStart={({ item }) => (
        <Label
          sx={{
            fontSize: '18px',
            color: item.color || 'text.secondary',
          }}
        />
      )}
      getTriggerText={({ selectedItems, isEmpty }) => {
        if (isEmpty) return 'Labels'
        if (selectedItems.length === 1) return selectedItems[0].name
        return `${selectedItems.length} labels`
      }}
      menuMinWidth={220}
    />
  )
}

export default LabelsPickerField
