import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Sheet,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import PROJECT_COLORS, {
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
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0].value)
  const [projectIcon, setProjectIcon] = useState(PROJECT_ICONS[0].value)
  const [isPrivate, setIsPrivate] = useState(false)
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
        setProjectColor(project.color || PROJECT_COLORS[0].value)
        setProjectIcon(project.icon || PROJECT_ICONS[0].value)
        setIsPrivate(Boolean(project.isPrivate))
      } else {
        // Creating new project
        setProjectName('')
        setProjectDescription('')
        setProjectColor(PROJECT_COLORS[0].value)
        setProjectIcon(PROJECT_ICONS[0].value)
        setIsPrivate(false)
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
      isPrivate,
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
      title={project ? 'Edit Project' : 'Create New Project'}
      footer={
        <Box display='flex' justifyContent='space-around' gap={1}>
          <Button
            type='submit'
            form='project-form'
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
      }
    >
      <form onSubmit={handleSubmit} id='project-form'>
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PROJECT_COLORS.map(colorOption => (
                <Box
                  key={colorOption.value}
                  title={colorOption.name}
                  onClick={() => setProjectColor(colorOption.value)}
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: colorOption.value,
                    cursor: 'pointer',
                    outline:
                      projectColor === colorOption.value
                        ? '3px solid var(--joy-palette-primary-500)'
                        : '2px solid transparent',
                    outlineOffset: '2px',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    '&:hover': { transform: 'scale(1.2)' },
                  }}
                />
              ))}
            </Box>
          </FormControl>

          {/* Privacy */}
          <FormControl>
            <FormLabel>Privacy</FormLabel>
            <Sheet
              variant='outlined'
              sx={{
                borderRadius: 'sm',
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                  flex: '1 1 auto',
                  cursor: isSubmitting ? undefined : 'pointer',
                  userSelect: 'none',
                }}
                onClick={
                  isSubmitting ? undefined : () => setIsPrivate(!isPrivate)
                }
              >
                <Typography level='body-sm' fontWeight='md'>
                  Private project
                </Typography>
                <Typography
                  level='body-xs'
                  textColor='text.tertiary'
                  sx={{ mt: 0.25 }}
                >
                  {isPrivate
                    ? 'Only you can see this project and its tasks'
                    : 'Everyone in your circle can see this project'}
                </Typography>
              </Box>
              <Switch
                size='sm'
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                disabled={isSubmitting}
              />
            </Sheet>
            {project && isPrivate !== Boolean(project.isPrivate) && (
              <FormHelperText sx={{ color: 'warning.plainColor' }}>
                {isPrivate
                  ? 'Every task in this project will become private and assigned only to you: other assignees are removed and are not restored if you make it public again'
                  : 'Every task in this project will become visible to your circle'}
              </FormHelperText>
            )}
          </FormControl>

          {/* Error Message */}
          {error && (
            <Typography color='danger' level='body-sm'>
              {error}
            </Typography>
          )}
        </Stack>
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
