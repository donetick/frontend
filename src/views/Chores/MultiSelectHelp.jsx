import { Close, HelpOutline, Keyboard } from '@mui/icons-material'
import { Box, Button, Card, Divider, IconButton, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'

const MultiSelectHelp = ({ isVisible = true }) => {
  const { t } = useTranslation('chores')
  const { ResponsiveModal } = useResponsiveModal()

  const [isHelpOpen, setIsHelpOpen] = useState(false)

  if (!isVisible) return null

  return (
    <>
      {/* Help Button */}
      <IconButton
        size='sm'
        variant='soft'
        color='neutral'
        onClick={() => setIsHelpOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 48,
          height: 48,
          borderRadius: '50%',
          boxShadow: 'lg',
        }}
        title={t('sidepanel.multiSelect.showShortcuts')}
      >
        <HelpOutline />
      </IconButton>

      {/* Help Modal */}
      <ResponsiveModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Keyboard color='primary' />
            <Typography level='title-lg'>
              {t('sidepanel.multiSelect.title')}
            </Typography>
          </Box>
          <IconButton
            variant='plain'
            size='sm'
            onClick={() => setIsHelpOpen(false)}
          >
            <Close />
          </IconButton>
        </Box>
        <Typography level='body-md' sx={{ mb: 3, color: 'text.secondary' }}>
          {t('sidepanel.multiSelect.description')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Selection shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'primary.600' }}>
              {t('sidepanel.multiSelect.sections.selection')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Ctrl', 'A']}
                description={t(
                  'sidepanel.multiSelect.shortcuts.selectAllVisible',
                )}
              />
              <ShortcutItem
                keys={['Esc']}
                description={t('sidepanel.multiSelect.shortcuts.clearOrExit')}
              />
            </Box>
          </Card>

          {/* Action shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'success.600' }}>
              {t('sidepanel.multiSelect.sections.actions')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Enter']}
                description={t(
                  'sidepanel.multiSelect.shortcuts.markCompleted',
                )}
              />
              <ShortcutItem
                keys={['Del', '⌫']}
                description={t('sidepanel.multiSelect.shortcuts.deleteSelected')}
              />
            </Box>
          </Card>

          {/* Interface shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'warning.600' }}>
              {t('sidepanel.multiSelect.sections.interface')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Ctrl', 'K']}
                description={t('sidepanel.multiSelect.shortcuts.quickAdd')}
              />
            </Box>
          </Card>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant='soft'
            onClick={() => setIsHelpOpen(false)}
            sx={{ minWidth: 120 }}
          >
            {t('sidepanel.multiSelect.gotIt')}
          </Button>
        </Box>
      </ResponsiveModal>
    </>
  )
}

const ShortcutItem = ({ keys, description }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
      <Typography level='body-sm'>{description}</Typography>
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {keys.map((key, index) => (
        <Box
          key={index}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          {index > 0 && (
            <Typography level='body-xs' color='text.secondary'>
              +
            </Typography>
          )}
          <Box
            sx={{
              px: 1,
              py: 0.25,
              bgcolor: 'background.level2',
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 32,
              textAlign: 'center',
            }}
          >
            <Typography level='body-xs' fontWeight='bold'>
              {key}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
)

export default MultiSelectHelp
