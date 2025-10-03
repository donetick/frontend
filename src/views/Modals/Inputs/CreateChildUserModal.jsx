import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Input,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function CreateChildUserModal({ isOpen, onClose, onSuccess }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [childName, setChildName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const newErrors = {}

    if (touched.childName) {
      if (!childName.trim()) {
        newErrors.childName = 'Sub account name is required'
      } else if (childName.length < 2) {
        newErrors.childName = 'Sub account name must be at least 2 characters'
      } else if (childName.length > 20) {
        newErrors.childName = 'Sub account name must be less than 20 characters'
      } else if (!/^[a-z.-]+$/.test(childName)) {
        newErrors.childName =
          'Sub account name can only contain lowercase letters, dot and dash'
      }
    }

    if (touched.password) {
      if (!password) {
        newErrors.password = 'Password is required'
      } else if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      } else if (password.length > 45) {
        newErrors.password = 'Password must be less than 45 characters'
      }
    }

    if (touched.confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    if (touched.displayName && displayName.length > 50) {
      newErrors.displayName = 'Display name must be less than 50 characters'
    }

    setErrors(newErrors)
  }, [childName, displayName, password, confirmPassword, touched])

  const handleSubmit = async () => {
    setTouched({
      childName: true,
      password: true,
      confirmPassword: true,
      displayName: true,
    })

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSuccess({
        childName: childName.trim(),
        displayName: displayName.trim() || childName.trim(),
        password,
      })
      handleClose()
    } catch (error) {
      console.error('Failed to create child user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setChildName('')
    setDisplayName('')
    setPassword('')
    setConfirmPassword('')
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    onClose()
  }

  const isValid =
    Object.keys(errors).length === 0 &&
    childName.trim() &&
    password &&
    password === confirmPassword

  return (
    <ResponsiveModal open={isOpen} onClose={handleClose}>
      <Typography level='h4' mb={2}>
        Create Sub Account
      </Typography>

      <Typography level='body-md' mb={3}>
        Create a new sub account. The user will be able to log in using their
        combined username and complete tasks assigned to them.
      </Typography>

      <FormControl error={!!errors.childName} sx={{ mb: 2 }}>
        <Typography level='body2' mb={1}>
          Sub Account Name *
        </Typography>
        <Input
          required
          fullWidth
          id='childName'
          name='childName'
          placeholder='Enter sub account name (e.g., sarah)'
          value={childName}
          onChange={e => {
            setChildName(e.target.value)
            setTouched(prev => ({ ...prev, childName: true }))
          }}
        />
        {errors.childName && (
          <FormHelperText>{errors.childName}</FormHelperText>
        )}
      </FormControl>

      <FormControl error={!!errors.displayName} sx={{ mb: 2 }}>
        <Typography level='body2' mb={1}>
          Display Name
        </Typography>
        <Input
          fullWidth
          id='displayName'
          name='displayName'
          placeholder='Display name (optional, defaults to sub account name)'
          value={displayName}
          onChange={e => {
            setDisplayName(e.target.value)
            setTouched(prev => ({ ...prev, displayName: true }))
          }}
        />
        {errors.displayName && (
          <FormHelperText>{errors.displayName}</FormHelperText>
        )}
      </FormControl>

      <FormControl error={!!errors.password} sx={{ mb: 2 }}>
        <Typography level='body2' mb={1}>
          Password *
        </Typography>
        <Input
          required
          fullWidth
          name='password'
          type='password'
          id='password'
          placeholder='Enter password (8-45 characters)'
          value={password}
          onChange={e => {
            setPassword(e.target.value)
            setTouched(prev => ({ ...prev, password: true }))
          }}
        />
        {errors.password && <FormHelperText>{errors.password}</FormHelperText>}
      </FormControl>

      <FormControl error={!!errors.confirmPassword} sx={{ mb: 3 }}>
        <Typography level='body2' mb={1}>
          Confirm Password *
        </Typography>
        <Input
          required
          fullWidth
          name='confirmPassword'
          type='password'
          id='confirmPassword'
          placeholder='Confirm password'
          value={confirmPassword}
          onChange={e => {
            setConfirmPassword(e.target.value)
            setTouched(prev => ({ ...prev, confirmPassword: true }))
          }}
        />
        {errors.confirmPassword && (
          <FormHelperText>{errors.confirmPassword}</FormHelperText>
        )}
      </FormControl>

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button
          size='lg'
          variant='outlined'
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{ flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          size='lg'
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
          sx={{ flex: 1 }}
        >
          Create Account
        </Button>
      </Box>
    </ResponsiveModal>
  )
}

export default CreateChildUserModal
