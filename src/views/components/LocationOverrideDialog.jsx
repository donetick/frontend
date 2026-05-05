import { Close } from '@mui/icons-material'
import { Button, FormControl, FormLabel, Input, Modal, ModalClose, Stack } from '@mui/joy'
import { useState } from 'react'

const LocationOverrideDialog = ({ open, onClose, onSetLocation }) => {
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use Open-Meteo Geocoding API (free, no API key needed)
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      )
      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        setError('City not found. Please try again.')
        return
      }

      const result = data.results[0]
      onSetLocation(result.latitude, result.longitude)
      setCity('')
      onClose()
    } catch (err) {
      setError('Failed to search location. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      aria-labelledby='location-modal'
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--joy-palette-background-surface)',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <ModalClose
          variant='outlined'
          sx={{
            top: '0.75rem',
            right: '0.75rem',
          }}
          onClick={onClose}
        />

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <div>
              <h2 id='location-modal' style={{ margin: '0 0 12px 0' }}>
                Override Location
              </h2>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.875rem',
                  color: 'var(--joy-palette-text-secondary)',
                }}
              >
                Enter a city name to update your weather location
              </p>
            </div>

            <FormControl>
              <FormLabel>City</FormLabel>
              <Input
                placeholder='e.g., London, Tokyo, New York'
                value={city}
                onChange={e => setCity(e.target.value)}
                disabled={loading}
              />
            </FormControl>

            {error && (
              <div
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  background: 'var(--joy-palette-danger-softBg)',
                  color: 'var(--joy-palette-danger-600)',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}

            <Stack direction='row' spacing={1}>
              <Button
                variant='outlined'
                color='neutral'
                onClick={onClose}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='solid'
                color='primary'
                disabled={!city.trim() || loading}
                loading={loading}
                sx={{ flex: 1 }}
              >
                Search
              </Button>
            </Stack>
          </Stack>
        </form>
      </div>
    </Modal>
  )
}

export default LocationOverrideDialog
