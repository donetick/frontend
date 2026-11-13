import Add from '@mui/icons-material/Add'
import Autocomplete, { createFilterOptions } from '@mui/joy/Autocomplete'
import AutocompleteOption from '@mui/joy/AutocompleteOption'
import FormControl from '@mui/joy/FormControl'
import ListItemDecorator from '@mui/joy/ListItemDecorator'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

const filter = createFilterOptions()

export default function FreeSoloCreateOption({
  onSelectChange,
  options,
  selected,
}) {
  const { t } = useTranslation('common')
  React.useEffect(() => {
    setValue(options)
  }, [options])

  const [value, setValue] = React.useState([selected])
  const [selectOptions, setSelectOptions] = React.useState(
    selected ? selected : [],
  )
  return (
    <FormControl id='free-solo-with-text-demo'>
      <Autocomplete
        value={value}
        multiple
        size='lg'
        on
        onChange={(event, newValue) => {
          if (typeof newValue === 'string') {
            setValue({
              title: newValue,
            })
          } else if (newValue && newValue.inputValue) {
            // Create a new value from the user input
            setValue({
              title: newValue.inputValue,
            })
          } else {
            setValue(newValue)
          }
          onSelectChange(newValue)
        }}
        filterOptions={(selected, params) => {
          const filtered = filter(selected, params)

          const { inputValue } = params
          // Suggest the creation of a new value
          const isExisting = selected.some(
            option => inputValue === option.title,
          )
          if (inputValue !== '' && !isExisting) {
            filtered.push({
              inputValue,
              title: t('common:ui.remaining.addOption', { value: inputValue }),
            })
          }
          return filtered
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        // freeSolo
        options={options}
        getOptionLabel={option => {
          // Value selected with enter, right from the input
          if (typeof option === 'string') {
            return option
          }
          // Add "xxx" option created dynamically
          if (option.inputValue) {
            return option.inputValue
          }
          // Regular option
          return option.title
        }}
        renderOption={(props, option) => (
          <AutocompleteOption {...props}>
            {option.title?.startsWith('Add "') && (
              <ListItemDecorator>
                <Add />
              </ListItemDecorator>
            )}

            {option.title ? option.title : option}
          </AutocompleteOption>
        )}
      />
    </FormControl>
  )
}
