import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import PROJECT_ICONS, { getIconComponent } from '../../../utils/ProjectIcons'
import {
  useCreateProject,
  useUpdateProject,
} from '../../Projects/ProjectQueries'
import IconPickerModal from './IconPickerModal'

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(LABEL_COLORS[0].value)
  const [projectIcon, setProjectIcon] = useState(PROJECT_ICONS[0].value)
  const [error, setError] = useState('')
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()

  // Initialize form when modal opens or project changes
  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Editing existing project
        setProjectName(project.name || '')
        setProjectDescription(project.description || '')
        setProjectColor(project.color || LABEL_COLORS[0].value)
        setProjectIcon(project.icon || PROJECT_ICONS[0].value)
      } else {
        // Creating new project
        setProjectName('')
        setProjectDescription('')
        setProjectColor(LABEL_COLORS[0].value)
        setProjectIcon(PROJECT_ICONS[0].value)
      }
      setError('')
    }
  }, [isOpen, project])

  const handleSubmit = e => {
    e.preventDefault()

    if (!projectName.trim()) {
      setError('Project name is required')
      return
    }

    setError('')

    const projectData = {
      name: projectName.trim(),
      description: projectDescription.trim(),
      color: projectColor,
      icon: projectIcon,
    }

    if (project) {
      // Update existing project
      updateProjectMutation.mutate(
        { projectId: project.id, projectData },
        {
          onSuccess: updatedProject => {
            onSave(updatedProject)
            onClose()
          },
          onError: error => {
            console.error('Error updating project:', error)
            setError('Failed to update project')
          },
        },
      )
    } else {
      // Create new project
      createProjectMutation.mutate(projectData, {
        onSuccess: newProject => {
          onSave(newProject)
          onClose()
        },
        onError: error => {
          console.error('Error creating project:', error)
          setError('Failed to create project')
        },
      })
    }
  }

  const handleClose = () => {
    const isLoading =
      createProjectMutation.isPending || updateProjectMutation.isPending
    if (!isLoading) {
      onClose()
    }
  }

  const isSubmitting =
    createProjectMutation.isPending || updateProjectMutation.isPending

  const handleIconSelect = iconValue => {
    setProjectIcon(iconValue)
    setIsIconPickerOpen(false)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      size='md'
      unmountDelay={250}
      fullWidth={true}
    >
      <Typography level='h4' mb={2}>
        {project ? 'Edit Project' : 'Create New Project'}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Project Name */}
          <FormControl required>
            <FormLabel>Project Name</FormLabel>
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder='Enter project name...'
              autoFocus
              disabled={isSubmitting}
            />
          </FormControl>

          {/* Project Description */}
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder='Optional project description...'
              minRows={2}
              maxRows={4}
              disabled={isSubmitting}
            />
          </FormControl>

          {/* Icon Selection */}
          <FormControl>
            <FormLabel>Project Icon</FormLabel>
            <Button
              variant='outlined'
              onClick={() => setIsIconPickerOpen(true)}
              startDecorator={
                <Avatar
                  size='sm'
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: projectColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& svg': {
                      display: 'block',
                      margin: '0 auto',
                    },
                  }}
                >
                  {(() => {
                    const IconComponent = getIconComponent(projectIcon)
                    return (
                      <IconComponent
                        sx={{
                          fontSize: 14,
                          color: getTextColorFromBackgroundColor(projectColor),
                          display: 'block',
                        }}
                      />
                    )
                  })()}
                </Avatar>
              }
              sx={{ justifyContent: 'flex-start' }}
            >
              {PROJECT_ICONS.find(icon => icon.value === projectIcon)?.name ||
                'Select Icon'}
            </Button>
          </FormControl>

          {/* Color Selection */}
          <FormControl>
            <FormLabel>Project Color</FormLabel>
            <Select
              value={projectColor}
              onChange={(e, value) => value && setProjectColor(value)}
              renderValue={selected => (
                <Typography
                  startDecorator={
                    <Box
                      className='size-4'
                      borderRadius={10}
                      sx={{ background: selected.value }}
                    />
                  }
                >
                  {selected.label}
                </Typography>
              )}
            >
              {LABEL_COLORS.map(color => (
                <Option key={color.value} value={color.value}>
                  <Box className='flex items-center justify-between'>
                    <Box
                      width={20}
                      height={20}
                      borderRadius={10}
                      sx={{ background: color.value }}
                    />
                    <Typography sx={{ ml: 1 }} variant='caption'>
                      {color.name}
                    </Typography>
                  </Box>
                </Option>
              ))}
            </Select>
          </FormControl>

          {/* Project Preview */}
          <FormControl>
            <FormLabel>Preview</FormLabel>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.level1',
              }}
            >
              <Avatar
                size='sm'
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: projectColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& svg': {
                    display: 'block',
                    margin: '0 auto',
                  },
                }}
              >
                {(() => {
                  const IconComponent = getIconComponent(projectIcon)
                  return (
                    <IconComponent
                      sx={{
                        fontSize: 16,
                        color: getTextColorFromBackgroundColor(projectColor),
                        display: 'block',
                      }}
                    />
                  )
                })()}
              </Avatar>
              <Box>
                <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                  {projectName || 'Project Name'}
                </Typography>
                {projectDescription && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {projectDescription}
                  </Typography>
                )}
              </Box>
            </Box>
          </FormControl>

          {/* Error Message */}
          {error && (
            <Typography color='danger' level='body-sm'>
              {error}
            </Typography>
          )}
        </Stack>

        <Box display='flex' justifyContent='space-around' gap={1} mt={3}>
          <Button
            type='submit'
            loading={isSubmitting}
            disabled={!projectName.trim() || isSubmitting}
            fullWidth
            size='lg'
          >
            {project ? 'Update' : 'Create'}
          </Button>
          <Button
            variant='outlined'
            onClick={handleClose}
            disabled={isSubmitting}
            fullWidth
            size='lg'
          >
            Cancel
          </Button>
        </Box>
      </form>

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={projectIcon}
        projectColor={projectColor}
      />
    </ResponsiveModal>
  )
}

export default ProjectModal
