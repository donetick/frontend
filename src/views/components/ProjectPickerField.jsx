import { FolderOpen } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import BaseOptionPicker from './BaseOptionPicker'

const ProjectPickerField = ({
  value = 'default',
  onChange,
  onClear,
  projects = [],
  emptyDisplay = 'icon-text',
}) => {
  const { t } = useTranslation('chores')
  const options = [
    { id: 'default', name: t('project.default'), color: '#9CA3AF' },
    ...projects.map(project => ({
      id: project.id,
      name: project.name,
      color: project.color,
    })),
  ]

  return (
    <BaseOptionPicker
      items={options}
      value={value}
      onChange={onChange}
      onClear={onClear}
      emptyDisplay={emptyDisplay}
      emptyLabel={t('project.label')}
      getItemValue={item => item.id}
      getItemLabel={item => item.name}
      getItemColor={item => item.color}
      renderTriggerIcon={() => <FolderOpen sx={{ fontSize: '20px' }} />}
      renderItemStart={({ item }) => (
        <FolderOpen
          sx={{
            fontSize: '18px',
            color: item.color || 'text.secondary',
          }}
        />
      )}
      getTriggerText={({ selectedItems, isEmpty }) =>
        isEmpty ? t('project.label') : selectedItems[0].name
      }
      menuMinWidth={240}
    />
  )
}

export default ProjectPickerField
