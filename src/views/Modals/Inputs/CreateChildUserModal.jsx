import { FormControl, FormHelperText, Input, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { useTranslation } from 'react-i18next'

function CreateChildUserModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation('settings')
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
        newErrors.childName = t('childUsers.errNameRequired')
      } else if (childName.length < 2) {
        newErrors.childName = t('childUsers.errNameMin')
      } else if (childName.length > 20) {
        newErrors.childName = t('childUsers.errNameMax')
      } else if (!/^[a-z.-]+$/.test(childName)) {
        newErrors.childName = t('childUsers.errNameChars')
      }
    }

    if (touched.password) {
      if (!password) {
        newErrors.password = t('childUsers.errPasswordRequired')
      } else if (password.length < 8) {
        newErrors.password = t('childUsers.errPasswordLength')
      } else if (password.length > 64) {
        newErrors.password = t('childUsers.errPasswordLength')
      }
    }

    if (touched.confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = t('childUsers.errPasswordMatch')
      }
    }

    if (touched.displayName && displayName.length > 50) {
      newErrors.displayName = t('childUsers.errDisplayNameMax')
    }

    setErrors(newErrors)
  }, [childName, displayName, password, confirmPassword, touched, t])

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
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      title={t('childUsers.createTitle')}
      description='Create a login that can complete tasks assigned to this account.'
      size='md'
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footer={
        <ModalActions
          secondary={{
            label: t('accountSettings.cancel'),
            onClick: handleClose,
            disabled: isSubmitting,
          }}
          primary={{
            label: t('childUsers.createButton'),
            onClick: handleSubmit,
            disabled: !isValid || isSubmitting,
            loading: isSubmitting,
          }}
        />
      }
    >
      <FormControl error={!!errors.childName} sx={{ mb: 2 }}>
        <Typography level='body2' mb={1}>
          {t('childUsers.nameLabel')}
        </Typography>
        <Input
          required
          fullWidth
          id='childName'
          name='childName'
          placeholder={t('childUsers.namePlaceholder')}
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
          {t('childUsers.displayNameLabel')}
        </Typography>
        <Input
          fullWidth
          id='displayName'
          name='displayName'
          placeholder={t('childUsers.displayNamePlaceholder')}
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
          {t('childUsers.passwordLabel')}
        </Typography>
        <Input
          required
          fullWidth
          name='password'
          type='password'
          id='password'
          placeholder={t('childUsers.passwordPlaceholder')}
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
          {t('childUsers.confirmPasswordLabel')}
        </Typography>
        <Input
          required
          fullWidth
          name='confirmPassword'
          type='password'
          id='confirmPassword'
          placeholder={t('childUsers.confirmPasswordPlaceholder')}
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
    </ResponsiveModal>
  )
}

export default CreateChildUserModal
