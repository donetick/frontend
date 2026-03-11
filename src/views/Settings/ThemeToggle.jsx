import useStickyState from '@/hooks/useStickyState'
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

  const FormThemeModeToggleLabel = () => (
    <FormLabel
      level='title-md'
      id={`${ELEMENTID}-label`}
      htmlFor='select-theme-mode'
    >
      {t('theme.themeMode')}
    </FormLabel>
  )

  return (
    <FormControl>
      <FormThemeModeToggleLabel />
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
  )
}

export default ThemeToggle
