import useMediaQuery from '@mui/material/useMediaQuery'
import { createElement } from 'react'
import AppModal from '../components/common/AppModal'

const MobileAppModal = props =>
  createElement(AppModal, { ...props, isMobile: true })
const DesktopAppModal = props =>
  createElement(AppModal, { ...props, isMobile: false })

/**
 * Backwards-compatible access to the app modal system.
 *
 * New code may render AppModal directly when it already knows the desired
 * presentation. Existing callers can continue using ResponsiveModal.
 */
export const useResponsiveModal = (breakpoint = 768) => {
  const isMobile = useMediaQuery(`(max-width:${breakpoint}px)`)

  return {
    ResponsiveModal: isMobile ? MobileAppModal : DesktopAppModal,
    isMobile,
  }
}
