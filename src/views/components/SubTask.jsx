import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Add, Delete, DragIndicator, Edit } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  IconButton,
  Input,
  List,
  ListItem,
  Typography,
} from '@mui/joy'
import React, { useState } from 'react'
import { CompleteSubTask } from '../../utils/Fetcher'

function SortableItem({ task, index, handleToggle, handleDelete, editMode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexDirection: { xs: 'column', sm: 'row' }, // Responsive style
    touchAction: 'none',
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(task.name)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    task.name = editedText
  }

  return (
    <ListItem ref={setNodeRef} style={style} {...attributes}>
      {editMode && (
        <IconButton {...listeners} {...attributes}>
          <DragIndicator />
        </IconButton>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
        }}
      >
        {!editMode && (
          <Checkbox
            checked={task.completedAt}
            onChange={() => handleToggle(task.id)}
            overlay={!editMode}
          />
        )}
        <Box
          sx={{
            flex: 1,
            minHeight: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {isEditing ? (
            <Input
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              onBlur={handleSave}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
              autoFocus
            />
          ) : (
            <Typography
              sx={{
                textDecoration: task.completedAt ? 'line-through' : 'none',
              }}
              onDoubleClick={handleEdit}
            >
              {task.name}
            </Typography>
          )}
          {task.completedAt && (
            <Typography
              sx={{
                display: { xs: 'block', sm: 'inline' }, // Responsive style
                color: 'text.secondary',
              }}
            >
              {new Date(task.completedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Box>
      {editMode && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton variant='soft' onClick={handleEdit}>
            <Edit />
          </IconButton>
          <IconButton
            variant='soft'
            color='danger'
            onClick={() => handleDelete(task.id)}
          >
            <Delete />
          </IconButton>
        </Box>
      )}
    </ListItem>
  )
}

const SubTasks = ({ editMode = true, choreId = 0, tasks, setTasks }) => {
  const [newTask, setNewTask] = useState('')

  const handleToggle = taskId => {
    const updatedTask = tasks.find(task => task.id === taskId)
    updatedTask.completedAt = updatedTask.completedAt
      ? null
      : new Date().toISOString()

    const updatedTasks = tasks.map(task =>
      task.id === taskId ? updatedTask : task,
    )
    CompleteSubTask(
      taskId,
      Number(choreId),
      updatedTask.completedAt ? new Date().toISOString() : null,
    ).then(res => {
      if (res.status !== 200) {
        console.log('Error updating task')
        return
      }
    })
    setTasks(updatedTasks)
  }

  const handleDelete = taskId => {
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const handleAdd = () => {
    if (!newTask.trim()) return
    setTasks([
      ...tasks,
      {
        name: newTask,
        completedAt: null,
        orderId: tasks.length,
      },
    ])
    setNewTask('')
  }

  const onDragEnd = event => {
    const { active, over } = event
    if (active.id !== over.id) {
      setTasks(items => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const reorderedItems = arrayMove(items, oldIndex, newIndex)
        return reorderedItems.map((item, index) => ({
          ...item,
          orderId: index,
        }))
      })
    }
  }

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      handleAdd()
    }
  }

  // Sort tasks by orderId before rendering
  const sortedTasks = [...tasks].sort((a, b) => a.orderId - b.orderId)

  return (
    <>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={sortedTasks}
          strategy={verticalListSortingStrategy}
        >
          <List sx={{ padding: 0 }}>
            {sortedTasks.map((task, index) => (
              <SortableItem
                key={task.id}
                task={task}
                index={index}
                handleToggle={handleToggle}
                handleDelete={handleDelete}
                editMode={editMode}
              />
            ))}
            {editMode && (
              <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Input
                  placeholder='Add new...'
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  sx={{ flex: 1 }}
                />
                <IconButton onClick={handleAdd}>
                  <Add />
                </IconButton>
              </ListItem>
            )}
          </List>
        </SortableContext>
      </DndContext>
    </>
  )
}

export default SubTasks
