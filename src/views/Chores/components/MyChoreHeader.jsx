import { FilterAlt } from '@mui/icons-material'
import { Box, Stack, Typography } from '@mui/joy'

import { getIconComponent } from '../../../utils/ProjectIcons.jsx'

const MyChoreHeader = ({
  activeFilter,
  activeFilterId,
  selectedProject,
  tempFilter,
  tempFilterMeta,
}) => {
  const isVisible =
    !!activeFilterId ||
    !!tempFilter ||
    (!!selectedProject && selectedProject.id !== 'default')

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
    <Box
      sx={{
        overflow: 'hidden',
        maxHeight: isVisible ? '120px' : '0',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
        transition:
          'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        marginBottom: isVisible ? 2 : 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {renderIcon()}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {name}
          </Typography>
          <Box
            sx={{
              overflow: 'hidden',
              maxHeight: description ? '40px' : '0',
              opacity: description ? 1 : 0,
              transition:
                'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
            }}
          >
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

export default MyChoreHeader
