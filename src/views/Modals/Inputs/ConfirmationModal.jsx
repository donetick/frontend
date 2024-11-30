import { Box, Button, Modal, ModalDialog, Typography } from '@mui/joy'
import React from 'react'

function ConfirmationModal({ config }) {
  const handleAction = isConfirmed => {
    config.onClose(isConfirmed)
  }

  return (
    <Modal open={config?.isOpen} onClose={config?.onClose}>
      <ModalDialog>
        <Typography level='h4' mb={1}>
          {config?.title}
        </Typography>

        <Typography level='body-md' gutterBottom>
          {config?.message}
        </Typography>

        <Box display={'flex'} justifyContent={'space-around'} mt={1}>
          <Button
            onClick={() => {
              handleAction(true)
            }}
            fullWidth
            sx={{ mr: 1 }}
            color={config.color ? config.color : 'primary'}
          >
            {config?.confirmText}
          </Button>
          <Button
            onClick={() => {
              handleAction(false)
            }}
            variant='outlined'
          >
            {config?.cancelText}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
export default ConfirmationModal
