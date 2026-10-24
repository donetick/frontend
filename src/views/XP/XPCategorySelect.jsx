import {
  FormControl,
  FormHelperText,
  FormLabel,
  Option,
  Select,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import { useXPCategories } from '../../queries/XPQueries'

export default function XPCategorySelect({ onChange, value }) {
  const { t } = useTranslation('points')
  const { data: categories, isError, isPending } = useXPCategories()
  const selected = categories?.find(category => category.id === value)
  return (
    <FormControl error={isError}>
      <FormLabel>{t('xp.category')}</FormLabel>
      <Select
        value={value ?? 0}
        onChange={(_, id) => onChange(id === 0 ? null : id)}
        disabled={isPending || isError}
        aria-label={t('xp.category')}
      >
        <Option value={0}>{t('xp.uncategorized')}</Option>
        {categories
          ?.filter(category => !category.archived || category.id === value)
          .map(category => (
            <Option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? ` (${t('xp.archived')})` : ''}
            </Option>
          ))}
        {value && !selected && (
          <Option value={value}>{t('xp.unavailableCategory')}</Option>
        )}
      </Select>
      {isError && <FormHelperText>{t('xp.loadError')}</FormHelperText>}
    </FormControl>
  )
}
XPCategorySelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.number,
}
