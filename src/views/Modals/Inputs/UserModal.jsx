import {
  Avatar,
  Box,
  Button,
  List,
  ListItem,
  Modal,
  ModalDialog,
  ModalOverflow,
  Typography,
} from '@mui/joy'

const UserModal = ({ isOpen, performers = [], onSelect, onClose }) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalOverflow>
        <ModalDialog size='md' sx={{ minWidth: 360 }}>
          <Typography level='h4' sx={{ mb: 2 }}>
            Select User
          </Typography>
          <List sx={{ mb: 2 }}>
            {performers.map(user => (
              <ListItem
                key={user.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
                onClick={() => {
                  onSelect(user)
                  onClose()
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    size='lg'
                    src={user.image || user.avatar}
                    alt={user.displayName || user.name}
                  />
                  <Typography>{user.displayName || user.name}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant='outlined' color='neutral' onClick={onClose}>
              Cancel
            </Button>
          </Box>
        </ModalDialog>
      </ModalOverflow>
    </Modal>
  )
}

export default UserModal
