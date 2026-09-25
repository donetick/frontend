import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
  Archive,
  Checklist,
  DragIndicator,
  FilterAlt,
  FolderOpen,
  History,
  ListAlt,
  SearchRounded,
  SettingsOutlined,
  SpaceDashboard,
  Toll,
  Widgets,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  FormControl,
  FormHelperText,
  IconButton,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BOTTOM_NAV_ITEM_POOL,
  DEFAULT_BOTTOM_NAV_CONFIG,
  getBottomNavConfig,
  MAX_BOTTOM_NAV_ITEMS,
  saveBottomNavConfig,
} from '../../utils/BottomNavConfig'
import {
  DEFAULT_VIEW_OPTIONS,
  getDefaultView,
  saveDefaultView,
} from '../../utils/DefaultViewConfig'
import { isMobileBottomNavEligible } from '../components/MobileBottomNav'
import SettingsLayout from './SettingsLayout'
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
  // The nav item labels are the ones the bar itself renders, and those live
  // in the shared `common` namespace — reuse them rather than retranslating.
  const { t } = useTranslation(['settings', 'common'])
  const isMobile = useMediaQuery('(max-width:768px)')
  const bottomNavEligible = isMobileBottomNavEligible(isMobile)
  // Same breakpoint Sidepanel itself checks before rendering.
  const hasSidepanel = useMediaQuery(theme => theme.breakpoints.up('lg'))

  const [defaultView, setDefaultView] = useState(getDefaultView)
  const [config, setConfig] = useState(getBottomNavConfig)

  const enabledCount = config.filter(item => item.enabled).length

  const handleDefaultViewChange = view => {
    setDefaultView(view)
    saveDefaultView(view)
  }

  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveBottomNavConfig(newConfig)
  }

  const handleToggleEnabled = (id, enabled) => {
    if (enabled && enabledCount >= MAX_BOTTOM_NAV_ITEMS) return

    const newConfig = config.map(item =>
      item.id === id ? { ...item, enabled } : item,
    )
    saveConfig(newConfig)
  }

  const handleDragEnd = result => {
    if (!result.destination) return

    const newConfig = Array.from(config)
    const [reorderedItem] = newConfig.splice(result.source.index, 1)
    newConfig.splice(result.destination.index, 0, reorderedItem)

    const updatedConfig = newConfig.map((item, index) => ({
      ...item,
      order: index,
    }))

    saveConfig(updatedConfig)
  }

  const resetToDefaults = () => {
    saveConfig(DEFAULT_BOTTOM_NAV_CONFIG)
  }

  return (
    <SettingsLayout title={t('layout.title')}>
      <div className='grid gap-4'>
        {/* Where the app opens. It comes first because it decides what you
            see before any of the shortcuts below get a chance to matter. */}
        <Box>
          <Typography level='title-md' sx={{ fontWeight: 600 }}>
            {t('layout.defaultView.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('layout.defaultView.description')}
          </Typography>

          <RadioGroup
            value={defaultView}
            onChange={e => handleDefaultViewChange(e.target.value)}
            sx={{ gap: 1 }}
          >
            {DEFAULT_VIEW_OPTIONS.map(option => (
              <Card
                key={option}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 2,
                  p: 2,
                  border:
                    defaultView === option
                      ? '2px solid var(--joy-palette-primary-400)'
                      : '1px solid var(--joy-palette-divider)',
                }}
              >
                <Radio
                  value={option}
                  overlay
                  slotProps={{ label: { sx: { flex: 1 } } }}
                  label={
                    <Box>
                      <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                        {t(`layout.defaultView.options.${option}.name`)}
                      </Typography>
                      <Typography
                        level='body-xs'
                        sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                      >
                        {t(`layout.defaultView.options.${option}.description`)}
                      </Typography>
                    </Box>
                  }
                />
              </Card>
            ))}
          </RadioGroup>
        </Box>

        {/* The bar itself only exists on mobile, so there is nothing to
            configure here on a desktop-sized screen. */}
        {bottomNavEligible && (
          <Box
            sx={{
              mt: 2,
              pt: 3,
              borderTop: '1px solid var(--joy-palette-divider)',
            }}
          >
            <Typography level='title-md' sx={{ fontWeight: 600 }}>
              {t('layout.bottomNav.title')}
            </Typography>
            <Typography level='body-md' sx={{ mb: 3 }}>
              {t('layout.bottomNav.description', {
                max: MAX_BOTTOM_NAV_ITEMS,
              })}
            </Typography>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId='bottom-nav-items'>
                {provided => (
                  <List
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    sx={{ gap: 1 }}
                  >
                    {config.map((item, index) => {
                      // The stored config only keeps id/enabled/order — the
                      // icon and label live in the pool.
                      const poolItem = BOTTOM_NAV_ITEM_POOL.find(
                        entry => entry.id === item.id,
                      )
                      if (!poolItem) return null

                      const disableToggleOn =
                        !item.enabled && enabledCount >= MAX_BOTTOM_NAV_ITEMS

                      return (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <ListItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{
                                p: 0,
                                backgroundColor: snapshot.isDragging
                                  ? 'var(--joy-palette-neutral-softBg)'
                                  : 'transparent',
                                borderRadius: 'var(--joy-radius-md)',
                              }}
                            >
                              <Card
                                sx={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  gap: 2,
                                  p: 2,
                                  opacity: item.enabled ? 1 : 0.6,
                                  border: snapshot.isDragging
                                    ? '2px solid var(--joy-palette-primary-400)'
                                    : '1px solid var(--joy-palette-divider)',
                                }}
                              >
                                <ListItemDecorator>
                                  <IconButton
                                    {...provided.dragHandleProps}
                                    variant='plain'
                                    size='sm'
                                    sx={{
                                      cursor: 'grab',
                                      '&:active': { cursor: 'grabbing' },
                                    }}
                                  >
                                    <DragIndicator />
                                  </IconButton>
                                </ListItemDecorator>

                                <IconButton
                                  sx={{
                                    color: 'var(--joy-palette-primary-500)',
                                  }}
                                >
                                  {ICONS[poolItem.iconName]}
                                </IconButton>

                                <ListItemContent sx={{ flex: 1 }}>
                                  <Typography
                                    level='title-sm'
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {t(`common:${poolItem.translationKey}`, {
                                      defaultValue: poolItem.translationDefault,
                                    })}
                                  </Typography>
                                </ListItemContent>

                                <FormControl>
                                  <Checkbox
                                    checked={item.enabled}
                                    disabled={disableToggleOn}
                                    onChange={e =>
                                      handleToggleEnabled(
                                        item.id,
                                        e.target.checked,
                                      )
                                    }
                                    size='lg'
                                  />
                                </FormControl>
                              </Card>
                            </ListItem>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>

            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: '1px solid var(--joy-palette-divider)',
              }}
            >
              <Button
                variant='outlined'
                color='neutral'
                onClick={resetToDefaults}
                size='sm'
              >
                {t('layout.bottomNav.resetToDefaults')}
              </Button>
              <FormHelperText sx={{ mt: 1 }}>
                {t('layout.bottomNav.resetHelper')}
              </FormHelperText>
            </Box>
          </Box>
        )}

        {/* Mirror image of the bottom bar: the sidepanel only renders from
            `lg` up, so it is configurable exactly where it exists. */}
        {hasSidepanel && (
          <Box
            sx={{
              mt: 2,
              pt: 3,
              borderTop: '1px solid var(--joy-palette-divider)',
            }}
          >
            <Typography level='title-md' sx={{ fontWeight: 600 }}>
              {t('layout.sidepanel.title')}
            </Typography>
            <SidepanelSettings />
          </Box>
        )}
      </div>
    </SettingsLayout>
  )
}

export default LayoutSettings
