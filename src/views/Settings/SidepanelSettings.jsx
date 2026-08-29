import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
  CalendarMonth,
  DragIndicator,
  EmojiEvents,
  History,
  Person,
  SupervisorAccount,
  TrendingUp,
  Visibility,
  VisibilityOff,
  WavingHand,
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
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_SIDEPANEL_CONFIG,
  getSidepanelConfig,
  saveSidepanelConfig,
} from '../../utils/SidepanelConfig'
import SettingsLayout from './SettingsLayout'

const SidepanelSettings = () => {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState(getSidepanelConfig())

  // Card names/descriptions live in the config so they can be persisted, but the
  // stored copy is English. Prefer the translated string and fall back to it.
  const cardName = item => t(`sidepanel.cards.${item.id}.name`, item.name)
  const cardDescription = item =>
    t(`sidepanel.cards.${item.id}.description`, item.description)

  const getIcon = iconName => {
    switch (iconName) {
      case 'SupervisorAccount':
        return <SupervisorAccount />
      case 'TrendingUp':
        return <TrendingUp />
      case 'WavingHand':
        return <WavingHand />
      case 'Person':
        return <Person />
      case 'CalendarMonth':
        return <CalendarMonth />
      case 'History':
        return <History />
      case 'EmojiEvents':
        return <EmojiEvents />
      default:
        return <Person />
    }
  }

  useEffect(() => {
    setConfig(getSidepanelConfig())
  }, [])

  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveSidepanelConfig(newConfig)
  }

  const handleToggleEnabled = (id, enabled) => {
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
    saveConfig(DEFAULT_SIDEPANEL_CONFIG)
  }

  return (
    <SettingsLayout title={t('sidepanel.title')}>
      <div className='grid gap-4'>
        <Box>
          <Typography level='h4' sx={{ mb: 2 }}>
            {t('sidepanel.heading')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 3 }}>
            {t('sidepanel.description')}
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='sidepanel-cards'>
              {provided => (
                <List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{ gap: 1 }}
                >
                  {config.map((item, index) => (
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
                              sx={{ color: 'var(--joy-palette-primary-500)' }}
                            >
                              {getIcon(item.iconName)}
                            </IconButton>

                            <ListItemContent sx={{ flex: 1 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Typography
                                  level='title-sm'
                                  sx={{ fontWeight: 600 }}
                                >
                                  {cardName(item)}
                                </Typography>
                                <Typography
                                  level='body-xs'
                                  sx={{
                                    color: 'var(--joy-palette-text-tertiary)',
                                  }}
                                >
                                  - {cardDescription(item)}
                                </Typography>
                              </Box>
                            </ListItemContent>

                            <FormControl>
                              <Checkbox
                                checked={item.enabled}
                                onChange={e =>
                                  handleToggleEnabled(item.id, e.target.checked)
                                }
                                overlay
                                variant='plain'
                                size='lg'
                                checkedIcon={<Visibility />}
                                uncheckedIcon={<VisibilityOff />}
                              />
                            </FormControl>
                          </Card>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
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
              {t('sidepanel.resetToDefaults')}
            </Button>
            <FormHelperText sx={{ mt: 1 }}>
              {t('sidepanel.resetHelper')}
            </FormHelperText>
          </Box>
        </Box>
      </div>
    </SettingsLayout>
  )
}

export default SidepanelSettings
