import { FilterAlt } from '@mui/icons-material'
import { Box, Stack, Typography } from '@mui/joy'
import { getIconComponent } from '../../../utils/ProjectIcons.jsx'

const MyChoreHeader = ({
  activeFilterId,
  activeFilter,
  selectedProject,
  tempFilter,
  tempFilterMeta,
}) => {
  if (
    !activeFilterId &&
    !tempFilter &&
    (!selectedProject || selectedProject.id === 'default')
  )
    return null

  const renderIcon = () => {
    if (tempFilter) {
      return tempFilterMeta?.icon ? (
        <Box sx={{ fontSize: '2rem', display: 'flex', alignItems: 'center' }}>
          {tempFilterMeta.icon}
        </Box>
      ) : (
        <FilterAlt sx={{ fontSize: '2rem', color: 'primary.main' }} />
      )
    }
    if (activeFilterId) {
      return <FilterAlt sx={{ fontSize: '2rem', color: 'primary.main' }} />
    }
    if (selectedProject) {
      const iconValue = selectedProject.icon || 'FolderOpen'
      const IconComponent = getIconComponent(iconValue)
      return (
        <IconComponent
          sx={{
            fontSize: 32,
            color: selectedProject.color || 'primary.main',
          }}
        />
      )
    }
    return null
  }

  const name = tempFilter
    ? tempFilterMeta?.name || 'Smart Filter'
    : activeFilter?.name || selectedProject?.name

  const description = tempFilter
    ? tempFilterMeta?.description
    : activeFilter?.description || selectedProject?.description

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      {renderIcon()}
      <Stack sx={{ flex: 1 }}>
        <Typography level='h3' sx={{ fontWeight: 'lg', color: 'text.primary' }}>
          {name}
        </Typography>
        {description && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

export default MyChoreHeader
