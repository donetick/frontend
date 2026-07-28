import { Add, Label } from '@mui/icons-material'
import { Button } from '@mui/joy'
import { useState } from 'react'
import LabelModal from '../Modals/Inputs/LabelModal'
import BaseOptionPicker from './BaseOptionPicker'

const LabelsPickerField = ({
  values = [],
  onChange,
  onClear,
  labels = [],
  emptyDisplay = 'icon-text',
}) => {
  const [createOpen, setCreateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const options = labels.map(label => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }))

  return (
    <>
      <BaseOptionPicker
        items={options}
        multiple
        values={values}
        onValuesChange={onChange}
        onClear={onClear}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
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
        menuFooter={
          <Button
            size='sm'
            variant='plain'
            color='neutral'
            startDecorator={<Add sx={{ fontSize: '16px' }} />}
            onClick={e => {
              e.stopPropagation()
              setPickerOpen(false)
              setCreateOpen(true)
            }}
            sx={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Create label
          </Button>
        }
      />
      <LabelModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        label={null}
      />
    </>
  )
}

export default LabelsPickerField
