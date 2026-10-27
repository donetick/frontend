import { Avatar, Box, Typography } from '@mui/joy'

import { resolvePhotoURL } from '../../utils/Helpers'

const MAX_VISIBLE_MEMBER_AVATARS = 3

const ItemAudience = ({ label, members = [] }) => {
  const visible = members.slice(0, MAX_VISIBLE_MEMBER_AVATARS)
  const overflow = members.length - visible.length

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
        gap: 0.25,
        mr: 0.5,
      }}
    >
      <Typography
        level='body-xs'
        sx={{
          fontSize: 9,
          color: 'text.tertiary',
          fontWeight: 'md',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      {members.length > 0 && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 1 }}
        >
          {visible.map((member, index) => (
            <Avatar
              key={member.userId}
              size='sm'
              src={resolvePhotoURL(member.image)}
              sx={{
                width: 24,
                height: 24,
                fontSize: 11,
                bgcolor: 'background.level2',
                color: 'text.secondary',
                border: '2px solid',
                borderColor: 'background.surface',
                ml: index === 0 ? 0 : -1,
                zIndex: visible.length - index,
              }}
            >
              {(member.displayName || member.username || '?')
                .charAt(0)
                .toUpperCase()}
            </Avatar>
          ))}
          {overflow > 0 && (
            <Avatar
              size='sm'
              sx={{
                width: 24,
                height: 24,
                fontSize: 10,
                fontWeight: 'lg',
                bgcolor: 'neutral.softBg',
                color: 'text.secondary',
                border: '2px solid',
                borderColor: 'background.surface',
                ml: -1,
                zIndex: 0,
              }}
            >
              +{overflow}
            </Avatar>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ItemAudience
