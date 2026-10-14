import {
  DeleteOutlineRounded,
  EditRounded,
  InfoOutlined,
  LockResetRounded,
  PeopleOutlineRounded,
  PersonAddRounded,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Sheet,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
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

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

const ChildUserSettings = () => {
  const { t } = useTranslation('settings')
  const { fmt } = useLocalization()
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()
  const { data: childUsers, isLoading, refetch } = useChildUsers()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [deletingChildId, setDeletingChildId] = useState(null)

  const isParentUser = userProfile?.userType === 0 && !userProfile?.parentUserId

  const openCreateModal = () => {
    if (!isPlusAccount(userProfile)) {
      showPaywall(PAYWALL_REASON.CHILD_ACCOUNTS)
      return
    }
    setCreateModalOpen(true)
  }

  const refreshChildren = async () => {
    await queryClient.invalidateQueries({ queryKey: ['childUsers'] })
    await refetch()
  }

  const handleCreateChild = async childData => {
    try {
      const response = await CreateChildUser(
        childData.childName,
        childData.displayName,
        childData.password,
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('subaccounts.createFailedGeneric'))
      }

      const result = await response.json()
      showNotification({
        type: 'success',
        message: t('subaccounts.createdSuccess', {
          name: result.res.displayName,
        }),
      })
      await refreshChildren()
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('subaccounts.createFailed', { error: error.message }),
      })
      throw error
    }
  }

  const handleUpdatePassword = async newPassword => {
    if (!selectedChildId || !newPassword) return
    try {
      const response = await UpdateChildPassword(selectedChildId, newPassword)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error || t('subaccounts.passwordUpdateFailedGeneric'),
        )
      }
      showNotification({
        type: 'success',
        message: t('subaccounts.passwordUpdated'),
      })
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('subaccounts.passwordUpdateFailed', {
          error: error.message,
        }),
      })
    }
  }

  const handleDeleteChild = (childId, childName) => {
    showConfirmation(
      t('subaccounts.deleteConfirmMessage', { name: childName }),
      t('subaccounts.deleteConfirmTitle'),
      async () => {
        setDeletingChildId(childId)
        try {
          const response = await DeleteChildUser(childId)
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || t('subaccounts.deleteFailedGeneric'))
          }
          showNotification({
            type: 'success',
            message: t('subaccounts.deleted', { name: childName }),
          })
          await refreshChildren()
        } catch (error) {
          showNotification({
            type: 'error',
            message: t('subaccounts.deleteFailed', { error: error.message }),
          })
        } finally {
          setDeletingChildId(null)
        }
      },
      t('common.delete'),
      t('common.cancel'),
      'danger',
    )
  }

  if (!isParentUser) {
    return (
      <SettingsLayout title={t('subaccounts.notParentTitle')}>
        <Sheet
          variant='soft'
          color='warning'
          sx={{
            alignItems: 'center',
            borderRadius: 'xl',
            display: 'flex',
            gap: 1.5,
            maxWidth: 600,
            p: 2,
          }}
        >
          <InfoOutlined />
          <Typography level='body-md'>
            {t('subaccounts.notParentMessage')}
          </Typography>
        </Sheet>
      </SettingsLayout>
    )
  }

  const children = childUsers || []
  const howItWorks = [
    t('subaccounts.howItWorks1'),
    t('subaccounts.howItWorks2'),
    t('subaccounts.howItWorks3'),
    t('subaccounts.howItWorks4'),
  ]

  return (
    <SettingsLayout title={t('subaccounts.title')}>
      <Box sx={{ maxWidth: 760, pb: 4 }}>
        <Box
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'space-between',
            mb: 3,
            mt: -1,
          }}
        >
          <Typography
            level='body-md'
            textColor='text.secondary'
            sx={{ maxWidth: 560, textWrap: 'pretty' }}
          >
            {t('subaccounts.description')}
          </Typography>
          <Button
            startDecorator={<PersonAddRounded />}
            onClick={openCreateModal}
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          >
            {t('subaccounts.add')}
          </Button>
        </Box>

        <Box component='section'>
          <Typography
            level='title-md'
            sx={{ fontWeight: 650, letterSpacing: '-0.01em', mb: 1.25 }}
          >
            {t('subaccounts.count', { count: children.length })}
          </Typography>

          {isLoading ? (
            <Sheet
              sx={{
                ...surfaceSx,
                display: 'grid',
                gap: 1,
                minHeight: 160,
                placeContent: 'center',
                textAlign: 'center',
              }}
            >
              <CircularProgress size='sm' sx={{ mx: 'auto' }} />
              <Typography level='body-sm' textColor='text.secondary'>
                {t('subaccounts.loading')}
              </Typography>
            </Sheet>
          ) : children.length === 0 ? (
            <Sheet
              variant='soft'
              sx={{
                borderRadius: 'xl',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 2,
                py: 4.5,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  bgcolor: 'primary.softBg',
                  borderRadius: '50%',
                  color: 'primary.plainColor',
                  display: 'grid',
                  height: 64,
                  mb: 2,
                  placeItems: 'center',
                  width: 64,
                }}
              >
                <PeopleOutlineRounded sx={{ fontSize: 30 }} />
              </Box>
              <Typography level='title-md' sx={{ mb: 0.5 }}>
                {t('subaccounts.emptyTitle')}
              </Typography>
              <Typography
                level='body-sm'
                textColor='text.secondary'
                sx={{ maxWidth: 420, mb: 2.25, textWrap: 'pretty' }}
              >
                {t('subaccounts.emptyDescription')}
              </Typography>
              <Button
                startDecorator={<PersonAddRounded />}
                onClick={openCreateModal}
              >
                {t('subaccounts.addFirst')}
              </Button>
            </Sheet>
          ) : (
            <Sheet sx={{ ...surfaceSx, overflow: 'hidden' }}>
              {children.map((child, index) => {
                const name = child.displayName || child.username
                return (
                  <Box key={child.id}>
                    {index > 0 && <Divider />}
                    <Box
                      sx={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 1.5,
                        p: { xs: 1.5, sm: 2 },
                      }}
                    >
                      <Avatar
                        size='lg'
                        sx={{
                          bgcolor: 'primary.softBg',
                          color: 'primary.softColor',
                          flex: '0 0 auto',
                          fontWeight: 650,
                        }}
                      >
                        {name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography level='title-sm' noWrap>
                          {name}
                        </Typography>
                        <Typography
                          level='body-sm'
                          textColor='text.secondary'
                          noWrap
                        >
                          {t('subaccounts.username', {
                            username: child.username,
                          })}
                        </Typography>
                        <Typography level='body-xs' textColor='text.tertiary'>
                          {t('subaccounts.created', {
                            date: fmt.date(child.createdAt),
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size='sm'
                          variant='plain'
                          color='neutral'
                          onClick={() => {
                            setSelectedChildId(child.id)
                            setPasswordModalOpen(true)
                          }}
                          aria-label={`${t('subaccounts.changePassword')}: ${name}`}
                        >
                          <EditRounded />
                        </IconButton>
                        <IconButton
                          size='sm'
                          variant='plain'
                          color='danger'
                          onClick={() => handleDeleteChild(child.id, name)}
                          loading={deletingChildId === child.id}
                          aria-label={`${t('subaccounts.deleteAccount')}: ${name}`}
                        >
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                )
              })}
            </Sheet>
          )}
        </Box>

        <Sheet
          component='section'
          variant='soft'
          sx={{ borderRadius: 'xl', mt: 3.5, p: { xs: 2, sm: 2.5 } }}
        >
          <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mb: 2 }}>
            <LockResetRounded color='primary' />
            <Typography level='title-md' sx={{ fontWeight: 650 }}>
              {t('subaccounts.howItWorksTitle')}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {howItWorks.map((item, index) => (
              <Box
                key={item}
                sx={{ alignItems: 'flex-start', display: 'flex', gap: 1.25 }}
              >
                <Chip
                  size='sm'
                  variant='solid'
                  color='neutral'
                  sx={{ flex: '0 0 auto', mt: 0.1 }}
                >
                  {index + 1}
                </Chip>
                <Typography level='body-sm' textColor='text.secondary'>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Sheet>
      </Box>

      <CreateChildUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateChild}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={newPassword => {
          if (newPassword) handleUpdatePassword(newPassword)
          setPasswordModalOpen(false)
          setSelectedChildId(null)
        }}
      />

      <ConfirmationModal config={confirmModalConfig} />
    </SettingsLayout>
  )
}

export default ChildUserSettings
