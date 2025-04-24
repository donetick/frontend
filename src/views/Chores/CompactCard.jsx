import { Box, Checkbox, Typography } from '@mui/joy'

export const CompactCard = ({
  chore,
  performers,
  onChoreUpdate,
  onChoreRemove,
  userLabels,
  sx,
  viewOnly,
  onChipClick,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flex: 1,
      }}
    >
      <Checkbox
      // checked={!!task.completedAt}
      // onChange={() => handleToggle(task.id)}
      />
      <Typography
        sx={{
          textDecoration: chore.completedAt ? 'line-through' : 'none',
        }}
      >
        {chore.name}
      </Typography>
    </Box>
  )
}
