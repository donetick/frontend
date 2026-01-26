import {
  Archive,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  Delete,
  Done,
  SelectAll,
  SkipNext,
} from '@mui/icons-material'
import { Box, Button, Divider, Typography } from '@mui/joy'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'

const MultiSelectToolbar = ({
  isVisible,
  selectedCount,
  onSelectAll,
  onClear,
  onComplete,
  onSkip,
  onArchive,
  onDelete,
  showKeyboardShortcuts,
  selectAllDisabled,
}) => {
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
              {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
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
              title='Select all visible tasks (Ctrl+A)'
            >
              All
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
              title={`${selectedCount === 0 ? 'Close' : 'Clear'} multi-select (Esc)`}
            >
              {selectedCount === 0 ? 'Close' : 'Clear'}
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
            title='Complete selected tasks (Enter)'
          >
            Complete
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
            title='Skip selected tasks (/)'
          >
            Skip
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
            title='Archive selected tasks (X)'
          >
            Archive
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
            title='Delete selected tasks (Shift+X)'
          >
            Delete
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
