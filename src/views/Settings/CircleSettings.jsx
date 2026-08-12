import { Share } from '@capacitor/share'
import { CopyAll, Delete, IosShare, Refresh } from '@mui/icons-material'
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
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
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
  const { t } = useTranslation('settings')
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
    confirmText = t('common.confirm'),
    cancelText = t('common.cancel'),
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

  const roleOptions = [
    {
      value: 'member',
      label: t('circleSettings.roles.member'),
      description: t('circleSettings.roles.memberDescription'),
    },
    {
      value: 'manager',
      label: t('circleSettings.roles.manager'),
      description: t('circleSettings.roles.managerDescription'),
    },
    {
      value: 'admin',
      label: t('circleSettings.roles.admin'),
      description: t('circleSettings.roles.adminDescription'),
    },
  ]

  // Roles come back from the API as lowercase identifiers, so fall back to the
  // raw value for anything the translations don't cover yet.
  const roleLabel = role =>
    roleOptions.find(option => option.value === role)?.label ?? role

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
        message: t('circleSettings.refreshFailed'),
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

  const inviteCode = userCircles[0]?.invite_code
  const apiURL = new URL(apiClient.getApiURL(), window.location.origin)
  const inviteOrigin =
    apiURL.hostname === 'api.donetick.com'
      ? 'https://app.donetick.com'
      : `${apiURL.origin}${apiURL.pathname.replace(/\/api\/v1\/?$/, '')}`
  const inviteLink = inviteCode
    ? `${inviteOrigin.replace(/\/$/, '')}/circle/join?code=${encodeURIComponent(inviteCode)}`
    : ''

  const shareInvite = async () => {
    const circleName = userCircles[0]?.name || t('circleSettings.myCircle')

    try {
      await Share.share({
        title: t('circleSettings.shareTitle', { name: circleName }),
        text: t('circleSettings.shareText', { name: circleName }),
        url: inviteLink,
        dialogTitle: t('circleSettings.shareDialogTitle'),
      })
    } catch (error) {
      if (error?.message?.toLowerCase().includes('cancel')) return
      await navigator.clipboard.writeText(inviteLink)
      showNotification({
        type: 'success',
        message: t('circleSettings.linkCopied'),
      })
    }
  }

  if (!userProfile) {
    return <LoadingComponent />
  }

  return (
    <SettingsLayout title={t('circleSettings.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('circleSettings.description')}
        </Typography>
        <Box>
          <Typography level='title-sm' sx={{ mb: 1 }}>
            {userCircles[0]?.userRole === 'member'
              ? t('circleSettings.memberOf', { name: userCircles[0]?.name })
              : t('circleSettings.yourCircleCode')}
          </Typography>
          <Input
            value={inviteCode}
            disabled
            size='lg'
            sx={{
              width: { xs: '100%', sm: '220px' },
              mb: 1,
            }}
          />
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Button
              variant='soft'
              startDecorator={<CopyAll />}
              onClick={() => {
                navigator.clipboard.writeText(userCircles[0]?.invite_code)
                showNotification({
                  type: 'success',
                  message: t('circleSettings.codeCopied'),
                })
              }}
            >
              {t('circleSettings.copyCode')}
            </Button>
            <Button
              variant='soft'
              disabled={!inviteLink}
              startDecorator={<IosShare />}
              onClick={shareInvite}
            >
              {t('circleSettings.shareInvite')}
            </Button>
            {userCircles.length > 0 &&
              userCircles[0]?.userRole === 'member' && (
                <Button
                  color='danger'
                  variant='outlined'
                  onClick={() => {
                    showConfirmation(
                      t('circleSettings.leaveConfirmMessage'),
                      t('circleSettings.leaveConfirmTitle'),
                      () => {
                        LeaveCircle(userCircles[0]?.id).then(resp => {
                          if (resp.ok) {
                            showNotification({
                              type: 'success',
                              message: t('circleSettings.leftCircle'),
                            })
                          } else {
                            showNotification({
                              type: 'error',
                              message: t('circleSettings.leaveFailed'),
                            })
                          }
                        })
                      },
                      t('circleSettings.leaveConfirmButton'),
                      t('common.cancel'),
                      'danger',
                    )
                  }}
                >
                  {t('circleSettings.leave')}
                </Button>
              )}
          </Box>
        </Box>

        <Typography level='title-md'>
          {t('circleSettings.circleMembers')}
        </Typography>
        {circleMembers.map(member => (
          <Card key={member.id} className='p-4'>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography level='body-md'>
                  {member.displayName.charAt(0).toUpperCase() +
                    member.displayName.slice(1)}
                  {member.userId === userProfile.id
                    ? t('circleSettings.you')
                    : ''}{' '}
                  <Chip>
                    {' '}
                    {member.isActive
                      ? roleLabel(member.role)
                      : t('circleSettings.pendingApproval')}
                  </Chip>
                </Typography>
                {member.isActive ? (
                  <Typography level='body-sm'>
                    {t('circleSettings.joinedOn', {
                      date: fmt.date(member.createdAt),
                    })}
                  </Typography>
                ) : (
                  <Typography level='body-sm' color='danger'>
                    {t('circleSettings.requestedToJoin', {
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
                      <Typography>{roleLabel(member.role)}</Typography>
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
                            message: t('circleSettings.roleUpdateFailed'),
                          })
                        }
                      })
                    }}
                  >
                    {roleOptions.map((option, index) => (
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
                            {option.label}
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
                          t('circleSettings.removeMemberMessage', {
                            name: member.displayName,
                          }),
                          t('circleSettings.removeMemberTitle'),
                          () => {
                            DeleteCircleMember(
                              member.circleId,
                              member.userId,
                            ).then(resp => {
                              if (resp.ok) {
                                showNotification({
                                  type: 'success',
                                  message: t('circleSettings.memberRemoved'),
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
                          t('common.remove'),
                          t('common.cancel'),
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
          <Typography level='title-md'>
            {t('circleSettings.circleMemberRequests')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastRefresh && (
              <Typography level='body-sm' color='neutral'>
                {t('circleSettings.lastUpdated', {
                  time: fmt.dateTime(lastRefresh),
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
                ? t('circleSettings.refreshing')
                : t('common.refresh')}
            </Button>
          </Box>
        </Box>

        {circleMemberRequests.map(request => (
          <Card key={request.id} className='p-4'>
            <Typography level='body-md'>
              {t('circleSettings.wantsToJoin', { name: request.displayName })}
            </Typography>
            <Button
              variant='soft'
              color='success'
              onClick={() => {
                showConfirmation(
                  t('circleSettings.acceptRequestMessage', {
                    name: request.displayName,
                    username: request.username,
                  }),
                  t('circleSettings.acceptRequestTitle'),
                  () => {
                    AcceptCircleMemberRequest(request.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('circleSettings.requestAccepted'),
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
                  t('circleSettings.accept'),
                  t('common.cancel'),
                )
              }}
            >
              {t('circleSettings.accept')}
            </Button>
          </Card>
        ))}
        <Divider> {t('circleSettings.or')} </Divider>

        <Typography level='body-md'>
          {t('circleSettings.joinOtherDescription')}
        </Typography>

        <Typography level='title-sm' mb={-1}>
          {t('circleSettings.enterCircleCode')}
          <Input
            placeholder={t('circleSettings.enterCodePlaceholder')}
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
                    message: t('circleSettings.joinedPending'),
                  })
                  setTimeout(() => navigate('/'), 3000)
                } else {
                  if (resp.status === 409) {
                    showNotification({
                      type: 'error',
                      message: t('circleSettings.alreadyMember'),
                    })
                  } else {
                    showNotification({
                      type: 'error',
                      message: t('circleSettings.joinFailed'),
                    })
                  }
                  setTimeout(() => navigate('/'), 3000)
                }
              })
            }}
          >
            {t('circleSettings.joinCircle')}
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
