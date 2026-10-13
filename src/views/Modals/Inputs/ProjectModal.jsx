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
import { useCircleMembers, useUserProfile } from '../../../queries/UserQueries'
import PROJECT_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import { PreviewProjectAccess } from '../../../utils/Fetcher'
import {
  getProjectVisibility,
  PROJECT_VISIBILITY,
  sameMemberSet,
} from '../../../utils/ProjectAccess'
import PROJECT_ICONS, { getIconComponent } from '../../../utils/ProjectIcons'
import ProjectAccessReview, {
  hasAccessImpact,
} from '../../Projects/ProjectAccessReview'
import {
  useCreateProject,
  useUpdateProject,
} from '../../Projects/ProjectQueries'
import ProjectVisibilityField from '../../Projects/ProjectVisibilityField'
import IconPickerModal from './IconPickerModal'

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
  const { t } = useTranslation('projects')
  const { ResponsiveModal } = useResponsiveModal()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0].value)
  const [projectIcon, setProjectIcon] = useState(PROJECT_ICONS[0].value)
  const [visibility, setVisibility] = useState(PROJECT_VISIBILITY.CIRCLE)
  const [memberIds, setMemberIds] = useState([])
  // Server preview of an access change, shown for confirmation before saving.
  const [accessPreview, setAccessPreview] = useState(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState('')
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()
  const { data: circleMembersData } = useCircleMembers()
  const { data: userProfile } = useUserProfile()
  const circleMembers = circleMembersData?.res || []
  const ownerId = project ? project.created_by : userProfile?.id
  // Only the owner may change who can see a project; the server enforces it too.
  const canChangeAccess = !project || project.created_by === userProfile?.id

  // Initialize form when modal opens or project changes
  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Editing existing project
        setProjectName(project.name || '')
        setProjectDescription(project.description || '')
        setProjectColor(project.color || PROJECT_COLORS[0].value)
        setProjectIcon(project.icon || PROJECT_ICONS[0].value)
        setVisibility(getProjectVisibility(project))
        setMemberIds(project.memberIds || [])
      } else {
        // Creating new project
        setProjectName('')
        setProjectDescription('')
        setProjectColor(PROJECT_COLORS[0].value)
        setProjectIcon(PROJECT_ICONS[0].value)
        setVisibility(PROJECT_VISIBILITY.CIRCLE)
        setMemberIds([])
      }
      setAccessPreview(null)
      setError('')
    }
  }, [isOpen, project])

  const accessChanged =
    Boolean(project) &&
    (visibility !== getProjectVisibility(project) ||
      (visibility === PROJECT_VISIBILITY.MEMBERS &&
        !sameMemberSet(memberIds, project.memberIds || [])))

  const buildProjectData = () => {
    const data = {
      name: projectName.trim(),
      description: projectDescription.trim(),
      color: projectColor,
      icon: projectIcon,
    }
    if (canChangeAccess) {
      data.visibility = visibility
      // Kept for servers that only know the boolean flag.
      data.isPrivate = visibility !== PROJECT_VISIBILITY.CIRCLE
      if (visibility === PROJECT_VISIBILITY.MEMBERS) data.memberIds = memberIds
    }
    return data
  }

  const save = () => {
    const projectData = buildProjectData()
    const onError = (fallbackKey, logLabel) => mutationError => {
      console.error(logLabel, mutationError)
      setAccessPreview(null)
      setError(
        mutationError?.status === 400 && mutationError.message
          ? mutationError.message
          : t(fallbackKey),
      )
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
          onError: onError('modal.errorUpdate', 'Error updating project:'),
        },
      )
    } else {
      // Create new project
      createProjectMutation.mutate(projectData, {
        onSuccess: newProject => {
          onSave(newProject)
          onClose()
        },
        onError: onError('modal.errorCreate', 'Error creating project:'),
      })
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!projectName.trim()) {
      setError(t('modal.errorNameRequired'))
      return
    }

    setError('')

    // Second step: the owner has seen what the access change does.
    if (accessPreview) {
      save()
      return
    }

    // First step of an access change: ask the server what it would do (removed
    // assignees, who loses or gains access) and show it before saving.
    if (accessChanged && canChangeAccess) {
      setIsPreviewing(true)
      try {
        const body = { visibility }
        if (visibility === PROJECT_VISIBILITY.MEMBERS)
          body.memberIds = memberIds
        const response = await PreviewProjectAccess(project.id, body)
        if (!response.ok) {
          let message = t('modal.errorUpdate')
          try {
            const data = await response.json()
            if (response.status === 400 && data?.error) message = data.error
          } catch {
            // no body
          }
          setError(message)
          return
        }
        const data = await response.json()
        if (hasAccessImpact(data.res)) {
          setAccessPreview(data.res)
          return
        }
      } catch (previewError) {
        console.error('Error previewing project access:', previewError)
        setError(t('visibility.review.previewFailed'))
        return
      } finally {
        setIsPreviewing(false)
      }
    }

    save()
  }

  const handleClose = () => {
    const isLoading =
      createProjectMutation.isPending || updateProjectMutation.isPending
    if (!isLoading) {
      onClose()
    }
  }

  const isSubmitting =
    createProjectMutation.isPending ||
    updateProjectMutation.isPending ||
    isPreviewing

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
      title={
        accessPreview
          ? t('visibility.review.title')
          : project
            ? t('modal.editTitle')
            : t('modal.createTitle')
      }
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footer={
        <ModalActions
          secondary={{
            label: accessPreview
              ? t('visibility.review.back')
              : t('common:cancel'),
            onClick: accessPreview ? () => setAccessPreview(null) : handleClose,
            disabled: isSubmitting,
          }}
          primary={{
            label: accessPreview
              ? t('visibility.review.confirm')
              : project
                ? t('modal.update')
                : t('modal.create'),
            type: 'submit',
            form: 'project-form',
            loading: isSubmitting,
            disabled: !projectName.trim() || isSubmitting,
          }}
        />
      }
    >
      <form onSubmit={handleSubmit} id='project-form'>
        {accessPreview && (
          <ProjectAccessReview
            preview={accessPreview}
            members={circleMembers}
            currentUserId={userProfile?.id}
          />
        )}
        <Stack spacing={3} sx={{ display: accessPreview ? 'none' : undefined }}>
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

          {/* Who can see the project and its tasks */}
          {canChangeAccess ? (
            <ProjectVisibilityField
              visibility={visibility}
              onVisibilityChange={value => {
                setVisibility(value)
                setError('')
              }}
              memberIds={memberIds}
              onMemberIdsChange={setMemberIds}
              members={circleMembers}
              ownerId={ownerId}
              disabled={isSubmitting}
            />
          ) : (
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('visibility.ownerOnly')}
            </Typography>
          )}
          {accessChanged && canChangeAccess && (
            <Typography level='body-xs' color='warning'>
              {t('visibility.changeHint')}
            </Typography>
          )}
        </Stack>
        {/* Error Message */}
        {error && (
          <Typography color='danger' level='body-sm' sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
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
