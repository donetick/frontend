import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
  CalendarMonth,
  DragIndicator,
  History,
  Person,
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

const DEFAULT_SIDEPANEL_CONFIG = [
  {
    id: 'welcome',
    name: 'Welcome Card',
    description: 'Shows greeting and quick stats',
    iconName: 'WavingHand',
    enabled: true,
    order: 0,
  },
  {
    id: 'assignees',
    name: 'Tasks by Assignee',
    description: 'Groups tasks by who they are assigned to',
    iconName: 'Person',
    enabled: true,
    order: 1,
  },
  {
    id: 'calendar',
    name: 'Calendar View',
    description: 'Shows tasks in a calendar format',
    iconName: 'CalendarMonth',
    enabled: true,
    order: 2,
  },
  {
    id: 'activities',
    name: 'Recent Activities',
    description: 'Shows recent task completions and activities',
    iconName: 'History',
    enabled: true,
    order: 3,
  },
]

const SidepanelSettings = () => {
  const [config, setConfig] = useState(DEFAULT_SIDEPANEL_CONFIG)

  const getIcon = iconName => {
    switch (iconName) {
      case 'WavingHand':
        return <WavingHand />
      case 'Person':
        return <Person />
      case 'CalendarMonth':
        return <CalendarMonth />
      case 'History':
        return <History />
      default:
        return <Person />
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('sidepanelConfig')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
      } catch (error) {
        console.error('Error parsing sidepanel config:', error)
      }
    }
  }, [])

  const saveConfig = newConfig => {
    setConfig(newConfig)
    localStorage.setItem('sidepanelConfig', JSON.stringify(newConfig))
    window.dispatchEvent(new Event('sidepanelConfigChanged'))
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
    <Box>
      <Typography level='h4' sx={{ mb: 2 }}>
        Sidepanel Settings
      </Typography>
      <Typography level='body-md' sx={{ mb: 3 }}>
        Customize which cards appear in the sidepanel and their order. Drag and
        drop to reorder, or toggle visibility for each card.
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
                <Draggable key={item.id} draggableId={item.id} index={index}>
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
                              {item.name}
                            </Typography>
                            <Typography
                              level='body-xs'
                              sx={{
                                color: 'var(--joy-palette-text-tertiary)',
                              }}
                            >
                              - {item.description}
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
        sx={{ mt: 3, pt: 2, borderTop: '1px solid var(--joy-palette-divider)' }}
      >
        <Button
          variant='outlined'
          color='neutral'
          onClick={resetToDefaults}
          size='sm'
        >
          Reset to Defaults
        </Button>
        <FormHelperText sx={{ mt: 1 }}>
          This will restore all cards to their default visibility and order.
        </FormHelperText>
      </Box>
    </Box>
  )
}

export default SidepanelSettings
