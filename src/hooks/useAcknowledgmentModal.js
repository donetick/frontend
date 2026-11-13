import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const useAcknowledgmentModal = () => {
  const { t } = useTranslation('common')
  const [ackModalConfig, setAckModalConfig] = useState({})

  const showAcknowledgment = (
    message,
    title,
    onAcknowledge,
    acknowledgeText = t('joinCircle.gotIt'),
    color = 'primary',
  ) => {
    setAckModalConfig({
      isOpen: true,
      message,
      title,
      acknowledgeText,
      color,
      onClose: () => {
        if (onAcknowledge) {
          onAcknowledge()
        }
        setAckModalConfig({})
      },
    })
  }

  const hideAcknowledgment = () => {
    setAckModalConfig({})
  }

  return {
    ackModalConfig,
    showAcknowledgment,
    hideAcknowledgment,
  }
}

export default useAcknowledgmentModal
