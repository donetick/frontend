import { useEffect, useState } from 'react'
const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState()

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup function to remove the event listener
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowWidth
}

export default useWindowWidth
