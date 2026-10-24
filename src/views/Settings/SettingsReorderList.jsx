import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { DragIndicator } from '@mui/icons-material'
import { Box, IconButton, Switch, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

const SettingsReorderList = ({ id, items, onReorder, onToggle }) => {
  const { t } = useTranslation('settings')
  return (
    <DragDropContext
      onDragEnd={({ destination, source }) => {
        if (!destination || source.index === destination.index) return
        const reordered = [...items]
        const [item] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, item)
        onReorder(reordered.map(item => item.id))
      }}
    >
      <Droppable droppableId={id}>
        {provided => (
          <Box
            component='ul'
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{ m: 0, p: 0, listStyle: 'none' }}
          >
            {items.map((item, index) => (
              <Draggable
                key={item.id}
                draggableId={item.id}
                index={index}
                disableInteractiveElementBlocking
              >
                {(provided, snapshot) => (
                  <Box
                    component='li'
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 1.5 },
                      py: 1.25,
                      borderBottom:
                        index < items.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: snapshot.isDragging
                        ? 'background.surface'
                        : 'transparent',
                      boxShadow: snapshot.isDragging ? 'md' : 'none',
                    }}
                  >
                    <IconButton
                      {...provided.dragHandleProps}
                      variant='plain'
                      color='neutral'
                      aria-label={t('layout.reorderItem', { name: item.label })}
                      sx={{
                        minWidth: 44,
                        minHeight: 44,
                        flexShrink: 0,
                        color: 'text.tertiary',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                      }}
                    >
                      <DragIndicator />
                    </IconButton>
                    <Box
                      aria-hidden='true'
                      sx={{
                        display: { xs: 'none', sm: 'flex' },
                        color: 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        level='title-sm'
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {item.label}
                      </Typography>
                      {item.description && (
                        <Typography
                          level='body-sm'
                          textColor='text.secondary'
                          sx={{ mt: 0.25 }}
                        >
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 44,
                        flexShrink: 0,
                      }}
                    >
                      <Switch
                        checked={item.enabled}
                        disabled={item.disabled}
                        onChange={event =>
                          onToggle(item.id, event.target.checked)
                        }
                        color={item.enabled ? 'primary' : 'neutral'}
                        slotProps={{ input: { 'aria-label': item.label } }}
                      />
                    </Box>
                  </Box>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  )
}
SettingsReorderList.propTypes = {
  id: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      icon: PropTypes.node,
      enabled: PropTypes.bool.isRequired,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  onReorder: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
}
export default SettingsReorderList
