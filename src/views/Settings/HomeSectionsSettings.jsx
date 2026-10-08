import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
  Checklist,
  DragIndicator,
  ErrorOutline,
  FactCheck,
  FilterAlt,
  FolderOpen,
  Groups,
  Upcoming,
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
  DEFAULT_HOME_SECTIONS_CONFIG,
  getHomeSectionsConfig,
  saveHomeSectionsConfig,
} from '../../utils/HomeSectionsConfig'
import SettingsLayout from './SettingsLayout'

const HomeSectionsSettings = () => {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState(getHomeSectionsConfig())

  // Section names/descriptions live in the config so they can be persisted,
  // but the stored copy is English. Prefer the translated string and fall
  // back to it.
  const sectionName = item =>
    t(`homeSections.sections.${item.id}.name`, item.name)
  const sectionDescription = item =>
    t(`homeSections.sections.${item.id}.description`, item.description)

  const getIcon = iconName => {
    switch (iconName) {
      case 'WavingHand':
        return <WavingHand />
      case 'Checklist':
        return <Checklist />
      case 'Groups':
        return <Groups />
      case 'FactCheck':
        return <FactCheck />
      case 'ErrorOutline':
        return <ErrorOutline />
      case 'Upcoming':
        return <Upcoming />
      case 'FilterAlt':
        return <FilterAlt />
      case 'FolderOpen':
        return <FolderOpen />
      default:
        return <Groups />
    }
  }

  useEffect(() => {
    setConfig(getHomeSectionsConfig())
  }, [])

  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveHomeSectionsConfig(newConfig)
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
    saveConfig(DEFAULT_HOME_SECTIONS_CONFIG)
  }

  return (
    <SettingsLayout title={t('homeSections.title')}>
      <div className='grid gap-4'>
        <Box>
          <Typography level='body-md' sx={{ mb: 3 }}>
            {t('homeSections.description')}
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='home-sections'>
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
                                  {sectionName(item)}
                                </Typography>
                                <Typography
                                  level='body-xs'
                                  sx={{
                                    color: 'var(--joy-palette-text-tertiary)',
                                  }}
                                >
                                  - {sectionDescription(item)}
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
              {t('homeSections.resetToDefaults')}
            </Button>
            <FormHelperText sx={{ mt: 1 }}>
              {t('homeSections.resetHelper')}
            </FormHelperText>
          </Box>
        </Box>
      </div>
    </SettingsLayout>
  )
}

export default HomeSectionsSettings
