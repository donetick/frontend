import { Add, Check, Label } from '@mui/icons-material'
import { Button } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { filterLabels, sortLabels } from '../../utils/LabelPickerOptions'
import LabelModal from '../Modals/Inputs/LabelModal'
import BaseOptionPicker from './BaseOptionPicker'

const LabelsPickerField = ({
  emptyDisplay = 'icon-text',
  labels = [],
  onChange,
  onClear,
  values = [],
}) => {
  const { i18n, t } = useTranslation('labels')
  const [createOpen, setCreateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const options = sortLabels(labels, i18n.resolvedLanguage)

  return (
    <>
      <BaseOptionPicker
        items={options}
        filterItems={filterLabels}
        searchPlaceholder={t('search.placeholder')}
        noResultsText={t('search.noResultsTitle')}
        multiple
        values={values}
        onValuesChange={onChange}
        onClear={onClear}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        emptyDisplay={emptyDisplay}
        emptyLabel={t('picker.label')}
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
        renderItemEnd={({ selected }) =>
          selected ? <Check sx={{ fontSize: 18, ml: 'auto' }} /> : null
        }
        getTriggerText={({ isEmpty, selectedItems }) => {
          if (isEmpty) return t('picker.label')
          if (selectedItems.length === 1) return selectedItems[0].name
          return t('picker.labelsCount', { count: selectedItems.length })
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
            {t('picker.createLabel')}
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
