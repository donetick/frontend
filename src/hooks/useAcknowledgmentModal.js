import { useState } from 'react'

const useAcknowledgmentModal = () => {
  const [ackModalConfig, setAckModalConfig] = useState({})

  const showAcknowledgment = (
    message,
    title,
    onAcknowledge,
    acknowledgeText = 'Got it',
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