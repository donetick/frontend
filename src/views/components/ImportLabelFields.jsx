import { Add, Check, LabelOutlined } from '@mui/icons-material'
import {
  Autocomplete,
  AutocompleteOption,
  Box,
  Button,
  Checkbox,
  Chip,
  ChipDelete,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import { filterLabels, sortLabels } from '../../utils/LabelPickerOptions'
import EditorSection from '../ChoreEdit/EditorSection'

export default function ImportLabelFields({
  disabled,
  itemAsLabel,
  labels,
  onAddNew,
  onChange,
  onItemAsLabelChange,
  selected,
  showItemAsLabel,
}) {
  const { i18n, t } = useTranslation('chores')
  const summary = selected.map(label => label.name).join(', ')
  return (
    <EditorSection
      title={t('bulkImport.labelsTitle')}
      icon={LabelOutlined}
      section='import-labels'
      summary={summary}
      collapsible
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography level='body-sm' textColor='text.tertiary'>
          {t('bulkImport.labelsHint')}
        </Typography>
        {showItemAsLabel && (
          <Checkbox
            label={t('templateLibrary.itemAsLabel')}
            checked={itemAsLabel}
            disabled={disabled}
            onChange={event => onItemAsLabelChange(event.target.checked)}
          />
        )}
        <Autocomplete
          multiple
          disableCloseOnSelect
          disabled={disabled}
          options={sortLabels(labels, i18n.resolvedLanguage)}
          value={selected}
          getOptionLabel={label => label.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) =>
            filterLabels(options, inputValue)
          }
          onChange={(_, newValue) => onChange(newValue)}
          placeholder={t('labels:search.placeholder')}
          noOptionsText={t('labels:search.noResultsTitle')}
          slotProps={{
            input: { 'aria-label': t('bulkImport.labelsTitle') },
            listbox: { sx: { maxHeight: 280 } },
          }}
          renderOption={(props, label, { selected: isSelected }) => (
            <AutocompleteOption {...props} key={label.id}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: label.color || 'text.secondary',
                }}
              />
              {label.name}
              {isSelected && <Check sx={{ ml: 'auto', fontSize: 18 }} />}
            </AutocompleteOption>
          )}
          renderTags={(value, getTagProps) =>
            value.map((label, index) => {
              const { key, ...tagProps } = getTagProps({ index })
              return (
                <Chip
                  key={label.id}
                  endDecorator={
                    <ChipDelete key={key} {...tagProps} disabled={disabled} />
                  }
                  variant='soft'
                  sx={{
                    background: label.color,
                    color: getTextColorFromBackgroundColor(label.color),
                  }}
                >
                  {label.name}
                </Chip>
              )
            })
          }
          sx={{ minWidth: 0, width: '100%' }}
        />
        <Button
          size='sm'
          variant='plain'
          color='neutral'
          startDecorator={<Add />}
          disabled={disabled}
          onClick={onAddNew}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('choreEdit.addNewLabel')}
        </Button>
      </Box>
    </EditorSection>
  )
}

ImportLabelFields.propTypes = {
  disabled: PropTypes.bool,
  itemAsLabel: PropTypes.bool,
  labels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
    }),
  ).isRequired,
  onAddNew: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onItemAsLabelChange: PropTypes.func,
  selected: PropTypes.array.isRequired,
  showItemAsLabel: PropTypes.bool,
}
