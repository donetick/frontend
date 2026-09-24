import { Check } from '@mui/icons-material'
import {
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
} from '@mui/joy'

import AppModal from '../../../components/common/AppModal'

/**
 * Assignee picker used by the "delegate" action. Lists every circle member —
 * not just the chore's current assignee pool — because from the user's
 * perspective picking anyone should just work, the same way assignee pickers
 * behave in most task trackers. Selecting someone outside the pool is handled
 * by the caller (added to the chore's assignees, then assigned), so this
 * component stays a plain list with no "add new" step of its own.
 */
function AssigneeModal({
  assignedTo,
  isOpen,
  members = [],
  onClose,
  onSave,
  title,
}) {
  const handleSelect = member => {
    onSave(member.userId)
    onClose()
  }

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={title}
      mobilePresentation='sheet'
      showHandle
      size='sm'
      contentSx={{ px: 0, pb: 1 }}
    >
      <List sx={{ '--ListItem-radius': '8px', px: 1 }}>
        {members.map(member => {
          const isCurrent = member.userId === assignedTo
          return (
            <ListItem key={member.userId}>
              <ListItemButton
                selected={isCurrent}
                onClick={() => handleSelect(member)}
              >
                <ListItemDecorator>
                  <Avatar size='sm' src={member.image}>
                    {member.displayName?.[0]}
                  </Avatar>
                </ListItemDecorator>
                <ListItemContent>{member.displayName}</ListItemContent>
                {isCurrent && <Check color='success' fontSize='small' />}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </AppModal>
  )
}

export default AssigneeModal
