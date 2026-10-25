import { Box } from '@mui/joy'
import PropTypes from 'prop-types'

// Decorative only: the real radio controls below provide names and state.
const AppearancePreview = ({ accent, palette }) => (
  <Box
    aria-hidden='true'
    sx={{
      display: 'flex',
      height: 88,
      bgcolor: palette.body,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 'md',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}
  >
    <Box
      sx={{
        width: '21%',
        p: 1,
        bgcolor: palette.surface,
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {[1, 0.2, 0.2].map((opacity, index) => (
        <Box
          key={index}
          sx={{
            height: 5,
            mb: 0.75,
            bgcolor: accent,
            opacity,
            borderRadius: 4,
          }}
        />
      ))}
    </Box>
    <Box sx={{ flex: 1, p: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          height: 5,
          width: '45%',
          mb: 1,
          bgcolor: accent,
          borderRadius: 4,
        }}
      />
      {[0, 1].map(index => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: palette.surface,
            p: 0.75,
            mb: 0.5,
            borderRadius: 'xs',
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              border: '1px solid',
              borderColor: accent,
              borderRadius: '50%',
            }}
          />
          <Box
            sx={{
              width: index ? '45%' : '65%',
              height: 3,
              bgcolor: accent,
              opacity: 0.3,
              borderRadius: 4,
            }}
          />
        </Box>
      ))}
    </Box>
  </Box>
)
AppearancePreview.propTypes = {
  palette: PropTypes.shape({
    body: PropTypes.string.isRequired,
    surface: PropTypes.string.isRequired,
  }).isRequired,
  accent: PropTypes.string.isRequired,
}
export default AppearancePreview
