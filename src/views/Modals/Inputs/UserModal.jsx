import { Avatar, Box, List, ListItem, Typography } from '@mui/joy'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

const UserModal = ({ isOpen, performers = [], onSelect, onClose }) => {
  const { ResponsiveModal } = useResponsiveModal()

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title='Select User'
      footer={
        <ModalActions secondary={{ label: 'Cancel', onClick: onClose }} />
      }
    >
      <List sx={{ mb: 2 }}>
        {performers.map(user => (
          <ListItem
            key={user.userId}
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
    </ResponsiveModal>
  )
}

export default UserModal
