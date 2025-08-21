import { useState } from 'react'

const useConfirmationModal = () => {
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
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