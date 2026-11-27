import { Check } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { useResponsiveQuery } from '../../hooks/useResponsiveQuery'

/**
 * The check an ActionMenu row carries when it is the chosen one in a set.
 *
 * On desktop the unselected rows get an empty placeholder instead of nothing:
 * a menu row that grows an icon only once selected shifts its label sideways
 * as you move down the list. The sheet's own rows already reserve the column.
 */
export const useSelectionMark = () => {
  const isSmallScreen = useResponsiveQuery('small')
  // Named, not an arrow: an anonymous function returning JSX reads to
  // react/display-name as an undeclared component.
  function selectionMark(isSelected) {
    if (isSelected) return <Check fontSize='small' />
    return isSmallScreen ? null : <span />
  }
  return selectionMark
}

/**
 * Sort-by and direction as ActionMenu items, for the pages whose only sort
 * controls are a choice of field and a direction. As a panel they drill down
 * inside the actions surface instead of stacking a second modal on it.
 *
 * `keepOpen` so picking a field and then its direction takes one visit.
 */
export const useSortPanelItems = ({
  direction,
  onChange,
  onDirectionChange,
  options,
  value,
}) => {
  const { t } = useTranslation('common')
  const mark = useSelectionMark()

  return [
    ...options.map(option => ({
      key: `sort-${option.value}`,
      label: option.name,
      icon: mark(value === option.value),
      keepOpen: true,
      onClick: () => onChange(option.value),
      selected: value === option.value,
    })),
    { key: 'sort-direction-divider', type: 'divider' },
    ...['asc', 'desc'].map(item => ({
      key: `sort-${item}`,
      label: t(
        item === 'asc' ? 'sortAndFilter.ascending' : 'sortAndFilter.descending',
      ),
      icon: mark(direction === item),
      keepOpen: true,
      onClick: () => onDirectionChange(item),
      selected: direction === item,
    })),
  ]
}

export default useSortPanelItems
