import { Check } from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'

export default function WizardStepper({ steps, activeStep, onStepChange, sx }) {
  return (
    <Box
      component='nav'
      aria-label='Task creation steps'
      sx={{ display: { xs: 'none', sm: 'flex' }, py: 1, ...sx }}
    >
      {steps.map((label, index) => (
        <Box key={label} sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
          {index > 0 && (
            <Box
              data-step-connector={index}
              data-completed={index <= activeStep}
              aria-hidden='true'
              sx={{
                position: 'absolute',
                top: 15,
                left: 'calc(-50% + 23px)',
                width: 'calc(100% - 46px)',
                height: 2,
                bgcolor:
                  index <= activeStep
                    ? 'primary.solidBg'
                    : 'neutral.outlinedBorder',
                transition: 'background-color 150ms ease',
              }}
            />
          )}
          <Box
            component='button'
            type='button'
            aria-current={index === activeStep ? 'step' : undefined}
            onClick={() => onStepChange(index)}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              gap: 1,
              p: 0,
              m: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              font: 'inherit',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.500',
                outlineOffset: 4,
                borderRadius: 'sm',
              },
            }}
          >
            <Box
              data-step-marker={index}
              aria-hidden='true'
              sx={{
                width: 32,
                height: 32,
                boxSizing: 'border-box',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor:
                  index <= activeStep
                    ? 'primary.solidBg'
                    : 'neutral.outlinedBorder',
                bgcolor:
                  index <= activeStep
                    ? 'primary.solidBg'
                    : 'background.surface',
                color:
                  index <= activeStep ? 'primary.solidColor' : 'text.tertiary',
                transition:
                  'background-color 150ms ease, border-color 150ms ease',
              }}
            >
              {index < activeStep ? <Check sx={{ fontSize: 19 }} /> : index + 1}
            </Box>
            <Typography
              level='body-sm'
              sx={{
                color:
                  index === activeStep
                    ? 'primary.500'
                    : index < activeStep
                      ? 'text.primary'
                      : 'text.tertiary',
                fontWeight: index === activeStep ? 600 : 500,
              }}
            >
              {label}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
