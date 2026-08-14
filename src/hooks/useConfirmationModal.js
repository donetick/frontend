import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const useConfirmationModal = () => {
  const { t } = useTranslation('common')
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('confirm'),
    cancelText = t('cancel'),
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
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }

  const hideConfirmation = () => {
    setConfirmModalConfig({})
  }

  return {
    confirmModalConfig,
    showConfirmation,
    hideConfirmation,
  }
}

export default useConfirmationModal