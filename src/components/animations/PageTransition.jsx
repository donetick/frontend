import './PageTransition.css'

import PropTypes from 'prop-types'
import { Component, createRef } from 'react'
import { useLocation } from 'react-router-dom'

const motionQuery = '(prefers-reduced-motion: reduce)'
const easing = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Animate only the destination. Cloning a long outgoing list and blurring both
// pages adds synchronous DOM work and rendering cost right during navigation.
class RouteReveal extends Component {
  wrapper = createRef()
  stop = null

  componentDidUpdate(previous) {
    if (previous.disabled !== this.props.disabled) this.stop?.()
    if (previous.pathname === this.props.pathname) return
    this.stop?.()
    // Retained split-pane navigation must keep its list position.
    if (previous.disabled || this.props.disabled) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const node = this.wrapper.current
    const preference = window.matchMedia(motionQuery)
    if (!node?.animate || preference.matches) return

    const incoming = node.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 200, easing },
    )
    const stopForReducedMotion = event => {
      if (event.matches) stop()
    }
    const stop = () => {
      incoming.cancel()
      preference.removeEventListener('change', stopForReducedMotion)
      if (this.stop === stop) this.stop = null
    }
    preference.addEventListener('change', stopForReducedMotion)
    this.stop = stop
    // Each completion owns its cleanup, including during rapid navigation.
    incoming.finished.then(stop, stop)
  }

  componentWillUnmount() {
    this.stop?.()
  }

  render() {
    return (
      <div
        ref={this.wrapper}
        className='page-wrapper'
        style={{ paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }}
      >
        {this.props.children}
      </div>
    )
  }
}

RouteReveal.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  pathname: PropTypes.string.isRequired,
}

const PageTransition = ({ children, disabled = false }) => {
  const { pathname } = useLocation()
  return (
    <RouteReveal pathname={pathname} disabled={disabled}>
      {children}
    </RouteReveal>
  )
}

PageTransition.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
}

export default PageTransition
