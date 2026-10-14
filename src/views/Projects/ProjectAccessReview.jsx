import {
  ArrowForwardRounded,
  Groups,
  InfoOutlined,
  Lock,
  People,
  PersonAddRounded,
  PersonRemoveRounded,
  WarningRounded,
} from '@mui/icons-material'
import { Box, ListDivider, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { PROJECT_VISIBILITY } from '../../utils/ProjectAccess'
import { MemberAvatar } from './ProjectVisibilityField'

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

const VISIBILITY_ICON = {
  [PROJECT_VISIBILITY.PRIVATE]: Lock,
  [PROJECT_VISIBILITY.MEMBERS]: People,
  [PROJECT_VISIBILITY.CIRCLE]: Groups,
}

// One side of the before/after summary: an icon tied to the visibility level
// and its label, dimmed on the "before" side so the eye lands on "after".
const AccessBadge = ({ access, emphasize }) => {
  const { t } = useTranslation('projects')
  const Icon = VISIBILITY_ICON[access?.visibility] || Lock
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Icon
        sx={{
          fontSize: 18,
          color: emphasize ? 'primary.500' : 'text.tertiary',
          flexShrink: 0,
        }}
      />
      <Typography
        level='body-sm'
        noWrap
        sx={{
          fontWeight: emphasize ? 'lg' : 'md',
          color: emphasize ? 'text.primary' : 'text.secondary',
        }}
      >
        {t(`visibility.${access?.visibility}.title`)}
      </Typography>
    </Box>
  )
}

// A column of avatar + name rows for one side of an access change (people
// gaining or losing visibility into the project).
const MemberList = ({ currentUserId, members, t, userIds }) => {
  const memberOf = userId => {
    if (userId === currentUserId) {
      return { displayName: t('visibility.review.you') }
    }
    return (
      members.find(m => m.userId === userId) || { displayName: `#${userId}` }
    )
  }

  return (
    <Stack sx={{ mt: 0.5 }}>
      {userIds.map((id, index) => {
        const member = memberOf(id)
        return (
          <Box key={id}>
            {index > 0 && <ListDivider sx={{ my: 0 }} />}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}
            >
              <MemberAvatar member={member} size='sm' />
              <Typography level='body-sm' sx={{ fontWeight: 'md' }}>
                {member.displayName || member.username || `#${id}`}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}

const ProjectAccessReview = ({ currentUserId, members = [], preview }) => {
  const { t } = useTranslation('projects')

  const nameOf = userId => {
    if (userId === currentUserId) return t('visibility.review.you')
    const member = members.find(m => m.userId === userId)
    return member?.displayName || member?.username || `#${userId}`
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
  const visibilityChanged =
    preview.before?.visibility !== preview.after?.visibility

  return (
    <Stack spacing={2}>
      <Sheet
        variant='soft'
        color='neutral'
        sx={{
          borderRadius: 'md',
          p: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {visibilityChanged ? (
          <>
            <AccessBadge access={preview.before} />
            <ArrowForwardRounded
              sx={{ fontSize: 16, color: 'text.tertiary', flexShrink: 0 }}
            />
            <AccessBadge access={preview.after} emphasize />
          </>
        ) : (
          <AccessBadge access={preview.after} emphasize />
        )}
      </Sheet>

      {revoked.length > 0 && (
        <Sheet variant='outlined' sx={{ borderRadius: 'md', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PersonRemoveRounded sx={{ fontSize: 18, color: 'danger.500' }} />
            <Typography level='title-sm' sx={{ flex: 1 }}>
              {t('visibility.review.loseAccess')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {revoked.length}
            </Typography>
          </Box>
          <MemberList
            currentUserId={currentUserId}
            members={members}
            userIds={revoked}
            t={t}
          />
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.75 }}>
            {t('visibility.review.loseAccessHint', {
              count: preview.totalChores || 0,
            })}
          </Typography>
        </Sheet>
      )}

      {granted.length > 0 && (
        <Sheet variant='outlined' sx={{ borderRadius: 'md', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PersonAddRounded sx={{ fontSize: 18, color: 'success.600' }} />
            <Typography level='title-sm' sx={{ flex: 1 }}>
              {t('visibility.review.gainAccess')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {granted.length}
            </Typography>
          </Box>
          <MemberList
            currentUserId={currentUserId}
            members={members}
            userIds={granted}
            t={t}
          />
          {opensToCircle && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                mt: 0.75,
              }}
            >
              <WarningRounded
                sx={{ fontSize: 16, color: 'warning.500', mt: '2px' }}
              />
              <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                {t('visibility.review.opensToCircle')}
              </Typography>
            </Box>
          )}
        </Sheet>
      )}

      {assignmentChanges.length > 0 && (
        <Sheet variant='outlined' sx={{ borderRadius: 'md', p: 1.5 }}>
          <Typography level='title-sm'>
            {t('visibility.review.assignmentChanges', {
              count: assignmentChanges.length,
            })}
          </Typography>
          <Stack sx={{ mt: 0.5 }}>
            {assignmentChanges.map((change, index) => (
              <Box key={change.choreId}>
                {index > 0 && <ListDivider sx={{ my: 0 }} />}
                <Box sx={{ py: 0.75 }}>
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
                </Box>
              </Box>
            ))}
          </Stack>
        </Sheet>
      )}

      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, px: 0.25 }}
      >
        <InfoOutlined
          sx={{
            fontSize: 16,
            color: 'text.tertiary',
            mt: '2px',
            flexShrink: 0,
          }}
        />
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('visibility.review.keepsHistory')}
        </Typography>
      </Box>
    </Stack>
  )
}

export default ProjectAccessReview
