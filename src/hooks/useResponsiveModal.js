import { createElement } from 'react'

import AppModal from '../components/common/AppModal'
import { maxWidthQuery, MOBILE_MAX_WIDTH } from '../constants/responsive'
import { useResponsiveQuery } from './useResponsiveQuery'

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
export const useResponsiveModal = (breakpoint = MOBILE_MAX_WIDTH) => {
  const isMobile = useResponsiveQuery(maxWidthQuery(breakpoint))

  return {
    ResponsiveModal: isMobile ? MobileAppModal : DesktopAppModal,
    isMobile,
  }
}
