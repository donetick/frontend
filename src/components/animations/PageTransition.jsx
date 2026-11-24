import './PageTransition.css'

import PropTypes from 'prop-types'
import { Component, createRef } from 'react'
import { useLocation } from 'react-router-dom'

const motionQuery = '(prefers-reduced-motion: reduce)'
const easing = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Capture the outgoing DOM before React updates it. Unlike retaining a second
// routed tree, a visual snapshot cannot run effects or duplicate subscriptions.
class RouteReveal extends Component {
  wrapper = createRef()
  stop = null

  getSnapshotBeforeUpdate(previous) {
    if (previous.disabled !== this.props.disabled) this.stop?.()
    if (previous.pathname === this.props.pathname) return null
    this.stop?.()
    const node = this.wrapper.current
    if (
      previous.disabled ||
      this.props.disabled ||
      !node?.animate ||
      window.matchMedia(motionQuery).matches
    )
      return null

    const rect = node.getBoundingClientRect()
    const snapshot = node.cloneNode(true)
    // The copy is purely visual: no focus, accessibility, or duplicate IDs.
    snapshot.inert = true
    snapshot.setAttribute('aria-hidden', 'true')
    snapshot.removeAttribute('id')
    snapshot
      .querySelectorAll('[id]')
      .forEach(element => element.removeAttribute('id'))
    return { snapshot, rect }
  }

  componentDidUpdate(previous, previousState, captured) {
    // Reset before paint/entrance motion, even when animations are unavailable
    // or reduced. Retained split-pane navigation must keep its list position.
    if (
      previous.pathname !== this.props.pathname &&
      !previous.disabled &&
      !this.props.disabled
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    if (!captured) return
    const node = this.wrapper.current
    const { rect, snapshot } = captured
    const layer = document.createElement('div')
    layer.inert = true
    layer.setAttribute('aria-hidden', 'true')
    Object.assign(layer.style, {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${Math.max(0, Math.min(rect.height, window.innerHeight - rect.top))}px`,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '1',
    })
    layer.append(snapshot)
    document.body.append(layer)

    const outgoing = layer.animate(
      [
        {
          opacity: 1,
          transform: 'scale(1)',
          filter: 'blur(0px)',
          clipPath: 'inset(0 round 0px)',
        },
        {
          opacity: 0,
          transform: 'translateY(-6px) scale(0.975)',
          filter: 'blur(3px)',
          clipPath: 'inset(0 round 20px)',
        },
      ],
      { duration: 220, easing, fill: 'both' },
    )
    const incoming = node.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(10px) scale(0.985)',
          filter: 'blur(3px)',
          clipPath: 'inset(0 round 20px)',
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0px)',
          clipPath: 'inset(0 round 0px)',
        },
      ],
      { duration: 340, easing },
    )

    const preference = window.matchMedia(motionQuery)
    const stopForReducedMotion = event => {
      if (event.matches) this.stop?.()
    }
    preference.addEventListener('change', stopForReducedMotion)
    this.stop = () => {
      outgoing.cancel()
      incoming.cancel()
      layer.remove()
      preference.removeEventListener('change', stopForReducedMotion)
      this.stop = null
    }
    // Resolve cancellation as well as completion during rapid navigation.
    Promise.allSettled([outgoing.finished, incoming.finished]).then(() => {
      if (layer.isConnected) this.stop?.()
    })
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
