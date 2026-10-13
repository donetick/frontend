import { InfoOutlined, PersonAdd, PersonRemove } from '@mui/icons-material'
import { Alert, Box, Chip, List, ListItem, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { PROJECT_VISIBILITY } from '../../utils/ProjectAccess'

// Summary of a server-side access preview (POST /projects/:id/access-preview),
// shown before the owner confirms a change of who can see a project.
export const hasAccessImpact = preview =>
  Boolean(
    preview &&
    ((preview.revokedUsers || []).length > 0 ||
      (preview.grantedUsers || []).length > 0 ||
      (preview.changes || []).some(
        change =>
          (change.removedAssignees || []).length > 0 ||
          (change.addedAssignees || []).length > 0 ||
          change.assignedToBefore !== change.assignedToAfter,
      )),
  )

const ProjectAccessReview = ({ currentUserId, members = [], preview }) => {
  const { t } = useTranslation('projects')
  const nameOf = userId => {
    if (userId === currentUserId) return t('visibility.review.you')
    const member = members.find(m => m.userId === userId)
    return member?.displayName || member?.username || `#${userId}`
  }
  const audience = access => {
    if (!access) return ''
    if (access.visibility === PROJECT_VISIBILITY.MEMBERS) {
      const names = (access.memberIds || []).map(nameOf)
      return names.length
        ? t('visibility.review.audienceMembers', { names: names.join(', ') })
        : t('visibility.review.audienceMembersNone')
    }
    return t(`visibility.${access.visibility}.title`)
  }

  const revoked = preview.revokedUsers || []
  const granted = preview.grantedUsers || []
  const assignmentChanges = (preview.changes || []).filter(
    change =>
      (change.removedAssignees || []).length > 0 ||
      (change.addedAssignees || []).length > 0 ||
      change.assignedToBefore !== change.assignedToAfter,
  )
  const opensToCircle = preview.after?.visibility === PROJECT_VISIBILITY.CIRCLE

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='body-md'>
        {audience(preview.before)} → <strong>{audience(preview.after)}</strong>
      </Typography>

      {revoked.length > 0 && (
        <Box>
          <Typography level='title-sm' startDecorator={<PersonRemove />}>
            {t('visibility.review.loseAccess')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 0.5 }}>
            {revoked.map(id => (
              <Chip key={id} size='sm' color='danger' variant='soft'>
                {nameOf(id)}
              </Chip>
            ))}
          </Box>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('visibility.review.loseAccessHint', {
              count: preview.totalChores || 0,
            })}
          </Typography>
        </Box>
      )}

      {granted.length > 0 && (
        <Box>
          <Typography level='title-sm' startDecorator={<PersonAdd />}>
            {t('visibility.review.gainAccess')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 0.5 }}>
            {granted.map(id => (
              <Chip key={id} size='sm' color='success' variant='soft'>
                {nameOf(id)}
              </Chip>
            ))}
          </Box>
          {opensToCircle && (
            <Typography level='body-xs' color='warning'>
              {t('visibility.review.opensToCircle')}
            </Typography>
          )}
        </Box>
      )}

      {assignmentChanges.length > 0 && (
        <Box>
          <Typography level='title-sm'>
            {t('visibility.review.assignmentChanges', {
              count: assignmentChanges.length,
            })}
          </Typography>
          <List size='sm' sx={{ '--ListItem-paddingX': 0 }}>
            {assignmentChanges.map(change => (
              <ListItem key={change.choreId} sx={{ display: 'block' }}>
                <Typography level='body-sm' sx={{ fontWeight: 'md' }}>
                  {change.name}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {(change.removedAssignees || []).length > 0 &&
                    t('visibility.review.removedAssignees', {
                      names: change.removedAssignees.map(nameOf).join(', '),
                    })}
                  {(change.addedAssignees || []).length > 0 &&
                    ' ' +
                      t('visibility.review.addedAssignees', {
                        names: change.addedAssignees.map(nameOf).join(', '),
                      })}
                  {change.assignedToBefore !== change.assignedToAfter &&
                    ' ' +
                      (change.assignedToAfter
                        ? t('visibility.review.nowAssigned', {
                            name: nameOf(change.assignedToAfter),
                          })
                        : t('visibility.review.nowUnassigned'))}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Alert
        size='sm'
        variant='soft'
        color='neutral'
        startDecorator={<InfoOutlined />}
      >
        {t('visibility.review.keepsHistory')}
      </Alert>
    </Box>
  )
}

export default ProjectAccessReview
