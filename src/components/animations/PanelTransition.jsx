import PropTypes from 'prop-types'
import { Component, createRef } from 'react'

import { MOTION } from '../../constants/motion'

// Animate in-place navigation without mounting a second interactive React tree.
// The outgoing copy is visual only; the new panel remains usable immediately.
class PanelTransition extends Component {
  root = createRef()
  content = createRef()
  stop = null

  getSnapshotBeforeUpdate(previous) {
    if (previous.panelKey === this.props.panelKey) return null
    this.stop?.()
    const root = this.root.current
    const content = this.content.current
    if (
      !this.props.active ||
      !previous.active ||
      !root?.animate ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return null

    const snapshot = content.cloneNode(true)
    snapshot.inert = true
    snapshot.setAttribute('aria-hidden', 'true')
    snapshot.removeAttribute('id')
    snapshot
      .querySelectorAll('[id]')
      .forEach(node => node.removeAttribute('id'))
    return { snapshot, height: root.getBoundingClientRect().height }
  }

  componentDidUpdate(previous, previousState, captured) {
    if (!this.props.active) this.stop?.()
    if (!captured) return
    const root = this.root.current
    const content = this.content.current
    const { height, snapshot } = captured
    const rtl = getComputedStyle(root).direction === 'rtl'
    const direction = (this.props.backwards ? -1 : 1) * (rtl ? -1 : 1)
    Object.assign(snapshot.style, {
      position: 'absolute',
      inset: '0 0 auto',
      pointerEvents: 'none',
    })
    root.append(snapshot)
    const options = { duration: MOTION.modal, easing: MOTION.easeOut }
    const animations = [
      root.animate(
        [{ height: `${height}px` }, { height: `${content.offsetHeight}px` }],
        options,
      ),
      snapshot.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: `translateX(${-direction * 20}px)` },
        ],
        { ...options, fill: 'forwards' },
      ),
      content.animate(
        [
          { opacity: 0, transform: `translateX(${direction * 24}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        options,
      ),
    ]
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onPreferenceChange = event => {
      if (event.matches) stop()
    }
    const stop = () => {
      animations.forEach(animation => animation.cancel())
      snapshot.remove()
      preference.removeEventListener('change', onPreferenceChange)
      if (this.stop === stop) this.stop = null
    }
    this.stop = stop
    preference.addEventListener('change', onPreferenceChange)
    Promise.allSettled(animations.map(animation => animation.finished)).then(
      stop,
    )
  }

  componentWillUnmount() {
    this.stop?.()
  }

  render() {
    return (
      <div ref={this.root} style={{ position: 'relative', overflow: 'hidden' }}>
        <div key={this.props.panelKey} ref={this.content}>
          {this.props.children}
        </div>
      </div>
    )
  }
}

PanelTransition.propTypes = {
  active: PropTypes.bool,
  backwards: PropTypes.bool,
  children: PropTypes.node,
  panelKey: PropTypes.string.isRequired,
}

export default PanelTransition
