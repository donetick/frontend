import BottomSheetModal from '../components/common/BottomSheetModal'
import FadeModal from '../components/common/FadeModal'
import useWindowWidth from './useWindowWidth'

/**
 * Hook that returns the appropriate modal component based on screen size
 * @param {number} breakpoint - Screen width breakpoint to switch between modals (default: 768px)
 * @returns {Object} - { Modal: Component, isMobile: boolean }
 */
export const useResponsiveModal = (breakpoint = 768) => {
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth <= breakpoint

  return {
    ResponsiveModal: isMobile ? BottomSheetModal : FadeModal,
    isMobile,
  }
}
