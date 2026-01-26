import { useState, useCallback } from 'react'

export const useChoreModals = () => {
  const [activeModal, setActiveModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [modalChore, setModalChore] = useState(null)

  const openModal = useCallback((modal, chore, data = {}) => {
    setActiveModal(modal)
    setModalChore(chore)
    setModalData(data)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalChore(null)
    setModalData({})
  }, [])

  return {
    activeModal,
    modalChore,
    modalData,
    openModal,
    closeModal,
  }
}
