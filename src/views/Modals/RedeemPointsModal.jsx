import {
  Box,
  Button,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalDialog,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'

function RedeemPointsModal({ config }) {
  useEffect(() => {
    setPoints(0)
  }, [config])

  const [points, setPoints] = useState(0)

  const predefinedPoints = [1, 5, 10, 25]

  return (
    <Modal open={config?.isOpen} onClose={config?.onClose}>
      <ModalDialog>
        <Typography level='h4' mb={1}>
          Redeem Points
        </Typography>
        <FormLabel>
          Points to Redeem ({config.available ? config.available : 0} points
          available)
        </FormLabel>
        <Input
          type='number'
          value={points}
          slotProps={{
            input: { min: 0, max: config.available ? config.available : 0 },
          }}
          onChange={e => {
            if (e.target.value > config.available) {
              setPoints(config.available)
              return
            }
            setPoints(e.target.value)
          }}
        />
        <FormLabel>Or select from predefined points:</FormLabel>
        <Box display='flex' justifyContent='space-evenly' mb={1}>
          {predefinedPoints.map(point => (
            <IconButton
              variant='outlined'
              sx={{ borderRadius: '50%' }}
              key={point}
              onClick={() => {
                const newPoints = points + point
                if (newPoints > config.available) {
                  setPoints(config.available)
                  return
                }
                setPoints(newPoints)
              }}
            >
              {point}
            </IconButton>
          ))}
        </Box>

        {/* 3 button save , cancel and delete */}
        <Box display={'flex'} justifyContent={'space-around'} mt={1}>
          <Button
            onClick={() =>
              config.onSave({
                points,
                userId: config.user.userId,
              })
            }
            fullWidth
            sx={{ mr: 1 }}
          >
            Redeem
          </Button>
          <Button onClick={config.onClose} variant='outlined'>
            Cancel
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
export default RedeemPointsModal
