import { Groups, Lock, People } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Sheet,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { resolvePhotoURL } from '../../utils/Helpers'
import { PROJECT_VISIBILITY } from '../../utils/ProjectAccess'

const OPTIONS = [
  { value: PROJECT_VISIBILITY.PRIVATE, icon: Lock },
  { value: PROJECT_VISIBILITY.MEMBERS, icon: People },
  { value: PROJECT_VISIBILITY.CIRCLE, icon: Groups },
]

const MemberAvatar = ({ member, size = 'sm' }) => (
  <Avatar
    size={size}
    src={resolvePhotoURL(member.image)}
    alt=''
    sx={{ bgcolor: 'background.level2', color: 'text.secondary' }}
  >
    {(member.displayName || member.username || '?').charAt(0).toUpperCase()}
  </Avatar>
)

// Three-way choice of who can see a project and its tasks, plus the member
// picker for "selected members". `members` is the circle member list
// (GET /circles/members); the owner is never offered as a member.
const ProjectVisibilityField = ({
  disabled,
  memberIds,
  members = [],
  onMemberIdsChange,
  onVisibilityChange,
  ownerId,
  visibility,
}) => {
  const { t } = useTranslation('projects')
  const activeMembers = members.filter(member => member.isActive !== false)
  const candidates = activeMembers.filter(member => member.userId !== ownerId)
  const everybody = activeMembers
    .map(member => member.displayName || member.username)
    .join(', ')

  const toggleMember = userId => {
    if (memberIds.includes(userId)) {
      onMemberIdsChange(memberIds.filter(id => id !== userId))
    } else {
      onMemberIdsChange([...memberIds, userId])
    }
  }

  return (
    <FormControl>
      <FormLabel>{t('visibility.label')}</FormLabel>
      <RadioGroup
        value={visibility}
        onChange={e => onVisibilityChange(e.target.value)}
        sx={{ gap: 1 }}
      >
        {OPTIONS.map(({ icon: Icon, value }) => (
          <Sheet
            key={value}
            variant='outlined'
            sx={{
              borderRadius: 'md',
              p: 1.5,
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              borderColor:
                visibility === value ? 'primary.outlinedBorder' : 'divider',
              bgcolor: visibility === value ? 'primary.softBg' : undefined,
            }}
          >
            <Icon sx={{ mt: 0.25, color: 'text.secondary' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Radio
                overlay
                value={value}
                disabled={disabled}
                label={t(`visibility.${value}.title`)}
                slotProps={{ label: { sx: { fontWeight: 'md' } } }}
                sx={{
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              />
              <Typography
                level='body-xs'
                sx={{ color: 'text.tertiary', mt: 0.25 }}
              >
                {value === PROJECT_VISIBILITY.CIRCLE
                  ? t('visibility.circle.description', {
                      names: everybody || '–',
                    })
                  : t(`visibility.${value}.description`)}
              </Typography>
            </Box>
          </Sheet>
        ))}
      </RadioGroup>

      {visibility === PROJECT_VISIBILITY.MEMBERS && (
        <Box sx={{ mt: 1.5 }}>
          <Typography level='title-sm' sx={{ mb: 0.5 }}>
            {t('visibility.members.pickerTitle')}
          </Typography>
          {candidates.length === 0 ? (
            <Typography level='body-sm' color='warning'>
              {t('visibility.members.noCandidates')}
            </Typography>
          ) : (
            <List
              orientation='horizontal'
              wrap
              sx={{ '--List-gap': '8px', '--ListItem-radius': '20px' }}
            >
              {candidates.map(member => {
                const checked = memberIds.includes(member.userId)
                return (
                  <ListItem key={member.userId}>
                    <Checkbox
                      overlay
                      disableIcon
                      variant='soft'
                      disabled={disabled}
                      checked={checked}
                      onChange={() => toggleMember(member.userId)}
                      label={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                          }}
                        >
                          <MemberAvatar member={member} size='sm' />
                          {member.displayName || member.username}
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          )}
          <FormHelperText>
            {memberIds.length === 0
              ? t('visibility.members.emptyHint')
              : t('visibility.members.hint', { count: memberIds.length })}
          </FormHelperText>
        </Box>
      )}
    </FormControl>
  )
}

export { MemberAvatar }
export default ProjectVisibilityField

// Icon for a restricted project: a lock for "only me", people for "selected
// members", nothing for circle-wide projects.
export const ProjectAccessIcon = ({ project, sx }) => {
  const visibility =
    project?.visibility || (project?.isPrivate ? 'private' : 'circle')
  if (visibility === PROJECT_VISIBILITY.MEMBERS) return <People sx={sx} />
  if (visibility === PROJECT_VISIBILITY.PRIVATE) return <Lock sx={sx} />
  return null
}
