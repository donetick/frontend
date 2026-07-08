import { Delete, Refresh } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Input,
  Option,
  Select,
  Typography
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  AcceptCircleMemberRequest,
  DeleteCircleMember,
  GetAllCircleMembers,
  GetCircleMemberRequests,
  GetUserCircle,
  JoinCircle,
  LeaveCircle,
  UpdateMemberRole,
} from '../../utils/Fetcher'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const CircleSettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const { data: userProfile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const { fmt } = useLocalization()

  const [userCircles, setUserCircles] = useState([])
  const [circleMemberRequests, setCircleMemberRequests] = useState([])
  const [circleInviteCode, setCircleInviteCode] = useState('')
  const [circleMembers, setCircleMembers] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('common:actions.continue'),
    cancelText = t('common:actions.cancel'),
    color = 'primary',
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText,
      color,
      onClose: isConfirmed => {
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }

  const refreshMemberRequests = async () => {
    setIsRefreshing(true)
    try {
      const resp = await GetCircleMemberRequests()
      const data = await resp.json()
      setCircleMemberRequests(data.res ? data.res : [])
      setLastRefresh(new Date())
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('settings:circlePage.roleUpdateFailed'),
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    GetUserCircle().then(resp => {
      resp.json().then(data => {
        setUserCircles(data.res ? data.res : [])
      })
    })
    GetCircleMemberRequests().then(resp => {
      resp.json().then(data => {
        setCircleMemberRequests(data.res ? data.res : [])
        setLastRefresh(new Date())
      })
    })
    GetAllCircleMembers().then(data => {
      setCircleMembers(data.res ? data.res : [])
    })
  }, [])

  useEffect(() => {
    if (userProfile && userProfile.id) {
      const isUserAdmin = circleMembers.some(
        member => member.userId === userProfile.id && member.role === 'admin',
      )
      setIsAdmin(isUserAdmin)
    }
  }, [circleMembers, userProfile])

  if (!userProfile) {
    return <LoadingComponent />
  }

  return (
    <SettingsLayout title={t('settings:pages.circle.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('settings:circlePage.description')}
        </Typography>
        <Typography level='title-sm' mb={-1}>
          {userCircles[0]?.userRole === 'member'
            ? t('settings:circlePage.partOf', { name: userCircles[0]?.name })
            : t('settings:circlePage.codeIs')}

          <Input
            value={userCircles[0]?.invite_code}
            disabled
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              navigator.clipboard.writeText(userCircles[0]?.invite_code)
              showNotification({
                type: 'success',
                message: t('settings:circlePage.copyCodeSuccess'),
              })
            }}
          >
            {t('settings:circlePage.copyCode')}
          </Button>
          <Button
            variant='soft'
            sx={{ ml: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.protocol +
                  '//' +
                  window.location.host +
                  `/circle/join?code=${userCircles[0]?.invite_code}`,
              )
              showNotification({
                type: 'success',
                message: t('settings:circlePage.copyLinkSuccess'),
              })
            }}
          >
            {t('settings:circlePage.copyLink')}
          </Button>
          {userCircles.length > 0 && userCircles[0]?.userRole === 'member' && (
            <Button
              color='danger'
              variant='outlined'
              sx={{ ml: 1 }}
              onClick={() => {
                showConfirmation(
                  t('settings:circlePage.leaveConfirm'),
                  t('settings:circlePage.leaveTitle'),
                  () => {
                    LeaveCircle(userCircles[0]?.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('settings:circlePage.leaveSuccess'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('settings:circlePage.leaveFailed'),
                        })
                      }
                    })
                  },
                  t('settings:circlePage.leaveCircle'),
                  t('common:actions.cancel'),
                  'danger',
                )
              }}
            >
              {t('settings:circlePage.leaveCircle')}
            </Button>
          )}
        </Typography>

        <Typography level='title-md'>{t('settings:circlePage.members')}</Typography>
        {circleMembers.map(member => (
          <Card key={member.id} className='p-4'>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography level='body-md'>
                  {member.displayName.charAt(0).toUpperCase() +
                    member.displayName.slice(1)}
                  {member.userId === userProfile.id ? ' (Du)' : ''}{' '}
                  <Chip>
                    {member.isActive
                      ? member.role
                      : t('settings:circlePage.pendingApproval')}
                  </Chip>
                </Typography>
                {member.isActive ? (
                  <Typography level='body-sm'>
                    {t('settings:circlePage.joinedOn', {
                      date: fmt.date(member.createdAt),
                    })}
                  </Typography>
                ) : (
                  <Typography level='body-sm' color='danger'>
                    {t('settings:circlePage.requestedOn', {
                      date: fmt.date(member.updatedAt),
                    })}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {member.userId !== userProfile.id && isAdmin && (
                  <Select
                    size='sm'
                    sx={{ mr: 1 }}
                    value={member.role}
                    renderValue={() => (
                      <Typography>
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </Typography>
                    )}
                    onChange={(e, value) => {
                      UpdateMemberRole(member.userId, value).then(resp => {
                        if (resp.ok) {
                          const newCircleMembers = circleMembers.map(m => {
                            if (m.userId === member.userId) {
                              m.role = value
                            }
                            return m
                          })
                          setCircleMembers(newCircleMembers)
                        } else {
                          showNotification({
                            type: 'error',
                            message: t('settings:circlePage.roleUpdateFailed'),
                          })
                        }
                      })
                    }}
                  >
                    {[
                      {
                        value: 'member',
                        description: t(
                          'settings:circlePage.roleDescriptions.member',
                        ),
                      },
                      {
                        value: 'manager',
                        description: t(
                          'settings:circlePage.roleDescriptions.manager',
                        ),
                      },
                      {
                        value: 'admin',
                        description: t(
                          'settings:circlePage.roleDescriptions.admin',
                        ),
                      },
                    ].map((option, index) => (
                      <Option value={option.value} key={index}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'start',
                            alignItems: 'start',
                            width: '100%',
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            level='title-sm'
                            sx={{ mb: 0, mt: 0, lineHeight: 1.1 }}
                          >
                            {option.value.charAt(0).toUpperCase() +
                              option.value.slice(1)}
                          </Typography>
                          <Typography
                            level='body-sm'
                            sx={{ mt: 0, mb: 0, lineHeight: 1.1 }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Option>
                    ))}
                  </Select>
                )}
                {isAdmin &&
                  member.userId !== userProfile.id &&
                  member.isActive && (
                    <Button
                      variant='outlined'
                      color='danger'
                      size='sm'
                      onClick={() => {
                        showConfirmation(
                          t('settings:circlePage.removeMemberConfirm', {
                            name: member.displayName,
                          }),
                          t('settings:circlePage.removeMemberTitle'),
                          () => {
                            DeleteCircleMember(
                              member.circleId,
                              member.userId,
                            ).then(resp => {
                              if (resp.ok) {
                                showNotification({
                                  type: 'success',
                                  message: t(
                                    'settings:circlePage.removeMemberSuccess',
                                  ),
                                })
                                queryClient.invalidateQueries(['circleMembers'])
                                queryClient.invalidateQueries(['userCircle'])
                                queryClient.refetchQueries(['circleMembers'])
                                queryClient.refetchQueries(['userCircle'])
                                setCircleMembers(prevMembers =>
                                  prevMembers.filter(
                                    m => m.userId !== member.userId,
                                  ),
                                )
                              }
                            })
                          },
                          t('common:actions.remove'),
                          t('common:actions.cancel'),
                          'danger',
                        )
                      }}
                    >
                      <Delete />
                    </Button>
                  )}
              </Box>
            </Box>
          </Card>
        ))}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography level='title-md'>{t('settings:circlePage.requests')}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastRefresh && (
              <Typography level='body-sm' color='neutral'>
                {t('settings:circlePage.lastUpdated', {
                  date: fmt.dateTime(lastRefresh),
                })}
              </Typography>
            )}
            <Button
              size='sm'
              variant='soft'
              onClick={refreshMemberRequests}
              disabled={isRefreshing}
              startDecorator={
                isRefreshing ? <CircularProgress size='sm' /> : <Refresh />
              }
            >
              {isRefreshing
                ? t('settings:circlePage.refreshing')
                : t('settings:circlePage.refresh')}
            </Button>
          </Box>
        </Box>

        {circleMemberRequests.map(request => (
          <Card key={request.id} className='p-4'>
            <Typography level='body-md'>
              {t('settings:circlePage.wantsToJoin', {
                name: request.displayName,
              })}
            </Typography>
            <Button
              variant='soft'
              color='success'
              onClick={() => {
                showConfirmation(
                  t('settings:circlePage.acceptConfirm', {
                    name: request.displayName,
                    username: request.username,
                  }),
                  t('settings:circlePage.acceptTitle'),
                  () => {
                    AcceptCircleMemberRequest(request.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('settings:circlePage.acceptSuccess'),
                        })
                        queryClient.invalidateQueries(['circleMembers'])
                        queryClient.invalidateQueries(['circleMemberRequests'])
                        queryClient.invalidateQueries(['userCircle'])
                        queryClient.refetchQueries(['circleMembers'])
                        queryClient.refetchQueries(['circleMemberRequests'])
                        queryClient.refetchQueries(['userCircle'])
                        refreshMemberRequests()
                        GetAllCircleMembers().then(data => {
                          setCircleMembers(data.res ? data.res : [])
                        })
                      }
                    })
                  },
                  t('settings:circlePage.accept'),
                  t('common:actions.cancel'),
                )
              }}
            >
              {t('settings:circlePage.accept')}
            </Button>
          </Card>
        ))}
        <Divider>{t('common:actions.or')}</Divider>

        <Typography level='body-md'>
          {t('settings:circlePage.joinPrompt')}
        </Typography>

        <Typography level='title-sm' mb={-1}>
          {t('settings:circlePage.enterCode')}
          <Input
            placeholder={t('settings:circlePage.enterCode')}
            value={circleInviteCode}
            onChange={e => setCircleInviteCode(e.target.value)}
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              JoinCircle(circleInviteCode).then(resp => {
                if (resp.ok) {
                  showNotification({
                    type: 'success',
                    message: t('settings:circlePage.joinSuccess'),
                  })
                  setTimeout(() => navigate('/'), 3000)
                } else {
                  if (resp.status === 409) {
                    showNotification({
                      type: 'error',
                      message: t('settings:circlePage.alreadyMember'),
                    })
                  } else {
                    showNotification({
                      type: 'error',
                      message: t('settings:circlePage.joinFailed'),
                    })
                  }
                  setTimeout(() => navigate('/'), 3000)
                }
              })
            }}
          >
            {t('settings:circlePage.joinCircle')}
          </Button>
        </Typography>
      </div>

      {confirmModalConfig?.isOpen && (
        <ConfirmationModal config={confirmModalConfig} />
      )}
    </SettingsLayout>
  )
}

export default CircleSettings
