import {
  FormControl,
  FormHelperText,
  FormLabel,
  Option,
  Select,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import { useXP } from '../../queries/XPQueries'

export default function XPCategorySelect({
  balances,
  disabled = false,
  includeUncategorized = true,
  onChange,
  value,
}) {
  const { t } = useTranslation('points')
  const { categories } = useXP()
  const choices = balances || categories.data || []
  const selected = value === null || value === undefined ? null : Number(value)
  return (
    <FormControl error={Boolean(categories.error)}>
      <FormLabel>{t('xp.category')}</FormLabel>
      <Select
        aria-label={t('xp.category')}
        value={selected}
        onChange={(_, id) => onChange(id)}
        disabled={disabled || categories.isLoading || Boolean(categories.error)}
        placeholder={t('xp.chooseCategory')}
      >
        {includeUncategorized && !balances && (
          <Option value={0}>{t('xp.uncategorized')}</Option>
        )}
        {choices
          .filter(
            category =>
              balances || !category.archived || category.id === selected,
          )
          .map(category => (
            <Option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? ` (${t('xp.archived')})` : ''}
              {balances ? ` · ${category.balance}` : ''}
            </Option>
          ))}
      </Select>
      {categories.error && (
        <FormHelperText>{categories.error.message}</FormHelperText>
      )}
    </FormControl>
  )
}

XPCategorySelect.propTypes = {
  balances: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      archived: PropTypes.bool,
      balance: PropTypes.number,
    }),
  ),
  disabled: PropTypes.bool,
  includeUncategorized: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.number,
}
