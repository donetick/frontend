import { HelpOutline } from '@mui/icons-material'
import { Box, Card, IconButton, Typography } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../components/common/ModalActions'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useTranslation } from 'react-i18next'

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
        aria-label={t('multiSelect.showShortcuts')}
        title={t('multiSelect.showShortcuts')}
      >
        <HelpOutline />
      </IconButton>

      {/* Help Modal */}
      <ResponsiveModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title={t('multiSelect.title')}
        description='Use these keyboard shortcuts to work more efficiently.'
        footer={
          <ModalActions
            primary={{ label: 'Got it', onClick: () => setIsHelpOpen(false) }}
          />
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Selection shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'primary.600' }}>
              {t('multiSelect.selection')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Ctrl', 'A']}
                description={t('multiSelect.selectAll')}
              />
              <ShortcutItem
                keys={['Esc']}
                description={t('multiSelect.clearOrExit')}
              />
            </Box>
          </Card>

          {/* Action shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'success.600' }}>
              {t('multiSelect.actions')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Enter']}
                description={t('multiSelect.markCompleted')}
              />
              <ShortcutItem
                keys={['Del', '⌫']}
                description={t('multiSelect.deleteSelected')}
              />
            </Box>
          </Card>

          {/* Interface shortcuts */}
          <Card variant='soft' sx={{ p: 2 }}>
            <Typography level='title-sm' sx={{ mb: 1.5, color: 'warning.600' }}>
              {t('multiSelect.interface')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ShortcutItem
                keys={['Ctrl', 'K']}
                description={t('multiSelect.quickAdd')}
              />
            </Box>
          </Card>
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
