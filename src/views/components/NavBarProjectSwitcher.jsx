import {
  Check,
  FolderOpen,
  KeyboardArrowDown,
  Settings,
} from '@mui/icons-material'
import {
  Avatar,
  Divider,
  Dropdown,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
} from '@mui/joy'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { getIconComponent } from '../../utils/ProjectIcons'

const ProjectAvatar = ({ isSelected, project }) => {
  const color = project?.color || '#1976d2'

  return (
    <Avatar
      size='sm'
      sx={{
        width: 26,
        height: 26,
        bgcolor: color,
        border: '2px solid',
        borderColor: isSelected ? color : 'background.surface',
        boxShadow: isSelected ? `0 0 0 1px ${color}` : 'sm',
      }}
    >
      {createElement(getIconComponent(project?.icon || 'FolderOpen'), {
        sx: { fontSize: 14, color: getTextColorFromBackgroundColor(color) },
      })}
    </Avatar>
  )
}

const NavBarProjectSwitcher = ({ projectSwitcher, title }) => {
  const { t } = useTranslation(['common', 'projects', 'chores'])
  const navigate = useNavigate()
  const { onSelect, projects, selectedProjectId } = projectSwitcher
  const selectedProject = projects.find(
    project => String(project.id) === String(selectedProjectId),
  )

  return (
    <Dropdown>
      <MenuButton
        aria-label={t('projects:selector.currentProjectTitle', {
          project: title,
        })}
        variant='plain'
        color='neutral'
        sx={{
          '--Button-gap': '10px',
          borderRadius: 'lg',
          flex: 1,
          fontWeight: 'lg',
          justifyContent: 'flex-start',
          minWidth: 0,
          px: 0.75,
          py: 0.5,
          '&:hover': { bgcolor: 'background.level1' },
        }}
      >
        <KeyboardArrowDown sx={{ fontSize: 20, color: 'text.tertiary' }} />
        {selectedProject && selectedProject.id !== 'default' && (
          <ProjectAvatar project={selectedProject} />
        )}
        <Typography
          component='span'
          level='title-md'
          sx={{
            marginInlineStart: '10px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
      </MenuButton>

      <Menu
        placement='bottom-start'
        size='sm'
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          boxShadow:
            '0 12px 32px -8px rgba(0, 0, 0, 0.18), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
          maxHeight: 'min(64dvh, 440px)',
          minWidth: 'min(300px, calc(100vw - 16px))',
          overflowY: 'auto',
          p: 0.75,
          zIndex: 'var(--joy-zIndex-modal)',
        }}
      >
        <Typography
          level='body-xs'
          sx={{
            color: 'text.tertiary',
            fontWeight: 'xl',
            letterSpacing: '0.04em',
            px: 1.25,
            pt: 0.75,
            pb: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {t('projects:selector.title')}
        </Typography>

        {projects.map(project => {
          const isDefault = project.id === 'default'
          const isSelected = String(project.id) === String(selectedProjectId)

          return (
            <MenuItem
              key={project.id}
              selected={isSelected}
              onClick={() => onSelect(project)}
              sx={{
                alignItems: 'center',
                borderRadius: '12px',
                gap: 1.75,
                minHeight: 52,
                mb: 0.25,
                px: 1.25,
                transition: 'background-color 120ms ease',
                ...(isSelected && {
                  bgcolor: 'primary.softBg',
                  '&:hover': { bgcolor: 'primary.softHoverBg' },
                }),
              }}
            >
              <ListItemDecorator sx={{ minInlineSize: 0 }}>
                {isDefault ? (
                  <Avatar
                    size='sm'
                    sx={{
                      width: 26,
                      height: 26,
                      bgcolor: '#1976d2',
                      border: '2px solid',
                      borderColor: isSelected
                        ? '#1976d2'
                        : 'background.surface',
                      boxShadow: isSelected ? '0 0 0 1px #1976d2' : 'sm',
                    }}
                  >
                    <FolderOpen sx={{ fontSize: 14, color: '#fff' }} />
                  </Avatar>
                ) : (
                  <ProjectAvatar project={project} isSelected={isSelected} />
                )}
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='title-sm' fontWeight='lg' noWrap>
                  {isDefault
                    ? t('chores:toolbar.defaultProject')
                    : project.name}
                </Typography>
                {isDefault && (
                  <Typography
                    level='body-xs'
                    noWrap
                    sx={{ color: 'text.tertiary' }}
                  >
                    {t('projects:defaultDescription')}
                  </Typography>
                )}
              </ListItemContent>
              {isSelected && (
                <Check color='primary' sx={{ flexShrink: 0, fontSize: 18 }} />
              )}
            </MenuItem>
          )
        })}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => navigate('/projects')}
          sx={{
            alignItems: 'center',
            borderRadius: '12px',
            gap: 1.75,
            minHeight: 48,
            px: 1.25,
          }}
        >
          <ListItemDecorator sx={{ minInlineSize: 0 }}>
            <Avatar
              size='sm'
              variant='soft'
              color='neutral'
              sx={{ width: 26, height: 26, borderRadius: '8px' }}
            >
              <Settings sx={{ fontSize: 15 }} />
            </Avatar>
          </ListItemDecorator>
          <ListItemContent>
            <Typography level='title-sm' fontWeight='lg'>
              {t('projects:selector.manage')}
            </Typography>
          </ListItemContent>
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default NavBarProjectSwitcher
