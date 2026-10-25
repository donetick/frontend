import {
  Archive,
  Checklist,
  FilterAlt,
  FolderOpen,
  History,
  ListAlt,
  MoreHoriz,
  SearchRounded,
  SettingsOutlined,
  SpaceDashboard,
  Toll,
  Widgets,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Radio,
  RadioGroup,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BOTTOM_NAV_ITEM_POOL,
  DEFAULT_BOTTOM_NAV_CONFIG,
  getBottomNavConfig,
  getBottomNavHideLabels,
  MAX_BOTTOM_NAV_ITEMS,
  saveBottomNavConfig,
  saveBottomNavHideLabels,
} from '../../utils/BottomNavConfig'
import {
  DEFAULT_VIEW_OPTIONS,
  getDefaultView,
  saveDefaultView,
} from '../../utils/DefaultViewConfig'
import {
  setSinglePageTaskEditor,
  useSinglePageTaskEditor,
} from '../../utils/TaskEditorPreferences'
import { isMobileBottomNavEligible } from '../components/MobileBottomNav'
import SettingsLayout from './SettingsLayout'
import SettingsReorderList from './SettingsReorderList'
import SettingsSection from './SettingsSection'
import SidepanelSettings from './SidepanelSettings'

const ICONS = {
  SpaceDashboard: <SpaceDashboard />,
  Checklist: <Checklist />,
  SearchRounded: <SearchRounded />,
  Archive: <Archive />,
  Widgets: <Widgets />,
  ListAlt: <ListAlt />,
  FolderOpen: <FolderOpen />,
  FilterAlt: <FilterAlt />,
  History: <History />,
  Toll: <Toll />,
  SettingsOutlined: <SettingsOutlined />,
}

const LayoutSettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const singlePageTaskEditor = useSinglePageTaskEditor()
  const isMobile = useMediaQuery('(max-width:768px)')
  const bottomNavEligible = isMobileBottomNavEligible(isMobile)
  const hasSidepanel = useMediaQuery(theme => theme.breakpoints.up('lg'))
  const [defaultView, setDefaultView] = useState(getDefaultView)
  const [config, setConfig] = useState(() =>
    [...getBottomNavConfig()].sort((a, b) => a.order - b.order),
  )
  const [hideLabels, setHideLabels] = useState(getBottomNavHideLabels)
  const enabledCount = config.filter(item => item.enabled).length
  const labelFor = item =>
    t(`common:${item.translationKey}`, {
      defaultValue: item.translationDefault,
    })

  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveBottomNavConfig(newConfig)
  }
  const handleToggleEnabled = (id, enabled) => {
    if (enabled && enabledCount >= MAX_BOTTOM_NAV_ITEMS) return
    saveConfig(
      config.map(item => (item.id === id ? { ...item, enabled } : item)),
    )
  }
  const navItems = config.flatMap(item => {
    const poolItem = BOTTOM_NAV_ITEM_POOL.find(entry => entry.id === item.id)
    return poolItem
      ? [
          {
            ...item,
            label: labelFor(poolItem),
            icon: ICONS[poolItem.iconName],
            disabled: !item.enabled && enabledCount >= MAX_BOTTOM_NAV_ITEMS,
          },
        ]
      : []
  })

  return (
    <SettingsLayout title={t('layout.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('layout.detailedDescription')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <SettingsSection
            title={t('layout.defaultView.title')}
            description={t('layout.defaultView.description')}
          >
            <RadioGroup
              aria-label={t('layout.defaultView.title')}
              name='default-view'
              value={defaultView}
              onChange={event => {
                setDefaultView(event.target.value)
                saveDefaultView(event.target.value)
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              {DEFAULT_VIEW_OPTIONS.map(option => (
                <Sheet
                  key={option}
                  sx={{
                    position: 'relative',
                    border: '1px solid',
                    borderColor:
                      defaultView === option
                        ? 'primary.outlinedColor'
                        : 'divider',
                    bgcolor:
                      defaultView === option
                        ? 'primary.softBg'
                        : 'background.surface',
                    borderRadius: 'lg',
                    p: 2,
                    '&:focus-within': {
                      outline: '2px solid',
                      outlineColor: 'focusVisible',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    aria-hidden='true'
                    sx={{
                      color:
                        defaultView === option
                          ? 'primary.plainColor'
                          : 'text.tertiary',
                      mb: 1.5,
                    }}
                  >
                    {option === 'home' ? <SpaceDashboard /> : <Checklist />}
                  </Box>
                  <Radio
                    overlay
                    value={option}
                    label={t(`layout.defaultView.options.${option}.name`)}
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    sx={{ mt: 0.75 }}
                  >
                    {t(`layout.defaultView.options.${option}.description`)}
                  </Typography>
                </Sheet>
              ))}
            </RadioGroup>
          </SettingsSection>

          <SettingsSection
            title={t('layout.taskEditor.title')}
            description={t('layout.taskEditor.description')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level='title-sm' id='single-page-editor-label'>
                  {t('layout.taskEditor.singlePage')}
                </Typography>
                <Typography
                  level='body-sm'
                  textColor='text.secondary'
                  id='single-page-editor-description'
                  sx={{ mt: 0.5 }}
                >
                  {t('layout.taskEditor.helper')}
                </Typography>
              </Box>
              <Switch
                checked={singlePageTaskEditor}
                onChange={event =>
                  setSinglePageTaskEditor(event.target.checked)
                }
                color={singlePageTaskEditor ? 'primary' : 'neutral'}
                slotProps={{
                  input: {
                    'aria-labelledby': 'single-page-editor-label',
                    'aria-describedby': 'single-page-editor-description',
                  },
                }}
                sx={{ flexShrink: 0 }}
              />
            </Box>
          </SettingsSection>

          {bottomNavEligible && (
            <SettingsSection
              title={t('layout.bottomNav.title')}
              description={t('layout.bottomNav.description', {
                max: MAX_BOTTOM_NAV_ITEMS,
              })}
            >
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  level='body-xs'
                  textColor='text.tertiary'
                  sx={{ mb: 1 }}
                >
                  {t('layout.preview')}
                </Typography>
                <Sheet
                  aria-hidden='true'
                  sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 'lg',
                    bgcolor: 'background.level1',
                  }}
                >
                  {[
                    ...navItems.filter(item => item.enabled),
                    {
                      id: 'more',
                      label: t('common:navigation.more'),
                      icon: <MoreHoriz />,
                    },
                  ].map(item => (
                    <Box
                      key={item.id}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.75,
                        color: 'text.secondary',
                      }}
                    >
                      {item.icon}
                      {!hideLabels && (
                        <Typography
                          level='body-xs'
                          sx={{
                            width: '100%',
                            textAlign: 'center',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.label}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Sheet>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2.5,
                  pb: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='title-sm' id='hide-nav-labels'>
                    {t('layout.bottomNav.hideLabels.title')}
                  </Typography>
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    sx={{ mt: 0.5 }}
                  >
                    {t('layout.bottomNav.hideLabels.description')}
                  </Typography>
                </Box>
                <Switch
                  checked={hideLabels}
                  onChange={event => {
                    setHideLabels(event.target.checked)
                    saveBottomNavHideLabels(event.target.checked)
                  }}
                  color={hideLabels ? 'primary' : 'neutral'}
                  slotProps={{
                    input: { 'aria-labelledby': 'hide-nav-labels' },
                  }}
                  sx={{ flexShrink: 0 }}
                />
              </Box>
              <Chip
                size='sm'
                variant='soft'
                color={
                  enabledCount >= MAX_BOTTOM_NAV_ITEMS ? 'primary' : 'neutral'
                }
                sx={{ mb: 1 }}
              >
                {t('layout.bottomNav.selectedCount', {
                  count: enabledCount,
                  max: MAX_BOTTOM_NAV_ITEMS,
                })}
              </Chip>
              <Typography
                level='body-xs'
                textColor='text.tertiary'
                sx={{ mb: 1 }}
              >
                {t(
                  enabledCount >= MAX_BOTTOM_NAV_ITEMS
                    ? 'layout.bottomNav.limitHint'
                    : 'layout.reorderHint',
                )}
              </Typography>
              <SettingsReorderList
                id='bottom-nav-items'
                items={navItems}
                onToggle={handleToggleEnabled}
                onReorder={ids =>
                  saveConfig(
                    ids.map((id, order) => ({
                      ...config.find(item => item.id === id),
                      order,
                    })),
                  )
                }
              />
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => saveConfig(DEFAULT_BOTTOM_NAV_CONFIG)}
                sx={{ mt: 2 }}
              >
                {t('layout.bottomNav.resetToDefaults')}
              </Button>
            </SettingsSection>
          )}
          {hasSidepanel && (
            <SettingsSection
              title={t('layout.sidepanel.title')}
              description={t('sidepanel.description')}
            >
              <SidepanelSettings />
            </SettingsSection>
          )}
        </Box>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 2 }}>
          {t('layout.savedOnDevice')}
        </Typography>
      </Box>
    </SettingsLayout>
  )
}
export default LayoutSettings
