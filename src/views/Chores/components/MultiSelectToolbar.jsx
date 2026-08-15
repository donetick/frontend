import {
  Archive,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  Delete,
  Done,
  DriveFileMove,
  SelectAll,
  SkipNext,
} from '@mui/icons-material'
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
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import { getIconComponent } from '../../../utils/ProjectIcons'

const renderProjectAvatar = (color, icon) => {
  const bg = color || LABEL_COLORS[0].value
  const IconComponent = getIconComponent(icon || 'FolderOpen')
  return (
    <Avatar size='sm' sx={{ width: 22, height: 22, backgroundColor: bg }}>
      <IconComponent
        sx={{ fontSize: 13, color: getTextColorFromBackgroundColor(bg) }}
      />
    </Avatar>
  )
}

const MultiSelectToolbar = ({
  isVisible,
  selectedCount,
  onSelectAll,
  onClear,
  onComplete,
  onSkip,
  onArchive,
  onDelete,
  onMoveToProject,
  projects = [],
  showKeyboardShortcuts,
  selectAllDisabled,
}) => {
  const { t } = useTranslation('chores')
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null)
  const projectMenuRef = useRef(null)

  const closeProjectMenu = () => setProjectMenuAnchor(null)

  const handleMoveToProject = project => {
    closeProjectMenu()
    onMoveToProject?.(project)
  }

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        maxHeight: isVisible ? '200px' : '0',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
        marginBottom: isVisible ? 2 : 0,
      }}
    >
      <Box
        sx={{
          backgroundColor: 'background.surface',
          backdropFilter: 'blur(8px)',
          borderRadius: 'lg',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'm',
          gap: 2,
          display: 'flex',
          flexDirection: {
            sm: 'column',
            md: 'row',
          },
          alignItems: {
            xs: 'stretch',
            sm: 'center',
          },
          justifyContent: {
            xs: 'center',
            sm: 'space-between',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: {
              xs: 'wrap',
              sm: 'nowrap',
            },
            justifyContent: {
              xs: 'center',
              sm: 'flex-start',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox sx={{ color: 'primary.500' }} />
            <Typography level='body-sm' fontWeight='md'>
              {t('archived.selected', { count: selectedCount })}
            </Typography>
          </Box>

          <Divider
            orientation='vertical'
            sx={{
              display: { xs: 'none', sm: 'block' },
            }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='sm'
              variant='outlined'
              onClick={onSelectAll}
              startDecorator={<SelectAll />}
              disabled={selectAllDisabled}
              sx={{
                minWidth: 'auto',
                '--Button-paddingInline': '0.75rem',
                position: 'relative',
              }}
              title={t('archived.selectAllTitle')}
            >
              {t('archived.all')}
              {showKeyboardShortcuts && (
                <KeyboardShortcutHint
                  shortcut='A'
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 1000,
                  }}
                />
              )}
            </Button>
            <Button
              size='sm'
              variant='outlined'
              onClick={onClear}
              startDecorator={
                selectedCount === 0 ? <Close /> : <CheckBoxOutlineBlank />
              }
              sx={{
                minWidth: 'auto',
                '--Button-paddingInline': '0.75rem',
                position: 'relative',
              }}
              title={
                selectedCount === 0
                  ? t('archived.closeMultiSelect')
                  : t('archived.clearMultiSelect')
              }
            >
              {selectedCount === 0 ? t('archived.close') : t('archived.clear')}
              {showKeyboardShortcuts && (
                <KeyboardShortcutHint
                  withCtrl={false}
                  shortcut='Esc'
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 1000,
                  }}
                />
              )}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: {
              xs: 'wrap',
              sm: 'nowrap',
            },
            justifyContent: {
              xs: 'center',
              sm: 'flex-end',
            },
          }}
        >
          <Button
            size='sm'
            variant='solid'
            color='success'
            onClick={onComplete}
            startDecorator={<Done />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.completeTitle')}
          >
            {t('multiToolbar.complete')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='Enter'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>
          <Button
            size='sm'
            variant='soft'
            color='warning'
            onClick={onSkip}
            startDecorator={<SkipNext />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.skipTitle')}
          >
            {t('multiToolbar.skip')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='/'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>
          {onMoveToProject && (
            <>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                ref={projectMenuRef}
                onClick={() =>
                  setProjectMenuAnchor(prev =>
                    prev ? null : projectMenuRef.current,
                  )
                }
                startDecorator={<DriveFileMove />}
                disabled={selectedCount === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                }}
                title='Move selected tasks to a project'
              >
                Move
              </Button>
              <Menu
                size='md'
                anchorEl={projectMenuAnchor}
                open={Boolean(projectMenuAnchor)}
                onClose={closeProjectMenu}
                placement='bottom-end'
              >
                <MenuItem
                  onClick={() =>
                    handleMoveToProject({ id: null, name: 'Default Project' })
                  }
                >
                  <ListItemDecorator>
                    {renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen')}
                  </ListItemDecorator>
                  <ListItemContent>
                    <Typography level='body-sm'>Default Project</Typography>
                  </ListItemContent>
                </MenuItem>
                {projects.map(project => (
                  <MenuItem
                    key={project.id}
                    onClick={() => handleMoveToProject(project)}
                  >
                    <ListItemDecorator>
                      {renderProjectAvatar(project.color, project.icon)}
                    </ListItemDecorator>
                    <ListItemContent>
                      <Typography level='body-sm'>{project.name}</Typography>
                    </ListItemContent>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          <Button
            size='sm'
            variant='soft'
            color='danger'
            onClick={onArchive}
            startDecorator={<Archive />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.archiveTitle')}
          >
            {t('multiToolbar.archive')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='X'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>

          <Button
            size='sm'
            variant='soft'
            color='danger'
            onClick={onDelete}
            startDecorator={<Delete />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.deleteTitle')}
          >
            {t('archived.delete')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='E'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default MultiSelectToolbar
