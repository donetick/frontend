import { Add, Check, FolderOpen, Settings } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Divider,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { getIconComponent } from '../../utils/ProjectIcons'
import ProjectModal from '../Modals/Inputs/ProjectModal'
import { useProjects } from '../Projects/ProjectQueries'

const ProjectSelector = ({
  selectedProject = 'Default Project',
  onProjectSelect,
  showKeyboardShortcuts = false,
}) => {
  const { data: projects = [], isLoading } = useProjects()
  const navigate = useNavigate()

  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const defaultProjects = projects

  // Check if selected project still exists, if not fallback to default
  const selectedProjectExists = defaultProjects.some(
    p => p.name === selectedProject,
  )
  const effectiveSelectedProject = selectedProjectExists
    ? selectedProject
    : 'Default Project'

  // Notify parent if selected project was deleted
  useEffect(() => {
    if (!selectedProjectExists && selectedProject !== 'Default Project') {
      const defaultProject = defaultProjects.find(
        p => p.id === 'default' || p.name === 'Default Project',
      )
      if (defaultProject) {
        onProjectSelect?.(defaultProject)
      }
    }
  }, [selectedProjectExists, selectedProject, defaultProjects, onProjectSelect])

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget)
    setIsKeyboardNavigating(false)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleProjectSelect = project => {
    onProjectSelect?.(project)
    handleMenuClose()
  }

  const handleAddProjectClick = () => {
    setIsProjectModalOpen(true)
    handleMenuClose()
  }

  const handleProjectModalSave = project => {
    handleProjectSelect(project)
  }

  const handleManageProjects = () => {
    navigate('/projects')
    handleMenuClose()
  }

  useEffect(() => {
    const handleMenuOutsideClick = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleMenuClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = event => {
      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey

      // Cmd/Ctrl + E to open project menu
      if (isHoldingCmdOrCtrl && event.key === 'e') {
        event.preventDefault()
        if (!anchorEl) {
          setAnchorEl(buttonRef.current)
          setSelectedIndex(0)
          setIsKeyboardNavigating(true)
        } else {
          handleMenuClose()
        }
        return
      }

      // Only handle navigation keys when menu is open
      if (!anchorEl) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setIsKeyboardNavigating(true)
          setSelectedIndex(prev =>
            prev < defaultProjects.length + 2 ? prev + 1 : prev,
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setIsKeyboardNavigating(true)
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex === 0) {
            // Hardcoded Default Project
            handleProjectSelect({
              id: 'default',
              name: 'Default Project',
              color: LABEL_COLORS[0].value,
              icon: 'FolderOpen',
            })
          } else if (selectedIndex <= defaultProjects.length) {
            // Projects from the array (offset by 1)
            handleProjectSelect(defaultProjects[selectedIndex - 1])
          } else if (selectedIndex === defaultProjects.length + 1) {
            handleAddProjectClick()
          } else {
            handleManageProjects()
          }
          break
        case 'Escape':
          event.preventDefault()
          handleMenuClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorEl, selectedIndex, defaultProjects, isKeyboardNavigating])

  // Reset selected index when menu opens
  useEffect(() => {
    if (anchorEl) {
      setSelectedIndex(0)
    }
  }, [anchorEl])

  // Find the currently selected project
  const currentProject = defaultProjects.find(
    p => p.name === effectiveSelectedProject,
  )

  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Button
          ref={buttonRef}
          onClick={handleMenuOpen}
          variant='outlined'
          color='neutral'
          size='sm'
          sx={{
            height: 24,
            borderRadius: 24,
            minWidth: 'auto',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            backgroundColor: currentProject?.color || LABEL_COLORS[0].value,
          }}
          title={`Current project: ${effectiveSelectedProject} (Ctrl+E)`}
        >
          {(() => {
            const IconComponent = getIconComponent(
              currentProject?.icon || 'FolderOpen',
            )
            return (
              // <Avatar
              //   size='sm'
              //   sx={{
              //     width: 24,
              //     height: 24,
              //     backgroundColor: project.color || LABEL_COLORS[0].value,
              //     display: 'flex',
              //     alignItems: 'center',
              //     justifyContent: 'center',
              //   }}
              // >
              <IconComponent
                sx={{
                  fontSize: 16,
                  color: getTextColorFromBackgroundColor(
                    currentProject?.color || LABEL_COLORS[0].value,
                  ),
                }}
              />
              // </Avatar>
            )
          })()}
        </Button>
        <KeyboardShortcutHint
          shortcut='E'
          show={showKeyboardShortcuts}
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            zIndex: 1000,
          }}
        />
      </Box>

      <Menu
        ref={menuRef}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        placement='bottom-start'
        sx={{
          minWidth: 280,
          p: 1,
          '--List-gap': '4px',
          boxShadow: 'var(--joy-shadow-lg)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: 'var(--joy-radius-md)',
        }}
      >
        <MenuItem
          disabled
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            cursor: 'default',
            opacity: 1,
          }}
        >
          <ListItemDecorator sx={{ color: 'var(--joy-palette-primary-500)' }}>
            <FolderOpen />
          </ListItemDecorator>
          <ListItemContent>
            <Typography level='title-sm' sx={{ fontWeight: 600 }}>
              Projects
            </Typography>
          </ListItemContent>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          key={'default-project'}
          onClick={() =>
            handleProjectSelect({
              id: 'default',
              name: 'Default Project',
              color: LABEL_COLORS[0].value,
              icon: 'FolderOpen',
            })
          }
          onMouseEnter={() => setIsKeyboardNavigating(false)}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            backgroundColor:
              effectiveSelectedProject === 'Default Project'
                ? 'var(--joy-palette-primary-softBg)'
                : selectedIndex === 0 && anchorEl && isKeyboardNavigating
                  ? 'var(--joy-palette-neutral-softHoverBg)'
                  : 'transparent',
            '&:hover': {
              backgroundColor:
                effectiveSelectedProject === 'Default Project'
                  ? 'var(--joy-palette-primary-softBg)'
                  : 'var(--joy-palette-neutral-softHoverBg)',
            },
            position: 'relative',
          }}
        >
          <ListItemDecorator>
            <Avatar
              size='sm'
              sx={{
                width: 24,
                height: 24,
                backgroundColor: LABEL_COLORS[0].value,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpen
                sx={{
                  fontSize: 14,
                  color: getTextColorFromBackgroundColor(LABEL_COLORS[0].value),
                }}
              />
            </Avatar>
          </ListItemDecorator>
          <ListItemContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                level='body-sm'
                sx={{
                  fontWeight:
                    effectiveSelectedProject === 'Default Project' ? 600 : 400,
                  color:
                    effectiveSelectedProject === 'Default Project'
                      ? 'var(--joy-palette-primary-600)'
                      : 'var(--joy-palette-text-primary)',
                }}
              >
                Default Project
              </Typography>
              {effectiveSelectedProject === 'Default Project' && (
                <Check
                  sx={{
                    fontSize: '16px',
                    color: 'var(--joy-palette-primary-500)',
                  }}
                />
              )}
            </Box>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              Built-in project workspace
            </Typography>
          </ListItemContent>
        </MenuItem>
        {defaultProjects.map((project, index) => (
          <MenuItem
            key={project.id}
            onClick={() => handleProjectSelect(project)}
            onMouseEnter={() => setIsKeyboardNavigating(false)}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              backgroundColor:
                effectiveSelectedProject === project.name
                  ? 'var(--joy-palette-primary-softBg)'
                  : selectedIndex === index + 1 && anchorEl && isKeyboardNavigating
                    ? 'var(--joy-palette-neutral-softHoverBg)'
                    : 'transparent',
              '&:hover': {
                backgroundColor:
                  effectiveSelectedProject === project.name
                    ? 'var(--joy-palette-primary-softBg)'
                    : 'var(--joy-palette-neutral-softHoverBg)',
              },
              position: 'relative',
            }}
          >
            <ListItemDecorator>
              <Avatar
                size='sm'
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: project.color || LABEL_COLORS[0].value,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(() => {
                  const IconComponent = getIconComponent(
                    project.icon || 'FolderOpen',
                  )
                  return (
                    <IconComponent
                      sx={{
                        fontSize: 14,
                        color: getTextColorFromBackgroundColor(
                          project.color || LABEL_COLORS[0].value,
                        ),
                      }}
                    />
                  )
                })()}
              </Avatar>
            </ListItemDecorator>
            <ListItemContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{
                    fontWeight:
                      effectiveSelectedProject === project.name ? 600 : 400,
                    color:
                      effectiveSelectedProject === project.name
                        ? 'var(--joy-palette-primary-600)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  {project.name}
                </Typography>
                {effectiveSelectedProject === project.name && (
                  <Check
                    sx={{
                      fontSize: '16px',
                      color: 'var(--joy-palette-primary-500)',
                    }}
                  />
                )}
              </Box>
              {project.id === 'default' && (
                <Typography
                  level='body-xs'
                  sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                >
                  Built-in project workspace
                </Typography>
              )}
            </ListItemContent>
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={handleAddProjectClick}
          onMouseEnter={() => setIsKeyboardNavigating(false)}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            backgroundColor:
              selectedIndex === defaultProjects.length + 1 && anchorEl && isKeyboardNavigating
                ? 'var(--joy-palette-success-softHoverBg)'
                : 'transparent',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-success-softHoverBg)',
            },
          }}
        >
          <ListItemDecorator sx={{ color: 'var(--joy-palette-success-500)' }}>
            <Add />
          </ListItemDecorator>
          <ListItemContent>
            <Typography
              level='body-sm'
              sx={{
                fontWeight: 500,
              }}
            >
              Create New Project
            </Typography>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              Add a custom project workspace
            </Typography>
          </ListItemContent>
        </MenuItem>

        <MenuItem
          onClick={handleManageProjects}
          onMouseEnter={() => setIsKeyboardNavigating(false)}
          sx={{
            borderRadius: 'var(--joy-radius-sm)',
            backgroundColor:
              selectedIndex === defaultProjects.length + 2 && anchorEl && isKeyboardNavigating
                ? 'var(--joy-palette-neutral-softHoverBg)'
                : 'transparent',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
            },
          }}
        >
          <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
            <Settings />
          </ListItemDecorator>
          <ListItemContent>
            <Typography
              level='body-sm'
              sx={{
                fontWeight: 500,
              }}
            >
              Manage Projects
            </Typography>
            <Typography
              level='body-xs'
              sx={{ color: 'var(--joy-palette-text-tertiary)' }}
            >
              View, edit, and organize all projects
            </Typography>
          </ListItemContent>
        </MenuItem>
      </Menu>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleProjectModalSave}
        project={null}
      />
    </>
  )
}

export default ProjectSelector
