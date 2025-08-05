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
import { useNavigate } from 'react-router-dom'
import FadeModal from '../../../components/common/FadeModal'
import { CheckUserDeletion, DeleteUser } from '../../../utils/Fetcher'

function UserDeletionModal({ isOpen, onClose, userProfile }) {
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
      setError('Please enter your password to continue')
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
        setError(data.error || 'Failed to check deletion requirements')
      }
    } catch (err) {
      setError(data.error || 'Failed to check deletion requirements')
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
      setError('Please enter your password and type DELETE to confirm')
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
        setError(data.message || 'Failed to delete account')
      }
    } catch (err) {
      setError('Failed to delete account')
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
        Delete Account
      </Typography>

      <Typography level='body-md' mb={2}>
        <strong>This action cannot be undone.</strong> Deleting your account
        will permanently remove:
      </Typography>

      <Box mb={3}>
        <Typography level='body-sm' mb={1}>
          • Your user profile and authentication data
        </Typography>
        <Typography level='body-sm' mb={1}>
          • All your chores, chore history, and time tracking sessions
        </Typography>
        <Typography level='body-sm' mb={1}>
          • API tokens, MFA sessions, and password reset tokens
        </Typography>
        <Typography level='body-sm' mb={1}>
          • Storage files and usage data
        </Typography>
        <Typography level='body-sm' mb={1}>
          • Points history and notifications
        </Typography>
        <Typography level='body-sm' mb={1}>
          • Circle memberships and relationships
        </Typography>
      </Box>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Enter your password to continue</FormLabel>
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder='Enter your password'
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' mt={3} gap={2}>
        <Button variant='outlined' onClick={() => handleClose(false)} fullWidth>
          Cancel
        </Button>
        <Button
          color='danger'
          onClick={checkDeletionRequirements}
          loading={loading}
          disabled={!password}
          fullWidth
        >
          Continue
        </Button>
      </Box>
    </>
  )

  const renderTransferStep = () => (
    <>
      <Typography level='h4' mb={2} color='warning'>
        Circle Ownership Transfer Required
      </Typography>

      <Typography level='body-md' mb={3}>
        You own circles that require ownership transfer before deletion. Please
        select new owners:
      </Typography>

      {circlesRequiringTransfer.map(circle => (
        <Card key={circle.id} sx={{ mb: 2, p: 2 }}>
          <Typography level='title-sm' mb={1}>
            Circle: {circle.name}
          </Typography>
          <FormControl>
            <FormLabel>New Owner</FormLabel>
            <Select
              placeholder='Select new owner'
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
          Cancel
        </Button>
        <Button
          color='primary'
          onClick={proceedToConfirmation}
          disabled={circlesRequiringTransfer.length !== transferOptions.length}
          fullWidth
        >
          Continue
        </Button>
      </Box>
    </>
  )

  const renderConfirmationStep = () => (
    <>
      <Typography level='h4' mb={2} color='danger'>
        Final Confirmation
      </Typography>

      <Typography level='body-md' mb={3}>
        Please enter your password and type <strong>DELETE</strong> to confirm
        account deletion.
      </Typography>
      <Typography level='body-sm' mb={2}>
        on successful deletion, you will be logged out and redirected to the
        login page.
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Password</FormLabel>
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder='Enter your password'
        />
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <FormLabel>Type "DELETE" to confirm</FormLabel>
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
          Cancel
        </Button>
        <Button
          color='danger'
          onClick={executeUserDeletion}
          loading={loading}
          disabled={!password || confirmation !== 'DELETE'}
          fullWidth
        >
          Delete Account
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
    <FadeModal
      open={isOpen}
      onClose={() => handleClose(false)}
      size='md'
      unmountDelay={250}
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
    </FadeModal>
  )
}

export default UserDeletionModal
