import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Input,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function CreateChildUserModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation(['settings', 'common', 'auth'])
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
        newErrors.childName = t('settings:childAccounts.validation.nameRequired')
      } else if (childName.length < 2) {
        newErrors.childName = t('settings:childAccounts.validation.nameMin')
      } else if (childName.length > 20) {
        newErrors.childName = t('settings:childAccounts.validation.nameMax')
      } else if (!/^[a-z.-]+$/.test(childName)) {
        newErrors.childName = t(
          'settings:childAccounts.validation.namePattern',
        )
      }
    }

    if (touched.password) {
      if (!password) {
        newErrors.password = t('auth:errors.passwordRequired')
      } else if (password.length < 8) {
        newErrors.password = t('auth:errors.passwordLength')
      } else if (password.length > 64) {
        newErrors.password = t('auth:errors.passwordLength')
      }
    }

    if (touched.confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = t(
          'settings:childAccounts.validation.passwordMismatch',
        )
      }
    }

    if (touched.displayName && displayName.length > 50) {
      newErrors.displayName = t(
        'settings:childAccounts.validation.displayNameMax',
      )
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
        {t('settings:childAccounts.modal.title')}
      </Typography>

      <Typography level='body-md' mb={3}>
        {t('settings:childAccounts.modal.description')}
      </Typography>

      <FormControl error={!!errors.childName} sx={{ mb: 2 }}>
        <Typography level='body2' mb={1}>
          {t('settings:childAccounts.modal.nameLabel')} *
        </Typography>
        <Input
          required
          fullWidth
          id='childName'
          name='childName'
          placeholder={t('settings:childAccounts.modal.namePlaceholder')}
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
          {t('common:labels.displayName')}
        </Typography>
        <Input
          fullWidth
          id='displayName'
          name='displayName'
          placeholder={t('settings:childAccounts.modal.displayNamePlaceholder')}
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
          {t('common:labels.password')} *
        </Typography>
        <Input
          required
          fullWidth
          name='password'
          type='password'
          id='password'
          placeholder={t('auth:placeholders.passwordRange')}
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
          {t('settings:childAccounts.modal.confirmPasswordLabel')} *
        </Typography>
        <Input
          required
          fullWidth
          name='confirmPassword'
          type='password'
          id='confirmPassword'
          placeholder={t('settings:childAccounts.modal.confirmPasswordPlaceholder')}
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
          {t('common:actions.cancel')}
        </Button>
        <Button
          size='lg'
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
          sx={{ flex: 1 }}
        >
          {t('settings:childAccounts.modal.createAction')}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}

export default CreateChildUserModal
