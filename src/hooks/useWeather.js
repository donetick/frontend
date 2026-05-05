import { useQuery } from '@tanstack/react-query'

const OPEN_METEO_API = 'https://api.open-meteo.com/v1'

// Map WMO weather codes to icons and descriptions
const weatherCodeMap = {
  0: { icon: '☀️', desc: 'Clear' },
  1: { icon: '🌤️', desc: 'Mostly Clear' },
  2: { icon: '⛅', desc: 'Partly Cloudy' },
  3: { icon: '☁️', desc: 'Cloudy' },
  45: { icon: '🌫️', desc: 'Foggy' },
  48: { icon: '🌫️', desc: 'Foggy' },
  51: { icon: '🌦️', desc: 'Light Drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌧️', desc: 'Heavy Drizzle' },
  61: { icon: '🌧️', desc: 'Light Rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '⛈️', desc: 'Heavy Rain' },
  71: { icon: '❄️', desc: 'Light Snow' },
  73: { icon: '❄️', desc: 'Snow' },
  75: { icon: '❄️', desc: 'Heavy Snow' },
  77: { icon: '🌨️', desc: 'Snow Grains' },
  80: { icon: '🌧️', desc: 'Light Showers' },
  81: { icon: '🌧️', desc: 'Showers' },
  82: { icon: '⛈️', desc: 'Heavy Showers' },
  85: { icon: '🌨️', desc: 'Light Snow Showers' },
  86: { icon: '🌨️', desc: 'Snow Showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm with Hail' },
  99: { icon: '⛈️', desc: 'Thunderstorm with Hail' },
}

export const useWeather = (latitude, longitude, date) => {
  return useQuery({
    queryKey: ['weather', latitude, longitude, date?.toISOString()?.split('T')[0]],
    enabled: !!latitude && !!longitude && !!date,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    queryFn: async () => {
      const dateStr = date.toISOString().split('T')[0]

      const params = new URLSearchParams({
        latitude,
        longitude,
        start_date: dateStr,
        end_date: dateStr,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        temperature_unit: 'celsius',
        timezone: 'auto',
      })

      const response = await fetch(
        `${OPEN_METEO_API}/forecast?${params.toString()}`,
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()
      const dailyData = data.daily

      if (!dailyData || dailyData.weather_code[0] == null) {
        return null
      }

      const weatherCode = dailyData.weather_code[0]
      const weatherInfo = weatherCodeMap[weatherCode] || {
        icon: '🌡️',
        desc: 'Unknown',
      }
      const tempMax = dailyData.temperature_2m_max[0]
      const tempMin = dailyData.temperature_2m_min[0]

      return {
        icon: weatherInfo.icon,
        description: weatherInfo.desc,
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        code: weatherCode,
      }
    },
  })
}
