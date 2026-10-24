import {
  DarkModeOutlined,
  LaptopOutlined,
  LightModeOutlined,
} from '@mui/icons-material'
import {
  Button,
  FormControl,
  FormLabel,
  ToggleButtonGroup,
  useColorScheme,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import useStickyState from '@/hooks/useStickyState'

import ThemeSkinPicker from './ThemeSkinPicker'

const ELEMENTID = 'select-theme-mode'

const ThemeToggle = () => {
  const { t } = useTranslation('settings')
  const { mode, setMode } = useColorScheme()
  const [themeMode, setThemeMode] = useStickyState(mode, 'themeMode')

  const handleThemeModeChange = (_, newThemeMode) => {
    if (!newThemeMode) return
    setThemeMode(newThemeMode)
    setMode(newThemeMode)
  }

  return (
    <div className='grid gap-4'>
      <ThemeSkinPicker />
      <FormControl>
        <FormLabel
          level='title-md'
          id={`${ELEMENTID}-label`}
          htmlFor={ELEMENTID}
        >
          {t('theme.themeMode')}
        </FormLabel>
        <div className='flex items-center gap-4'>
          <ToggleButtonGroup
            id={ELEMENTID}
            variant='outlined'
            value={themeMode}
            onChange={handleThemeModeChange}
          >
            <Button startDecorator={<LightModeOutlined />} value='light'>
              {t('theme.light')}
            </Button>
            <Button startDecorator={<DarkModeOutlined />} value='dark'>
              {t('theme.dark')}
            </Button>
            <Button startDecorator={<LaptopOutlined />} value='system'>
              {t('theme.system')}
            </Button>
          </ToggleButtonGroup>
        </div>
      </FormControl>
    </div>
  )
}

export default ThemeToggle
