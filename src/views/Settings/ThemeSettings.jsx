import { Typography } from '@mui/joy'
import SettingsLayout from './SettingsLayout'
import ThemeToggle from './ThemeToggle'

const ThemeSettings = () => {
  return (
    <SettingsLayout title="Theme Preferences">
      <div className='grid gap-4'>
        <Typography level='body-md'>
          Choose how the site looks to you. Select a single theme, or sync with
          your system and automatically switch between day and night themes.
        </Typography>
        <ThemeToggle />
      </div>
    </SettingsLayout>
  )
}

export default ThemeSettings