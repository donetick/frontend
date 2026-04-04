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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['settings', 'common'])
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
          message: t('settings:childAccounts.createSuccess', {
            name: result.res.displayName,
          }),
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
        message: t('settings:childAccounts.createFailed', {
          message: error.message,
        }),
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
          message: t('settings:childAccounts.updatePasswordSuccess'),
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update password')
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('settings:childAccounts.updatePasswordFailed', {
          message: error.message,
        }),
      })
    }
  }

  const handleDeleteChild = async (childId, childName) => {
    showConfirmation(
      t('settings:childAccounts.deleteConfirmMessage', {
        name: childName,
      }),
      t('settings:childAccounts.deleteConfirmTitle'),
      async () => {
        setDeletingChildId(childId)
        try {
          const response = await DeleteChildUser(childId)

          if (response.ok) {
            showNotification({
              type: 'success',
              message: t('settings:childAccounts.deleteSuccess', {
                name: childName,
              }),
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
            message: t('settings:childAccounts.deleteFailed', {
              message: error.message,
            }),
          })
        } finally {
          setDeletingChildId(null)
        }
      },
      t('common:actions.delete'),
      t('common:actions.cancel'),
      'danger',
    )
  }

  if (!isParentUser) {
    return (
      <SettingsLayout title={t('settings:childAccounts.accessDeniedTitle')}>
        <Typography level='body-md' color='warning'>
          {t('settings:childAccounts.parentOnly')}
        </Typography>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title={t('settings:childAccounts.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('settings:childAccounts.description')}
        </Typography>
        {!isPlusAccount(userProfile) && (
          <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
            {t('settings:childAccounts.planWarning')}
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
            {t('settings:childAccounts.sectionTitle', {
              count: childUsers?.length || 0,
            })}
          </Typography>
          <Button
            startDecorator={<PersonAddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            {t('settings:childAccounts.add')}
          </Button>
        </Box>

        {isLoading ? (
          <Typography>{t('settings:childAccounts.loading')}</Typography>
        ) : childUsers?.length === 0 ? (
          <Card variant='soft' sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <Typography level='title-md' mb={1}>
                {t('settings:childAccounts.emptyTitle')}
              </Typography>
              <Typography level='body-sm' mb={3}>
                {t('settings:childAccounts.emptyDescription')}
              </Typography>
              <Button
                startDecorator={<PersonAddIcon />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('settings:childAccounts.addFirst')}
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
                        {t('settings:childAccounts.username', {
                          username: child.username,
                        })}
                      </Typography>
                      <Typography level='body-xs' color='neutral'>
                        {t('settings:childAccounts.created', {
                          date: new Date(child.createdAt).toLocaleDateString(),
                        })}
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
                        title={t('settings:childAccounts.changePasswordTitle')}
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
                        title={t('settings:childAccounts.deleteAccountTitle')}
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
            {t('settings:childAccounts.howItWorksTitle')}
          </Typography>
          <Typography level='body-sm' mb={1}>
            • {t('settings:childAccounts.bulletOne')}
          </Typography>
          <Typography level='body-sm' mb={1}>
            • {t('settings:childAccounts.bulletTwo')}
          </Typography>
          <Typography level='body-sm' mb={1}>
            • {t('settings:childAccounts.bulletThree')}
          </Typography>
          <Typography level='body-sm'>
            • {t('settings:childAccounts.bulletFour')}
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
