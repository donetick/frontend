import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import useConfirmationModal from '../../hooks/useConfirmationModal'
import { useChildUsers, useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  CreateChildUser,
  DeleteChildUser,
  UpdateChildPassword,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import CreateChildUserModal from '../Modals/Inputs/CreateChildUserModal'
import PasswordChangeModal from '../Modals/Inputs/PasswordChangeModal'
import SettingsLayout from './SettingsLayout'

const ChildUserSettings = () => {
  const { data: userProfile } = useUserProfile()
  const { data: childUsers, isLoading, refetch } = useChildUsers()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [deletingChildId, setDeletingChildId] = useState(null)

  // Check if user is a parent (not a child user)
  const isParentUser = userProfile?.userType === 0 && !userProfile?.parentUserId

  const handleCreateChild = async childData => {
    try {
      const response = await CreateChildUser(
        childData.childName,
        childData.displayName,
        childData.password,
      )

      if (response.ok) {
        const result = await response.json()
        showNotification({
          type: 'success',
          message: `Child account "${result.res.displayName}" created successfully!`,
        })
        refetch()
        queryClient.invalidateQueries(['childUsers'])
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create child user')
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: `Failed to create child account: ${error.message}`,
      })
      throw error
    }
  }

  const handleUpdatePassword = async newPassword => {
    if (!selectedChildId || !newPassword) return

    try {
      const response = await UpdateChildPassword(selectedChildId, newPassword)

      if (response.ok) {
        showNotification({
          type: 'success',
          message: 'Child password updated successfully',
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update password')
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: `Failed to update password: ${error.message}`,
      })
    }
  }

  const handleDeleteChild = async (childId, childName) => {
    showConfirmation(
      `Are you sure you want to delete the child account "${childName}"? This action cannot be undone.`,
      'Delete Sub Account',
      async () => {
        setDeletingChildId(childId)
        try {
          const response = await DeleteChildUser(childId)

          if (response.ok) {
            showNotification({
              type: 'success',
              message: `Sub account "${childName}" deleted successfully`,
            })
            refetch()
            queryClient.invalidateQueries(['childUsers'])
          } else {
            const error = await response.json()
            throw new Error(error.error || 'Failed to delete Sub user')
          }
        } catch (error) {
          showNotification({
            type: 'error',
            message: `Failed to delete Sub account: ${error.message}`,
          })
        } finally {
          setDeletingChildId(null)
        }
      },
      'Delete',
      'Cancel',
      'danger',
    )
  }

  if (!isParentUser) {
    return (
      <SettingsLayout title='Sub Account Management'>
        <Typography level='body-md' color='warning'>
          Only primary users can manage sub accounts.
        </Typography>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title='Managed Accounts'>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          Manage sub accounts. Sub account users can log in and complete
          assigned tasks.
        </Typography>
        {!isPlusAccount(userProfile) && (
          <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
            Sub account limited to 1 on Free plan. Upgrade to Plus to have up to
            5 sub accounts.
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography level='title-lg'>
            Sub Accounts ({childUsers?.length || 0})
          </Typography>
          <Button
            startDecorator={<PersonAddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Sub Account
          </Button>
        </Box>

        {isLoading ? (
          <Typography>Loading sub accounts...</Typography>
        ) : childUsers?.length === 0 ? (
          <Card variant='soft' sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <Typography level='title-md' mb={1}>
                No Sub Accounts
              </Typography>
              <Typography level='body-sm' mb={3}>
                Create sub accounts so team members can log in and complete
                their assigned tasks.
              </Typography>
              <Button
                startDecorator={<PersonAddIcon />}
                onClick={() => setCreateModalOpen(true)}
              >
                Add Your First Sub Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-3'>
            {childUsers?.map(child => (
              <Card key={child.id} variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar size='lg'>
                      {child.displayName?.[0]?.toUpperCase() ||
                        child.username?.[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ flex: 1 }}>
                      <Typography level='title-md'>
                        {child.displayName || child.username}
                      </Typography>
                      <Typography level='body-sm' color='neutral'>
                        Username: {child.username}
                      </Typography>
                      <Typography level='body-xs' color='neutral'>
                        Created:{' '}
                        {new Date(child.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size='sm'
                        variant='soft'
                        onClick={() => {
                          setSelectedChildId(child.id)
                          setPasswordModalOpen(true)
                        }}
                        title='Change Password'
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size='sm'
                        variant='soft'
                        color='danger'
                        onClick={() =>
                          handleDeleteChild(
                            child.id,
                            child.displayName || child.username,
                          )
                        }
                        loading={deletingChildId === child.id}
                        title='Delete Account'
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography level='title-md' mb={2}>
            How Managed Accounts Work
          </Typography>
          <Typography level='body-sm' mb={1}>
            • Managed accounts created by the primary user, these specific for
            user you want to have ability to delete and reset password.
          </Typography>
          <Typography level='body-sm' mb={1}>
            • Sub accounts can log in with their own username and password.
          </Typography>
          <Typography level='body-sm' mb={1}>
            • Managed accounts can complete tasks but have limited
            administrative permissions
          </Typography>
          <Typography level='body-sm'>
            • Managed accounts automatically added to your circle
          </Typography>
        </Box>
      </div>

      <CreateChildUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateChild}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={newPassword => {
          if (newPassword) {
            handleUpdatePassword(newPassword)
          }
          setPasswordModalOpen(false)
          setSelectedChildId(null)
        }}
      />

      <ConfirmationModal config={confirmModalConfig} />
    </SettingsLayout>
  )
}

export default ChildUserSettings
