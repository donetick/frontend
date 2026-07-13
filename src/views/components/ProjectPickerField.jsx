import { FolderOpen } from '@mui/icons-material'
import BaseOptionPicker from './BaseOptionPicker'

const ProjectPickerField = ({
  value = 'default',
  onChange,
  onClear,
  projects = [],
  emptyDisplay = 'icon-text',
}) => {
  const options = [
    { id: 'default', name: 'Default Project', color: '#9CA3AF' },
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
      emptyLabel='Project'
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
        isEmpty ? 'Project' : selectedItems[0].name
      }
      menuMinWidth={240}
    />
  )
}

export default ProjectPickerField
