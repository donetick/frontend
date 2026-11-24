import PropTypes from 'prop-types'
import { Component, createRef } from 'react'

import { MOTION } from '../../constants/motion'

// Let the panel take its natural height immediately. Only animate the incoming
// content, avoiding outgoing DOM copies and per-frame height/layout updates.
class PanelTransition extends Component {
  root = createRef()
  content = createRef()
  stop = null

  componentDidUpdate(previous) {
    if (!this.props.active) this.stop?.()
    if (previous.panelKey === this.props.panelKey) return
    this.stop?.()
    const root = this.root.current
    const content = this.content.current
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (
      !this.props.active ||
      !previous.active ||
      !content?.animate ||
      preference.matches
    )
      return

    const rtl = getComputedStyle(root).direction === 'rtl'
    const direction = (this.props.backwards ? -1 : 1) * (rtl ? -1 : 1)
    const animation = content.animate(
      [
        { opacity: 0, transform: `translateX(${direction * 24}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: MOTION.modal, easing: MOTION.easeOut },
    )
    const onPreferenceChange = event => {
      if (event.matches) stop()
    }
    const stop = () => {
      animation.cancel()
      preference.removeEventListener('change', onPreferenceChange)
      if (this.stop === stop) this.stop = null
    }
    this.stop = stop
    preference.addEventListener('change', onPreferenceChange)
    animation.finished.then(stop, stop)
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
