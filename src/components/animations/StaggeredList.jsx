import './PageTransition.css'

import { Box } from '@mui/joy'
import React, { useEffect, useState } from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

const StaggeredList = ({
  animate = true,
  children,
  initialDelay = 0,
  staggerDelay = 50,
}) => {
  const [isVisible, setIsVisible] = useState(!animate)

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, initialDelay)

      return () => clearTimeout(timer)
    }
  }, [animate, initialDelay])

  if (!animate) {
    return <Box>{children}</Box>
  }

  const childrenArray = React.Children.toArray(children)

  return (
    <Box>
      <TransitionGroup component={null}>
        {isVisible &&
          childrenArray.map((child, index) => (
            <CSSTransition
              key={child.key || index}
              classNames='stagger'
              timeout={{
                enter: 300 + index * staggerDelay,
                exit: 200,
              }}
              style={{
                transitionDelay: `${index * staggerDelay}ms`,
              }}
            >
              <Box sx={{ mb: 1 }}>{child}</Box>
            </CSSTransition>
          ))}
      </TransitionGroup>
    </Box>
  )
}

export default StaggeredList
