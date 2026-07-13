import { SupervisorAccount } from '@mui/icons-material'
import { Avatar, Box, Button, Sheet, Typography } from '@mui/joy'

import { useEffect, useState } from 'react'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import UserModal from '../Modals/Inputs/UserModal'
const UserSwitcher = () => {
  const { 
    impersonatedUser, 
    isImpersonating,
    startImpersonation, 
    stopImpersonation,
    canImpersonate 
  } = useImpersonateUser()
  const { data: userProfile } = useUserProfile()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: circleMembersData, isLoading: isCircleMembersLoading } =
    useCircleMembers()

  // Check if current user can impersonate
  const isAdmin = canImpersonate(userProfile, circleMembersData?.res)
  if (!isAdmin) {
    return null
  } else if (isCircleMembersLoading || !isImpersonating) {
    return (
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mr: 10,
          justifyContent: 'space-between',
          boxShadow: 'sm',
          borderRadius: 20,
          width: '315px',
          mb: 1,
        }}
      >
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          {/* Header */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 1,
              }}
            >
              <SupervisorAccount color='' />
              <Typography level='title-md'>View tasks as</Typography>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography level='title-md' sx={{ mb: 0.5 }}>
              Switch to user view
            </Typography>
            <Typography level='body-sm' sx={{ mb: 1, color: 'text.secondary' }}>
              Tasks will be filtered to show only assignments for selected user
            </Typography>
          </Box>
          <Button
            variant='plain'
            color='primary'
            onClick={() => setIsModalOpen(true)}
            size='sm'
          >
            Choose User
          </Button>
          <UserModal
            isOpen={isModalOpen}
            performers={circleMembersData?.res}
            onSelect={user => {
              startImpersonation(user, userProfile)
              setIsModalOpen(false)
            }}
            onClose={() => setIsModalOpen(false)}
          />
        </Box>
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='plain'
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mr: 10,
        justifyContent: 'space-between',
        boxShadow: 'sm',
        borderRadius: 20,
        width: '310px',
        mb: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 1,
            }}
          >
            <SupervisorAccount color='' />
            <Typography level='title-md'>View tasks as</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ mr: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
              }}
              src={impersonatedUser?.image || impersonatedUser?.avatar}
              alt={impersonatedUser?.displayName || impersonatedUser?.name}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography level='title-md' sx={{ mb: 1, ml: 0.5 }}>
              {impersonatedUser?.displayName || impersonatedUser?.name}
            </Typography>
            {/* <Box sx={{ fontSize: 14, color: 'text.secondary', mb: 0.5 }}>
              5 chores assigned, 2 due soon
            </Box> */}
            <Box>
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => {
                  setIsModalOpen(true)
                }}
              >
                Change User
              </Button>
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                sx={{ ml: 0.5 }}
                onClick={() => {
                  stopImpersonation()
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <UserModal
        isOpen={isModalOpen}
        performers={circleMembersData?.res}
        onSelect={user => {
          startImpersonation(user, userProfile)
          setIsModalOpen(false)
        }}
        onClose={() => {
          setIsModalOpen(false)
        }}
      />
    </Sheet>
  )
}
export default UserSwitcher
