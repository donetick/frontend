import { Share } from '@capacitor/share'
import {
  CloseRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  GroupAddRounded,
  GroupRounded,
  IosShareRounded,
  LoginRounded,
  RefreshRounded,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import {
  AcceptCircleMemberRequest,
  DeclineCircleMemberRequest,
  DeleteCircleMember,
  GetAllCircleMembers,
  GetCircleMemberRequests,
  GetUserCircle,
  JoinCircle,
  LeaveCircle,
  UpdateMemberRole,
} from '../../utils/Fetcher'
import { resolvePhotoURL } from '../../utils/Helpers'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const sectionTitleSx = {
  fontWeight: 650,
  letterSpacing: '-0.01em',
}

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

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
  const [lastRefresh, setLastRefresh] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [acceptingRequest, setAcceptingRequest] = useState(null)
  const [decliningRequest, setDecliningRequest] = useState(null)
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
        if (isConfirmed) onConfirm()
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

  const roleLabel = role =>
    roleOptions.find(option => option.value === role)?.label ?? role

  const loadMembers = async () => {
    const data = await GetAllCircleMembers()
    setCircleMembers(data.res || [])
  }

  const refreshMemberRequests = async () => {
    setIsRefreshing(true)
    try {
      const resp = await GetCircleMemberRequests()
      const data = await resp.json()
      setCircleMemberRequests(data.res || [])
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
    GetUserCircle()
      .then(resp => resp.json())
      .then(data => setUserCircles(data.res || []))
    GetCircleMemberRequests()
      .then(resp => resp.json())
      .then(data => {
        setCircleMemberRequests(data.res || [])
        setLastRefresh(new Date())
      })
    GetAllCircleMembers().then(data => setCircleMembers(data.res || []))
  }, [])

  const isAdmin = circleMembers.some(
    member => member.userId === userProfile?.id && member.role === 'admin',
  )
  const circle = userCircles[0]
  const myMembership = circleMembers.find(
    member => member.userId === userProfile?.id,
  )
  const isPendingApproval =
    circle?.userRole === 'member' && myMembership && !myMembership.isActive
  const inviteCode = circle?.invite_code || ''
  const apiURL = new URL(apiClient.getApiURL(), window.location.origin)
  const inviteOrigin =
    apiURL.hostname === 'api.donetick.com'
      ? 'https://app.donetick.com'
      : `${apiURL.origin}${apiURL.pathname.replace(/\/api\/v1\/?$/, '')}`
  const inviteLink = inviteCode
    ? `${inviteOrigin.replace(/\/$/, '')}/circle/join?code=${encodeURIComponent(inviteCode)}`
    : ''

  const copyInviteCode = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    showNotification({
      type: 'success',
      message: t('circleSettings.codeCopied'),
    })
  }

  const shareInvite = async () => {
    const circleName = circle?.name || t('circleSettings.myCircle')
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

  const acceptRequest = request => {
    showConfirmation(
      t('circleSettings.acceptRequestMessage', {
        name: request.displayName,
        username: request.username,
      }),
      t('circleSettings.acceptRequestTitle'),
      async () => {
        setAcceptingRequest(request.id)
        try {
          const resp = await AcceptCircleMemberRequest(request.id)
          if (!resp.ok) return
          showNotification({
            type: 'success',
            message: t('circleSettings.requestAccepted'),
          })
          queryClient.invalidateQueries({ queryKey: ['circleMembers'] })
          queryClient.invalidateQueries({ queryKey: ['circleMemberRequests'] })
          queryClient.invalidateQueries({ queryKey: ['userCircle'] })
          await Promise.all([refreshMemberRequests(), loadMembers()])
        } finally {
          setAcceptingRequest(null)
        }
      },
      t('circleSettings.accept'),
      t('common.cancel'),
    )
  }

  const declineRequest = request => {
    showConfirmation(
      t('circleSettings.declineRequestMessage', {
        name: request.displayName,
        username: request.username,
      }),
      t('circleSettings.declineRequestTitle'),
      async () => {
        setDecliningRequest(request.id)
        try {
          const resp = await DeclineCircleMemberRequest(request.id)
          if (!resp.ok) {
            showNotification({
              type: 'error',
              message: t('circleSettings.declineRequestFailed'),
            })
            return
          }
          showNotification({
            type: 'success',
            message: t('circleSettings.requestDeclined'),
          })
          setCircleMemberRequests(requests =>
            requests.filter(item => item.id !== request.id),
          )
          queryClient.invalidateQueries({ queryKey: ['circleMemberRequests'] })
        } finally {
          setDecliningRequest(null)
        }
      },
      t('circleSettings.declineRequestButton'),
      t('common.cancel'),
      'danger',
    )
  }

  const cancelJoinRequest = () => {
    showConfirmation(
      t('circleSettings.cancelRequestMessage'),
      t('circleSettings.cancelRequestTitle'),
      async () => {
        const resp = await LeaveCircle(circle.id)
        if (resp.ok) {
          showNotification({
            type: 'success',
            message: t('circleSettings.requestCancelled'),
          })
          queryClient.invalidateQueries({ queryKey: ['userCircle'] })
          setUserCircles([])
        } else {
          showNotification({
            type: 'error',
            message: t('circleSettings.cancelRequestFailed'),
          })
        }
      },
      t('circleSettings.cancelRequestButton'),
      t('common.cancel'),
      'danger',
    )
  }

  const joinCircle = async () => {
    const code = circleInviteCode.trim()
    if (!code) return
    setIsJoining(true)
    try {
      const resp = await JoinCircle(code)
      showNotification({
        type: resp.ok ? 'success' : 'error',
        message: resp.ok
          ? t('circleSettings.joinedPending')
          : resp.status === 409
            ? t('circleSettings.alreadyMember')
            : t('circleSettings.joinFailed'),
      })
      if (resp.ok) setCircleInviteCode('')
      setTimeout(() => navigate('/'), 3000)
    } finally {
      setIsJoining(false)
    }
  }

  if (!userProfile) return <LoadingComponent />

  return (
    <SettingsLayout title={t('circleSettings.title')}>
      <Box sx={{ maxWidth: 760, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 640, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('circleSettings.description')}
        </Typography>

        <Sheet
          sx={{
            ...surfaceSx,
            overflow: 'hidden',
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1.5,
              mb: 2.25,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.softBg',
                borderRadius: '50%',
                color: 'primary.plainColor',
                display: 'grid',
                flex: '0 0 auto',
                height: 44,
                placeItems: 'center',
                width: 44,
              }}
            >
              <GroupRounded />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography level='title-lg' sx={sectionTitleSx} noWrap>
                {circle?.name || t('circleSettings.myCircle')}
              </Typography>
              <Typography level='body-sm' textColor='text.secondary'>
                {isPendingApproval
                  ? t('circleSettings.pendingApprovalMessage', {
                      name: circle?.name,
                    })
                  : circle?.userRole === 'member'
                    ? t('circleSettings.memberOf', { name: circle?.name })
                    : t('circleSettings.yourCircleCode')}
              </Typography>
            </Box>
          </Box>

          {isPendingApproval ? (
            <Button
              color='danger'
              variant='soft'
              startDecorator={<CloseRounded />}
              onClick={cancelJoinRequest}
            >
              {t('circleSettings.cancelRequest')}
            </Button>
          ) : (
            <Box
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
                bgcolor: 'background.level1',
                borderRadius: 'lg',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                justifyContent: 'space-between',
                p: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 'clamp(1.25rem, 5vw, 1.5rem)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {inviteCode}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='soft'
                  disabled={!inviteCode}
                  startDecorator={<ContentCopyRounded />}
                  onClick={copyInviteCode}
                  sx={{ flex: { xs: 1, sm: 'none' } }}
                >
                  {t('circleSettings.copyCode')}
                </Button>
                <Button
                  variant='solid'
                  disabled={!inviteLink}
                  startDecorator={<IosShareRounded />}
                  onClick={shareInvite}
                  sx={{ flex: { xs: 1, sm: 'none' } }}
                >
                  {t('circleSettings.shareInvite')}
                </Button>
              </Box>
            </Box>
          )}
        </Sheet>

        {isAdmin && (
          <Box component='section' sx={{ mt: 3.5 }}>
            <Box
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                display: 'flex',
                gap: 1,
                justifyContent: 'space-between',
                mb: 1.25,
              }}
            >
              <Box>
                <Typography level='title-md' sx={sectionTitleSx}>
                  {t('circleSettings.circleMemberRequests')}
                  <Chip size='sm' variant='soft' sx={{ ml: 1 }}>
                    {circleMemberRequests.length}
                  </Chip>
                </Typography>
                {lastRefresh && (
                  <Typography level='body-xs' textColor='text.tertiary'>
                    {t('circleSettings.lastUpdated', {
                      time: fmt.dateTime(lastRefresh),
                    })}
                  </Typography>
                )}
              </Box>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                onClick={refreshMemberRequests}
                disabled={isRefreshing}
                aria-label={t('common.refresh')}
              >
                {isRefreshing ? (
                  <CircularProgress size='sm' />
                ) : (
                  <RefreshRounded />
                )}
              </IconButton>
            </Box>

            {circleMemberRequests.length > 0 && (
              <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
                {circleMemberRequests.map((request, index) => (
                  <Box key={request.id}>
                    {index > 0 && <Divider />}
                    <Box
                      sx={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 1.5,
                        p: 1.5,
                      }}
                    >
                      <Avatar size='sm'>
                        {request.displayName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography level='title-sm' noWrap>
                          {request.displayName}
                        </Typography>
                        <Typography level='body-xs' textColor='text.secondary'>
                          {t('circleSettings.wantsToJoin', {
                            name: request.displayName,
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Button
                          size='sm'
                          color='success'
                          variant='soft'
                          loading={acceptingRequest === request.id}
                          onClick={() => acceptRequest(request)}
                        >
                          {t('circleSettings.accept')}
                        </Button>
                        <Button
                          size='sm'
                          color='danger'
                          variant='soft'
                          loading={decliningRequest === request.id}
                          onClick={() => declineRequest(request)}
                        >
                          {t('circleSettings.decline')}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Sheet>
            )}
          </Box>
        )}

        <Box component='section' sx={{ mt: 3.5 }}>
          <Typography level='title-md' sx={{ ...sectionTitleSx, mb: 1.25 }}>
            {t('circleSettings.circleMembers')}
            <Chip size='sm' variant='soft' sx={{ ml: 1 }}>
              {circleMembers.length}
            </Chip>
          </Typography>
          <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
            {circleMembers.map((member, index) => {
              const isCurrentUser = member.userId === userProfile.id
              return (
                <Box key={member.id || member.userId}>
                  {index > 0 && <Divider />}
                  <Box
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      display: 'flex',
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      gap: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Avatar
                      size='sm'
                      src={resolvePhotoURL(member.image)}
                      sx={{ bgcolor: 'background.level2' }}
                    >
                      {member.displayName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.75,
                        }}
                      >
                        <Typography level='title-sm'>
                          {member.displayName}
                          {isCurrentUser ? ` ${t('circleSettings.you')}` : ''}
                        </Typography>
                        <Chip
                          size='sm'
                          variant='soft'
                          color={member.isActive ? 'neutral' : 'warning'}
                        >
                          {member.isActive
                            ? roleLabel(member.role)
                            : t('circleSettings.pendingApproval')}
                        </Chip>
                      </Box>
                      <Typography
                        level='body-xs'
                        textColor={
                          member.isActive
                            ? 'text.tertiary'
                            : 'danger.plainColor'
                        }
                      >
                        {member.isActive
                          ? t('circleSettings.joinedOn', {
                              date: fmt.date(member.createdAt),
                            })
                          : t('circleSettings.requestedToJoin', {
                              date: fmt.date(member.updatedAt),
                            })}
                      </Typography>
                    </Box>

                    {!isCurrentUser && isAdmin && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.75,
                          ml: { xs: 5.5, sm: 0 },
                          width: { xs: 'calc(100% - 44px)', sm: 'auto' },
                        }}
                      >
                        <Select
                          size='sm'
                          value={member.role}
                          disabled={!member.isActive}
                          aria-label={roleLabel(member.role)}
                          renderValue={() => roleLabel(member.role)}
                          onChange={(event, value) => {
                            if (!value) return
                            UpdateMemberRole(member.userId, value).then(
                              resp => {
                                if (resp.ok) {
                                  setCircleMembers(members =>
                                    members.map(item =>
                                      item.userId === member.userId
                                        ? { ...item, role: value }
                                        : item,
                                    ),
                                  )
                                } else {
                                  showNotification({
                                    type: 'error',
                                    message: t(
                                      'circleSettings.roleUpdateFailed',
                                    ),
                                  })
                                }
                              },
                            )
                          }}
                          sx={{ flex: { xs: 1, sm: 'none' }, minWidth: 120 }}
                        >
                          {roleOptions.map(option => (
                            <Option value={option.value} key={option.value}>
                              <Box>
                                <Typography level='title-sm'>
                                  {option.label}
                                </Typography>
                                <Typography
                                  level='body-xs'
                                  textColor='text.secondary'
                                >
                                  {option.description}
                                </Typography>
                              </Box>
                            </Option>
                          ))}
                        </Select>
                        {member.isActive && (
                          <IconButton
                            variant='plain'
                            color='danger'
                            size='sm'
                            aria-label={t('common.remove')}
                            onClick={() => {
                              showConfirmation(
                                t('circleSettings.removeMemberMessage', {
                                  name: member.displayName,
                                }),
                                t('circleSettings.removeMemberTitle'),
                                async () => {
                                  const resp = await DeleteCircleMember(
                                    member.circleId,
                                    member.userId,
                                  )
                                  if (!resp.ok) return
                                  showNotification({
                                    type: 'success',
                                    message: t('circleSettings.memberRemoved'),
                                  })
                                  queryClient.invalidateQueries({
                                    queryKey: ['circleMembers'],
                                  })
                                  queryClient.invalidateQueries({
                                    queryKey: ['userCircle'],
                                  })
                                  setCircleMembers(members =>
                                    members.filter(
                                      item => item.userId !== member.userId,
                                    ),
                                  )
                                },
                                t('common.remove'),
                                t('common.cancel'),
                                'danger',
                              )
                            }}
                          >
                            <DeleteOutlineRounded />
                          </IconButton>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Sheet>
        </Box>

        <Box component='section' sx={{ mt: 3.5 }}>
          <Sheet
            variant='soft'
            sx={{ borderRadius: 'xl', p: { xs: 2, sm: 2.5 } }}
          >
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <GroupAddRounded
                color='primary'
                sx={{ display: { xs: 'none', sm: 'block' }, mt: 0.25 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level='title-md' sx={sectionTitleSx}>
                  {t('circleSettings.enterCircleCode')}
                </Typography>
                <Typography
                  level='body-sm'
                  textColor='text.secondary'
                  sx={{ mb: 1.5, mt: 0.25 }}
                >
                  {t('circleSettings.joinOtherDescription')}
                </Typography>
                <Box
                  sx={{
                    alignItems: 'stretch',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                  }}
                >
                  <Input
                    placeholder={t('circleSettings.enterCodePlaceholder')}
                    value={circleInviteCode}
                    onChange={event => setCircleInviteCode(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') joinCircle()
                    }}
                    startDecorator={<LoginRounded />}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    loading={isJoining}
                    disabled={!circleInviteCode.trim()}
                    onClick={joinCircle}
                  >
                    {t('circleSettings.joinCircle')}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Sheet>
        </Box>

        {circle && circle.userRole === 'member' && !isPendingApproval && (
          <Box
            sx={{
              mt: 3.5,
              pt: 2.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              color='danger'
              variant='plain'
              onClick={() => {
                showConfirmation(
                  t('circleSettings.leaveConfirmMessage'),
                  t('circleSettings.leaveConfirmTitle'),
                  async () => {
                    const resp = await LeaveCircle(circle.id)
                    if (resp.ok) {
                      showNotification({
                        type: 'success',
                        message: t('circleSettings.leftCircle'),
                      })
                      queryClient.invalidateQueries({
                        queryKey: ['userCircle'],
                      })
                      navigate('/')
                    } else {
                      showNotification({
                        type: 'error',
                        message: t('circleSettings.leaveFailed'),
                      })
                    }
                  },
                  t('circleSettings.leaveConfirmButton'),
                  t('common.cancel'),
                  'danger',
                )
              }}
            >
              {t('circleSettings.leave')}
            </Button>
          </Box>
        )}
      </Box>

      {confirmModalConfig?.isOpen && (
        <ConfirmationModal config={confirmModalConfig} />
      )}
    </SettingsLayout>
  )
}

export default CircleSettings
