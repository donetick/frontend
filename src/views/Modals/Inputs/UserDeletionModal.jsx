import {
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { data } from 'autoprefixer'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { CheckUserDeletion, DeleteUser } from '../../../utils/Fetcher'

function UserDeletionModal({ isOpen, onClose, userProfile }) {
  const { t } = useTranslation(['settings', 'common'])
  const { ResponsiveModal } = useResponsiveModal()
  const Navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Warning, 2: Transfer, 3: Confirm
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [transferOptions, setTransferOptions] = useState([])
  const [circlesRequiringTransfer, setCirclesRequiringTransfer] = useState([])
  const [availableMembers, setAvailableMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resetModal = useCallback(() => {
    setStep(1)
    setPassword('')
    setConfirmation('')
    setTransferOptions([])
    setCirclesRequiringTransfer([])
    setAvailableMembers([])
    setError('')
  }, [])

  const handleClose = useCallback(
    success => {
      resetModal()
      onClose(success)
    },
    [onClose, resetModal],
  )

  const checkDeletionRequirements = async () => {
    if (password.trim() === '') {
      setError(t('settings:modals.userDeletion.passwordPrompt'))
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await CheckUserDeletion(password)
      const data = await response.json()

      if (response.ok) {
        if (data.requiresTransfer && data.circles) {
          setCirclesRequiringTransfer(data.circles)
          setAvailableMembers(data.availableMembers || [])
          setStep(2)
        } else {
          setStep(3)
        }
      } else {
        setError(data.error || t('settings:modals.userDeletion.checkFailed'))
      }
    } catch (err) {
      setError(t('settings:modals.userDeletion.checkFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleTransferSelection = (circleId, newOwnerId, newOwnerName) => {
    setTransferOptions(prev => {
      const existing = prev.find(t => t.circleId === circleId)
      if (existing) {
        return prev.map(t =>
          t.circleId === circleId ? { ...t, newOwnerId, newOwnerName } : t,
        )
      } else {
        return [...prev, { circleId, newOwnerId, newOwnerName }]
      }
    })
  }

  const proceedToConfirmation = () => {
    if (circlesRequiringTransfer.length === transferOptions.length) {
      setStep(3)
    }
  }

  const executeUserDeletion = async () => {
    if (password.trim() === '' || confirmation !== 'DELETE') {
      setError(t('settings:modals.userDeletion.confirmDelete'))
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await DeleteUser(password, confirmation, transferOptions)
      const data = await response.json()
      console.log(response)

      if (response.status === 200) {
        // Clear authentication tokens
        localStorage.removeItem('ca_token')
        localStorage.removeItem('ca_expiration')
        Navigate('/login', { replace: true })
        handleClose(true)
        // Redirect to login or home page after successful deletion
      } else {
        setError(data.message || t('settings:modals.userDeletion.deleteFailed'))
      }
    } catch (err) {
      setError(t('settings:modals.userDeletion.deleteFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = event => {
      if (!isOpen) return

      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose(false)
        return
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  const renderWarningStep = () => (
    <>
      <Typography level='h4' mb={2} color='danger'>
        {t('settings:modals.userDeletion.warningTitle')}
      </Typography>

      <Typography level='body-md' mb={2}>
        <strong>{t('settings:modals.userDeletion.warningIntro')}</strong>
      </Typography>

      <Box mb={3}>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.profile')}
        </Typography>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.chores')}
        </Typography>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.tokens')}
        </Typography>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.storage')}
        </Typography>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.points')}
        </Typography>
        <Typography level='body-sm' mb={1}>
          • {t('settings:modals.userDeletion.items.circles')}
        </Typography>
      </Box>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>{t('settings:modals.userDeletion.passwordPrompt')}</FormLabel>
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('auth:placeholders.passwordRange')}
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' mt={3} gap={2}>
        <Button variant='outlined' onClick={() => handleClose(false)} fullWidth>
          {t('common:actions.cancel')}
        </Button>
        <Button
          color='danger'
          onClick={checkDeletionRequirements}
          loading={loading}
          disabled={!password}
          fullWidth
        >
          {t('common:actions.continue')}
        </Button>
      </Box>
    </>
  )

  const renderTransferStep = () => (
    <>
      <Typography level='h4' mb={2} color='warning'>
        {t('settings:modals.userDeletion.transferTitle')}
      </Typography>

      <Typography level='body-md' mb={3}>
        {t('settings:modals.userDeletion.transferIntro')}
      </Typography>

      {circlesRequiringTransfer.map(circle => (
        <Card key={circle.id} sx={{ mb: 2, p: 2 }}>
          <Typography level='title-sm' mb={1}>
            {t('settings:modals.userDeletion.circleLabel', { name: circle.name })}
          </Typography>
          <FormControl>
            <FormLabel>{t('settings:circlePage.newOwner')}</FormLabel>
            <Select
              placeholder={t('settings:circlePage.newOwner')}
              value={
                transferOptions.find(t => t.circleId === circle.id)
                  ?.newOwnerId || ''
              }
              onChange={(_, value) => {
                const member = availableMembers.find(m => m.id === value)
                if (member) {
                  handleTransferSelection(circle.id, value, member.displayName)
                }
              }}
            >
              {availableMembers
                .filter(member => circle.members.includes(member.id))
                .map(member => (
                  <Option key={member.id} value={member.id}>
                    {member.displayName}
                  </Option>
                ))}
            </Select>
          </FormControl>
        </Card>
      ))}

      <Box display='flex' justifyContent='space-between' mt={3} gap={2}>
        <Button variant='outlined' onClick={() => handleClose(false)} fullWidth>
          {t('common:actions.cancel')}
        </Button>
        <Button
          color='primary'
          onClick={proceedToConfirmation}
          disabled={circlesRequiringTransfer.length !== transferOptions.length}
          fullWidth
        >
          {t('common:actions.continue')}
        </Button>
      </Box>
    </>
  )

  const renderConfirmationStep = () => (
    <>
      <Typography level='h4' mb={2} color='danger'>
        {t('settings:modals.userDeletion.finalTitle')}
      </Typography>

      <Typography level='body-md' mb={3}>
        {t('settings:modals.userDeletion.finalPrompt')}
      </Typography>
      <Typography level='body-sm' mb={2}>
        {t('settings:modals.userDeletion.finalHint')}
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>{t('common:labels.password')}</FormLabel>
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('auth:placeholders.passwordRange')}
        />
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <FormLabel>{t('settings:modals.userDeletion.typeDelete')}</FormLabel>
        <Input
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
          placeholder='DELETE'
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button variant='outlined' onClick={() => handleClose(false)} fullWidth>
          {t('common:actions.cancel')}
        </Button>
        <Button
          color='danger'
          onClick={executeUserDeletion}
          loading={loading}
          disabled={!password || confirmation !== 'DELETE'}
          fullWidth
        >
          {t('settings:account.deleteAccount')}
        </Button>
      </Box>
    </>
  )

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderWarningStep()
      case 2:
        return renderTransferStep()
      case 3:
        return renderConfirmationStep()
      default:
        return renderWarningStep()
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={() => handleClose(false)}
      size='lg'
      fullWidth={true}
      title={t('settings:modals.userDeletion.title')}
    >
      {loading && step === 1 ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      ) : (
        renderStep()
      )}
    </ResponsiveModal>
  )
}

export default UserDeletionModal
