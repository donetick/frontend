import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../../components/common/ModalActions'
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
  const { t } = useTranslation('projects')
  const { ResponsiveModal } = useResponsiveModal()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0].value)
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
        setProjectColor(project.color || PROJECT_COLORS[0].value)
        setProjectIcon(project.icon || PROJECT_ICONS[0].value)
      } else {
        // Creating new project
        setProjectName('')
        setProjectDescription('')
        setProjectColor(PROJECT_COLORS[0].value)
        setProjectIcon(PROJECT_ICONS[0].value)
      }
      setError('')
    }
  }, [isOpen, project])

  const handleSubmit = e => {
    e.preventDefault()

    if (!projectName.trim()) {
      setError(t('modal.errorNameRequired'))
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
            setError(t('modal.errorUpdate'))
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
          setError(t('modal.errorCreate'))
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
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footer={
        <ModalActions
          secondary={{
            label: t('common:cancel'),
            onClick: handleClose,
            disabled: isSubmitting,
          }}
          primary={{
            label: project ? 'Update' : 'Create',
            type: 'submit',
            form: 'project-form',
            loading: isSubmitting,
            disabled: !projectName.trim() || isSubmitting,
          }}
        />
      }
    >
      <form onSubmit={handleSubmit} id='project-form'>
        <Stack spacing={3}>
          {/* Project Name */}
          <FormControl required>
            <FormLabel>{t('modal.nameLabel')}</FormLabel>
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder={t('modal.namePlaceholder')}
              autoFocus
              disabled={isSubmitting}
            />
          </FormControl>

          {/* Project Description */}
          <FormControl>
            <FormLabel>{t('modal.descriptionLabel')}</FormLabel>
            <Textarea
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder={t('modal.descriptionPlaceholder')}
              minRows={2}
              maxRows={4}
              disabled={isSubmitting}
            />
          </FormControl>

          {/* Icon Selection */}
          <FormControl>
            <FormLabel>{t('modal.iconLabel')}</FormLabel>
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
              {PROJECT_ICONS.some(icon => icon.value === projectIcon)
                ? t(`icons.${projectIcon}`)
                : t('modal.selectIcon')}
            </Button>
          </FormControl>

          {/* Color Selection */}
          <FormControl>
            <FormLabel>{t('modal.colorLabel')}</FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PROJECT_COLORS.map(colorOption => (
                <Box
                  key={colorOption.value}
                  title={t(`common:colors.${colorOption.name}`)}
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
