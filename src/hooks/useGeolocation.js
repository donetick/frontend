import { useEffect, useState } from 'react'

const GEOLOCATION_KEY = 'userGeolocation'
const GEOLOCATION_MANUAL_KEY = 'userGeolocationManual'

export const useGeolocation = () => {
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isManualOverride, setIsManualOverride] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(GEOLOCATION_KEY)
    const isManual = localStorage.getItem(GEOLOCATION_MANUAL_KEY) === 'true'

    if (stored) {
      try {
        setCoords(JSON.parse(stored))
        setIsManualOverride(isManual)
        setLoading(false)
        return
      } catch (e) {
        console.error('Failed to parse stored geolocation:', e)
      }
    }

    // Auto-detect geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords
          const newCoords = { latitude, longitude }
          setCoords(newCoords)
          localStorage.setItem(GEOLOCATION_KEY, JSON.stringify(newCoords))
          localStorage.setItem(GEOLOCATION_MANUAL_KEY, 'false')
          setLoading(false)
        },
        err => {
          console.warn('Geolocation error:', err)
          setError(err.message)
          // Use default (New York) if geolocation fails
          const defaultCoords = { latitude: 40.7128, longitude: -74.006 }
          setCoords(defaultCoords)
          localStorage.setItem(GEOLOCATION_KEY, JSON.stringify(defaultCoords))
          setLoading(false)
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
        },
      )
    } else {
      setError('Geolocation not supported')
      const defaultCoords = { latitude: 40.7128, longitude: -74.006 }
      setCoords(defaultCoords)
      setLoading(false)
    }
  }, [])

  const setManualLocation = (latitude, longitude) => {
    const newCoords = { latitude, longitude }
    setCoords(newCoords)
    setIsManualOverride(true)
    localStorage.setItem(GEOLOCATION_KEY, JSON.stringify(newCoords))
    localStorage.setItem(GEOLOCATION_MANUAL_KEY, 'true')
  }

  return {
    coords,
    loading,
    error,
    isManualOverride,
    setManualLocation,
  }
}
