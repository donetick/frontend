import { Box, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useId } from 'react'

// Shared with Profile and Circle: quiet surfaces, one clear heading per group.
const SettingsSection = ({ action, children, description, title }) => {
  const headingId = useId()
  return (
    <Sheet
      component='section'
      aria-labelledby={headingId}
      sx={{
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'xl',
        p: { xs: 2, sm: 2.5 },
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={headingId} component='h3' level='title-md'>
            {title}
          </Typography>
          {description && (
            <Typography
              level='body-sm'
              textColor='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Sheet>
  )
}
SettingsSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
}
export default SettingsSection
