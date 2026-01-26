import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Typography,
} from '@mui/joy'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { getTextColorFromBackgroundColor } from '../../../utils/Colors'
import PROJECT_ICONS from '../../../utils/ProjectIcons'

const IconPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  currentIcon,
  projectColor,
}) => {
  const { ResponsiveModal } = useResponsiveModal()

  const handleIconClick = iconValue => {
    onSelect(iconValue)
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='sm'
      unmountDelay={250}
    >
      <Typography level='h4' mb={2}>
        Choose Project Icon
      </Typography>

      <FormControl>
        <FormLabel>Available Icons</FormLabel>
        <Grid
          container
          spacing={1}
          sx={{ maxHeight: '300px', overflowY: 'auto', mb: 2 }}
        >
          {PROJECT_ICONS.map(iconData => {
            const IconComponent = iconData.icon
            const isCurrentIcon = currentIcon === iconData.value
            return (
              <Grid key={iconData.value} xs={3} sm={2}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 'sm',
                    border: '2px solid',
                    borderColor: isCurrentIcon ? 'primary.500' : 'transparent',
                    '&:hover': {
                      borderColor: isCurrentIcon ? 'primary.600' : 'neutral.300',
                    },
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => handleIconClick(iconData.value)}
                >
                  <Avatar
                    size='sm'
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: projectColor,
                      mb: 0.5,
                    }}
                  >
                    <IconComponent
                      sx={{
                        fontSize: 16,
                        color: getTextColorFromBackgroundColor(projectColor),
                      }}
                    />
                  </Avatar>
                  <Typography
                    level='body-xs'
                    sx={{
                      textAlign: 'center',
                      fontSize: 10,
                      lineHeight: 1.2,
                    }}
                  >
                    {iconData.name}
                  </Typography>
                </Box>
              </Grid>
            )
          })}
        </Grid>
      </FormControl>

      <Box display='flex' justifyContent='center' mt={3}>
        <Button variant='outlined' onClick={onClose} fullWidth size='lg'>
          Cancel
        </Button>
      </Box>
    </ResponsiveModal>
  )
}

export default IconPickerModal
