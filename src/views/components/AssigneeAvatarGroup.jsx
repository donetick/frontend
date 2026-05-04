import { Avatar, Box } from '@mui/joy'

const ASSIGNEE_COLORS = [
  '#1a73e8',
  '#d93025',
  '#188038',
  '#f9ab00',
  '#9334e6',
  '#e8710a',
  '#00796b',
  '#c2185b',
  '#5f6368',
  '#3949ab',
]

const hashString = value => {
  return String(value || '')
    .split('')
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
}

const getUserName = user =>
  user?.displayName || user?.name || user?.username || 'Anyone'

const getUserInitial = user => getUserName(user).trim().charAt(0).toUpperCase()

const getUserColor = user => {
  const seed = user?.userId || user?.id || getUserName(user)
  return ASSIGNEE_COLORS[hashString(seed) % ASSIGNEE_COLORS.length]
}

const getChoreAssignees = (chore, performers = []) => {
  const usersById = new Map(
    performers.map(user => [Number(user.userId || user.id), user]),
  )

  const assignedUsers = []

  if (chore?.assignees?.length > 0) {
    chore.assignees.forEach(assignee => {
      const userId = Number(assignee.userId || assignee.id)
      assignedUsers.push(usersById.get(userId) || assignee)
    })
  } else if (chore?.assignedTo) {
    const userId = Number(chore.assignedTo)
    assignedUsers.push(usersById.get(userId) || { userId })
  }

  const deduped = []
  const seen = new Set()
  assignedUsers.forEach(user => {
    const key = user?.userId || user?.id || getUserName(user)
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(user)
    }
  })

  return deduped.length > 0
    ? deduped
    : [{ userId: 'anyone', displayName: 'Anyone' }]
}

export const getChoreAssigneeNames = (chore, performers = []) =>
  getChoreAssignees(chore, performers).map(getUserName)

const AssigneeAvatarGroup = ({
  chore,
  performers = [],
  size = 20,
  max = 3,
  sx,
}) => {
  const assignees = getChoreAssignees(chore, performers)
  const visibleAssignees = assignees.slice(0, max)
  const overflowCount = assignees.length - visibleAssignees.length

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        ...sx,
      }}
      title={assignees.map(getUserName).join(', ')}
    >
      {visibleAssignees.map((user, index) => (
        <Avatar
          key={`${user?.userId || user?.id || getUserName(user)}-${index}`}
          src={user?.image || user?.avatar}
          alt={getUserName(user)}
          sx={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
            fontSize: Math.max(10, Math.round(size * 0.52)),
            fontWeight: 700,
            bgcolor: getUserColor(user),
            color: '#fff',
            border: '1.5px solid var(--joy-palette-background-surface)',
            ml: index === 0 ? 0 : -0.6,
          }}
        >
          {getUserInitial(user)}
        </Avatar>
      ))}
      {overflowCount > 0 && (
        <Avatar
          sx={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
            fontSize: Math.max(9, Math.round(size * 0.45)),
            fontWeight: 700,
            bgcolor: 'neutral.500',
            color: '#fff',
            border: '1.5px solid var(--joy-palette-background-surface)',
            ml: -0.6,
          }}
        >
          +{overflowCount}
        </Avatar>
      )}
    </Box>
  )
}

export default AssigneeAvatarGroup
