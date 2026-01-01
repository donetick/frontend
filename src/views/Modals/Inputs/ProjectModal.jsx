import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Input,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import { CreateProject, UpdateProject } from '../../../utils/Fetcher'
import PROJECT_ICONS, { getIconComponent } from '../../../utils/ProjectIcons'

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(LABEL_COLORS[0].value)
  const [projectIcon, setProjectIcon] = useState(PROJECT_ICONS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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
      setIsSubmitting(false)
    }
  }, [isOpen, project])

  const handleSubmit = async e => {
    e.preventDefault()

    if (!projectName.trim()) {
      setError('Project name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const projectData = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        color: projectColor,
        icon: projectIcon,
      }

      let response
      if (project) {
        // Update existing project
        response = await UpdateProject(project.id, projectData)
      } else {
        // Create new project
        response = await CreateProject(projectData)
      }

      if (response.ok) {
        const savedProject = await response.json()
        onSave(savedProject.res || savedProject)
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save project')
      }
    } catch (error) {
      console.error('Error saving project:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      size='md'
      unmountDelay={250}
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
            <Typography level='body-sm' sx={{ mb: 1, color: 'text.tertiary' }}>
              Choose an icon to represent your project
            </Typography>
            <Grid
              container
              spacing={1}
              sx={{ maxHeight: '200px', overflowY: 'auto', mb: 2 }}
            >
              {PROJECT_ICONS.map(iconData => {
                const IconComponent = iconData.icon
                return (
                  <Grid key={iconData.value} xs={3} sm={2}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 'sm',
                        border: '2px solid',
                        borderColor:
                          projectIcon === iconData.value
                            ? 'primary.500'
                            : 'transparent',
                        '&:hover': {
                          borderColor:
                            projectIcon === iconData.value
                              ? 'primary.600'
                              : 'neutral.300',
                        },
                        transition: 'border-color 0.2s',
                      }}
                      onClick={() => setProjectIcon(iconData.value)}
                    >
                      <Avatar
                        size='sm'
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: projectColor,
                          mb: 0.5,
                        }}
                      >
                        <IconComponent
                          sx={{
                            fontSize: 12,
                            color:
                              getTextColorFromBackgroundColor(projectColor),
                          }}
                        />
                      </Avatar>
                      <Typography
                        level='body-xs'
                        sx={{
                          textAlign: 'center',
                          fontSize: 9,
                          lineHeight: 1,
                        }}
                      >
                        {iconData.name}
                      </Typography>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          </FormControl>

          {/* Color Selection */}
          <FormControl>
            <FormLabel>Project Color</FormLabel>
            <Typography level='body-sm' sx={{ mb: 1, color: 'text.tertiary' }}>
              Choose a color to help identify your project
            </Typography>
            <Grid
              container
              spacing={1}
              sx={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {LABEL_COLORS.map(color => (
                <Grid key={color.value} xs={3} sm={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 'sm',
                      border: '2px solid',
                      borderColor:
                        projectColor === color.value
                          ? 'primary.500'
                          : 'transparent',
                      '&:hover': {
                        borderColor:
                          projectColor === color.value
                            ? 'primary.600'
                            : 'neutral.300',
                      },
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => setProjectColor(color.value)}
                  >
                    <Avatar
                      size='sm'
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: color.value,
                        mb: 0.5,
                      }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(projectIcon)
                        return (
                          <IconComponent
                            sx={{
                              fontSize: 12,
                              color: getTextColorFromBackgroundColor(
                                color.value,
                              ),
                            }}
                          />
                        )
                      })()}
                    </Avatar>
                    <Typography
                      level='body-xs'
                      sx={{
                        textAlign: 'center',
                        fontSize: 9,
                        lineHeight: 1,
                      }}
                    >
                      {color.name}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
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
                }}
              >
                {(() => {
                  const IconComponent = getIconComponent(projectIcon)
                  return (
                    <IconComponent
                      sx={{
                        fontSize: 16,
                        color: getTextColorFromBackgroundColor(projectColor),
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
    </ResponsiveModal>
  )
}

export default ProjectModal
