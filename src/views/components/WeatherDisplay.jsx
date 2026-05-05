import { Box, Tooltip, Typography } from '@mui/joy'
import { useWeather } from '../../hooks/useWeather'

const WeatherDisplay = ({ date, latitude, longitude, className }) => {
  const { data: weather, isLoading } = useWeather(latitude, longitude, date)

  if (isLoading || !weather) {
    return null
  }

  return (
    <Tooltip
      title={`${weather.description} • High: ${weather.tempMax}°C • Low: ${weather.tempMin}°C`}
      variant='soft'
      size='sm'
    >
      <Box
        className={className}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.25,
          minWidth: 28,
        }}
      >
        <Typography level='h3' sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
          {weather.icon}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {weather.tempMax}°
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default WeatherDisplay
